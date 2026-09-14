import { Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'

import { GarageLevelSvgService } from './shared/garage-level-map/garage-level-svg.service'

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor() {
    inject(GarageLevelSvgService)
  }
}
