export const GARAGE_LEVELS = [1, 2, 3, 4] as const

export type GarageLevel = (typeof GARAGE_LEVELS)[number]

export type ParkingArea = GarageLevel | 'fc'

/** Router commands for a parking area's pages, e.g. `['/level', 2]` or `['/fc', 'map']`. */
export const areaLink = (area: ParkingArea, ...segments: readonly string[]): (string | number)[] =>
  area === 'fc' ? ['/fc', ...segments] : ['/level', area, ...segments]
