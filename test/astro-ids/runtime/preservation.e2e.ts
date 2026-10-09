import { writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test('preserves namespaces, external values, entities and CDATA text', async ({ page, request }, info) => {
  const html = await (await request.get('/')).text()
  const htmlPath = info.outputPath('escaping.html')
  writeFileSync(htmlPath, html, { flag: 'wx' })
  await info.attach('escaping-html', { path: htmlPath, contentType: 'text/html' })
  await page.goto('/')
  const icons = page.locator('section > svg')
  await expect(icons).toHaveCount(5)
  for (const svg of await icons.all()) {
    expect(await svg.evaluate(node => node.namespaceURI)).toBe('http://www.w3.org/2000/svg')
    await expect(svg).toHaveAttribute('data-quote', 'one > "two" & three')
    await expect(svg.locator('title').first()).toHaveText('Color & title')
    await expect(svg.locator('desc')).toHaveText('Description "quoted"')
    await expect(svg.locator('[data-role="external"]')).toHaveAttribute('href', 'https://example.invalid/a.svg#glyph')
    expect(await svg.locator('[data-role="external"]').evaluate(node => node.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe('/sprite.svg#glyph')
    const css = await svg.locator('style').textContent()
    expect(css).toContain('https://example.invalid/a.svg#red')
    expect(css).toContain('/* #red url(#red) stays literal */')
    expect(css).toContain('"#red url(#red)"')
    expect(await svg.locator('[data-role="escaped"]').textContent()).toBe('<script data-injected="yes">globalThis.injected = true</script> & $')
    await expect(svg.locator('script, [data-injected]')).toHaveCount(0)
    expect(await svg.locator('[data-role="literal"]').textContent()).toBe(`quotes " ' & < > $1 \\n \${notExecuted}`)
  }
})

test('preserves default attributes and consumer override/null semantics', async ({ page }) => {
  await page.goto('/')
  const original = page.locator('[data-instance="red-one"] > svg')
  await expect(original).toHaveAttribute('width', '80')
  expect(await original.getAttribute('id')).toBeTruthy()
  const consumer = page.locator('[data-instance="consumer"] > svg')
  await expect(consumer).toHaveAttribute('id', 'consumer-root')
  await expect(consumer).toHaveAttribute('width', '99')
  await expect(consumer).toHaveAttribute('data-consumer', 'yes')
  await expect(consumer).toHaveAttribute('aria-label', 'Consumer & <safe> "quoted"')
  const empty = page.locator('[data-instance="null"] > svg')
  expect(await empty.getAttribute('id')).toBeNull()
  expect(await empty.getAttribute('width')).toBeNull()
  expect(await empty.getAttribute('aria-labelledby')).toBeNull()
})
