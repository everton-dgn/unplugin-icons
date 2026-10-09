import { mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import Icons from '../src'

describe.each(['webpack', 'rspack'] as const)('%s icon prefixes', (framework) => {
  it.each(['~icons/', 'virtual:icons/', '~icons-raw/', 'virtual:icons-raw/'])('bundles %s and preserves encoded query values', async (prefix) => {
    const root = fileURLToPath(new URL('../', import.meta.url))
    const require = createRequire(new URL(`../examples/${framework}/package.json`, import.meta.url))
    const bundle = framework === 'webpack' ? require('webpack') : require('@rspack/core').rspack
    const fixture = mkdtempSync(join(root, `node_modules/.icon-prefix-${framework}-`))
    writeFileSync(join(fixture, 'entry.mjs'), `
import icon from '${prefix}test/icon.circle?raw=false&width=1.5em&title=a%252Eb';
import plain from '${prefix}test/icon.circle';
import untouched from 'data:text/javascript,export default "data-ok"';
export { icon, plain, untouched };
`)
    const compiler = bundle({
      mode: 'none',
      cache: false,
      target: 'node',
      context: fixture,
      entry: './entry.mjs',
      output: { path: join(fixture, 'output'), filename: 'bundle.cjs', library: { type: 'commonjs2' } },
      plugins: [Icons[framework]({
        compiler: { extension: 'js', compiler: svg => `export default { svg: ${JSON.stringify(svg)} }` },
        customCollections: { test: { 'icon.circle': '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>' } },
      })],
    })
    try {
      const stats: any = await new Promise((resolve, reject) => compiler.run((error: Error | null, stats: unknown) => error ? reject(error) : resolve(stats)))
      expect(stats.toJson({ all: false, errors: true }).errors).toEqual([])
      const { icon, plain, untouched } = require(join(fixture, 'output/bundle.cjs'))
      const raw = prefix.includes('-raw/')
      expect(typeof icon).toBe(raw ? 'string' : 'object')
      expect(typeof plain).toBe(raw ? 'string' : 'object')
      const svg = raw ? icon : icon.svg
      expect(typeof svg).toBe('string')
      expect(svg).toContain('<svg')
      expect(svg).toContain('width="1.5em"')
      expect(svg).toContain('title="a%2Eb"')
      expect(raw ? plain : plain.svg).toContain('<svg')
      expect(raw ? plain : plain.svg).not.toContain('title="a%2Eb"')
      expect(untouched).toBe('data-ok')
    }
    finally {
      await new Promise<void>((resolve, reject) => compiler.close((error: Error | null) => error ? reject(error) : resolve()))
    }
  })
})
