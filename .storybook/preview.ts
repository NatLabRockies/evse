import '../src/styles.css'

import { provideHttpClient } from '@angular/common/http'
import { provideLocationMocks } from '@angular/common/testing'
import { provideRouter, withDisabledInitialNavigation } from '@angular/router'
import { Preview, applicationConfig } from '@storybook/angular-vite'

import { STORY_ROUTES, STORY_VIEWPORTS } from '../src/app/testing/storybook'

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [
        provideHttpClient(),
        // Router links work without changing the preview's URL. Stories navigate with `atUrl`.
        provideLocationMocks(),
        provideRouter(STORY_ROUTES, withDisabledInitialNavigation()),
      ],
    }),
  ],
  parameters: {
    // Stories add their own padding, so they look the same here as in the visual tests.
    layout: 'fullscreen',
    // The app was reviewed for Section 508, so any axe violation fails the Vitest run.
    a11y: { test: 'error' },
    viewport: { options: STORY_VIEWPORTS },
  },
}

export default preview
