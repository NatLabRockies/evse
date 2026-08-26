import { ChargerStatus } from '../../evse-availability.service'
import { applyStationStatuses, renderGarageLevelSvg } from './garage-level-map'

describe('applyStationStatuses', () => {
  it('colors spaces and shows cars using the realtime station status', () => {
    const svgDocument = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">
        <style>.hidden { fill: none; }</style>
        <defs><symbol id="_car-horizontal_"><path d="M0 0h1v1H0z" /></symbol></defs>
        <rect id="_lv21-01_" style="fill: red" />
        <use id="_car-offline-lv21-01_" class="hidden" href="#_car-horizontal_" />
        <rect id="_lv21-02_" style="fill: red" />
        <use id="_car-offline-lv21-02_" href="#_car-horizontal_" style="fill: black" />
        <rect id="_lv21-03_" style="fill: red" />
      </svg>`,
      'image/svg+xml',
    )
    const statuses: Readonly<Record<string, ChargerStatus>> = {
      'LV21-01': 'in-use',
      'LV21-02': 'available',
    }

    applyStationStatuses(svgDocument, statuses)

    expect(svgDocument.getElementById('_lv21-01_')?.getAttribute('style')).toContain(
      '--color-in-use',
    )
    expect(svgDocument.getElementById('_car-offline-lv21-01_')?.getAttribute('style')).toContain(
      'rgb(35, 31, 32)',
    )
    expect(svgDocument.getElementById('_lv21-02_')?.getAttribute('style')).toContain(
      '--color-available',
    )
    expect(svgDocument.getElementById('_car-offline-lv21-02_')?.getAttribute('style')).toContain(
      'none',
    )
    expect(svgDocument.getElementById('_lv21-03_')?.getAttribute('style')).toContain(
      'rgba(255, 255, 255, 0.18)',
    )
  })

  it('returns a responsive inline SVG', () => {
    const markup = renderGarageLevelSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"></svg>',
      {},
    )

    expect(markup).toContain('width: 100%')
    expect(markup).toContain('height: 100%')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('hides Level 3 accessibility markers while their spaces are in use', () => {
    const svgDocument = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">
        <path id="_handicap-lv22-19_" />
        <path id="_handicap-lv22-20_" />
      </svg>`,
      'image/svg+xml',
    )

    applyStationStatuses(svgDocument, {
      'LV22-19': 'in-use',
      'LV22-20': 'in-use',
    })

    expect(svgDocument.getElementById('_handicap-lv22-19_')?.style.display).toBe('none')
    expect(svgDocument.getElementById('_handicap-lv22-20_')?.style.display).toBe('none')

    applyStationStatuses(svgDocument, {
      'LV22-19': 'available',
      'LV22-20': 'offline',
    })

    expect(svgDocument.getElementById('_handicap-lv22-19_')?.style.display).toBe('')
    expect(svgDocument.getElementById('_handicap-lv22-20_')?.style.display).toBe('')
  })
})
