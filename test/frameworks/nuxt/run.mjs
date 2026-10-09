import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { pack } from './artifact.mjs'
import { prepare, verify } from './isolation.mjs'

const fixture = dirname(fileURLToPath(import.meta.url))
const root = resolve(fixture, '../../..')
assert.equal(execFileSync('bun', ['--version'], { encoding: 'utf8' }).trim(), '1.4.2')
const run = mkdtempSync(join(tmpdir(), 'unplugin-nuxt-runtime-'))
console.warn(`Retained fixture: ${run}`)
const freshLock = process.argv.includes('--resolve-lock')
prepare(fixture, run, freshLock)
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const catalog = join(root, 'src/core/icon-sets.json')
const catalogHash = hash(catalog)
const artifact = pack(root, run)
assert.equal(hash(catalog), catalogHash)
const lockHash = freshLock ? null : hash(join(run, 'bun.lock'))
const env = {
  ...process.env,
  NUXT_TELEMETRY_DISABLED: '1',
  BUN_INSTALL_CACHE_DIR: join(run, 'bun-cache'),
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(root, 'node_modules/nuxt-browser-1.64.0'),
  PLAYWRIGHT_SKIP_BROWSER_GC: '1',
}
const command = (binary, args) => execFileSync(binary, args, { cwd: run, env, stdio: 'inherit' })
command('bun', freshLock ? ['install'] : ['install', '--frozen-lockfile'])
if (lockHash)
  assert.equal(hash(join(run, 'bun.lock')), lockHash)
writeFileSync(join(run, 'evidence.json'), JSON.stringify({ catalogHash, lockHash, ...artifact, ...verify(run, artifact.expected) }, null, 2), { flag: 'wx' })
const require = createRequire(join(run, 'package.json'))
const nuxt = join(dirname(require.resolve('nuxt/package.json')), require('nuxt/package.json').bin.nuxt)

command(process.execPath, [nuxt, 'prepare'])
command(process.execPath, ['check-types.mjs'])
command(process.execPath, [nuxt, 'typecheck'])
command(process.execPath, [nuxt, 'build'])
command(process.execPath, [require.resolve('@playwright/test/cli'), 'install', 'chromium', '--only-shell'])
command(process.execPath, ['browser.mjs', run])
