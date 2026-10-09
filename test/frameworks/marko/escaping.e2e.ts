import { expect, test } from '@playwright/test'

for (const mode of ['ssr', 'csr']) {
  test.describe(mode, () => {
    test.use({ javaScriptEnabled: mode === 'csr' })
    for (const [attribute, expected] of [
      ['dollar', '$1'],
      ['path', 'C:\\temp'],
      ['newline', String.raw`C:\new`],
      ['unicode', String.raw`\u0041`],
      ['backtick', '`'],
      ['interpolation', `\${globalThis.svgExecuted = true}`],
      ['multiple', String.raw`\\server\\share`],
      ['trailing', 'end\\'],
    ]) {
      test(`preserves ${attribute} in SVG text and attributes`, async ({ page }) => {
        await page.goto('/')
        if (mode === 'csr') {
          await page.waitForFunction(() => typeof window.mountFixture === 'function')
          await page.evaluate(() => window.mountFixture())
        }
        const svg = page.getByTestId(mode).getByTestId('escaping')
        const text = svg.locator('text[data-dollar]')
        expect.soft(await text.textContent()).toContain(expected)
        await expect.soft(text).toHaveAttribute(`data-${attribute}`, expected)
        await expect.soft(svg).toHaveAttribute(`data-root-${attribute}`, expected)
        expect(await page.evaluate(() => Object.hasOwn(globalThis, 'svgExecuted'))).toBe(false)
      })
    }
    test('preserves CDATA and preexisting entities', async ({ page }) => {
      const response = await page.goto('/')
      expect(response?.headers()['x-svg-executed']).toBe('false')
      if (mode === 'csr') {
        await page.waitForFunction(() => typeof window.mountFixture === 'function')
        await page.evaluate(() => window.mountFixture())
      }
      const svg = page.getByTestId(mode).getByTestId('escaping')
      const literal = `$1 | C:\\temp | C:\\new | \\u0041 | \` | \${globalThis.svgExecuted = true} | \\\\server\\\\share | end\\ | &#92; &#36; &amp;`
      expect.soft(await svg.locator('[data-cdata="text"]').textContent()).toBe(literal)
      expect.soft(await svg.locator('[data-cdata="style"]').textContent()).toBe(`/* ${literal} */`)
      expect(await svg.locator('text[data-dollar]').textContent()).toContain('<&"')
      expect(await page.evaluate(() => Object.hasOwn(globalThis, 'svgExecuted'))).toBe(false)
    })
  })
}
