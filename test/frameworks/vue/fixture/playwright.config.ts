import { mkdtempSync } from 'node:fs'
import process from 'node:process'
import { defineConfig } from '@playwright/test'

const port = process.env.PORT || '4179'
const runtime = process.env.RUNTIME === 'bun' ? 'bun' : 'node'
const clientOnly = process.env.MODE === 'csr'
export default defineConfig({
  testDir: './tests',
  testMatch: clientOnly ? '**/vapor-client.e2e.ts' : '**/{runtime,ids-characterization}.e2e.ts',
  workers: 1,
  retries: 0,
  outputDir: mkdtempSync('./node_modules/playwright-'),
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true },
  webServer: {
    cwd: process.cwd(),
    command: `${runtime} server.mjs`,
    url: `http://127.0.0.1:${port}${clientOnly ? '/csr' : ''}`,
    reuseExistingServer: false,
    env: { PORT: port },
  },
})
