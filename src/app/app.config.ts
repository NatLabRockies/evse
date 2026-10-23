import { provideHttpClient } from '@angular/common/http'
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core'
import { provideRouter, withComponentInputBinding } from '@angular/router'
import { provideServiceWorker } from '@angular/service-worker'

import { routes } from './app.routes'
import { GarageLevelSvgService } from './shared/garage-level-map/garage-level-svg.service'

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Start fetching the level maps at startup so each page's map is ready when it is opened.
    provideAppInitializer(() => {
      inject(GarageLevelSvgService)
    }),
  ],
}
