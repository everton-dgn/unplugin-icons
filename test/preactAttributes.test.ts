import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transform } from '@svgr/core'
import jsxPlugin from '@svgr/plugin-jsx'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { JSXCompiler } from '../src/core/compilers/jsx'

const presentationAttributes = [
  'alignment-baseline',
  'baseline-shift',
  'clip-path',
  'clip-rule',
  'color-interpolation',
  'color-interpolation-filters',
  'color-profile',
  'color-rendering',
  'dominant-baseline',
  'enable-background',
  'fill-opacity',
  'fill-rule',
  'flood-color',
  'flood-opacity',
  'font-family',
  'font-size',
  'font-size-adjust',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-weight',
  'glyph-orientation-horizontal',
  'glyph-orientation-vertical',
  'image-rendering',
  'letter-spacing',
  'lighting-color',
  'marker-end',
  'marker-mid',
  'marker-start',
  'paint-order',
  'pointer-events',
  'shape-rendering',
  'stop-color',
  'stop-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'text-anchor',
  'text-decoration',
  'text-rendering',
  'unicode-bidi',
  'vector-effect',
  'word-spacing',
  'writing-mode',
]

function evaluate(code: string, props: Record<string, unknown> = {}) {
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: 'preact',
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props })
  const exports = runInNewContext(`${outputText}\nexports`, {
    exports: {},
    require: (id: string) => {
      expect(id).toBe('preact/jsx-runtime')
      return { jsx, jsxs: jsx }
    },
  })
  return exports.default(props)
}

it('preserves SVG presentation attribute names on root and child elements', async () => {
  const attributes = presentationAttributes.map(name => `${name}="inherit"`).join(' ')
  const svg = `<svg ${attributes}><path ${attributes} d="M0 0" /></svg>`
  const code = await JSXCompiler(svg, 'test', 'icon', { jsx: 'preact' } as any)
  const element = evaluate(code)
  for (const props of [element.props, element.props.children.props]) {
    for (const name of presentationAttributes)
      expect(props[name], name).toBe('inherit')
  }
})

const svg = `<svg viewBox="0 0 24 24" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" aria-label="A &amp; B &quot;quoted&quot;" data-note="strokeWidth &lt;tag&gt;">
  <defs><linearGradient id="paint" gradientUnits="userSpaceOnUse" gradientTransform="rotate(10)"><stop stop-color="red" /></linearGradient></defs>
  <path id="shape" stroke-width="2" stroke-linecap="round" fill="url(#paint)" d="M0 0h10" />
  <use xlink:href="#shape" href="https://example.com/a.svg#shape" />
</svg>`

it('preserves case-sensitive names, namespaces, references and escaped values', async () => {
  const code = await JSXCompiler(svg, 'test', 'icon', { jsx: 'preact' } as any)
  const element = evaluate(code)
  expect(element.props).toMatchObject({
    'viewBox': '0 0 24 24',
    'xmlns:xlink': 'http://www.w3.org/1999/xlink',
    'xml:space': 'preserve',
    'aria-label': 'A & B "quoted"',
    'data-note': 'strokeWidth <tag>',
  })
  const [defs, path, use] = element.props.children
  expect(defs.props.children.props).toMatchObject({ id: 'paint', gradientUnits: 'userSpaceOnUse', gradientTransform: 'rotate(10)' })
  expect(path.props).toMatchObject({ 'id': 'shape', 'stroke-width': 2, 'stroke-linecap': 'round', 'fill': 'url(#paint)', 'd': 'M0 0h10' })
  expect(use.props).toMatchObject({ 'xlink:href': '#shape', 'href': 'https://example.com/a.svg#shape' })
})

it('leaves React output unchanged', async () => {
  const expected = await transform(svg, { plugins: [jsxPlugin], ref: true, titleProp: true }, { componentName: 'testIcon' })
  expect(await JSXCompiler(svg, 'test', 'icon', { jsx: 'react' } as any)).toBe(expected)
})

it('compiles namespaces with the Preact Babel pipeline and preserves later props', async () => {
  const exampleRequire = createRequire(new URL('../examples/vite-preact/package.json', import.meta.url))
  const presetRequire = createRequire(exampleRequire.resolve('@preact/preset-vite'))
  const { transformSync } = presetRequire('@babel/core')
  const transformJsx = presetRequire('@babel/plugin-transform-react-jsx')
  const code = await JSXCompiler(svg, 'test', 'icon', { jsx: 'preact' } as any)
  const result = transformSync(code, {
    configFile: false,
    babelrc: false,
    plugins: [[transformJsx, { runtime: 'automatic', importSource: 'preact' }]],
  })
  const element = evaluate(result.code)
  expect(element.props['xmlns:xlink']).toBe('http://www.w3.org/1999/xlink')
  expect(element.props['xml:space']).toBe('preserve')
  expect(element.props.children[2].props['xlink:href']).toBe('#shape')
  expect(evaluate(result.code, { 'xml:space': 'default' }).props['xml:space']).toBe('default')

  const values = await JSXCompiler('<svg xml:lang="first" xmlLang="later"><use xlink:href="123" /><use xlink:href="a&amp;b&quot;c" /></svg>', 'test', 'icon', { jsx: 'preact' } as any)
  const transformedValues = transformSync(values, {
    configFile: false,
    babelrc: false,
    plugins: [[transformJsx, { runtime: 'automatic', importSource: 'preact' }]],
  })
  const valueElement = evaluate(transformedValues.code)
  expect(valueElement.props['xml:lang']).toBe('later')
  expect(valueElement.props.children[0].props['xlink:href']).toBe(123)
  expect(valueElement.props.children[1].props['xlink:href']).toBe('a&b"c')
  expect(evaluate(transformedValues.code, { 'xml:lang': 'override' }).props['xml:lang']).toBe('override')
})
