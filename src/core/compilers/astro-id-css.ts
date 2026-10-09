import type { CssNode } from 'css-tree'
import type { Edit } from './astro-id-xml'
import parse from 'css-tree/parser'
import { ident } from 'css-tree/utils'
import walk from 'css-tree/walker'
import { scopeSelectors } from './astro-id-scope'

const RE_WORD = /\S+/g
const RE_URL_LEADING_SPACE = /^[\t\n\f\r ]*/
const RE_URL_TRAILING_SPACE = /[\t\n\f\r ]*$/
export const ID_LIST_ATTRIBUTES = new Set(['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-flowto', 'aria-activedescendant', 'aria-details', 'aria-errormessage'])
export const URL_ATTRIBUTES = new Set(['fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker', 'marker-start', 'marker-mid', 'marker-end', 'cursor', 'color-profile'])

function fragmentId(fragment: string, ids: Map<string, string>) {
  fragment = fragment.replace(RE_URL_LEADING_SPACE, '').replace(RE_URL_TRAILING_SPACE, '')
  if (!fragment.startsWith('#'))
    return undefined
  const literal = fragment.slice(1)
  if (ids.has(literal))
    return ids.get(literal)
  try {
    return ids.get(decodeURIComponent(literal))
  }
  catch {
    return undefined
  }
}

export function attributeReferences(name: string, value: string, ids: Map<string, string>): Edit[] {
  const edits: Edit[] = []
  if (name === 'href' || name === 'xlink:href') {
    const id = fragmentId(value, ids)
    if (id)
      edits.push({ start: RE_URL_LEADING_SPACE.exec(value)![0].length + 1, end: value.length - RE_URL_TRAILING_SPACE.exec(value)![0].length, value: id })
  }
  else if (ID_LIST_ATTRIBUTES.has(name)) {
    for (const match of value.matchAll(RE_WORD)) {
      const id = ids.get(match[0])
      if (id)
        edits.push({ start: match.index!, end: match.index! + match[0].length, value: id })
    }
  }
  else if (name === 'begin' || name === 'end') {
    let offset = 0
    for (const item of value.split(';')) {
      const space = item.length - item.trimStart().length
      const target = item.slice(space)
      // Longest definition first: dots are legal in XML IDs.
      const id = [...ids.keys()].sort((a, b) => b.length - a.length).find(id => target.startsWith(`${id}.`))
      if (id)
        edits.push({ start: offset + space, end: offset + space + id.length, value: ids.get(id)! })
      offset += item.length + 1
    }
  }
  return edits
}

export function cssReferences(source: string, ids: Map<string, string>, context: 'stylesheet' | 'declarationList' | 'value', scope?: string): Edit[] {
  const edits: Edit[] = []
  const ast = parse(source, {
    context,
    positions: true,
    parseCustomProperty: true,
    onParseError(error) { throw error },
  })
  function replace(node: CssNode, value: string) {
    if (!node.loc)
      throw new Error('Missing CSS location for SVG ID reference')
    edits.push({ start: node.loc.start.offset, end: node.loc.end.offset, value })
  }
  walk(ast, (node) => {
    if (node.type === 'Raw')
      throw new Error('Unsupported CSS syntax while rewriting SVG IDs')
    if (node.type === 'IdSelector') {
      const id = ids.get(ident.decode(node.name))
      if (id)
        replace(node, `#${id}`)
    }
    else if (node.type === 'Url') {
      const id = fragmentId(node.value, ids)
      if (id)
        replace(node, `url(#${id})`)
    }
    else if (node.type === 'AttributeSelector' && node.value) {
      const name = ident.decode(node.name.name).replace('|', ':')
      const value = node.value.type === 'String' ? node.value.value : ident.decode(node.value.name)
      if (name === 'id' || name === 'href' || name === 'xlink:href' || name === 'style' || ID_LIST_ATTRIBUTES.has(name) || URL_ATTRIBUTES.has(name)) {
        if (node.matcher !== '=' && node.matcher !== '~=')
          throw new Error(`Unsupported SVG ID attribute selector operator: ${node.matcher}`)
        if (node.flags?.toLowerCase() === 'i')
          throw new Error('Case-insensitive SVG ID attribute selectors are unsupported')
        const changes = name === 'id' && ids.has(value)
          ? [{ start: 0, end: value.length, value: ids.get(value)! }]
          : name === 'style' || URL_ATTRIBUTES.has(name)
            ? cssReferences(value, ids, name === 'style' ? 'declarationList' : 'value')
            : attributeReferences(name, value, ids)
        if (changes.length) {
          let rewritten = value
          for (const edit of changes.reverse())
            rewritten = rewritten.slice(0, edit.start) + edit.value + rewritten.slice(edit.end)
          replace(node.value, JSON.stringify(rewritten))
        }
      }
    }
  })
  return scope && context === 'stylesheet' ? [...edits, ...scopeSelectors(ast, scope)] : edits
}
