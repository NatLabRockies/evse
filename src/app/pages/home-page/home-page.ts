import { DatePipe } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'

import { CampusSelectionService } from '../../campus-selection.service'
import { EvseAvailabilityService } from '../../evse-availability.service'
import { WHEELCHAIR_ICON } from '../../shared/icons'

@Component({
  selector: 'app-home-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  private readonly availabilityService = inject(EvseAvailabilityService)
  protected readonly campusSelection = inject(CampusSelectionService)
  protected readonly campus = this.campusSelection.campus

  protected readonly wheelchairIcon = WHEELCHAIR_ICON
  protected readonly destinations = computed(() =>
    this.campus() === 'golden'
      ? this.availabilityService
          .chargerLevels()
          .toReversed()
          .map((level) => ({
            ...level,
            id: String(level.level),
            link: ['/level', level.level],
          }))
      : this.availabilityService.flatironsRegions().map((region) => ({
          id: region.id,
          label: region.label,
          available: region.available,
          accessible: false,
          link: ['/fc'],
        })),
  )
  protected readonly chargerSummary = computed(() =>
    this.campus() === 'golden'
      ? this.availabilityService.chargerSummary()
      : this.availabilityService.flatironsSummary(),
  )
  protected readonly lastUpdated = this.availabilityService.lastUpdated
  protected readonly lastUpdatedRelative = this.availabilityService.lastUpdatedRelative
  protected readonly isLoading = this.availabilityService.isLoading
  protected readonly hasError = this.availabilityService.hasError
}
