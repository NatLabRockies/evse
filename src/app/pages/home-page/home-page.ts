import { DatePipe } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'

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

  protected readonly wheelchairIcon = WHEELCHAIR_ICON
  protected readonly chargerLevels = computed(() =>
    this.availabilityService.chargerLevels().toReversed(),
  )
  protected readonly chargerSummary = this.availabilityService.chargerSummary
  protected readonly lastUpdated = this.availabilityService.lastUpdated
  protected readonly lastUpdatedRelative = this.availabilityService.lastUpdatedRelative
  protected readonly isLoading = this.availabilityService.isLoading
  protected readonly hasError = this.availabilityService.hasError
}
