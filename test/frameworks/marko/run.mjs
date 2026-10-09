import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { backup, pack } from './artifact.mjs'
import { prepare, verify } from './isolation.mjs'

const fixture = dirname(fileURLToPath(import.meta.url))
const root = resolve(fixture, '../../..')
assert.equal(execFileSync('bun', ['--version'], { encoding: 'utf8' }).trim(), '1.4.2')
const run = mkdtempSync(join(tmpdir(), 'unplugin-marko-runtime-'))
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(root, 'node_modules/marko-browser-1.64.0')
process.env.PLAYWRIGHT_SKIP_BROWSER_GC = '1'
console.warn(`Retained fixture: ${run}`)
const freshLock = process.argv.includes('--resolve-lock')
if (freshLock)
  backup(join(fixture, 'bun.lock'), 'bun.lock')
prepare(fixture, run, freshLock)
const artifact = pack(root, run)
function command(binary, args) {
  execFileSync(binary, args, { cwd: run, stdio: 'inherit' })
}
command('bun', freshLock ? ['install'] : ['install', '--frozen-lockfile'])
const peers = verify(run, artifact.expected)
writeFileSync(join(run, 'evidence.json'), JSON.stringify({ ...artifact, peers }, null, 2), { flag: 'wx' })
command(process.execPath, ['build.mjs'])
command(process.execPath, ['node_modules/@playwright/test/cli.js', 'install', 'chromium', '--only-shell'])
command(process.execPath, ['browser.mjs', run])
