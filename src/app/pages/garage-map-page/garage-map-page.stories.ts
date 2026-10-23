import { Meta, StoryObj } from '@storybook/angular-vite'

import { ParkingArea, areaLink } from '../../garage-levels'
import {
  MIXED_DATA,
  StoryViewport,
  atUrl,
  onViewport,
  withAvailability,
} from '../../testing/storybook'
import { GarageMapPage } from './garage-map-page'

const meta: Meta<GarageMapPage> = {
  title: 'Pages/Garage Map Page',
  component: GarageMapPage,
  decorators: [withAvailability(MIXED_DATA)],
}

export default meta
type Story = StoryObj<GarageMapPage>

const area = (level: ParkingArea, viewport: StoryViewport): Story => ({
  args: { level },
  decorators: [atUrl(areaLink(level, 'map').join('/'))],
  globals: onViewport(viewport),
})

/** In portrait mode the plan turns sideways to fill the screen and the compass letters stay upright. */
export const Level1: Story = area(1, 'mobile')
export const Level1Landscape: Story = area(1, 'mobileLandscape')
export const Level1Desktop: Story = area(1, 'desktop')

export const Level2: Story = area(2, 'mobile')
export const Level2Landscape: Story = area(2, 'mobileLandscape')
export const Level2Desktop: Story = area(2, 'desktop')

export const Level3: Story = area(3, 'mobile')
export const Level3Landscape: Story = area(3, 'mobileLandscape')
export const Level3Desktop: Story = area(3, 'desktop')

export const Level4: Story = area(4, 'mobile')
export const Level4Landscape: Story = area(4, 'mobileLandscape')
export const Level4Desktop: Story = area(4, 'desktop')

export const Flatirons: Story = area('fc', 'mobile')
export const FlatironsLandscape: Story = area('fc', 'mobileLandscape')
export const FlatironsDesktop: Story = area('fc', 'desktop')
