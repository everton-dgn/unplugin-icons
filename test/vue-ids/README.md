# Vue SSR and hydration IDs

This regression consumes the freshly packed library with Vue 3.5.43 or Vapor
3.6.0-rc.10. It uses the existing Vue fixture's isolated installation, frozen Bun
lock and complete code/type hash audit. No production-source aliases or compiler
mocks are used.

Vapor hydration uses `createSSRApp` with `vaporInteropPlugin`. This fixture does
not verify native `createVaporApp` hydration.

From the repository root:

```sh
pnpm install --frozen-lockfile
node test/frameworks/vue/prepare.mjs
# Use the printed RUN_DIR:
node test/vue-ids/run.mjs <RUN_DIR>
# Prepare a separate Vapor consumer:
node test/frameworks/vue/prepare.mjs --vapor
node test/vue-ids/run.mjs <VAPOR_RUN_DIR>
```

Preparation builds with `tsdown --no-clean --no-exports`, backs up and moves the
previous dist before building, and retains all output. Set
`UNPLUGIN_ICONS_BACKUP_DIR` to override its temporary backup directory. Browser
runs preserve `PLAYWRIGHT_BROWSERS_PATH`, default to the Vue fixture's ignored
browser cache, and disable browser garbage collection. Install Chromium headless
shell through the prepared consumer if the cache is cold:

```sh
PLAYWRIGHT_SKIP_BROWSER_GC=1 PLAYWRIGHT_BROWSERS_PATH=<BROWSER_CACHE> \
  node <RUN_DIR>/node_modules/@playwright/test/cli.js install chromium --only-shell
PLAYWRIGHT_BROWSERS_PATH=<BROWSER_CACHE> node test/vue-ids/run.mjs <RUN_DIR>
```

The runner creates a new `ids-*` directory for each invocation. It uses the same
plugin instance for client and SSR builds and checks:

- Two instances of one icon plus a second alias with a width query have distinct IDs.
- Concurrent fresh applications produce the same SSR HTML for the same prefix.
- A different application prefix separates IDs.
- SVG nodes and IDs survive hydration, references remain linked, and no hydration
  or useId diagnostics occur.

Each successful run retains `result.json`, generated entries and both bundles.
The root tests also check that unreferenced literal IDs do not introduce a useId
import in any of the three Vue compiler paths.

The stable Vue framework fixture additionally checks refs, events and reactive
props. This focused test avoids Vapor rc.10's unresolved SVG width fallthrough.
It does not expand the helper's existing `url(#...)` attribute matching to CSS
blocks, SMIL or ARIA, and makes no claim about other frameworks' IDs. Async
component boundaries, development HMR, Linux, Windows and other browser engines
are not covered. Observed with Node 24.21.0, Bun 1.4.2 installation, Vite+/core
1.1.0 and Playwright 1.64.0 on macOS arm64.
