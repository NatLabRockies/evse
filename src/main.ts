import { mergeApplicationConfig } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { appConfig, embeddedConfig } from './app/app.config'
import { App } from './app/app'
import { isEmbedded } from './app/embedding'

const embedded = isEmbedded(window)
if (embedded) {
  // Styles use this through the `embedded:` variant from the first render
  document.documentElement.dataset['embedded'] = ''
}

bootstrapApplication(
  App,
  embedded ? mergeApplicationConfig(appConfig, embeddedConfig) : appConfig,
).catch((err) => console.error(err))
