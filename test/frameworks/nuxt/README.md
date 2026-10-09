# Nuxt runtime fixture

This isolated consumer uses the packed `unplugin-icons/nuxt` module. It does not
register the Vite plugin manually. Production SSR, hydration and the two browser
tests pass with Nuxt 4.6.0, Vue/compiler-sfc 3.5.43 and Vite+/core 1.1.0.

## Run

Use Node 24.21.0, pnpm 12.3.4 and Bun 1.4.2. From the repository root:

```sh
pnpm install --frozen-lockfile
node test/frameworks/nuxt/run.mjs
pnpm exec eslint test/frameworks/nuxt
```

Each run creates a retained consumer under `os.tmpdir()`, outside the checkout,
and rejects framework resolution from ancestor directories. Bun uses a fresh
per-run cache and the checked-in frozen lock; the runner checks that its bytes
remain unchanged. To refresh dependencies explicitly, use `--resolve-lock`,
inspect the retained consumer's lock, back up the fixture lock before replacing
it, then repeat the normal frozen run.

The runner backs up existing library `dist` under
`os.tmpdir()/unplugin-icons-backups`, configurable with
`UNPLUGIN_ICONS_BACKUP_DIR`. It then renames the old directory into a retained
`node_modules/.unplugin-icons-dist-*/dist` directory. Rename failure stops the
run. `pnpm exec tsdown --no-clean --no-exports` produces fresh output before
packing. The runner does not execute `prebuild`; it compiles the current code
and catalog and checks that catalog bytes stay unchanged. It does not validate
catalog generation or release preparation.

Only the extracted package manifest loses development dependencies and scripts,
after backup. All installed `dist` and `types` hashes must match the extracted
package. `evidence.json` records hashes and resolved peer paths, including Vite
resolved from Nuxt's builder. `vite` is an explicit alias of
`@voidzero-dev/vite-plus-core@1.1.0`, with the same override. This tests the real
builder integration, not every Vite+ command.

## Coverage

- Node runs `nuxt prepare`, the strict public declaration check, `nuxt typecheck`
  and `nuxt build`. The production server runs `.output/server/index.mjs`.
- The module must inject `unplugin-icons/types/vue` into Nuxt's generated app
  configuration. The standalone contract check uses that injected declaration,
  `strict: true` and `skipLibCheck: false`, with negative component/prop/raw cases.
  Application declarations follow Nuxt's generated configuration.
- SSR is checked with JavaScript disabled. A separate test blocks scripts,
  captures the SVG nodes, then allows hydration and checks node identity, SVG
  refs, namespace attributes, title/ARIA escaping, reactive props and events.
- Both component aliases, dotted names, decimal dimensions, both raw prefixes
  with `raw=false`, and `raw=true` query output are exercised. Query-based raw
  output is tested at runtime; strict string declarations cover raw prefixes.
  The custom SVG has no literal width or height attributes.
- Hydrated icons have no IDs, avoiding the known Vue SVG ID hydration issue.
  The namespace reference targets a separate static SVG asset.

The browser runs in its own headless process on localhost. Port selection occurs
immediately before startup, with at most two retries for occupied ports only.
No existing server is reused. `PLAYWRIGHT_BROWSERS_PATH` overrides the default
`node_modules/nuxt-browser-1.64.0`; browser GC is disabled. Outputs and backups
remain available after success or failure.

Additional pins: TypeScript 6.0.3, vue-tsc 3.3.12, @types/node 24.19.2 and
Playwright 1.64.0. TypeScript 7 is not part of this fixture. Observed on macOS
arm64 with Chromium; Linux, Windows, other browsers, development HMR, Webpack,
Nuxt 2/3 and SVG ID hydration are not verified here.

Sources: [Nuxt modules](https://nuxt.com/docs/4.x/guide/concepts/modules),
[Nuxt TypeScript](https://nuxt.com/docs/4.x/guide/concepts/typescript),
[Nuxt build](https://nuxt.com/docs/4.x/api/commands/build),
and [Vite+ local installation](https://viteplus.dev/guide/local-cli).
