import type { Options } from '../src/types'
import { Buffer } from 'node:buffer'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import Icons from '../src/rolldown'

const require = createRequire(import.meta.url)
const requireFromTsdown = createRequire(require.resolve('tsdown/package.json'))
const { rolldown } = await import(pathToFileURL(requireFromTsdown.resolve('rolldown')).href)
const svg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'

async function bundle(request: string, options: Options) {
  const build = await rolldown({
    input: 'icon-entry',
    plugins: [
      {
        name: 'icon-entry',
        resolveId: (id: string) => id === 'icon-entry' ? '\0icon-entry' : null,
        load: (id: string) => id === '\0icon-entry'
          ? `export { default } from ${JSON.stringify(request)}`
          : null,
      },
      Icons(options),
    ],
  })
  try {
    const { output } = await build.generate({ format: 'esm' })
    const entry = output.find((item: { type: string, isEntry?: boolean }) => item.type === 'chunk' && item.isEntry)
    expect(entry).toBeDefined()
    const module = await import(`data:text/javascript;base64,${Buffer.from(entry.code).toString('base64')}`)
    return module.default
  }
  finally {
    await build.close()
  }
}

describe.each(['json', 'css', 'txt'])('rolldown raw icons ending in .%s', (extension) => {
  const name = `document.${extension}`
  const customCollections = { test: { [name]: svg } }

  it.each([
    ['~icons-raw/', ''],
    ['virtual:icons-raw/', ''],
    ['~icons-raw/', '?raw=false&width=2em'],
    ['virtual:icons-raw/', '?raw=false&width=2em'],
  ])('exports SVG with %s and query %s', async (prefix, query) => {
    const result = await bundle(`${prefix}test/${name}${query}`, {
      compiler: 'jsx',
      customCollections,
    })
    expect(result).toMatch(/^<svg\b/)
    expect(result).toContain('<path')
    if (query)
      expect(result).toContain('width="2em"')
    expect(result).not.toContain('raw=')
  })

  it('exports SVG with the raw query', async () => {
    const result = await bundle(`~icons/test/${name}?raw=true&width=3em`, {
      compiler: 'jsx',
      customCollections,
    })
    expect(result).toMatch(/^<svg\b/)
    expect(result).toContain('<path')
    expect(result).toContain('width="3em"')
  })

  it('exports SVG with the explicit raw compiler', async () => {
    const result = await bundle(`~icons/test/${name}`, {
      compiler: 'raw',
      customCollections,
    })
    expect(result).toMatch(/^<svg\b/)
    expect(result).toContain('<path')
  })
})

it('preserves custom JSON compiler output', async () => {
  const value = { icon: 'custom-json', enabled: true }
  const result = await bundle('~icons/test/icon', {
    compiler: { extension: 'json', compiler: () => JSON.stringify(value) },
    customCollections: { test: { icon: svg } },
  })
  expect(result).toEqual(value)
})
