import { createSignal } from 'solid-js'
import Virtual from 'virtual:icons/fixture/icon'
import Tilde from '~icons/fixture/icon'
import FalseRaw from '~icons/fixture/icon?raw=false'
import { raw } from './raw'

export default function App() {
  const [width, setWidth] = createSignal(24)
  const capture = (node: SVGSVGElement) => {
    node.dataset.ref = String(node instanceof SVGSVGElement)
  }
  return (
    <main>
      <button onClick={() => setWidth(48)}>Update</button>
      <Tilde data-testid="tilde" ref={capture} width={width()} viewBox="0 0 24 24" aria-label={'A & B "quoted"'} stroke={width() === 24 ? 'blue' : 'green'} />
      <Virtual data-testid="virtual" width={width()} />
      <FalseRaw data-testid="false-raw" />
      <output id="raw">{JSON.stringify(raw)}</output>
    </main>
  )
}
