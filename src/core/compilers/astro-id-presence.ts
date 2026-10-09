const RE_OPEN = /<([a-z][\w:.-]*)(?=[\t\n\r />])/iy
const RE_ID = /[\t\n\r ]id[\t\n\r ]*=/y

/** A permissive gate: do not require well-formed XML from icons without IDs. */
export function hasSvgId(source: string): boolean {
  let cursor = 0
  while (cursor < source.length) {
    cursor = source.indexOf('<', cursor)
    if (cursor === -1)
      return false
    const terminator = source.startsWith('<!--', cursor) ? '-->' : source.startsWith('<![CDATA[', cursor) ? ']]>' : source.startsWith('<?', cursor) ? '?>' : ''
    if (terminator) {
      const end = source.indexOf(terminator, cursor + 2)
      if (end === -1)
        return false
      cursor = end + terminator.length
      continue
    }
    RE_OPEN.lastIndex = cursor
    const tag = RE_OPEN.exec(source)
    if (!tag) {
      cursor++
      continue
    }
    cursor = RE_OPEN.lastIndex
    let quote = ''
    while (cursor < source.length) {
      const character = source[cursor]
      if (quote) {
        if (character === quote)
          quote = ''
      }
      else {
        RE_ID.lastIndex = cursor
        if (RE_ID.test(source))
          return true
        if (character === '"' || character === '\'') {
          quote = character
        }
        else if (character === '>') {
          cursor++
          break
        }
      }
      cursor++
    }
    if (source[cursor - 2] !== '/' && (tag[1].toLowerCase() === 'style' || tag[1].toLowerCase() === 'script')) {
      const closing = source.toLowerCase().indexOf(`</${tag[1].toLowerCase()}`, cursor)
      if (closing === -1)
        return false
      cursor = closing
    }
  }
  return false
}
