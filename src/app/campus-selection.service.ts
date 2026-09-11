import { DOCUMENT } from '@angular/common'
import { Injectable, inject, signal } from '@angular/core'

export type Campus = 'golden' | 'flatirons'
export const CAMPUS_STORAGE_KEY = 'evse-campus'

@Injectable({ providedIn: 'root' })
export class CampusSelectionService {
  private readonly document = inject(DOCUMENT)
  private readonly campusState = signal<Campus>(this.loadCampus())

  readonly campus = this.campusState.asReadonly()

  select(campus: Campus): void {
    this.campusState.set(campus)
    try {
      this.document.defaultView?.localStorage.setItem(CAMPUS_STORAGE_KEY, campus)
    } catch {
      // Keep the selection for this visit when storage is unavailable.
    }
  }

  private loadCampus(): Campus {
    try {
      if (this.document.defaultView?.localStorage.getItem(CAMPUS_STORAGE_KEY) === 'flatirons') {
        return 'flatirons'
      }
    } catch {
      // Default to Golden when storage is unavailable.
    }
    return 'golden'
  }
}
