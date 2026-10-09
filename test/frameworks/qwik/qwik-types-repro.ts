// Minimal upstream declaration repro, independent of unplugin-icons.
import type { createElement, h, JSX, QwikIntrinsicElements } from '@builder.io/qwik'

export type Svg = QwikIntrinsicElements['svg']

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
type Assert<T extends true> = T
export type H = Assert<Equal<h.JSX.IntrinsicElements, JSX.IntrinsicElements>>
export type Create = Assert<Equal<createElement.JSX.IntrinsicElements, JSX.IntrinsicElements>>

export const svg: Svg = { width: 24, viewBox: '0 0 24 24' }
// @ts-expect-error Invalid SVG properties must remain rejected.
export const invalid: Svg = { invalidIconProp: true }
// @ts-expect-error Numeric refs must remain rejected through h.JSX.
export const invalidH: h.JSX.IntrinsicElements['svg'] = { ref: 42 }
// @ts-expect-error Numeric refs must remain rejected through createElement.JSX.
export const invalidCreate: createElement.JSX.IntrinsicElements['svg'] = { ref: 42 }
