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

  const render = async (level: ParkingArea) => {
    const actionLink = ['/level', level, 'map']
    const fixture = TestBed.createComponent(LevelStatusHeader, {
      bindings: [
        inputBinding('level', () => level),
        inputBinding('actionLabel', () => 'View Map'),
        inputBinding('actionLink', () => actionLink),
      ],
    })
    await fixture.whenStable()
    return fixture.nativeElement as HTMLElement
  }

  it('summarizes a garage level with its accent color and action link', async () => {
    const host = await render(3)
    const badge = host.querySelector<HTMLElement>('[aria-label="2 available"]')

    expect(host.querySelector('h1')?.textContent).toContain('LEVEL 3')
    expect(badge?.style.backgroundColor).toBe('var(--color-available)')
    expect(badge?.querySelector('svg')).toBeTruthy()
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/level/3/map')
    expect(host.querySelector('a')?.textContent).toContain('View Map')
  })

  it('summarizes the Flatirons lot without an accessibility marker', async () => {
    const host = await render('fc')
    const badge = host.querySelector<HTMLElement>('[aria-label="12 available"]')

    expect(host.querySelector('h1')?.textContent).toContain('Flatirons')
    expect(badge?.textContent).toContain('12')
    expect(badge?.querySelector('svg')).toBeNull()
  })

  it('shows a placeholder while availability is unknown', async () => {
    availability.chargerLevels.set([
      { level: 1, label: 'Level 1', available: null, accent: null, accessible: false },
    ])
    const host = await render(1)
    const badge = host.querySelector<HTMLElement>('[aria-label="Availability loading"]')

    expect(badge?.textContent).toContain('—')
    expect(badge?.style.backgroundColor).toBe('var(--color-loading)')
  })
})
