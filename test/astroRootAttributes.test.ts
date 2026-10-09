import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { AstroCompiler } from '../src/core/compilers/astro'
import { generateComponentFromPath } from '../src/core/loader'
import { resolveOptions } from '../src/core/options'

async function compile(svg: string, input: Record<string, unknown> = {}) {
  const code = await AstroCompiler(svg, 'fixture', 'sample', {} as any)
  return execute(code, input)
}

function execute(code: string, input: Record<string, unknown> = {}) {
  const [, frontmatter, template] = code.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)!
  const { outputText } = ts.transpileModule(frontmatter, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  })
  const props = runInNewContext(`${outputText}\nprops`, { Astro: { props: input } })
  return { props, template }
}

describe('astro SVG root attributes', () => {
  it.each([
    '<!DOCTYPE svg>',
    '<!DOCTYPE svg SYSTEM "https://example.invalid/a>b.dtd">',
    '<!DOCTYPE svg PUBLIC "SVG > public" \'https://example.invalid/a>b.dtd\'>',
    '<!DOCTYPE svg [<!ELEMENT svg ANY><!ENTITY label "a > b [ ]"><!-- ]> <svg --><?test ]> ?>]>',
  ])('omits the complete DOCTYPE returned by the loader transform: %s', async (declaration) => {
    const before = '<?xml version="1.0"?>\n<!-- before declaration -->\n'
    const after = '\n<!-- before root -->\n'
    const prefix = `${before}${declaration}${after}`
    const body = '\n<title>&amp; café ` \\</title>\r\n<path />\n'
    const { config } = await resolveOptions({
      compiler: 'astro',
      customCollections: { fixture: { sample: `<svg fill="red">${body}</svg>` } },
      transform: svg => `${prefix}${svg}`,
    })
    const result = await generateComponentFromPath('~icons/fixture/sample', config)
    const { props, template } = execute(result!.code, { fill: 'blue' })
    expect(props.fill).toBe('blue')
    expect(template).toBe(`${before}${after}<svg {...props}>${body}</svg>`)
  })

  it.each(['<!DOCTYPE svg', '<!DOCTYPE svg SYSTEM "unterminated>', '<!DOCTYPE svg [<!ELEMENT svg ANY>>'])('rejects an unterminated declaration: %s', async (prefix) => {
    await expect(compile(`${prefix}<svg/>`)).rejects.toMatchObject({
      message: 'Failed to compile icon `fixture/sample` for Astro',
      cause: expect.objectContaining({ message: 'Invalid SVG root for Astro' }),
    })
  })

  it('keeps DTD entity references as data without expanding them', async () => {
    const prefix = '<!DOCTYPE svg [<!ENTITY label "expanded"><!ENTITY external SYSTEM "https://example.invalid/entity">]>'
    const { props, template } = await compile(`${prefix}<svg data-label="&label; &external;">&label;</svg>`)
    expect(props['data-label']).toBe('&label; &external;')
    expect(template).toBe('<svg {...props}>&label;</svg>')
  })

  it('identifies the icon and preserves the parser error as its cause', async () => {
    await expect(compile('<svg width="24>')).rejects.toMatchObject({
      message: 'Failed to compile icon `fixture/sample` for Astro',
      cause: expect.objectContaining({ message: 'Invalid SVG opening tag for Astro' }),
    })
  })

  it.each([
    ['query', '?fill=blue', undefined, 'blue'],
    ['customizer', '', 'green', 'green'],
    ['query over customizer', '?fill=blue', 'green', 'blue'],
  ])('preserves loader customization from %s before consumer props', async (_, query, customized, expected) => {
    const { config } = await resolveOptions({
      compiler: 'astro',
      customCollections: { fixture: { sample: '<svg viewBox="0 0 24 24" fill="red"><path /></svg>' } },
      iconCustomizer: (_collection, _icon, props) => {
        if (customized)
          props.fill = customized
      },
    })
    const result = await generateComponentFromPath(`~icons/fixture/sample${query}`, config)
    expect(result).not.toBeNull()
    expect(execute(result!.code).props.fill).toBe(expected)
    expect(execute(result!.code, { fill: 'purple' }).props.fill).toBe('purple')
    expect(execute(result!.code, { fill: null }).props.fill).toBeNull()
    expect(execute(result!.code, { fill: undefined }).props.fill).toBeUndefined()
  })

  it('merges consumer overrides before rendering one spread instead of duplicate attributes', async () => {
    const { props, template } = await compile('<svg width="24" height="32" fill="red" viewBox="0 0 24 32"><path /></svg>', {
      'width': 99,
      'height': 98,
      'fill': 'blue',
      'aria-label': 'A & B <safe> "quoted"',
    })
    expect(props).toEqual({ 'width': 99, 'height': 98, 'fill': 'blue', 'viewBox': '0 0 24 32', 'aria-label': 'A & B <safe> "quoted"' })
    expect(template).toBe('<svg {...props}><path /></svg>')
  })

  it('keeps omitted defaults but does not replace explicit null, undefined, false or empty props', async () => {
    const svg = '<svg width="24" height="32" fill="red" />'
    expect((await compile(svg)).props).toEqual({ width: '24', height: '32', fill: 'red' })
    for (const value of [null, undefined, false, '']) {
      const { props } = await compile(svg, { width: value, fill: value })
      expect(Object.hasOwn(props, 'width')).toBe(true)
      expect(props.width).toBe(value)
      expect(props.fill).toBe(value)
      expect(props.height).toBe('32')
    }
  })

  it('reads both quote styles, greater-than signs, namespaces and Unicode', async () => {
    const { props, template } = await compile(`<svg data-note='2 > 1 "sim"' viewBox='0 0 24 24' xmlns:xlink="http://www.w3.org/1999/xlink" xml:space='preserve' data-ação='café 😀'/>`)
    expect(props).toEqual({ 'data-note': '2 > 1 "sim"', 'viewBox': '0 0 24 24', 'xmlns:xlink': 'http://www.w3.org/1999/xlink', 'xml:space': 'preserve', 'data-ação': 'café 😀' })
    expect(template).toBe('<svg {...props}/>')
  })

  it('decodes the five XML entities and numeric references exactly once', async () => {
    const { props } = await compile('<svg data-value="&lt;&gt;&amp;&quot;&apos; &#65;&#x1F600; &amp;lt; &amp;#65;"/>')
    expect(props['data-value']).toBe('<>&"\' A😀 &lt; &#65;')
  })

  it('normalizes literal XML attribute whitespace before decoding character references', async () => {
    const { props } = await compile('<svg data-value="a\r\nb\tc\nd&#10;e&#9;f"/>')
    expect(props['data-value']).toBe('a b c d\ne\tf')
  })

  it('serializes defaults as data, including prototype keys, dollars, backslashes and backticks', async () => {
    // eslint-disable-next-line no-template-curly-in-string -- Literal SVG data must not execute.
    const dangerous = '${globalThis.injected = true} ` \\ " café'
    const { props } = await compile(`<svg __proto__="literal" constructor="safe" data-value='${dangerous}'/>`)
    expect(Object.hasOwn(props, '__proto__')).toBe(true)
    expect(Object.getOwnPropertyDescriptor(props, '__proto__')?.value).toBe('literal')
    expect(props.constructor).toBe('safe')
    expect(props['data-value']).toBe(dangerous)
    expect(Object.keys(props)).toEqual(['__proto__', 'constructor', 'data-value'])
  })

  it('preserves prefix, body and suffix bytes without parsing descendants', async () => {
    const prefix = '<?xml version="1.0"?>\n<!-- <svg fake="yes"> -->\n'
    // eslint-disable-next-line no-template-curly-in-string -- The compiler must preserve body bytes.
    const body = '\n  <title>&amp; &lt; ${literal} ` \\</title>\r\n<g xml:space="preserve"><use xlink:href="#shape" /></g>\n'
    const { template } = await compile(`${prefix}<svg width='24'>${body}</svg>\n`)
    expect(template).toBe(`${prefix}<svg {...props}>${body}</svg>\n`)
  })

  it.each(['<svg></svg>', '<svg/>', '<svg />'])('accepts an attribute-free root: %s', async (svg) => {
    const { props, template } = await compile(svg)
    expect(props).toEqual({})
    expect(template).toMatch(/^<svg \{\.\.\.props\}\/?>(?:<\/svg>)?$/)
  })
})
