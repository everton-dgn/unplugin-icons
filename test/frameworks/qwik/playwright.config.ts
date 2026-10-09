import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: '**/*.e2e.ts',
  outputDir: 'results',
  workers: 1,
  retries: 0,
  use: { headless: true, trace: 'retain-on-failure' },
})
