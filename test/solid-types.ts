import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

// Run with pnpm test:types:solid. Requires registry access for isolated fixtures.
// Keep each run under node_modules so fixtures never join the project workspace.
const root = fileURLToPath(new URL('..', import.meta.url))
const runs = join(root, 'node_modules', '.solid-types')
mkdirSync(runs, { recursive: true })
const run = mkdtempSync(join(runs, 'run-'))
process.stdout.write(`Fixtures retained at ${run}\n`)

function command(cwd: string, executable: string, args: string[]) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8' })
  assert.ifError(result.error)
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stdout}${result.stderr}`)
  return result.stdout
}

function json(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

command(root, 'pnpm', ['pack', '--pack-destination', run])
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const archive = join(run, `unplugin-icons-${manifest.version}.tgz`)

for (const [name, version, source, entry] of [
  ['solid1', '1.9.15', 'solid-js', 'solid'],
  ['solid2', '2.0.0-rc.13', '@solidjs/web', 'solid2'],
]) {
  const fixture = join(run, name)
  mkdirSync(fixture)
  writeFileSync(join(fixture, 'pnpm-workspace.yaml'), 'packages: []\n')
  json(join(fixture, 'package.json'), {
    name: `unplugin-icons-types-${name}`,
    private: true,
    type: 'module',
    devDependencies: {
      'solid-js': version,
      ...(name === 'solid2' ? { '@solidjs/web': version } : {}),
      'typescript': '5.9.3',
    },
  })
  command(fixture, 'pnpm', ['install', '--ignore-workspace', '--ignore-scripts', '--lockfile-dir', fixture, '--node-linker', 'hoisted'])
  // Extract the actual published layout beside the fixture's own dependencies.
  // This avoids installing unrelated runtime/optional peers for a types-only test.
  const installed = join(fixture, 'node_modules', 'unplugin-icons')
  mkdirSync(installed)
  command(fixture, 'tar', ['-xzf', archive, '-C', installed, '--strip-components=1'])
  writeFileSync(join(fixture, 'icons.tsx'), `
import type { ComponentProps, JSX } from '${source}'
import TildeIcon from '~icons/mdi/home'
import VirtualIcon from 'virtual:icons/mdi/home'

const tilde: (props: ComponentProps<'svg'>) => JSX.Element = TildeIcon
const virtual: (props: ComponentProps<'svg'>) => JSX.Element = VirtualIcon
export const icons = [
  <TildeIcon />,
  <VirtualIcon />,
  <TildeIcon width={24} height="1em" viewBox="0 0 24 24" fill="currentColor" />,
  <VirtualIcon width="24" height={24} viewBox="0 0 24 24" stroke="currentColor" />,
  tilde({ fill: 'red' }),
  virtual({ stroke: 'blue' }),
  // @ts-expect-error Unknown SVG props must be rejected for both prefixes.
  <TildeIcon invalidIconProp="no" />,
  // @ts-expect-error Unknown SVG props must be rejected for both prefixes.
  <VirtualIcon invalidIconProp="no" />,
]
`)
  for (const resolution of ['Bundler', 'Node16']) {
    const options = {
      target: 'ESNext',
      module: resolution === 'Node16' ? 'Node16' : 'ESNext',
      moduleResolution: resolution,
      jsx: 'preserve',
      jsxImportSource: source,
      strict: true,
      skipLibCheck: false,
      noEmit: true,
      types: [`unplugin-icons/types/${entry}`],
    }
    const config = join(fixture, `tsconfig.${resolution}.json`)
    json(config, { compilerOptions: options, files: ['icons.tsx'] })
    const tsc = resolve(fixture, 'node_modules/typescript/bin/tsc')
    if (name === 'solid2') {
      const legacy = join(fixture, `tsconfig.${resolution}.legacy.json`)
      json(legacy, { compilerOptions: { ...options, types: ['unplugin-icons/types/solid'] }, files: ['icons.tsx'] })
      const result = spawnSync(process.execPath, [tsc, '-p', legacy], { cwd: fixture, encoding: 'utf8' })
      assert.ifError(result.error)
      assert.equal(result.status, 2, result.stdout + result.stderr)
      assert.match(result.stdout, /TS2305.*JSX/)
      assert.match(result.stdout, /TS2344/)
      process.stdout.write(`PASS ${name} ${resolution}: legacy entry reproduces TS2305 and TS2344\n`)
    }
    command(fixture, process.execPath, [tsc, '-p', config])
    process.stdout.write(`PASS ${name} ${version} ${resolution}: types/${entry}, SVG props and invalid props\n`)
  }
}
