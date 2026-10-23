import { HttpResourceRef, httpResource } from '@angular/common/http'
import { Service, effect } from '@angular/core'

import { GARAGE_LEVELS, ParkingArea } from '../../garage-levels'

const PARKING_AREAS: readonly ParkingArea[] = [...GARAGE_LEVELS, 'fc']
const SVG_RETRY_COUNT = 2
const SVG_RETRY_DELAY_MS = 1_000

export const svgUrl = (area: ParkingArea): string =>
  area === 'fc' ? 'levels/fc.svg' : `levels/level-${area}.svg`

/**
 * Loads every parking-area map up front so navigating between levels is instant, and keeps
 * the markup in memory for the lifetime of the app.
 */
@Service()
export class GarageLevelSvgService {
  private readonly sources: ReadonlyMap<ParkingArea, HttpResourceRef<string | undefined>> = new Map(
    PARKING_AREAS.map((area) => [area, httpResource.text(() => svgUrl(area))]),
  )

  constructor() {
    for (const source of this.sources.values()) {
      this.retryOnError(source)
    }
  }

  /** The SVG markup for `area`, or an empty string until it is available. */
  sourceFor(area: ParkingArea): string {
    const source = this.source(area)
    return source.hasValue() ? source.value() : ''
  }

  isLoading(area: ParkingArea): boolean {
    return this.source(area).isLoading()
  }

  private source(area: ParkingArea): HttpResourceRef<string | undefined> {
    const source = this.sources.get(area)
    if (!source) {
      throw new Error(`Unknown parking area: ${area}`)
    }

    return source
  }

  private retryOnError(source: HttpResourceRef<string | undefined>): void {
    let attempts = 0
    effect((onCleanup) => {
      if (source.status() !== 'error' || attempts >= SVG_RETRY_COUNT) {
        return
      }

      attempts += 1
      const timeout = setTimeout(() => source.reload(), SVG_RETRY_DELAY_MS)
      onCleanup(() => clearTimeout(timeout))
    })
  }
}
