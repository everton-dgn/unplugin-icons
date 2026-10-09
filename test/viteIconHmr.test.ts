import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { expect, it, vi } from 'vitest'
import Icons from '../src'
import { FileSystemHMRIconLoader } from '../src/loaders'

async function fixture(extension?: string) {
  // Retain fixtures for inspection; keep generated files out of the source tree.
  const root = mkdtempSync(fileURLToPath(new URL('../node_modules/.vite-icon-hmr-', import.meta.url)))
  const file = join(root, 'icon.svg')
  writeFileSync(file, '<svg viewBox="0 0 24 24"><path id="before" d="M0 0"/></svg>')
  const plugin = Icons.vite({
    compiler: {
      extension,
      compiler: svg => `export default ${JSON.stringify(svg)}; if (import.meta.hot) import.meta.hot.accept()`,
    },
    customCollections: FileSystemHMRIconLoader(root, 'test'),
  }) as any
  const server = await createServer({
    root,
    configFile: false,
    envFile: false,
    logLevel: 'silent',
    cacheDir: join(root, 'vite-cache'),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { watch: null, middlewareMode: true },
    plugins: [plugin],
  })
  return { file, root, plugin, server }
}

it.each([undefined, 'tsx'])('refreshes every icon variant with compiler extension %s', async (extension) => {
  const { file, root, plugin, server } = await fixture(extension)
  const requests = ['~icons/test/icon', '~icons/test/icon?width=2em', 'virtual:icons/test/icon?width=3em']
  const updates = vi.spyOn(plugin, 'handleHotUpdate')
  try {
    const modules = []
    for (const request of requests) {
      expect((await server.transformRequest(request))?.code).toContain('before')
      const resolved = await server.pluginContainer.resolveId(request)
      modules.push(server.moduleGraph.getModuleById(resolved!.id)!)
    }
    copyFileSync(file, join(root, 'icon.before.svg'))
    writeFileSync(file, '<svg viewBox="0 0 24 24"><circle id="after" r="8"/></svg>')
    // Await Vite's actual change handlers without relying on OS watcher timing.
    for (const listener of server.watcher.listeners('change'))
      await listener(file)
    expect(updates).toHaveBeenCalled()
    const selected = await updates.mock.results[0].value
    expect(new Set(selected)).toEqual(new Set(modules))
    expect(selected).toHaveLength(modules.length)
    for (const request of requests) {
      const code = (await server.transformRequest(request))?.code
      expect(code).toContain('after')
      expect(code).not.toContain('before')
    }
  }
  finally {
    updates.mockRestore()
    await server.close()
  }
})

it('preserves selected modules, prunes removed IDs and ignores unrelated files', async () => {
  const { file, root, plugin, server } = await fixture('tsx')
  try {
    const request = '~icons/test/icon?width=2em'
    await server.transformRequest(request)
    const resolved = await server.pluginContainer.resolveId(request)
    const module = server.moduleGraph.getModuleById(resolved!.id)!
    const context = { file, server, modules: [module, module] }
    expect(await plugin.handleHotUpdate(context)).toEqual([module])
    expect(await plugin.handleHotUpdate({ ...context, file: join(root, 'unrelated.svg') })).toBeUndefined()
    const lookup = vi.spyOn(server.moduleGraph, 'getModuleById').mockReturnValue(undefined)
    try {
      expect(await plugin.handleHotUpdate({ ...context, modules: [] })).toBeUndefined()
      expect(lookup).toHaveBeenCalledWith(resolved!.id)
      lookup.mockClear()
      expect(await plugin.handleHotUpdate({ ...context, modules: [] })).toBeUndefined()
      expect(lookup).not.toHaveBeenCalledWith(resolved!.id)
    }
    finally {
      lookup.mockRestore()
    }
  }
  finally {
    await server.close()
  }
})
