import { expect, test } from '@playwright/test'

const svgRoot = /<svg(?:[^>"']|"[^"]*"|'[^']*')*>/g
const widths = /\swidth="([^"]+)"/g
const heights = /\sheight="([^"]+)"/g
const fills = /\sfill="([^"]+)"/g

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
})

test('emits each root attribute once with consumer props taking precedence', async ({ request, page }) => {
  const html = await (await request.get('/')).text()
  const root = html.match(svgRoot)?.find(tag => tag.includes('id="component"'))
  expect(root).toBeDefined()
  expect(Array.from(root!.matchAll(widths), match => match[1])).toEqual(['99'])
  expect(Array.from(root!.matchAll(heights), match => match[1])).toEqual(['98'])
  expect(Array.from(root!.matchAll(fills), match => match[1])).toEqual(['blue'])
  await page.goto('/')
  await expect(page.locator('#component')).toHaveClass('consumer')
  await expect(page.locator('#component')).toHaveAttribute('width', '99')
  await expect(page.locator('#component')).toHaveAttribute('height', '98')
  await expect(page.locator('#component')).toHaveAttribute('fill', 'blue')
  await expect(page.locator('#virtual')).toHaveAttribute('data-probe', '2.5em')
  await expect(page.locator('#virtual')).toHaveAttribute('width', '24')
  await expect(page.locator('#virtual')).toHaveAttribute('height', '24')
  await expect(page.locator('#virtual')).toHaveAttribute('fill', 'none')
})

test('raw aliases preserve query decoding and return strings', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#raw-types')).toHaveText(JSON.stringify(Array.from({ length: 7 }).fill('string')))
  for (const [index, width] of ['3em', '4em', '5em', '6em', '8em', '10em', '%2E'].entries())
    await expect(page.locator(`#raw [data-index="${index}"] svg`)).toHaveAttribute('data-probe', width)
})

test('component instances have distinct IDs and local fragment references', async ({ page }) => {
  await page.goto('/')
  const ids: string[] = []
  for (const selector of ['#component', '#repeated', '#virtual']) {
    const icon = page.locator(selector)
    const gradient = await icon.locator('defs linearGradient').getAttribute('id')
    const path = await icon.locator('defs path').getAttribute('id')
    expect(gradient).toBeTruthy()
    expect(path).toBeTruthy()
    ids.push(gradient!, path!)
    await expect(icon.locator('path[stroke]')).toHaveAttribute('stroke', `url(#${gradient})`)
    await expect(icon.locator('use')).toHaveAttribute('href', `#${path}`)
    expect(await icon.locator('use').evaluate(node => node.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe(`#${path}`)
  }
  expect(new Set(ids).size).toBe(6)
  expect(ids).not.toContain('known-gradient')
  expect(ids).not.toContain('known-path')
})

test('raw SVGs retain literal IDs and fragment references', async ({ page }) => {
  await page.goto('/')
  const icons = page.locator('#raw svg')
  await expect(icons).toHaveCount(7)
  for (const icon of await icons.all()) {
    await expect(icon.locator('defs linearGradient')).toHaveAttribute('id', 'known-gradient')
    await expect(icon.locator('defs path')).toHaveAttribute('id', 'known-path')
    await expect(icon.locator('path[stroke]')).toHaveAttribute('stroke', 'url(#known-gradient)')
    await expect(icon.locator('use')).toHaveAttribute('href', '#known-path')
    expect(await icon.locator('use').evaluate(node => node.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe('#known-path')
  }
})
