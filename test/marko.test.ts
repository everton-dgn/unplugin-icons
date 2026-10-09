import { describe, expect, it } from 'vitest'
import { MarkoCompiler } from '../src/core/compilers/marko'
import { resolveOptions } from '../src/core/options'

const cases = [
  ['dollar before a digit', '$1', '$1'],
  ['tab escape', String.raw`C:\temp`, String.raw`C:\\temp`],
  ['newline escape', String.raw`C:\new`, String.raw`C:\\new`],
  ['unicode escape', String.raw`\u0041`, String.raw`\\u0041`],
  ['backtick', '`', '`'],
  ['interpolation', `\${globalThis.svgExecuted = true}`, `\${globalThis.svgExecuted = true}`],
  ['multiple backslashes', String.raw`\\server\\share`, String.raw`\\\\server\\\\share`],
  ['trailing backslash', 'end\\', 'end\\\\'],
]

describe('marko SVG literals', () => {
  it('preserves CDATA bytes in style and text', async () => {
    const { config } = await resolveOptions({ compiler: 'marko' })
    const literal = `$1 | C:\\temp | \` | \${globalThis.svgExecuted = true} | &#92; &amp;`
    const body = `<style><![CDATA[/* ${literal} */]]></style><text><![CDATA[${literal}]]></text>`
    const result = await MarkoCompiler(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`, 'test', 'cdata', config)
    expect(result).toContain(JSON.stringify(body))
  })

  it.each(cases)('preserves %s in root attributes and body', async (_name, value, root) => {
    const { config } = await resolveOptions({ compiler: 'marko' })
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" data-value="${value}"><text data-value="${value}">${value}</text></svg>`
    const result = await MarkoCompiler(svg, 'test', 'literal', config)
    expect(result).toBe(`<svg xmlns="http://www.w3.org/2000/svg" data-value="${root}" ...input>$!{${JSON.stringify(`<text data-value="${value}">${value}</text>`)}}</svg>`)
  })

  it('preserves SVG namespaces, references, existing entities and the input spread', async () => {
    const { config } = await resolveOptions({ compiler: 'marko' })
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><use xlink:href="#shape"/><title>&lt;&amp;&quot;</title></svg>'
    const result = await MarkoCompiler(svg, 'test', 'namespaces', config)
    expect(result).toBe(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" ...input>$!{${JSON.stringify('<use xlink:href="#shape"/><title>&lt;&amp;&quot;</title>')}}</svg>`)
  })
})
