import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

async function main() {
  if (!process.argv[2])
    throw new Error('Pass the frozen test/frameworks/vue directory as the first argument')
  const fixture = resolve(process.argv[2])
  if (!existsSync(join(fixture, 'vapor/bun.lock')))
    throw new Error('Missing frozen Vapor bun.lock')
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const run = mkdtempSync(join(tmpdir(), 'vapor-ssr-runtime-'))
  const base = process.env.UNPLUGIN_ICONS_BACKUP_DIR || join(tmpdir(), 'unplugin-icons-backups')
  mkdirSync(base, { recursive: true })
  const backup = mkdtempSync(join(base, 'vapor-ssr-'))
  cpSync(join(fixture, 'vapor'), run, { recursive: true })
  const { preparePackage } = await import(pathToFileURL(join(fixture, 'package.mjs')).href)
  await preparePackage(repo, run, backup)
  execFileSync('bun', ['install', '--frozen-lockfile'], { cwd: run, stdio: 'inherit' })
  cpSync(join(fixture, 'audit.mjs'), join(run, 'audit.mjs'))
  execFileSync('node', ['audit.mjs', repo], { cwd: run, stdio: 'inherit' })
  process.stdout.write(`RUN_DIR=${run}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
