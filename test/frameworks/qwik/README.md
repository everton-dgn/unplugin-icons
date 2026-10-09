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

Both profiles apply the tracked Qwik declaration patch described below. Strict
consumer, upstream-only and raw checks must pass before builds or browsers run.
The runner also removes each set of `@ts-expect-error` directives in temporary
copies and requires the expected negative diagnostics. Each command retains its
log; `type-results.json` preserves positive gate results even on failure. A
successful complete run writes `result.json`. No type shim or `skipLibCheck` is used.

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
- Strict TypeScript 7 checks for component props, refs, raw assignments and the
  upstream `h.JSX` / `createElement.JSX` aliases. Negative controls require five
  consumer errors, two raw errors and three upstream errors. Qwik accepts
  `Signal<Element>` for refs, including a div signal.

Playwright collects `runtime.e2e.ts`; root Vitest does not collect it.
These runs verify macOS arm64 and Chromium. Other operating systems, browser
engines, development HMR and Qwik 2 were not tested.

## Known limits

The original Qwik 1.20.2 package emits `{ JSX };` inside `declare namespace h`
in `@builder.io/qwik/dist/core.d.ts:1001`. TypeScript 7.0.2 reports two TS1036
diagnostics and one TS2552. An earlier investigation also reproduced this failure
with TypeScript 5.9.3; that comparison is historical. The current fixture installs
and validates only TypeScript 7.0.2.
The fixture's tracked patch changes that line to `export { QwikJSX as JSX };`,
restoring the namespace alias present in Qwik's
[original source](https://github.com/QwikDev/qwik/blob/12eb9716611fade0f3c99809be5e9dd1196fce7f/packages/qwik/src/core/render/jsx/factory.ts).
The upstream-only control imports no unplugin-icons code and checks both aliases,
valid SVG props and rejected invalid props/refs. This is a local package patch,
not a fix published by Qwik. Compatibility here is conditional on applying it.

The patch ships with this fixture, not with the unplugin-icons package. A Bun
consumer of Qwik 1.20.2 must copy `patches/@builder.io%2Fqwik@1.20.2.patch`
into its own project and add this field to its package.json:

```json
{
  "patchedDependencies": {
    "@builder.io/qwik@1.20.2": "patches/@builder.io%2Fqwik@1.20.2.patch"
  }
}
```

Run `bun install` to update that project's lock, retain the patch and lock in
version control, then use `bun install --frozen-lockfile` for reproducible
installs. Both fixture profiles carry this mapping and their own frozen lock;
`prepare` copies and checks the shared patch. The patch was produced through
`bun patch` / `bun patch --commit` and changes only the declaration export.
Do not assume other package managers apply Bun's `patchedDependencies` field.

In a retained consumer, the positive gates can also be run individually:

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.repro.json
node node_modules/typescript/bin/tsc -p tsconfig.raw.json
```

The Vite+ profile explicitly installs esbuild because Qwik selects it for SSR
minification. Omitting this optional peer made the real SSR build fail.
Declaring esbuild 0.28.2 fixed that build and its browser test without changing
minification or assertions. See [Vite's esbuild fallback guidance](https://vite.dev/guide/migration#esbuild-fallbacks).

Warnings remain for the deprecated `esbuild` option and Rolldown's unrecognized
`onlyExplicitManualChunks`. Qwik declares Vite `>=5 <8`; Vite+ 1.1.0 embeds
Vite 8.3.3/Rolldown 1.2.12. The successful fixture establishes the tested behavior,
but does not establish official Qwik support for Vite 8 or every integration
covered by those packages. The declaration patch does not change that peer range.

Virtual JSX modules with queries do not inherit the app's tsconfig automatically.
Qwik's optimizer excludes IDs containing `?raw`, including `?raw=false`.
The explicit Qwik JSX runtime in `vite.config.ts` prevents these modules from
resolving React's runtime. The component assertion for `raw=false` stays active.

The SSR API was checked against the installed Qwik 1.20.2 package and its
[corresponding source](https://github.com/QwikDev/qwik/blob/12eb9716611fade0f3c99809be5e9dd1196fce7f/packages/qwik/src/server/types.ts).
The registry version is 1.20.2; its HTML reports `1.20.2-dev+12eb971`.
