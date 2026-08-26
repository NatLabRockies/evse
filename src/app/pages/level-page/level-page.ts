import { Component, inject } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'

import { GarageLevel } from '../../garage-levels'
import { GarageLevelMap } from '../../shared/garage-level-map/garage-level-map'
import { LevelNavigation } from '../../shared/level-navigation/level-navigation'
import {
  ParkingLine,
  ParkingLineOrientation,
  ParkingSpaceId,
} from '../../shared/parking-line/parking-line'
import { LevelStatusHeader } from '../../shared/level-status-header/level-status-header'

type RegionId = 'northwest' | 'center-west' | 'center-east'

interface ParkingRegion {
  readonly id: RegionId
  readonly label: string
  readonly orientation: ParkingLineOrientation
  readonly spaces: readonly ParkingSpaceId[]
  readonly accessible?: boolean
  readonly reverseCars?: boolean
}

interface LevelRegions {
  readonly northwest?: ParkingRegion
  readonly center: readonly ParkingRegion[]
}

const chargerSpaces = (prefix: string, count: number): readonly string[] =>
  Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(2, '0')}`)

const nonChargingSpaces = (count: number): readonly null[] =>
  Array.from({ length: count }, () => null)

const region = (
  id: RegionId,
  label: string,
  orientation: ParkingLineOrientation,
  spaces: readonly ParkingSpaceId[],
  accessible = false,
): ParkingRegion => ({
  id,
  label,
  orientation,
  spaces,
  accessible,
  reverseCars: id === 'center-west',
})

const LEVEL_REGIONS: Readonly<Record<GarageLevel, LevelRegions>> = {
  1: {
    center: [region('center-east', 'Center East', 'vertical', chargerSpaces('LV11', 16))],
  },
  2: {
    northwest: region('northwest', 'Northwest', 'horizontal', chargerSpaces('LV23', 18)),
    center: [
      region('center-west', 'Center West', 'vertical', chargerSpaces('LV22', 18)),
      region('center-east', 'Center East', 'vertical', chargerSpaces('LV21', 18)),
    ],
  },
  3: {
    center: [
      region('center-west', 'Center West', 'vertical', [...nonChargingSpaces(12), 'LV22-20'], true),
      region('center-east', 'Center East', 'vertical', [...nonChargingSpaces(12), 'LV22-19'], true),
    ],
  },
  4: {
    center: [
      region('center-west', 'Center West', 'vertical', chargerSpaces('LV32', 18)),
      region('center-east', 'Center East', 'vertical', [
        ...chargerSpaces('LV31', 10),
        ...nonChargingSpaces(8),
      ]),
    ],
  },
}

@Component({
  selector: 'app-level-page',
  imports: [GarageLevelMap, LevelNavigation, LevelStatusHeader, ParkingLine, RouterLink],
  templateUrl: './level-page.html',
  styleUrl: './level-page.css',
})
export class LevelPage {
  protected readonly level: GarageLevel = inject(ActivatedRoute).snapshot.data['level']
  protected readonly regions = LEVEL_REGIONS[this.level]
}
