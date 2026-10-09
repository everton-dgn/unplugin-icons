interface Window {
  probe: {
    original: Element | null
    hydrated: boolean
    reused: boolean
    refIsSvg: boolean
    errors: string[]
  }
}
