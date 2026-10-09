import { expect, test } from '@playwright/test'

const scriptUrl = /\.js(?:\?|$)/

test.describe('server HTML', () => {
  test.use({ javaScriptEnabled: false })
  test('renders component aliases and raw query edges without JavaScript', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('main')).toHaveAttribute('data-mounted', 'false')
    await expect(page.getByTestId('icon')).toHaveAttribute('width', '32')
    await expect(page.getByTestId('alias')).toHaveAttribute('width', '2.5')
    await expect(page.getByTestId('alias')).toHaveAttribute('height', '3.5')
    await expect(page.getByTestId('icon').locator('title')).toHaveText('Literal & title')
    const raw = await page.getByTestId('raw').textContent()
    expect(raw).toContain('<svg')
    expect(await page.getByTestId('virtual-raw').textContent()).toBe(raw)
    expect(await page.getByTestId('query-raw').textContent()).toContain('width="2.5"')
    expect(await page.getByTestId('query-raw').textContent()).toContain('height="3.5"')
    await expect(page.locator('pre svg')).toHaveCount(0)
  })
})

test('hydrates existing SVG nodes, exposes a ref and updates through events', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.text().toLowerCase().includes('hydration'))
      errors.push(message.text())
  })
  let release!: () => void
  const scripts = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(scriptUrl, async (route) => {
    await scripts
    await route.continue()
  })
  try {
    await page.goto('/', { waitUntil: 'commit' })
    await expect(page.locator('main')).toHaveAttribute('data-mounted', 'false')
    await expect(page.getByTestId('icon')).toBeVisible()
    await expect(page.locator('svg')).toHaveCount(2)
    await page.evaluate(() => Reflect.set(window, 'ssrIcons', [...document.querySelectorAll('svg')]))
  }
  finally { release() }
  await expect(page.locator('main')).toHaveAttribute('data-mounted', 'true')
  await expect(page.locator('main')).toHaveAttribute('data-svg-ref', 'true')
  expect(await page.evaluate(() => {
    const current = [...document.querySelectorAll('svg')]
    const original = Reflect.get(window, 'ssrIcons') as SVGSVGElement[]
    return current.length === original.length && current.every((svg, index) => svg === original[index])
  })).toBe(true)
  const svg = page.getByTestId('icon')
  expect(await svg.evaluate(node => node.namespaceURI)).toBe('http://www.w3.org/2000/svg')
  expect(await svg.locator('use').evaluate(node => node.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe('/sprite.svg#shape')
  await expect(svg).toHaveAttribute('aria-label', 'Icon 0 <&"')
  await page.getByRole('button').click()
  await expect(svg).toHaveAttribute('width', '33')
  await svg.click()
  await expect(svg).toHaveAttribute('width', '34')
  await expect(svg).toHaveAttribute('aria-label', 'Icon 2 <&"')
  expect(errors).toEqual([])
})
