import { Component, inject, input } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'

import { EvseAvailabilityService } from '../../evse-availability.service'
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
  readonly mapView = input(false)
  private readonly availabilityService = inject(EvseAvailabilityService)

  protected readonly levels = this.availabilityService.chargerLevels
  protected readonly accentColors = accentColors
  protected readonly wheelchairIcon = WHEELCHAIR_ICON
}
