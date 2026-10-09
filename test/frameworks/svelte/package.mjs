import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

export function preparePackage(repo, run, backup) {
  const dist = join(repo, 'dist')
  if (existsSync(dist)) {
    cpSync(dist, mkdtempSync(join(backup, 'svelte-dist-')), { recursive: true })
    renameSync(dist, join(mkdtempSync(join(repo, 'node_modules/.unplugin-icons-dist-')), 'dist'))
  }
  execFileSync('pnpm', ['exec', 'tsdown', '--no-clean', '--no-exports'], { cwd: repo, stdio: 'inherit' })
  const packed = join(run, 'packed')
  mkdirSync(packed)
  execFileSync('pnpm', ['pack', '--pack-destination', packed], {
    cwd: repo,
    stdio: 'inherit',
    env: { ...process.env, npm_config_ignore_scripts: 'true' },
  })
  const archive = readdirSync(packed).find(name => name.endsWith('.tgz'))
  if (!archive)
    throw new Error('Package archive missing')
  execFileSync('tar', ['-xzf', join(packed, archive), '-C', run])
  const manifestPath = join(run, 'package/package.json')
  cpSync(manifestPath, join(mkdtempSync(join(backup, 'svelte-manifest-')), 'package.json'))
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  delete manifest.devDependencies
  delete manifest.scripts
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}
