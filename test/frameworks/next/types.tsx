import { createRef } from 'react'
import aliasRaw from 'virtual:icons-raw/fixture/sample'
import Alias from 'virtual:icons/fixture/sample'
import raw from '~icons-raw/fixture/sample'
import Icon from '~icons/fixture/sample'

const ref = createRef<SVGSVGElement>()
export const valid = <Icon ref={ref} title="Title" aria-label="Icon" strokeWidth={2} onClick={event => event.currentTarget.focus()} />
export const alias = <Alias ref={ref} viewBox="0 0 24 24" xlinkHref="#shape" />
const strings: string[] = [raw, aliasRaw]
void strings
// @ts-expect-error SVG icons do not accept this prop.
export const invalid = <Icon invalidIconProp />
// @ts-expect-error The virtual alias has the same SVG prop contract.
export const invalidAlias = <Alias invalidIconProp />
// @ts-expect-error The ref must target an SVG, not a div.
export const invalidRef = <Icon ref={createRef<HTMLDivElement>()} />
// @ts-expect-error Raw imports are strings, not React components.
const component: typeof Icon = raw
// @ts-expect-error Both raw aliases return strings.
const numeric: number = aliasRaw
void component
void numeric
