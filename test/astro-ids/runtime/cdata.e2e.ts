import { writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test('CDATA selectors preserve literal ampersands when rewriting ARIA IDs', async ({ page, request }, info) => {
  const response = await request.get('/cdata')
  expect(response.status()).toBe(200)
  const htmlPath = info.outputPath('cdata.html')
  writeFileSync(htmlPath, await response.text(), { flag: 'wx' })
  await info.attach('cdata-html', { path: htmlPath, contentType: 'text/html' })
  await page.goto('/cdata')
  const actual = await page.locator('main > svg').evaluate((svg) => {
    const title = svg.querySelector('title')!
    const path = svg.querySelector('path')!
    const style = svg.querySelector('style')!
    const sheet = Array.from(document.styleSheets).find(sheet => sheet.ownerNode === style)!
    const rule = Array.from(sheet.cssRules).find(rule => rule instanceof CSSStyleRule) as CSSStyleRule
    return {
      attribute: path.getAttribute('aria-labelledby'),
      expectedAttribute: `${title.id} outside&name`,
      selector: rule.selectorText,
      matches: path.matches(rule.selectorText),
      fill: getComputedStyle(path).fill,
    }
  })
  expect.soft(actual.attribute).toBe(actual.expectedAttribute)
  expect.soft(actual.selector).toContain(`[aria-labelledby="${actual.expectedAttribute}"]`)
  expect.soft(actual.selector).not.toContain('outside&amp;name')
  expect.soft(actual.matches).toBe(true)
  expect.soft(actual.fill).toBe('rgb(255, 0, 0)')
})
