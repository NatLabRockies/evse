import { HttpClient } from '@angular/common/http'
import { Injectable, inject, signal } from '@angular/core'
import { EMPTY, catchError, finalize, retry } from 'rxjs'

import { GARAGE_LEVELS, ParkingArea } from '../../garage-levels'

const PARKING_AREAS: readonly ParkingArea[] = [...GARAGE_LEVELS, 'fc']

const svgUrl = (area: ParkingArea): string =>
  area === 'fc' ? 'levels/fc.svg' : `levels/level-${area}.svg`

@Injectable({ providedIn: 'root' })
export class GarageLevelSvgService {
  private readonly http = inject(HttpClient)
  private readonly sourcesState = signal<Partial<Record<ParkingArea, string>>>({})
  private readonly loadingState = signal(new Set<ParkingArea>(PARKING_AREAS))
  private lastSource = ''

  constructor() {
    for (const area of PARKING_AREAS) {
      this.http
        .get(svgUrl(area), { responseType: 'text' })
        .pipe(
          retry({ count: 2, delay: 1_000 }),
          catchError(() => EMPTY),
          finalize(() => {
            this.loadingState.update((loading) => {
              const updated = new Set(loading)
              updated.delete(area)
              return updated
            })
          }),
        )
        .subscribe((source) => {
          this.sourcesState.update((sources) => ({ ...sources, [area]: source }))
        })
    }
  }

  sourceFor(area: ParkingArea): string {
    const source = this.sourcesState()[area]
    if (source) {
      this.lastSource = source
    }

    return source ?? (this.loadingState().has(area) ? this.lastSource : '')
  }

  isLoading(area: ParkingArea): boolean {
    return this.loadingState().has(area)
  }
}
