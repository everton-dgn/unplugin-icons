import type { IconifyLoaderOptions } from '@iconify/utils'
import type { ResolvedOptions } from '../types'
import type { Compiler } from './compilers/types'
import { loadNodeIcon } from '@iconify/utils/lib/loader/node-loader'
import { compilers } from './compilers'

const URL_PREFIXES = ['/~icons/', '~icons/', 'virtual:icons/', 'virtual/icons/']
const RAW_URL_PREFIXES = ['/~icons-raw/', '~icons-raw/', 'virtual:icons-raw/']
const rawIconPathRE = new RegExp(RAW_URL_PREFIXES.map(v => `^${v}`).join('|'))
const iconPathRE = new RegExp([...URL_PREFIXES, ...RAW_URL_PREFIXES].map(v => `^${v}`).join('|'))
const RE_EXTENSION = /\.(?:svg|jsx|tsx|svelte|astro|marko)$/

export interface ResolvedIconPath {
  collection: string
  icon: string
  query: Record<string, string | undefined>
}

export function isIconPath(path: string) {
  return iconPathRE.test(path)
}

export function isRawIconPath(path: string) {
  return rawIconPathRE.test(path)
}

export function normalizeIconPath(path: string) {
  return path.replace(iconPathRE, isRawIconPath(path) ? RAW_URL_PREFIXES[0] : URL_PREFIXES[0])
}

export function stripIconExtension(path: string, customExtension?: string) {
  if (customExtension) {
    const suffix = customExtension.startsWith('.') ? customExtension : `.${customExtension}`
    if (path.endsWith(suffix))
      return path.slice(0, -suffix.length)
  }
  return path.replace(RE_EXTENSION, '')
}

export function resolveIconsPath(path: string, customExtension?: string): ResolvedIconPath | null {
  if (!isIconPath(path))
    return null

  const raw = isRawIconPath(path)
  path = path.replace(iconPathRE, '')

  const query: ResolvedIconPath['query'] = {}
  const queryIndex = path.indexOf('?')
  if (queryIndex !== -1) {
    const queryRaw = path.slice(queryIndex + 1)
    path = path.slice(0, queryIndex)
    new URLSearchParams(queryRaw).forEach((value, key) => {
      // configure raw compiler for empty and true values only
      if (key === 'raw')
        query.raw = (value === '' || value === 'true') ? 'true' : 'false'
      else
        query[key] = value
    })
  }

  // A typed raw prefix always exports a string, regardless of query overrides.
  if (raw)
    query.raw = 'true'

  // Preserve dots in icon names; only recognized suffixes are extensions.
  path = stripIconExtension(path, customExtension)

  const [collection, icon] = path.split('/')

  return {
    collection,
    icon,
    query,
  }
}

export async function generateComponent({ collection, icon, query }: ResolvedIconPath, options: ResolvedOptions) {
  const warn = `${collection}/${icon}`
  const {
    scale,
    defaultStyle,
    defaultClass,
    customCollections,
    iconCustomizer: providedIconCustomizer,
    transform: useTransform,
    autoInstall = false,
    collectionsNodeResolvePath,
  } = options

  const iconifyCustomCollections = Object.fromEntries(
    Object.entries(customCollections).map(([key, loader]) => [
      key,
      typeof loader === 'function'
        ? async (name: string) => await loader(name)
        : loader,
    ]),
  ) as IconifyLoaderOptions['customCollections']

  const iconifyLoaderOptions: IconifyLoaderOptions = {
    addXmlNs: false,
    scale,
    customCollections: iconifyCustomCollections,
    autoInstall,
    defaultClass,
    defaultStyle,
    cwd: collectionsNodeResolvePath,
    // there is no need to warn since we throw an error below
    warn: undefined,
    customizations: {
      transform: typeof useTransform === 'function'
        ? async (svg, collection, icon) => {
          return await useTransform(svg, collection, icon)
        }
        : undefined,
      async iconCustomizer(collection, icon, props) {
        await providedIconCustomizer?.(collection, icon, props)
        Object.keys(query).forEach((p) => {
          const v = query[p]
          // exclude raw compiler entry to be serialized as svg attr
          if (p !== 'raw' && v !== undefined && v !== null)
            props[p] = v
        })
      },
    },
  }
  const svg = await loadNodeIcon(collection, icon, iconifyLoaderOptions)
  if (!svg) {
    throw new Error(`Icon \`${warn}\` not found`)
  }

  // accept raw compiler from query params
  const _compiler = query.raw === 'true' ? 'raw' : options.compiler

  if (_compiler) {
    const compiler = typeof _compiler === 'string'
      ? compilers[_compiler]
      : (await _compiler.compiler) as Compiler

    if (compiler) {
      return compiler(svg, collection, icon, options)
    }
  }

  throw new Error(`Unknown compiler: ${_compiler}`)
}

export async function generateComponentFromPath(path: string, options: ResolvedOptions): Promise<{
  code: string
  resolved: ResolvedIconPath
} | null> {
  const extension = typeof options.compiler === 'object' ? options.compiler.extension : undefined
  const resolved = resolveIconsPath(path, extension)
  return resolved
    ? {
        code: await generateComponent(resolved, options),
        resolved,
      }
    : null
}
