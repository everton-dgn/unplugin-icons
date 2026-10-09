import { expect, test } from '@playwright/test'
import { hydrate } from './hydrate'

const mismatch = /hydration.*mismatch/i
test('preserves distinct gradient IDs and SVG identity during hydration', async ({ page }) => {
  const diagnostics: string[] = []
  page.on('pageerror', error => diagnostics.push(error.message))
  page.on('console', (message) => {
    if (mismatch.test(message.text()))
      diagnostics.push(message.text())
  })
  await hydrate(page, '/ids')
  const result = await page.evaluate(() => {
    const icons = [...document.querySelectorAll('svg')]
    const originals = Reflect.get(window, 'ssrIcons') as Element[]
    return {
      ids: icons.map(icon => icon.querySelector('linearGradient')!.id),
      identity: icons.every((icon, index) => icon === originals[index]),
      linked: icons.every(icon => icon.querySelector('path')!.getAttribute('fill') === `url(#${icon.querySelector('linearGradient')!.id})`),
    }
  })
  expect(new Set(result.ids).size).toBe(2)
  expect(result.identity).toBe(true)
  expect(result.linked).toBe(true)
  expect(diagnostics).toEqual([])
})
