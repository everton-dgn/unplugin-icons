import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: '**/*.e2e.ts',
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'results.json' }]],
  use: { headless: true },
})
