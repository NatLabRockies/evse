import { Component, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'

import { GarageLevel } from '../../garage-levels'
import { GarageLevelMap } from '../../shared/garage-level-map/garage-level-map'
import { LevelNavigation } from '../../shared/level-navigation/level-navigation'
import { LevelStatusHeader } from '../../shared/level-status-header/level-status-header'

@Component({
  selector: 'app-garage-map-page',
  imports: [GarageLevelMap, LevelNavigation, LevelStatusHeader],
  templateUrl: './garage-map-page.html',
  styleUrl: './garage-map-page.css',
})
export class GarageMapPage {
  protected readonly level = inject(ActivatedRoute).snapshot.data['level'] as GarageLevel
}
