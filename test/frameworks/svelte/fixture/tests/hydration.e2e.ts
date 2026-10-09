import { expect, test } from '@playwright/test'

const primarySvg = /<svg[^>]*data-testid="primary"/
const aliasSvg = /<svg[^>]*data-testid="alias"/
const hydrationMessage = /hydration/i
const scriptUrl = /\.js(?:\?|$)/

test('serves both aliases and raw strings in SSR', async ({ request }) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('data-mounted="false"')
  expect(html).toMatch(primarySvg)
  expect(html).toMatch(aliasSvg)
  expect(html).toContain('width="1.5em"')
  expect(html).toContain('&lt;circle')
  expect(html).toContain('width="2em"')
})

test('hydrates the original SVG nodes and updates runes, attributes and events', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || hydrationMessage.test(message.text()))
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
    await expect(page.getByTestId('primary')).toBeVisible()
    await expect(page.locator('main')).toHaveAttribute('data-mounted', 'false')
    await page.evaluate(() => {
      Reflect.set(window, 'ssrIcons', [...document.querySelectorAll('svg')])
    })
  }
  finally { release() }
  await expect(page.locator('main')).toHaveAttribute('data-mounted', 'true')
  expect(await page.evaluate(() => {
    const original = Reflect.get(window, 'ssrIcons') as SVGElement[]
    return original.length === 2 && original.every((node, index) => node === document.querySelectorAll('svg')[index])
  })).toBe(true)
  await expect(page.getByTestId('primary')).toHaveAttribute('width', '24')
  await expect(page.getByTestId('primary')).toHaveAttribute('class', 'primary')
  await expect(page.getByTestId('primary')).toHaveAttribute('aria-label', 'Primary icon')
  await expect(page.getByTestId('alias')).toHaveAttribute('width', '1.5em')
  await expect(page.getByTestId('alias')).toHaveAttribute('height', '30')
  await page.getByTestId('primary').click()
  await expect(page.getByTestId('clicks')).toHaveText('1')
  await page.getByRole('button', { name: 'Update props' }).click()
  await expect(page.getByTestId('count')).toHaveText('1')
  await expect(page.getByTestId('primary')).toHaveAttribute('data-count', '1')
  await expect(page.getByTestId('primary')).toHaveAttribute('width', '48')
  await expect(page.getByTestId('primary')).toHaveCSS('color', 'rgb(0, 0, 255)')
  await expect(page.getByTestId('raw')).toContainText('<circle')
  await expect(page.getByTestId('raw')).toContainText('width="2em"')
  await expect(page.getByTestId('virtual-raw')).toContainText('width="3em"')
  expect(errors).toEqual([])
})
