export const FLATIRONS_REGIONS = [
  { id: 'west', label: 'West', spaces: ['5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B'] },
  // 4A and 4B share a single physical parking space, represented by 4A.
  { id: 'east', label: 'East', spaces: ['1A', '1B', '2A', '2B', '3A', '3B', '4A'] },
] as const
