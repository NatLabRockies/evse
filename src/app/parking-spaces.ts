// At the STM campus, LV32-17 and LV32-18 serve the same physical parking space.
// At the Flatirons campus, 4A and 4B serve the same physical parking space.
// If either is occupied, the shared space is occupied; otherwise an available connector
// wins over offline.
const SHARED_SPACE_REPRESENTATIVES: Readonly<Record<string, string>> = {
  'LV32-18': 'LV32-17',
  '4B': '4A',
}

export const displayParkingSpace = (parkingSpace: string): string =>
  SHARED_SPACE_REPRESENTATIVES[parkingSpace] ?? parkingSpace
