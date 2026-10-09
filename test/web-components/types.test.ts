import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('types packaged icon constructors for registration, instantiation and subclassing', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const fixture = mkdtempSync(join(root, 'node_modules/.web-components-types-'))
  const archive = join(fixture, 'unplugin-icons.tgz')
  execFileSync('pnpm', ['pack', '--out', archive], { cwd: root, stdio: 'pipe' })
  const installed = join(fixture, 'node_modules/unplugin-icons')
  mkdirSync(installed, { recursive: true })
  execFileSync('tar', ['-xzf', archive, '-C', installed, '--strip-components=1'])
  copyFileSync(fileURLToPath(new URL('./consumer.ts', import.meta.url)), join(fixture, 'consumer.ts'))
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ private: true, type: 'module' }))

  for (const moduleResolution of ['Bundler', 'Node16']) {
    const config = {
      compilerOptions: {
        moduleResolution,
        module: moduleResolution === 'Node16' ? 'Node16' : 'ESNext',
        target: 'ESNext',
        types: ['unplugin-icons/types/web-components'],
        strict: true,
        skipLibCheck: false,
        noEmit: true,
      },
      files: ['consumer.ts'],
    }
    const configPath = join(fixture, `tsconfig.${moduleResolution}.json`)
    const parsed = ts.parseJsonConfigFileContent(config, ts.sys, fixture, {}, configPath)
    expect(parsed.errors).toEqual([])
    const program = ts.createProgram(parsed.fileNames, parsed.options)
    expect(program.getSourceFile(join(installed, 'types/web-components.d.ts'))).toBeDefined()
    const diagnostics = ts.getPreEmitDiagnostics(program).map(diagnostic =>
      `TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
    )
    expect(diagnostics, moduleResolution).toEqual([])
  }
}, 30_000)
