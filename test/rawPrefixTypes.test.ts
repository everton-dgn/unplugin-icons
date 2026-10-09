import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, it } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))

it.each([
  ['react', 'vite-react', 'import type { ComponentProps } from \'react\'; type Props = ComponentProps<typeof Icon>'],
  ['vue3', 'vite-vue3', 'type Props = Parameters<typeof Icon>[0]'],
  ['vue', 'vite-vue3', 'type Props = Parameters<typeof Icon>[0]'],
  ['solid', 'vite-solid', 'type Props = Parameters<typeof Icon>[0]'],
  ['svelte5', 'vite-svelte', 'import type { ComponentProps } from \'svelte\'; type Props = ComponentProps<typeof Icon>'],
  ['svelte', 'vite-svelte', 'import type { ComponentProps } from \'svelte\'; type Props = ComponentProps<typeof Icon>'],
  ['preact', 'vite-preact', 'type Props = Parameters<typeof Icon>[0]'],
  ['raw-prefix', 'vite-react', ''],
])('checks %s declarations with raw prefix imports', (framework, example, props) => {
  const consumer = `${root}examples/${example}/raw-prefix-probe.ts`
  const queries = ['', '?raw', '?raw&width=2em', '?width=2em&raw&height=3em', '?width=2em&raw', '?raw=true&raw=false', '?%72aw=false&width=1%2E5em']
  const imports = ['~icons-raw/', 'virtual:icons-raw/'].flatMap(prefix => queries.map(query => `${prefix}test/icon${query}`))
  const source = `
import 'unplugin-icons/types/raw-prefix';
import 'unplugin-icons/types/${framework}';
${props
  ? `
import Icon from '~icons/test/icon';
import VirtualIcon from 'virtual:icons/test/icon';
${props};
const valid: Props = { width: 24 };
// @ts-expect-error Invalid component props must still be rejected.
const invalid: Props = { invalidIconProp: true };
// @ts-expect-error Components must not become strings.
const componentString: string = Icon;
// @ts-expect-error Neither alias may become a string.
const virtualComponentString: string = VirtualIcon;
`
  : ''}
${imports.map((id, i) => `
import raw${i} from '${id}';
const string${i}: string = raw${i};
// @ts-expect-error Raw imports cannot be called.
raw${i}({});
// @ts-expect-error Raw imports must not become any.
const number${i}: number = raw${i};
`).join('\n')}
`
  const options: ts.CompilerOptions = {
    noEmit: true,
    strict: true,
    skipLibCheck: false,
    types: [],
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (file, languageVersion, ...rest) => file === consumer
    ? ts.createSourceFile(file, source, languageVersion)
    : getSourceFile(file, languageVersion, ...rest)
  // Resolve framework imports against the existing example, as a consumer would.
  host.resolveModuleNames = (names, containingFile) => names.map(name => ts.resolveModuleName(
    name,
    containingFile.startsWith(`${root}types/`) && !name.startsWith('.') ? consumer : containingFile,
    options,
    host,
  ).resolvedModule)
  const program = ts.createProgram([consumer], options, host)
  expect(ts.getPreEmitDiagnostics(program).map(diagnostic => ({
    file: diagnostic.file?.fileName,
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  }))).toEqual([])
})
