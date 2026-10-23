import { Meta, StoryObj } from '@storybook/angular-vite'
import { expect } from 'storybook/test'

import { NO_DATA, atUrl, onViewport, withAvailability } from '../../testing/storybook'
import { LevelNavigation } from './level-navigation'

const meta: Meta<LevelNavigation> = {
  title: 'Shared/Level Navigation',
  component: LevelNavigation,
  // One level in each accent, so each active story shows a different color.
  decorators: [
    withAvailability({
      chargerLevels: [
        { level: 1, label: 'Level 1', available: 0, accent: 'in-use', accessible: false },
        { level: 2, label: 'Level 2', available: 14, accent: 'available', accessible: false },
        { level: 3, label: 'Level 3', available: 2, accent: 'available', accessible: true },
        { level: 4, label: 'Level 4', available: 0, accent: 'offline', accessible: false },
      ],
    }),
  ],
  globals: onViewport('mobile'),
}

export default meta
type Story = StoryObj<LevelNavigation>

export const HomeActive: Story = { decorators: [atUrl('/')] }

/** The active link takes its level's accent colors. */
export const Level1Active: Story = {
  decorators: [atUrl('/level/1')],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { current: 'page' })).toHaveAccessibleName(
      'Level 1, 0 available',
    )
  },
}

export const Level2Active: Story = { decorators: [atUrl('/level/2')] }

export const Level3Active: Story = { decorators: [atUrl('/level/3')] }

export const Level4Active: Story = { decorators: [atUrl('/level/4')] }

/** On the map pages, each level link opens that level's map. */
export const MapView: Story = {
  args: { mapView: true },
  decorators: [atUrl('/level/2/map')],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: /^Level 3,/ })).toHaveAttribute(
      'href',
      '/level/3/map',
    )
  },
}

/** The Flatirons pages link only to the home page. */
export const WithoutLevels: Story = {
  args: { showLevels: false },
  decorators: [atUrl('/fc')],
}

export const LoadingCounts: Story = {
  decorators: [withAvailability(NO_DATA), atUrl('/level/2')],
}
