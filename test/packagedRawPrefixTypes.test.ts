import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('loads packaged raw prefix types alongside framework types in isolated consumers', () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  // Retain isolated fixtures under ignored node_modules; never overwrite a consumer.
  const fixture = mkdtempSync(join(root, 'node_modules/.raw-prefix-consumer-'))
  const archive = join(fixture, 'unplugin-icons.tgz')
  execFileSync('pnpm', ['pack', '--out', archive], { cwd: root, stdio: 'pipe' })
  const packageDirectory = join(fixture, 'node_modules/unplugin-icons')
  mkdirSync(packageDirectory, { recursive: true })
  execFileSync('tar', ['-xzf', archive, '-C', packageDirectory, '--strip-components=1'])
  mkdirSync(join(fixture, 'node_modules/@types'), { recursive: true })
  symlinkSync(realpathSync(join(root, 'examples/vite-react/node_modules/@types/react')), join(fixture, 'node_modules/@types/react'))
  symlinkSync(realpathSync(join(root, 'examples/vite-vue3/node_modules/vue')), join(fixture, 'node_modules/vue'))
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  writeFileSync(join(fixture, 'index.ts'), `
import Component from '~icons/test/icon';
import svg from '~icons-raw/test/icon?raw=false&title=a%252Eb';
import virtualSvg from 'virtual:icons-raw/test/icon?width=2em&raw&height=3em';
type Props = Parameters<typeof Component>[0];
const props: Props = { width: 24 };
// @ts-expect-error Invalid component props must be rejected.
const invalid: Props = { invalidIconProp: true };
// @ts-expect-error Components remain components.
const componentString: string = Component;
const strings: string[] = [svg, virtualSvg];
// @ts-expect-error Raw SVG is not a component.
svg({});
// @ts-expect-error Raw SVG must not become any.
const number: number = virtualSvg;
`)

  for (const framework of ['vue', 'react']) {
    for (const moduleResolution of ['Bundler', 'Node16']) {
      const config = {
        compilerOptions: {
          types: [`unplugin-icons/types/${framework}`, 'unplugin-icons/types/raw-prefix'],
          moduleResolution,
          module: moduleResolution === 'Node16' ? 'Node16' : 'ESNext',
          target: 'ESNext',
          strict: true,
          skipLibCheck: false,
          noEmit: true,
        },
        files: ['index.ts'],
      }
      const configPath = join(fixture, `tsconfig.${framework}.${moduleResolution}.json`)
      writeFileSync(configPath, JSON.stringify(config))
      const parsed = ts.parseJsonConfigFileContent(config, ts.sys, fixture, {}, configPath)
      expect(parsed.errors).toEqual([])
      const program = ts.createProgram(parsed.fileNames, parsed.options)
      expect(program.getSourceFile(join(packageDirectory, 'types/raw-prefix.d.ts'))).toBeDefined()
      const diagnostics = ts.getPreEmitDiagnostics(program).map(diagnostic => ({
        file: diagnostic.file?.fileName,
        code: diagnostic.code,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      }))
      expect(diagnostics, `${framework} / ${moduleResolution}`).toEqual([])
    }
  }
}, 30_000)
