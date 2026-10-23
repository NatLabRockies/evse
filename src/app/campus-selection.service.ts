import { DOCUMENT, Service, inject, signal } from '@angular/core'

import { ParkingArea } from './garage-levels'

export const CAMPUSES = [
  { id: 'stm', label: 'STM', name: 'South Table Mountain' },
  { id: 'flatirons', label: 'Flatirons', name: 'Flatirons' },
] as const

export type Campus = (typeof CAMPUSES)[number]['id']
export const CAMPUS_STORAGE_KEY = 'evse-campus'

export const isCampus = (value: unknown): value is Campus =>
  CAMPUSES.some((campus) => campus.id === value)

export const campusFor = (area: ParkingArea): Campus => (area === 'fc' ? 'flatirons' : 'stm')

export const campusName = (campus: Campus): string =>
  CAMPUSES.find(({ id }) => id === campus)?.name ?? campus

/** Remembers which campus the visitor is interested in, across visits when storage allows it. */
@Service()
export class CampusSelectionService {
  private readonly document = inject(DOCUMENT)
  private readonly campusState = signal<Campus>(this.loadCampus())

  readonly campus = this.campusState.asReadonly()

  select(campus: Campus): void {
    this.campusState.set(campus)
    // Keep the selection for this visit even when storage is unavailable.
    this.withStorage((storage) => storage.setItem(CAMPUS_STORAGE_KEY, campus))
  }

  private loadCampus(): Campus {
    const stored = this.withStorage((storage) => storage.getItem(CAMPUS_STORAGE_KEY))
    return isCampus(stored) ? stored : 'stm'
  }

  /** Runs `task` against local storage, treating any storage error as "nothing stored". */
  private withStorage<T>(task: (storage: Storage) => T): T | undefined {
    try {
      const storage = this.document.defaultView?.localStorage
      return storage ? task(storage) : undefined
    } catch {
      return undefined
    }
  }
}
