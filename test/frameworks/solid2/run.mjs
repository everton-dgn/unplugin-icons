import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { backup } from './backup.mjs'
import { installPackage } from './install-package.mjs'

const fixture = fileURLToPath(new URL('.', import.meta.url))
const root = fileURLToPath(new URL('../../../', import.meta.url))
const run = mkdtempSync(join(tmpdir(), 'solid2-compat-'))
cpSync(fixture, run, { recursive: true })
const env = {
  ...process.env,
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || join(run, 'browsers'),
  PLAYWRIGHT_SKIP_BROWSER_GC: '1',
}
function command(binary, args, cwd = run) {
  const result = spawnSync(binary, args, { cwd, env, stdio: 'inherit' })
  assert.ifError(result.error)
  assert.equal(result.status, 0, `${binary} ${args.join(' ')}`)
}
process.stdout.write(`Retained fixture: ${run}\n`)
const dist = join(root, 'dist')
if (existsSync(dist)) {
  backup(dist)
  renameSync(dist, join(mkdtempSync(join(root, 'node_modules/.unplugin-icons-dist-')), 'dist'))
}
command('pnpm', ['exec', 'tsdown', '--no-clean', '--no-exports'], root)
command('pnpm', ['pack', '--pack-destination', run], root)
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
installPackage(join(run, `unplugin-icons-${version}.tgz`), run, process.env.BUN || 'bun')
const cli = join(run, 'node_modules/@playwright/test/cli.js')
command(process.execPath, [join(run, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json'])
command(process.execPath, [cli, 'install', 'chromium', '--only-shell'])
command(process.execPath, [cli, 'test', '--output', join(run, 'results')])
