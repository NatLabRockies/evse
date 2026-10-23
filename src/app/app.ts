import { Component, DOCUMENT, Injector, afterNextRender, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router, RouterOutlet } from '@angular/router'
import { filter, skip } from 'rxjs'

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

    // The link that was followed is gone after navigating, which drops focus to the body. Move it
    // to the new page's heading so screen readers announce the page and tabbing starts at its top.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        afterNextRender(() => document.querySelector<HTMLElement>('h1')?.focus(), { injector })
      })
  }
}
