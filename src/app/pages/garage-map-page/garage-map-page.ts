import { Component, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'

import { CampusSelectionService } from '../../campus-selection.service'
import { ParkingArea } from '../../garage-levels'
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
  protected readonly level = inject(ActivatedRoute).snapshot.data['level'] as ParkingArea
  protected readonly spacesLink = this.level === 'fc' ? ['/fc'] : ['/level', this.level]

  constructor() {
    inject(CampusSelectionService).select(this.level === 'fc' ? 'flatirons' : 'stm')
  }
}
