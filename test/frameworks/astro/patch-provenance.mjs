import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { convertToTsx } from '@astrojs/astro2tsx'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = dirname(require.resolve('astro/package.json'))
const proof = JSON.parse(readFileSync('patch-provenance.json', 'utf8'))
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
assert.equal(hash('patches/astro@7.3.8.patch'), proof.patch)
for (const name of ['astro', 'astro2tsx', 'typescript']) {
  const id = name === 'astro2tsx' ? '@astrojs/astro2tsx' : name
  assert.equal(require(`${id}/package.json`).version, proof[name])
}
for (const [file, expected] of Object.entries(proof.installed))
  assert.equal(hash(join(root, file)), expected, file)

for (const [name, expected] of Object.entries(proof.sources)) {
  const path = join(root, 'components', name)
  assert.equal(hash(path), expected, name)
  const source = convertToTsx(readFileSync(path, 'utf8'), { filename: name }).code
  const result = ts.transpileDeclaration(source, {
    fileName: `${name}.tsx`,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.Preserve, module: ts.ModuleKind.Preserve },
  })
  assert.deepEqual(result.diagnostics, [])
  assert.equal(result.outputText, readFileSync(`${path}.d.ts`, 'utf8'), name)
}
writeFileSync('patch-evidence.json', JSON.stringify(proof, null, 2), { flag: 'wx' })
console.warn('Patch hashes and four source-generated component declarations verified.')
