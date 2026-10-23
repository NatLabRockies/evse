import { displayParkingSpace } from './parking-spaces'

describe('displayParkingSpace', () => {
  it('folds the second connector of a shared space into its representative', () => {
    expect(displayParkingSpace('LV32-18')).toBe('LV32-17')
    expect(displayParkingSpace('4B')).toBe('4A')
  })

  it('leaves every other space alone', () => {
    expect(displayParkingSpace('LV32-17')).toBe('LV32-17')
    expect(displayParkingSpace('4A')).toBe('4A')
    expect(displayParkingSpace('LV11-01')).toBe('LV11-01')
  })
})
