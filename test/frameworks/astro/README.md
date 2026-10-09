# Astro SSR compatibility fixture

This fixture consumes a freshly built and packed `unplugin-icons` package in a
new operating-system temporary directory. It tests Astro 7.3.8 with its Rust
compiler, `@astrojs/node` 11.1.7 and Vite+/core 1.1.0. Bun 1.4.2 installs the
consumer. Playwright 1.64.0 runs Chromium headlessly with JavaScript disabled.

## Run

From the repository root, using Node 24.21.0 and Bun 1.4.2:

```sh
pnpm install --frozen-lockfile
node test/frameworks/astro/run.mjs
```

The dependency installs and the Playwright browser download may require network access. The runner
preserves a caller-provided `PLAYWRIGHT_BROWSERS_PATH`, disables browser garbage
collection and otherwise stores its browser under the checkout's `node_modules`.

The full command currently exits nonzero at the strict TypeScript gate because
Astro 7.3.8 publishes inconsistent declarations. Runtime tests still execute;
the runner never converts the failed gate to a successful result. `astro check`
and the standalone `tsc` gate are distinct checks. TypeScript 6.0.3 matches the
declared peer range of `@astrojs/check` 0.9.10; this fixture does not claim
TypeScript 7 support. This is runtime validation with an upstream type-checking
blocker, not a claim of complete Astro support.

### Runtime commands only

The existing consumer scripts can run individual stages inside an isolated run:

```sh
bun run build
bun run test
```

Run the build only in a fresh run whose output directory does not exist yet.
The test command requires an already-running fixture server and
`ASTRO_TEST_URL` set to its localhost URL; it does not launch a server. Preserve
the browser path used by the runner and set `PLAYWRIGHT_SKIP_BROWSER_GC=1`.
These commands validate only their named runtime stages. They do not run the
strict type gate and must not be reported as a successful full fixture run.
The root-level runner above remains the complete validation command.

## Package isolation

Before building, the runner backs up the previous `dist` externally and renames
it into a unique retained directory under the checkout's `node_modules`. A stale
marker must remain in that retained directory and be absent from the tarball.
It then invokes `pnpm exec tsdown --no-clean --no-exports` and `pnpm pack`.
It does not run `prebuild` or regenerate the versioned icon catalog; the catalog
must remain byte-identical. The fixture uses its own SVG collection.

The tarball is extracted into a fresh `package` directory. Only `devDependencies`
and `scripts` are removed from the extracted manifest after backing it up.
Runtime dependencies, optional peer declarations, exports, `dist` and `types`
remain intact. This avoids installing library development dependencies and
scripts as part of the `file:./package` consumer.

The normal install uses `bun install --frozen-lockfile`. SHA-256 comparisons
verify every installed `dist` and `types` file against the extracted tarball.
Dependency resolution must fail before installation and resolve inside the
isolated consumer afterwards. No production source alias is used.

Backups default to `os.tmpdir()/unplugin-icons-backups`. Set
`UNPLUGIN_ICONS_BACKUP_DIR` to override this location. Runs, tarballs, logs,
browser results and backups are retained. The runner prints the run directory.
`evidence.json` records package hashes and dependency locations.

To deliberately regenerate the lock, run with `--resolve-lock`. This backs up
the existing fixture lock, resolves in a fresh retained consumer and leaves the
new lock there for review. Copy it back only after reviewing dependency changes;
normal runs never regenerate it.

## Coverage

- HTTP SSR in development and the built Node standalone server, bound to
  `127.0.0.1`; ports are selected immediately before each launch, with at most
  three collision attempts and no reuse of an existing server.
- `~icons/` and `virtual:icons/`, including explicit `.astro` and decimal query
  values; both typed raw aliases with `raw=false`, repeated and encoded queries,
  and legacy raw queries in first, middle and last positions.
- SVG case-sensitive attributes, namespace-aware `xlink:href`, title entities
  and consumer attribute escaping. Raw HTML contains one `width`, `height` and
  `fill` on the component root, with consumer props overriding SVG defaults.
  The parsed DOM also checks these overrides and defaults on an unmodified icon.
  Embedded custom SVG dimensions remain unchanged by Iconify query customization,
  so query decoding is checked with `data-probe`.
- Known IDs and fragment references remain intact. Repeated instances retain
  duplicate IDs. This characterizes the existing behavior, not a fix for #321.
- Strict component/raw consumer types with `skipLibCheck: false`, including
  invalid component props and non-callable raw strings.

`upstream-types.ts` imports only Astro. In a retained run, execute
`bun x --no-install tsc --noEmit -p tsconfig.upstream.json` to reproduce the
upstream declaration failures without importing unplugin-icons. In particular,
`astro/astro-jsx.d.ts` references `KebabKeys`, which the published
`astro/dist/type-utils.d.ts` does not export. Other diagnostics concern Astro
declarations and optional storage driver types. No local type shim or
`skipLibCheck` workaround is applied.

## Upstream patch comparison

Separate temporary consumers compared the registry packages Astro 7.3.7 and
7.3.8 with TypeScript 6.0.3 and `@types/node` 24.19.2. Both versions fail with
`strict: true` and `skipLibCheck: false`. Their `astro-jsx.d.ts` and
`dist/type-utils.d.ts` files have identical SHA-256 hashes: both reference the
missing `KebabKeys` export. Downgrading to 7.3.7 does not fix this gate, so the
fixture stays on 7.3.8.

Bundler and NodeNext were checked separately. NodeNext also rejects the
extensionless `import './astro-jsx'` in `astro/types.d.ts`; this can prevent that
path from loading the problematic JSX declaration. A control using the public
`astro/astro-jsx` entry explicitly reproduces `KebabKeys` without unplugin-icons
in either mode. The internal `./dist/type-utils.js` import resolves to the
installed `dist/type-utils.d.ts`, ruling out a different file being selected.

Against that explicit Astro-only baseline, the unplugin-icons consumer adds
zero diagnostics in either version or resolution mode. Removing its
`@ts-expect-error` annotations produces the three intended errors: invalid SVG
property (TS2353), calling a raw string (TS2349), and assigning a component to a
string (TS2322). These checks exercise both component aliases and both raw
aliases. They do not turn the upstream declaration failures into a passing gate.
No shim, downgrade or relaxed library checking is used.

This is server-rendered Astro, with no hydration claim. Vite+ is tested through
`astro build`, not a replacement build pipeline. Results cover macOS arm64 only;
Linux, Windows, other browsers, file-watcher HMR and deployment platforms are
unverified. Source production code and the root manifest/lock are not modified.
