import type { ComponentLike } from '@glint/template'
import VirtualIcon from 'virtual:icons/test/icon'
import Icon from '~icons/test/icon'

type SVGComponent = ComponentLike<{ Element: SVGElement }>

export const icon: SVGComponent = Icon
export const virtualIcon: SVGComponent = VirtualIcon
declare const svg: SVGComponent
export const iconFromSvg: typeof Icon = svg
export const virtualIconFromSvg: typeof VirtualIcon = svg

// @ts-expect-error An icon is not a string.
export const text: string = Icon
// @ts-expect-error Neither prefix may lose its component type.
export const virtualText: string = VirtualIcon
// @ts-expect-error SVG components cannot be used as HTML components.
export const html: ComponentLike<{ Element: HTMLElement }> = Icon
// @ts-expect-error Both prefixes must preserve SVG elements.
export const virtualHtml: ComponentLike<{ Element: HTMLElement }> = VirtualIcon
// @ts-expect-error SVGElement does not promise a specific SVG subtype.
export const rootSvg: ComponentLike<{ Element: SVGSVGElement }> = Icon
// @ts-expect-error Both prefixes must preserve the declared SVGElement type.
export const virtualRootSvg: ComponentLike<{ Element: SVGSVGElement }> = VirtualIcon
