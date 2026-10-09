import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { defineConfig } from '@playwright/test'

const cases = { collision: '**/collision.e2e.ts', styles: '**/{styles,paint,cdata}.e2e.ts' }

export default defineConfig({
  testMatch: cases[process.env.ASTRO_IDS_CASE as keyof typeof cases] || '**/*.e2e.ts',
  outputDir: `node_modules/results-${randomUUID()}`,
  workers: 1,
  retries: 0,
  use: { baseURL: process.env.ASTRO_TEST_URL, headless: true, javaScriptEnabled: false },
})
