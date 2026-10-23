import { inject } from '@angular/core'
import { CanActivateFn, Routes } from '@angular/router'

import { CampusSelectionService, campusFor } from './campus-selection.service'
import { GARAGE_LEVELS, ParkingArea } from './garage-levels'
import { HomePage } from './pages/home-page/home-page'

/** Opening an area's page makes its campus the one the home page shows next time. */
export const rememberCampus: CanActivateFn = (route) => {
  inject(CampusSelectionService).select(campusFor(route.data['level'] as ParkingArea))
  return true
}

/** The spaces view and map view of one parking area, sharing its `level` route data. */
const areaRoutes = (path: string, level: ParkingArea, title: string, mapTitle: string): Routes => [
  {
    path,
    loadComponent: () => import('./pages/level-page/level-page').then((m) => m.LevelPage),
    canActivate: [rememberCampus],
    data: { level },
    title: `${title} | NLR EVSE`,
  },
  {
    path: `${path}/map`,
    loadComponent: () =>
      import('./pages/garage-map-page/garage-map-page').then((m) => m.GarageMapPage),
    canActivate: [rememberCampus],
    data: { level },
    title: `${mapTitle} | NLR EVSE`,
  },
]

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomePage,
    title: 'Find a Charger | NLR EVSE',
  },
  ...areaRoutes('fc', 'fc', 'Flatirons Campus', 'Flatirons Campus Map'),
  ...GARAGE_LEVELS.flatMap((level) =>
    areaRoutes(`level/${level}`, level, `Level ${level}`, `Level ${level} Garage Map`),
  ),
  { path: '**', redirectTo: '' },
]
