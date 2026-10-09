import { webcrypto } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { AstroCompiler } from '../../src/core/compilers/astro'

async function render(css: string, input: Record<string, unknown> = {}) {
  const code = await AstroCompiler(`<svg><path id="shape" class="shared"/><style>${css}</style></svg>`, 'fixture', 'scope', {} as any)
  const source = code.split('---')[1]
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return runInNewContext(`${js};({ props, body: __iconBody })`, { Astro: { props: input }, crypto: webcrypto })
}

const attribute = 'data-unplugin-icons-scope'
function filter(scope: string) {
  return `:where([${attribute}="${scope}"],[${attribute}="${scope}"] *)`
}

describe('astro instance CSS scope', () => {
  it('restricts class selectors to a private per-instance root or descendant', async () => {
    const first = await render('.shared{fill:red}')
    const second = await render('.shared{fill:blue}')
    expect(first.props[attribute]).toBeTruthy()
    expect(first.props[attribute]).not.toBe(second.props[attribute])
    expect(first.body).toContain(`.shared${filter(first.props[attribute])}{fill:red}`)
    expect(second.body).toContain(`.shared${filter(second.props[attribute])}{fill:blue}`)
  })

  it('filters the target of root, descendant and sibling selectors without a prefix', async () => {
    const result = await render('svg,svg rect,.a + .b{fill:red}')
    const scoped = filter(result.props[attribute])
    expect(result.body).toContain(`svg${scoped},svg rect${scoped},.a + .b${scoped}{fill:red}`)
  })

  it('inserts the zero-specificity filter before pseudo-elements', async () => {
    const result = await render('.shared::before,svg:after,.shared::before:hover{color:red}')
    const scoped = filter(result.props[attribute])
    expect(result.body).toContain(`.shared${scoped}::before,svg${scoped}:after,.shared${scoped}::before:hover`)
  })

  it('scopes conditional rules and leaves keyframe steps and animation names intact', async () => {
    const css = '@media all{.shared{animation:spin 1s}}@keyframes spin{from{opacity:0}50%{opacity:.5}to{opacity:1}}@-webkit-keyframes other{0%,100%{opacity:1}}'
    const result = await render(css)
    expect(result.body).toContain(`@media all{.shared${filter(result.props[attribute])}{animation:spin 1s}}`)
    expect(result.body).toContain('@keyframes spin{from{opacity:0}50%{opacity:.5}to{opacity:1}}')
    expect(result.body).toContain('@-webkit-keyframes other{0%,100%{opacity:1}}')
  })

  it('does not change inner functional selectors, declarations, strings or comments', async () => {
    const result = await render('svg:is(.a,.b):not(.c):has(rect){content:".shared";color:red}/* .shared */')
    expect(result.body).toContain(`svg:is(.a,.b):not(.c):has(rect)${filter(result.props[attribute])}{content:".shared";color:red}/* .shared */`)
  })

  it('preserves consumer props and reserves only the private scope attribute', async () => {
    const result = await render('.shared{fill:red}', { id: 'consumer', class: 'consumer', fill: null, width: undefined, [attribute]: 'spoofed' })
    expect(result.props.id).toBe('consumer')
    expect(result.props.class).toBe('consumer')
    expect(result.props.fill).toBeNull()
    expect(result.props.width).toBeUndefined()
    expect(result.props[attribute]).not.toBe('spoofed')
    expect(Object.keys(result.props).filter(key => key === attribute)).toHaveLength(1)
  })
})
