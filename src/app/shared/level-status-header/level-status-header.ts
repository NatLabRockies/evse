import { Component, computed, inject, input } from '@angular/core'
import { RouterLink } from '@angular/router'

import { EvseAvailabilityService } from '../../evse-availability.service'
import { ParkingArea } from '../../garage-levels'
import { WHEELCHAIR_ICON } from '../icons'

@Component({
  selector: 'app-level-status-header',
  imports: [RouterLink],
  templateUrl: './level-status-header.html',
})
export class LevelStatusHeader {
  readonly level = input.required<ParkingArea>()
  readonly actionLabel = input.required<string>()
  readonly actionLink = input.required<readonly (string | number)[]>()

  private readonly availabilityService = inject(EvseAvailabilityService)

  protected readonly wheelchairIcon = WHEELCHAIR_ICON

  protected readonly available = computed(() => {
    if (this.level() === 'fc') {
      return (
        this.availabilityService.flatironsSummary().find((item) => item.accent === 'available')
          ?.count ?? null
      )
    }

    return (
      this.availabilityService.chargerLevels().find((item) => item.level === this.level())
        ?.available ?? null
    )
  })

  protected readonly accessible = computed(
    () =>
      this.availabilityService.chargerLevels().find((item) => item.level === this.level())
        ?.accessible ?? null,
  )
}
