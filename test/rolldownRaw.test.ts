import type { Options } from '../src/types'
import { Buffer } from 'node:buffer'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import Icons from '../src/rolldown'

const require = createRequire(import.meta.url)
const requireFromTsdown = createRequire(require.resolve('tsdown/package.json'))
const { rolldown } = await import(pathToFileURL(requireFromTsdown.resolve('rolldown')).href)
const svg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'

async function bundle(request: string, options: Options, moduleTypes?: Record<string, 'text' | 'js'>) {
  const build = await rolldown({
    input: 'icon-entry',
    moduleTypes,
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

it.each(['', '?width=1.2em', '?raw=false&height=2em'])('preserves custom JSON compiler output with %s', async (query) => {
  const value = { icon: 'custom-json', enabled: true }
  const result = await bundle(`~icons/test/icon${query}`, {
    compiler: { extension: 'json', compiler: () => JSON.stringify(value) },
    customCollections: { test: { icon: svg } },
  })
  expect(result).toEqual(value)
})

it.each(['ts', 'mts', 'cts', 'custom.ts', '.custom.ts'])('compiles custom %s output with queries', async (extension) => {
  const result = await bundle('virtual:icons/test/icon?width=1.2em&title=a%252Eb&raw=false', {
    compiler: {
      extension,
      compiler: svg => `const icon: string = ${JSON.stringify(svg)}; export default icon`,
    },
    customCollections: { test: { icon: svg } },
  })
  expect(result).toContain('width="1.2em"')
  expect(result).toContain('title="a%2Eb"')
  expect(result).not.toContain('raw=')
})

it('preserves custom text output with a query', async () => {
  const result = await bundle('~icons/test/icon?height=2em', {
    compiler: { extension: 'txt', compiler: svg => svg },
    customCollections: { test: { icon: svg } },
  })
  expect(result).toMatch(/^<svg\b/)
  expect(result).toContain('height="2em"')
})

it('respects configured module types for custom extensions with queries', async () => {
  const result = await bundle('~icons/test/icon?width=2em', {
    compiler: { extension: 'icon', compiler: svg => svg },
    customCollections: { test: { icon: svg } },
  }, { '.icon': 'text' })
  expect(result).toMatch(/^<svg\b/)
  expect(result).toContain('width="2em"')
})

it('respects configured module types for native extensions with queries', async () => {
  const result = await bundle('~icons/test/icon?width=2em', {
    compiler: { extension: 'txt', compiler: svg => `export default ${JSON.stringify(svg)}` },
    customCollections: { test: { icon: svg } },
  }, { '.txt': 'js' })
  expect(result).toMatch(/^<svg\b/)
  expect(result).toContain('width="2em"')
})

it('keeps query variants loadable with preserved modules', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const fixture = mkdtempSync(join(root, 'node_modules/.rolldown-preserved-'))
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ type: 'module' }))
  writeFileSync(join(fixture, 'entry.js'), `
export { default as narrow } from '~icons/test/icon?width=2em'
export { default as wide } from '~icons/test/icon?width=3em'
`)
  const build = await rolldown({
    cwd: fixture,
    input: join(fixture, 'entry.js'),
    plugins: [Icons({
      compiler: { extension: 'json', compiler: svg => JSON.stringify({ svg }) },
      customCollections: { test: { icon: svg } },
    })],
  })
  try {
    const directory = join(fixture, 'output')
    const { output } = await build.write({ format: 'esm', dir: directory, preserveModules: true })
    const entry = output.find((item: { type: string, isEntry?: boolean }) => item.type === 'chunk' && item.isEntry)
    const module = await import(pathToFileURL(join(directory, entry.fileName)).href)
    expect(module.narrow.svg).toContain('width="2em"')
    expect(module.wide.svg).toContain('width="3em"')
  }
  finally {
    await build.close()
  }
})
