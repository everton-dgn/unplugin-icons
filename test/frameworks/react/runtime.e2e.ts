import { expect, test } from '@playwright/test'

test('SSR hydrates the same SVG, forwards its ref and updates props', async ({ page, request }) => {
  const response = await request.get('/')
  expect(response.ok()).toBe(true)
  const html = await response.text()
  expect(html).toContain('data-testid="icon"')
  expect(html).toContain('stroke-width="2"')
  expect(html).toContain('xlink:href="#shape"')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error')
      errors.push(message.text())
  })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => window.probe.hydrated)).toBe(true)
  expect(await page.evaluate(() => ({ ...window.probe, original: undefined }))).toEqual({
    original: undefined,
    hydrated: true,
    reused: true,
    refIsSvg: true,
    errors: [],
  })
  const icon = page.getByTestId('icon')
  await expect(icon).toHaveAttribute('width', '32')
  await expect(icon).toHaveAttribute('viewBox', '0 0 24 24')
  await expect(icon).toHaveAttribute('role', 'img')
  await expect(icon).toHaveClass('icon')
  await expect(icon.locator('title')).toHaveText('Title 0 <&"')
  await expect(icon.locator('use')).toHaveAttribute('fill-rule', 'evenodd')
  await expect(icon.locator('use')).toHaveAttribute('stroke-linecap', 'round')
  expect(await icon.locator('use').evaluate(node => node.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe('#shape')
  await expect(page.getByTestId('alias')).toHaveAttribute('aria-hidden', 'true')
  const raw = await page.getByTestId('raw').textContent()
  expect(raw).toContain('<svg')
  expect(raw).toContain('stroke-width="2"')
  expect(await page.getByTestId('raw-alias').textContent()).toBe(raw)
  await page.getByRole('button', { name: 'Update' }).click()
  await expect(icon).toHaveAttribute('width', '33')
  await expect(icon).toHaveAttribute('aria-label', 'Icon 1')
  await expect(icon.locator('title')).toHaveText('Title 1 <&"')
  expect(await page.evaluate(() => window.probe.original === document.querySelector('[data-testid="icon"]'))).toBe(true)
  expect(await page.evaluate(() => window.probe.errors)).toEqual([])
  expect(errors).toEqual([])
})
