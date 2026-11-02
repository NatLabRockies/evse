import { Component, DOCUMENT, Injector, afterNextRender, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router, RouterOutlet } from '@angular/router'
import { filter, skip } from 'rxjs'

import { EMBEDDED } from './embedding'

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor() {
    const document = inject(DOCUMENT)
    const injector = inject(Injector)
    const embedded = inject(EMBEDDED)

    // The link that was followed is gone after navigating, which drops focus to the body. Move it
    // to the new page's heading so screen readers announce the page and tabbing starts at its top.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        afterNextRender(
          () => {
            const heading = document.querySelector<HTMLElement>('h1')
            if (embedded) {
              // Focusing scrolls the heading into view, and Chrome and Firefox would scroll the
              // embedding page too. Scroll only this frame back to its top instead.
              document.defaultView?.scrollTo(0, 0)
              heading?.focus({ preventScroll: true })
            } else {
              heading?.focus()
            }
          },
          { injector },
        )
      })
  }
}
