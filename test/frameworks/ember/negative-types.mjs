import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'

const directives = /^\s*(?:\/\/ @ts-expect-error[^\n]*|\{\{! @glint-expect-error[^\n]*\}\})\r?$/gm
const diagnosticLine = /^(.+)\(\d+,\d+\): error TS(\d+):/gm
const diagnosticCode = /error TS\d+:/g

export function checkNegativeTypes(run) {
  const directory = mkdtempSync(join(run, 'negative-types-'))
  const source = readFileSync(join(run, 'types/contract.gts'), 'utf8')
  assert.equal([...source.matchAll(directives)].length, 4)
  const contract = join(directory, 'contract.gts')
  writeFileSync(contract, source.replace(directives, ''), { flag: 'wx' })
  const config = join(directory, 'tsconfig.json')
  writeFileSync(config, JSON.stringify({
    extends: '../tsconfig.json',
    include: ['./contract.gts'],
  }, null, 2), { flag: 'wx' })
  const args = ['node_modules/@glint/ember-tsc/bin/ember-tsc.js', '--noEmit', '--pretty', 'false', '-p', config]
  const result = spawnSync(process.execPath, args, {
    cwd: run,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  const output = `${result.stdout || ''}${result.stderr || ''}`
  const diagnostics = [...output.matchAll(diagnosticLine)]
  writeFileSync(join(directory, 'diagnostics.log'), output, { flag: 'wx' })
  writeFileSync(join(directory, 'result.json'), JSON.stringify({
    command: [process.execPath, ...args],
    exit: result.status,
    signal: result.signal,
    error: result.error?.message,
    diagnostics: diagnostics.map(match => ({ file: match[1], code: Number(match[2]) })),
  }, null, 2), { flag: 'wx' })
  console.warn(`Retained negative type gate: ${directory}`)
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  assert.equal(result.status, 2, output)
  assert.equal((output.match(diagnosticCode) || []).length, 4, output)
  assert.equal(diagnostics.length, 4, output)
  for (const diagnostic of diagnostics)
    assert.equal(resolve(run, diagnostic[1]), contract, output)
  assert.deepEqual(diagnostics.map(match => Number(match[2])).sort(), [2322, 2345, 2554, 2769], output)
}
