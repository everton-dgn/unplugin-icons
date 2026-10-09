import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { join, resolve } from 'node:path'
import process from 'node:process'

async function main() {
  const run = resolve(process.argv[2])
  const require = createRequire(join(run, 'package.json'))
  for (let attempt = 1; attempt <= 3; attempt++) {
    const output = mkdtempSync(join(run, 'node_modules/browser-attempt-'))
    const server = createServer()
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const port = server.address().port
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    const result = spawnSync('node', [require.resolve('@playwright/test/cli'), 'test', '--config', join(run, 'playwright.config.ts'), '--output', join(output, 'results')], {
      cwd: run,
      env: { ...process.env, PORT: String(port) },
      encoding: 'utf8',
    })
    const log = (result.stdout || '') + (result.stderr || '')
    writeFileSync(join(output, 'browser.log'), log, { flag: 'wx' })
    process.stdout.write(log)
    if (result.error)
      throw result.error
    if (result.status === 0)
      break
    const url = `http://127.0.0.1:${port}${process.env.MODE === 'csr' ? '/csr' : ''}`
    const collision = log.includes('EADDRINUSE') || log.includes(`${url} is already used`)
    if (!collision || attempt === 3)
      throw new Error(`Browser attempt ${attempt} failed (exit ${result.status}); retained output: ${output}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
