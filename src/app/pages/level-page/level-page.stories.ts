import { Meta, StoryObj } from '@storybook/angular-vite'

import { ParkingArea, areaLink } from '../../garage-levels'
import {
  MIXED_DATA,
  StoryViewport,
  atUrl,
  onViewport,
  withAvailability,
} from '../../testing/storybook'
import { LevelPage } from './level-page'

const meta: Meta<LevelPage> = {
  title: 'Pages/Level Page',
  component: LevelPage,
  decorators: [withAvailability(MIXED_DATA)],
}

export default meta
type Story = StoryObj<LevelPage>

const area = (level: ParkingArea, viewport: StoryViewport): Story => ({
  args: { level },
  decorators: [atUrl(areaLink(level).join('/'))],
  globals: onViewport(viewport),
})

export const Level1: Story = area(1, 'mobile')
export const Level1Desktop: Story = area(1, 'desktop')

/** Level 2 adds the horizontal northwest row above its two vertical rows. */
export const Level2: Story = area(2, 'mobile')
export const Level2Desktop: Story = area(2, 'desktop')

/** Short landscape screens scroll the page instead of fitting the spaces to its height. */
export const Level2Landscape: Story = area(2, 'mobileLandscape')

/** Level 3's two chargers are accessible. */
export const Level3: Story = area(3, 'mobile')
export const Level3Desktop: Story = area(3, 'desktop')

export const Level4: Story = area(4, 'mobile')
export const Level4Desktop: Story = area(4, 'desktop')

/** The Flatirons lot links only to the home page. */
export const Flatirons: Story = area('fc', 'mobile')
export const FlatironsDesktop: Story = area('fc', 'desktop')
