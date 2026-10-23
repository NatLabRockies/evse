import { TabsHarness } from '@angular/aria/tabs/testing'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router, provideRouter, withComponentInputBinding } from '@angular/router'
import { vi } from 'vitest'

import { App } from './app'
import { routes } from './app.routes'
import { CAMPUS_STORAGE_KEY } from './campus-selection.service'
import {
  createEvseAvailabilityStub,
  provideEvseAvailabilityStub,
} from './testing/evse-availability.stub'

const TEST_MAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
  <defs><symbol id="_car-horizontal_"><path d="M0 0h1v1H0z" /></symbol></defs>
  <rect id="_lv21-01_" />
  <use id="_car-offline-lv21-01_" href="#_car-horizontal_" />
</svg>`

const TEST_FC_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 178 110">
  <path id="_1a" d="M0 0h10v5H0z" />
  <path id="4a" d="M0 5h10v5H0z" />
</svg>`

const storedValues = new Map<string, string>()
const campusStorage: Storage = {
  get length() {
    return storedValues.size
  },
  clear: () => storedValues.clear(),
  key: (index: number) => Array.from(storedValues.keys())[index] ?? null,
  removeItem: (key: string) => {
    storedValues.delete(key)
  },
  getItem: (key: string) => storedValues.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storedValues.set(key, value)
  },
}

describe('App routing', () => {
  beforeEach(async () => {
    storedValues.clear()
    vi.spyOn(document.defaultView!, 'localStorage', 'get').mockReturnValue(campusStorage)
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes, withComponentInputBinding()),
        provideEvseAvailabilityStub(createEvseAvailabilityStub()),
      ],
    }).compileComponents()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true })
  })

  it('renders every home-page level as a route link', async () => {
    const { compiled } = await renderRoute('/')
    const levelLinks = Array.from(compiled.querySelectorAll('a[href^="/level/"]'))

    expect(compiled.querySelector('h1')?.textContent).toContain('FIND A CHARGER')
    expect(document.title).toBe('Find a Charger | NLR EVSE')
    expect(levelLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/level/4',
      '/level/3',
      '/level/2',
      '/level/1',
    ])
    expect(compiled.querySelectorAll('dl > div')).toHaveLength(3)
    expect(compiled.querySelector('time')?.textContent).toContain('less than a minute ago')
  })

  it('renders the level overview with live parking spaces', async () => {
    const { compiled } = await renderRoute('/level/2')

    expect(compiled.querySelector('h1')?.textContent).toContain('LEVEL 2')
    expect(document.title).toBe('Level 2 | NLR EVSE')
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
    expect(campusStorage.getItem(CAMPUS_STORAGE_KEY)).toBe('stm')
  })

  it('switches campuses, saves the choice, and shows Flatirons availability', async () => {
    const { fixture, compiled } = await renderRoute('/')
    const tabs = await TestbedHarnessEnvironment.loader(fixture).getHarness(TabsHarness)

    expect(await (await tabs.getSelectedTab())?.getTitle()).toBe('STM')

    await tabs.selectTab({ title: 'Flatirons' })

    expect(campusStorage.getItem(CAMPUS_STORAGE_KEY)).toBe('flatirons')
    expect(await (await tabs.getSelectedTab())?.getTitle()).toBe('Flatirons')
    const links = Array.from(compiled.querySelectorAll('ul a'))
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/fc', '/fc'])
    expect(links[0].textContent).toContain('West')
    expect(links[1].textContent).toContain('East')
    expect(links[0].textContent).toContain('6')
    expect(links[1].textContent).toContain('6')
    expect(compiled.querySelector('time')).toBeTruthy()

    await tabs.selectTab({ title: 'STM' })

    expect(campusStorage.getItem(CAMPUS_STORAGE_KEY)).toBe('stm')
    expect(compiled.querySelectorAll('a[href^="/level/"]')).toHaveLength(4)
  })

  it('restores the saved Flatirons selection on a new visit', async () => {
    campusStorage.setItem(CAMPUS_STORAGE_KEY, 'flatirons')
    const { compiled } = await renderRoute('/')

    expect(compiled.querySelectorAll('a[href="/fc"]')).toHaveLength(2)
    expect(compiled.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
      'Flatirons',
    )
  })

  it('renders the Flatirons lot with fifteen spaces and a single Home link', async () => {
    const { compiled } = await renderRoute('/fc')

    expect(compiled.querySelector('h1')?.textContent).toContain('Flatirons')
    expect(document.title).toBe('Flatirons Campus | NLR EVSE')
    expect(compiled.querySelectorAll('[data-region="west"] li')).toHaveLength(8)
    expect(compiled.querySelectorAll('[data-region="east"] li')).toHaveLength(7)
    expect(compiled.querySelector('[data-parking-space="4A"]')).toBeTruthy()
    expect(compiled.querySelector('[data-parking-space="4B"]')).toBeNull()
    expect(compiled.querySelectorAll('nav a')).toHaveLength(1)
    expect(compiled.querySelector('a[href="/fc/map"]')?.textContent).toContain('View Map')
    expect(compiled.querySelector('app-garage-level-map #_1a')?.getAttribute('data-status')).toBe(
      'available',
    )
    expect(campusStorage.getItem(CAMPUS_STORAGE_KEY)).toBe('flatirons')
  })

  it('renders the Flatirons map with a link back to its spaces', async () => {
    const { compiled } = await renderRoute('/fc/map')

    expect(compiled.querySelector('[aria-label="Flatirons Campus map"]')).toBeTruthy()
    expect(document.title).toBe('Flatirons Campus Map | NLR EVSE')
    expect(compiled.querySelector('a[href="/fc"]')?.textContent).toContain('View Spaces')
    expect(compiled.querySelectorAll('nav a')).toHaveLength(1)
  })

  it.each([
    { level: 1, regions: ['center-east'], spaceCounts: [17] },
    { level: 2, regions: ['northwest', 'center-west', 'center-east'], spaceCounts: [18, 18, 18] },
    { level: 3, regions: ['center-west', 'center-east'], spaceCounts: [14, 14] },
    { level: 4, regions: ['center-west', 'center-east'], spaceCounts: [17, 17] },
  ])(
    'renders only the configured regions and spaces on level $level',
    async ({ level, regions, spaceCounts }) => {
      const { compiled } = await renderRoute(`/level/${level}`)
      const regionElements = Array.from(compiled.querySelectorAll<HTMLElement>('[data-region]'))

      expect(regionElements.map((element) => element.dataset['region'])).toEqual(regions)
      expect(regionElements.map((element) => element.querySelectorAll('li').length)).toEqual(
        spaceCounts,
      )
      expect(compiled.querySelector('[data-center-balance]')).toBeTruthy()
    },
  )

  it('shows the wheelchair icon only in available level 3 charging spaces', async () => {
    const { compiled: level3 } = await renderRoute('/level/3')

    expect(level3.querySelector('[data-parking-space="LV22-19"] .wheelchair-icon')).toBeTruthy()
    expect(level3.querySelector('[data-parking-space="LV22-20"] .wheelchair-icon')).toBeFalsy()
    expect(level3.querySelector('[data-parking-space="LV22-20"] .car-icon')).toBeTruthy()

    const { compiled: level2 } = await renderRoute('/level/2')
    expect(level2.querySelector('[data-parking-space="LV22-01"] .wheelchair-icon')).toBeFalsy()
  })

  it.each([
    { level: 1, region: 'center-east', first: 'LV11-01', lastCharger: 'LV11-16', last: null },
    { level: 2, region: 'northwest', first: 'LV23-01', lastCharger: 'LV23-18', last: 'LV23-18' },
    { level: 3, region: 'center-west', first: null, lastCharger: 'LV22-20', last: 'LV22-20' },
    { level: 3, region: 'center-east', first: null, lastCharger: 'LV22-19', last: 'LV22-19' },
    { level: 4, region: 'center-west', first: 'LV32-01', lastCharger: 'LV32-17', last: 'LV32-17' },
    { level: 4, region: 'center-east', first: 'LV31-01', lastCharger: 'LV31-10', last: null },
  ])(
    'orders level $level $region spaces correctly',
    async ({ level, region, first, lastCharger, last }) => {
      const { compiled } = await renderRoute(`/level/${level}`)
      const spaces = Array.from(
        compiled.querySelectorAll<HTMLElement>(`[data-region="${region}"] li`),
      )

      expect(spaces[0].getAttribute('data-parking-space')).toBe(first)
      expect(spaces.at(-1)?.getAttribute('data-parking-space')).toBe(last)
      expect(spaces.some((space) => space.dataset['parkingSpace'] === lastCharger)).toBe(true)
    },
  )

  it('renders the expanded, orientation-aware garage route', async () => {
    const { compiled } = await renderRoute('/level/3/map')

    expect(compiled.querySelector('h1')?.textContent).toContain('LEVEL 3')
    expect(document.title).toBe('Level 3 Garage Map | NLR EVSE')
    expect(compiled.querySelector('[role="img"][aria-label="Level 3 garage map"]')).toBeTruthy()
    expect(compiled.querySelector('.garage-plan-frame > app-compass-rose')).toBeTruthy()
    expect(compiled.querySelector('a[href="/level/3"]')?.textContent).toContain('View Spaces')
    expect(compiled.querySelector('nav a[href="/level/3/map"]')?.classList).toContain('is-active')
    expect(
      Array.from(compiled.querySelectorAll('nav a')).map((link) => link.getAttribute('href')),
    ).toEqual(['/', '/level/1/map', '/level/2/map', '/level/3/map', '/level/4/map'])
  })

  it('redirects unknown paths to the home page', async () => {
    const { compiled } = await renderRoute('/level/9')

    expect(TestBed.inject(Router).url).toBe('/')
    expect(compiled.querySelector('h1')?.textContent).toContain('FIND A CHARGER')
  })

  async function renderRoute(
    url: string,
  ): Promise<{ fixture: ComponentFixture<App>; compiled: HTMLElement }> {
    const fixture = TestBed.createComponent(App)
    await TestBed.inject(Router).navigateByUrl(url)
    // Run change detection and effects so the map resources issue their requests.
    TestBed.tick()

    const mapRequests = TestBed.inject(HttpTestingController)
      .match((request) => request.url.startsWith('levels/'))
      .filter((request) => !request.cancelled)
    for (const request of mapRequests) {
      request.flush(request.request.url === 'levels/fc.svg' ? TEST_FC_SVG : TEST_MAP_SVG)
    }

    await fixture.whenStable()

    return { fixture, compiled: fixture.nativeElement as HTMLElement }
  }
})
