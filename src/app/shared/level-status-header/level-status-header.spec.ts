import { inputBinding } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'

import { ParkingArea } from '../../garage-levels'
import {
  createEvseAvailabilityStub,
  provideEvseAvailabilityStub,
} from '../../testing/evse-availability.stub'
import { LevelStatusHeader } from './level-status-header'

describe('LevelStatusHeader', () => {
  const availability = createEvseAvailabilityStub()

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideEvseAvailabilityStub(availability)],
    })
  })

  const render = async (level: ParkingArea, mapView = false) => {
    const actionLink = ['/level', level, 'map']
    const fixture = TestBed.createComponent(LevelStatusHeader, {
      bindings: [
        inputBinding('level', () => level),
        inputBinding('actionLabel', () => 'View Map'),
        inputBinding('actionLink', () => actionLink),
        inputBinding('mapView', () => mapView),
      ],
    })
    await fixture.whenStable()
    return fixture.nativeElement as HTMLElement
  }

  /** The availability badge, found by the text that screen readers announce for it. */
  const badgeAnnouncing = (host: HTMLElement, text: string) =>
    Array.from(host.querySelectorAll('.sr-only')).find(
      (element) => element.textContent?.trim() === text,
    )?.parentElement

  it('summarizes a garage level with its accent color and action link', async () => {
    const host = await render(3)
    const badge = badgeAnnouncing(host, '2 available, accessible charging')

    expect(host.querySelector('h1')?.textContent?.trim()).toBe('LEVEL 3')
    expect(badge?.style.backgroundColor).toBe('var(--color-available)')
    expect(badge?.querySelector('svg')).toBeTruthy()
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/level/3/map')
    expect(host.querySelector('a')?.textContent).toContain('View Map')
  })

  it('tells screen readers when the heading is for the map view', async () => {
    const host = await render(3, true)

    expect(host.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('LEVEL 3 map')
  })

  it('summarizes the Flatirons lot without an accessibility marker', async () => {
    const host = await render('fc')
    const badge = badgeAnnouncing(host, '12 available')

    expect(host.querySelector('h1')?.textContent).toContain('Flatirons')
    expect(badge?.textContent).toContain('12')
    expect(badge?.querySelector('svg')).toBeNull()
  })

  it('names the legend colors for screen readers', async () => {
    const host = await render(3)

    expect(Array.from(host.querySelectorAll('dd')).map((dd) => dd.textContent?.trim())).toEqual([
      'Gold',
      'Purple with an X',
    ])
  })

  it('announces a level whose chargers are all offline', async () => {
    availability.chargerLevels.set([
      { level: 4, label: 'Level 4', available: 0, accent: 'offline', accessible: false },
    ])
    const host = await render(4)
    const badge = badgeAnnouncing(host, '0 available, all offline')

    expect(badge?.style.backgroundColor).toBe('var(--color-offline)')
  })

  it('shows a placeholder while availability is unknown', async () => {
    availability.chargerLevels.set([
      { level: 1, label: 'Level 1', available: null, accent: null, accessible: false },
    ])
    const host = await render(1)
    const badge = badgeAnnouncing(host, 'Availability loading')

    expect(badge?.textContent).toContain('—')
    expect(badge?.style.backgroundColor).toBe('var(--color-loading)')
  })
})
