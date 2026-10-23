import { httpResource } from '@angular/common/http'
import { DOCUMENT, Service, computed, effect, inject, signal, untracked } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { formatDistance } from 'date-fns'
import { fromEvent, map } from 'rxjs'

import { FLATIRONS_REGIONS } from './flatirons'
import { GARAGE_LEVELS, GarageLevel } from './garage-levels'
import { displayParkingSpace } from './parking-spaces'

export const EVSE_DATA_URL = 'https://nlr-evse.s3-us-west-2.amazonaws.com/data.json'
export const EVSE_REFRESH_INTERVAL_MS = 60_000
export const CLOCK_INTERVAL_MS = 1_000

export type ChargerStatus = 'available' | 'in-use' | 'offline'
export type EvseState = 'Charging' | 'Plugged In' | 'Preparing' | 'Ready' | 'Stopped' | 'unknown'

export type ChargerLevel = {
  readonly level: GarageLevel
  readonly label: string
  readonly available: number | null
  readonly accent: ChargerStatus | null
  readonly accessible?: boolean
}

export type ChargerRegion = {
  readonly id: string
  readonly label: string
  readonly available: number | null
  readonly accent: ChargerStatus | null
}

export type ChargerSummary = {
  readonly count: number | null
  readonly label: string
  readonly accent: ChargerStatus
}

export type AreaStatus = {
  readonly available: number | null
  readonly accent: ChargerStatus | null
}

type DashboardStation = {
  readonly parking_space: string
  readonly evse_state: EvseState
  readonly online: boolean
  readonly session_start_time: number | null
}

type DashboardData = {
  readonly updated: number
  readonly stations: readonly DashboardStation[]
}

type AvailabilitySnapshot = {
  readonly levels: readonly ChargerLevel[]
  readonly summary: readonly ChargerSummary[]
  readonly flatironsRegions: readonly ChargerRegion[]
  readonly flatironsSummary: readonly ChargerSummary[]
  readonly flatironsStatus: AreaStatus
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

const ACCESSIBLE_LEVEL: GarageLevel = 3

const UNKNOWN_STATUS: AreaStatus = { available: null, accent: null }

const INITIAL_LEVELS: readonly ChargerLevel[] = GARAGE_LEVELS.map((level) => ({
  level,
  label: `Level ${level}`,
  available: null,
  accent: null,
  accessible: level === ACCESSIBLE_LEVEL,
}))

const INITIAL_SUMMARY: readonly ChargerSummary[] = [
  { count: null, label: 'Available', accent: 'available' },
  { count: null, label: 'In Use', accent: 'in-use' },
  { count: null, label: 'Offline', accent: 'offline' },
]

const INITIAL_FLATIRONS_REGIONS: readonly ChargerRegion[] = FLATIRONS_REGIONS.map(
  ({ id, label }) => ({ id, label, available: null, accent: null }),
)

type StatusCounts = Record<ChargerStatus, number>

const emptyStatusCounts = (): StatusCounts => ({ available: 0, 'in-use': 0, offline: 0 })

const summarize = (counts: StatusCounts): readonly ChargerSummary[] => [
  { count: counts.available, label: 'Available', accent: 'available' },
  { count: counts['in-use'], label: 'In Use', accent: 'in-use' },
  { count: counts.offline, label: 'Offline', accent: 'offline' },
]

const accentFor = (counts: StatusCounts): ChargerStatus | null => {
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

const classifyState = (state: string | undefined, online: boolean): ChargerStatus => {
  if (!online) {
    return 'offline'
  }

  return state?.trim().toLowerCase() === 'ready' ? 'available' : 'in-use'
}

const isDashboardData = (data: unknown): data is DashboardData =>
  typeof data === 'object' &&
  data !== null &&
  Array.isArray((data as Partial<DashboardData>).stations) &&
  Number.isFinite((data as Partial<DashboardData>).updated)

/** Validates the raw dashboard payload and aggregates it into per-space, per-level, and per-campus views. */
export function toSnapshot(data: unknown): AvailabilitySnapshot {
  if (!isDashboardData(data)) {
    throw new Error('Invalid dashboard data')
  }

  const stations = new Map<
    string,
    { area: GarageLevel | 'fc'; status: ChargerStatus; sessionStartTime: number | null }
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

    const displaySpace = displayParkingSpace(parkingSpace)
    const candidate = {
      area,
      status: classifyState(station.evse_state, station.online),
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
    stationStatuses[parkingSpace] = station.status
    if (typeof station.sessionStartTime === 'number' && Number.isFinite(station.sessionStartTime)) {
      sessionStartTimes[parkingSpace] = station.sessionStartTime
    }
    if (station.area === 'fc') {
      flatironsTotals[station.status] += 1
    } else {
      totals[station.status] += 1
      totalsByLevel.get(station.area)![station.status] += 1
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
        accessible: level === ACCESSIBLE_LEVEL,
      }
    }),
    summary: summarize(totals),
    flatironsRegions: FLATIRONS_REGIONS.map(({ id, label, spaces }) => {
      const counts = emptyStatusCounts()
      for (const space of spaces) {
        const status = stationStatuses[space]
        if (status) {
          counts[status] += 1
        }
      }

      return { id, label, available: counts.available, accent: accentFor(counts) }
    }),
    flatironsSummary: summarize(flatironsTotals),
    flatironsStatus: { available: flatironsTotals.available, accent: accentFor(flatironsTotals) },
    stationStatuses,
    sessionStartTimes,
    updatedAt: new Date(data.updated),
  }
}

@Service()
export class EvseAvailabilityService {
  private readonly document = inject(DOCUMENT)

  /** Whether the page is visible. Polling and the clock pause while it is hidden. */
  private readonly visible = toSignal(
    fromEvent(this.document, 'visibilitychange').pipe(
      map(() => this.document.visibilityState === 'visible'),
    ),
    { initialValue: this.document.visibilityState === 'visible' },
  )

  private readonly dashboard = httpResource<AvailabilitySnapshot>(() => EVSE_DATA_URL, {
    parse: toSnapshot,
  })

  /**
   * The most recent successful snapshot. The resource drops its value when a refresh fails,
   * so the last good one is kept here to stay on screen until the next refresh succeeds.
   */
  private readonly snapshot = signal<AvailabilitySnapshot | undefined>(undefined)
  private readonly clock = signal(new Date())

  readonly chargerLevels = computed(() => this.snapshot()?.levels ?? INITIAL_LEVELS)
  readonly chargerSummary = computed(() => this.snapshot()?.summary ?? INITIAL_SUMMARY)
  readonly flatironsRegions = computed(
    () => this.snapshot()?.flatironsRegions ?? INITIAL_FLATIRONS_REGIONS,
  )
  readonly flatironsSummary = computed(() => this.snapshot()?.flatironsSummary ?? INITIAL_SUMMARY)
  readonly flatironsStatus = computed(() => this.snapshot()?.flatironsStatus ?? UNKNOWN_STATUS)
  readonly stationStatuses = computed(() => this.snapshot()?.stationStatuses ?? {})
  readonly sessionStartTimes = computed(() => this.snapshot()?.sessionStartTimes ?? {})
  readonly lastUpdated = computed(() => this.snapshot()?.updatedAt ?? null)
  readonly currentTime = this.clock.asReadonly()
  readonly lastUpdatedRelative = computed(() => {
    const updated = this.lastUpdated()
    const now = this.clock()
    if (!updated) {
      return null
    }

    // Ensure that the relative time will never be in the future
    return formatDistance(updated < now ? updated : now, now, { addSuffix: true })
  })
  readonly isLoading = this.dashboard.isLoading
  readonly hasError = computed(() => this.dashboard.status() === 'error')

  constructor() {
    effect(() => {
      if (this.dashboard.hasValue()) {
        this.snapshot.set(this.dashboard.value())
      }
    })
    this.whileVisible(CLOCK_INTERVAL_MS, () => this.clock.set(new Date()))
    this.whileVisible(EVSE_REFRESH_INTERVAL_MS, () => this.dashboard.reload())
  }

  /** Runs `task` immediately and then every `intervalMs`, but only while the page is visible. */
  private whileVisible(intervalMs: number, task: () => void): void {
    effect((onCleanup) => {
      if (!this.visible()) {
        return
      }

      untracked(task)
      const interval = setInterval(task, intervalMs)
      onCleanup(() => clearInterval(interval))
    })
  }
}
