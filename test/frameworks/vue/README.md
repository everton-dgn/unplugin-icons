# Vue runtime compatibility

The default fixture tests Vue 3.5.43 using the packaged checkout, Vite+/core
1.1.0 and Bun 1.4.2. The optional Vapor 3.6.0-rc.10 variant has its own manifest
and lock. Nuxt is outside this fixture.

## Run stable Vue

From the repository root, with Node 24.21.0, Bun 1.4.2 and pnpm 12.3.4:

```sh
pnpm install --frozen-lockfile
node test/frameworks/vue/prepare.mjs
node test/frameworks/vue/verify.mjs <RUN_DIR> bun
```

Preparation prints `RUN_DIR`. For a Node server/build run, prepare another fresh
directory and pass `node` instead of `bun`. The verifier rejects existing build
directories. Tests run against the real production client and SSR bundles.

Preparation backs up existing `dist` externally, then renames it into a retained
`node_modules/.unplugin-icons-dist-*/dist` directory. A failed rename stops before
the build. This prevents stale entries from reaching the new package without
deleting the old output. Preparation then builds a fresh `dist` with
`pnpm exec tsdown --no-clean --no-exports`, packs without lifecycle scripts and
extracts into a new `os.tmpdir()` directory outside the checkout. Only the
extracted manifest's `devDependencies` and `scripts` are removed, after backup.
The fixture installs `file:./package` with `bun install --frozen-lockfile`.
No peer resolution occurs before installation. `audit.mjs` verifies the complete
`dist`/`types` lists and SHA-256 hashes against the fresh extraction, checks the
sanitized manifest and rejects peers resolved outside the fixture.

All artifacts remain in the printed run directory, including
`audit-*/provenance.json` and Playwright output. Nothing is cleaned. Backups use
`unplugin-icons-backups` in the OS temporary directory; override the base with
`UNPLUGIN_ICONS_BACKUP_DIR`. The browser cache respects
`PLAYWRIGHT_BROWSERS_PATH`, otherwise uses this module's ignored `node_modules`.
Installation requests only Chromium's headless shell and disables browser GC.
The browser port is chosen immediately before launch. Occupied ports allow at
most three attempts with separate output and logs; other failures stop immediately.

Missing locks fail before mutation. To refresh dependency metadata explicitly,
use `prepare.mjs --refresh-lock` (plus `--vapor` for that variant), review the
generated `bun.lock`, back up the previous fixture lock and copy the new lock
into `stable/` or `vapor/`. Then repeat frozen preparation.

## Stable coverage and known IDs limitation

Two functional tests cover SSR before JavaScript, SVG identity across hydration,
component ref through `$el`, reactive width/data/style, click events, class,
accessibility attributes, xlink namespace, escaped title text, both icon aliases,
decimal queries, both raw aliases, dotted raw names, `raw=false` on a raw prefix,
repeated width parameters and percent-encoded query values.

A separate characterization reproduces #344: icons with gradient `defs` receive
random IDs independently on server and client. It asserts hydration diagnostics
and attaches them to the test result. Its passing result proves the known
limitation, not support for SSR-safe IDs. Detailed production hydration messages
are enabled for this observation. No production workaround or `useId` contract
change is included.

`vue-tsc --noEmit` checks the real Vue SFCs and public icon declarations with
`strict`, `moduleResolution: Bundler` and `skipLibCheck: false`. It includes
negative width, component/string and raw/component assignments. Playwright files
use `.e2e.ts` and an explicit `testMatch`, outside root Vitest discovery.

## Vapor probes: currently failing

```sh
node test/frameworks/vue/prepare.mjs --vapor
node test/frameworks/vue/verify.mjs <RUN_DIR> bun
# Use another fresh run for the separate client-only probe:
node test/frameworks/vue/prepare.mjs --vapor
node test/frameworks/vue/verify.mjs <NEW_RUN_DIR> bun --client-only
```

The server entry uses `createSSRApp`; only the browser entry registers
`vaporInteropPlugin`. Types and both builds pass, but the generated icon module
still imports DOM helpers such as `child` from Vue's Node entry. SSR execution
fails before browser tests. The icon compiler lacks the separate SSR compilation
path that plugin-vue uses for native Vapor SFCs.

The client-only width test remains failing: `width=24` stays at the compiled
`1.2em`. A native Vapor SFC reproduces this on rc.10. Runtime fallthrough calls
`patchDynamicProps` without its SVG flag; an isolated diagnostic copy passing
that flag updates both native and generated components from 24 to 48. Explicit
attribute binding in a native SFC also works. Neither workaround is applied here.
Later assertions in the width test are not reached. A separate test checks DOM
identity and click events across an update without depending on width.

Vapor refs without `defineExpose` do not promise a DOM element or `$el`:
the native control and generated icon both return `undefined`. Only the stable
Vue test asserts the public `$el` ref. The Vapor test uses DOM queries and does
not claim public ref support. Native controls with explicit exposure successfully
rendered on the server and hydrated the same SVG nodes; these results do not
establish SSR compatibility for generated icons.

No tests are skipped or marked as expected failures. Width and icon SSR remain
open failures, while #344 remains a separate unresolved characterization.

## Versions and limits

Both variants pin plugin-vue 6.0.9, vue-tsc 3.3.12, TypeScript 6.0.3 and
Playwright 1.64.0. Vue/compiler/server-renderer versions match within each lock.
Plugin-vue declares Vue `^3.2.25` and Vite majors 5 through 8. The RC Vue peer and
Vite+ core's own `1.1.0` version do not satisfy those ranges literally; successful
installation alone is not a compatibility result. Bun warned about the RC peer.

TypeScript 7.0.2 was tried first. Despite vue-tsc's `typescript >=5.0.0` peer,
vue-tsc 3.3.12 calls `require.resolve('typescript/lib/tsc')`, which fails with
`ERR_PACKAGE_PATH_NOT_EXPORTED` in TS 7.0.2. TS 6.0.3 passes the real typecheck.

Observed on macOS arm64 and Chromium 156.0.8078.4. Linux, Windows, other browser
engines and development HMR have not been tested.
