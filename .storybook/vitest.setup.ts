import { afterEach, expect } from 'vitest'
import { page } from 'vitest/browser'

type StoryTestContext = { readonly story?: { readonly id: string } }

/** Waits for the maps, which mark themselves busy while they load, and for fonts and images. */
async function settled(): Promise<void> {
  await expect
    .poll(() => document.querySelector('[aria-busy="true"]'), { timeout: 10_000 })
    .toBeNull()
  await document.fonts.ready
  await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => undefined)))
}

// Once a story has rendered and passed its play function and axe checks, compare the page with the
// story's reference screenshot. Each story sets the viewport it should be captured at.
afterEach(async (context) => {
  const { story } = context as StoryTestContext
  if (!story || context.task.result?.state === 'fail') {
    return
  }

  await settled()
  // A locator, not an element: Vitest retries assertions on elements, which would pass a missing
  // reference on the second try because the first try writes it.
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(story.id)
})
