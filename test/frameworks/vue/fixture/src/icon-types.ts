import type { FunctionalComponent, SVGAttributes } from 'vue'
import virtualRaw from 'virtual:icons-raw/test/mark'
import Alias from 'virtual:icons/test/mark'
import raw from '~icons-raw/test/mark'
import Icon from '~icons/test/mark'

const component: FunctionalComponent<SVGAttributes> = Icon
const alias: typeof component = Alias
const props: Parameters<typeof Icon>[0] = { 'width': 24, 'aria-label': 'typed', 'onClick': event => event.button }
const aliases: string[] = [raw, virtualRaw]
// @ts-expect-error SVG width cannot be an object.
const invalid: Parameters<typeof Alias>[0] = { width: {} }
// @ts-expect-error Components do not export strings.
const text: string = Icon
// @ts-expect-error Raw imports do not export components.
const rawComponent: typeof component = raw
export { alias, aliases, component, invalid, props, rawComponent, text }
