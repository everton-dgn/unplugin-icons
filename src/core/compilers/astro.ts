import type { Compiler } from './types'
import { extractAstroSvgRoot } from './astro-svg'

export const AstroCompiler = ((svg: string, collection, icon) => {
  let root: ReturnType<typeof extractAstroSvgRoot>
  try {
    root = extractAstroSvgRoot(svg)
  }
  catch (cause) {
    throw new Error(`Failed to compile icon \`${collection}/${icon}\` for Astro`, { cause })
  }
  const { defaults, template } = root
  return `---
  interface Props extends astroHTML.JSX.SVGAttributes {};
  const defaults = ${defaults};
  const props = { ...defaults, ...Astro.props };
---
${template}`
}) as Compiler
