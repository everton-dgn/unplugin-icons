import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

async function main() {
  if (!process.argv[2])
    throw new Error('Usage: node verify.mjs RUN_DIR [bun|node]')
  const here = dirname(fileURLToPath(import.meta.url))
  const run = resolve(process.argv[2])
  const runtime = process.argv[3] || 'bun'
  if (!['bun', 'node'].includes(runtime) || existsSync(resolve(run, 'dist')))
    throw new Error('Use bun/node and a fresh run directory')
  const require = createRequire(resolve(run, 'package.json'))
  const env = {
    ...process.env,
    RUNTIME: runtime,
    MODE: process.argv.includes('--client-only') ? 'csr' : 'ssr',
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? resolve(here, 'node_modules/browsers'),
    PLAYWRIGHT_SKIP_BROWSER_GC: '1',
  }
  function command(program, args) {
    execFileSync(program, args, { cwd: run, env, stdio: 'inherit' })
  }
  command(runtime, [resolve(run, 'audit.mjs'), resolve(here, '../../..')])
  command('node', [resolve(run, 'node_modules/vue-tsc/bin/vue-tsc.js'), '--noEmit'])
  command(runtime, ['build.mjs'])
  if (env.MODE === 'ssr')
    command(runtime, ['--input-type=module', '--eval', 'await import("./dist/server/entry-server.js")'])
  command('node', [require.resolve('@playwright/test/cli'), 'install', 'chromium', '--only-shell'])
  command('node', [resolve(here, 'browser.mjs'), run])
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
