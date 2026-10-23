import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { vi } from 'vitest'

import { rememberCampus, routes } from './app.routes'
import { CampusSelectionService } from './campus-selection.service'
import { stubLocalStorage } from './testing/local-storage.stub'

describe('routes', () => {
  it('declares a spaces view and a map view for every parking area', () => {
    const paths = routes.map((route) => route.path)

    expect(paths).toEqual([
      '',
      'fc',
      'fc/map',
      'level/1',
      'level/1/map',
      'level/2',
      'level/2/map',
      'level/3',
      'level/3/map',
      'level/4',
      'level/4/map',
      '**',
    ])
    expect(routes.filter((route) => route.data?.['level'] !== undefined)).toHaveLength(10)
    expect(routes.filter((route) => route.canActivate?.includes(rememberCampus))).toHaveLength(10)
  })
})

describe('rememberCampus', () => {
  beforeEach(() => stubLocalStorage())
  afterEach(() => vi.restoreAllMocks())

  const activate = (level: unknown) =>
    TestBed.runInInjectionContext(() =>
      rememberCampus(
        { data: { level } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    )

  it('remembers the campus of the page being opened and allows navigation', () => {
    const selection = TestBed.inject(CampusSelectionService)

    expect(activate('fc')).toBe(true)
    expect(selection.campus()).toBe('flatirons')

    expect(activate(2)).toBe(true)
    expect(selection.campus()).toBe('stm')
  })
})
