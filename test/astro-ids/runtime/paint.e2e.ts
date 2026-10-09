import { writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test('CSS paint URLs resolve to each icon own gradient', async ({ page, request }, info) => {
  const response = await request.get('/paint')
  expect(response.status()).toBe(200)
  const htmlPath = info.outputPath('paint.html')
  writeFileSync(htmlPath, await response.text(), { flag: 'wx' })
  await info.attach('paint-html', { path: htmlPath, contentType: 'text/html' })
  await page.goto('/paint')
  for (const [name, expected] of [['red', 'rgb(255, 0, 0)'], ['blue', 'rgb(0, 0, 255)']]) {
    const actual = await page.locator(`[data-paint="${name}"] > svg`).evaluate((svg) => {
      const path = svg.querySelector('.shared')!
      // Browser callbacks cannot capture module constants.
      // eslint-disable-next-line e18e/prefer-static-regex
      const fragmentUrl = /#([^'"\s)]+)/
      const target = getComputedStyle(path).fill.match(fragmentUrl)?.[1]
      const gradient = target ? document.getElementById(target) : null
      return { local: gradient?.closest('svg') === svg, color: gradient ? getComputedStyle(gradient.querySelector('stop')!).stopColor : null }
    })
    expect.soft(actual, `${name}: computed paint must resolve within this SVG`).toEqual({ local: true, color: expected })
  }
})
