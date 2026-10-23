import { Meta, StoryObj, componentWrapperDecorator } from '@storybook/angular-vite'

import { onViewport } from '../../testing/storybook'
import { CompassRose } from './compass-rose'

const meta: Meta<CompassRose> = {
  title: 'Shared/Compass Rose',
  component: CompassRose,
  // The pages show the rose on a translucent navy tile.
  render: () => ({
    template: `<app-compass-rose class="inline-block rounded-lg bg-nlr-navy/80 p-1 text-white shadow-sm" />`,
  }),
  decorators: [componentWrapperDecorator((story) => `<div class="p-4">${story}</div>`)],
  globals: onViewport('mobile'),
}

export default meta
type Story = StoryObj<CompassRose>

export const Default: Story = {}

/** The map page turns its plan sideways in portrait mode and turns the letters back with this variable. */
export const RotatedLabels: Story = {
  decorators: [
    componentWrapperDecorator(
      (story) => `<div style="--compass-label-rotation: -90deg">${story}</div>`,
    ),
  ],
}
