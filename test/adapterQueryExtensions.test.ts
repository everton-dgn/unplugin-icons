import type { UnpluginOptions } from 'unplugin'
import { describe, expect, it, vi } from 'vitest'
import Icons from '../src'

describe.each(['webpack', 'rspack', 'rolldown'] as const)('%s virtual icon queries', (framework) => {
  it.each(['?width=1.5em&title=a%3Fb&width=2em', '?raw=false&width=1.5em', '?raw=true&width=1.5em'])('preserves %s through load', async (query) => {
    const plugin = Icons.raw({
      compiler: { extension: '.custom.ts', compiler: svg => `export default ${JSON.stringify(svg)}` },
      customCollections: { test: { icon: '<svg viewBox="0 0 24 24" />' } },
    }, { framework } as any) as UnpluginOptions
    const resolve = plugin.resolveId as (id: string) => string | Promise<string>
    const load = plugin.load as (id: string) => Promise<{ code: string }>
    const id = await resolve(`~icons/test/icon${query}`)

    if (!query.startsWith('?raw=true'))
      expect(encodeURIComponent(id)).toMatch(/\.custom\.ts$/)
    expect(await resolve(id)).toBe(id)
    expect(plugin.loadInclude!(id)).toBe(true)
    const { code } = await load.call({ addWatchFile: vi.fn() }, id)
    const svg = JSON.parse(code.replace(/^export default /, '').replace(/;$/, ''))
    expect(svg).toContain(`width="${query.includes('width=2em') ? '2em' : '1.5em'}"`)
    if (query.includes('title='))
      expect(svg).toContain('title="a?b"')
    expect(svg).not.toContain('raw=')
  })
})

it.each(['esbuild', 'bun'] as const)('%s selects loaders without query values', (framework) => {
  for (const [extension, expected] of [['jsx', 'jsx'], ['tsx', 'tsx'], ['ts', 'ts'], ['css', 'css'], ['json', 'json'], ['txt', 'text'], ['custom', 'js']]) {
    const plugin = Icons.raw({ compiler: { extension, compiler: svg => svg } }, { framework } as any) as UnpluginOptions
    const loader = plugin[framework]!.loader as (code: string, id: string) => string
    expect(loader('', `~icons/test/icon.${extension}?width=1.5em&raw=false`)).toBe(expected)
  }
})
