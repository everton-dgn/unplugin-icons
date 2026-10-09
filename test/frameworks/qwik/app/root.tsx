import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik'
import aliasRaw from 'virtual:icons-raw/fixture/sample'
import Alias from 'virtual:icons/fixture/sample'
import raw from '~icons-raw/fixture/sample'
import Icon from '~icons/fixture/sample'
import RawFalse from '~icons/fixture/sample?raw=false'
import Decimal from '~icons/fixture/sample?width=12.5&height=13.25'
import Encoded from '~icons/fixture/sample?width=14%2E5&height=15%2E25'

const App = component$(() => {
  const count = useSignal(0)
  const ref = useSignal<SVGSVGElement>()
  useVisibleTask$(() => {
    window.probe.refIsSvg = ref.value instanceof SVGSVGElement
    window.probe.reused = ref.value === window.probe.original
    window.probe.visible = true
  })
  return (
    <main>
      <Icon
        data-testid="icon"
        ref={ref}
        width={32 + count.value}
        class="icon"
        role="img"
        aria-label={`Icon ${count.value} <&"`}
        onClick$={() => count.value++}
      />
      <output data-testid="count">{count.value}</output>
      <Alias data-testid="alias" aria-hidden="true" />
      <Decimal data-testid="decimal" />
      <Encoded data-testid="encoded" />
      <RawFalse data-testid="raw-false" />
      <pre data-testid="raw">{raw}</pre>
      <pre data-testid="raw-alias">{aliasRaw}</pre>
    </main>
  )
})

export default function Root() {
  return (
    <>
      <head><title>Qwik icon runtime fixture</title></head>
      <body>
        <App />
        <script dangerouslySetInnerHTML={'window.probe={original:document.querySelector("[data-testid=icon]"),visible:false,refIsSvg:false,reused:false}'} />
      </body>
    </>
  )
}
