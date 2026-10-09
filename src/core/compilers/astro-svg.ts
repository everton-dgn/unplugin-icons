const RE_ROOT = /^(?:\s|<\?[\s\S]*?\?>|<!--[\s\S]*?-->)*<svg(?=[\t\n\r />])/
const RE_ATTRIBUTE = /[\t\n\r ]+([^\s"'<>/=]+)[\t\n\r ]*=[\t\n\r ]*(?:"([^"]*)"|'([^']*)')/y
const RE_END = /[\t\n\r ]*(\/?>)/y
const RE_WHITESPACE = /\r\n|[\t\n\r]/g
const RE_ENTITY = /&(amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g
const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' }

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
  const root = RE_ROOT.exec(svg)
  if (!root)
    throw new Error('Invalid SVG root for Astro')

  const attributes: string[] = []
  const names = new Set<string>()
  const rootEnd = root[0].length
  let cursor = rootEnd
  while (cursor < svg.length) {
    RE_END.lastIndex = cursor
    const end = RE_END.exec(svg)
    if (end) {
      return {
        defaults: `{${attributes.join(',')}}`,
        template: `${svg.slice(0, rootEnd)} {...props}${end[1]}${svg.slice(RE_END.lastIndex)}`,
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
