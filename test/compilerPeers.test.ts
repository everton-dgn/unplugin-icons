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

function fixture(location: 'package' | 'project', includeVuePeer = true) {
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
  for (const name of ['@vue/compiler-sfc', '@vue/compiler-vapor', '@svgx/core', '@svgr/plugin-jsx']) {
    if (name !== '@vue/compiler-sfc' || includeVuePeer)
      linkPackage(peers, name)
  }
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

describe('vue compiler fallback', () => {
  it.each(['package', 'project'] as const)('compiles with only vue visible in the %s', (location) => {
    const { plugin, project, localPkg } = fixture(location, false)
    const target = location === 'package' ? plugin : project
    linkPackage(target, 'vue', join(root, 'examples/vite-vue3/node_modules/vue'))
    for (const directory of [plugin, project, localPkg])
      expect(() => createRequire(join(directory, 'entry.mjs')).resolve('@vue/compiler-sfc')).toThrow()
    expect(createRequire(join(target, 'entry.mjs')).resolve('vue/compiler-sfc')).toBeTruthy()
    const url = pathToFileURL(join(plugin, 'compilers/vue3.mjs')).href
    const code = execFileSync(process.execPath, ['--input-type=module', '-e', `
      const { Vue3Compiler } = await import(${JSON.stringify(url)});
      console.log(await Vue3Compiler(${JSON.stringify(svg)}, 'test', 'icon', {}));
    `], { cwd: project, encoding: 'utf8', stdio: 'pipe' })
    expect(code).toContain('export default markRaw(')
    expect(code).toContain('viewBox')
  })
})

it.each(['esm', 'cjs'])('prefers the explicit %s Vue peer in the project over the package fallback', (format) => {
  const { plugin, project } = fixture('package', false)
  linkPackage(plugin, 'vue', join(root, 'examples/vite-vue3/node_modules/vue'))
  const peer = join(project, 'node_modules/@vue/compiler-sfc')
  mkdirSync(peer, { recursive: true })
  writeFileSync(join(peer, 'package.json'), JSON.stringify({ exports: `./index.${format === 'esm' ? 'mjs' : 'cjs'}` }))
  const compiler = '() => ({ code: "export function render() { return \'explicit-peer\' }" })'
  writeFileSync(join(peer, `index.${format === 'esm' ? 'mjs' : 'cjs'}`), format === 'esm'
    ? `export const compileTemplate = ${compiler}`
    : `module.exports = { compileTemplate: ${compiler} }`)
  const url = pathToFileURL(join(plugin, 'compilers/vue3.mjs')).href
  const code = execFileSync(process.execPath, ['--input-type=module', '-e', `
    const { Vue3Compiler } = await import(${JSON.stringify(url)});
    console.log(await Vue3Compiler(${JSON.stringify(svg)}, 'test', 'icon', {}));
  `], { cwd: project, encoding: 'utf8', stdio: 'pipe' })
  expect(code).toContain('explicit-peer')
})

it.each([
  ['throw new Error("broken explicit peer")', 'broken explicit peer'],
  ['import "missing-vue-peer-internal-dependency"', 'missing-vue-peer-internal-dependency'],
])('preserves an explicit Vue peer import failure: %s', (source, message) => {
  const { plugin, project } = fixture('project', false)
  linkPackage(project, 'vue', join(root, 'examples/vite-vue3/node_modules/vue'))
  const peer = join(plugin, 'node_modules/@vue/compiler-sfc')
  mkdirSync(peer, { recursive: true })
  writeFileSync(join(peer, 'package.json'), JSON.stringify({ exports: './index.mjs' }))
  writeFileSync(join(peer, 'index.mjs'), source)
  const url = pathToFileURL(join(plugin, 'compilers/vue3.mjs')).href
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { Vue3Compiler } = await import(${JSON.stringify(url)});
    await assert.rejects(Vue3Compiler(${JSON.stringify(svg)}, 'test', 'icon', {}),
      error => error.message.includes(${JSON.stringify(message)}));
    console.log('rejected');
  `], { cwd: project, encoding: 'utf8', stdio: 'pipe' })
  expect(output.trim()).toBe('rejected')
})

it('preserves the missing peer error when neither Vue compiler is available', () => {
  const { plugin, project } = fixture('project', false)
  const url = pathToFileURL(join(plugin, 'compilers/vue3.mjs')).href
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { Vue3Compiler } = await import(${JSON.stringify(url)});
    await assert.rejects(Vue3Compiler(${JSON.stringify(svg)}, 'test', 'icon', {}),
      error => error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('@vue/compiler-sfc'));
    console.log('rejected');
  `], { cwd: project, encoding: 'utf8', stdio: 'pipe' })
  expect(output.trim()).toBe('rejected')
})
