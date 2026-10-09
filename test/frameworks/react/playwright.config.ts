import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { defineConfig } from '@playwright/test'

const port = Number(process.env.PORT || 4187)
export default defineConfig({
  testMatch: '**/*.e2e.ts',
  outputDir: `node_modules/results-${randomUUID()}`,
  workers: 1,
  retries: 0,
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true },
  webServer: {
    command: 'node server.mjs',
    url: `http://127.0.0.1:${port}`,
    env: { PORT: String(port) },
    reuseExistingServer: false,
  },
})
