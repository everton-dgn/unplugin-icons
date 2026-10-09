import type { UnpluginOptions } from 'unplugin'
import type { Options } from '../src/types'
import { compile } from 'svelte/compiler'
import { describe, expect, it, vi } from 'vitest'
import Icons from '../src'
import { resolveIconsPath } from '../src/core/loader'

const fixture = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'

function createPlugin(compiler: Options['compiler']) {
  return Icons.raw({
    compiler,
    customCollections: { test: { icon: fixture } },
  }, { framework: 'vite' }) as UnpluginOptions
}

async function resolveId(plugin: UnpluginOptions, id: string) {
  const hook = plugin.resolveId!
  const handler = typeof hook === 'function' ? hook : hook.handler
  return handler.call({} as any, id, undefined, { isEntry: false })
}

describe('compiler extensions with icon queries', () => {
  it.each([
    ['svelte', 'svelte'],
    ['solid', 'tsx'],
    ['jsx', 'jsx'],
    ['qwik', 'jsx'],
    ['astro', 'astro'],
    ['marko', 'marko'],
  ] as const)('places the %s extension before the query', async (compiler, extension) => {
    const plugin = createPlugin(compiler)
    const id = await resolveId(plugin, 'virtual:icons/test/icon?width=24px&height=24px')

    expect(id).toBe(`~icons/test/icon.${extension}?width=24px&height=24px`)
    expect(resolveIconsPath(id as string)).toEqual({
      collection: 'test',
      icon: 'icon',
      query: { width: '24px', height: '24px' },
    })
    expect(await resolveId(plugin, id as string)).toBe(id)
    expect(await resolveId(plugin, '~icons/test/icon')).toBe(`~icons/test/icon.${extension}`)
  })

  it.each(['~icons/', '/~icons/', 'virtual:icons/', 'virtual/icons/'])('normalizes %s without changing query values', async (prefix) => {
    const plugin = createPlugin('svelte')
    const query = '?title=icon.svelte%3F&width=2em&width=3em'

    expect(await resolveId(plugin, `${prefix}test/icon.svelte${query}`))
      .toBe(`~icons/test/icon.svelte${query}`)
  })

  it.each(['custom', '.custom'])('supports custom compiler extension %s', async (extension) => {
    const plugin = createPlugin({ extension, compiler: svg => svg })

    expect(await resolveId(plugin, '~icons/test/icon?height=2em'))
      .toBe('~icons/test/icon.custom?height=2em')
  })

  it.each(['', '?raw', '?raw=true', '?width=2em&raw', '?raw&width=2em'])('preserves raw imports: %s', async (query) => {
    const plugin = createPlugin(query ? 'svelte' : 'raw')

    expect(await resolveId(plugin, `~icons/test/icon${query}`))
      .toBe(`~icons/test/icon${query}`)
  })

  it('keeps the compiler extension when raw is disabled', async () => {
    expect(await resolveId(createPlugin('svelte'), '~icons/test/icon?raw=false&height=2em'))
      .toBe('~icons/test/icon.svelte?raw=false&height=2em')
  })

  it('preserves compilers without an extension and ignores unrelated imports', async () => {
    for (const compiler of ['vue3', { compiler: (svg: string) => svg }] as const) {
      const plugin = createPlugin(compiler)
      expect(await resolveId(plugin, '~icons/test/icon?height=2em')).toBe('~icons/test/icon?height=2em')
      expect(await resolveId(plugin, './component.svelte?raw')).toBeNull()
    }
  })

  it('loads a Svelte component with unmodified dimensions', async () => {
    const plugin = createPlugin('svelte')
    const id = await resolveId(plugin, '~icons/test/icon?width=24px&height=24px')
    const hook = plugin.load!
    const handler = typeof hook === 'function' ? hook : hook.handler
    const result = await handler.call({ addWatchFile: vi.fn() } as any, id as string)

    expect(result).toMatchObject({ code: expect.any(String) })
    const { code } = result as { code: string }
    expect(code).toContain('width="24px"')
    expect(code).toContain('height="24px"')
    expect(() => compile(code, { filename: (id as string).split('?')[0] })).not.toThrow()
  })
})
