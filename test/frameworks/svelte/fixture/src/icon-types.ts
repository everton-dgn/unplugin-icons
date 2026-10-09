import type { Component, ComponentProps } from 'svelte'
import type { SvelteHTMLElements } from 'svelte/elements'
import virtualRaw from 'virtual:icons-raw/test/mark'
import VirtualIcon from 'virtual:icons/test/mark'
import raw from '~icons-raw/test/mark'
import Icon from '~icons/test/mark'

const icon: Component<SvelteHTMLElements['svg']> = Icon
const alias: typeof icon = VirtualIcon
const props: ComponentProps<typeof Icon> = {
  'width': '2em',
  'aria-label': 'typed',
  'onclick': event => event.currentTarget.ownerSVGElement,
}
const aliasProps: ComponentProps<typeof VirtualIcon> = { height: 24 }
const values: string[] = [raw, virtualRaw]
// @ts-expect-error Component imports must not become strings.
const text: string = Icon
// @ts-expect-error SVG width cannot be an object.
const invalid: ComponentProps<typeof VirtualIcon> = { width: {} }
// @ts-expect-error Raw strings are not components.
const rawComponent: typeof Icon = raw
export { alias, aliasProps, icon, invalid, props, rawComponent, text, values }
