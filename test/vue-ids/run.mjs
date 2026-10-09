import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { hydrate } from './browser.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const gradient = '<svg viewBox="0 0 24 24"><defs><linearGradient id="paint"><stop offset="0"/></linearGradient></defs><path fill="url(#paint)" d="M0 0h24v24H0z"/></svg>'
const idAttribute = /id="([^"]+)"/g

async function main() {
  assert(process.argv[2], 'Pass a freshly prepared Vue fixture run')
  const run = resolve(process.argv[2])
  const require = createRequire(join(run, 'package.json'))
  const { build, preview } = await import(pathToFileURL(require.resolve('vite')).href)
  process.env.PLAYWRIGHT_SKIP_BROWSER_GC = '1'
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(here, '../frameworks/vue/node_modules/browsers')
  const { chromium } = require('@playwright/test')
  const { default: Icons } = await import(pathToFileURL(require.resolve('unplugin-icons/vite')).href)
  const version = require('vue').version
  const vapor = version.includes('3.6.')
  const compiler = vapor ? 'vue-vapor' : 'vue3'
  const root = mkdtempSync(join(run, 'ids-'))
  cpSync(join(here, 'fixture'), root, { recursive: true })
  const plugin = Icons({ compiler, customCollections: { test: { gradient } } })
  const common = {
    root,
    configFile: false,
    envFile: false,
    plugins: [plugin],
    define: { 'import.meta.env.VAPOR': vapor, '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': true },
  }
  await build({ ...common, build: { ssr: join(root, 'server.js'), outDir: 'server-output', emptyOutDir: false } })
  const { render } = await import(pathToFileURL(join(root, 'server-output/server.js')).href)
  const html = await render('icons')
  const ids = Array.from(html.matchAll(idAttribute), match => match[1])
  assert.equal(ids.length, 3)
  assert.equal(new Set(ids).size, 3)
  const concurrent = await Promise.all([render('icons'), render('icons'), render('other')])
  assert.equal(concurrent[0], html, 'SSR IDs differ between fresh applications')
  assert.equal(concurrent[1], html, 'Concurrent SSR IDs differ')
  const otherIds = Array.from(concurrent[2].matchAll(idAttribute), match => match[1])
  assert(otherIds.every(id => !ids.includes(id)), 'Application prefixes must separate IDs')
  await build({ ...common, build: { outDir: 'client-output', emptyOutDir: false } })
  const browser = await hydrate({ root, html, preview, chromium })
  const result = { version, compiler, html, ids, otherIds, concurrent: true, ...browser }
  writeFileSync(join(root, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
  process.stdout.write(`PASS ${compiler} IDs: ${root}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
