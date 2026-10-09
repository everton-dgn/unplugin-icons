import { execFileSync, fork } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

async function main() {
  if (!process.argv[2])
    throw new Error('Usage: node verify.mjs RUN_DIR')
  const run = resolve(process.argv[2])
  if (existsSync(join(run, 'dist')))
    throw new Error('Use a fresh prepared run; existing build artifacts are retained')
  const fixture = dirname(fileURLToPath(import.meta.url))
  const require = createRequire(join(run, 'package.json'))
  const env = {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(fixture, 'node_modules/browsers'),
    PLAYWRIGHT_SKIP_BROWSER_GC: '1',
  }
  function command(binary, args) {
    execFileSync(binary, args, { cwd: run, env, stdio: 'inherit' })
  }
  command('bun', ['run', 'typecheck'])
  command('bun', ['run', 'build'])
  command(process.execPath, [require.resolve('@playwright/test/cli'), 'install', 'chromium', '--only-shell'])
  // Binding port 0 after builds avoids a port reservation/release race.
  const server = fork(join(run, 'server.mjs'), [], { cwd: run, env, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] })
  try {
    const port = await new Promise((resolve, reject) => {
      server.once('message', message => resolve(message.port))
      server.once('error', reject)
      server.once('exit', code => reject(new Error(`Server exited before readiness: ${code}`)))
    })
    env.BASE_URL = `http://127.0.0.1:${port}`
    command(process.execPath, [require.resolve('@playwright/test/cli'), 'test'])
  }
  finally {
    if (server.connected) {
      const closed = new Promise(resolve => server.once('exit', resolve))
      server.send('close')
      await closed
    }
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
