import { httpResource } from '@angular/common/http'
import { Component, computed, inject, input } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'

import { ChargerStatus, EvseAvailabilityService } from '../../evse-availability.service'
import { GarageLevel } from '../../garage-levels'

type MapStatus = ChargerStatus | 'loading'

const STATUS_FILL: Readonly<Record<MapStatus, string>> = {
  available: 'var(--color-available, #4fab47)',
  'in-use': 'var(--color-in-use, #db9728)',
  offline: 'var(--color-offline, #996bae)',
  loading: 'rgb(255 255 255 / 18%)',
}

const PARKING_SPACE_PATTERN = /lv\d{2}-\d{2}/i

export function applyStationStatuses(
  svgDocument: Document,
  stationStatuses: Readonly<Record<string, ChargerStatus>>,
): void {
  for (const element of svgDocument.querySelectorAll<SVGElement>('[id]')) {
    const parkingSpace = element.id.match(PARKING_SPACE_PATTERN)?.[0].toUpperCase()
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
    } else if (element.tagName.toLowerCase() === 'rect') {
      element.style.fill = STATUS_FILL[status]
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
  private readonly sanitizer = inject(DomSanitizer)

  readonly level = input.required<GarageLevel>()

  protected readonly svgSource = httpResource.text(() => `levels/level-${this.level()}.svg`, {
    defaultValue: '',
  })
  protected readonly svgMarkup = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      renderGarageLevelSvg(this.svgSource.value(), this.availabilityService.stationStatuses()),
    ),
  )
}
