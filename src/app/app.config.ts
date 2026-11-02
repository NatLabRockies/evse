import { LocationStrategy } from '@angular/common'
import { provideHttpClient } from '@angular/common/http'
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core'
import { provideRouter, withComponentInputBinding } from '@angular/router'
import { SwRegistrationOptions, provideServiceWorker } from '@angular/service-worker'

import { routes } from './app.routes'
import { EMBEDDED, ReplaceStateLocationStrategy } from './embedding'
import { GarageLevelSvgService } from './shared/garage-level-map/garage-level-svg.service'

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding()),
    provideServiceWorker('ngsw-worker.js'),
    {
      provide: SwRegistrationOptions,
      // An embedded copy doesn't register the worker, so visitors to the embedding page don't
      // download the whole app for offline use. A worker from a direct visit may still serve it.
      useFactory: () => ({
        enabled: !isDevMode() && !inject(EMBEDDED),
        registrationStrategy: 'registerWhenStable:30000',
      }),
    },
    // Start fetching the level maps at startup so each page's map is ready when it is opened.
    provideAppInitializer(() => {
      inject(GarageLevelSvgService)
    }),
  ],
}

/** Added to `appConfig` when the app is shown inside another page's iframe (see `isEmbedded`). */
export const embeddedConfig: ApplicationConfig = {
  providers: [
    { provide: EMBEDDED, useValue: true },
    { provide: LocationStrategy, useClass: ReplaceStateLocationStrategy },
  ],
}
