declare module 'virtual:icons/*' {
  import type { JSX } from 'preact'

  const component: (props: JSX.IntrinsicElements['svg']) => JSX.Element
  export default component
}
declare module '~icons/*' {
  import type { JSX } from 'preact'

  const component: (props: JSX.IntrinsicElements['svg']) => JSX.Element
  export default component
}
