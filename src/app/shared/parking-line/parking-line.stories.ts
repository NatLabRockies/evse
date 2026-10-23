import { Meta, StoryObj, componentWrapperDecorator } from '@storybook/angular-vite'
import { expect } from 'storybook/test'

import { fromStations, onViewport, withAvailability } from '../../testing/storybook'
import { ParkingLine } from './parking-line'

const meta: Meta<ParkingLine> = {
  title: 'Shared/Parking Line',
  component: ParkingLine,
  decorators: [
    // LV21-05 has no data yet, so it shows as loading.
    withAvailability(
      fromStations(
        {
          'LV21-01': 'available',
          'LV21-02': 'in-use',
          'LV21-03': 'in-use',
          'LV21-04': 'offline',
          'LV21-06': 'in-use',
          'LV21-07': 'in-use',
        },
        { 'LV21-02': 63, 'LV21-06': 5, 'LV21-07': 120 },
      ),
    ),
    // The level page sets the spaces' proportions.
    componentWrapperDecorator(
      (story) => `<div class="p-4" style="--parking-space-aspect-ratio: 0.5">${story}</div>`,
    ),
  ],
  args: {
    label: 'Center East',
    orientation: 'vertical',
    // Available, in use, offline, loading, and a space without a charger.
    spaces: ['LV21-01', 'LV21-02', 'LV21-04', 'LV21-05', null],
  },
  globals: onViewport('mobile'),
}

export default meta
type Story = StoryObj<ParkingLine>

export const Vertical: Story = {}

export const Horizontal: Story = {
  args: { label: 'Northwest', orientation: 'horizontal' },
}

/** Accessible spaces show a wheelchair while they are available. */
export const Accessible: Story = {
  args: { accessible: true, spaces: ['LV21-01', 'LV21-02', 'LV21-04', 'LV21-05'] },
}

/** Cars face the other way on the west side of the garage. */
export const ReversedCars: Story = {
  args: { label: 'Center West', reverseCars: true },
}

export const HorizontalReversedCars: Story = {
  args: { label: 'Northwest', orientation: 'horizontal', reverseCars: true },
}

/** In-use spaces with a session start show how long they've been charging when hovered. */
export const ElapsedTimeTooltips: Story = {
  args: { spaces: ['LV21-06', 'LV21-02', 'LV21-07', 'LV21-03'] },
  play: async ({ canvas }) => {
    const space = (text: string) => canvas.getByText(text).closest('li')

    await expect(space('LV21-06: in use for 5 minutes')).toHaveAttribute('title', '5m')
    await expect(space('LV21-02: in use for 1 hour 3 minutes')).toHaveAttribute('title', '1h 3m')
    await expect(space('LV21-07: in use for 2 hours')).toHaveAttribute('title', '2h')
    await expect(space('LV21-03: in use')).not.toHaveAttribute('title')
  },
}
