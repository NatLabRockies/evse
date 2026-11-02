import { APP_BASE_HREF, PlatformLocation } from '@angular/common'
import { TestBed } from '@angular/core/testing'
import { vi } from 'vitest'

import { EMBEDDED, ReplaceStateLocationStrategy, isEmbedded } from './embedding'

/** Just enough of a window for `isEmbedded`: its query string and whether it has a parent. */
function fakeWindow(search: string, framed: boolean): Window {
  const window = { location: { search } } as { location: { search: string }; top?: unknown }
  window.top = framed ? {} : window
  return window as unknown as Window
}

describe('isEmbedded', () => {
  it('is embedded inside a frame and not at the top level', () => {
    expect(isEmbedded(fakeWindow('', true))).toBe(true)
    expect(isEmbedded(fakeWindow('', false))).toBe(false)
  })

  it.each([
    ['?embed=1', false, true],
    ['?embed', false, true],
    ['?embed=0', true, false],
    ['?embed=false', true, false],
    ['?campus=stm&embed=1', false, true],
  ])('follows %s over framing (framed: %s)', (search, framed, expected) => {
    expect(isEmbedded(fakeWindow(search, framed))).toBe(expected)
  })

  it('defaults to the normal view where main.ts did not decide', () => {
    expect(TestBed.inject(EMBEDDED)).toBe(false)
  })
})

describe('ReplaceStateLocationStrategy', () => {
  afterEach(() => vi.restoreAllMocks())

  it('replaces the current history entry instead of adding one', () => {
    TestBed.configureTestingModule({
      providers: [ReplaceStateLocationStrategy, { provide: APP_BASE_HREF, useValue: '/' }],
    })
    const platformLocation = TestBed.inject(PlatformLocation)
    const pushState = vi.spyOn(platformLocation, 'pushState')
    const replaceState = vi.spyOn(platformLocation, 'replaceState').mockReturnValue(undefined)

    TestBed.inject(ReplaceStateLocationStrategy).pushState(null, '', '/level/2', 'x=1')

    expect(replaceState).toHaveBeenCalledWith(null, '', '/level/2?x=1')
    expect(pushState).not.toHaveBeenCalled()
  })
})
