import { describe, expect, it } from 'vitest'
import { AstroCompiler } from '../../src/core/compilers/astro'

const bodies = [
  '<path hidden/>',
  '<foreignObject><div>a<br>b</div></foreignObject>',
  '<!-- id="fake" --><path hidden/>',
  '<!-- <path id="fake"/> --><foreignObject><div>a<br>b</div></foreignObject>',
  '<text>id="fake"</text><path hidden/>',
  '<![CDATA[<path id="fake"/>]]><path hidden/>',
  '<foreignObject><div title=\'id="fake"\'>a<br>b</div></foreignObject>',
  '<path data-note=\' > id="fake"\' data-id="fake" hidden/>',
  '<style>.a{content:\'<path id="fake"/>\'}</style><path hidden/>',
]

describe('astro SVG without ID definitions', () => {
  it('still finds a definition after a self-closing style element', async () => {
    const code = await AstroCompiler('<svg><style/><path id="real"/></svg>', 'fixture', 'ids', {} as any)
    expect(code).toContain('crypto.randomUUID')
  })
  it.each(bodies)('preserves previously accepted body syntax: %s', async (body) => {
    const code = await AstroCompiler(`<svg>${body}</svg>`, 'fixture', 'no-ids', {} as any)
    expect(code.split('---\n')[2]).toBe(`<svg {...props}>${body}</svg>`)
    expect(code).not.toContain('crypto.randomUUID')
    expect(code).not.toContain('set:html')
  })

  it('retains contextual strict errors when an actual ID activates rewriting', async () => {
    await expect(Promise.resolve().then(() => AstroCompiler('<svg><path id="real" hidden/></svg>', 'fixture', 'ids', {} as any))).rejects.toMatchObject({
      message: 'Failed to compile icon `fixture/ids` for Astro',
      cause: expect.objectContaining({ message: 'Invalid SVG attribute while locating IDs' }),
    })
  })
})
