import type { Compiler } from './types'

export const EmberCompiler = ((svg: string) => {
  let svgWithProps = svg
  let quote = ''
  const start = svg.indexOf('<svg')
  if (start !== -1) {
    for (let index = start + 4; index < svg.length; index++) {
      const character = svg[index]
      if (quote) {
        if (character === quote)
          quote = ''
      }
      else if (character === '"' || character === '\'') {
        quote = character
      }
      else if (character === '>') {
        const end = svg[index - 1] === '/' ? index - 1 : index
        svgWithProps = `${svg.slice(0, end)} ...attributes${svg.slice(end)}`
        break
      }
    }
  }
  return `import { template } from "@ember/template-compiler";

const Icon = template(${JSON.stringify(svgWithProps)})
export default Icon;`
}) as Compiler
