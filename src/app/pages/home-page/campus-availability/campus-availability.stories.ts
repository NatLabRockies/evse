import { Meta, StoryObj, componentWrapperDecorator } from '@storybook/angular-vite'
import { expect } from 'storybook/test'

import { NO_DATA, onViewport, summary, withAvailability } from '../../../testing/storybook'
import { CampusAvailability } from './campus-availability'

const meta: Meta<CampusAvailability> = {
  title: 'Pages/Home Page/Campus Availability',
  component: CampusAvailability,
  decorators: [
    withAvailability(),
    // The home page's tab panel, which sets the white text.
    componentWrapperDecorator(
      (story) => `<div class="mx-auto max-w-3xl px-5.5 pt-4 pb-16 text-white">${story}</div>`,
    ),
  ],
  args: { campus: 'stm' },
  globals: onViewport('mobile'),
}

export default meta
type Story = StoryObj<CampusAvailability>

export const Stm: Story = {}

export const Flatirons: Story = { args: { campus: 'flatirons' } }

/** Available, in use, offline, and loading levels, with level 3's accessible charging icon. */
export const EveryAccent: Story = {
  decorators: [
    withAvailability({
      chargerLevels: [
        { level: 1, label: 'Level 1', available: null, accent: null, accessible: false },
        { level: 2, label: 'Level 2', available: 0, accent: 'offline', accessible: false },
        { level: 3, label: 'Level 3', available: 0, accent: 'in-use', accessible: true },
        { level: 4, label: 'Level 4', available: 6, accent: 'available', accessible: false },
      ],
      chargerSummary: summary(6, 22, 30),
    }),
  ],
}

export const FlatironsInUseAndOffline: Story = {
  args: { campus: 'flatirons' },
  decorators: [
    withAvailability({
      flatironsRegions: [
        { id: 'west', label: 'West', available: 0, accent: 'in-use' },
        { id: 'east', label: 'East', available: 0, accent: 'offline' },
      ],
      flatironsSummary: summary(0, 8, 7),
    }),
  ],
}

export const LoadingWithNoData: Story = {
  decorators: [withAvailability({ ...NO_DATA, isLoading: true })],
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Loading current data…')).toBeVisible()
  },
}

export const FlatironsLoadingWithNoData: Story = {
  args: { campus: 'flatirons' },
  decorators: [withAvailability({ ...NO_DATA, isLoading: true })],
}

/** The first load failed, so there is nothing to show yet. */
export const ErrorWithNoData: Story = {
  decorators: [withAvailability({ ...NO_DATA, hasError: true })],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent('Data unavailable. Retrying…')
  },
}

/** A refresh failed, so the last good data stays on screen and screen readers hear why. */
export const ErrorWithStaleData: Story = {
  decorators: [withAvailability({ hasError: true })],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'The latest refresh failed. Retrying automatically.',
    )
    await expect(canvas.getByRole('status')).toHaveClass('sr-only')
  },
}

export const Desktop: Story = { globals: onViewport('desktop') }
