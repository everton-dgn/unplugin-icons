import { expect, test } from '@playwright/test'
import { serve } from './server.mjs'

test('paused SSR resumes an SVG click, signal, ref and props on the same node', async ({ page, request }) => {
  const server = await serve()
  try {
    const response = await request.get(server.url)
    expect(response.ok()).toBe(true)
    const html = await response.text()
    expect(html).toContain('q:container="paused"')
    expect(html).toContain('q:base="/build/"')
    expect(html).toContain('qwik/json')
    expect(html).toContain('on:click=')
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error')
        errors.push(message.text())
    })
    page.on('response', (response) => {
      if (response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`)
    })
    await page.goto(server.url)
    await expect.poll(() => page.evaluate(() => window.probe.visible)).toBe(true)
    expect(await page.evaluate(() => [window.probe.refIsSvg, window.probe.reused])).toEqual([true, true])
    const icon = page.getByTestId('icon')
    await expect(icon).toHaveAttribute('width', '32')
    await expect(icon).toHaveAttribute('viewBox', '0 0 24 24')
    await expect(icon).toHaveAttribute('aria-label', 'Icon 0 <&"')
    await expect(icon).toHaveClass('icon')
    await expect(icon.locator('title')).toHaveText('Static <tag> & "quote"')
    await expect(icon.locator('use')).toHaveAttribute('stroke-width', '2')
    await expect(icon.locator('use')).toHaveAttribute('fill-rule', 'evenodd')
    expect(await icon.evaluate(node => node.namespaceURI)).toBe('http://www.w3.org/2000/svg')
    expect(await icon.locator('defs path').getAttribute('id')).toBe('a')
    expect(await icon.locator('use').evaluate(node => node.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe('#a')
    await expect(page.getByTestId('alias')).toHaveAttribute('aria-hidden', 'true')
    await expect(page.getByTestId('decimal')).toHaveAttribute('width', '12.5')
    await expect(page.getByTestId('decimal')).toHaveAttribute('height', '13.25')
    await expect(page.getByTestId('encoded')).toHaveAttribute('width', '14.5')
    await expect(page.getByTestId('encoded')).toHaveAttribute('height', '15.25')
    expect(await page.getByTestId('raw-false').evaluate(node => node.tagName)).toBe('svg')
    const raw = await page.getByTestId('raw').textContent()
    expect(raw).toContain('<svg')
    expect(raw).toContain('stroke-width="2"')
    expect(await page.getByTestId('raw-alias').textContent()).toBe(raw)
    // SVGX/SVGO shortens the ID, but does not isolate repeated instances.
    expect(await page.locator('svg defs [id="a"]').count()).toBe(5)
    await icon.click()
    await expect(page.getByTestId('count')).toHaveText('1')
    await expect(icon).toHaveAttribute('width', '33')
    await expect(icon).toHaveAttribute('aria-label', 'Icon 1 <&"')
    expect(await page.evaluate(() => window.probe.original === document.querySelector('[data-testid="icon"]'))).toBe(true)
    expect(errors).toEqual([])
  }
  finally { await server.close() }
})
