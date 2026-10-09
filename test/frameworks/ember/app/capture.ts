import { modifier } from 'ember-modifier'

declare global {
  interface Window {
    iconProbe: { mounted: number, disposed: number, current?: SVGElement, detached?: SVGElement }
  }
}

window.iconProbe = { mounted: 0, disposed: 0 }

export const capture = modifier((element: SVGElement) => {
  window.iconProbe.current = element
  window.iconProbe.mounted++
  return () => {
    window.iconProbe.detached = element
    window.iconProbe.disposed++
  }
})
