import type { prepareAstroIds } from './astro-ids'
import type { Compiler } from './types'
import { hasSvgId } from './astro-id-presence'
import { extractAstroSvgRoot } from './astro-svg'

export const AstroCompiler = (async (svg: string, collection, icon) => {
  let root: ReturnType<typeof extractAstroSvgRoot>
  let ids: ReturnType<typeof prepareAstroIds> = null
  try {
    root = extractAstroSvgRoot(svg)
    if (root.values.id !== undefined || hasSvgId(root.template)) {
      const { prepareAstroIds } = await import('./astro-ids')
      ids = prepareAstroIds(root.template, root.values)
    }
  }
  catch (cause) {
    throw new Error(`Failed to compile icon \`${collection}/${icon}\` for Astro`, { cause })
  }
  const { defaults, template } = ids || root
  return `---
  interface Props extends astroHTML.JSX.SVGAttributes {};
  ${ids?.script || ''}
  const defaults = ${defaults};
  const props = { ...defaults, ...Astro.props${ids?.scopeAttribute ? `, [${JSON.stringify(ids.scopeAttribute)}]: __iconPrefix` : ''} };
---
${template}`
}) as Compiler
