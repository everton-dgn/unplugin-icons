import { $, useSignal } from '@builder.io/qwik'
import aliasRaw from 'virtual:icons-raw/fixture/sample'
import Alias from 'virtual:icons/fixture/sample'
import raw from '~icons-raw/fixture/sample'
import Icon from '~icons/fixture/sample'

export function check() {
  const ref = useSignal<SVGSVGElement>()
  const valid = (
    <Icon
      ref={ref}
      width={24}
      aria-label="Icon"
      onClick$={$((event, element) => {
        element.focus()
        void event.clientX
      })}
    />
  )
  const alias = <Alias ref={ref} viewBox="0 0 24 24" />
  const strings: string[] = [raw, aliasRaw]
  // @ts-expect-error Invalid SVG prop must fail for the public type.
  const invalid = <Icon invalidIconProp />
  // @ts-expect-error Both component prefixes have the same contract.
  const invalidAlias = <Alias invalidIconProp />
  // Qwik's public Ref accepts Signal<Element>, including a div signal.
  const broadRef = <Icon ref={useSignal<HTMLDivElement>()} />
  // @ts-expect-error A numeric signal is not an element ref.
  const invalidRef = <Icon ref={useSignal<number>()} />
  // @ts-expect-error Raw imports are strings, not components.
  const component: typeof Icon = raw
  // @ts-expect-error The raw alias is also a string.
  const numeric: number = aliasRaw
  return { valid, alias, strings, invalid, invalidAlias, broadRef, invalidRef, component, numeric }
}
