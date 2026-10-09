interface Window {
  iconBeforeHydration?: Element | null
  iconProbe?: {
    hydrated: boolean
    refIsSvg: boolean
    reused: boolean
  }
}
