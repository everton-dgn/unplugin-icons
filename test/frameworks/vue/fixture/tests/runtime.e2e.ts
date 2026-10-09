import { expect, test } from '@playwright/test'
import { version } from 'vue'
import { hydrate } from './hydrate'

const hydrationMessage = /hydration/i
test('SSR includes both aliases, escaped title and raw query values', async ({ request }) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('data-mounted="false"')
  expect(html).toContain('data-testid="primary"')
  expect(html).toContain('width="1.5em"')
  expect(html).toContain('A &amp; B &lt;C&gt; &quot;D&quot;')
  expect(html).toContain('&lt;circle')
  expect(html).toContain('a%2Eb')
})

test('hydrates original SVGs and updates attributes/events', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || hydrationMessage.test(message.text()))
      errors.push(message.text())
  })
  await hydrate(page, '/')
  expect(await page.evaluate(() => {
    const original = Reflect.get(window, 'ssrIcons') as SVGElement[]
    return original.length === 2 && original.every((node, index) => node === document.querySelectorAll('svg')[index])
  })).toBe(true)
  const primary = page.getByTestId('primary')
  if (version.startsWith('3.5.'))
    expect(await primary.evaluate(el => Reflect.get(window, 'iconRefElement') === el)).toBe(true)
  await expect(primary).toHaveAttribute('width', '24')
  await expect(primary).toHaveAttribute('class', 'primary')
  await expect(primary).toHaveAttribute('aria-label', 'Primary icon')
  await expect(primary.locator('title')).toHaveText('A & B <C> "D"')
  expect(await primary.locator('use').evaluate(el => el.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe('/sprite.svg#shape')
  await expect(page.getByTestId('alias')).toHaveAttribute('width', '1.5em')
  await primary.click()
  await expect(page.getByTestId('clicks')).toHaveText('1')
  await page.getByRole('button', { name: 'Update props' }).click()
  await expect(primary).toHaveAttribute('width', '48')
  await expect(primary).toHaveAttribute('data-count', '1')
  await expect(primary).toHaveCSS('color', 'rgb(0, 0, 255)')
  await expect(page.getByTestId('raw')).toContainText('width="2em"')
  await expect(page.getByTestId('virtual-raw')).toContainText('width="3em"')
  await expect(page.getByTestId('virtual-raw')).toContainText('title="a%2Eb"')
  expect(errors).toEqual([])
})
