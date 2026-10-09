import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { preparePackage } from './package.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')
const native = process.argv.includes('--native')
const lock = native ? 'pnpm-lock.yaml' : 'bun.lock'
const frozen = !process.argv.includes('--refresh-lock')
if (frozen && !existsSync(join(here, native ? 'fixture' : 'vite-plus', lock)))
  throw new Error(`Missing ${lock}; restore the fixture lockfile or explicitly use --refresh-lock`)
const run = mkdtempSync(join(realpathSync(tmpdir()), 'unplugin-icons-svelte-'))
cpSync(join(here, 'fixture'), run, { recursive: true, filter: path => native || !path.endsWith('pnpm-lock.yaml') })
const backupRoot = process.env.UNPLUGIN_ICONS_BACKUP_DIR || join(tmpdir(), 'unplugin-icons-backups')
const backup = join(backupRoot, new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15))
mkdirSync(backup, { recursive: true })
if (!native) {
  cpSync(run, mkdtempSync(join(backup, 'svelte-vite-plus-')), { recursive: true })
  cpSync(join(here, 'vite-plus'), run, { recursive: true })
  writeFileSync(join(run, 'pnpm-workspace.yaml'), 'packages: [.]\nstrictPeerDependencies: false\n')
}
process.stdout.write(`RUN_DIR=${run}\n`)
preparePackage(repo, run, backup)
cpSync(join(here, 'audit.mjs'), join(run, 'audit.mjs'))
if (!frozen && existsSync(join(run, lock)))
  cpSync(join(run, lock), join(mkdtempSync(join(backup, 'svelte-lock-')), lock))
execFileSync(native ? 'pnpm' : 'bun', ['install', ...(frozen ? ['--frozen-lockfile'] : [])], { cwd: run, stdio: 'inherit' })
execFileSync('node', [join(run, 'audit.mjs'), repo], { cwd: run, stdio: 'inherit' })
process.stdout.write(`RUN_DIR=${run}\n`)
