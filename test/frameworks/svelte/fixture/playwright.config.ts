import { mkdtempSync } from 'node:fs'
import process from 'node:process'
import { defineConfig } from '@playwright/test'

const port = process.env.PORT || '4179'
const runtime = process.env.RUNTIME === 'bun' ? 'bun' : 'node'
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.{ts,js}',
  workers: 1,
  retries: 0,
  outputDir: mkdtempSync('./node_modules/playwright-'),
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true },
  webServer: {
    cwd: process.cwd(),
    command: `${runtime} build/index.js`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    env: { HOST: '127.0.0.1', PORT: port, ORIGIN: `http://127.0.0.1:${port}` },
  },
})
