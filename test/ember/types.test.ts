import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('types both icon prefixes as SVG Ember components', () => {
  const declaration = fileURLToPath(new URL('../../types/ember.d.ts', import.meta.url))
  const consumer = fileURLToPath(new URL('./consumer.ts', import.meta.url))
  const example = fileURLToPath(new URL('../../examples/vite-ember/consumer.ts', import.meta.url))
  const options: ts.CompilerOptions = {
    noEmit: true,
    strict: true,
    skipLibCheck: false,
    types: [],
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  }
  const host = ts.createCompilerHost(options)
  // Resolve against the example's real Glint installation.
  host.resolveModuleNames = (names, containingFile) => names.map(name => ts.resolveModuleName(
    name,
    name === '@glint/template' ? example : containingFile,
    options,
    host,
  ).resolvedModule)
  const program = ts.createProgram([declaration, consumer], options, host)
  expect(ts.getPreEmitDiagnostics(program).map(diagnostic => ({
    file: diagnostic.file?.fileName,
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  }))).toEqual([])
})
