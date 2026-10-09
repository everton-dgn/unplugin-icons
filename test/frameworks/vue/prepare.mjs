import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { preparePackage } from './package.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')
const variant = process.argv.includes('--vapor') ? 'vapor' : 'stable'
const frozen = !process.argv.includes('--refresh-lock')
if (frozen && !existsSync(join(here, variant, 'bun.lock')))
  throw new Error('Missing bun.lock; restore it or explicitly use --refresh-lock')
const run = mkdtempSync(join(realpathSync(tmpdir()), `unplugin-icons-vue-${variant}-`))
const backup = join(process.env.UNPLUGIN_ICONS_BACKUP_DIR || join(tmpdir(), 'unplugin-icons-backups'), new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15))
mkdirSync(backup, { recursive: true })
cpSync(join(here, 'fixture'), run, { recursive: true })
cpSync(run, mkdtempSync(join(backup, 'vue-base-')), { recursive: true })
cpSync(join(here, variant), run, { recursive: true })
cpSync(join(here, 'audit.mjs'), join(run, 'audit.mjs'))
process.stdout.write(`RUN_DIR=${run}\n`)
preparePackage(repo, run, backup)
if (!frozen && existsSync(join(run, 'bun.lock')))
  cpSync(join(run, 'bun.lock'), join(mkdtempSync(join(backup, 'vue-lock-')), 'bun.lock'))
execFileSync('bun', ['install', ...(frozen ? ['--frozen-lockfile'] : [])], { cwd: run, stdio: 'inherit' })
execFileSync('node', [join(run, 'audit.mjs'), repo], { cwd: run, stdio: 'inherit' })
process.stdout.write(`RUN_DIR=${run}\n`)
