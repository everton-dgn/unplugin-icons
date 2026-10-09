import { mkdtempSync } from 'node:fs'
import process from 'node:process'
import { defineConfig } from '@playwright/test'

const port = process.env.PORT || '4179'
export default defineConfig({
  testMatch: '**/*.e2e.ts',
  workers: 1,
  retries: 0,
  outputDir: mkdtempSync('./node_modules/playwright-'),
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true },
  webServer: {
    command: 'node .output/server/index.mjs',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    env: { PORT: port, HOST: '127.0.0.1' },
  },
})
