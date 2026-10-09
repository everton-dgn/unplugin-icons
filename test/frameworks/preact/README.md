# Preact 11 runtime fixture

This consumer uses the packed library, Preact 11.0.1, @preact/preset-vite 2.10.6, preact-render-to-string 6.8.0, Vite+/core 1.1.0, TypeScript 7.0.2 and Playwright 1.64.0. Babel 7.29.7 matches the preset's 7.x peer; SVGR core/plugin-jsx are pinned at 8.1.0.

## Run

With Node 24.21.0, Bun 1.4.2 and pnpm 12.3.4, from the repository root:

```sh
pnpm install --frozen-lockfile
node test/frameworks/preact/run.mjs
```

Set `BUN` to a Bun executable when needed. Backups default to `unplugin-icons-backups` under `os.tmpdir()`; `UNPLUGIN_ICONS_BACKUP_DIR` overrides the parent directory. An existing `PLAYWRIGHT_BROWSERS_PATH` is preserved; otherwise browsers are installed inside the retained run. Browser garbage collection is disabled. Tests use an independent headless Chromium process.

Each run lives outside the checkout in `os.tmpdir()`. Required peers must be absent before installation and resolve inside the fixture afterward. The runner backs up root dist, builds with `tsdown --no-clean --no-exports`, packs and extracts the library. Only the extracted manifest's devDependencies and scripts are removed, after backup, to model registry consumer dependency behavior. All dist/types file hashes must match before and after installation. The package remains a fresh `file:./package` directory dependency; external dependencies use the committed frozen Bun lock. No lock is regenerated during tests.

The runner runs strict TypeScript with `skipLibCheck: false` before Playwright. Playwright builds both client and SSR bundles, serves SSR markup locally, and validates the browser. All artifacts and backups are retained; output directories are fresh or use `emptyOutDir: false`.

## Coverage

The fixture uses `compiler: 'jsx', jsx: 'preact'` and activates the preset's Babel pipeline with `babel: {}`. React aliases and Prefresh are disabled. React/react-dom must not resolve, and the build rejects React or preact/compat modules.

Tests cover both component aliases, SSR markup before JavaScript, hydration node identity, independent client rendering, ref to the SVG element, state updates from a click, props precedence, SVG case-sensitive/presentation/namespace attributes, title and label escaping, raw prefixes and raw query ordering/repetition/encoding. Preact 11 passes refs through function-component props; no forwardRef shim is introduced. Client rendering converts xlink:href to href; SSR/hydration preserve the serialized namespace. A reference with only xlink:href is tested too.

IDs are intentionally literal across instances. The test characterizes duplicate IDs, not collision-free references. The localhost asset server rejects traversal and symlink escapes.

## Public types

The fixture consumes `types/preact` and `types/raw-prefix` from the package. Strict typechecking verifies SVG props and refs and rejects unknown props and callable raw imports. It does not augment or replace the library declarations. With the Preact 11 declaration fix, typechecking, both builds and all six browser tests pass.

Observed platform: macOS arm64, Node 24.21.0, Bun 1.4.2 and Chromium headless shell 156.0.8078.4. Linux, Windows, development HMR, other browsers and Preact 10 are not verified by this fixture.

Before building, the packaging helper backs up existing `dist` externally, then
renames it to a fresh `node_modules/.unplugin-icons-dist-*/dist` directory. Both
copies are retained. The build starts without a `dist` directory, so obsolete
entries and chunks cannot enter the new package. A failed rename stops the run
before the build; it never falls back to deleting or reusing the old output.

The runner compiles the checked-in code and icon catalog. It does not run
`prebuild`, regenerate the catalog, or validate release preparation.
