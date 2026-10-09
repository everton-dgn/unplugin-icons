import type { Compiler } from './types'

export const MarkoCompiler = ((svg: string) => {
  const openTagEnd = svg.indexOf('>', svg.indexOf('<svg '))
  const closeTagStart = svg.lastIndexOf('</svg')
  // Marko parses root attributes as strings, while the body is inserted as HTML.
  const openTag = `${svg.slice(0, openTagEnd).replaceAll('\\', '\\\\')} ...input>`
  const content = `$!{${JSON.stringify(svg.slice(openTagEnd + 1, closeTagStart))}}`
  const closeTag = svg.slice(closeTagStart)
  return `${openTag}${content}${closeTag}`
}) as Compiler
