import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { vi } from 'vitest'

import type { EvseState } from './evse-availability.service'
import {
  EVSE_DATA_URL,
  EVSE_REFRESH_INTERVAL_MS,
  EvseAvailabilityService,
} from './evse-availability.service'

const UPDATED_AT = 1_786_142_027_652

describe('EvseAvailabilityService', () => {
  let httpTesting: HttpTestingController

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(UPDATED_AT + 20_000))
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    httpTesting = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    httpTesting.verify()
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('requests and aggregates charger availability by level and state', () => {
    const service = TestBed.inject(EvseAvailabilityService)

    vi.advanceTimersByTime(0)
    const request = httpTesting.expectOne(EVSE_DATA_URL)

    expect(request.request.method).toBe('GET')
    expect(request.request.body).toBeNull()

    request.flush({
      updated: UPDATED_AT,
      stations: [
        station('LV11-01', 'Ready'),
        station('LV21-01', 'Charging', true, UPDATED_AT - 3_760_000),
        station('LV22-19', 'Ready'),
        station('LV22-20', 'Stopped'),
        station('LV31-01', 'unknown', false),
        station('LV32-01', 'Ready'),
        station('LV32-01', 'Ready'),
        station('UNMAPPED-01', 'Ready'),
        station('LV31-02', 'Ready', false),
        station('LV31-03', 'unknown'),
        station('LV22-01', 'Ready'),
      ],
    })

    expect(service.chargerLevels().map((level) => level.available)).toEqual([1, 1, 1, 1])
    expect(service.chargerSummary().map((summary) => summary.count)).toEqual([4, 3, 2])
    expect(service.stationStatuses()).toMatchObject({
      'LV11-01': 'available',
      'LV21-01': 'in-use',
      'LV31-01': 'offline',
    })
    expect(service.sessionStartTimes()).toEqual({ 'LV21-01': UPDATED_AT - 3_760_000 })
    expect(service.lastUpdated()?.getTime()).toBe(UPDATED_AT)
    expect(service.lastUpdatedRelative()).toBe('less than a minute ago')
    expect(service.hasError()).toBe(false)
  })

  it('refreshes after 60 seconds and retains the previous data on an error', () => {
    const service = TestBed.inject(EvseAvailabilityService)

    vi.advanceTimersByTime(0)
    httpTesting.expectOne(EVSE_DATA_URL).flush({
      updated: UPDATED_AT,
      stations: [station('LV11-01', 'Ready')],
    })

    vi.advanceTimersByTime(EVSE_REFRESH_INTERVAL_MS - 1)
    httpTesting.expectNone(EVSE_DATA_URL)

    vi.advanceTimersByTime(1)
    httpTesting.expectOne(EVSE_DATA_URL).flush('Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    })

    expect(service.chargerLevels()[0].available).toBe(1)
    expect(service.lastUpdatedRelative()).toBe('1 minute ago')
    expect(service.hasError()).toBe(true)
  })

  it('pauses while hidden and restarts with an immediate refresh when visible', () => {
    let visibilityState: DocumentVisibilityState = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState)
    TestBed.inject(EvseAvailabilityService)

    vi.advanceTimersByTime(0)
    httpTesting.expectOne(EVSE_DATA_URL).flush({
      updated: UPDATED_AT,
      stations: [station('LV11-01', 'Ready')],
    })

    vi.advanceTimersByTime(10_000)
    visibilityState = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(EVSE_REFRESH_INTERVAL_MS * 2)
    httpTesting.expectNone(EVSE_DATA_URL)

    visibilityState = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(0)
    httpTesting.expectOne(EVSE_DATA_URL).flush({
      updated: UPDATED_AT,
      stations: [station('LV11-01', 'Ready')],
    })

    vi.advanceTimersByTime(EVSE_REFRESH_INTERVAL_MS - 1)
    httpTesting.expectNone(EVSE_DATA_URL)
    vi.advanceTimersByTime(1)
    httpTesting.expectOne(EVSE_DATA_URL).flush({
      updated: UPDATED_AT,
      stations: [station('LV11-01', 'Ready')],
    })
  })
})

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
