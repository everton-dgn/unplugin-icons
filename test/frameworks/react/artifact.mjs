import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

const timestampSeparators = /[-:]/g

export function backup(path, label) {
  const stamp = new Date().toISOString().replace(timestampSeparators, '').replace('T', '_').slice(0, 15)
  const parent = join(process.env.UNPLUGIN_ICONS_BACKUP_DIR || join(tmpdir(), 'unplugin-icons-backups'), stamp)
  mkdirSync(parent, { recursive: true })
  const destination = join(mkdtempSync(join(parent, `${label}-`)), label)
  cpSync(path, destination, { recursive: true, errorOnExist: true, force: false })
  return destination
}

export function hashes(directory) {
  const result = {}
  function visit(relative) {
    for (const entry of readdirSync(join(directory, relative), { withFileTypes: true })) {
      const name = `${relative}/${entry.name}`
      if (entry.isDirectory())
        visit(name)
      else
        result[name] = createHash('sha256').update(readFileSync(join(directory, name))).digest('hex')
    }
  }
  visit('dist')
  visit('types')
  return result
}

export function pack(root, run) {
  const distBackup = existsSync(join(root, 'dist')) ? backup(join(root, 'dist'), 'dist') : null
  execFileSync('pnpm', ['exec', 'tsdown', '--no-clean', '--no-exports'], { cwd: root, stdio: 'inherit' })
  execFileSync('pnpm', ['pack', '--pack-destination', run], { cwd: root, stdio: 'inherit' })
  const archive = readdirSync(run).find(name => name.endsWith('.tgz'))
  assert(archive)
  mkdirSync(join(run, 'package'))
  execFileSync('tar', ['-xzf', archive, '-C', 'package', '--strip-components=1'], { cwd: run })
  const expected = hashes(join(run, 'package'))
  const manifestPath = join(run, 'package/package.json')
  const manifestBackup = backup(manifestPath, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  delete manifest.devDependencies
  delete manifest.scripts
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  assert.deepEqual(hashes(join(run, 'package')), expected)
  return { archive, distBackup, manifestBackup, expected }
}
