import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, sep } from 'node:path'
import process from 'node:process'
import { hashes } from './artifact.mjs'

const packages = ['ember-source', '@glimmer/component', '@glint/template', '@embroider/vite', 'vite', 'typescript']

export function prepare(fixture, run, freshLock) {
  const require = createRequire(join(run, 'package.json'))
  for (const name of [...packages, 'unplugin-icons'])
    assert.throws(() => require.resolve(`${name}/package.json`), { code: 'MODULE_NOT_FOUND' })
  for (const name of readdirSync(fixture)) {
    if (freshLock && name === 'bun.lock')
      continue
    if (!['node_modules', 'run.mjs', 'README.md'].includes(name))
      cpSync(join(fixture, name), join(run, name), { recursive: true, errorOnExist: true, force: false })
  }
}

export function verify(run, expected) {
  const require = createRequire(join(run, 'node_modules/unplugin-icons/package.json'))
  const dependencies = {}
  for (const name of packages) {
    let location
    try {
      location = realpathSync(require.resolve(`${name}/package.json`))
    }
    catch (error) {
      if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED')
        throw error
      const entry = execFileSync(process.execPath, ['--conditions=types', '--input-type=module', '-e', 'import { createRequire } from "node:module"; process.stdout.write(createRequire(process.argv[1]).resolve(process.argv[2]))', join(run, 'node_modules/unplugin-icons/package.json'), name], { encoding: 'utf8' })
      let directory = dirname(realpathSync(entry))
      while (!existsSync(join(directory, 'package.json')) || JSON.parse(readFileSync(join(directory, 'package.json'))).name !== name) {
        assert.notEqual(directory, dirname(directory), `Manifest not found: ${name}`)
        directory = dirname(directory)
      }
      location = join(directory, 'package.json')
    }
    assert(location.startsWith(`${realpathSync(run)}${sep}`), `Dependency outside consumer: ${location}`)
    dependencies[name] = { location, version: JSON.parse(readFileSync(location, 'utf8')).version }
  }
  const manifest = JSON.parse(readFileSync(join(run, 'node_modules/unplugin-icons/package.json')))
  assert.equal(manifest.devDependencies, undefined)
  assert.equal(manifest.scripts, undefined)
  assert.deepEqual(hashes(join(run, 'node_modules/unplugin-icons')), expected)
  return dependencies
}
