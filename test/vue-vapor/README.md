# Vue Vapor SSR regression

Run the focused tests with `pnpm exec vitest run test/vue-vapor`.
They bundle and import real SSR output, preserve aliases/raw queries and SVG
ID references per server instance, and check adapter isolation and custom
compiler arguments. The root test uses its installed Vue 3.5 runtime; the
separate browser regression uses the frozen Vue 3.6.0-rc.10 fixture.

After `pnpm install --frozen-lockfile`, prepare the current package using the
frozen Vue compatibility harness (this does not edit that harness):

```sh
node test/vue-vapor/prepare-runtime.mjs /path/to/test/frameworks/vue
PLAYWRIGHT_SKIP_BROWSER_GC=1 bun test/vue-vapor/hydration.e2e.mjs <RUN_DIR>
```

Use `PLAYWRIGHT_BROWSERS_PATH` to select an existing Chromium headless-shell
installation. The runner launches its own headless browser. The preparation
reuses the frozen manifest/lock, backups and fresh-dist packaging helper. Set
`UNPLUGIN_ICONS_BACKUP_DIR` to override the OS temporary backup directory.
All runs and build output are retained outside the checkout.

The browser test builds server and client with the same plugin instance,
imports the SSR bundle, then checks SVG node identity across hydration,
reactive data attributes, click events, aliases and raw queries. It uses the
real installed package and peers, with no production-source aliases.

This regression does not claim a public Vapor ref contract or a fix for rc.10
SVG width fallthrough. The separate [ID regression](../vue-ids/README.md) covers #344. The hydrated icons here contain no IDs. A separate Vue 3.6 SSR render checks two gradient instances for distinct
IDs and matching references; it does not hydrate those instances.
