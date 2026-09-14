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

import { FLATIRONS_REGIONS } from './flatirons'
import { GARAGE_LEVELS, GarageLevel } from './garage-levels'

export const EVSE_DATA_URL = 'https://nlr-evse.s3-us-west-2.amazonaws.com/data.json'
export const EVSE_REFRESH_INTERVAL_MS = 60_000
export const CLOCK_INTERVAL_MS = 1_000

export type ChargerStatus = 'available' | 'in-use' | 'offline'
type SummaryAccent = ChargerStatus
export type EvseState = 'Charging' | 'Plugged In' | 'Preparing' | 'Ready' | 'Stopped' | 'unknown'

export interface ChargerLevel {
  readonly level: GarageLevel
  readonly label: string
  readonly available: number | null
  readonly accent: SummaryAccent | null
  readonly accessible?: boolean
}

export interface ChargerRegion {
  readonly id: string
  readonly label: string
  readonly available: number | null
  readonly accent: SummaryAccent | null
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
  readonly flatironsRegions: readonly ChargerRegion[]
  readonly flatironsSummary: readonly ChargerSummary[]
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
    accent: null,
    accessible: level === 3,
  }))

const initialSummary = (): readonly ChargerSummary[] => [
  { count: null, label: 'Available', accent: 'available' },
  { count: null, label: 'In Use', accent: 'in-use' },
  { count: null, label: 'Offline', accent: 'offline' },
]

const initialFlatironsRegions = (): readonly ChargerRegion[] =>
  FLATIRONS_REGIONS.map(({ id, label }) => ({ id, label, available: null, accent: null }))

type StatusCounts = Record<SummaryAccent, number>

const emptyStatusCounts = (): StatusCounts => ({
  available: 0,
  'in-use': 0,
  offline: 0,
})

const accentFor = (counts: StatusCounts): SummaryAccent | null => {
  if (counts.available > 0) {
    return 'available'
  }

  const total = counts['in-use'] + counts.offline
  if (total === 0) {
    return null
  }

  return counts.offline === total ? 'offline' : 'in-use'
}

const STATUS_PRIORITY: Readonly<Record<ChargerStatus, number>> = {
  offline: 0,
  available: 1,
  'in-use': 2,
}

@Injectable({ providedIn: 'root' })
export class EvseAvailabilityService {
  private readonly document = inject(DOCUMENT)
  private readonly http = inject(HttpClient)

  private readonly levelsState = signal(initialLevels())
  private readonly summaryState = signal(initialSummary())
  private readonly flatironsRegionsState = signal(initialFlatironsRegions())
  private readonly flatironsSummaryState = signal(initialSummary())
  private readonly stationStatusesState = signal<Readonly<Record<string, ChargerStatus>>>({})
  private readonly sessionStartTimesState = signal<Readonly<Record<string, number>>>({})
  private readonly lastUpdatedState = signal<Date | null>(null)
  private readonly clockState = signal(new Date())
  private readonly loadingState = signal(true)
  private readonly errorState = signal(false)

  readonly chargerLevels = this.levelsState.asReadonly()
  readonly chargerSummary = this.summaryState.asReadonly()
  readonly flatironsRegions = this.flatironsRegionsState.asReadonly()
  readonly flatironsSummary = this.flatironsSummaryState.asReadonly()
  readonly flatironsStatus = computed(() => {
    const summary = this.flatironsSummaryState()
    const countFor = (accent: SummaryAccent): number | null =>
      summary.find((item) => item.accent === accent)?.count ?? null
    const available = countFor('available')
    const inUse = countFor('in-use')
    const offline = countFor('offline')

    if (available === null || inUse === null || offline === null) {
      return { available: null, accent: null }
    }

    return {
      available,
      accent: accentFor({ available, 'in-use': inUse, offline }),
    }
  })
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
          this.document.visibilityState === 'visible' ? timer(0, CLOCK_INTERVAL_MS) : NEVER,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.clockState.set(new Date()))

    fromEvent(this.document, 'visibilitychange')
      .pipe(
        startWith(null),
        switchMap(() =>
          this.document.visibilityState === 'visible'
            ? timer(0, EVSE_REFRESH_INTERVAL_MS).pipe(
                exhaustMap(() =>
                  this.fetchAvailability().pipe(
                    tap((snapshot) => {
                      this.levelsState.set(snapshot.levels)
                      this.summaryState.set(snapshot.summary)
                      this.flatironsRegionsState.set(snapshot.flatironsRegions)
                      this.flatironsSummaryState.set(snapshot.flatironsSummary)
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
        area: GarageLevel | 'fc'
        status: ChargerStatus
        sessionStartTime: number | null
      }
    >()

    for (const station of data.stations) {
      const parkingSpace = station.parking_space?.trim().toUpperCase()
      if (!parkingSpace) {
        continue
      }

      const stationName = parkingSpace.split('-', 1)[0]
      const area: GarageLevel | 'fc' | undefined = /^[1-8][AB]$/.test(parkingSpace)
        ? 'fc'
        : (PARKING_SPACE_FLOOR_OVERRIDES[parkingSpace] ?? STATION_FLOORS[stationName])
      if (!area) {
        continue
      }

      // 4A and 4B serve the same physical parking space. If either is occupied,
      // the shared space is occupied; otherwise an available connector wins over offline.
      const displaySpace = parkingSpace === '4B' ? '4A' : parkingSpace
      const candidate = {
        area,
        status: this.classifyState(station.evse_state?.trim() ?? 'unknown', station.online),
        sessionStartTime: station.session_start_time,
      }
      const current = stations.get(displaySpace)
      if (
        !current ||
        STATUS_PRIORITY[candidate.status] > STATUS_PRIORITY[current.status] ||
        (candidate.status === current.status &&
          current.sessionStartTime === null &&
          candidate.sessionStartTime !== null)
      ) {
        stations.set(displaySpace, candidate)
      }
    }

    const totalsByLevel = new Map<GarageLevel, StatusCounts>(
      GARAGE_LEVELS.map((level) => [level, emptyStatusCounts()]),
    )
    const totals = emptyStatusCounts()
    const flatironsTotals = emptyStatusCounts()
    const stationStatuses: Record<string, ChargerStatus> = {}
    const sessionStartTimes: Record<string, number> = {}

    for (const [parkingSpace, station] of stations) {
      const status = station.status
      stationStatuses[parkingSpace] = status
      if (
        typeof station.sessionStartTime === 'number' &&
        Number.isFinite(station.sessionStartTime)
      ) {
        sessionStartTimes[parkingSpace] = station.sessionStartTime
      }
      if (station.area === 'fc') {
        flatironsTotals[status] += 1
      } else {
        totals[status] += 1
        totalsByLevel.get(station.area)![status] += 1
      }
    }

    return {
      levels: GARAGE_LEVELS.map((level) => {
        const counts = totalsByLevel.get(level)!
        return {
          level,
          label: `Level ${level}`,
          available: counts.available,
          accent: accentFor(counts),
          accessible: level === 3,
        }
      }),
      summary: [
        { count: totals.available, label: 'Available', accent: 'available' },
        { count: totals['in-use'], label: 'In Use', accent: 'in-use' },
        { count: totals.offline, label: 'Offline', accent: 'offline' },
      ],
      flatironsRegions: FLATIRONS_REGIONS.map(({ id, label, spaces }) => {
        const counts = emptyStatusCounts()
        for (const space of spaces) {
          const status = stationStatuses[space]
          if (status) {
            counts[status] += 1
          }
        }

        return {
          id,
          label,
          available: counts.available,
          accent: accentFor(counts),
        }
      }),
      flatironsSummary: [
        { count: flatironsTotals.available, label: 'Available', accent: 'available' },
        { count: flatironsTotals['in-use'], label: 'In Use', accent: 'in-use' },
        { count: flatironsTotals.offline, label: 'Offline', accent: 'offline' },
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
