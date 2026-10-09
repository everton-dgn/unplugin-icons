import { writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test('icon styles stay isolated from sibling icons and external elements', async ({ page, request }, info) => {
  const response = await request.get('/styles')
  expect(response.status()).toBe(200)
  const htmlPath = info.outputPath('styles.html')
  writeFileSync(htmlPath, await response.text(), { flag: 'wx' })
  await info.attach('styles-html', { path: htmlPath, contentType: 'text/html' })
  await page.goto('/styles')
  for (const [name, expected] of [['red', 'rgb(255, 0, 0)'], ['blue', 'rgb(0, 0, 255)'], ['external', 'rgb(0, 128, 0)']]) {
    const colors = await page.locator(`[data-style="${name}"] > svg`).evaluate(svg => ({
      shared: getComputedStyle(svg.querySelector('.shared')!).fill,
      secondary: getComputedStyle(svg.querySelector('.secondary')!).fill,
      root: getComputedStyle(svg).stroke,
    }))
    expect.soft(colors, `${name}: class, type/root and pseudo-class selectors`).toEqual({ shared: expected, secondary: expected, root: expected })
  }
})
