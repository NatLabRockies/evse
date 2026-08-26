import { Component, inject } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'

import { EvseAvailabilityService } from '../../evse-availability.service'
import { WHEELCHAIR_ICON } from '../icons'

@Component({
  selector: 'app-level-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './level-navigation.html',
  styleUrl: './level-navigation.css',
})
export class LevelNavigation {
  private readonly availabilityService = inject(EvseAvailabilityService)

  protected readonly levels = this.availabilityService.chargerLevels
  protected readonly wheelchairIcon = WHEELCHAIR_ICON
}
