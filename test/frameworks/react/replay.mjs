import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { backup, hashes } from './artifact.mjs'
import { prepare, verify } from './isolation.mjs'

assert(process.argv[2], 'Pass a completed run directory')
const source = resolve(process.argv[2])
const run = mkdtempSync(join(tmpdir(), 'unplugin-react-replay-'))
prepare(source, run)
const before = hashes(join(run, 'package'))
const lock = readFileSync(join(run, 'bun.lock'))
const target = join(run, 'package/dist/vite.mjs')
const previous = backup(target, 'vite.mjs')
appendFileSync(target, '\n// Fixture replay: changed bytes with the same package version.\n')
execFileSync('tar', ['-czf', 'modified.tgz', 'package'], { cwd: run })
mkdirSync(join(run, 'repacked'))
execFileSync('tar', ['-xzf', 'modified.tgz', '-C', 'repacked', '--strip-components=1'], { cwd: run })
const expected = hashes(join(run, 'repacked'))
assert.notEqual(before['dist/vite.mjs'], expected['dist/vite.mjs'])
for (const name of Object.keys(before)) {
  if (name !== 'dist/vite.mjs')
    assert.equal(before[name], expected[name])
}
execFileSync('bun', ['install', '--frozen-lockfile'], { cwd: run, stdio: 'inherit' })
assert.deepEqual(readFileSync(join(run, 'bun.lock')), lock)
const peers = verify(run, expected)
writeFileSync(join(run, 'replay-evidence.json'), `${JSON.stringify({ previous, before, expected, peers }, null, 2)}\n`, { flag: 'wx' })
console.warn(`Frozen replay passed; retained fixture: ${run}`)
