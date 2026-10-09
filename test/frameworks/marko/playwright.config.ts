import { mkdtempSync } from 'node:fs'
import process from 'node:process'
import { defineConfig } from '@playwright/test'

const port = process.env.PORT || '4189'
export default defineConfig({
  testMatch: '**/*.e2e.ts',
  workers: 1,
  retries: 0,
  outputDir: mkdtempSync('./node_modules/playwright-'),
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true },
  webServer: {
    command: 'node server.mjs',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
})
