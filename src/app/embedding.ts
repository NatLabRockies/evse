import { PathLocationStrategy } from '@angular/common'
import { Injectable, InjectionToken } from '@angular/core'

/**
 * Whether the app is shown inside another page's iframe, such as the EV charging page on
 * www.nlr.gov. `main.ts` decides this once at startup. It is false everywhere else, including
 * Storybook and the browser tests, which render inside iframes of their own.
 */
export const EMBEDDED = new InjectionToken<boolean>('EMBEDDED', { factory: () => false })

/**
 * `?embed=1` (or `?embed`) shows the embedded view and `?embed=0` (or `false`) the normal one,
 * which helps when reviewing either in a browser tab. Otherwise the app is embedded when framed.
 * The parameter is read once: the router drops it on the first navigation.
 */
export function isEmbedded(window: Window): boolean {
  const embed = new URLSearchParams(window.location.search).get('embed')
  if (embed !== null) {
    return embed !== '0' && embed !== 'false'
  }

  // `top` can't be replaced by page script, unlike `self` and `parent`.
  return window.top !== window
}

/**
 * Replaces the current history entry instead of adding one. Entries an iframe adds join the
 * embedding page's history, so its Back button would step through the dashboard's pages before
 * leaving. The in-app navigation already links every page.
 */
@Injectable()
export class ReplaceStateLocationStrategy extends PathLocationStrategy {
  override pushState(state: unknown, title: string, url: string, queryParams: string): void {
    this.replaceState(state, title, url, queryParams)
  }
}
