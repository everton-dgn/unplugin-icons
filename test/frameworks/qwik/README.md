# Qwik 1 runtime compatibility

This fixture tests the packed library with Qwik 1.20.2, SVGX 1.0.2,
TypeScript 7.0.2 and Playwright 1.64.0. Bun 1.4.2 installs dependencies;
Node 24.21.0 runs the compiler, builds and browser tests. Vite+ 1.1.0 with
esbuild 0.28.2 is the default. Native Vite 7.3.6 is a comparison profile.
Qwik 2 is outside this fixture.

## Run

After installing the root workspace with `pnpm install --frozen-lockfile`:

```sh
node test/frameworks/qwik/run.mjs
node test/frameworks/qwik/run.mjs --native-vite

# Inspect profile selection without installing or building:
node test/frameworks/qwik/run.mjs --print-profile
node test/frameworks/qwik/run.mjs --native-vite --print-profile
```

The default manifest and lock come from `vite-plus/`; `--native-vite` selects
the files in this fixture's root. Unknown or duplicate options are rejected
before consumer preparation. Installs use `bun install --frozen-lockfile`.
For an intentional dependency refresh, add `--resolve-lock` to either command.
It backs up and replaces only the selected profile's lock. Review that change,
then repeat the frozen run.

The full runner currently exits nonzero because Qwik 1.20.2 publishes an invalid
declaration. Runtime tests still execute, and `result.json` records their result
separately from TypeScript exit codes. No type shim, package patch,
`skipLibCheck` or expected-failure annotation hides this gate.

## Isolation and artifacts

Each run retains a fresh `unplugin-qwik-runtime-*` directory outside the checkout.
Dependency resolution must fail before installation. The runner builds with
`pnpm exec tsdown --no-clean --no-exports`, packs the library and installs the
extracted `file:./package`. It compares the frozen lock before and after install,
and verifies all `dist/` and `types/` hashes across the build, tarball and
installed package. The audit repeats after the browser test.

Existing `dist` receives an external backup and moves into a retained
`node_modules/.unplugin-icons-dist-*/dist` directory before rebuilding.
Backups use `unplugin-icons-backups` in the OS temporary directory; set
`UNPLUGIN_ICONS_BACKUP_DIR` to override it. The extracted manifest omits only
`scripts` and `devDependencies`, after backup. Runtime dependencies, peers and
exports remain intact. `evidence.json` records hashes, versions and resolved
paths. The runner does not copy root dependencies or regenerate the icon catalog.

Client and SSR builds produce `dist/client/q-manifest.json` and
`dist/server/entry.ssr.js`. The SSR entry passes the virtual manifest to
`renderToString` with `base: '/build/'` and `qwikLoader: 'inline'`.
`ssr.html` retains the paused output. The server selects its port after both
builds, retrying at most three times for `EADDRINUSE`.

Chromium runs in a separate headless process. `PLAYWRIGHT_BROWSERS_PATH` is
preserved when supplied; otherwise browsers use this fixture's ignored
`node_modules/browsers`. Browser garbage collection is disabled. Artifacts
and backups are retained; output directories are never reused.

## Verified coverage

- Production client and SSR builds with both profiles, including the Qwik
  manifest, paused container markup, serialized state and click handler.
- `useVisibleTask$`, `useSignal`, SVG refs and a real click. Counter, width and
  ARIA attributes update while preserving the SVG node created by SSR.
- Both component aliases and typed raw prefixes, decimal and encoded queries,
  and `raw=false` selecting a component on the ordinary icon prefix.
- Escaped title and attributes, SVG namespace and namespace-aware `xlink:href`.
- Existing ID behavior: SVGX/SVGO changes `shape` to `a`, and five instances
  repeat that ID. This does not establish ID isolation.
- Strict raw types pass with TypeScript 7. Component cases cover valid and
  invalid props, refs and raw assignments, while the full gate remains red.
  Qwik accepts `Signal<Element>` for refs, including a div signal.

Playwright collects `runtime.e2e.ts`; root Vitest does not collect it.
These runs verify macOS arm64 and Chromium. Other operating systems, browser
engines, development HMR and Qwik 2 were not tested.

## Known limits

Qwik 1.20.2 emits `{ JSX };` inside `declare namespace h` in
`@builder.io/qwik/dist/core.d.ts:1001`. TypeScript 7.0.2 reports TS1036 and
TS2552; TypeScript 5.9.3 reproduces them. The Qwik-only control imports no
unplugin-icons code. In a retained consumer:

```sh
node node_modules/typescript/bin/tsc -p tsconfig.repro.json
node node_modules/typescript/bin/tsc -p tsconfig.raw.json
# Native Vite profile also installs this comparison:
node node_modules/typescript-5/bin/tsc --noEmit
```

A TypeScript 7 control compared normalized diagnostics: Qwik alone and the
consumer with its directives produced the same three upstream errors. Removing
the five `@ts-expect-error` directives added five TS2322 diagnostics for invalid
props on both component aliases, a numeric ref signal, a raw string assigned to
a component, and a raw string assigned to a number. This proves those negative
cases while keeping the upstream failure visible.

The Vite+ profile explicitly installs esbuild because Qwik selects it for SSR
minification. Omitting this optional peer made the real SSR build fail.
Declaring esbuild 0.28.2 fixed that build and its browser test without changing
minification or assertions. See [Vite's esbuild fallback guidance](https://vite.dev/guide/migration#esbuild-fallbacks).

Warnings remain for the deprecated `esbuild` option and Rolldown's unrecognized
`onlyExplicitManualChunks`. Qwik declares Vite `>=5 <8`; Vite+ 1.1.0 embeds
Vite 8.3.3/Rolldown 1.2.12. The successful fixture establishes the tested behavior,
without promising every integration covered by those packages.

Virtual JSX modules with queries do not inherit the app's tsconfig automatically.
Qwik's optimizer excludes IDs containing `?raw`, including `?raw=false`.
The explicit Qwik JSX runtime in `vite.config.ts` prevents these modules from
resolving React's runtime. The component assertion for `raw=false` stays active.

The SSR API was checked against the installed Qwik 1.20.2 package and its
[corresponding source](https://github.com/QwikDev/qwik/blob/12eb9716611fade0f3c99809be5e9dd1196fce7f/packages/qwik/src/server/types.ts).
The registry version is 1.20.2; its HTML reports `1.20.2-dev+12eb971`.
