import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

async function main() {
  const run = resolve(process.argv[2] || '')
  const runtime = process.argv[3] || 'bun'
  const require = createRequire(resolve(run, 'package.json'))
  if (!process.argv[2] || !['node', 'bun'].includes(runtime))
    throw new Error('Usage: node verify.mjs RUN_DIR [node|bun]')
  if (existsSync(resolve(run, 'build')))
    throw new Error('Use a freshly prepared run directory to preserve previous builds')
  const env = {
    ...process.env,
    RUNTIME: runtime,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? resolve(dirname(fileURLToPath(import.meta.url)), 'node_modules/browsers'),
    PLAYWRIGHT_SKIP_BROWSER_GC: '1',
  }
  function command(program, args) {
    execFileSync(program, args, { cwd: run, env, stdio: 'inherit' })
  }
  command(runtime, [resolve(run, 'audit.mjs'), resolve(dirname(fileURLToPath(import.meta.url)), '../../..')])
  command('node', [resolve(run, 'node_modules/@sveltejs/kit/svelte-kit.js'), 'sync'])
  command('node', [resolve(run, 'node_modules/svelte-check/bin/svelte-check'), '--tsconfig', './tsconfig.json'])
  const core = require('vite/package.json').name === '@voidzero-dev/vite-plus-core'
  command(runtime, [core ? 'node_modules/vite/dist/vite/node/cli.js' : 'node_modules/vite/bin/vite.js', 'build'])
  command('node', [require.resolve('@playwright/test/cli'), 'install', 'chromium', '--only-shell'])
  command('node', [resolve(dirname(fileURLToPath(import.meta.url)), 'browser.mjs'), run])
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
