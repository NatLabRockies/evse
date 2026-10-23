import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'

import { CampusSelectionService } from '../../campus-selection.service'
import {
  createEvseAvailabilityStub,
  provideEvseAvailabilityStub,
} from '../../testing/evse-availability.stub'
import { HomePage } from './home-page'

describe('HomePage', () => {
  const availability = createEvseAvailabilityStub()

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideEvseAvailabilityStub(availability)],
    })
  })

  const render = async () => {
    const fixture = TestBed.createComponent(HomePage)
    await fixture.whenStable()
    const host = fixture.nativeElement as HTMLElement
    return {
      fixture,
      host,
      tabList: host.querySelector<HTMLElement>('[role="tablist"]')!,
      tabs: () => Array.from(host.querySelectorAll<HTMLElement>('[role="tab"]')),
      panels: () => Array.from(host.querySelectorAll<HTMLElement>('[role="tabpanel"]')),
    }
  }

  afterEach(() => localStorage.clear())

  it('presents the campuses as an accessible tab list with one rendered panel', async () => {
    const { tabList, tabs, panels } = await render()

    expect(tabList.getAttribute('aria-label')).toBe('Campus')
    expect(tabs().map((tab) => tab.textContent?.trim())).toEqual(['STM', 'Flatirons'])
    expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false'])
    expect(tabs().map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1'])
    expect(tabs()[0].getAttribute('aria-controls')).toBe(panels()[0].id)
    expect(panels()[0].getAttribute('aria-labelledby')).toBe(tabs()[0].id)
    expect(panels().map((panel) => panel.hasAttribute('inert'))).toEqual([false, true])
    expect(panels()[0].querySelector('app-campus-availability')).toBeTruthy()
    expect(panels()[1].querySelector('app-campus-availability')).toBeNull()
    expect(panels()[0].querySelector('ul')?.getAttribute('aria-label')).toBe(
      'Available chargers at South Table Mountain',
    )
  })

  it('switches campus from the keyboard and remembers the choice', async () => {
    const { fixture, tabList, tabs, panels } = await render()
    const selection = TestBed.inject(CampusSelectionService)

    tabs()[0].focus()
    tabList.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await fixture.whenStable()

    expect(selection.campus()).toBe('flatirons')
    expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true'])
    expect(panels().map((panel) => panel.hasAttribute('inert'))).toEqual([true, false])
    expect(panels()[0].querySelector('app-campus-availability')).toBeNull()
    expect(
      Array.from(panels()[1].querySelectorAll('ul a')).map((link) =>
        link.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(['West 6', 'East 6'])

    tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await fixture.whenStable()

    expect(selection.campus()).toBe('stm')
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true')
  })

  it('opens on the remembered campus', async () => {
    localStorage.setItem('evse-campus', 'flatirons')
    const { tabs, panels } = await render()

    expect(tabs()[1].getAttribute('aria-selected')).toBe('true')
    expect(panels()[1].querySelector('app-campus-availability')).toBeTruthy()
  })

  it('reflects loading and error states in the status line', async () => {
    availability.lastUpdated.set(null)
    availability.isLoading.set(true)
    const { fixture, host } = await render()
    const status = () => host.querySelector('p')?.textContent?.replace(/\s+/g, ' ').trim()

    expect(status()).toBe('Loading current data…')

    availability.isLoading.set(false)
    availability.hasError.set(true)
    await fixture.whenStable()
    expect(status()).toBe('Data unavailable. Retrying…')

    availability.lastUpdated.set(new Date('2026-08-05T01:05:00-06:00'))
    availability.lastUpdatedRelative.set('2 minutes ago')
    await fixture.whenStable()
    expect(status()).toBe(
      'Updated 2 minutes ago The latest refresh failed. Retrying automatically.',
    )
  })
})
