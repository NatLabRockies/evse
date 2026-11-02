import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs'
import { NgOptimizedImage } from '@angular/common'
import { Component, inject } from '@angular/core'

import { CAMPUSES, CampusSelectionService, isCampus } from '../../campus-selection.service'
import { EMBEDDED } from '../../embedding'
import { CampusAvailability } from './campus-availability/campus-availability'
import nlrLogoUrl from './nlr-logo.svg' with { loader: 'file' }

@Component({
  selector: 'app-home-page',
  imports: [CampusAvailability, NgOptimizedImage, Tab, TabContent, TabList, TabPanel, Tabs],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  private readonly campusSelection = inject(CampusSelectionService)

  protected readonly embedded = inject(EMBEDDED)
  protected readonly logoUrl = nlrLogoUrl
  protected readonly campuses = CAMPUSES
  protected readonly campus = this.campusSelection.campus

  protected selectCampus(value: string | undefined): void {
    if (isCampus(value)) {
      this.campusSelection.select(value)
    }
  }
}
