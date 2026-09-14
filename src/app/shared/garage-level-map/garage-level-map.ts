import { Component, computed, inject, input } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'

import { ChargerStatus, EvseAvailabilityService } from '../../evse-availability.service'
import { ParkingArea } from '../../garage-levels'
import { GarageLevelSvgService } from './garage-level-svg.service'

type MapStatus = ChargerStatus | 'loading'

const STATUS_FILL: Readonly<Record<MapStatus, string>> = {
  available: 'var(--color-available)',
  'in-use': 'var(--color-in-use)',
  offline: 'var(--color-offline)',
  loading: 'rgb(255 255 255 / 18%)',
}

const PARKING_SPACE_PATTERN = /(?:^|[-_])(lv\d{2}-\d{2}|[1-8][ab])_?$/i
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const OFFLINE_PATTERN_ID = 'evse-dashboard-offline-cross'

function offlinePatternFill(svgDocument: Document): string {
  if (!svgDocument.getElementById(OFFLINE_PATTERN_ID)) {
    const svg = svgDocument.querySelector('svg')
    if (!svg) {
      return STATUS_FILL.offline
    }

    let definitions = svg.querySelector('defs')
    if (!definitions) {
      definitions = svgDocument.createElementNS(SVG_NAMESPACE, 'defs')
      svg.prepend(definitions)
    }

    const pattern = svgDocument.createElementNS(SVG_NAMESPACE, 'pattern')
    pattern.id = OFFLINE_PATTERN_ID
    pattern.setAttribute('width', '1')
    pattern.setAttribute('height', '1')
    pattern.setAttribute('patternUnits', 'objectBoundingBox')
    pattern.setAttribute('patternContentUnits', 'objectBoundingBox')

    const background = svgDocument.createElementNS(SVG_NAMESPACE, 'rect')
    background.setAttribute('width', '1')
    background.setAttribute('height', '1')
    background.setAttribute('fill', STATUS_FILL.offline)

    const cross = svgDocument.createElementNS(SVG_NAMESPACE, 'path')
    cross.setAttribute('d', 'M0 0L1 1M1 0L0 1')
    cross.setAttribute('fill', 'none')
    cross.setAttribute('stroke', 'var(--color-nlr-navy)')
    cross.setAttribute('stroke-width', '0.04')

    pattern.append(background, cross)
    definitions.append(pattern)
  }

  return `url(#${OFFLINE_PATTERN_ID})`
}

export function applyStationStatuses(
  svgDocument: Document,
  stationStatuses: Readonly<Record<string, ChargerStatus>>,
): void {
  for (const element of svgDocument.querySelectorAll<SVGElement>('[id]')) {
    const parkingSpace = element.id.match(PARKING_SPACE_PATTERN)?.[1].toUpperCase()
    if (!parkingSpace) {
      continue
    }

    const status = stationStatuses[parkingSpace] ?? 'loading'
    element.dataset['status'] = status

    const elementId = element.id.toLowerCase()
    if (elementId.includes('handicap')) {
      element.style.display = status === 'in-use' ? 'none' : ''
    } else if (elementId.includes('car')) {
      element.style.fill = status === 'in-use' ? '#231f20' : 'none'
      // Illustrator can put fill:none on symbol paths; let each use supply its color.
      const reference = element.getAttribute('href') ?? element.getAttribute('xlink:href')
      if (reference?.startsWith('#')) {
        const symbol = svgDocument.getElementById(reference.slice(1))
        for (const path of symbol?.querySelectorAll('path') ?? []) {
          path.style.fill = 'inherit'
        }
      }
    } else if (
      !elementId.includes('offline') &&
      ['rect', 'path'].includes(element.tagName.toLowerCase())
    ) {
      element.style.fill =
        status === 'offline' ? offlinePatternFill(svgDocument) : STATUS_FILL[status]
    }
  }
}

export function renderGarageLevelSvg(
  source: string,
  stationStatuses: Readonly<Record<string, ChargerStatus>>,
): string {
  const svgDocument = new DOMParser().parseFromString(source, 'image/svg+xml')
  const svg = svgDocument.querySelector('svg')
  if (!svg || svgDocument.querySelector('parsererror')) {
    return ''
  }

  applyStationStatuses(svgDocument, stationStatuses)
  svg.style.width = '100%'
  svg.style.height = '100%'
  svg.style.display = 'block'
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')

  return new XMLSerializer().serializeToString(svg)
}

@Component({
  selector: 'app-garage-level-map',
  templateUrl: './garage-level-map.html',
  styleUrl: './garage-level-map.css',
})
export class GarageLevelMap {
  private readonly availabilityService = inject(EvseAvailabilityService)
  private readonly svgService = inject(GarageLevelSvgService)
  private readonly sanitizer = inject(DomSanitizer)

  readonly level = input.required<ParkingArea>()

  protected readonly svgSource = computed(() => this.svgService.sourceFor(this.level()))
  protected readonly svgLoading = computed(() => this.svgService.isLoading(this.level()))
  protected readonly svgMarkup = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      renderGarageLevelSvg(this.svgSource(), this.availabilityService.stationStatuses()),
    ),
  )
}
