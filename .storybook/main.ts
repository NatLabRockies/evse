import { defineMain } from '@storybook/angular-vite/node'
import { mergeConfig } from 'vite'

export default defineMain({
  framework: '@storybook/angular-vite',
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  // The maps load from levels/*.svg and the home page logo from nlr-logo.svg.
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
  viteFinal: (config) =>
    mergeConfig(config, {
      // Storybook's preview runtime alone is about 1.8 MB. The app's own budgets are in angular.json.
      build: { chunkSizeWarningLimit: 2_000 },
      // Pre-bundle the Angular packages the stories use, so that none of them loads a second copy
      // of @angular/core when Vite discovers it partway through a run.
      optimizeDeps: {
        include: [
          '@angular/aria/tabs',
          '@angular/common',
          '@angular/common/testing',
          '@angular/core',
          '@angular/core/rxjs-interop',
          '@angular/router',
          'date-fns',
          'rxjs',
        ],
      },
    }),
})
