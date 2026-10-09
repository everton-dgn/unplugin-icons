import type { UnpluginOptions } from 'unplugin'
import { describe, expect, it, vi } from 'vitest'
import Icons from '../../src'

const svg = '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'
function plugin(framework: 'vite' | 'rollup', compiler: any = 'vue-vapor') {
  const instance = Icons.raw({ compiler, customCollections: { test: { icon: svg } } }, { framework }) as UnpluginOptions
  const load = instance.load as (id: string, options?: { ssr?: boolean }) => Promise<{ code: string }>
  return (id: string, ssr?: boolean) => load.call({ addWatchFile: vi.fn() }, id, { ssr })
}

it('keeps client and server output independent in the same plugin instance', async () => {
  const load = plugin('vite')
  const client = await load('~icons/test/icon')
  const server = await load('~icons/test/icon', true)
  expect(server.code).toContain('ssrRender')
  expect(server.code).not.toContain('defineVaporComponent')
  expect(client.code).toContain('defineVaporComponent')
  expect(await load('~icons/test/icon', false)).toEqual(client)
  expect(await load('~icons/test/icon', true)).toEqual(server)
})

it('ignores the Vite SSR argument on other adapters', async () => {
  expect((await plugin('rollup')('~icons/test/icon', true)).code).toContain('defineVaporComponent')
})

describe.each(['~icons-raw/test/icon?raw=false', 'virtual:icons-raw/test/icon', '~icons/test/icon?raw=true'])('raw request %s', (id) => {
  it('does not select the SSR compiler', async () => {
    const load = plugin('vite')
    expect(await load(id, true)).toEqual(await load(id, false))
    expect((await load(id, true)).code).not.toContain('ssrRender')
  })
})

it('does not forward SSR to a custom compiler', async () => {
  const compiler = vi.fn(() => 'export default "custom"')
  const load = plugin('vite', { compiler, extension: 'js' })
  await load('~icons/test/icon', false)
  await load('~icons/test/icon', true)
  expect(compiler.mock.calls[0]).toHaveLength(4)
  expect(compiler.mock.calls[1]).toEqual(compiler.mock.calls[0])
})

it('preserves the Vite load filter with SSR options', async () => {
  const compiler = vi.fn(() => 'export default "custom"')
  const instance = Icons.vite({ compiler: { compiler } }) as any
  expect(await instance.load.call({ addWatchFile: vi.fn() }, '/unrelated.js', { ssr: true })).toBeUndefined()
  expect(compiler).not.toHaveBeenCalled()
})
