import type { CssNode } from 'css-tree'
import type { Edit } from './astro-id-xml'
import { ident } from 'css-tree/utils'
import walk from 'css-tree/walker'

export const SCOPE_ATTRIBUTE = 'data-unplugin-icons-scope'
const LEGACY_PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter'])
const RE_KEYFRAMES = /^(?:-\w+-)?keyframes$/i

/** Restrict selector targets, not ancestors; :where adds no specificity. */
export function scopeSelectors(ast: CssNode, scope: string): Edit[] {
  const edits: Edit[] = []
  const root = `[${SCOPE_ATTRIBUTE}="${scope}"]`
  const filter = `:where(${root},${root} *)`
  let keyframes = 0
  walk(ast, {
    enter(node: CssNode) {
      if (node.type === 'Atrule' && RE_KEYFRAMES.test(ident.decode(node.name)))
        keyframes++
      if (node.type !== 'Rule' || keyframes || node.prelude.type !== 'SelectorList')
        return
      node.prelude.children.forEach((selector) => {
        if (selector.type !== 'Selector' || !selector.loc)
          throw new Error('Unsupported CSS selector while scoping SVG styles')
        let position = selector.loc.end.offset
        for (const child of selector.children) {
          if (child.type === 'PseudoElementSelector' || (child.type === 'PseudoClassSelector' && LEGACY_PSEUDO_ELEMENTS.has(ident.decode(child.name).toLowerCase()))) {
            position = child.loc!.start.offset
            break
          }
        }
        edits.push({ start: position, end: position, value: filter })
      })
    },
    leave(node: CssNode) {
      if (node.type === 'Atrule' && RE_KEYFRAMES.test(ident.decode(node.name)))
        keyframes--
    },
  })
  return edits
}
