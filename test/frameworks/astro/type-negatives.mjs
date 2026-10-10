import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

const files = ['types.ts', 'contracts/components.ts', 'contracts/declarations.ts', 'contracts/kebab.ts']
const expected = []
const copies = files.map((file) => {
  const copy = join(dirname(file), `negative-${basename(file)}`)
  const lines = readFileSync(file, 'utf8').split('\n')
  for (let index = 0; index < lines.length; index++) {
    if (!lines[index].includes('@ts-expect-error'))
      continue
    expected.push(`${copy}:${index + 2}`)
    lines[index] = ''
  }
  writeFileSync(copy, lines.join('\n'), { flag: 'wx' })
  return copy
})
assert.equal(expected.length, 19)
writeFileSync('tsconfig.negative.json', JSON.stringify({
  extends: './tsconfig.types.json',
  files: [...copies, 'platform-types.d.ts'],
}), { flag: 'wx' })
const result = spawnSync('bun', ['x', '--no-install', 'tsc', '--noEmit', '--pretty', 'false', '-p', 'tsconfig.negative.json'], { encoding: 'utf8' })
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
writeFileSync('type-negatives.log', output, { flag: 'wx' })
assert.ifError(result.error)
assert.equal(result.signal, null)
assert.equal(result.status, 2)
const diagnostics = [...output.matchAll(/^(.+)\((\d+),\d+\): error TS\d+:/gm)]
assert.equal((output.match(/error TS/g) || []).length, expected.length, output)
assert.deepEqual(diagnostics.map(match => `${match[1]}:${match[2]}`).sort(), expected.sort(), output)
writeFileSync('type-negatives.json', JSON.stringify({ count: expected.length, locations: expected }, null, 2), { flag: 'wx' })
console.warn(`Rejected all ${expected.length} negative cases without additional diagnostics.`)
