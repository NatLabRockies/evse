import { TestBed } from '@angular/core/testing'
import { vi } from 'vitest'

import {
  CAMPUS_STORAGE_KEY,
  CampusSelectionService,
  campusFor,
  campusName,
  isCampus,
} from './campus-selection.service'
import { stubLocalStorage } from './testing/local-storage.stub'

describe('campus helpers', () => {
  it('maps parking areas to campuses', () => {
    expect(campusFor('fc')).toBe('flatirons')
    expect(campusFor(1)).toBe('stm')
    expect(campusFor(4)).toBe('stm')
  })

  it('recognizes campus ids', () => {
    expect(isCampus('stm')).toBe(true)
    expect(isCampus('flatirons')).toBe(true)
    expect(isCampus('denver')).toBe(false)
    expect(isCampus(undefined)).toBe(false)
  })

  it('names campuses', () => {
    expect(campusName('stm')).toBe('South Table Mountain')
    expect(campusName('flatirons')).toBe('Flatirons')
  })
})

describe('CampusSelectionService', () => {
  let storage: Storage

  beforeEach(() => {
    storage = stubLocalStorage()
  })

  afterEach(() => vi.restoreAllMocks())

  it('defaults to STM when nothing is stored', () => {
    expect(TestBed.inject(CampusSelectionService).campus()).toBe('stm')
  })

  it('restores a stored campus and ignores unknown values', () => {
    storage.setItem(CAMPUS_STORAGE_KEY, 'flatirons')
    expect(TestBed.inject(CampusSelectionService).campus()).toBe('flatirons')

    TestBed.resetTestingModule()
    storage.setItem(CAMPUS_STORAGE_KEY, 'moon')
    expect(TestBed.inject(CampusSelectionService).campus()).toBe('stm')
  })

  it('stores the selection', () => {
    const service = TestBed.inject(CampusSelectionService)

    service.select('flatirons')

    expect(service.campus()).toBe('flatirons')
    expect(storage.getItem(CAMPUS_STORAGE_KEY)).toBe('flatirons')
  })

  it('keeps working when storage is unavailable', () => {
    vi.spyOn(document.defaultView!, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    const service = TestBed.inject(CampusSelectionService)

    expect(service.campus()).toBe('stm')
    expect(() => service.select('flatirons')).not.toThrow()
    expect(service.campus()).toBe('flatirons')
    expect(storage.length).toBe(0)
  })
})
