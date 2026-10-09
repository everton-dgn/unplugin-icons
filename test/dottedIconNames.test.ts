import type { AddressInfo } from 'node:net'
import type { UnpluginOptions } from 'unplugin'
import type { Options } from '../src/types'
import { Buffer } from 'node:buffer'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, transform } from 'esbuild'
import { createServer } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import Icons from '../src'
import { resolveIconsPath } from '../src/core/loader'
import { FileSystemIconLoader } from '../src/loaders'

const fixture = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'

async function resolveAndLoad(plugin: UnpluginOptions, request: string) {
  const resolveHook = plugin.resolveId!
  const resolve = typeof resolveHook === 'function' ? resolveHook : resolveHook.handler
  const id = await resolve.call({} as any, request, undefined, { isEntry: false })
  expect(typeof id).toBe('string')
  expect(await resolve.call({} as any, id as string, undefined, { isEntry: false })).toBe(id)
  const loadHook = plugin.load!
  const load = typeof loadHook === 'function' ? loadHook : loadHook.handler
  const result = await load.call({ addWatchFile: vi.fn() } as any, id as string)
  expect(result).toMatchObject({ code: expect.any(String) })
  return (result as { code: string }).code
}

describe('dotted icon names', () => {
  it.each(['calendar.circle.fill', 'my.file.01', 'my-file-01'])('preserves %s in the path parser', (name) => {
    expect(resolveIconsPath(`~icons/test/${name}?title=a.b`)).toEqual({
      collection: 'test',
      icon: name,
      query: { title: 'a.b' },
    })
  })

  it.each(['none', 'raw', 'vue3', 'vue-vapor', 'svelte', 'solid', 'jsx', 'qwik', 'astro', 'marko', 'ember', 'web-components'] as const)('loads the full name with %s', async (compiler) => {
    const loader = vi.fn((name: string) => name === 'calendar.circle.fill' ? fixture : undefined)
    const plugin = Icons.raw({ compiler, customCollections: { test: loader } }, { framework: 'vite' }) as UnpluginOptions
    const code = await resolveAndLoad(plugin, '~icons/test/calendar.circle.fill?width=2em')
    expect(code).toContain('2em')
    expect(loader).toHaveBeenCalledExactlyOnceWith('calendar.circle.fill')
    if (compiler === 'jsx' || compiler === 'qwik' || compiler === 'solid' || compiler === 'web-components')
      await expect(transform(code, { loader: 'tsx' })).resolves.toMatchObject({ code: expect.any(String) })
  })

  it.each(['json', 'txt', 'css'])('bundles raw icon names ending in .%s as JavaScript', async (extension) => {
    for (const request of [`~icons-raw/test/document.${extension}`, `~icons/test/document.${extension}?raw=true`]) {
      const result = await build({
        stdin: { contents: `import svg from ${JSON.stringify(request)}; export default svg` },
        bundle: true,
        write: false,
        format: 'esm',
        logLevel: 'silent',
        plugins: [Icons.esbuild({ compiler: 'jsx', customCollections: { test: { [`document.${extension}`]: fixture } } })],
      })
      const module = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles![0].text).toString('base64')}`)
      expect(module.default).toMatch(/^<svg\b/)
      expect(module.default).toContain('<path')
    }
  })

  it.each(['svg', 'jsx', 'tsx', 'svelte', 'astro', 'marko'])('retains explicit .%s imports', async (extension) => {
    const loader = vi.fn((name: string) => name === 'calendar.circle.fill' ? fixture : undefined)
    const plugin = Icons.raw({ compiler: 'none', customCollections: { test: loader } }, { framework: 'rollup' }) as UnpluginOptions
    expect(await resolveAndLoad(plugin, `~icons/test/calendar.circle.fill.${extension}`)).toContain('<path')
    expect(loader).toHaveBeenCalledExactlyOnceWith('calendar.circle.fill')
  })

  it.each(['~icons-raw/', 'virtual:icons-raw/'])('preserves the full name and raw query semantics with %s', async (prefix) => {
    const loader = vi.fn((name: string) => name === 'my.file.01' ? fixture : undefined)
    const plugin = Icons.raw({ compiler: 'jsx', customCollections: { test: loader } }, { framework: 'vite' }) as UnpluginOptions
    const code = await resolveAndLoad(plugin, `${prefix}test/my.file.01?raw=false&width=1.5em&title=a%252Eb`)
    const svg = JSON.parse(code.replace(/^export default /, '').replace(/;$/, ''))
    expect(svg).toContain('width="1.5em"')
    expect(svg).toContain('title="a%2Eb"')
    expect(loader).toHaveBeenCalledExactlyOnceWith('my.file.01')
  })

  describe.each(['rollup', 'vite', 'webpack', 'rspack', 'esbuild', 'bun'] as const)('%s custom extensions', (framework) => {
    it.each(['custom.ts', '.custom.ts'])('removes the complete configured suffix %s', async (extension) => {
      for (const suffix of ['', '.custom.ts']) {
        for (const query of ['', '?raw=false&width=1.5em&width=2em', '?raw=true&width=2em']) {
          const loader = vi.fn((name: string) => name === 'calendar.circle.fill' ? fixture : undefined)
          const compiler: Options['compiler'] = {
            extension,
            compiler: svg => `export default ${JSON.stringify(svg)}`,
          }
          const plugin = Icons.raw({ compiler, customCollections: { test: loader } }, { framework } as any) as UnpluginOptions
          const code = await resolveAndLoad(plugin, `~icons/test/calendar.circle.fill${suffix}${query}`)
          expect(code).toContain('<path')
          if (query)
            expect(code).toContain('2em')
          expect(loader).toHaveBeenCalledExactlyOnceWith('calendar.circle.fill')
        }
      }
    })
  })

  it('loads a physical SVG whose filename contains several dots', async () => {
    const root = fileURLToPath(new URL('../', import.meta.url))
    // Retain each fixture under ignored node_modules for inspection.
    const directory = mkdtempSync(join(root, 'node_modules/.dotted-icons-'))
    writeFileSync(join(directory, 'calendar.circle.fill.svg'), fixture)
    const plugin = Icons.raw({
      compiler: 'raw',
      customCollections: { local: FileSystemIconLoader(directory) },
    }, { framework: 'vite' }) as UnpluginOptions
    expect(await resolveAndLoad(plugin, '~icons-raw/local/calendar.circle.fill')).toContain('<path')
  })

  it('serves a dotted Vue icon through the Vite HTTP import pipeline', async () => {
    const server = await createServer({
      root: fileURLToPath(new URL('../examples/vite-vue3', import.meta.url)),
      configFile: false,
      logLevel: 'silent',
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { host: '127.0.0.1', port: 0, preTransformRequests: false },
      plugins: [{
        name: 'dotted-icon-entry',
        resolveId: id => id === '/dotted-entry.js' ? id : null,
        load: id => id === '/dotted-entry.js'
          ? 'import Icon from "~icons/test/calendar.circle.fill"; export default Icon'
          : null,
      }, Icons.vite({ compiler: 'vue3', customCollections: { test: { 'calendar.circle.fill': fixture } } })],
    })
    try {
      await server.listen()
      const origin = `http://127.0.0.1:${(server.httpServer!.address() as AddressInfo).port}`
      const entry = await (await fetch(`${origin}/dotted-entry.js`)).text()
      const url = entry.match(/"([^"\n]*\/@id\/[^"\n]+)"/)?.[1]
      expect(url).toBeTruthy()
      const response = await fetch(new URL(url!, origin))
      const code = await response.text()
      expect(response.status, code).toBe(200)
      expect(code).toContain('test-calendar.circle.fill')
      expect(code).toMatch(/\/node_modules\/.*vue/)
    }
    finally {
      await server.close()
    }
  })
})
