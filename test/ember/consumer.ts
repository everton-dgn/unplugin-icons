import type { ComponentLike } from '@glint/template'
import VirtualIcon from 'virtual:icons/test/icon'
import Icon from '~icons/test/icon'

type SVGComponent = ComponentLike<{ Element: SVGSVGElement }>

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
export const compatibleSvg: ComponentLike<{ Element: SVGElement }> = Icon
export const compatibleVirtualSvg: ComponentLike<{ Element: SVGElement }> = VirtualIcon

declare const genericSvg: ComponentLike<{ Element: SVGElement }>
// @ts-expect-error A generic SVG element does not guarantee a root SVG element.
export const genericIcon: typeof Icon = genericSvg
// @ts-expect-error Both aliases must require the root SVG element.
export const genericVirtualIcon: typeof VirtualIcon = genericSvg
