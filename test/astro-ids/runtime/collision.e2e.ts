import { writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const idAttribute = / id="([^"\s]+)"/g

test('repeated imports and distinct icons never share gradient IDs', async ({ page, request }, info) => {
  const response = await request.get('/')
  const html = await response.text()
  const htmlPath = info.outputPath('server.html')
  writeFileSync(htmlPath, html, { flag: 'wx' })
  await info.attach('server-html', { path: htmlPath, contentType: 'text/html' })
  expect(response.status()).toBe(200)
  const ids = Array.from(html.matchAll(idAttribute), match => match[1])
  expect.soft(new Set(ids).size).toBe(ids.length)
  await page.goto('/')
  const gradients = await page.locator('svg linearGradient').evaluateAll(nodes => nodes.map(node => node.id))
  expect(gradients).toHaveLength(5)
  expect.soft(new Set(gradients).size).toBe(5)
  const blue = await page.locator('[data-instance="blue"] > svg > rect').evaluate((rect) => {
    const id = rect.getAttribute('fill')!.slice(5, -1)
    const gradient = document.getElementById(id)!
    return { local: gradient.closest('svg') === rect.closest('svg'), color: getComputedStyle(gradient.querySelector('stop')!).stopColor }
  })
  expect.soft(blue.local).toBe(true)
  expect.soft(blue.color).toBe('rgb(0, 0, 255)')
})
