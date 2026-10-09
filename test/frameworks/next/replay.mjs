import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { backup, hashes } from './artifact.mjs'
import { prepare, verify } from './isolation.mjs'

assert(process.argv[2], 'Pass a completed run directory')
assert.equal(execFileSync('bun', ['--version'], { encoding: 'utf8' }).trim(), '1.4.2')
const source = resolve(process.argv[2])
const run = mkdtempSync(join(tmpdir(), 'unplugin-next-replay-'))
prepare(source, run)
const manifest = readFileSync(join(run, 'package/package.json'))
const version = JSON.parse(manifest).version
const before = hashes(join(run, 'package'))
const lock = readFileSync(join(run, 'bun.lock'))
const target = join(run, 'package/dist/webpack.mjs')
const previous = backup(target, 'webpack.mjs')
appendFileSync(target, '\n// Fixture replay: changed bytes with the same package version.\n')
const expected = hashes(join(run, 'package'))
assert.deepEqual(readFileSync(join(run, 'package/package.json')), manifest)
assert.notEqual(before['dist/webpack.mjs'], expected['dist/webpack.mjs'])
for (const name of Object.keys(before)) {
  if (name !== 'dist/webpack.mjs')
    assert.equal(before[name], expected[name])
}
execFileSync('bun', ['install', '--frozen-lockfile'], { cwd: run, stdio: 'inherit' })
assert.deepEqual(readFileSync(join(run, 'bun.lock')), lock)
const peers = verify(run, expected)
writeFileSync(join(run, 'replay-evidence.json'), `${JSON.stringify({ strategy: 'file:directory', version, previous, before, expected, peers }, null, 2)}\n`, { flag: 'wx' })
console.warn(`Frozen replay passed; retained fixture: ${run}`)
