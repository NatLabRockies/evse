import { Component, computed, inject, input } from '@angular/core'
import { RouterLink } from '@angular/router'

import { EvseAvailabilityService } from '../../evse-availability.service'
import { ParkingArea } from '../../garage-levels'
import { accentColors, availabilityText } from '../accent'
import { WHEELCHAIR_ICON } from '../icons'

@Component({
  selector: 'app-level-status-header',
  imports: [RouterLink],
  templateUrl: './level-status-header.html',
})
export class LevelStatusHeader {
  readonly level = input.required<ParkingArea>()
  readonly actionLabel = input.required<string>()
  readonly actionLink = input.required<readonly (string | number)[]>()
  /** When set, the heading tells screen readers that this is the area's map view. */
  readonly mapView = input(false)

  private readonly availabilityService = inject(EvseAvailabilityService)

  protected readonly wheelchairIcon = WHEELCHAIR_ICON
  protected readonly accentColors = accentColors

  protected readonly status = computed(() => {
    const level = this.level()
    if (level === 'fc') {
      return { ...this.availabilityService.flatironsStatus(), accessible: false }
    }

    return (
      this.availabilityService.chargerLevels().find((item) => item.level === level) ?? {
        available: null,
        accent: null,
        accessible: false,
      }
    )
  })
  protected readonly statusText = computed(() => {
    const { available, accent, accessible } = this.status()
    return availabilityText(available, accent, accessible)
  })
}
