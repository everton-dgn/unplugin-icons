import type { ComponentProps, JSX } from '@solidjs/web'
import VirtualRaw from 'virtual:icons-raw/fixture/icon'
import Virtual from 'virtual:icons/fixture/icon'
import Raw from '~icons-raw/fixture/icon?raw=false'
import Tilde from '~icons/fixture/icon'

const component: (props: ComponentProps<'svg'>) => JSX.Element = Tilde
function svgRef(node: SVGSVGElement) {
  node.getAttribute('viewBox')
}
export const icons = [component({ width: 24 }), <Virtual ref={svgRef} />]
export const raw: string[] = [Raw, VirtualRaw]
// @ts-expect-error Unknown SVG props must fail.
export const invalid = <Tilde invalidIconProp="no" />
// @ts-expect-error Raw prefixes are strings, including with raw=false.
Raw({})
