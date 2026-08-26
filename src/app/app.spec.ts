import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'

import { App } from './app'
import { routes } from './app.routes'
import { EvseAvailabilityService } from './evse-availability.service'

const TEST_MAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
  <defs><symbol id="_car-horizontal_"><path d="M0 0h1v1H0z" /></symbol></defs>
  <rect id="_lv21-01_" />
  <use id="_car-offline-lv21-01_" href="#_car-horizontal_" />
</svg>`

describe('App routing', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        {
          provide: EvseAvailabilityService,
          useValue: {
            chargerLevels: signal([
              { level: 1, label: 'Level 1', available: 5 },
              { level: 2, label: 'Level 2', available: 14 },
              { level: 3, label: 'Level 3', available: 2, accessible: true },
              { level: 4, label: 'Level 4', available: 0 },
            ]),
            chargerSummary: signal([
              { count: 34, label: 'Available', accent: 'available' },
              { count: 22, label: 'In Use', accent: 'in-use' },
              { count: 44, label: 'Offline', accent: 'offline' },
            ]),
            stationStatuses: signal({
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
            currentTime: signal(new Date('2026-08-05T01:05:00-06:00')),
            lastUpdated: signal(new Date('2026-08-05T01:05:00-06:00')),
            lastUpdatedRelative: signal('less than a minute ago'),
            isLoading: signal(false),
            hasError: signal(false),
          },
        },
      ],
    }).compileComponents()
  })

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true })
  })

  it('renders every home-page level as a route link', async () => {
    const compiled = await renderRoute('/')

    expect(compiled.querySelector('h1')?.textContent).toContain('FIND A CHARGER')
    expect(compiled.querySelectorAll('a[href^="/level/"]')).toHaveLength(4)
    expect(compiled.querySelectorAll('dl > div')).toHaveLength(3)
    expect(compiled.querySelector('time')?.textContent).toContain('less than a minute ago')
  })

  it('renders the level overview with live parking spaces', async () => {
    const compiled = await renderRoute('/level/2')

    expect(compiled.querySelector('h1')?.textContent).toContain('LEVEL 2')
    expect(compiled.querySelector('a[aria-label="Expand Level 2 garage map"]')).toBeTruthy()
    expect(compiled.querySelector('app-garage-level-map svg')).toBeTruthy()
    expect(
      compiled.querySelector('app-garage-level-map #_lv21-01_')?.getAttribute('style'),
    ).toContain('--color-in-use')
    expect(compiled.querySelectorAll('app-parking-line')).toHaveLength(3)
    expect(
      compiled.querySelector('[data-parking-space="LV21-01"]')?.getAttribute('data-status'),
    ).toBe('in-use')
    expect(compiled.querySelector('[data-parking-space="LV21-01"] .car-icon')).toBeTruthy()
    expect(
      compiled.querySelector('[data-parking-space="LV21-01"] .car-icon')?.getAttribute('viewBox'),
    ).toBe('0 0 33 16')
    expect(compiled.querySelector('[data-parking-space="LV21-01"]')?.getAttribute('title')).toBe(
      '1h 3m',
    )
    expect(
      compiled.querySelector('[data-parking-space="LV21-01"] .car-icon')?.hasAttribute('title'),
    ).toBe(false)
    expect(
      compiled.querySelector('[data-parking-space="LV23-02"] .car-icon')?.getAttribute('viewBox'),
    ).toBe('0 0 16 33')
    expect(compiled.querySelector('[data-parking-space="LV22-01"] .car-icon')).toBeFalsy()
    expect(
      compiled.querySelector('[data-region="center-west"] .parking-line')?.classList,
    ).toContain('has-reversed-cars')
    expect(
      compiled.querySelector('[data-region="center-east"] .parking-line')?.classList,
    ).not.toContain('has-reversed-cars')
    expect(compiled.querySelectorAll('nav a')).toHaveLength(5)
    expect(compiled.querySelector('nav a[href="/level/2"]')?.classList).toContain('is-active')
  })

  it.each([
    { level: 1, regions: ['center-east'], spaceCounts: [16] },
    { level: 2, regions: ['northwest', 'center-west', 'center-east'], spaceCounts: [18, 18, 18] },
    { level: 3, regions: ['center-west', 'center-east'], spaceCounts: [13, 13] },
    { level: 4, regions: ['center-west', 'center-east'], spaceCounts: [18, 18] },
  ])(
    'renders only the configured regions and spaces on level $level',
    async ({ level, regions, spaceCounts }) => {
      const compiled = await renderRoute(`/level/${level}`)
      const regionElements = Array.from(compiled.querySelectorAll<HTMLElement>('[data-region]'))

      expect(regionElements.map((element) => element.dataset['region'])).toEqual(regions)
      expect(regionElements.map((element) => element.querySelectorAll('li').length)).toEqual(
        spaceCounts,
      )
      expect(compiled.querySelector('[data-center-balance]')).toBeTruthy()
    },
  )

  it('shows the wheelchair icon only in available level 3 charging spaces', async () => {
    const level3 = await renderRoute('/level/3')

    expect(level3.querySelector('[data-parking-space="LV22-19"] .wheelchair-icon')).toBeTruthy()
    expect(level3.querySelector('[data-parking-space="LV22-20"] .wheelchair-icon')).toBeFalsy()
    expect(level3.querySelector('[data-parking-space="LV22-20"] .car-icon')).toBeTruthy()

    const level2 = await renderRoute('/level/2')
    expect(level2.querySelector('[data-parking-space="LV22-01"] .wheelchair-icon')).toBeFalsy()
  })

  it.each([
    { level: 1, region: 'center-east', first: 'LV11-01', lastCharger: 'LV11-16', last: 'LV11-16' },
    { level: 2, region: 'northwest', first: 'LV23-01', lastCharger: 'LV23-18', last: 'LV23-18' },
    { level: 3, region: 'center-west', first: null, lastCharger: 'LV22-20', last: 'LV22-20' },
    { level: 3, region: 'center-east', first: null, lastCharger: 'LV22-19', last: 'LV22-19' },
    { level: 4, region: 'center-west', first: 'LV32-01', lastCharger: 'LV32-18', last: 'LV32-18' },
    { level: 4, region: 'center-east', first: 'LV31-01', lastCharger: 'LV31-10', last: null },
  ])(
    'orders level $level $region spaces correctly',
    async ({ level, region, first, lastCharger, last }) => {
      const compiled = await renderRoute(`/level/${level}`)
      const spaces = Array.from(
        compiled.querySelectorAll<HTMLElement>(`[data-region="${region}"] li`),
      )

      expect(spaces[0].getAttribute('data-parking-space')).toBe(first)
      expect(spaces.at(-1)?.getAttribute('data-parking-space')).toBe(last)
      expect(spaces.some((space) => space.dataset['parkingSpace'] === lastCharger)).toBe(true)
    },
  )

  it('renders the expanded, orientation-aware garage route', async () => {
    const compiled = await renderRoute('/level/3/map')

    expect(compiled.querySelector('h1')?.textContent).toContain('LEVEL 3')
    expect(compiled.querySelector('[role="img"][aria-label="Level 3 garage map"]')).toBeTruthy()
    expect(compiled.querySelector('a[href="/level/3"]')?.textContent).toContain('View Spaces')
    expect(compiled.querySelector('nav a[href="/level/3"]')?.classList).toContain('is-active')
  })

  async function renderRoute(url: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App)
    fixture.detectChanges()

    await TestBed.inject(Router).navigateByUrl(url)
    fixture.detectChanges()
    TestBed.tick()

    const mapRequests = TestBed.inject(HttpTestingController)
      .match((request) => request.url.startsWith('levels/'))
      .filter((request) => !request.cancelled)
    if (url.startsWith('/level/')) {
      expect(mapRequests.length).toBeGreaterThan(0)
    }
    for (const request of mapRequests) {
      request.flush(TEST_MAP_SVG)
    }

    await fixture.whenStable()
    fixture.detectChanges()

    return fixture.nativeElement as HTMLElement
  }
})
