import { DOCUMENT } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Injectable, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { formatDistance } from 'date-fns'
import {
  EMPTY,
  NEVER,
  catchError,
  exhaustMap,
  fromEvent,
  map,
  startWith,
  switchMap,
  tap,
  timer,
} from 'rxjs'

import { GARAGE_LEVELS, GarageLevel } from './garage-levels'

export const EVSE_DATA_URL = 'https://nlr-evse.s3-us-west-2.amazonaws.com/data.json'
export const EVSE_REFRESH_INTERVAL_MS = 60_000

export type ChargerStatus = 'available' | 'in-use' | 'offline'
type SummaryAccent = ChargerStatus
export type EvseState = 'Charging' | 'Plugged In' | 'Preparing' | 'Ready' | 'Stopped' | 'unknown'

export interface ChargerLevel {
  readonly level: GarageLevel
  readonly label: string
  readonly available: number | null
  readonly accessible?: boolean
}

export interface ChargerSummary {
  readonly count: number | null
  readonly label: string
  readonly accent: SummaryAccent
}

interface DashboardStation {
  readonly parking_space: string
  readonly evse_state: EvseState
  readonly online: boolean
  readonly session_start_time: number | null
}

interface DashboardData {
  readonly updated: number
  readonly stations: readonly DashboardStation[]
}

interface AvailabilitySnapshot {
  readonly levels: readonly ChargerLevel[]
  readonly summary: readonly ChargerSummary[]
  readonly stationStatuses: Readonly<Record<string, ChargerStatus>>
  readonly sessionStartTimes: Readonly<Record<string, number>>
  readonly updatedAt: Date
}

const STATION_FLOORS: Readonly<Record<string, GarageLevel>> = {
  LV11: 1,
  LV21: 2,
  LV22: 2,
  LV23: 2,
  LV31: 4,
  LV32: 4,
}

const PARKING_SPACE_FLOOR_OVERRIDES: Readonly<Record<string, GarageLevel>> = {
  'LV22-19': 3,
  'LV22-20': 3,
}

const initialLevels = (): readonly ChargerLevel[] =>
  GARAGE_LEVELS.map((level) => ({
    level,
    label: `Level ${level}`,
    available: null,
    accessible: level === 3,
  }))

const initialSummary = (): readonly ChargerSummary[] => [
  { count: null, label: 'Available', accent: 'available' },
  { count: null, label: 'In Use', accent: 'in-use' },
  { count: null, label: 'Offline', accent: 'offline' },
]

@Injectable({ providedIn: 'root' })
export class EvseAvailabilityService {
  private readonly document = inject(DOCUMENT)
  private readonly http = inject(HttpClient)

  private readonly levelsState = signal(initialLevels())
  private readonly summaryState = signal(initialSummary())
  private readonly stationStatusesState = signal<Readonly<Record<string, ChargerStatus>>>({})
  private readonly sessionStartTimesState = signal<Readonly<Record<string, number>>>({})
  private readonly lastUpdatedState = signal<Date | null>(null)
  private readonly clockState = signal(new Date())
  private readonly loadingState = signal(true)
  private readonly errorState = signal(false)

  readonly chargerLevels = this.levelsState.asReadonly()
  readonly chargerSummary = this.summaryState.asReadonly()
  readonly stationStatuses = this.stationStatusesState.asReadonly()
  readonly sessionStartTimes = this.sessionStartTimesState.asReadonly()
  readonly currentTime = this.clockState.asReadonly()
  readonly lastUpdated = this.lastUpdatedState.asReadonly()
  readonly lastUpdatedRelative = computed(() => {
    const updated = this.lastUpdatedState()
    const clockState = this.clockState()
    if (!updated) {
      return null
    }

    // Ensure that the relative time will never be in the future
    return formatDistance(updated < clockState ? updated : clockState, clockState, {
      addSuffix: true,
    })
  })
  readonly isLoading = this.loadingState.asReadonly()
  readonly hasError = this.errorState.asReadonly()

  constructor() {
    fromEvent(this.document, 'visibilitychange')
      .pipe(
        startWith(null),
        switchMap(() =>
          this.document.visibilityState === 'visible'
            ? timer(0, EVSE_REFRESH_INTERVAL_MS).pipe(
                tap(() => this.clockState.set(new Date())),
                exhaustMap(() =>
                  this.fetchAvailability().pipe(
                    tap((snapshot) => {
                      this.levelsState.set(snapshot.levels)
                      this.summaryState.set(snapshot.summary)
                      this.stationStatusesState.set(snapshot.stationStatuses)
                      this.sessionStartTimesState.set(snapshot.sessionStartTimes)
                      this.lastUpdatedState.set(snapshot.updatedAt)
                      this.loadingState.set(false)
                      this.errorState.set(false)
                    }),
                    catchError(() => {
                      this.loadingState.set(false)
                      this.errorState.set(true)
                      return EMPTY
                    }),
                  ),
                ),
              )
            : NEVER,
        ),
        takeUntilDestroyed(),
      )
      .subscribe()
  }

  private fetchAvailability() {
    return this.http.get<DashboardData>(EVSE_DATA_URL).pipe(map((data) => this.toSnapshot(data)))
  }

  private toSnapshot(data: DashboardData): AvailabilitySnapshot {
    if (!Array.isArray(data.stations)) {
      throw new Error('Invalid dashboard data')
    }

    const updated = data.updated
    if (typeof updated !== 'number' || !Number.isFinite(updated)) {
      throw new Error('Dashboard data is missing a valid updated timestamp')
    }

    const stations = new Map<
      string,
      {
        level: GarageLevel
        state: string
        online: boolean
        sessionStartTime: number | null
      }
    >()

    for (const station of data.stations) {
      const parkingSpace = station.parking_space?.trim().toUpperCase()
      if (!parkingSpace) {
        continue
      }

      const stationName = parkingSpace.split('-', 1)[0]
      const level = PARKING_SPACE_FLOOR_OVERRIDES[parkingSpace] ?? STATION_FLOORS[stationName]
      if (!level) {
        continue
      }

      stations.set(parkingSpace, {
        level,
        state: station.evse_state?.trim() ?? 'unknown',
        online: station.online,
        sessionStartTime: station.session_start_time,
      })
    }

    const availableByLevel = new Map<GarageLevel, number>(GARAGE_LEVELS.map((level) => [level, 0]))
    const totals: Record<SummaryAccent, number> = {
      available: 0,
      'in-use': 0,
      offline: 0,
    }
    const stationStatuses: Record<string, ChargerStatus> = {}
    const sessionStartTimes: Record<string, number> = {}

    for (const [parkingSpace, station] of stations) {
      const status = this.classifyState(station.state, station.online)
      stationStatuses[parkingSpace] = status
      if (
        typeof station.sessionStartTime === 'number' &&
        Number.isFinite(station.sessionStartTime)
      ) {
        sessionStartTimes[parkingSpace] = station.sessionStartTime
      }
      totals[status] += 1

      if (status === 'available') {
        availableByLevel.set(station.level, (availableByLevel.get(station.level) ?? 0) + 1)
      }
    }

    return {
      levels: GARAGE_LEVELS.map((level) => ({
        level,
        label: `Level ${level}`,
        available: availableByLevel.get(level) ?? 0,
        accessible: level === 3,
      })),
      summary: [
        { count: totals.available, label: 'Available', accent: 'available' },
        { count: totals['in-use'], label: 'In Use', accent: 'in-use' },
        { count: totals.offline, label: 'Offline', accent: 'offline' },
      ],
      stationStatuses,
      sessionStartTimes,
      updatedAt: new Date(updated),
    }
  }

  private classifyState(state: string, online: boolean): SummaryAccent {
    if (!online) {
      return 'offline'
    }

    if (state.toLowerCase() === 'ready') {
      return 'available'
    }

    return 'in-use'
  }
}
