import { expect, it, vi } from 'vitest'
import { importPeerModule } from '../../src/core/compilers/peer'
import { VueVaporSSRCompiler } from '../../src/core/compilers/vue-vapor'

vi.mock('../../src/core/compilers/peer', () => ({ importPeerModule: vi.fn() }))

it('explains the SSR peer dependency without hiding the original import failure', async () => {
  const cause = new Error('Cannot find @vue/compiler-sfc')
  vi.mocked(importPeerModule).mockRejectedValueOnce(cause)
  await expect(VueVaporSSRCompiler('<svg/>', 'test', 'icon', {} as any)).rejects.toMatchObject({
    message: 'Failed to load @vue/compiler-sfc or vue/compiler-sfc for Vue Vapor SSR',
    cause,
  })
  expect(importPeerModule).toHaveBeenCalledWith('@vue/compiler-sfc', 'vue/compiler-sfc')
})
