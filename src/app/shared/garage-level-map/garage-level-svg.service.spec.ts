import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { vi } from 'vitest'

import { GarageLevelSvgService, svgUrl } from './garage-level-svg.service'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

describe('svgUrl', () => {
  it('maps parking areas to their SVG files', () => {
    expect(svgUrl('fc')).toBe('levels/fc.svg')
    expect(svgUrl(3)).toBe('levels/level-3.svg')
  })
})

describe('GarageLevelSvgService', () => {
  let httpTesting: HttpTestingController
  let service: GarageLevelSvgService

  /** Lets resolved HTTP responses settle, then runs any effects they or the timers made dirty. */
  const advance = async (ms = 0) => {
    await vi.advanceTimersByTimeAsync(ms)
    TestBed.tick()
  }
  const settle = () => advance()

  beforeEach(async () => {
    vi.useFakeTimers()
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    httpTesting = TestBed.inject(HttpTestingController)
    service = TestBed.inject(GarageLevelSvgService)
    await settle()
  })

  afterEach(() => {
    vi.useRealTimers()
    httpTesting.verify()
  })

  it('fetches every parking area map up front', async () => {
    const requests = httpTesting.match(() => true)

    expect(requests.map((request) => request.request.url)).toEqual([
      'levels/level-1.svg',
      'levels/level-2.svg',
      'levels/level-3.svg',
      'levels/level-4.svg',
      'levels/fc.svg',
    ])
    expect(service.isLoading(2)).toBe(true)
    expect(service.sourceFor(2)).toBe('')

    for (const request of requests) {
      request.flush(`${SVG}<!-- ${request.request.url} -->`)
    }
    await settle()

    expect(service.isLoading(2)).toBe(false)
    expect(service.sourceFor(2)).toContain('levels/level-2.svg')
    expect(service.sourceFor('fc')).toContain('levels/fc.svg')
  })

  it('retries a failed map twice, a second apart, before giving up', async () => {
    const fail = (url: string) =>
      httpTesting.expectOne(url).flush('Missing', { status: 404, statusText: 'Not Found' })

    httpTesting.match((request) => request.url !== 'levels/fc.svg').forEach((r) => r.flush(SVG))
    fail('levels/fc.svg')
    await settle()
    expect(service.isLoading('fc')).toBe(false)

    await advance(999)
    httpTesting.expectNone('levels/fc.svg')
    await advance(1)
    fail('levels/fc.svg')
    await settle()

    await advance(1_000)
    httpTesting.expectOne('levels/fc.svg').flush(SVG)
    await settle()

    expect(service.sourceFor('fc')).toBe(SVG)
    await advance(5_000)
    httpTesting.expectNone('levels/fc.svg')
  })

  it('stops retrying after the second failed retry', async () => {
    httpTesting.match((request) => request.url !== 'levels/fc.svg').forEach((r) => r.flush(SVG))
    for (let attempt = 0; attempt < 3; attempt += 1) {
      httpTesting
        .expectOne('levels/fc.svg')
        .flush('Missing', { status: 404, statusText: 'Not Found' })
      await advance(1_000)
    }

    httpTesting.expectNone('levels/fc.svg')
    expect(service.sourceFor('fc')).toBe('')
    expect(service.isLoading('fc')).toBe(false)
  })
})
