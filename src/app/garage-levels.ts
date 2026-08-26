export const GARAGE_LEVELS = [1, 2, 3, 4] as const

export type GarageLevel = (typeof GARAGE_LEVELS)[number]
