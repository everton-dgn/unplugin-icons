import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { runtimeGates } from './runtime-gates.mjs'

afterEach(() => vi.restoreAllMocks())

it.each(['browser', 'dev', 'build', 'prod'] as const)('retains type failures and reports a %s failure', async (failed) => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const run = mkdtempSync(join(tmpdir(), 'astro-runtime-failure-'))
  const called: string[] = []
  const commands = Object.fromEntries(['browser', 'dev', 'build', 'prod'].map(phase => [phase, () => {
    called.push(phase)
    if (phase === failed) {
      const error = new Error(`Injected ${phase} failure`)
      if (phase === 'prod')
        return Promise.reject(error)
      throw error
    }
    return Promise.resolve()
  }]))

  await expect(runtimeGates(run, commands, ['types-consumer'])).rejects.toThrow(`Failed gates: types-consumer, ${failed}`)
  const report = JSON.parse(readFileSync(join(run, 'results.json'), 'utf8'))
  expect(report.failures).toEqual(['types-consumer', failed])
  expect(report.runtime).toBe('failed')
  expect(called).toEqual(failed === 'browser' ? ['browser', 'build'] : failed === 'build' ? ['browser', 'dev', 'build'] : ['browser', 'dev', 'build', 'prod'])
})

it.each([{ failures: [] }, { failures: ['types-upstream'] }])('records completed runtime without discarding existing failures: $failures', async ({ failures }) => {
  const run = mkdtempSync(join(tmpdir(), 'astro-runtime-success-'))
  const commands = { browser: async () => {}, dev: async () => {}, build: async () => {}, prod: async () => {} }
  const result = runtimeGates(run, commands, failures)
  if (failures.length)
    await expect(result).rejects.toThrow('Failed gates: types-upstream')
  else
    await result
  expect(JSON.parse(readFileSync(join(run, 'results.json'), 'utf8'))).toEqual({ failures, runtime: 'dev and prod completed' })
})
