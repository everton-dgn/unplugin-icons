import type { UnpluginOptions } from 'unplugin'
import { transformWithEsbuild } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import Icons from '../src'
import { resolveIconsPath } from '../src/core/loader'

describe.each(['jsx', 'qwik', 'solid'] as const)('vite decimal queries with %s', (compiler) => {
  it.each([
    '?width=1.5em',
    '?width=1.5em&raw=false',
    '?width=1.5em&raw=true',
    '?title=a.b%2Ec%252Ed&width=1.5em&raw=false&width=2.5em',
    '?width=1%2E5em&title=a%252Eb&raw',
  ])('preserves the semantics of %s', async (query) => {
    const plugin = Icons.raw({
      compiler,
      jsx: 'react',
      customCollections: { test: { icon: '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>' } },
    }, { framework: 'vite' }) as UnpluginOptions
    const resolve = plugin.resolveId as (id: string) => string | Promise<string>
    const load = plugin.load as (id: string) => Promise<{ code: string }>
    const request = `~icons/test/icon${query}`
    const id = await resolve(request)
    const resolvedQuery = id.slice(id.indexOf('?'))

    expect([...new URLSearchParams(resolvedQuery)]).toEqual([...new URLSearchParams(query)])
    expect(resolveIconsPath(id)).toEqual(resolveIconsPath(request))
    expect(await resolve(id)).toBe(id)
    const { code } = await load.call({ addWatchFile: vi.fn() }, id)
    if (resolveIconsPath(request)?.query.raw === 'true') {
      expect(id).toBe(request)
      expect(code).toContain('<svg')
    }
    else {
      // Exercise Vite's real inference instead of supplying a loader ourselves.
      const transformed = await transformWithEsbuild(code, id, { jsx: 'preserve' })
      expect(transformed.code).toContain(query.includes('2.5em') ? '2.5em' : '1.5em')
    }
  })
})

it.each(['ts', 'mts', 'tsx', 'jsx'])('handles decimal queries with custom %s output', async (extension) => {
  const code = extension === 'jsx' ? 'export default <svg />' : 'const icon: string = "test"; export default icon'
  const plugin = Icons.raw({
    compiler: { extension, compiler: () => code },
  }, { framework: 'vite' }) as UnpluginOptions
  const resolve = plugin.resolveId as (id: string) => string | Promise<string>
  const id = await resolve('~icons/test/icon?width=1.5em')
  expect([...new URLSearchParams(id.slice(id.indexOf('?')))]).toEqual([['width', '1.5em']])
  expect(await resolve(id)).toBe(id)
  const result = await transformWithEsbuild(code, id)
  expect(result.code).toContain('export default')
})
