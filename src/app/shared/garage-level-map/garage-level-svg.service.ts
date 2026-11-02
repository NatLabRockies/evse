import { HttpResourceRef, httpResource } from '@angular/common/http'
import { Service, effect } from '@angular/core'

import { GARAGE_LEVELS, ParkingArea } from '../../garage-levels'
import fcSvgUrl from './levels/fc.svg' with { loader: 'file' }
import level1SvgUrl from './levels/level-1.svg' with { loader: 'file' }
import level2SvgUrl from './levels/level-2.svg' with { loader: 'file' }
import level3SvgUrl from './levels/level-3.svg' with { loader: 'file' }
import level4SvgUrl from './levels/level-4.svg' with { loader: 'file' }

const PARKING_AREAS: readonly ParkingArea[] = [...GARAGE_LEVELS, 'fc']
const SVG_RETRY_COUNT = 2
const SVG_RETRY_DELAY_MS = 1_000

/**
 * The build emits each map under media/ with a content hash in its name, so a changed map gets a
 * new URL and caches can keep the old one forever.
 */
const SVG_URLS: Readonly<Record<ParkingArea, string>> = {
  1: level1SvgUrl,
  2: level2SvgUrl,
  3: level3SvgUrl,
  4: level4SvgUrl,
  fc: fcSvgUrl,
}

export const svgUrl = (area: ParkingArea): string => SVG_URLS[area]

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
