export interface Edit { start: number, end: number, value: string }
export interface Attribute { name: string, start: number, end: number, quote: string }
export interface Element { name: string, attributes: Attribute[], start: number, end: number, close?: number }

const RE_TAG = /<(\/?)([\w:.-]+)/y
const RE_ATTRIBUTE = /\s+([^\s"'<>/=]+)\s*=\s*(["'])([\s\S]*?)\2/y
const RE_END = /\s*\/?>/y
const RE_ENTITY = /&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/y
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': '\'' }

export function applyEdits(source: string, edits: Edit[]): string {
  let end = 0
  let output = ''
  for (const edit of edits.sort((a, b) => a.start - b.start)) {
    if (edit.start < end)
      throw new Error('Overlapping SVG ID references')
    output += source.slice(end, edit.start) + edit.value
    end = edit.end
  }
  return output + source.slice(end)
}

/** Decode for analysis while retaining a map back to the original XML bytes. */
export function xmlReferences(source: string, rewrite: (value: string) => Edit[], quote = '', style = false): string {
  let value = ''
  const starts: number[] = []
  const ends: number[] = []
  const cdataContexts: boolean[] = []
  let cursor = 0
  let cdata = false
  while (cursor < source.length) {
    if (style && source.startsWith('<![CDATA[', cursor)) {
      cdata = true
      cursor += 9
      continue
    }
    if (style && source.startsWith(']]>', cursor)) {
      cdata = false
      cursor += 3
      continue
    }
    RE_ENTITY.lastIndex = cursor
    const entity = !cdata && RE_ENTITY.exec(source)?.[0]
    const decoded = entity
      ? ENTITIES[entity] ?? String.fromCodePoint(entity[2] === 'x' ? Number.parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1)))
      : source[cursor]
    for (let i = 0; i < decoded.length; i++) {
      starts.push(cursor)
      ends.push(cursor + (entity ? entity.length : 1))
      cdataContexts.push(cdata)
    }
    value += decoded
    cursor += entity ? entity.length : 1
  }
  return applyEdits(source, rewrite(value).map((edit) => {
    const start = starts[edit.start] ?? source.length
    const end = edit.start === edit.end ? start : ends[edit.end - 1]
    const original = source.slice(start, end)
    if (style && (original.includes('<![CDATA[') || original.includes(']]>')))
      throw new Error('SVG ID reference crosses a CDATA boundary')
    return {
      start,
      end,
      value: cdataContexts[edit.start]
        ? edit.value
        : edit.value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll(quote || '\0', quote === '"' ? '&quot;' : '&apos;'),
    }
  }))
}

export function decodeXml(source: string): string {
  let result = ''
  xmlReferences(source, (value) => {
    result = value
    return []
  })
  return result
}

/** Read only markup boundaries; text, comments and CDATA never define IDs. */
export function svgElements(source: string): Element[] {
  const elements: Element[] = []
  const stack: Element[] = []
  let cursor = 0
  while (cursor < source.length) {
    cursor = source.indexOf('<', cursor)
    if (cursor === -1)
      break
    const terminator = source.startsWith('<!--', cursor) ? '-->' : source.startsWith('<![CDATA[', cursor) ? ']]>' : source.startsWith('<?', cursor) ? '?>' : ''
    if (terminator) {
      const end = source.indexOf(terminator, cursor + 2)
      if (end === -1)
        throw new Error('Unterminated SVG comment, CDATA or processing instruction')
      cursor = end + terminator.length
      continue
    }
    RE_TAG.lastIndex = cursor
    const tag = RE_TAG.exec(source)
    if (!tag)
      throw new Error('Unsupported SVG markup while locating IDs')
    const element: Element = { name: tag[2], attributes: [], start: cursor, end: 0 }
    cursor = RE_TAG.lastIndex
    while (cursor < source.length) {
      // The root spread was emitted by extractAstroSvgRoot, not supplied by SVG.
      if (!elements.length && source.startsWith(' {...props}', cursor))
        cursor += ' {...props}'.length
      RE_END.lastIndex = cursor
      const end = RE_END.exec(source)
      if (end) {
        element.end = RE_END.lastIndex
        if (tag[1]) {
          const opened = stack.pop()
          if (!opened || opened.name !== element.name)
            throw new Error('Unbalanced SVG elements while locating IDs')
          opened.close = element.start
        }
        else {
          elements.push(element)
          if (!end[0].endsWith('/>'))
            stack.push(element)
        }
        cursor = element.end
        break
      }
      RE_ATTRIBUTE.lastIndex = cursor
      const attr = RE_ATTRIBUTE.exec(source)
      if (!attr)
        throw new Error('Invalid SVG attribute while locating IDs')
      const endOffset = RE_ATTRIBUTE.lastIndex - 1
      element.attributes.push({ name: attr[1], start: endOffset - attr[3].length, end: endOffset, quote: attr[2] })
      cursor = RE_ATTRIBUTE.lastIndex
    }
  }
  if (stack.length)
    throw new Error('Unclosed SVG elements while locating IDs')
  return elements
}
