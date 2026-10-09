import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const expectedErrorDirective = /^.*@ts-expect-error.*\n/gm
const sourceExtension = /\.(tsx?)$/

export function checkTypes(run, command) {
  const tsc = ['node_modules/typescript/bin/tsc', '--pretty', 'false', '-p']
  const typecheck = command(process.execPath, [...tsc, 'tsconfig.json'], 'typecheck', run, true)
  const upstreamRepro = command(process.execPath, [...tsc, 'tsconfig.repro.json'], 'upstream-types-repro', run, true)
  const raw = command(process.execPath, [...tsc, 'tsconfig.raw.json'], 'raw-types', run, true)
  const positive = { typecheck, upstreamRepro, raw }
  writeFileSync(join(run, 'type-results.json'), `${JSON.stringify(positive, null, 2)}\n`, { flag: 'wx' })
  assert.deepEqual(positive, { typecheck: 0, upstreamRepro: 0, raw: 0 }, `Strict type gates failed; evidence: ${run}`)

  const negatives = {}
  for (const [name, file, config, count] of [
    ['consumer', 'types.tsx', 'tsconfig.json', 5],
    ['raw', 'raw-types.ts', 'tsconfig.raw.json', 2],
    ['upstream', 'qwik-types-repro.ts', 'tsconfig.repro.json', 3],
  ]) {
    const source = readFileSync(join(run, file), 'utf8')
    const negative = file.replace(sourceExtension, '.negative.$1')
    writeFileSync(join(run, negative), source.replace(expectedErrorDirective, ''), { flag: 'wx' })
    const cfg = JSON.parse(readFileSync(join(run, config), 'utf8'))
    delete cfg.include
    cfg.files = [negative]
    const configName = `tsconfig.negative-${name}.json`
    writeFileSync(join(run, configName), `${JSON.stringify(cfg, null, 2)}\n`, { flag: 'wx' })
    const label = `negative-${name}`
    assert.equal(command(process.execPath, [...tsc, configName], label, run, true), 1)
    const diagnostics = readFileSync(join(run, `${label}.log`), 'utf8').split('\n').filter(line => line.includes('error TS'))
    assert.equal(diagnostics.length, count, diagnostics.join('\n'))
    assert(diagnostics.every(line => line.startsWith(`${negative}(`)), diagnostics.join('\n'))
    negatives[name] = diagnostics.length
  }
  return { ...positive, negatives }
}
