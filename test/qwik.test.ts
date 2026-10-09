import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { QwikCompiler } from '../src/core/compilers/qwik'

// Use the workspace example's Qwik dependency for both SSR and the JSX runtime.
const require = createRequire(new URL('../examples/vite-qwik/package.json', import.meta.url))
const { renderToString } = require('@builder.io/qwik/server')

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" />
</svg>
`

it('renders SVG stroke attributes with Qwik', async () => {
  const code = await QwikCompiler(svg, 'tabler', 'list', {} as any)
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: '@builder.io/qwik',
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })
  const exports = runInNewContext(`${outputText}\nexports`, { exports: {}, require })
  const { html } = await renderToString(exports.default({}), {
    containerTagName: 'div',
    manifest: { symbols: {}, mapping: {}, bundles: {} },
  })

  expect(html).toContain('<svg')
  expect(html).toContain('<path')
  expect(html).toContain('stroke-width="2"')
  expect(html).toContain('stroke-linecap="round"')
  expect(html).toContain('stroke-linejoin="round"')
  expect(html).not.toMatch(/strokeWidth|strokeLinecap|strokeLinejoin/)
})
