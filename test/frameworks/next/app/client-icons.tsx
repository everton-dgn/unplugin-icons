'use client'

import { useEffect, useRef, useState } from 'react'
import AliasIcon from 'virtual:icons/fixture/sample'
import Icon from '~icons/fixture/sample'

export function ClientIcons() {
  const [count, setCount] = useState(0)
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    window.iconProbe = {
      hydrated: true,
      refIsSvg: ref.current instanceof SVGSVGElement,
      reused: ref.current === window.iconBeforeHydration,
    }
  }, [])
  return (
    <section>
      <Icon ref={ref} data-testid="icon" title={`Title ${count} <&"`} aria-label={`Icon ${count}`} role="img" width={32 + count} className="icon" />
      <AliasIcon data-testid="alias" aria-hidden="true" />
      <button onClick={() => setCount(value => value + 1)}>Update</button>
    </section>
  )
}
