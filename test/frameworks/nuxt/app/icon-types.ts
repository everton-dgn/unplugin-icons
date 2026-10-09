import type { FunctionalComponent, SVGAttributes } from 'vue'
import virtualRaw from 'virtual:icons-raw/fixture/sample.dot'
import Alias from 'virtual:icons/fixture/sample.dot'
import raw from '~icons-raw/fixture/sample.dot'
import Icon from '~icons/fixture/sample.dot'

const component: FunctionalComponent<SVGAttributes> = Icon
const alias: typeof component = Alias
const props: Parameters<typeof Icon>[0] = { 'width': 24, 'aria-label': 'typed', 'onClick': event => event.button }
const strings: string[] = [raw, virtualRaw]
// @ts-expect-error SVG width cannot be an object.
const invalid: Parameters<typeof Alias>[0] = { width: {} }
// @ts-expect-error Components do not export strings.
const text: string = Icon
// @ts-expect-error Raw imports do not export components.
const rawComponent: typeof component = raw
export { alias, component, invalid, props, rawComponent, strings, text }
