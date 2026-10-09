import { expect, test } from '@playwright/test'

test('App Router SSR survives hydration and forwards SVG refs', async ({ page, request }) => {
  const response = await request.get('/')
  expect(response.ok()).toBe(true)
  expect(await response.text()).toContain('data-testid="icon"')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error')
      errors.push(message.text())
  })
  let releaseScripts!: () => void
  let blockedScripts = 0
  const scriptsReady = new Promise<void>((resolve) => {
    releaseScripts = resolve
  })
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() === 'script') {
      blockedScripts++
      await scriptsReady
    }
    await route.continue()
  })
  try {
    await page.goto('/', { waitUntil: 'commit' })
    const icon = page.getByTestId('icon')
    await expect(icon).toBeVisible()
    await expect.poll(() => blockedScripts).toBeGreaterThan(0)
    expect(await page.evaluate(() => window.iconProbe)).toBeUndefined()
    await icon.evaluate((node) => {
      window.iconBeforeHydration = node
    })
    await expect(icon.locator('title')).toHaveText('Title 0 <&"')
    await expect(icon).toHaveAttribute('width', '32')
    await expect(icon).toHaveAttribute('viewBox', '0 0 24 24')
    await expect(icon.locator('use')).toHaveAttribute('stroke-width', '2')
    expect(await icon.locator('use').evaluate(node => node.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe('#shape')
    const raw = await page.getByTestId('server-raw').textContent()
    expect(raw).toContain('<svg')
    expect(raw).toContain('stroke-width="2"')
    expect(await page.getByTestId('server-raw-alias').textContent()).toBe(raw)
    releaseScripts()
    await expect.poll(() => page.evaluate(() => window.iconProbe)).toEqual({
      hydrated: true,
      refIsSvg: true,
      reused: true,
    })
    await expect(icon).toHaveClass('icon')
    await expect(icon).toHaveAttribute('role', 'img')
    await expect(icon.locator('use')).toHaveAttribute('fill-rule', 'evenodd')
    await expect(icon.locator('use')).toHaveAttribute('stroke-linecap', 'round')
    await expect(page.getByTestId('alias')).toHaveAttribute('aria-hidden', 'true')
    await page.getByRole('button', { name: 'Update' }).click()
    await expect(icon).toHaveAttribute('width', '33')
    await expect(icon).toHaveAttribute('aria-label', 'Icon 1')
    await expect(icon.locator('title')).toHaveText('Title 1 <&"')
    expect(await icon.evaluate(node => node === window.iconBeforeHydration)).toBe(true)
    expect(errors).toEqual([])
  }
  finally {
    releaseScripts()
  }
})
