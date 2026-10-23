import { Component, computed, input } from '@angular/core'

import { ParkingArea, areaLink } from '../../garage-levels'
import { CompassRose } from '../../shared/compass-rose/compass-rose'
import { GarageLevelMap } from '../../shared/garage-level-map/garage-level-map'
import { LevelNavigation } from '../../shared/level-navigation/level-navigation'
import { LevelStatusHeader } from '../../shared/level-status-header/level-status-header'

@Component({
  selector: 'app-garage-map-page',
  imports: [CompassRose, GarageLevelMap, LevelNavigation, LevelStatusHeader],
  templateUrl: './garage-map-page.html',
  styleUrl: './garage-map-page.css',
})
export class GarageMapPage {
  /** Bound from the route's `data.level`. */
  readonly level = input.required<ParkingArea>()

  protected readonly spacesLink = computed(() => areaLink(this.level()))
}
