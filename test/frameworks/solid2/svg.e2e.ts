import { symlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { serveFixture } from './serve'

let server: Awaited<ReturnType<typeof serveFixture>>
test.beforeAll(async () => {
  server = await serveFixture()
})
test.afterAll(async () => {
  await server?.close()
})

for (const mode of ['hydrate', 'render']) {
  test(`${mode}: SVG props, refs, updates and references`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(server.url + (mode === 'render' ? '/?csr' : '/'))
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')
    const icon = page.getByTestId('tilde')
    await expect(icon).toHaveAttribute('width', '24')
    await expect(icon).toHaveAttribute('viewBox', '0 0 24 24')
    await expect(icon).toHaveAttribute('aria-label', 'A & B "quoted"')
    await expect(icon).toHaveAttribute('data-ref', 'true')
    if (mode === 'hydrate')
      expect(await icon.evaluate(node => node === (window as any).beforeHydration)).toBe(true)
    await expect(icon.locator('linearGradient')).toHaveAttribute('gradientUnits', 'userSpaceOnUse')
    await expect(icon.locator('use')).toHaveAttribute('stroke-width', '2')
    await expect(icon.locator('use')).toHaveAttribute('stroke-linecap', 'round')
    await expect(icon.locator('use')).toHaveAttribute('fill', 'url(#paint)')
    await expect(icon.locator('use')).toHaveAttribute('href', '#shape')
    await expect(icon.locator('use')).toHaveAttribute('xlink:href', '#shape')
    await expect(page.getByTestId('false-raw')).toHaveJSProperty('tagName', 'svg')
    await page.getByRole('button', { name: 'Update' }).click()
    await expect(icon).toHaveAttribute('width', '48')
    await expect(icon).toHaveAttribute('stroke', 'green')
    await expect(page.getByTestId('virtual')).toHaveAttribute('width', '48')
    if (mode === 'hydrate')
      expect(await icon.evaluate(node => node === (window as any).beforeHydration)).toBe(true)
    expect(errors).toEqual([])
  })
}

test('raw query variants and typed prefixes return SVG strings', async ({ page }) => {
  await page.goto(server.url)
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')
  const raw = JSON.parse((await page.locator('#raw').textContent())!)
  expect(Object.keys(raw)).toHaveLength(7)
  for (const value of Object.values(raw)) {
    expect(typeof value).toBe('string')
    expect(value).toContain('<svg')
    expect(value).toContain('xlink:href="#shape"')
  }
  for (const key of ['first', 'last', 'typed', 'virtualTyped']) expect(raw[key]).toContain('height="31"')
  for (const value of Object.values(raw)) expect(value).toContain('width="16"')
  expect(raw.middle).toContain('height="32"')
})

test('SSR emits consumer props and escaped values before JavaScript runs', async ({ request }) => {
  const response = await request.get(server.url)
  expect(response.ok()).toBe(true)
  const html = await response.text()
  expect(html).toContain('width="24"')
  expect(html).toContain('viewBox="0 0 24 24"')
  expect(html).toContain('aria-label="A &amp; B &quot;quoted&quot;"')
  expect(html).toContain('stroke="blue"')
})

test('known IDs remain literal across instances', async ({ page }) => {
  await page.goto(server.url)
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')
  await expect(page.locator('linearGradient[id="paint"]')).toHaveCount(3)
  await expect(page.locator('path[id="shape"]')).toHaveCount(3)
})

test('serves only assets inside the client root', async ({ request }) => {
  const privateFile = resolve(server.client, '../private.txt')
  await writeFile(privateFile, 'private-fixture-marker', { flag: 'wx' })
  await symlink(privateFile, resolve(server.client, 'outside.js'))
  expect((await request.get(`${server.url}/client.mjs`)).status()).toBe(200)
  for (const path of ['/%2e%2e%2fprivate.txt', '/outside.js']) {
    const response = await request.get(server.url + path)
    expect(response.status()).toBe(403)
    expect(await response.text()).not.toContain('private-fixture-marker')
  }
  expect((await request.get(`${server.url}/missing.js`)).status()).toBe(404)
  expect((await request.get(`${server.url}/%ZZ`)).status()).toBe(400)
})
