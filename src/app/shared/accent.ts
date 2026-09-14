import type { ChargerStatus } from '../evse-availability.service'

interface AccentColors {
  readonly background: string
  readonly foreground: string
}

const ACCENT_COLORS: Readonly<Record<ChargerStatus | 'loading', AccentColors>> = {
  available: {
    background: 'var(--color-available)',
    foreground: 'var(--color-nlr-navy)',
  },
  'in-use': {
    background: 'var(--color-in-use)',
    foreground: 'var(--color-nlr-navy)',
  },
  offline: {
    background: 'var(--color-offline)',
    foreground: 'black',
  },
  loading: {
    background: 'rgb(255 255 255 / 20%)',
    foreground: 'white',
  },
}

export const accentColors = (accent: ChargerStatus | null): AccentColors =>
  ACCENT_COLORS[accent ?? 'loading']
