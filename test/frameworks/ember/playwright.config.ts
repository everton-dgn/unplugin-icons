import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: '**/*.e2e.ts',
  outputDir: `node_modules/results-${randomUUID()}`,
  workers: 1,
  retries: 0,
  use: { baseURL: process.env.EMBER_TEST_URL, headless: true },
})
