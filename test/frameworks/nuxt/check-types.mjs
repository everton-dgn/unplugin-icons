import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import ts from 'typescript'

const generated = ts.parseConfigFileTextToJson('.nuxt/tsconfig.app.json', readFileSync('.nuxt/tsconfig.app.json', 'utf8'))
assert.equal(generated.error, undefined)
const types = generated.config.compilerOptions.types.filter(name => name.startsWith('unplugin-icons/'))
assert(types.includes('unplugin-icons/types/vue'), 'Native Nuxt module did not inject Vue declarations')
assert(types.includes('unplugin-icons/types/raw-prefix'))
writeFileSync('tsconfig.contract.json', JSON.stringify({
  compilerOptions: { strict: true, skipLibCheck: false, noEmit: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', types },
  files: ['app/icon-types.ts'],
}, null, 2), { flag: 'wx' })
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.contract.json'], { stdio: 'inherit' })
