import { Component, computed, inject, input } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'

import { EvseAvailabilityService } from '../../evse-availability.service'
import { areaLink } from '../../garage-levels'
import { accentColors } from '../accent'
import { WHEELCHAIR_ICON } from '../icons'

@Component({
  selector: 'app-level-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './level-navigation.html',
  styleUrl: './level-navigation.css',
})
export class LevelNavigation {
  readonly showLevels = input(true)
  /** When set, level links open each level's map rather than its spaces view. */
  readonly mapView = input(false)

  private readonly availabilityService = inject(EvseAvailabilityService)

  protected readonly wheelchairIcon = WHEELCHAIR_ICON
  protected readonly levels = computed(() =>
    this.showLevels()
      ? this.availabilityService.chargerLevels().map((level) => ({
          ...level,
          colors: accentColors(level.accent),
          link: this.mapView() ? areaLink(level.level, 'map') : areaLink(level.level),
        }))
      : [],
  )
}
