import type { Options } from './types'
import { Buffer } from 'node:buffer'
import { extname } from 'node:path'
import { normalizePath } from '@iconify/utils/lib/loader/hmr-utils'
import { createUnplugin } from 'unplugin'
import { generateComponentFromPath, isIconPath, isRawIconPath, normalizeIconPath, resolveIconsPath, stripIconExtension } from './core/loader'
import { resolveOptions } from './core/options'

const RE_LEADING_SLASH = /^\//
const RE_LEADING_DOT = /^\./
const RE_VITE_ESBUILD_EXTENSION = /\.(?:m?ts|[jt]sx)$/
const VIRTUAL_ICON_PREFIX = '\0unplugin-icons/'
const VIRTUAL_RAW_ICON_PREFIX = '\0unplugin-icons-raw/'
// Match unplugin's esbuild and Bun loader inference, ignoring query values.
const EXTENSION_LOADERS = {
  '.js': 'js',
  '.mjs': 'js',
  '.cjs': 'js',
  '.jsx': 'jsx',
  '.ts': 'ts',
  '.cts': 'ts',
  '.mts': 'ts',
  '.tsx': 'tsx',
  '.css': 'css',
  '.less': 'css',
  '.stylus': 'css',
  '.scss': 'css',
  '.sass': 'css',
  '.json': 'json',
  '.txt': 'text',
} as const

function getLoader(_code: string, id: string, compiler: Options['compiler']) {
  if (compiler === 'raw' || resolveIconsPath(id)?.query.raw === 'true')
    return 'js'
  if (compiler && typeof compiler !== 'string') {
    const extension = compiler.extension ? extname(`icon.${compiler.extension.replace(RE_LEADING_DOT, '')}`).toLowerCase() : ''
    return EXTENSION_LOADERS[extension as keyof typeof EXTENSION_LOADERS] || 'js'
  }
  // Built-in compilers emit JavaScript or JSX. Other suffixes belong to the icon name.
  const extension = extname(id.split('?')[0]).toLowerCase()
  return extension === '.jsx' || extension === '.tsx' ? EXTENSION_LOADERS[extension] : 'js'
}

function resolveIconId(id: string, compilerOption: Options['compiler'], webpackLike: boolean, vite: boolean) {
  if (id.startsWith(VIRTUAL_ICON_PREFIX) || id.startsWith(VIRTUAL_RAW_ICON_PREFIX))
    return id
  if (isIconPath(id)) {
    const normalizedId = normalizeIconPath(id)
    // fix issue 322
    const queryIndex = normalizedId.indexOf('?')
    const query = queryIndex > -1 ? normalizedId.slice(queryIndex) : ''
    const extension = compilerOption && typeof compilerOption !== 'string' ? compilerOption.extension : undefined
    const res = stripIconExtension(queryIndex > -1 ? normalizedId.slice(0, queryIndex) : normalizedId, extension)
      .replace(RE_LEADING_SLASH, '')
    const withExtension = (extension: string) => {
      // These adapters encode the whole ID as a filename. Keep the extension
      // last for loader rules, and recover the untouched request in load().
      if (webpackLike && query)
        return `${VIRTUAL_ICON_PREFIX}${encodeURIComponent(`${res}${query}`)}/icon.${extension}`
      // Vite can mistake a decimal query value for the extension. Encoding dots
      // preserves URLSearchParams semantics and keeps its loader inference on the path.
      if (vite && RE_VITE_ESBUILD_EXTENSION.test(`.${extension}`))
        return `${res}.${extension}${query.replaceAll('.', '%2E')}`
      return `${res}.${extension}${query}`
    }
    const resolved = resolveIconsPath(`${res}${query}`)
    // Keep ?raw away from Vite's filesystem handling, and use URL-safe bytes
    // so HTTP decoding cannot change percent-encoded query values.
    if (vite && isRawIconPath(normalizedId))
      return `${VIRTUAL_RAW_ICON_PREFIX}${Buffer.from(`${res}${query}`).toString('base64url')}/icon.js`
    // accept raw compiler from query params
    const compiler = resolved?.query?.raw === 'true' ? 'raw' : compilerOption
    if (compiler && typeof compiler !== 'string') {
      const ext = compiler.extension
      if (ext)
        return withExtension(ext.startsWith('.') ? ext.slice(1) : ext)
    }
    else {
      switch (compiler) {
        case 'astro':
          return withExtension('astro')
        case 'jsx':
          return withExtension('jsx')
        case 'qwik':
          return withExtension('jsx')
        case 'marko':
          return withExtension('marko')
        case 'svelte':
          return withExtension('svelte')
        case 'solid':
          return withExtension('tsx')
      }
    }
    return `${res}${query}`
  }
  return null
}

const unplugin = createUnplugin<Options | undefined>((options = {}, meta) => {
  const resolved = resolveOptions(options)
  const webpackLike = meta.framework === 'webpack' || meta.framework === 'rspack'
  const iconWatchIds = new Map<string, Set<string>>()

  return {
    name: 'unplugin-icons',
    enforce: 'pre',
    resolveId(id) {
      return resolveIconId(id, options.compiler, webpackLike, meta.framework === 'vite')
    },
    loadInclude(id) {
      return isIconPath(id) || id.startsWith(VIRTUAL_ICON_PREFIX) || id.startsWith(VIRTUAL_RAW_ICON_PREFIX)
    },
    async load(id) {
      const moduleId = id
      if (id.startsWith(VIRTUAL_RAW_ICON_PREFIX))
        id = Buffer.from(id.slice(VIRTUAL_RAW_ICON_PREFIX.length, id.lastIndexOf('/')), 'base64url').toString()
      else if (id.startsWith(VIRTUAL_ICON_PREFIX))
        id = decodeURIComponent(id.slice(VIRTUAL_ICON_PREFIX.length, id.lastIndexOf('/')))
      const {
        config,
        resolveVirtualIconPath,
      } = await resolved.then(({
        config,
        resolveVirtualIconPath,
      }) => ({
        config,
        resolveVirtualIconPath,
      }))
      const result = await generateComponentFromPath(id, config)
      if (result) {
        const path = resolveVirtualIconPath(
          result.resolved.collection,
          result.resolved.icon,
        )
        if (path) {
          this.addWatchFile(path)
          if (meta.framework === 'vite') {
            const file = normalizePath(path)
            const ids = iconWatchIds.get(file) || new Set<string>()
            ids.add(moduleId)
            iconWatchIds.set(file, ids)
          }
        }
        return {
          code: result.code,
          map: { version: 3, mappings: '', sources: [] } as any,
          ...(meta.framework === 'rolldown' && (config.compiler === 'raw' || result.resolved.query.raw === 'true')
            ? { moduleType: 'js' as const }
            : {}),
        }
      }
    },
    esbuild: {
      loader: (code: string, id: string) => getLoader(code, id, options.compiler),
    },
    bun: {
      loader: (code: string, id: string) => getLoader(code, id, options.compiler),
    },
    rollup: {
      api: {
        config: options,
      },
    },
    vite: {
      async handleHotUpdate(ctx) {
        const mGraph = ctx.server.moduleGraph
        const modules = await resolved.then(({
          invalidateHMR,
        }) => invalidateHMR(
          ctx.file,
          id => mGraph.getModuleById(id),
        ))
        const file = normalizePath(ctx.file)
        const ids = iconWatchIds.get(file)
        if (!ids?.size)
          return modules?.length ? modules : undefined

        const updated = new Set([...ctx.modules, ...modules || []])
        for (const id of ids) {
          const module = mGraph.getModuleById(id)
          if (module)
            updated.add(module)
          else
            ids.delete(id)
        }
        if (!ids.size)
          iconWatchIds.delete(file)
        return updated.size ? [...updated] : undefined
      },
    },
  }
})

export * from './types'

export default unplugin
