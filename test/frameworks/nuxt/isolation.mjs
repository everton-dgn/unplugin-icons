import assert from 'node:assert/strict'
import { cpSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, sep } from 'node:path'
import { hashes } from './artifact.mjs'

const packages = ['nuxt', 'vue', '@vue/compiler-sfc', 'vite', 'vite-plus', 'typescript', 'vue-tsc', 'unplugin-icons']
export function prepare(fixture, run, freshLock) {
  const require = createRequire(join(run, 'package.json'))
  for (const name of packages)
    assert.throws(() => require.resolve(name), { code: 'MODULE_NOT_FOUND' }, `Ancestor dependency leaked: ${name}`)
  for (const name of readdirSync(fixture)) {
    if (freshLock && name === 'bun.lock')
      continue
    if (!['node_modules', 'README.md', 'run.mjs'].includes(name))
      cpSync(join(fixture, name), join(run, name), { recursive: true, errorOnExist: true, force: false })
  }
}
export function verify(run, expected) {
  const require = createRequire(join(run, 'package.json'))
  const library = require.resolve('unplugin-icons/package.json')
  const fromLibrary = createRequire(library)
  const peers = {}
  for (const name of packages.filter(name => name !== 'unplugin-icons')) {
    const location = realpathSync(fromLibrary.resolve(`${name}/package.json`))
    assert(location.startsWith(`${realpathSync(run)}${sep}`), `Peer outside fixture: ${location}`)
    assert.equal(location, realpathSync(require.resolve(`${name}/package.json`)))
    const { version, name: packageName } = JSON.parse(readFileSync(location, 'utf8'))
    peers[name] = { location, version, name: packageName }
  }
  const builder = createRequire(require.resolve('@nuxt/vite-builder/package.json'))
  const builderVite = realpathSync(builder.resolve('vite/package.json'))
  assert.equal(builderVite, peers.vite.location, 'Nuxt builder resolves a different Vite')
  assert.equal(peers.vite.name, '@voidzero-dev/vite-plus-core')
  const installed = JSON.parse(readFileSync(library, 'utf8'))
  assert.equal(installed.devDependencies, undefined)
  assert.equal(installed.scripts, undefined)
  assert.deepEqual(hashes(join(run, 'node_modules/unplugin-icons')), expected)
  return { peers, builderVite }
}
