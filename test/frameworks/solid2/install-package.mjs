import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { backup } from './backup.mjs'

function hashes(directory, prefix = '') {
  return Object.fromEntries(readdirSync(directory).sort().flatMap((name) => {
    const path = join(directory, name)
    const key = prefix + name
    const stat = lstatSync(path)
    if (stat.isDirectory())
      return Object.entries(hashes(path, `${key}/`))
    assert.ok(stat.isFile(), `Expected a regular package file: ${path}`)
    return [[key, createHash('sha256').update(readFileSync(path)).digest('hex')]]
  }))
}

export function installPackage(archive, run, bun) {
  function command(binary, args) {
    const result = spawnSync(binary, args, { cwd: run, stdio: 'inherit' })
    assert.ifError(result.error)
    assert.equal(result.status, 0, `${binary} ${args.join(' ')}`)
  }
  command('tar', ['-xzf', archive, '-C', run])
  const source = join(run, 'package')
  const packedHashes = hashes(source)
  const manifest = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'))
  const expected = JSON.parse(readFileSync(join(run, 'package-contract.json'), 'utf8'))
  for (const [key, value] of Object.entries(expected))
    assert.deepEqual(manifest[key] ?? {}, value, `Package dependency contract changed: ${key}`)
  backup(join(source, 'package.json'))
  delete manifest.devDependencies
  delete manifest.scripts
  writeFileSync(join(source, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  const lock = readFileSync(join(run, 'bun.lock'))
  command(bun, ['install', '--frozen-lockfile'])
  assert.deepEqual(readFileSync(join(run, 'bun.lock')), lock, 'Frozen lock changed')
  const installed = join(run, 'node_modules/unplugin-icons')
  cpSync(source, installed, { recursive: true, force: false, errorOnExist: true })
  const extractedHashes = hashes(source)
  const installedHashes = hashes(installed)
  assert.deepEqual(installedHashes, extractedHashes, 'Installed package bytes differ')
  for (const [path, hash] of Object.entries(packedHashes)) {
    if (path !== 'package.json')
      assert.equal(installedHashes[path], hash, `Packed bytes changed: ${path}`)
  }
  writeFileSync(join(run, 'package-bytes.json'), JSON.stringify({ archiveSha256: createHash('sha256').update(readFileSync(archive)).digest('hex'), packedFiles: packedHashes, installedFiles: installedHashes, prunedManifestFields: ['devDependencies', 'scripts'] }, null, 2), { flag: 'wx' })
}
