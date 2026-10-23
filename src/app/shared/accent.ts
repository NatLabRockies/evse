import type { ChargerStatus } from '../evse-availability.service'

type AccentColors = {
  readonly background: string
  readonly foreground: string
  /** Drawn over the background so that offline differs from in use by more than color. */
  readonly pattern: string
}

const ACCENT_COLORS: Readonly<Record<ChargerStatus | 'loading', AccentColors>> = {
  available: {
    background: 'var(--color-available)',
    foreground: 'var(--color-nlr-navy)',
    pattern: 'none',
  },
  'in-use': {
    background: 'var(--color-in-use)',
    foreground: 'var(--color-nlr-navy)',
    pattern: 'none',
  },
  offline: {
    background: 'var(--color-offline)',
    foreground: 'black',
    pattern: 'var(--offline-cross-image)',
  },
  loading: {
    background: 'var(--color-loading)',
    foreground: 'white',
    pattern: 'none',
  },
}

export const accentColors = (accent: ChargerStatus | null): AccentColors =>
  ACCENT_COLORS[accent ?? 'loading']

/** Describes an area's availability in words, including what its accent and icons show. */
export const availabilityText = (
  available: number | null,
  accent: ChargerStatus | null,
  accessible = false,
): string =>
  [
    available === null ? 'Availability loading' : `${available} available`,
    ...(accent === 'offline' ? ['all offline'] : []),
    ...(accessible ? ['accessible charging'] : []),
  ].join(', ')
