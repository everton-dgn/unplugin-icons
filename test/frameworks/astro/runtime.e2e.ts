import { expect, test } from '@playwright/test'

const svgRoot = /<svg(?:[^>"']|"[^"]*"|'[^']*')*>/g
const widths = /\bwidth="([^"]+)"/g
const heights = /\bheight="([^"]+)"/g

test.use({ javaScriptEnabled: false })

test('SSR contains components and raw strings before browser scripts', async ({ request, page }) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)
  expect(await response.text()).toContain('id="component"')
  await page.goto('/')
  await expect(page.locator('#component')).toHaveAttribute('aria-label', 'A & B <safe> "quoted"')
  await expect(page.locator('#component')).toHaveAttribute('viewBox', '0 0 24 24')
  await expect(page.locator('#component title')).toHaveText('Fish & Chips <safe> "quoted"')
  await expect(page.locator('#component linearGradient')).toHaveAttribute('gradientUnits', 'userSpaceOnUse')
  await expect(page.locator('#component path[stroke]')).toHaveAttribute('stroke-width', '2')
  await expect(page.locator('#component path[stroke]')).toHaveAttribute('stroke-linecap', 'round')
  await expect(page.locator('#component use')).toHaveAttribute('href', '#known-path')
  expect(await page.locator('#component use').evaluate(node => node.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe('#known-path')
})

test('characterizes duplicate root attributes and browser precedence', async ({ request, page }) => {
  const html = await (await request.get('/')).text()
  const root = html.match(svgRoot)?.find(tag => tag.includes('id="component"'))
  expect(root).toBeDefined()
  expect(Array.from(root!.matchAll(widths), match => match[1])).toEqual(['99', '24'])
  expect(Array.from(root!.matchAll(heights), match => match[1])).toEqual(['98', '24'])
  await page.goto('/')
  await expect(page.locator('#component')).toHaveClass('consumer')
  await expect(page.locator('#component')).toHaveAttribute('width', '99')
  await expect(page.locator('#component')).toHaveAttribute('height', '98')
  await expect(page.locator('#component')).toHaveAttribute('fill', 'blue')
  await expect(page.locator('#virtual')).toHaveAttribute('data-probe', '2.5em')
  await expect(page.locator('#virtual')).toHaveAttribute('width', '24')
})

test('raw aliases preserve query decoding and return strings', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#raw-types')).toHaveText(JSON.stringify(Array.from({ length: 7 }).fill('string')))
  for (const [index, width] of ['3em', '4em', '5em', '6em', '8em', '10em', '%2E'].entries())
    await expect(page.locator(`#raw [data-index="${index}"] svg`)).toHaveAttribute('data-probe', width)
})

test('known IDs are retained, including collisions across instances', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[id="known-gradient"]')).toHaveCount(9)
  await expect(page.locator('[id="known-path"]')).toHaveCount(9)
  await expect(page.locator('#component path[stroke]')).toHaveAttribute('stroke', 'url(#known-gradient)')
})
