import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const hydrationMessage = /hydration|useId/i
const scriptUrl = /\.js(?:\?|$)/

export async function hydrate({ root, html, preview, chromium }) {
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
    page.setDefaultTimeout(15000)
    const diagnostics = []
    page.on('pageerror', error => diagnostics.push(error.message))
    page.on('console', message => hydrationMessage.test(message.text()) && diagnostics.push(message.text()))
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
    const before = await page.evaluate(() => {
      window.originalIcons = [...document.querySelectorAll('svg')]
      return Array.from(document.querySelectorAll('linearGradient'), node => node.id)
    })
    release()
    await page.waitForFunction(() => document.body.dataset.hydrated === 'true')
    const after = await page.evaluate(() => ({
      ids: Array.from(document.querySelectorAll('linearGradient'), node => node.id),
      identity: window.originalIcons.every((node, index) => node === document.querySelectorAll('svg')[index]),
      linked: [...document.querySelectorAll('svg')].every(node => node.querySelector('path').getAttribute('fill') === `url(#${node.querySelector('linearGradient').id})`),
    }))
    assert.deepEqual(after.ids, before)
    assert(after.identity && after.linked)
    assert.deepEqual(diagnostics, [])
    return { before, after, diagnostics }
  }
  finally {
    await browser?.close()
    await new Promise(resolve => server.httpServer.close(resolve))
  }
}
