import { Routes } from '@angular/router'

import { GarageMapPage } from './pages/garage-map-page/garage-map-page'
import { HomePage } from './pages/home-page/home-page'
import { LevelPage } from './pages/level-page/level-page'
import { GARAGE_LEVELS } from './garage-levels'

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomePage,
    title: 'Find a Charger | NLR EVSE',
  },
  ...GARAGE_LEVELS.flatMap((level) => [
    {
      path: `level/${level}`,
      component: LevelPage,
      data: { level },
      title: `Level ${level} | NLR EVSE`,
    },
    {
      path: `level/${level}/map`,
      component: GarageMapPage,
      data: { level },
      title: `Level ${level} Garage Map | NLR EVSE`,
    },
  ]),
  { path: '**', redirectTo: '' },
]
