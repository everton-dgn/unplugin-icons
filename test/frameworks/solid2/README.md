# Solid 2 runtime fixture

This fixture consumes the repository's packed package with its own framework dependencies. It does not import production source files.

## Run

Use Node 24.21.0 (or a supported Vite+ Node version), pnpm 12.3.4 and Bun 1.4.2. From the repository root:

```sh
pnpm install --frozen-lockfile
node test/frameworks/solid2/run.mjs
```

Set `BUN` to an absolute Bun executable if the shell uses a version-manager shim. The runner creates a new `solid2-compat-*` directory in `os.tmpdir()`, outside the checkout. It backs up existing root `dist` under `os.tmpdir()/unplugin-icons-backups` (override with `UNPLUGIN_ICONS_BACKUP_DIR`), runs `pnpm exec tsdown --no-clean --no-exports`, and packs the resulting library. It extracts that tarball and checks its dependency declarations against `package-contract.json`.

After backing up the extracted manifest, the runner removes only `devDependencies` and `scripts` from that copy. This models a registry consumer without library development tooling or lifecycle scripts; it is an intentional manifest transformation, not an unchanged registry installation. Exports, runtime dependencies, peers, `dist` and `types` are preserved.

It installs the fixture's pinned dependencies with `bun install --frozen-lockfile`, then copies the package into the fresh `node_modules/unplugin-icons` directory. All installed files except the pruned manifest must have the same SHA-256 as the packed files. `package-bytes.json` records packed/installed hashes and the archive hash. The fixture cannot inherit checkout peers and does not use the root tsx loader.

The runner checks the app and type assertions with TypeScript 7.0.2 (`strict: true`, `skipLibCheck: false`, Bundler resolution), downloads the matching Chromium headless shell into the run, and executes Playwright.

To reuse a previously downloaded browser, set `PLAYWRIGHT_BROWSERS_PATH` to that run's `browsers` directory. Browser garbage collection is disabled. Runs, builds, reports and downloads are retained. Build output uses a fresh directory and `emptyOutDir: false`; no cleanup command is needed.

Run through the runner, rather than installing in this source directory. The root package manager and lockfile remain unchanged. The frozen lock covers framework, tooling and library runtime dependencies, not the mutable library tarball. No lock is regenerated during a test. Changes to library dependency declarations stop the runner and require explicit fixture/lock maintenance. The library's development dependencies and optional compiler peers are not installed.

Bun 1.4.2 reused stale bytes with a frozen `file:./package.tgz` dependency. A directory dependency read fresh bytes but installed the library's development dependency graph. Separate extraction avoids both behaviors. A modified-entry probe verified that the new strategy installs the new bytes with an unchanged frozen lock.

## Coverage

- Vite+ production builds for client and SSR using `@solidjs/vite-plugin`.
- Both component aliases, plus `?raw=false` remaining a component.
- SSR markup before client execution, then hydration retaining the exact SVG node.
- Independent client rendering, SVG refs and reactive attribute updates through a real button click.
- Consumer props overriding SVG defaults, escaped accessible labels, viewBox, gradientUnits, presentation attributes and local references.
- Raw query first/middle/last, repeated and encoded keys, and both typed raw prefixes with `raw=false` still producing strings.

The tests are named `*.e2e.ts` and selected explicitly by Playwright, outside the root Vitest test naming pattern.

## Versions and limits

Direct versions: Solid/core and web 2.0.0-rc.14, Solid Vite plugin 3.0.0-next.49, Vite+/core 1.1.0 and Playwright 1.64.0. The lock resolves Solid compiler and Babel plugin 2.0.0-rc.14. Vite+ is local; Bun installs dependencies while Node runs builds and tests.

The icon deliberately keeps literal IDs. Three instances produce three copies of `paint` and `shape`; the characterization test records this existing behavior, not collision-free IDs or isolated gradient resolution.

The custom SVG's existing `width="16"` survives raw dimension queries. In this fixture, `width=31` adds `height="31"`, while an explicit `height=32` produces that height. This is recorded separately from component props, which do override the SVG defaults.

Observed environment: macOS arm64, Node 24.21.0, Bun 1.4.2 and Chromium headless shell 156.0.8078.4. This covers production builds, SSR and hydration. Linux, Windows, development HMR, streaming SSR, other browsers and older Solid/plugin combinations are not verified. The broader Node16 type matrix remains covered by the separate packed-consumer type tests.
