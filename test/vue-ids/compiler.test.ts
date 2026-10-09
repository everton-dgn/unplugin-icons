import { expect, it } from 'vitest'
import { Vue3Compiler } from '../../src/core/compilers/vue3'
import { VueVaporCompiler, VueVaporSSRCompiler } from '../../src/core/compilers/vue-vapor'

it.each([Vue3Compiler, VueVaporCompiler, VueVaporSSRCompiler])('omits useId for SVGs without rewritten references (%#)', async (compile) => {
  for (const attributes of ['', 'id="literal"']) {
    const code = await compile(`<svg viewBox="0 0 24 24"><path ${attributes} d="M0 0"/></svg>`, 'test', 'plain', {} as any)
    expect(code).not.toContain('useId')
    expect(code).not.toContain('idMap')
    if (attributes)
      expect(code).toContain('literal')
  }
})
