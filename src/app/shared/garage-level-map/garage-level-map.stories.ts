import { Meta, StoryObj, componentWrapperDecorator } from '@storybook/angular-vite'

import { MIXED_DATA, NO_DATA, onViewport, withAvailability } from '../../testing/storybook'
import { GarageLevelMap } from './garage-level-map'

const meta: Meta<GarageLevelMap> = {
  title: 'Shared/Garage Level Map',
  component: GarageLevelMap,
  decorators: [
    withAvailability(MIXED_DATA),
    // The map fills its container, as it does on the level and map pages.
    componentWrapperDecorator((story) => `<div class="h-[30rem] p-4">${story}</div>`),
  ],
  globals: onViewport('desktop'),
}

export default meta
type Story = StoryObj<GarageLevelMap>

export const Level1: Story = { args: { level: 1 } }

export const Level2: Story = { args: { level: 2 } }

export const Level3: Story = { args: { level: 3 } }

export const Level4: Story = { args: { level: 4 } }

export const Flatirons: Story = { args: { level: 'fc' } }

/** Every space is drawn in the loading color until the first data arrives. */
export const Loading: Story = {
  args: { level: 2 },
  decorators: [withAvailability(NO_DATA)],
}

export const FlatironsLoading: Story = {
  args: { level: 'fc' },
  decorators: [withAvailability(NO_DATA)],
}
