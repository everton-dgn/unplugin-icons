import { mkdtempSync } from 'node:fs'
import process from 'node:process'
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: '**/*.e2e.ts',
  outputDir: mkdtempSync('./node_modules/playwright-'),
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: process.env.BASE_URL, headless: true },
})
