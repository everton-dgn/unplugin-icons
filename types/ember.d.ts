declare module 'virtual:icons/*' {
  import type { ComponentLike } from '@glint/template'

  const IconComponent: ComponentLike<{
    Element: SVGSVGElement
  }>
  export default IconComponent
}
declare module '~icons/*' {
  import type { ComponentLike } from '@glint/template'

  const IconComponent: ComponentLike<{
    Element: SVGSVGElement
  }>
  export default IconComponent
}
