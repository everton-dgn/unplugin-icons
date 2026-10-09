import type { Edit } from './astro-id-xml'
import { attributeReferences, cssReferences, URL_ATTRIBUTES } from './astro-id-css'
import { SCOPE_ATTRIBUTE } from './astro-id-scope'
import { applyEdits, decodeXml, svgElements, xmlReferences } from './astro-id-xml'

const ANIMATION_ELEMENTS = new Set(['animate', 'set', 'animateColor', 'animateTransform', 'animateMotion'])
const ANIMATION_VALUES = new Set(['from', 'to', 'by', 'values'])

/** Compile references to placeholders; the emitted frontmatter allocates actual IDs. */
export function prepareAstroIds(template: string, values: Record<string, string>) {
  const elements = svgElements(template)
  const ids = new Map<string, string>()
  let marker = '__unplugin_icon_id_'
  while (template.includes(marker) || Object.values(values).some(value => value.includes(marker)))
    marker += '_'
  function define(id: string) {
    if (!id || ids.has(id))
      throw new Error(`Empty or duplicate SVG ID: ${id}`)
    ids.set(id, `${marker}${ids.size}__`)
  }
  if (values.id !== undefined)
    define(values.id)
  for (const element of elements) {
    for (const attr of element.attributes) {
      if (attr.name === 'id')
        define(decodeXml(template.slice(attr.start, attr.end)))
    }
  }
  if (!ids.size)
    return null
  const scope = elements.some(element => element.name === 'style') ? `${marker}scope__` : undefined

  function references(name: string, value: string): Edit[] {
    if (name === 'id')
      return [{ start: 0, end: value.length, value: ids.get(value)! }]
    if (name === 'style')
      return cssReferences(value, ids, 'declarationList')
    if (URL_ATTRIBUTES.has(name))
      return cssReferences(value, ids, 'value')
    return attributeReferences(name, value, ids)
  }
  const edits: Edit[] = []
  for (const element of elements) {
    if (element.name.toLowerCase() === 'script' || element.attributes.some(attr => attr.name.toLowerCase().startsWith('on')))
      throw new Error('SVG scripts and event handlers cannot reference private instance IDs')
    for (const attr of element.attributes) {
      const source = template.slice(attr.start, attr.end)
      const target = ANIMATION_ELEMENTS.has(element.name) && ANIMATION_VALUES.has(attr.name)
        ? element.attributes.find(attr => attr.name === 'attributeName')
        : undefined
      const name = target ? decodeXml(template.slice(target.start, target.end)) : attr.name
      if (target && name === 'id')
        throw new Error('Animating private SVG IDs is unsupported')
      const value = xmlReferences(source, (value) => {
        if (target && attr.name === 'values') {
          let offset = 0
          return value.split(';').flatMap((part) => {
            const edits = references(name, part).map(edit => ({ ...edit, start: edit.start + offset, end: edit.end + offset }))
            offset += part.length + 1
            return edits
          })
        }
        return references(name, value)
      }, attr.quote)
      if (value !== source)
        edits.push({ start: attr.start, end: attr.end, value })
    }
    if (element.name === 'style' && element.close !== undefined) {
      const source = template.slice(element.end, element.close)
      const value = xmlReferences(source, value => cssReferences(value, ids, 'stylesheet', scope), '', true)
      edits.push({ start: element.end, end: element.close, value })
    }
  }
  if (Object.keys(values).some(name => name.toLowerCase().startsWith('on')))
    throw new Error('SVG event handlers cannot reference private instance IDs')

  function expression(source: string): string {
    const parts: string[] = []
    let cursor = 0
    const tokens = [...ids.values(), ...(scope ? [scope] : [])]
    while (cursor < source.length) {
      let next = source.length
      let index = -1
      tokens.forEach((token, i) => {
        const at = source.indexOf(token, cursor)
        if (at !== -1 && at < next) {
          next = at
          index = i
        }
      })
      parts.push(JSON.stringify(source.slice(cursor, next)))
      if (index === -1)
        break
      parts.push(index === ids.size ? '__iconPrefix' : `__iconIds[${index}]`)
      cursor = next + tokens[index].length
    }
    return parts.join(' + ') || '""'
  }
  const defaults = `{${Object.entries(values).map(([name, value]) => `[${JSON.stringify(name)}]:${expression(applyEdits(value, references(name, value)))}`).join(',')}}`
  const root = elements[0]
  const content = root.close === undefined ? '' : applyEdits(template.slice(root.end, root.close), edits.map(edit => ({ ...edit, start: edit.start - root.end, end: edit.end - root.end })))
  const script = `const __iconPrefix = 'uicons-' + crypto.randomUUID();\nconst __iconIds = ${JSON.stringify([...ids.keys()])}.map((_, index) => __iconPrefix + '-' + index);\nconst __iconBody = ${expression(content)};`
  return {
    defaults,
    script,
    scopeAttribute: scope ? SCOPE_ATTRIBUTE : undefined,
    template: root.close === undefined ? template : `${template.slice(0, root.end)}<Fragment set:html={__iconBody} />${template.slice(root.close)}`,
  }
}
