import { Provider, Signal, WritableSignal, signal } from '@angular/core'

import { EvseAvailabilityService } from '../evse-availability.service'

type SignalKeys = {
  [K in keyof EvseAvailabilityService]: EvseAvailabilityService[K] extends Signal<unknown>
    ? K
    : never
}[keyof EvseAvailabilityService]

/** The service's public signals, writable so a test can drive them. */
export type EvseAvailabilityStub = {
  [K in SignalKeys]: WritableSignal<ReturnType<EvseAvailabilityService[K]>>
}

export const STUB_UPDATED_AT = new Date('2026-08-05T01:05:00-06:00')

/** A realistic resolved snapshot: STM garage levels plus the Flatirons lot. */
export function createEvseAvailabilityStub(): EvseAvailabilityStub {
  return {
    chargerLevels: signal([
      { level: 1, label: 'Level 1', available: 5, accent: 'available', accessible: false },
      { level: 2, label: 'Level 2', available: 14, accent: 'available', accessible: false },
      { level: 3, label: 'Level 3', available: 2, accent: 'available', accessible: true },
      { level: 4, label: 'Level 4', available: 0, accent: 'offline', accessible: false },
    ]),
    chargerSummary: signal([
      { count: 34, label: 'Available', accent: 'available' },
      { count: 22, label: 'In Use', accent: 'in-use' },
      { count: 44, label: 'Offline', accent: 'offline' },
    ]),
    flatironsRegions: signal([
      { id: 'west', label: 'West', available: 6, accent: 'available' },
      { id: 'east', label: 'East', available: 6, accent: 'available' },
    ]),
    flatironsSummary: signal([
      { count: 12, label: 'Available', accent: 'available' },
      { count: 3, label: 'In Use', accent: 'in-use' },
      { count: 0, label: 'Offline', accent: 'offline' },
    ]),
    flatironsStatus: signal({ available: 12, accent: 'available' }),
    stationStatuses: signal({
      '1A': 'available',
      '1B': 'in-use',
      '4A': 'available',
      'LV21-01': 'in-use',
      'LV22-01': 'available',
      'LV22-19': 'available',
      'LV22-20': 'in-use',
      'LV23-01': 'offline',
      'LV23-02': 'in-use',
    }),
    sessionStartTimes: signal({
      'LV21-01': new Date('2026-08-05T00:02:00-06:00').getTime(),
    }),
    currentTime: signal(STUB_UPDATED_AT),
    lastUpdated: signal(STUB_UPDATED_AT),
    lastUpdatedRelative: signal('less than a minute ago'),
    isLoading: signal(false),
    hasError: signal(false),
  }
}

export const provideEvseAvailabilityStub = (stub: EvseAvailabilityStub): Provider => ({
  provide: EvseAvailabilityService,
  useValue: stub,
})
