import { inputBinding } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'

import {
  createEvseAvailabilityStub,
  provideEvseAvailabilityStub,
} from '../../testing/evse-availability.stub'
import { LevelNavigation } from './level-navigation'

describe('LevelNavigation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideEvseAvailabilityStub(createEvseAvailabilityStub())],
    })
  })

  const render = async (showLevels: boolean, mapView: boolean) => {
    const fixture = TestBed.createComponent(LevelNavigation, {
      bindings: [
        inputBinding('showLevels', () => showLevels),
        inputBinding('mapView', () => mapView),
      ],
    })
    await fixture.whenStable()
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'))
  }

  it('links home and to every level, carrying the live count and accessibility marker', async () => {
    const links = await render(true, false)

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/level/1',
      '/level/2',
      '/level/3',
      '/level/4',
    ])
    expect(links.map((link) => link.querySelector('.level-count')?.textContent?.trim())).toEqual([
      undefined,
      '5',
      '14',
      '2',
      '0',
    ])
    expect(links.map((link) => link.querySelectorAll('svg').length)).toEqual([1, 0, 0, 1, 0])
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      null,
      'Level 1, 5 available',
      'Level 2, 14 available',
      'Level 3, 2 available, accessible charging',
      'Level 4, 0 available, all offline',
    ])
    // Punctuation aside, each level's visible text in markup order begins its accessible name
    // (WCAG 2.5.3 Label in Name).
    expect(links.map((link) => link.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Home',
      'Level 1 5',
      'Level 2 14',
      'Level 3 2',
      'Level 4 0',
    ])
    expect(links[4].style.getPropertyValue('--active-background')).toBe('var(--color-offline)')
  })

  it('links to the map views when showing a map', async () => {
    const links = await render(true, true)

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/level/1/map',
      '/level/2/map',
      '/level/3/map',
      '/level/4/map',
    ])
  })

  it('shows only the home link for areas without levels', async () => {
    const links = await render(false, false)

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/'])
  })
})
