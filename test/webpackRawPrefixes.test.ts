import { mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import Icons from '../src'

it('bundles the raw prefix with webpack and preserves encoded query values', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const require = createRequire(new URL('../examples/webpack/package.json', import.meta.url))
  const webpack = require('webpack')
  const fixture = mkdtempSync(join(root, 'node_modules/.raw-prefix-webpack-'))
  writeFileSync(join(fixture, 'entry.mjs'), `
import svg from '~icons-raw/test/icon?raw=false&width=1.5em&title=a%252Eb';
export default svg;
`)
  const compiler = webpack({
    mode: 'none',
    cache: false,
    target: 'node',
    context: fixture,
    entry: './entry.mjs',
    output: { path: join(fixture, 'output'), filename: 'bundle.cjs', library: { type: 'commonjs2' } },
    plugins: [Icons.webpack({
      compiler: 'solid',
      customCollections: { test: { icon: '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>' } },
    })],
  })
  try {
    const stats: any = await new Promise((resolve, reject) => compiler.run((error: Error | null, stats: unknown) => error ? reject(error) : resolve(stats)))
    expect(stats.toJson({ all: false, errors: true }).errors).toEqual([])
    const { default: svg } = require(join(fixture, 'output/bundle.cjs'))
    expect(typeof svg).toBe('string')
    expect(svg).toContain('<svg')
    expect(svg).toContain('width="1.5em"')
    expect(svg).toContain('title="a%2Eb"')
  }
  finally {
    await new Promise<void>((resolve, reject) => compiler.close((error: Error | null) => error ? reject(error) : resolve()))
  }
})
