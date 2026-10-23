import { inputBinding } from '@angular/core'
import { TestBed } from '@angular/core/testing'

import {
  createEvseAvailabilityStub,
  provideEvseAvailabilityStub,
} from '../../testing/evse-availability.stub'
import {
  ParkingLine,
  ParkingLineOrientation,
  describeElapsedTime,
  formatElapsedTime,
} from './parking-line'

const MINUTE = 60_000

describe('formatElapsedTime', () => {
  it.each([
    [0, '0m'],
    [59_999, '0m'],
    [7 * MINUTE, '7m'],
    [60 * MINUTE, '1h'],
    [63 * MINUTE, '1h 3m'],
    [26 * 60 * MINUTE + 30 * MINUTE, '26h 30m'],
    [-5 * MINUTE, '0m'],
  ])('formats %i ms as %s', (elapsed, expected) => {
    expect(formatElapsedTime(1_000_000, 1_000_000 + elapsed)).toBe(expected)
  })
})

describe('describeElapsedTime', () => {
  it.each([
    [0, 'less than a minute'],
    [59_999, 'less than a minute'],
    [MINUTE, '1 minute'],
    [7 * MINUTE, '7 minutes'],
    [60 * MINUTE, '1 hour'],
    [63 * MINUTE, '1 hour 3 minutes'],
    [26 * 60 * MINUTE + 30 * MINUTE, '26 hours 30 minutes'],
    [-5 * MINUTE, 'less than a minute'],
  ])('describes %i ms as %s', (elapsed, expected) => {
    expect(describeElapsedTime(1_000_000, 1_000_000 + elapsed)).toBe(expected)
  })
})

describe('ParkingLine', () => {
  const availability = createEvseAvailabilityStub()

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideEvseAvailabilityStub(availability)] })
  })

  const render = async (
    spaces: readonly (string | null)[],
    options: {
      orientation?: ParkingLineOrientation
      accessible?: boolean
      reverseCars?: boolean
    } = {},
  ) => {
    const fixture = TestBed.createComponent(ParkingLine, {
      bindings: [
        inputBinding('label', () => 'Center East'),
        inputBinding('orientation', () => options.orientation ?? 'vertical'),
        inputBinding('spaces', () => spaces),
        inputBinding('accessible', () => options.accessible ?? false),
        inputBinding('reverseCars', () => options.reverseCars ?? false),
      ],
    })
    await fixture.whenStable()
    return fixture
  }

  const spacesOf = (host: HTMLElement) => Array.from(host.querySelectorAll<HTMLElement>('li'))

  it('renders one space per entry with its live status', async () => {
    const fixture = await render(['LV22-01', 'LV21-01', 'LV23-01', null, 'LV99-01'])
    const spaces = spacesOf(fixture.nativeElement)

    expect(spaces.map((space) => space.dataset['status'])).toEqual([
      'available',
      'in-use',
      'offline',
      'non-charging',
      'loading',
    ])
    expect(spaces.map((space) => space.textContent?.trim())).toEqual([
      'LV22-01: available',
      'LV21-01: in use for 1 hour 3 minutes',
      'LV23-01: offline',
      'Center East space 4: no charger',
      'LV99-01: loading',
    ])
    expect(fixture.nativeElement.querySelector('ol')?.getAttribute('aria-label')).toBe(
      'Center East parking spaces',
    )
  })

  it('shows a car with the elapsed charging time for occupied spaces', async () => {
    const fixture = await render(['LV21-01', 'LV22-20'])
    const [charging, occupied] = spacesOf(fixture.nativeElement)

    expect(charging.querySelector('.car-icon')).toBeTruthy()
    expect(charging.getAttribute('title')).toBe('1h 3m')
    expect(occupied.querySelector('.car-icon')).toBeTruthy()
    expect(occupied.hasAttribute('title')).toBe(false)
    expect(occupied.textContent?.trim()).toBe('LV22-20: in use')

    availability.currentTime.set(new Date('2026-08-05T02:00:00-06:00'))
    await fixture.whenStable()

    expect(charging.getAttribute('title')).toBe('1h 58m')
    expect(charging.textContent?.trim()).toBe('LV21-01: in use for 1 hour 58 minutes')
  })

  it('lays cars across vertical lines and along horizontal ones', async () => {
    const vertical = await render(['LV21-01'], { orientation: 'vertical' })
    expect(vertical.nativeElement.classList).toContain('is-vertical')
    expect(vertical.nativeElement.querySelector('.car-icon')?.getAttribute('viewBox')).toBe(
      '0 0 33 16',
    )

    const horizontal = await render(['LV21-01'], { orientation: 'horizontal', reverseCars: true })
    expect(horizontal.nativeElement.classList).toContain('is-horizontal')
    expect(horizontal.nativeElement.querySelector('.car-icon')?.getAttribute('viewBox')).toBe(
      '0 0 16 33',
    )
    expect(horizontal.nativeElement.querySelector('ol')?.classList).toContain('has-reversed-cars')
  })

  it('exposes the space count for the layout and marks accessible spaces', async () => {
    const fixture = await render([null, 'LV22-19', 'LV22-20'], { accessible: true })
    const spaces = spacesOf(fixture.nativeElement)

    expect(fixture.nativeElement.style.getPropertyValue('--space-count')).toBe('3')
    expect(spaces[1].querySelector('.wheelchair-icon')).toBeTruthy()
    expect(spaces[1].textContent?.trim()).toBe('LV22-19: available, accessible')
    expect(spaces[2].querySelector('.wheelchair-icon')).toBeNull()
    expect(spaces[2].querySelector('.car-icon')).toBeTruthy()
  })
})
