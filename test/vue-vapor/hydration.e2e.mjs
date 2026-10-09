import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const hydrationMessage = /hydration/i
const svgTag = /<svg/g
const scriptUrl = /\.js(?:\?|$)/
const svgId = /id="([^"]+)"/g

async function main() {
  const run = resolve(process.argv[2])
  const require = createRequire(join(run, 'package.json'))
  const { build, preview } = await import(pathToFileURL(require.resolve('vite')).href)
  const { chromium } = require('@playwright/test')
  const { default: Icons } = await import(pathToFileURL(require.resolve('unplugin-icons/vite')).href)
  const root = mkdtempSync(join(run, 'hydration-'))
  cpSync(join(dirname(fileURLToPath(import.meta.url)), 'fixture'), root, { recursive: true })
  const icon = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'
  const gradient = '<svg viewBox="0 0 24 24"><defs><linearGradient id="paint"><stop offset="0"/></linearGradient></defs><path fill="url(#paint)" d="M0 0"/></svg>'
  const plugin = Icons({ compiler: 'vue-vapor', customCollections: { test: { icon, gradient } } })
  const common = { root, configFile: false, envFile: false, plugins: [plugin] }
  await build({ ...common, build: { ssr: join(root, 'server.js'), outDir: 'server-output', emptyOutDir: false } })
  await build({ ...common, build: { outDir: 'client-output', emptyOutDir: false } })
  const { render, renderIds } = await import(pathToFileURL(join(root, 'server-output/server.js')).href)
  const html = await render()
  assert.equal((html.match(svgTag) || []).length, 2)
  const idsHtml = await renderIds()
  const ids = Array.from(idsHtml.matchAll(svgId), match => match[1])
  assert.equal(ids.length, 2)
  assert.equal(new Set(ids).size, 2)
  for (const id of ids)
    assert(idsHtml.includes(`fill="url(#${id})"`))
  const template = readFileSync(join(root, 'client-output/index.html'), 'utf8')
  const server = await preview({
    root,
    configFile: false,
    envFile: false,
    build: { outDir: 'client-output' },
    preview: { port: 0, host: '127.0.0.1' },
    plugins: [{
      name: 'ssr-document',
      configurePreviewServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url !== '/')
            return next()
          response.setHeader('Content-Type', 'text/html')
          response.end(template.replace('<!--app-html-->', html))
        })
      },
    }],
  })
  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => hydrationMessage.test(message.text()) && errors.push(message.text()))
    let release
    const scripts = new Promise((resolve) => {
      release = resolve
    })
    await page.route(scriptUrl, async (route) => {
      await scripts
      await route.continue()
    })
    await page.goto(server.resolvedUrls.local[0], { waitUntil: 'commit' })
    await page.locator('svg').first().waitFor()
    await page.evaluate(() => {
      window.originalIcons = [...document.querySelectorAll('svg')]
    })
    release()
    await page.waitForFunction(() => document.body.dataset.hydrated === 'true')
    assert(await page.evaluate(() => window.originalIcons.every((node, index) => node === document.querySelectorAll('svg')[index])))
    await page.getByTestId('icon').click()
    await page.waitForFunction(() => document.querySelector('output').textContent === '1')
    assert.equal(await page.getByTestId('icon').getAttribute('data-count'), '1')
    const raws = JSON.parse(await page.getByTestId('raw').textContent())
    assert.equal(raws.length, 3)
    assert(raws.every(value => value === raws[0] && value.includes('<svg')))
    assert.deepEqual(errors, [])
    writeFileSync(join(root, 'result.json'), JSON.stringify({ html, idsHtml, identity: true, event: true, raw: true, errors }, null, 2), { flag: 'wx' })
    process.stdout.write(`PASS SSR + hydration: ${root}\n`)
  }
  finally {
    await browser?.close()
    await new Promise(resolve => server.httpServer.close(resolve))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
