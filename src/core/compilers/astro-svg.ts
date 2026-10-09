const RE_ROOT = /<svg(?=[\t\n\r />])/y
const RE_PREFIX_SPACE = /\s*/y
const RE_XML_SPACE = /[\t\n\r ]/
const RE_ATTRIBUTE = /[\t\n\r ]+([^\s"'<>/=]+)[\t\n\r ]*=[\t\n\r ]*(?:"([^"]*)"|'([^']*)')/y
const RE_END = /[\t\n\r ]*(\/?>)/y
const RE_WHITESPACE = /\r\n|[\t\n\r]/g
const RE_ENTITY = /&(amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g
const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' }

/** Omit inline DOCTYPE declarations without loading DTDs or expanding entities. */
function readRootOpening(svg: string): { rootEnd: number, opening: string } {
  let cursor = 0
  let retainedStart = 0
  let prefix = ''
  while (cursor < svg.length) {
    RE_PREFIX_SPACE.lastIndex = cursor
    RE_PREFIX_SPACE.exec(svg)
    cursor = RE_PREFIX_SPACE.lastIndex
    RE_ROOT.lastIndex = cursor
    if (RE_ROOT.test(svg))
      return { rootEnd: RE_ROOT.lastIndex, opening: prefix + svg.slice(retainedStart, RE_ROOT.lastIndex) }

    let quote = ''
    let subset = 0
    const doctype = svg.startsWith('<!DOCTYPE', cursor) && RE_XML_SPACE.test(svg[cursor + 9] ?? '')
    if (doctype) {
      prefix += svg.slice(retainedStart, cursor)
      cursor += 9
    }
    while (cursor < svg.length) {
      const character = svg[cursor]
      if (quote) {
        if (character === quote)
          quote = ''
      }
      else if (svg.startsWith('<!--', cursor) || svg.startsWith('<?', cursor)) {
        const comment = svg.startsWith('<!--', cursor)
        const closing = comment ? '-->' : '?>'
        const end = svg.indexOf(closing, cursor + (comment ? 4 : 2))
        if (end === -1)
          throw new Error('Invalid SVG root for Astro')
        cursor = end + closing.length
        if (!doctype)
          break
        continue
      }
      else if (!doctype) {
        throw new Error('Invalid SVG root for Astro')
      }
      else if (character === '"' || character === '\'') {
        quote = character
      }
      else if (character === '[') {
        subset++
      }
      else if (character === ']') {
        subset--
      }
      else if (character === '>' && subset === 0) {
        cursor++
        retainedStart = cursor
        break
      }
      cursor++
    }
  }
  throw new Error('Invalid SVG root for Astro')
}

function decodeAttribute(value: string): string {
  // Normalize literal XML whitespace first; character references keep their value.
  return value.replace(RE_WHITESPACE, ' ').replace(RE_ENTITY, (entity, name: string) => {
    if (name.startsWith('#x'))
      return String.fromCodePoint(Number.parseInt(name.slice(2), 16))
    if (name.startsWith('#'))
      return String.fromCodePoint(Number.parseInt(name.slice(1), 10))
    return entities[name] ?? entity
  })
}

/** Read the SVG opening tag, including duplicate attributes prepended by the loader. */
export function extractAstroSvgRoot(svg: string): { defaults: string, template: string } {
  const { rootEnd, opening } = readRootOpening(svg)
  const attributes: string[] = []
  const names = new Set<string>()
  let cursor = rootEnd
  while (cursor < svg.length) {
    RE_END.lastIndex = cursor
    const end = RE_END.exec(svg)
    if (end) {
      return {
        defaults: `{${attributes.join(',')}}`,
        template: `${opening} {...props}${end[1]}${svg.slice(RE_END.lastIndex)}`,
      }
    }

    RE_ATTRIBUTE.lastIndex = cursor
    const attribute = RE_ATTRIBUTE.exec(svg)
    if (!attribute)
      break
    // Iconify prepends query/customizer attributes; the first occurrence wins.
    if (!names.has(attribute[1])) {
      names.add(attribute[1])
      const name = JSON.stringify(attribute[1])
      const value = JSON.stringify(decodeAttribute(attribute[2] ?? attribute[3]))
      // Computed keys also treat __proto__ as an ordinary own property.
      attributes.push(`[${name}]:${value}`)
    }
    cursor = RE_ATTRIBUTE.lastIndex
  }
  throw new Error('Invalid SVG opening tag for Astro')
}
