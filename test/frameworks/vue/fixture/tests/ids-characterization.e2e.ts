import { expect, test } from '@playwright/test'
import { hydrate } from './hydrate'

const mismatch = /hydration.*mismatch/i
test('characterizes #344: random defs IDs produce hydration diagnostics', async ({ page }, testInfo) => {
  const diagnostics: string[] = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (mismatch.test(message.text()))
      diagnostics.push(message.text())
  })
  await hydrate(page, '/ids')
  const id = await page.getByTestId('gradient').locator('linearGradient').getAttribute('id')
  expect(id).toBeTruthy()
  await expect(page.getByTestId('gradient').locator('path')).toHaveAttribute('fill', `url(#${id})`)
  expect(diagnostics.length).toBeGreaterThan(0)
  expect(errors).toEqual([])
  await testInfo.attach('known-344-diagnostics', { body: diagnostics.join('\n'), contentType: 'text/plain' })
})
