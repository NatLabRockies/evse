import { WritableSignal, inject, provideAppInitializer } from '@angular/core'
import { Router, Routes } from '@angular/router'
import { Decorator, applicationConfig } from '@storybook/angular-vite'

import { CAMPUS_STORAGE_KEY, Campus } from '../campus-selection.service'
import { ChargerStatus, ChargerSummary, toSnapshot } from '../evse-availability.service'
import { FLATIRONS_REGIONS } from '../flatirons'
import { GARAGE_LEVELS } from '../garage-levels'
import {
  EvseAvailabilityStub,
  STUB_UPDATED_AT,
  createEvseAvailabilityStub,
  provideEvseAvailabilityStub,
} from './evse-availability.stub'

/** Viewports that stories pin with `onViewport`. The visual tests resize the browser to match. */
export const STORY_VIEWPORTS = {
  mobile: {
    name: 'Mobile portrait',
    styles: { width: '390px', height: '844px' },
    type: 'mobile',
  },
  mobileLandscape: {
    name: 'Mobile landscape',
    styles: { width: '844px', height: '390px' },
    type: 'mobile',
  },
  desktop: {
    name: 'Desktop',
    styles: { width: '1280px', height: '800px' },
    type: 'desktop',
  },
} as const

export type StoryViewport = keyof typeof STORY_VIEWPORTS

/** Story globals that render a story at one of the `STORY_VIEWPORTS`. */
export const onViewport = (viewport: StoryViewport) => ({
  viewport: { value: viewport, isRotated: false },
})

/** Any URL resolves, so a story can put the router wherever its links should be active. */
export const STORY_ROUTES: Routes = [{ path: '**', children: [] }]

/** Navigates the story's router to `url` before it renders, leaving the preview's own URL alone. */
export const atUrl = (url: string): Decorator =>
  applicationConfig({
    providers: [provideAppInitializer(() => inject(Router).navigateByUrl(url))],
  })

/** Makes the home page open on `campus`, restoring the browser's stored choice afterward. */
export const withCampus = (campus: Campus) => () => {
  const previous = localStorage.getItem(CAMPUS_STORAGE_KEY)
  localStorage.setItem(CAMPUS_STORAGE_KEY, campus)
  return () => {
    if (previous === null) {
      localStorage.removeItem(CAMPUS_STORAGE_KEY)
    } else {
      localStorage.setItem(CAMPUS_STORAGE_KEY, previous)
    }
  }
}

/** The values of the availability service's public signals. */
export type EvseAvailabilityValues = {
  [K in keyof EvseAvailabilityStub]: ReturnType<EvseAvailabilityStub[K]>
}

/** Provides the availability stub, with `values` replacing parts of its realistic snapshot. */
export function withAvailability(values: Partial<EvseAvailabilityValues> = {}): Decorator {
  const stub = createEvseAvailabilityStub()
  for (const key of Object.keys(values) as (keyof EvseAvailabilityValues)[]) {
    const value: WritableSignal<unknown> = stub[key]
    value.set(values[key])
  }

  return applicationConfig({ providers: [provideEvseAvailabilityStub(stub)] })
}

export const summary = (
  available: number | null,
  inUse: number | null,
  offline: number | null,
): readonly ChargerSummary[] => [
  { count: available, label: 'Available', accent: 'available' },
  { count: inUse, label: 'In Use', accent: 'in-use' },
  { count: offline, label: 'Offline', accent: 'offline' },
]

/** What the service shows before its first successful load. */
export const NO_DATA: Partial<EvseAvailabilityValues> = {
  chargerLevels: GARAGE_LEVELS.map((level) => ({
    level,
    label: `Level ${level}`,
    available: null,
    accent: null,
    accessible: level === 3,
  })),
  chargerSummary: summary(null, null, null),
  flatironsRegions: FLATIRONS_REGIONS.map(({ id, label }) => ({
    id,
    label,
    available: null,
    accent: null,
  })),
  flatironsSummary: summary(null, null, null),
  flatironsStatus: { available: null, accent: null },
  stationStatuses: {},
  sessionStartTimes: {},
  lastUpdated: null,
  lastUpdatedRelative: null,
}

/**
 * Runs `statuses` through the service's own aggregation, so every level, region, and summary
 * agrees with the individual spaces. In-use spaces in `sessionMinutes` started that long ago.
 */
export function fromStations(
  statuses: Readonly<Record<string, ChargerStatus>>,
  sessionMinutes: Readonly<Record<string, number>> = {},
): Partial<EvseAvailabilityValues> {
  const updated = STUB_UPDATED_AT.getTime()
  const snapshot = toSnapshot({
    updated,
    stations: Object.entries(statuses).map(([parkingSpace, status]) => ({
      parking_space: parkingSpace,
      evse_state: status === 'available' ? 'Ready' : 'Charging',
      online: status !== 'offline',
      session_start_time:
        parkingSpace in sessionMinutes ? updated - sessionMinutes[parkingSpace] * 60_000 : null,
    })),
  })

  return {
    chargerLevels: snapshot.levels,
    chargerSummary: snapshot.summary,
    flatironsRegions: snapshot.flatironsRegions,
    flatironsSummary: snapshot.flatironsSummary,
    flatironsStatus: snapshot.flatironsStatus,
    stationStatuses: snapshot.stationStatuses,
    sessionStartTimes: snapshot.sessionStartTimes,
    lastUpdated: snapshot.updatedAt,
  }
}

const chargers = (station: string, count: number): readonly string[] =>
  Array.from({ length: count }, (_, index) => `${station}-${String(index + 1).padStart(2, '0')}`)

/** Each station's spaces. LV22-19 and LV22-20 are on level 3; the rest of LV22 is on level 2. */
const STATION_SPACES: readonly (readonly string[])[] = [
  chargers('LV11', 16),
  chargers('LV21', 18),
  chargers('LV22', 20),
  chargers('LV23', 18),
  chargers('LV31', 10),
  chargers('LV32', 17),
  ...FLATIRONS_REGIONS.map(({ spaces }) => spaces),
]

const MIXED_PATTERN: readonly ChargerStatus[] = [
  'available',
  'in-use',
  'offline',
  'in-use',
  'available',
]

const MIXED_SPACES = STATION_SPACES.flatMap((spaces) =>
  spaces.map((space, index) => ({
    space,
    status: MIXED_PATTERN[index % MIXED_PATTERN.length],
    sessionMinutes: 5 + index * 17,
  })),
)

/** Every space on both campuses in a repeating mix of statuses, each in-use session timed. */
export const MIXED_DATA = fromStations(
  Object.fromEntries(MIXED_SPACES.map(({ space, status }) => [space, status])),
  Object.fromEntries(
    MIXED_SPACES.filter(({ status }) => status === 'in-use').map(({ space, sessionMinutes }) => [
      space,
      sessionMinutes,
    ]),
  ),
)
