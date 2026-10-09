import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { generateComponent } from '../src/core/loader'
import { resolveOptions } from '../src/core/options'
import { body, collections } from './fixtures/custom-collections'

describe('custom collection loaders', () => {
  it.each(Object.keys(collections))('renders the existing %s loader behavior', async (collection) => {
    const { config } = await resolveOptions({ compiler: 'none', customCollections: collections })
    const svg = await generateComponent({ collection, icon: 'sample', query: {} }, config)
    expect(svg).toContain('viewBox="0 0 24 24"')
    expect(svg).toContain(body)
  })

  it('accepts supported public types and rejects invalid loader results', () => {
    const fixture = fileURLToPath(new URL('./fixtures/custom-collections.ts', import.meta.url))
    const program = ts.createProgram([fixture], {
      noEmit: true,
      strict: true,
      skipLibCheck: false,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: [],
    })
    const diagnostics = ts.getPreEmitDiagnostics(program).map(diagnostic =>
      `TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
    )
    expect(diagnostics).toEqual([])
  })
})
