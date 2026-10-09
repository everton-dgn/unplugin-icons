import assert from 'node:assert/strict'
import { cpSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, sep } from 'node:path'
import { hashes } from './artifact.mjs'

const packages = ['react', 'react-dom', '@svgr/core', '@svgr/plugin-jsx', 'vite-plus', 'next', 'unplugin-icons']

export function prepare(fixture, run, freshLock = false) {
  const require = createRequire(join(run, 'package.json'))
  for (const name of packages) {
    assert.throws(() => require.resolve(name), { code: 'MODULE_NOT_FOUND' }, `Ancestor dependency leaked: ${name}`)
  }
  for (const name of readdirSync(fixture)) {
    if (freshLock && name === 'bun.lock')
      continue
    if (!['node_modules', 'run.mjs', 'README.md'].includes(name))
      cpSync(join(fixture, name), join(run, name), { recursive: true, errorOnExist: true, force: false })
  }
}

export function verify(run, expected) {
  const require = createRequire(join(run, 'package.json'))
  const library = require.resolve('unplugin-icons/package.json')
  const fromLibrary = createRequire(library)
  const peers = {}
  for (const name of ['react', 'react-dom', '@svgr/core', '@svgr/plugin-jsx']) {
    const location = realpathSync(fromLibrary.resolve(`${name}/package.json`))
    assert(location.startsWith(`${realpathSync(run)}${sep}`), `Peer outside fixture: ${location}`)
    peers[name] = { location, version: JSON.parse(readFileSync(location, 'utf8')).version }
  }
  const installed = JSON.parse(readFileSync(library, 'utf8'))
  assert.equal(installed.devDependencies, undefined)
  assert.equal(installed.scripts, undefined)
  assert.deepEqual(hashes(join(run, 'node_modules/unplugin-icons')), expected)
  return peers
}
