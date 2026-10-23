import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { vi } from 'vitest'

import type { EvseState } from './evse-availability.service'
import {
  CLOCK_INTERVAL_MS,
  EVSE_DATA_URL,
  EVSE_REFRESH_INTERVAL_MS,
  EvseAvailabilityService,
  toSnapshot,
} from './evse-availability.service'

const UPDATED_AT = 1_786_142_027_652

function station(
  parkingSpace: string,
  state: EvseState,
  online = true,
  sessionStartTime: number | null = null,
) {
  return {
    parking_space: parkingSpace,
    evse_state: state,
    online,
    session_start_time: sessionStartTime,
  }
}

describe('toSnapshot', () => {
  it('aggregates charger availability by level, campus, and state', () => {
    const snapshot = toSnapshot({
      updated: UPDATED_AT,
      stations: [
        station('LV11-01', 'Ready'),
        station('LV21-01', 'Charging', true, UPDATED_AT - 3_760_000),
        station('LV22-19', 'Ready'),
        station('LV22-20', 'Stopped'),
        station('LV31-01', 'unknown', false),
        station('LV32-01', 'Ready'),
        station('LV32-17', 'Ready'),
        station('LV32-18', 'Charging'),
        station('UNMAPPED-01', 'Ready'),
        station('LV31-02', 'Ready', false),
        station('LV31-03', 'unknown'),
        station('LV22-01', 'Ready'),
        station('1A', 'Ready'),
        station('1B', 'Charging', true, UPDATED_AT - 60_000),
        station('5A', 'unknown', false),
      ],
    })

    expect(snapshot.levels.map((level) => level.available)).toEqual([1, 1, 1, 1])
    expect(snapshot.levels.map((level) => level.accent)).toEqual([
      'available',
      'available',
      'available',
      'available',
    ])
    expect(snapshot.levels[2].accessible).toBe(true)
    expect(snapshot.summary.map((summary) => summary.count)).toEqual([4, 4, 2])
    expect(snapshot.stationStatuses).toMatchObject({
      'LV11-01': 'available',
      'LV21-01': 'in-use',
      'LV31-01': 'offline',
      'LV32-17': 'in-use',
      '1A': 'available',
      '5A': 'offline',
    })
    expect(snapshot.stationStatuses['LV32-18']).toBeUndefined()
    expect(snapshot.stationStatuses['UNMAPPED-01']).toBeUndefined()
    expect(snapshot.sessionStartTimes).toEqual({
      'LV21-01': UPDATED_AT - 3_760_000,
      '1B': UPDATED_AT - 60_000,
    })
    expect(
      snapshot.flatironsRegions.map(({ id, available, accent }) => [id, available, accent]),
    ).toEqual([
      ['west', 0, 'offline'],
      ['east', 1, 'available'],
    ])
    expect(snapshot.flatironsSummary.map((summary) => summary.count)).toEqual([1, 1, 1])
    expect(snapshot.flatironsStatus).toEqual({ available: 1, accent: 'available' })
    expect(snapshot.updatedAt.getTime()).toBe(UPDATED_AT)
  })

  it('marks a level in use when nothing is available and offline only when everything is', () => {
    const snapshot = toSnapshot({
      updated: UPDATED_AT,
      stations: [
        station('LV11-01', 'Charging'),
        station('LV11-02', 'unknown', false),
        station('LV31-01', 'unknown', false),
      ],
    })

    expect(snapshot.levels.map((level) => level.accent)).toEqual(['in-use', null, null, 'offline'])
  })

  it('lets an occupied connector win a shared space and keeps its session start time', () => {
    const snapshot = toSnapshot({
      updated: UPDATED_AT,
      stations: [
        station('LV32-17', 'Ready'),
        station('LV32-18', 'Charging', true, UPDATED_AT - 1_000),
        station('4A', 'unknown', false),
        station('4B', 'Ready'),
      ],
    })

    expect(snapshot.stationStatuses).toEqual({ 'LV32-17': 'in-use', '4A': 'available' })
    expect(snapshot.sessionStartTimes).toEqual({ 'LV32-17': UPDATED_AT - 1_000 })
  })

  it.each([null, 'nope', {}, { updated: 'soon', stations: [] }, { updated: UPDATED_AT }])(
    'rejects the malformed payload %j',
    (payload) => {
      expect(() => toSnapshot(payload)).toThrow()
    },
  )
})

describe('EvseAvailabilityService', () => {
  let httpTesting: HttpTestingController
  let visibilityState: DocumentVisibilityState

  /** Lets resolved HTTP responses settle, then runs any effects they or the timers made dirty. */
  const advance = async (ms = 0) => {
    await vi.advanceTimersByTimeAsync(ms)
    TestBed.tick()
  }
  const settle = () => advance()

  const setVisibility = async (state: DocumentVisibilityState) => {
    visibilityState = state
    document.dispatchEvent(new Event('visibilitychange'))
    await settle()
  }

  const respond = async (
    stations: ReturnType<typeof station>[] = [station('LV11-01', 'Ready')],
  ) => {
    httpTesting.expectOne(EVSE_DATA_URL).flush({ updated: UPDATED_AT, stations })
    await settle()
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(UPDATED_AT + 20_000))
    visibilityState = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState)
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    httpTesting = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.useRealTimers()
    httpTesting.verify()
  })

  it('requests the dashboard on startup and exposes the aggregated snapshot', async () => {
    const service = TestBed.inject(EvseAvailabilityService)
    expect(service.isLoading()).toBe(true)
    expect(service.chargerLevels().map((level) => level.available)).toEqual([
      null,
      null,
      null,
      null,
    ])

    await settle()
    const request = httpTesting.expectOne(EVSE_DATA_URL)
    expect(request.request.method).toBe('GET')

    request.flush({
      updated: UPDATED_AT,
      stations: [station('LV11-01', 'Ready'), station('LV21-01', 'Charging', true, UPDATED_AT)],
    })
    await settle()

    expect(service.isLoading()).toBe(false)
    expect(service.hasError()).toBe(false)
    expect(service.chargerLevels().map((level) => level.available)).toEqual([1, 0, 0, 0])
    expect(service.chargerSummary().map((summary) => summary.count)).toEqual([1, 1, 0])
    expect(service.stationStatuses()).toEqual({ 'LV11-01': 'available', 'LV21-01': 'in-use' })
    expect(service.sessionStartTimes()).toEqual({ 'LV21-01': UPDATED_AT })
    expect(service.lastUpdated()?.getTime()).toBe(UPDATED_AT)
    expect(service.lastUpdatedRelative()).toBe('less than a minute ago')
  })

  it('updates the clock and relative time every second without fetching again', async () => {
    const service = TestBed.inject(EvseAvailabilityService)
    await settle()
    await respond()

    expect(service.lastUpdatedRelative()).toBe('less than a minute ago')
    const firstTick = service.currentTime()

    await advance(CLOCK_INTERVAL_MS)
    httpTesting.expectNone(EVSE_DATA_URL)
    expect(service.currentTime().getTime()).toBe(firstTick.getTime() + CLOCK_INTERVAL_MS)
    expect(service.lastUpdatedRelative()).toBe('less than a minute ago')

    await advance(9 * CLOCK_INTERVAL_MS)
    httpTesting.expectNone(EVSE_DATA_URL)
    expect(service.lastUpdatedRelative()).toBe('1 minute ago')
  })

  it('never reports an update time in the future', async () => {
    vi.setSystemTime(new Date(UPDATED_AT - 60_000))
    const service = TestBed.inject(EvseAvailabilityService)
    await settle()
    await respond()

    expect(service.lastUpdatedRelative()).toBe('less than a minute ago')
  })

  it('refreshes every 60 seconds and keeps the previous data when a refresh fails', async () => {
    const service = TestBed.inject(EvseAvailabilityService)
    await settle()
    await respond()

    await advance(EVSE_REFRESH_INTERVAL_MS - 1)
    httpTesting.expectNone(EVSE_DATA_URL)

    await advance(1)
    httpTesting
      .expectOne(EVSE_DATA_URL)
      .flush('Unavailable', { status: 503, statusText: 'Service Unavailable' })
    await settle()

    expect(service.hasError()).toBe(true)
    expect(service.chargerLevels()[0].available).toBe(1)
    expect(service.lastUpdatedRelative()).toBe('1 minute ago')

    await advance(EVSE_REFRESH_INTERVAL_MS)
    httpTesting.expectOne(EVSE_DATA_URL).flush({ updated: UPDATED_AT, stations: [] })
    await settle()

    expect(service.hasError()).toBe(false)
    expect(service.chargerLevels()[0].available).toBe(0)
  })

  it('reports an error when the first load fails and recovers on the next refresh', async () => {
    const service = TestBed.inject(EvseAvailabilityService)
    await settle()
    httpTesting.expectOne(EVSE_DATA_URL).flush({ updated: 'later', stations: [] })
    await settle()

    expect(service.hasError()).toBe(true)
    expect(service.lastUpdated()).toBeNull()

    await advance(EVSE_REFRESH_INTERVAL_MS)
    expect(service.hasError()).toBe(false)
    expect(service.isLoading()).toBe(true)
    await respond()

    expect(service.hasError()).toBe(false)
    expect(service.lastUpdated()?.getTime()).toBe(UPDATED_AT)
  })

  it('pauses while hidden and restarts with an immediate refresh when visible', async () => {
    const service = TestBed.inject(EvseAvailabilityService)
    await settle()
    await respond()

    await advance(10_000)
    await setVisibility('hidden')
    const frozenTime = service.currentTime()
    await advance(EVSE_REFRESH_INTERVAL_MS * 2)
    httpTesting.expectNone(EVSE_DATA_URL)
    expect(service.currentTime()).toBe(frozenTime)

    await setVisibility('visible')
    expect(service.currentTime()).not.toBe(frozenTime)
    await respond()

    await advance(EVSE_REFRESH_INTERVAL_MS - 1)
    httpTesting.expectNone(EVSE_DATA_URL)
    await advance(1)
    await respond()
  })
})
