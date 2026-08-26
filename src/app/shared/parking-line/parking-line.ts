import { Component, computed, inject, input } from '@angular/core'

import { ChargerStatus, EvseAvailabilityService } from '../../evse-availability.service'
import { CAR_HORIZONTAL_ICON, CAR_VERTICAL_ICON, WHEELCHAIR_ICON } from '../icons'

export type ParkingLineOrientation = 'horizontal' | 'vertical'
export type ParkingSpaceId = string | null

export function formatElapsedTime(startTime: number, currentTime: number): string {
  const totalMinutes = Math.max(0, Math.floor((currentTime - startTime) / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (!hours) {
    return `${minutes}m`
  }

  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

@Component({
  selector: 'app-parking-line',
  templateUrl: './parking-line.html',
  styleUrl: './parking-line.css',
  host: {
    '[class.is-horizontal]': "orientation() === 'horizontal'",
    '[class.is-vertical]': "orientation() === 'vertical'",
    '[style.--space-count]': 'spaces().length',
  },
})
export class ParkingLine {
  private readonly availabilityService = inject(EvseAvailabilityService)

  readonly label = input.required<string>()
  readonly orientation = input.required<ParkingLineOrientation>()
  readonly spaces = input.required<readonly ParkingSpaceId[]>()
  readonly accessible = input(false)
  readonly reverseCars = input(false)

  protected readonly stationStatuses = this.availabilityService.stationStatuses
  protected readonly sessionStartTimes = this.availabilityService.sessionStartTimes
  protected readonly currentTime = this.availabilityService.currentTime
  protected readonly carIcon = computed(() =>
    this.orientation() === 'vertical' ? CAR_HORIZONTAL_ICON : CAR_VERTICAL_ICON,
  )
  protected readonly wheelchairIcon = WHEELCHAIR_ICON

  protected statusFor(parkingSpace: ParkingSpaceId): ChargerStatus | 'loading' | 'non-charging' {
    if (!parkingSpace) {
      return 'non-charging'
    }

    return this.stationStatuses()[parkingSpace] ?? 'loading'
  }

  protected spaceLabel(parkingSpace: ParkingSpaceId, index: number): string {
    if (!parkingSpace) {
      return `${this.label()} space ${index + 1}: no charger`
    }

    const status = this.statusFor(parkingSpace)
    const statusLabel = status === 'in-use' ? 'in use' : status
    const accessibleLabel = this.accessible() ? ', accessible' : ''
    return `${parkingSpace}: ${statusLabel}${accessibleLabel}`
  }

  protected carTitle(parkingSpace: ParkingSpaceId): string | null {
    if (!parkingSpace) {
      return null
    }

    const startTime = this.sessionStartTimes()[parkingSpace]
    if (startTime === undefined) {
      return null
    }

    return formatElapsedTime(startTime, this.currentTime().getTime())
  }
}
