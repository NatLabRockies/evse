import { Meta, StoryObj } from '@storybook/angular-vite'
import { expect } from 'storybook/test'

import { CAMPUS_STORAGE_KEY } from '../../campus-selection.service'
import { NO_DATA, onViewport, withAvailability, withCampus } from '../../testing/storybook'
import { HomePage } from './home-page'

const meta: Meta<HomePage> = {
  title: 'Pages/Home Page',
  component: HomePage,
  decorators: [withAvailability()],
  beforeEach: withCampus('stm'),
  globals: onViewport('mobile'),
}

export default meta
type Story = StoryObj<HomePage>

export const Stm: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('tab', { name: 'STM' })).toHaveAttribute('aria-selected', 'true')
  },
}

export const Flatirons: Story = {
  beforeEach: withCampus('flatirons'),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('tab', { name: 'Flatirons' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  },
}

/** Choosing a tab shows that campus and remembers it for the next visit. */
export const SwitchCampus: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('tab', { name: 'Flatirons' }))
    await expect(
      canvas.getByRole('list', { name: 'Available chargers at Flatirons' }),
    ).toBeVisible()
    await expect(localStorage.getItem(CAMPUS_STORAGE_KEY)).toBe('flatirons')
  },
}

export const Loading: Story = {
  decorators: [withAvailability({ ...NO_DATA, isLoading: true })],
}

export const StmDesktop: Story = { globals: onViewport('desktop') }

export const FlatironsDesktop: Story = {
  beforeEach: withCampus('flatirons'),
  globals: onViewport('desktop'),
}
