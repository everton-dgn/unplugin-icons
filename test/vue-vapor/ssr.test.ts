import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import { expect, it } from 'vitest'
import Icons from '../../src/vite'

const require = createRequire(new URL('../../examples/vite-vue3/package.json', import.meta.url))
const vue = require.resolve('vue')
const renderer = createRequire(vue).resolve('@vue/server-renderer')
const gradient = '<svg viewBox="0 0 24 24"><defs><linearGradient id="paint"><stop offset="0"/></linearGradient></defs><path fill="url(#paint)" d="M0 0"/></svg>'
const svg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'

it('imports and renders a real Vapor SSR bundle with aliases, queries and raw', async () => {
  const root = mkdtempSync(fileURLToPath(new URL('../../node_modules/.vapor-ssr-', import.meta.url)))
  const entry = join(root, 'entry.js')
  writeFileSync(entry, `
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Icon from '~icons/test/icon?width=2em&raw=false'
import Alias from 'virtual:icons/test/icon?width=3em'
import Gradient from '~icons/test/gradient'
import raw from '~icons-raw/test/icon?raw=false'
import rawAlias from 'virtual:icons-raw/test/icon'
import rawQuery from '~icons/test/icon?raw=true'
export async function render() {
  return { ids: await renderToString(createSSRApp({ render: () => h('main', [h(Gradient), h(Gradient)]) })), html: await renderToString(createSSRApp({ render: () => h('main', [h(Icon), h(Alias)]) })), raw, rawAlias, rawQuery }
}
`)
  await build({
    root,
    configFile: false,
    envFile: false,
    logLevel: 'silent',
    plugins: [Icons({ compiler: 'vue-vapor', customCollections: { test: { icon: svg, gradient } } })],
    build: {
      ssr: entry,
      outDir: join(root, 'output'),
      emptyOutDir: false,
      rollupOptions: {
        plugins: [{
          name: 'fixture-vue-runtime',
          resolveId: id => id === 'vue' ? { id: vue, external: true } : ['@vue/server-renderer', 'vue/server-renderer'].includes(id) ? { id: renderer, external: true } : null,
        }],
      },
    },
  })
  const output = pathToFileURL(join(root, 'output/entry.js')).href
  const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '--eval', `const {render}=await import(${JSON.stringify(output)}); console.log(JSON.stringify(await render()))`], { encoding: 'utf8' }))
  expect(result.html).toContain('width="2em"')
  expect(result.html).toContain('width="3em"')
  expect(result.html.match(/<svg/g)).toHaveLength(2)
  const ids = Array.from(result.ids.matchAll(/id="([^"]+)"/g), match => match[1])
  expect(ids).toHaveLength(2)
  expect(new Set(ids).size).toBe(2)
  for (const id of ids)
    expect(result.ids).toContain(`fill="url(#${id})"`)
  expect(result.raw).toContain('<path')
  expect(result.rawAlias).toBe(result.raw)
  expect(result.rawQuery).toBe(result.raw)
})
