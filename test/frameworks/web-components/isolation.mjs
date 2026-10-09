import assert from 'node:assert/strict'
import { cpSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, sep } from 'node:path'
import { hashes } from './artifact.mjs'

const tools = ['unplugin-icons', 'typescript', 'vite', 'vite-plus', '@playwright/test']

export function prepare(fixture, run, refresh) {
  const require = createRequire(join(run, 'package.json'))
  for (const name of [...tools, 'vue', 'react', 'svelte', '@svgr/core', '@svgr/plugin-jsx', '@vue/compiler-sfc', '@vue/compiler-vapor', '@svgx/core'])
    assert.throws(() => require.resolve(name), { code: 'MODULE_NOT_FOUND' }, `Inherited package: ${name}`)
  for (const name of readdirSync(fixture)) {
    if (['node_modules', 'README.md', 'prepare.mjs', 'verify.mjs'].includes(name) || (refresh && name === 'bun.lock'))
      continue
    cpSync(join(fixture, name), join(run, name), { recursive: true, errorOnExist: true, force: false })
  }
}

export function verify(run, expected) {
  const require = createRequire(join(run, 'package.json'))
  const provenance = {}
  for (const name of tools) {
    const path = realpathSync(require.resolve(`${name}/package.json`))
    assert(path.startsWith(`${realpathSync(run)}${sep}`), `Package outside fixture: ${path}`)
    provenance[name] = { path, version: JSON.parse(readFileSync(path, 'utf8')).version }
  }
  const packagePath = require.resolve('unplugin-icons/package.json')
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'))
  assert.equal(manifest.devDependencies, undefined)
  assert.equal(manifest.scripts, undefined)
  assert.deepEqual(hashes(dirname(packagePath)), expected)
  const fromPackage = createRequire(packagePath)
  for (const name of ['local-pkg', '@iconify/utils', 'unplugin'])
    assert(realpathSync(fromPackage.resolve(name)).startsWith(`${realpathSync(run)}${sep}`))
  return provenance
}
