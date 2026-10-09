import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { pack } from './artifact.mjs'
import { prepare, verify } from './isolation.mjs'

const fixture = dirname(fileURLToPath(import.meta.url))
const root = resolve(fixture, '../../..')
const run = mkdtempSync(join(tmpdir(), 'unplugin-preact-runtime-'))
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(run, 'browsers')
process.env.PLAYWRIGHT_SKIP_BROWSER_GC = '1'
console.warn('Retained fixture:', run)
const bun = process.env.BUN || 'bun'
assert.equal(execFileSync(bun, ['--version'], { encoding: 'utf8' }).trim(), '1.4.2')
prepare(fixture, run)
const artifact = pack(root, run)
execFileSync(bun, ['install', '--frozen-lockfile'], { cwd: run, stdio: 'inherit' })
const peers = verify(run, artifact.expected)
writeFileSync(join(run, 'evidence.json'), JSON.stringify({ ...artifact, peers }, null, 2), { flag: 'wx' })
function command(args) {
  execFileSync(process.execPath, args, { cwd: run, stdio: 'inherit' })
}
command(['node_modules/typescript/bin/tsc', '--project', 'tsconfig.json'])
command(['node_modules/@playwright/test/cli.js', 'install', 'chromium', '--only-shell'])
command(['node_modules/@playwright/test/cli.js', 'test', '--output', join(run, 'results')])
