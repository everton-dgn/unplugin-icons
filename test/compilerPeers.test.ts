import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ModuleKind, transpileModule } from 'typescript'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))
const relativeImportRE = /from (['"])(\.\.?\/[^'"]+)\1/g
const svg = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'

function linkPackage(target: string, name: string, source = join(root, 'node_modules', name)) {
  const destination = join(target, 'node_modules', name)
  mkdirSync(dirname(destination), { recursive: true })
  symlinkSync(realpathSync(source), destination, 'junction')
}

// Copy the real package, linking only its declared dependencies. In particular,
// neither local-pkg nor @svgr/core can see the application's compiler peers.
function isolatePackage(base: string, name: string) {
  const source = realpathSync(join(root, 'node_modules', name))
  const target = join(base, 'store', name)
  mkdirSync(target, { recursive: true })
  cpSync(join(source, 'dist'), join(target, 'dist'), { recursive: true })
  cpSync(join(source, 'package.json'), join(target, 'package.json'))
  const pkg = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'))
  const require = createRequire(join(source, 'package.json'))
  for (const dependency of Object.keys(pkg.dependencies)) {
    const searchPath = require.resolve.paths(dependency)!.find(path => existsSync(join(path, dependency)))!
    linkPackage(target, dependency, join(searchPath, dependency))
  }
  return target
}

function fixture(location: 'package' | 'project') {
  // Outside the checkout so its hoisted node_modules cannot mask the regression.
  // Keep the fixture on failure as well as success for inspection.
  const base = mkdtempSync(join(tmpdir(), 'unplugin-icons-peers-'))
  const plugin = join(base, 'store', 'unplugin-icons')
  const project = join(base, 'project with spaces #')
  mkdirSync(project, { recursive: true })
  mkdirSync(join(plugin, 'compilers'), { recursive: true })
  const localPkg = isolatePackage(base, 'local-pkg')
  linkPackage(plugin, 'local-pkg', localPkg)
  linkPackage(plugin, '@iconify/utils')
  for (const file of ['svgId', 'compilers/jsx', 'compilers/qwik', 'compilers/vue3', 'compilers/vue-vapor', 'compilers/peer']) {
    const source = join(root, 'src/core', `${file}.ts`)
    if (!existsSync(source))
      continue
    const { outputText } = transpileModule(readFileSync(source, 'utf8'), {
      compilerOptions: { module: ModuleKind.ESNext },
    })
    writeFileSync(join(plugin, `${file}.mjs`), outputText.replace(relativeImportRE, 'from $1$2.mjs$1'))
  }
  const peers = location === 'package' ? plugin : project
  for (const name of ['@vue/compiler-sfc', '@vue/compiler-vapor', '@svgx/core', '@svgr/plugin-jsx'])
    linkPackage(peers, name)
  const svgr = isolatePackage(base, '@svgr/core')
  linkPackage(peers, '@svgr/core', svgr)
  return { plugin, project, localPkg, svgr }
}

const compilers = [
  ['vue3', 'Vue3Compiler', '@vue/compiler-sfc', 'export default markRaw('],
  ['vue-vapor', 'VueVaporCompiler', '@vue/compiler-vapor', 'defineVaporComponent({'],
  ['qwik', 'QwikCompiler', '@svgx/core', 'export default testIcon'],
  ['jsx', 'JSXCompiler', '@svgr/core', 'forwardRef'],
] as const

describe.each(['package', 'project'] as const)('isolated peers in the %s', (location) => {
  it.each(compilers)('compiles %s', (file, symbol, peer, expected) => {
    const { plugin, project, localPkg, svgr } = fixture(location)
    // Verify the topology independently of the compiler result.
    expect(() => createRequire(join(localPkg, 'dist/index.mjs')).resolve(peer)).toThrow()
    expect(() => createRequire(join(svgr, 'dist/index.js')).resolve('@svgr/plugin-jsx')).toThrow()
    const url = pathToFileURL(join(plugin, 'compilers', `${file}.mjs`)).href
    const code = execFileSync(process.execPath, ['--input-type=module', '-e', `
      const { ${symbol}: compile } = await import(${JSON.stringify(url)});
      console.log(await compile(${JSON.stringify(svg)}, 'test', 'icon', { jsx: 'react' }));
    `], { cwd: project, encoding: 'utf8', stdio: 'pipe' })
    expect(code).toContain(expected)
  })

  it.each(['esm', 'cjs'])('loads %s peers and prefers the package over the project', (format) => {
    const { plugin, project } = fixture(location)
    const name = 'compiler-peer-fixture'
    for (const target of location === 'package' ? [plugin, project] : [project]) {
      const directory = join(target, 'node_modules', name)
      mkdirSync(directory, { recursive: true })
      const value = target === plugin ? 'package' : 'project'
      writeFileSync(join(directory, 'package.json'), JSON.stringify({
        name,
        exports: format === 'esm' ? './entry.mjs' : './entry.cjs',
      }))
      if (format === 'esm') {
        writeFileSync(join(directory, 'entry.mjs'), `export const origin = '${value}'`)
      }
      else {
        // Exercise a CommonJS default object through native ESM interop.
        writeFileSync(join(directory, 'entry.cjs'), `module.exports = { origin: '${value}' }`)
      }
    }
    const url = pathToFileURL(join(plugin, 'compilers/peer.mjs')).href
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
      const { importPeerModule } = await import(${JSON.stringify(url)});
      console.log((await importPeerModule('${name}')).origin);
    `], { cwd: project, encoding: 'utf8', stdio: 'pipe' })
    expect(output.trim()).toBe(location)
  })
})

it('preserves module-not-found errors for absent peers', () => {
  const { plugin, project } = fixture('package')
  const url = pathToFileURL(join(plugin, 'compilers/peer.mjs')).href
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { importPeerModule } = await import(${JSON.stringify(url)});
    await assert.rejects(importPeerModule('missing-compiler-peer-fixture'), {
      code: 'ERR_MODULE_NOT_FOUND',
    });
    console.log('rejected');
  `], { cwd: project, encoding: 'utf8', stdio: 'pipe' })
  expect(output.trim()).toBe('rejected')
})
