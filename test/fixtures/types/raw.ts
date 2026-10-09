import virtualIcon from 'virtual:icons/mdi/alarm-off'
import virtualRawIcon from 'virtual:icons/mdi/alarm-off?raw&width=4em'
import icon from '~icons/mdi/alarm-off'
import rawIcon from '~icons/mdi/alarm-off?width=4em&raw'

const icons: string[] = [virtualIcon, virtualRawIcon, icon, rawIcon]
icons.forEach(svg => svg.toUpperCase())

// @ts-expect-error Raw icons must not silently become any.
const virtualNumber: number = virtualIcon
// @ts-expect-error Raw icons with query parameters must remain strings.
const virtualRawNumber: number = virtualRawIcon
// @ts-expect-error Raw icons must remain strings for both aliases.
const number: number = icon
// @ts-expect-error Raw icons with query parameters must remain strings.
const rawNumber: number = rawIcon

// @ts-expect-error Raw icons cannot be called as components.
virtualIcon({ width: 24 })
// @ts-expect-error Raw icons cannot be called as components.
icon({ width: 24 })

export { number, rawNumber, virtualNumber, virtualRawNumber }
