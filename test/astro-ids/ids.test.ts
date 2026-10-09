import { webcrypto } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { AstroCompiler } from '../../src/core/compilers/astro'

async function render(svg: string, input: Record<string, unknown> = {}) {
  const code = await AstroCompiler(svg, 'fixture', 'ids', {} as any)
  return execute(code, input)
}

function execute(code: string, input: Record<string, unknown> = {}) {
  const [, source, template] = code.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)!
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const context = { Astro: { props: input }, crypto: webcrypto }
  const fragment = template.match(/<Fragment set:html=\{([^}]+)\}\s*\/>/)
  const { props, body } = runInNewContext(`${js};({ props, body: ${fragment ? fragment[1] : JSON.stringify(template)} })`, context)
  return { props, body, code }
}

function scopeFilter(props: Record<string, string>) {
  const scope = `[data-unplugin-icons-scope="${props['data-unplugin-icons-scope']}"]`
  return `:where(${scope},${scope} *)`
}

describe('astro private instance IDs', () => {
  it('allocates IDs during every render and rewrites only references to definitions', async () => {
    const svg = '<svg><defs><linearGradient id="red"/></defs><path id=\'shape\' fill="red" stroke="url(#red)"/><use href="#shape" xlink:href="#outside"/></svg>'
    const first = await render(svg)
    const second = execute(first.code)
    expect(first.body).not.toContain('id="red"')
    expect(first.body).not.toBe(second.body)
    const id = first.body.match(/linearGradient id="([^"]+)"/)![1]
    expect(first.body).toContain(`url(#${id})`)
    expect(first.body).toContain('fill="red"')
    expect(first.body).toContain('xlink:href="#outside"')
    expect(first.code).not.toContain('node:crypto')
  })

  it('updates CSS selectors, URLs, attribute selectors, ARIA lists and SMIL', async () => {
    const svg = `<svg aria-labelledby="label outside"><title id="label">red</title><path id="red"/><style>#red,[id="red"] { fill:#red; --paint:url('#red'); content:"#red" } @media all { #red:hover { stroke:url(#red) } }</style><use aria-describedby="label outside" href="#red"/><animate begin="red.click; red.end+1s; outside.click" end="red.repeat(2)"/></svg>`
    const result = await render(svg)
    const id = result.body.match(/path id="([^"]+)"/)![1]
    const label = result.body.match(/title id="([^"]+)"/)![1]
    expect(result.props['aria-labelledby']).toBe(`${label} outside`)
    expect(result.body).toContain(`#${id}`)
    expect(result.body).toContain(`[id="${id}"]`)
    expect(result.body).toContain('fill:#red')
    expect(result.body).toContain('content:"#red"')
    expect(result.body).toContain(`${id}.click; ${id}.end+1s; outside.click`)
    expect(result.body).toContain(`${id}.repeat(2)`)
  })

  it('preserves literal text, entities, comments, CDATA and external URLs', async () => {
    const svg = '<!DOCTYPE svg><svg><path id="x"/><!-- id="x" --><text>&lt;/style&gt; &amp; x</text><style><![CDATA[#x{fill:url(#x);content:"<literal>"}]]></style><use href="other.svg#x"/><path fill="url(https://example.invalid/x.svg#x)"/></svg>'
    const result = await render(svg)
    expect(result.body).toContain('<!-- id="x" -->')
    expect(result.body).toContain('<text>&lt;/style&gt; &amp; x</text>')
    expect(result.body).toContain('<![CDATA[')
    expect(result.body).toContain('content:"<literal>"')
    expect(result.body).toContain('href="other.svg#x"')
    expect(result.body).toContain('url(https://example.invalid/x.svg#x)')
    expect(result.code).not.toContain('<!DOCTYPE')
  })

  it('keeps consumer props final including id, null and undefined', async () => {
    const result = await render('<svg id="root" fill="red"><path id="x"/></svg>', { id: 'consumer', fill: null, width: undefined })
    expect(result.props.id).toBe('consumer')
    expect(result.props.fill).toBeNull()
    expect(result.props.width).toBeUndefined()
  })
})

it('decodes XML, CSS escapes and URL fragments for reference lookup', async () => {
  const result = await render('<svg><path id="caf&#233;:x"/><use href="#caf%C3%A9:x"/><style>#caf\\e9\\:x {fill:url("#caf\\e9\\:x");content:"caf\\e9\\:x"}</style><path style="fill:url(&quot;#café:x&quot;);--x:url(#café:x)"/></svg>')
  const id = result.body.match(/path id="([^"]+)"/)![1]
  expect(result.body).toContain(`href="#${id}"`)
  expect(result.body).toContain(`#${id}${scopeFilter(result.props)} {fill:url(#${id})`)
  expect(result.body).toContain('content:"caf\\e9\\:x"')
  expect(result.body).toContain(`style="fill:url(#${id});--x:url(#${id})"`)
})

it('keeps CDATA wrappers and encoded text in mixed style content', async () => {
  const result = await render('<svg><path id="x"/><style>/* &lt;/style&gt; */ <![CDATA[#x{fill:url(#x)}]]> #x {content:"&lt;/style&gt;"}</style><text><![CDATA[x < y]]></text></svg>')
  const id = result.body.match(/path id="([^"]+)"/)![1]
  expect(result.body).toContain(`<![CDATA[#${id}${scopeFilter(result.props)}{fill:url(#${id})}]]>`)
  expect(result.body).toContain('content:"&lt;/style&gt;"')
  expect(result.body).toContain('/* &lt;/style&gt; */')
  expect(result.body).toContain('<text><![CDATA[x < y]]></text>')
})

it('ignores fake definitions and references in text, comments and data attributes', async () => {
  const result = await render('<svg><!-- <path id="fake"/> --><path id="real" data-note="url(#real)"/><text>id="real" url(#real)</text><use href="#fake"/></svg>')
  expect(result.body).toContain('<!-- <path id="fake"/> -->')
  expect(result.body).toContain('data-note="url(#real)"')
  expect(result.body).toContain('<text>id="real" url(#real)</text>')
  expect(result.body).toContain('href="#fake"')
})

it.each([
  '<svg><path id="x"/><script>document.getElementById("x")</script></svg>',
  '<svg><path id="x" onclick="target(x)"/></svg>',
  '<svg><path id="x"/><path id="x"/></svg>',
  '<svg><path id="x"/><style>[id^="x"]{fill:red}</style></svg>',
  '<svg><path id="x"/><style>#<![CDATA[x]]>{fill:red}</style></svg>',
])('rejects unmappable references or ambiguous definitions: %s', async (svg) => {
  await expect(render(svg)).rejects.toMatchObject({ message: 'Failed to compile icon `fixture/ids` for Astro', cause: expect.any(Error) })
})

it('updates semantic attribute selectors without changing data selectors or CSS colors', async () => {
  const result = await render('<svg><path id="x" fill="url(#x)"/><style>[href="#x"],[fill="url(#x)"],[aria-labelledby~="x"] { fill:#fff } [data-note="#x"] {color:red}</style></svg>')
  const id = result.body.match(/path id="([^"]+)"/)![1]
  expect(result.body).toContain(`[href="#${id}"]`)
  expect(result.body).toContain(`[fill="url(#${id})"]`)
  expect(result.body).toContain(`[aria-labelledby~="${id}"]`)
  expect(result.body).toContain('[data-note="#x"]')
  expect(result.body).toContain('fill:#fff')
})

it('rewrites SMIL animated reference values as well as event targets', async () => {
  const result = await render('<svg><path id="x"/><animate attributeName="fill" from="url(#x)" to="url(#x)" values="url(#x);red;url(#external)"/><set attributeName="href" to="#x"/></svg>')
  const id = result.body.match(/path id="([^"]+)"/)![1]
  expect(result.body).toContain(`from="url(#${id})" to="url(#${id})" values="url(#${id});red;url(#external)"`)
  expect(result.body).toContain(`attributeName="href" to="#${id}"`)
})

it('retains surrounding URL whitespace and quoted XML entities', async () => {
  const result = await render('<svg><path id=\'a&amp;b\'/><use href="  #a&amp;b  "/><path fill="url(\' #a&amp;b \')"/></svg>')
  const id = result.body.match(/path id='([^']+)'/)![1]
  expect(result.body).toContain(`href="  #${id}  "`)
  expect(result.body).toContain(`fill="url(#${id})"`)
})

it('decodes escaped CSS string selectors and percent-encoded CSS URLs', async () => {
  const result = await render('<svg><path id="red"/><style>[id="r\\65 d"],[href="\\23 r\\65 d"] {fill:url("#r%65d");stroke:url(\\23 red)}</style></svg>')
  const id = result.body.match(/path id="([^"]+)"/)![1]
  expect(result.body).toContain(`[id="${id}"]${scopeFilter(result.props)},[href="#${id}"]${scopeFilter(result.props)}`)
  expect(result.body).toContain(`fill:url(#${id});stroke:url(#${id})`)
})

it.each([
  ['<svg><path id=""/></svg>', 'Empty or duplicate SVG ID: '],
  ['<svg><path id="x"/><path id="x"/></svg>', 'Empty or duplicate SVG ID: x'],
  ['<svg id="x"><path id="x"/></svg>', 'Empty or duplicate SVG ID: x'],
  ['<svg><path id="x"/><script>target("x")</script></svg>', 'SVG scripts and event handlers cannot reference private instance IDs'],
  ['<svg><path id="x" onclick="target(x)"/></svg>', 'SVG scripts and event handlers cannot reference private instance IDs'],
  ['<svg onload="target(x)"><path id="x"/></svg>', 'SVG event handlers cannot reference private instance IDs'],
  ['<svg><path id="red"/><style>[id="RED" i]{fill:red}</style></svg>', 'Case-insensitive SVG ID attribute selectors are unsupported'],
  ['<svg><path id="red"/><style>[href="#RED" i]{fill:red}</style></svg>', 'Case-insensitive SVG ID attribute selectors are unsupported'],
  ['<svg><path id="red"/><style>[aria-labelledby~="RED" i]{fill:red}</style></svg>', 'Case-insensitive SVG ID attribute selectors are unsupported'],
  ['<svg><path id="x"/><style>[id^="x"]{fill:red}</style></svg>', 'Unsupported SVG ID attribute selector operator: ^='],
  ['<svg><path id="x"/><style>:unknown(#x){fill:red}</style></svg>', 'Unsupported CSS syntax while rewriting SVG IDs'],
  ['<svg><path id="x"/><style>#x{--paint:{fill:url(#x)}}</style></svg>', 'Unexpected input'],
  ['<svg><path id="x"/><animate attributeName="id" to="x"/></svg>', 'Animating private SVG IDs is unsupported'],
  ['<svg><path id="x"/><style>#<![CDATA[x]]>{fill:red}</style></svg>', 'SVG ID reference crosses a CDATA boundary'],
])('reports contextual errors for unsupported input: %s', async (svg, message) => {
  await expect(render(svg)).rejects.toMatchObject({ message: 'Failed to compile icon `fixture/ids` for Astro', cause: expect.objectContaining({ message }) })
})

it('keeps explicit case-sensitive selector flags', async () => {
  const result = await render('<svg><path id="red"/><style>[id="red" s]{fill:red}</style></svg>')
  const id = result.body.match(/path id="([^"]+)"/)![1]
  expect(result.body).toContain(`[id="${id}" s]`)
})

it.each(['consumer', null, undefined])('keeps root id props final without rewriting consumer references: %s', async (id) => {
  const result = await render('<svg id="root"><use href="#root"/></svg>', { id, 'aria-labelledby': 'root' })
  expect(result.props.id).toBe(id)
  expect(result.props['aria-labelledby']).toBe('root')
  expect(result.body).toMatch(/href="#uicons-[\da-f-]+-0"/)
})

it.each([[' ', ''], ['', ' '], [' ', ' '], ['\t\n', '\r\n']])('matches local fragments with ASCII whitespace %j/%j', async (before, after) => {
  const result = await render(`<svg><path id="paint"/><use href="${before}#paint${after}"/></svg>`)
  const id = result.body.match(/path id="([^"]+)"/)![1]
  expect(result.body).toContain(`href="${before}#${id}${after}"`)
})

it('does not treat non-ASCII whitespace as a URL boundary', async () => {
  const result = await render('<svg><path id="paint"/><use href=" #paint "/></svg>')
  expect(result.body).toContain('href=" #paint "')
})

it('preserves external ARIA tokens literally in a rewritten CDATA CSS selector', async () => {
  const result = await render('<svg><title id="x">Title</title><path aria-labelledby="x outside&amp;name" d="M0 0h10v10H0z"/><style><![CDATA[[aria-labelledby="x outside&name"] { fill:red }]]></style></svg>')
  const id = result.body.match(/title id="([^"]+)"/)![1]
  expect(result.body).toContain(`aria-labelledby="${id} outside&amp;name"`)
  expect(result.body).toContain(`<![CDATA[[aria-labelledby="${id} outside&name"]`)
  expect(result.body).not.toContain(`<![CDATA[[aria-labelledby="${id} outside&amp;name"]`)
})
