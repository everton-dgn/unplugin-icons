import type { CustomCollectionIconLoader, CustomIconLoader, Options } from '../../src/types'

export const body = '<path d="M1 2h3v4H1z"/>'
const svg = `<svg viewBox="0 0 24 24">${body}</svg>`
const iconSet = { prefix: 'test', width: 24, height: 24, icons: { sample: { body } } }

export const collections = {
  sync: () => iconSet,
  async: async () => iconSet,
  svg: (_name: string) => svg,
  asyncSvg: async (_name: string) => svg,
  inline: { sample: svg },
  asyncInline: { sample: async () => svg },
  hmr: {
    __iconifyCustomHmrIconLoader: true,
    name: 'hmr',
    iconLoader: (_name: string) => svg,
    resolveModuleIconName: (_path: string) => undefined,
    resolveSVGIconPath: (_name: string) => undefined,
  },
} satisfies NonNullable<Options['customCollections']>

export const missingSvg: CustomIconLoader = async () => undefined

// @ts-expect-error A per-icon SVG loader must not return an icon set.
export const invalidSvg: CustomIconLoader = () => iconSet
// @ts-expect-error An arbitrary object is not an IconifyJSON collection.
export const invalidObject: CustomCollectionIconLoader = () => ({ invalid: true })
// @ts-expect-error Invalid async results must also be rejected.
export const invalidAsync: CustomCollectionIconLoader = async () => 42
// @ts-expect-error IconifyJSON requires a prefix.
export const missingPrefix: CustomCollectionIconLoader = () => ({ icons: iconSet.icons })
// @ts-expect-error Inline icon callbacks return SVG, not icon sets.
export const invalidInline: CustomCollectionIconLoader = { sample: () => iconSet }
