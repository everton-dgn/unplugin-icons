import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { pack } from './artifact.mjs'
import { prepare, verify } from './isolation.mjs'

const fixture = dirname(fileURLToPath(import.meta.url))
const repo = resolve(fixture, '../../..')
const refresh = process.argv.includes('--refresh-lock')
if (!refresh && !existsSync(join(fixture, 'bun.lock')))
  throw new Error('Missing bun.lock; restore it or explicitly use --refresh-lock')
assert.equal(execFileSync('bun', ['--version'], { encoding: 'utf8' }).trim(), '1.4.2')
const run = mkdtempSync(join(tmpdir(), 'unplugin-web-components-'))
prepare(fixture, run, refresh)
const artifact = pack(repo, run)
execFileSync('bun', refresh ? ['install'] : ['install', '--frozen-lockfile'], { cwd: run, stdio: 'inherit' })
const provenance = verify(run, artifact.expected)
writeFileSync(join(run, 'provenance.json'), `${JSON.stringify({ ...artifact, provenance }, null, 2)}\n`, { flag: 'wx' })
process.stdout.write(`RUN_DIR=${run}\n`)
