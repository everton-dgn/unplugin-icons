import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { expect, test } from '@playwright/test'

test('direct tilde component and raw aliases compile with the Marko plugin', () => {
  const result = spawnSync(process.execPath, ['alias-probe.mjs'], { encoding: 'utf8' })
  const log = (result.stdout || '') + (result.stderr || '')
  writeFileSync(join(mkdtempSync('node_modules/alias-probe-'), 'build.log'), log, { flag: 'wx' })
  expect(result.status, log).toBe(0)
})
