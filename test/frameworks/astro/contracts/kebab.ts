/* eslint-disable antfu/no-import-dist, antfu/no-import-node-modules-by-path -- Verify the exact internal declarations repaired by the upstream patch. */
import type { KebabKeys } from '../node_modules/astro/dist/type-utils.js'

declare const symbol: unique symbol
interface Input { readonly backgroundColor?: string, fontSize: number, [symbol]: boolean, 42: string }
interface Expected { readonly 'background-color'?: string, 'font-size': number, [symbol]: boolean, '42': string }
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
const exact: Equal<KebabKeys<Input>, Expected> = true
interface VendorInput { WebkitTransform: string, webkitTransform: string, msTransform: string, SVGColor: string }
interface VendorExpected { '-webkit-transform': string, 'webkit-transform': string, 'ms-transform': string, '-s-v-g-color': string }
const vendors: Equal<KebabKeys<VendorInput>, VendorExpected> = true
const valid: KebabKeys<Input> = { 'font-size': 12, [symbol]: true, '42': 'answer' }
// @ts-expect-error Camel case keys have been remapped.
void valid.fontSize
// @ts-expect-error Readonly modifier is preserved.
valid['background-color'] = 'red'
// @ts-expect-error Property value type is preserved.
valid['font-size'] = 'large'
void [exact, vendors, valid]
