import { resolve } from 'node:path'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { storybookAngularVitest } from '@storybook/angular-vite/vitest'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

// Runs every story in Chromium as a test: its play function, an axe check, and a screenshot
// comparison. `ng test` doesn't read this file; it runs the unit tests with its own configuration.
export default defineConfig({
  plugins: [storybookAngularVitest(), storybookTest({ configDir: '.storybook' })],
  test: {
    name: 'storybook',
    setupFiles: ['.storybook/vitest.setup.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      // Lets toMatchScreenshot write new references. The Storybook plugin disables writes otherwise.
      api: { allowWrite: true },
      expect: {
        toMatchScreenshot: {
          // Text renders differently on each OS, so each platform keeps its own references.
          resolveScreenshotPath: ({ arg, browserName, ext, platform, root }) =>
            resolve(root, '.storybook/screenshots', platform, `${arg}-${browserName}${ext}`),
        },
      },
    },
  },
})
