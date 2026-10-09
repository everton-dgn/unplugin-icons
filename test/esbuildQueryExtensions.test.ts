import type { Options } from '../src/types'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'
import Icons from '../src/esbuild'

const svg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'
const query = '?width=24px&height=2em&title=icon.jsx%3F&width=32px'

async function bundle(compiler: Options['compiler'], query: string) {
  return build({
    stdin: { contents: `import icon from '~icons/test/icon${query}'; console.log(icon)` },
    bundle: true,
    write: false,
    outdir: 'out',
    metafile: true,
    logLevel: 'silent',
    external: ['react', '@builder.io/qwik'],
    plugins: [Icons({ compiler, jsx: 'react', customCollections: { test: { icon: svg } } })],
  })
}

describe.each(['jsx', 'qwik', 'solid'] as const)('esbuild %s compiler', (compiler) => {
  it.each([query, `${query}&raw=false`, `${query}&raw=true`])('builds and preserves %s', async (query) => {
    const result = await bundle(compiler, query)
    const extension = query.endsWith('raw=true') ? '' : compiler === 'solid' ? '.tsx' : '.jsx'

    expect(Object.keys(result.metafile!.inputs)).toContain(`unplugin-icons:~icons/test/icon${extension}${query}`)
    expect(result.outputFiles![0].text).toContain('32px')
    expect(result.outputFiles![0].text).toContain('2em')
    if (query.endsWith('raw=true'))
      expect(result.outputFiles![0].text).toContain('<svg')
  })
})

describe('esbuild custom compiler extensions', () => {
  const compilers = [
    ['js', 'export default "javascript"'],
    ['mjs', 'export default "javascript"'],
    ['cjs', 'module.exports = "javascript"'],
    ['jsx', 'export default <svg />'],
    ['ts', 'const icon: string = "typescript"; export default icon'],
    ['mts', 'const icon: string = "typescript"; export default icon'],
    ['cts', 'const icon: string = "typescript"; export default icon'],
    ['tsx', 'const icon: unknown = <svg />; export default icon'],
    ['css', 'svg { color: red }'],
    ['less', 'svg { color: red }'],
    ['stylus', 'svg { color: red }'],
    ['scss', 'svg { color: red }'],
    ['sass', 'svg { color: red }'],
    ['txt', 'plain text icon'],
    ['custom', 'export default "custom"'],
    ['.TSX', 'const icon: unknown = <svg />; export default icon'],
  ] as const

  it.each(compilers)('preserves the %s loader with and without queries', async (extension, code) => {
    for (const suffix of ['', query, `${query}&raw=false`, `${query}&raw=true`]) {
      const result = await bundle({ extension, compiler: () => code }, suffix)
      const resolvedExtension = suffix.endsWith('raw=true') ? '' : `.${extension.replace(/^\./, '')}`

      expect(Object.keys(result.metafile!.inputs)).toContain(`unplugin-icons:~icons/test/icon${resolvedExtension}${suffix}`)
      if (suffix.endsWith('raw=true'))
        expect(result.outputFiles![0].text).toContain('<svg')
    }
  })

  it('preserves the JSON loader diagnostic for inline sourcemaps', async () => {
    // unplugin appends a sourcemap comment, which JSON rejects even without a
    // query. Preserve the JSON loader rather than silently interpreting it as JS.
    for (const suffix of ['', query, `${query}&raw=false`]) {
      await expect(bundle({ extension: 'json', compiler: () => '{ "icon": "json" }' }, suffix))
        .rejects
        .toThrow('JSON does not support comments')
    }
    const result = await bundle({ extension: 'json', compiler: () => '{ "icon": "json" }' }, `${query}&raw=true`)
    expect(result.outputFiles![0].text).toContain('<svg')
  })
})
