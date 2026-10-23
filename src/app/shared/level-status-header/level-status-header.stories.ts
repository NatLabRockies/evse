import { Meta, StoryObj } from '@storybook/angular-vite'
import { expect } from 'storybook/test'

import { NO_DATA, onViewport, withAvailability } from '../../testing/storybook'
import { LevelStatusHeader } from './level-status-header'

const meta: Meta<LevelStatusHeader> = {
  title: 'Shared/Level Status Header',
  component: LevelStatusHeader,
  decorators: [
    withAvailability({
      chargerLevels: [
        { level: 1, label: 'Level 1', available: 0, accent: 'in-use', accessible: false },
        { level: 2, label: 'Level 2', available: 14, accent: 'available', accessible: false },
        { level: 3, label: 'Level 3', available: 2, accent: 'available', accessible: true },
        { level: 4, label: 'Level 4', available: 0, accent: 'offline', accessible: false },
      ],
      flatironsStatus: { available: 12, accent: 'available' },
    }),
  ],
  args: { level: 2, actionLabel: 'View Map', actionLink: ['/level', 2, 'map'] },
  globals: onViewport('mobile'),
}

export default meta
type Story = StoryObj<LevelStatusHeader>

export const Available: Story = {}

export const InUse: Story = {
  args: { level: 1, actionLink: ['/level', 1, 'map'] },
}

export const Offline: Story = {
  args: { level: 4, actionLink: ['/level', 4, 'map'] },
}

export const Loading: Story = {
  decorators: [withAvailability(NO_DATA)],
}

/** Level 3 has the accessible chargers. */
export const Accessible: Story = {
  args: { level: 3, actionLink: ['/level', 3, 'map'] },
}

export const AccessibleInUse: Story = {
  args: { level: 3, actionLink: ['/level', 3, 'map'] },
  decorators: [
    withAvailability({
      chargerLevels: [
        { level: 3, label: 'Level 3', available: 0, accent: 'in-use', accessible: true },
      ],
    }),
  ],
}

export const AccessibleLoading: Story = {
  args: { level: 3, actionLink: ['/level', 3, 'map'] },
  decorators: [withAvailability(NO_DATA)],
}

export const Flatirons: Story = {
  args: { level: 'fc', actionLink: ['/fc', 'map'] },
}

export const FlatironsOffline: Story = {
  args: { level: 'fc', actionLink: ['/fc', 'map'] },
  decorators: [withAvailability({ flatironsStatus: { available: 0, accent: 'offline' } })],
}

export const FlatironsLoading: Story = {
  args: { level: 'fc', actionLink: ['/fc', 'map'] },
  decorators: [withAvailability(NO_DATA)],
}

/** The map view looks the same, but its heading tells screen readers that it is the map. */
export const MapView: Story = {
  args: { mapView: true, actionLabel: 'View Spaces', actionLink: ['/level', 2] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('LEVEL 2 map')
    await expect(canvas.getByRole('link', { name: 'View Spaces' })).toHaveAttribute(
      'href',
      '/level/2',
    )
  },
}

export const NotMapView: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent(/^\s*LEVEL 2\s*$/)
    await expect(canvas.getByRole('link', { name: 'View Map' })).toHaveAttribute(
      'href',
      '/level/2/map',
    )
  },
}

export const FlatironsMapView: Story = {
  args: { level: 'fc', mapView: true, actionLabel: 'View Spaces', actionLink: ['/fc'] },
}
