import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { backup, pack } from './artifact.mjs'
import { prepare, verify } from './isolation.mjs'
import { checkTypes } from './type-gates.mjs'

const fixture = dirname(fileURLToPath(import.meta.url))
const root = resolve(fixture, '../../..')
const args = process.argv.slice(2)
for (const arg of args)
  assert(['--native-vite', '--resolve-lock', '--print-profile'].includes(arg), `Unknown option: ${arg}`)
assert.equal(new Set(args).size, args.length, 'Duplicate options are not allowed')
const freshLock = args.includes('--resolve-lock')
const vitePlus = !args.includes('--native-vite')
const profile = vitePlus ? join(fixture, 'vite-plus') : fixture
if (args.includes('--print-profile')) {
  process.stdout.write(JSON.stringify({
    name: vitePlus ? 'vite-plus' : 'native-vite',
    manifest: join(profile, 'package.json'),
    lock: join(profile, 'bun.lock'),
    install: freshLock ? ['install'] : ['install', '--frozen-lockfile'],
  }, null, 2))
  process.exit(0)
}
const run = mkdtempSync(join(tmpdir(), 'unplugin-qwik-runtime-'))
console.warn(`Retained fixture: ${run}`)
const env = { ...process.env, PLAYWRIGHT_SKIP_BROWSER_GC: '1', PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(fixture, 'node_modules/browsers') }
function command(binary, args, label, cwd = run, collectFailure = false) {
  const result = spawnSync(binary, args, { cwd, env, encoding: 'utf8' })
  const output = `${result.stdout || ''}${result.stderr || ''}`
  writeFileSync(join(run, `${label}.log`), output, { flag: 'wx' })
  process.stdout.write(output)
  assert.ifError(result.error)
  assert.equal(result.signal, null, `${label} terminated by ${result.signal}; evidence: ${run}`)
  assert.notEqual(result.status, null, `${label} returned no exit status; evidence: ${run}`)
  if (!collectFailure)
    assert.equal(result.status, 0, `${label} failed; evidence: ${run}`)
  return result.status
}
assert.equal(spawnSync('bun', ['--version'], { encoding: 'utf8' }).stdout.trim(), '1.4.2')
prepare(fixture, run, freshLock, vitePlus)
const artifact = pack(root, run)
const lock = freshLock ? undefined : readFileSync(join(run, 'bun.lock'))
command('bun', freshLock ? ['install'] : ['install', '--frozen-lockfile'], 'install')
if (lock)
  assert.deepEqual(readFileSync(join(run, 'bun.lock')), lock)
const peers = verify(run, artifact.expected)
writeFileSync(join(run, 'evidence.json'), `${JSON.stringify({ node: process.version, artifact, peers }, null, 2)}\n`, { flag: 'wx' })
if (freshLock) {
  if (existsSync(join(profile, 'bun.lock')))
    backup(join(profile, 'bun.lock'), 'bun.lock')
  cpSync(join(run, 'bun.lock'), join(profile, 'bun.lock'))
}
const types = checkTypes(run, command)
command(process.execPath, ['build.mjs'], 'client-build')
command(process.execPath, ['build.mjs', '--ssr'], 'ssr-build')
command(process.execPath, ['node_modules/@playwright/test/cli.js', 'install', 'chromium', '--only-shell'], 'chromium-install')
command(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], 'browser')
assert.deepEqual(verify(run, artifact.expected), peers)
writeFileSync(join(run, 'result.json'), `${JSON.stringify({ ...types, runtime: 'passed' }, null, 2)}\n`, { flag: 'wx' })
