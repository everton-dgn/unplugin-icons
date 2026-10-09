import { Buffer } from 'node:buffer'
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'
import Icons from '../src/rolldown'

const require = createRequire(import.meta.url)
const requireFromTsdown = createRequire(require.resolve('tsdown/package.json'))
const requireFromEmber = createRequire(new URL('../examples/vite-ember/package.json', import.meta.url))
const requireFromSolid = createRequire(new URL('../examples/vite-solid/package.json', import.meta.url))
const requireFromSolidPlugin = createRequire(requireFromSolid.resolve('vite-plugin-solid'))
const { rolldown } = await import(pathToFileURL(requireFromTsdown.resolve('rolldown')).href)
const { babel } = requireFromEmber('@rollup/plugin-babel')

it.each(['', '?width=2em'])('keeps Solid icons visible to the Babel transform with query %s', async (query) => {
  const request = `~icons/test/icon${query}`
  const root = fileURLToPath(new URL('../', import.meta.url))
  const fixture = mkdtempSync(join(root, 'node_modules/.rolldown-solid-'))
  mkdirSync(join(fixture, 'node_modules'))
  symlinkSync(realpathSync(join(root, 'examples/vite-solid/node_modules/solid-js')), join(fixture, 'node_modules/solid-js'))
  writeFileSync(join(fixture, 'entry.js'), `
import Icon from ${JSON.stringify(request)}
import { renderToString } from 'solid-js/web'
export default renderToString(() => Icon({ 'aria-label': 'rendered' }))
`)
  const build = await rolldown({
    cwd: fixture,
    input: join(fixture, 'entry.js'),
    platform: 'node',
    plugins: [
      Icons({
        compiler: 'solid',
        customCollections: { test: { icon: '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>' } },
      }),
      babel({
        babelHelpers: 'bundled',
        babelrc: false,
        configFile: false,
        extensions: ['.tsx'],
        presets: [[requireFromSolidPlugin.resolve('babel-preset-solid'), { generate: 'ssr' }]],
      }),
    ],
  })
  try {
    const { output } = await build.generate({ format: 'esm' })
    const entry = output.find((item: { type: string, isEntry?: boolean }) => item.type === 'chunk' && item.isEntry)
    expect(entry.imports).toEqual([])
    const module = await import(`data:text/javascript;base64,${Buffer.from(entry.code).toString('base64')}`)
    expect(module.default).toMatch(/^<svg\b/)
    expect(module.default).toContain('aria-label="rendered"')
    expect(module.default).toContain('<path')
    if (query)
      expect(module.default).toContain('width="2em"')
  }
  finally {
    await build.close()
  }
})
