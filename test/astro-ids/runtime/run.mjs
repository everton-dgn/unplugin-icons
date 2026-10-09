import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { extractArchive, pack } from './artifact.mjs'
import { prepare, verify } from './isolation.mjs'
import { withServer } from './servers.mjs'

async function main() {
  const fixture = dirname(fileURLToPath(import.meta.url))
  const root = resolve(fixture, '../../..')
  const run = mkdtempSync(join(tmpdir(), 'unplugin-astro-ids-'))
  console.warn(`Retained fixture: ${run}`)
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(root, 'node_modules/astro-browser-1.64.0')
  process.env.PLAYWRIGHT_SKIP_BROWSER_GC = '1'
  process.env.ASTRO_TELEMETRY_DISABLED = '1'
  process.env.ASTRO_IDS_CASE = process.argv.includes('--collision-only') ? 'collision' : 'full'
  if (process.argv.includes('--styles-only'))
    process.env.ASTRO_IDS_CASE = 'styles'
  process.env.BUN_INSTALL_CACHE_DIR = join(run, 'bun-cache')
  assert.equal(execFileSync('bun', ['--version'], { encoding: 'utf8' }).trim(), '1.4.2')
  const freshLock = process.argv.includes('--resolve-lock')
  prepare(fixture, run, freshLock)
  const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
  const lockHash = freshLock ? null : hash(join(run, 'bun.lock'))
  const catalogHash = hash(join(root, 'src/core/icon-sets.json'))
  const archiveIndex = process.argv.indexOf('--package-tarball')
  const source = archiveIndex === -1 ? null : resolve(process.argv[archiveIndex + 1])
  const artifact = source ? extractArchive(run, source) : pack(root, run)
  assert.equal(hash(join(root, 'src/core/icon-sets.json')), catalogHash)
  let commandIndex = 0
  function command(binary, args, env = process.env) {
    let output = ''
    console.warn([binary, ...args].join(' '))
    try {
      output = execFileSync(binary, args, { cwd: run, encoding: 'utf8', env, maxBuffer: 16 * 1024 * 1024 })
    }
    catch (error) {
      output = String(error.stdout || '') + String(error.stderr || '')
      throw error
    }
    finally {
      console.warn(output)
      writeFileSync(join(run, `command-${commandIndex++}.log`), output, { flag: 'wx' })
    }
  }
  command('bun', freshLock ? ['install'] : ['install', '--frozen-lockfile'])
  if (lockHash)
    assert.equal(hash(join(run, 'bun.lock')), lockHash)
  writeFileSync(join(run, 'evidence.json'), JSON.stringify({ source, archiveHash: hash(join(run, artifact.archive)), catalogHash, lockHash, ...artifact, peers: verify(run, artifact.expected) }, null, 2), { flag: 'wx' })
  command(process.execPath, ['node_modules/@playwright/test/cli.js', 'install', 'chromium', '--only-shell'])
  const failures = []
  for (const mode of ['dev', 'prod']) {
    if (mode === 'prod')
      command(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'])
    try {
      await withServer(run, mode, url => command(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], { ...process.env, ASTRO_TEST_URL: url }))
    }
    catch (error) {
      console.error(error)
      failures.push(mode)
    }
  }
  writeFileSync(join(run, 'results.json'), JSON.stringify({ failures }, null, 2), { flag: 'wx' })
  assert.deepEqual(failures, [], `Failed gates: ${failures.join(', ')}; retained: ${run}`)
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
