import { DatePipe } from '@angular/common'
import { Component, computed, inject, input } from '@angular/core'
import { RouterLink } from '@angular/router'

import { Campus, campusName } from '../../../campus-selection.service'
import { ChargerStatus, EvseAvailabilityService } from '../../../evse-availability.service'
import { areaLink } from '../../../garage-levels'
import { accentColors, availabilityText } from '../../../shared/accent'
import { WHEELCHAIR_ICON } from '../../../shared/icons'

/** A place the visitor can go to charge: a garage level at STM or a lot region at Flatirons. */
type Destination = {
  readonly id: string
  readonly label: string
  readonly available: number | null
  readonly accent: ChargerStatus | null
  readonly accessible: boolean
  readonly link: readonly (string | number)[]
}

/** Live availability for one campus: where to go, when the data was updated, and the totals. */
@Component({
  selector: 'app-campus-availability',
  imports: [DatePipe, RouterLink],
  templateUrl: './campus-availability.html',
})
export class CampusAvailability {
  readonly campus = input.required<Campus>()

  private readonly availabilityService = inject(EvseAvailabilityService)

  protected readonly wheelchairIcon = WHEELCHAIR_ICON
  protected readonly accentColors = accentColors
  protected readonly availabilityText = availabilityText
  protected readonly campusName = computed(() => campusName(this.campus()))
  protected readonly destinations = computed((): readonly Destination[] =>
    this.campus() === 'stm'
      ? this.availabilityService
          .chargerLevels()
          .toReversed()
          .map((level) => ({
            ...level,
            id: String(level.level),
            accessible: level.accessible ?? false,
            link: areaLink(level.level),
          }))
      : this.availabilityService.flatironsRegions().map((region) => ({
          ...region,
          accessible: false,
          link: areaLink('fc'),
        })),
  )
  protected readonly chargerSummary = computed(() =>
    this.campus() === 'stm'
      ? this.availabilityService.chargerSummary()
      : this.availabilityService.flatironsSummary(),
  )
  protected readonly lastUpdated = this.availabilityService.lastUpdated
  protected readonly lastUpdatedRelative = this.availabilityService.lastUpdatedRelative
  protected readonly isLoading = this.availabilityService.isLoading
  protected readonly hasError = this.availabilityService.hasError
}
