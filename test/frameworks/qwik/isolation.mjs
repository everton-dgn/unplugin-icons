import assert from 'node:assert/strict'
import { cpSync, existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, sep } from 'node:path'
import { hashes } from './artifact.mjs'

const packages = ['@builder.io/qwik', '@svgx/core', 'vite', 'esbuild', 'typescript', '@playwright/test', 'unplugin-icons']
export function prepare(fixture, run, freshLock, vitePlus = true) {
  const require = createRequire(join(run, 'package.json'))
  for (const name of packages)
    assert.throws(() => require.resolve(name), { code: 'MODULE_NOT_FOUND' }, `Inherited dependency: ${name}`)
  for (const name of readdirSync(fixture)) {
    if (['node_modules', 'README.md'].includes(name) || (freshLock && name === 'bun.lock'))
      continue
    const source = vitePlus && ['package.json', 'bun.lock'].includes(name) ? join(fixture, 'vite-plus', name) : join(fixture, name)
    cpSync(source, join(run, name), { recursive: true, force: false, errorOnExist: true })
  }
}

export function verify(run, expected) {
  const require = createRequire(join(run, 'package.json'))
  const library = require.resolve('unplugin-icons/package.json')
  const fromLibrary = createRequire(library)
  const peers = {}
  const manifest = JSON.parse(readFileSync(library, 'utf8'))
  for (const name of new Set([...packages, ...Object.keys(manifest.peerDependencies)])) {
    let location
    try {
      let directory = dirname(realpathSync(fromLibrary.resolve(name)))
      while (directory !== dirname(directory)) {
        const candidate = join(directory, 'package.json')
        const actualName = existsSync(candidate) && JSON.parse(readFileSync(candidate, 'utf8')).name
        if (actualName === name || (name === 'vite' && actualName === '@voidzero-dev/vite-plus-core')) {
          location = candidate
          break
        }
        directory = dirname(directory)
      }
      assert(location, `Missing package metadata: ${name}`)
    }
    catch (error) {
      assert.equal(error.code, 'MODULE_NOT_FOUND')
      assert.equal(manifest.peerDependenciesMeta[name]?.optional, true)
      peers[name] = { absent: true, optional: true }
      continue
    }
    assert(location.startsWith(`${realpathSync(run)}${sep}`), `Outside consumer: ${location}`)
    const pkg = JSON.parse(readFileSync(location, 'utf8'))
    peers[name] = { location, version: pkg.version, peers: pkg.peerDependencies, engines: pkg.engines }
  }
  assert.equal(manifest.devDependencies, undefined)
  assert.equal(manifest.scripts, undefined)
  assert.deepEqual(hashes(join(run, 'node_modules/unplugin-icons')), expected)
  return peers
}
