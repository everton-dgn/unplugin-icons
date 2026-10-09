import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    mountFixture: () => void
    originalSvg: Element
  }
}

test('SSR hydrates the existing SVG and supports events, attributes and raw imports', async ({ page, request }) => {
  const response = await request.get('/')
  expect(await response.text()).toContain('data-testid=icon')
  expect(response.headers()['x-svg-executed']).toBe('false')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  let release!: () => void
  const blocked = new Promise<void>((resolve) => {
    release = resolve
  })
  let scripts = 0
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() === 'script') {
      scripts++
      await blocked
    }
    await route.continue()
  })
  try {
    await page.goto('/', { waitUntil: 'commit' })
    const scope = page.getByTestId('ssr')
    const icon = scope.getByTestId('icon')
    await expect(icon).toBeVisible()
    await expect.poll(() => scripts).toBeGreaterThan(0)
    await icon.evaluate((node) => {
      window.originalSvg = node
    })
    await expect(icon.locator('title')).toHaveText('Sample & icon')
    await expect(icon).toHaveAttribute('aria-label', 'Icon 0 <&"')
    expect(await icon.evaluate(node => node.namespaceURI)).toBe('http://www.w3.org/2000/svg')
    expect(await icon.locator('use').evaluate(node => node.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe('#shape')
    await expect(icon.locator('use')).toHaveAttribute('stroke-width', '2')
    await expect(scope.getByTestId('alias')).toHaveAttribute('width', '2.5')
    await expect(scope.getByTestId('alias')).toHaveAttribute('height', '3.5')
    expect(await scope.getByTestId('raw').textContent()).toBe(await scope.getByTestId('raw-alias').textContent())
    expect(await scope.getByTestId('query-raw').textContent()).toContain('width="2.5"')
    release()
    await page.waitForFunction(() => typeof window.mountFixture === 'function')
    await scope.getByRole('button').click()
    await expect(icon).toHaveAttribute('width', '33')
    await icon.click()
    await expect(icon).toHaveAttribute('aria-label', 'Icon 2 <&"')
    expect(await icon.evaluate(node => node === window.originalSvg)).toBe(true)
    expect(errors).toEqual([])
  }
  finally {
    release()
  }
})

test('CSR mounts SVG nodes and updates attributes through events', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.mountFixture === 'function')
  await page.evaluate(() => window.mountFixture())
  const scope = page.getByTestId('csr')
  const icon = scope.getByTestId('icon')
  expect(await icon.evaluate(node => node.namespaceURI)).toBe('http://www.w3.org/2000/svg')
  expect(await icon.locator('use').evaluate(node => node.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe('#shape')
  await scope.getByRole('button').click()
  await expect(icon).toHaveAttribute('width', '33')
  await expect(icon).toHaveAttribute('aria-label', 'Icon 1 <&"')
})
