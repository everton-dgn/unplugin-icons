import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import process from 'node:process'

const run = resolve(process.argv[2])
const require = createRequire(join(run, 'package.json'))
execFileSync('node', [require.resolve('@playwright/test/cli'), 'test', '--config', join(run, 'playwright.config.ts')], {
  cwd: run,
  env: process.env,
  stdio: 'inherit',
})
