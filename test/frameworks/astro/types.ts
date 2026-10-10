import VirtualRaw from 'virtual:icons-raw/fixture/sample?width=2&raw=false'
import VirtualIcon from 'virtual:icons/fixture/sample'
import Raw from '~icons-raw/fixture/sample?raw=false'
import Icon from '~icons/fixture/sample'

Icon({ 'viewBox': '0 0 24 24', 'stroke-width': 2, 'aria-label': 'label' })
VirtualIcon({ width: 24, fill: 'red' })
const strings: string[] = [Raw, VirtualRaw]
strings.map(value => value.toUpperCase())
// @ts-expect-error Invalid SVG property.
Icon({ invalidProperty: true })
// @ts-expect-error Raw imports cannot be invoked.
Raw({})
// @ts-expect-error Components are not raw strings.
const invalid: string = Icon
void invalid
