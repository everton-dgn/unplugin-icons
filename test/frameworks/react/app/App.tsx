import { useEffect, useRef, useState } from 'react'
import aliasRaw from 'virtual:icons-raw/fixture/sample'
import AliasIcon from 'virtual:icons/fixture/sample'
import raw from '~icons-raw/fixture/sample'
import Icon from '~icons/fixture/sample'

export function App() {
  const [count, setCount] = useState(0)
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    window.probe.refIsSvg = ref.current instanceof SVGSVGElement
    window.probe.reused = ref.current === window.probe.original
    window.probe.hydrated = true
  }, [])
  return (
    <main>
      <Icon ref={ref} data-testid="icon" title={`Title ${count} <&"`} aria-label={`Icon ${count}`} role="img" width={32 + count} className="icon" />
      <AliasIcon data-testid="alias" aria-hidden="true" />
      <button onClick={() => setCount(value => value + 1)}>Update</button>
      <output data-testid="raw">{raw}</output>
      <output data-testid="raw-alias">{aliasRaw}</output>
    </main>
  )
}
