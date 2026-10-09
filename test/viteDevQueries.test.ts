import type { AddressInfo } from 'node:net'
import type { ViteDevServer } from 'vite'
import { createServer } from 'vite'
import { afterAll, beforeAll, expect, it } from 'vitest'
import Icons from '../src'

let server: ViteDevServer
let origin: string
let requestId: string

beforeAll(async () => {
  server = await createServer({
    configFile: false,
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '127.0.0.1', port: 0, preTransformRequests: false },
    plugins: [{
      name: 'icon-import-fixture',
      resolveId: id => id === '/entry.js' ? id : null,
      load: id => id === '/entry.js' ? `import icon from ${JSON.stringify(requestId)}; console.log(icon)` : null,
    }, Icons.vite({
      compiler: { extension: 'tsx', compiler: svg => `export default ${JSON.stringify(svg)}` },
      customCollections: { test: { icon: '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>' } },
    })],
  })
  await server.listen()
  origin = `http://127.0.0.1:${(server.httpServer!.address() as AddressInfo).port}`
})

afterAll(async () => {
  await server?.close()
})

it.each([
  '?width=1.5em',
  '?width=1%2E5em',
  '?width=1.5em&width=2.5em',
])('preserves HTTP query semantics and module identity for %s', async (query) => {
  const id = `~icons/test/icon.tsx${query}`
  requestId = id
  const entry = server.moduleGraph.getModuleById('/entry.js')
  if (entry)
    server.moduleGraph.invalidateModule(entry)
  const entryCode = await (await fetch(`${origin}/entry.js?t=${Date.now()}`)).text()
  const requestUrl = entryCode.match(/"([^"\n]*\/@id\/[^"\n]+)"/)?.[1]
  expect(requestUrl).toBeTruthy()
  const url = new URL(requestUrl!, origin).href
  const response = await fetch(url)
  const code = await response.text()
  expect(response.status).toBe(200)
  const params = new URLSearchParams(query)
  const width = params.getAll('width').at(-1)!
  expect(code).toContain(width)
  if (params.has('title'))
    expect(code).toContain(params.get('title'))
  const resolved = await server.pluginContainer.resolveId(id)
  expect(resolved).toBeTruthy()
  const module = server.moduleGraph.getModuleById(resolved!.id)!
  expect(module).toBeTruthy()
  server.moduleGraph.invalidateModule(module)
  const refreshed = await fetch(`${url}&t=${Date.now()}`)
  expect(refreshed.status).toBe(200)
  expect(await refreshed.text()).toContain(width)
  expect(server.moduleGraph.getModuleById(resolved!.id)).toBe(module)
})
