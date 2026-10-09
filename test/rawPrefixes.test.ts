import type { AddressInfo } from 'node:net'
import type { UnpluginOptions } from 'unplugin'
import { Buffer } from 'node:buffer'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { createServer } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import Icons from '../src'
import { isIconPath, normalizeIconPath, resolveIconsPath } from '../src/core/loader'

const svg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'
const prefixes = ['~icons-raw/', 'virtual:icons-raw/']
const queries = [
  '',
  '?raw&width=1.5em',
  '?width=1.5em&raw&height=2em',
  '?width=1.5em&raw',
  '?raw=false&width=1.5em',
  '?width=1.5em&raw=true&raw=false',
  '?raw=false&raw=true&width=1.5em',
  '?%72aw=false&width=1%2E5em&title=a%3Fb',
  '?width=2em&width=1.5em&title=a%252Eb',
]

function hooks(plugin: UnpluginOptions) {
  return {
    resolve: plugin.resolveId as (id: string) => string,
    load: plugin.load as (this: any, id: string) => Promise<{ code: string }>,
  }
}

describe.each(prefixes)('raw prefix %s', (prefix) => {
  it.each(queries)('forces raw output and preserves query semantics: %s', async (query) => {
    const componentCompiler = vi.fn(() => 'export default "component"')
    const plugin = Icons.raw({
      compiler: { extension: 'tsx', compiler: componentCompiler },
      customCollections: { test: { icon: svg } },
    }, { framework: 'vite' }) as UnpluginOptions
    const { resolve, load } = hooks(plugin)
    const request = `${prefix}test/icon${query}`
    expect(isIconPath(request)).toBe(true)
    expect(normalizeIconPath(request)).toBe(`/~icons-raw/test/icon${query}`)
    const id = resolve(request)
    expect(id).toBe(`\0unplugin-icons-raw/${Buffer.from(`~icons-raw/test/icon${query}`).toString('base64url')}/icon.js`)
    expect(resolve(id)).toBe(id)
    expect(resolveIconsPath(request)?.query.raw).toBe('true')
    const { code } = await load.call({ addWatchFile: vi.fn() }, id)
    const result = JSON.parse(code.replace(/^export default /, ''))
    expect(result).toContain('<svg')
    expect(result).not.toContain('raw=')
    const params = new URLSearchParams(query)
    if (params.has('width'))
      expect(result).toContain(`width="${params.getAll('width').at(-1)}"`)
    if (params.has('title'))
      expect(result).toContain(`title="${params.get('title')}"`)
    expect(componentCompiler).not.toHaveBeenCalled()
    const oldId = resolve('~icons/test/icon?raw=false')
    expect(oldId).toBe('~icons/test/icon.tsx?raw=false')
    await load.call({ addWatchFile: vi.fn() }, oldId)
    expect(componentCompiler).toHaveBeenCalledOnce()
  })

  it('bundles with the real esbuild adapter', async () => {
    const result = await build({
      stdin: { contents: `import svg from '${prefix}test/icon?width=1.5em&raw=false'; console.log(svg)` },
      bundle: true,
      write: false,
      logLevel: 'silent',
      plugins: [Icons.esbuild({ compiler: 'solid', customCollections: { test: { icon: svg } } })],
    })
    expect(result.outputFiles![0].text).toContain('<svg')
    expect(result.outputFiles![0].text).toContain('1.5em')
    expect(result.outputFiles![0].text).not.toContain('solid-js')
  })

  it.each(['webpack', 'rspack'] as const)('loads through %s hooks', async (framework) => {
    const plugin = Icons.raw({
      compiler: 'solid',
      customCollections: { test: { icon: svg } },
    }, { framework } as any) as UnpluginOptions
    const { resolve, load } = hooks(plugin)
    const id = resolve(`${prefix}test/icon?width=1.5em&raw=false`)
    expect(plugin.loadInclude!(id)).toBe(true)
    const { code } = await load.call({ addWatchFile: vi.fn() }, id)
    expect(JSON.parse(code.replace(/^export default /, ''))).toContain('width="1.5em"')
  })
})

it('serves both raw aliases through HTTP without double-decoding query values', async () => {
  const server = await createServer({
    configFile: false,
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '127.0.0.1', port: 0, preTransformRequests: false },
    plugins: [{
      name: 'raw-prefix-http-importer',
      resolveId: id => id === '/raw-entry.js' ? id : null,
      load: id => id === '/raw-entry.js'
        ? prefixes.map((prefix, i) => `import svg${i} from '${prefix}test/icon?raw=false&title=a%252Eb&width=1.5em'; console.log(svg${i})`).join('\n')
        : null,
    }, Icons.vite({
      compiler: 'solid',
      customCollections: { test: { icon: svg } },
    })],
  })
  try {
    await server.listen()
    const origin = `http://127.0.0.1:${(server.httpServer!.address() as AddressInfo).port}`
    const entry = await fetch(`${origin}/raw-entry.js`)
    expect(entry.status).toBe(200)
    const imports = Array.from((await entry.text()).matchAll(/from\s*"([^"]+)"/g), match => match[1])
    expect(imports).toHaveLength(2)
    for (const url of imports) {
      expect(url).toContain('/@id/__x00__unplugin-icons-raw/')
      const response = await fetch(new URL(url, origin))
      expect(response.status).toBe(200)
      const code = await response.text()
      const literal = code.match(/export default ("(?:[^"\\]|\\.)*")/)?.[1]
      expect(literal).toBeTruthy()
      const content = JSON.parse(literal!)
      expect(content).toContain('<svg')
      expect(content).toContain('title="a%2Eb"')
      expect(content).toContain('width="1.5em"')
      expect(content).not.toContain('raw=')
    }
  }
  finally {
    await server.close()
  }
})

it.each([undefined, 'tsx'])('preserves mixed Vite HMR consumers with compiler extension %s', async (extension) => {
  let currentSvg = svg
  const file = fileURLToPath(new URL('./fixtures/raw-prefix.svg', import.meta.url))
  const plugin = Icons.vite({
    compiler: { extension, compiler: svg => `export default () => ${JSON.stringify(svg)}` },
    customCollections: {
      test: {
        __iconifyCustomHmrIconLoader: true,
        name: 'test',
        iconLoader: () => currentSvg,
        resolveModuleIconName: (path: string) => path === file ? 'icon' : undefined,
        resolveSVGIconPath: () => file,
      },
    },
  }) as any
  const addWatchFile = vi.fn()
  const load = plugin.load
  plugin.load = function (this: any, id: string) {
    return load.call({ addWatchFile: (path: string) => {
      addWatchFile(path)
      this.addWatchFile(path)
    } }, id)
  }
  const server = await createServer({
    configFile: false,
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { watch: null },
    plugins: [plugin],
  })
  try {
    const legacyIds = ['~icons/test/icon', '~icons/test/icon?width=3em']
    const legacyModules = []
    for (const id of legacyIds) {
      expect((await server.transformRequest(id))?.code).toContain('<svg')
      const resolved = await server.pluginContainer.resolveId(id)
      legacyModules.push(server.moduleGraph.getModuleById(resolved!.id))
    }
    await server.transformRequest(`/@fs${file}?import`)
    const directModule = (await server.moduleGraph.getModuleByUrl(`/@fs${file}?import`))!
    expect(directModule).toBeTruthy()
    const selectedModules = [legacyModules[1], directModule]
    const beforeRaw = await plugin.handleHotUpdate({ file, server, modules: selectedModules })
    // Keep the legacy hook's exact selection/undefined behavior without raw IDs.
    expect(beforeRaw).toEqual(extension ? undefined : [legacyModules[0]])
    const ids = ['~icons-raw/test/icon', '~icons-raw/test/icon?width=1.5em&raw=false', 'virtual:icons-raw/test/icon?width=2em']
    const modules = []
    for (const id of ids) {
      const result = await server.transformRequest(id)
      expect(result?.code).toContain('<svg')
      const resolved = await server.pluginContainer.resolveId(id)
      modules.push(server.moduleGraph.getModuleById(resolved!.id))
    }
    expect(addWatchFile).toHaveBeenCalledWith(file)
    const updated = await plugin.handleHotUpdate({ file, server, modules: selectedModules })
    const knownModules = extension ? [] : [legacyModules[0]]
    expect(new Set(updated.map((module: { id: string }) => module.id)))
      .toEqual(new Set([...modules, ...selectedModules, ...knownModules].map(module => module!.id)))
    currentSvg = '<svg viewBox="0 0 24 24"><circle r="8"/></svg>'
    for (const module of updated)
      server.moduleGraph.invalidateModule(module)
    for (const id of [...ids, legacyIds[1]])
      expect((await server.transformRequest(id))?.code).toContain('<circle')
  }
  finally {
    await server.close()
  }
})
