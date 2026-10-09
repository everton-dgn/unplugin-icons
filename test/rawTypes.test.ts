import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, it } from 'vitest'

it.each([false, true])('types raw compiler imports as strings with skipLibCheck=%s', (skipLibCheck) => {
  const program = ts.createProgram({
    rootNames: [
      fileURLToPath(new URL('../types/raw.d.ts', import.meta.url)),
      fileURLToPath(new URL('./fixtures/types/raw.ts', import.meta.url)),
    ],
    options: {
      noEmit: true,
      strict: true,
      skipLibCheck,
      types: [],
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  })

  const diagnostics = ts.getPreEmitDiagnostics(program).map(diagnostic => ({
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  }))
  expect(diagnostics).toEqual([])
})
