import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { backup, pack } from './artifact.mjs'
import { prepare, verify } from './isolation.mjs'
import { checkNegativeTypes } from './negative-types.mjs'
import { withServer } from './server.mjs'

async function main() {
  const fixture = dirname(fileURLToPath(import.meta.url))
  const root = resolve(fixture, '../../..')
  const run = mkdtempSync(join(tmpdir(), 'unplugin-ember-runtime-'))
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(root, 'node_modules/ember-browser-1.64.0')
  process.env.PLAYWRIGHT_SKIP_BROWSER_GC = '1'
  console.warn(`Retained fixture: ${run}`)
  let index = 0
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
      writeFileSync(join(run, `command-${index++}.log`), output, { flag: 'wx' })
    }
  }
  assert.equal(execFileSync('bun', ['--version'], { encoding: 'utf8' }).trim(), '1.4.2')
  const freshLock = process.argv.includes('--resolve-lock')
  if (freshLock && existsSync(join(fixture, 'bun.lock')))
    backup(join(fixture, 'bun.lock'), 'bun.lock')
  prepare(fixture, run, freshLock)
  const catalog = readFileSync(join(root, 'src/core/icon-sets.json'))
  mkdirSync(join(root, 'dist'), { recursive: true })
  const stale = `stale-${randomUUID()}.txt`
  writeFileSync(join(root, 'dist', stale), 'Must not enter the next package', { flag: 'wx' })
  const artifact = pack(root, run)
  assert(!existsSync(join(run, 'package/dist', stale)))
  assert(existsSync(join(artifact.retainedDist, stale)))
  assert.deepEqual(readFileSync(join(root, 'src/core/icon-sets.json')), catalog)
  command('bun', freshLock ? ['install'] : ['install', '--frozen-lockfile'])
  const dependencies = verify(run, artifact.expected)
  writeFileSync(join(run, 'evidence.json'), JSON.stringify({ ...artifact, dependencies, stale }, null, 2), { flag: 'wx' })
  const failures = []
  for (const [gate, config] of [['upstream-types', 'tsconfig.upstream.json'], ['typecheck', 'tsconfig.json']]) {
    try {
      command(process.execPath, ['node_modules/@glint/ember-tsc/bin/ember-tsc.js', '--noEmit', '-p', config])
    }
    catch {
      failures.push(gate)
    }
  }
  try {
    checkNegativeTypes(run)
  }
  catch (error) {
    console.error(error.message)
    failures.push('negative-types')
  }
  command(process.execPath, ['build.mjs'])
  command(process.execPath, ['node_modules/@playwright/test/cli.js', 'install', 'chromium', '--only-shell'])
  await withServer(run, url => command(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], { ...process.env, EMBER_TEST_URL: url }))
  writeFileSync(join(run, 'results.json'), JSON.stringify({ failures, runtime: 'passed' }, null, 2), { flag: 'wx' })
  assert.deepEqual(failures, [], `Failed gates: ${failures}; retained: ${run}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
