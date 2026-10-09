import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

// Run pnpm build, then pnpm exec tsx test/packedCustomCollections.ts.
// Requires registry access. Keep each isolated consumer for inspection.
const root = fileURLToPath(new URL('..', import.meta.url))
const runs = join(root, 'node_modules', '.custom-collection-types')
mkdirSync(runs, { recursive: true })
const run = mkdtempSync(join(runs, 'run-'))
process.stdout.write(`Consumer retained at ${run}\n`)

function command(cwd: string, executable: string, args: string[]) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8' })
  assert.ifError(result.error)
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stdout}${result.stderr}`)
}

function json(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
command(root, 'pnpm', ['pack', '--pack-destination', run])
writeFileSync(join(run, 'pnpm-workspace.yaml'), 'packages: []\nautoInstallPeers: false\n')
json(join(run, 'package.json'), {
  name: 'custom-collection-types-consumer',
  private: true,
  type: 'module',
  dependencies: { 'unplugin-icons': `file:./unplugin-icons-${manifest.version}.tgz` },
  devDependencies: { typescript: '5.9.3' },
})
command(run, 'pnpm', ['install', '--ignore-workspace', '--ignore-scripts', '--lockfile-dir', run, '--node-linker', 'isolated'])
const fixture = readFileSync(join(root, 'test/fixtures/custom-collections.ts'), 'utf8')
writeFileSync(join(run, 'consumer.ts'), fixture.replace('../../src/types', 'unplugin-icons/types'))

for (const resolution of ['Bundler', 'Node16']) {
  const config = join(run, `tsconfig.${resolution}.json`)
  json(config, {
    compilerOptions: {
      target: 'ESNext',
      module: resolution === 'Node16' ? 'Node16' : 'ESNext',
      moduleResolution: resolution,
      strict: true,
      skipLibCheck: false,
      noEmit: true,
      types: [],
    },
    files: ['consumer.ts'],
  })
  command(run, process.execPath, [join(run, 'node_modules/typescript/bin/tsc'), '-p', config])
  process.stdout.write(`PASS packed consumer: ${resolution}, skipLibCheck false\n`)
}
