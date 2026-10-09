import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const run = dirname(fileURLToPath(import.meta.url))
const require = createRequire(join(run, 'package.json'))
const installed = dirname(require.resolve('unplugin-icons/package.json'))
const extracted = join(run, 'package')
function files(directory, prefix = '') {
  return readdirSync(join(directory, prefix), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(directory, join(prefix, entry.name)) : [join(prefix, entry.name)]).sort()
}
function digest(directory, entries) {
  const hash = createHash('sha256')
  for (const file of entries)
    hash.update(file).update('\0').update(readFileSync(join(directory, file)))
  return hash.digest('hex')
}
function local(path) {
  const actual = realpathSync(path)
  assert(actual.startsWith(`${realpathSync(run)}${sep}`), `Resolved outside fixture: ${actual}`)
  return actual
}
const entries = ['dist', 'types'].flatMap(part => files(extracted, part))
assert.deepEqual(['dist', 'types'].flatMap(part => files(installed, part)), entries)
const extractedHash = digest(extracted, entries)
const installedHash = digest(installed, entries)
assert.equal(installedHash, extractedHash, 'Installed code/types differ from fresh package')
const manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'))
assert.equal(manifest.devDependencies, undefined)
assert.equal(manifest.scripts, undefined)
const peer = createRequire(require.resolve('unplugin-icons/vite'))
const version = require('vue').version
const expected = require('./package.json').workspaces.catalog.vue

assert.equal(version, expected)
const peers = ['vue', '@vue/compiler-sfc', '@vue/server-renderer', 'vite']
if (version.includes('3.6.'))
  peers.push('@vue/compiler-vapor')
const paths = Object.fromEntries(peers.map((name) => {
  const path = local(peer.resolve(name))
  assert.equal(path, local(require.resolve(name)))
  return [name, path]
}))
const report = { runtime: process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.versions.node}`, version, package: local(installed), paths, files: entries.length, extractedHash, installedHash }
assert(!realpathSync(run).startsWith(`${realpathSync(process.argv[2])}${sep}`), 'Run must be outside checkout')
const output = join(mkdtempSync(join(run, 'audit-')), 'provenance.json')
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(report, null, 2)}\nAUDIT=${output}\n`)
