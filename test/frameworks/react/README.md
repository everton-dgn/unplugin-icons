# React runtime compatibility

This isolated consumer tests the packed library with React and ReactDOM 19.3.0,
their 19.3.0 types, SVGR 8.1.0, React Vite plugin 6.1.2, and Vite+/core 1.1.0.
The local override pins Vitest to 5.0.3. TypeScript is 7.0.2 and Playwright is
1.64.0. Installation uses Bun 1.4.2; builds and browser tests run on Node.
Use a Node version supported by Vite+ (tested with Node 24.21.0 on macOS).
The runner uses Unix tools available on macOS/Linux; Linux and Windows execution
have not been verified in this change.

## Run from the repository root

```sh
pnpm install --frozen-lockfile
node test/frameworks/react/run.mjs
pnpm exec eslint test/frameworks/react
```

The runner backs up an existing `dist` under `os.tmpdir()/unplugin-icons-backups`
(override with `UNPLUGIN_ICONS_BACKUP_DIR`), then builds
the library with `pnpm exec tsdown --no-clean --no-exports` before packing it.
It does not regenerate the icon catalog or rewrite the root manifest.
Do not use `pnpm build`, which clears the output directory.

Each run uses a fresh directory under `os.tmpdir()`, outside the checkout.
Before installation, peer resolution must fail there, preventing inheritance
from ancestor `node_modules`. The runner extracts the real tarball into
`package`, backs up its manifest, and removes only `devDependencies` and `scripts`
from that extracted manifest. This models registry installation without importing
the library's development toolchain through Bun's local-directory dependency.
The source manifest is untouched; all `dist` and `types` bytes remain unchanged.
SHA-256 comparisons verify every installed `dist`/`types` file against the
extracted tarball, and real peer paths must remain inside the consumer.
`evidence.json` records hashes, peer versions/paths and backup locations.

The runner then runs a frozen Bun
installation, strict type checking, production client and SSR builds, and a
headless Chromium test. It preserves `PLAYWRIGHT_BROWSERS_PATH` when supplied by
the caller; otherwise, Chromium is installed locally under
`node_modules/react-browser-1.64.0`. The runner sets `PLAYWRIGHT_SKIP_BROWSER_GC=1`
to retain existing browser installations. Registry and browser-download access
are required on a cold cache. pnpm remains necessary for packaging the library.

All run directories, tarballs and browser results are retained. Set `PORT` to
select a free port (default 4187); an existing server is never reused.
Playwright loads TypeScript through `tsx`. Tests are named
`*.e2e.ts` and selected explicitly, so root Vitest does not collect them.

## Coverage

- The production server renders icons before browser JavaScript runs.
- `hydrateRoot` retains the original SVG node and reports no recoverable errors.
- The forwarded ref receives an `SVGSVGElement`; state updates preserve its node.
- SVG props, title escaping, ARIA, presentation attributes and `xlink:href`
  survive SSR and hydration.
- Both component prefixes and both raw prefixes resolve through the packed plugin.
- `types/react` and `types/raw-prefix` coexist with `strict: true` and
  `skipLibCheck: false`; invalid props, a div ref and incorrect raw assignments
  must produce TypeScript errors.

## Updating the lock

After intentionally changing a pinned fixture dependency, run
`node test/frameworks/react/run.mjs --resolve-lock`. This generates a lock in the
new run directory, not in the source fixture. Back up the existing fixture lock
before replacing it with the generated `bun.lock`, review the change, and rerun
without `--resolve-lock` to prove frozen installation works.

To verify that a fresh frozen installation receives changed package bytes at
the same version, run `node test/frameworks/react/replay.mjs /path/to/completed-run`.
The replay retains a new temporary consumer, backs up one extracted module,
appends a harmless comment, and asserts that installed hashes match the modified
`file:./package` directory while the package version and lock remain byte-identical. All other module
and declaration hashes must remain unchanged. It does not modify source or the
original run; evidence is written to `replay-evidence.json`.

This fixture does not cover Next.js, React Server Components, development HMR,
multiple-instance SVG ID isolation, or Firefox/WebKit. It does not certify the
library's execution under the Bun runtime or replace the root ESLint rules.

Before building, the packaging helper backs up existing `dist` externally, then
renames it to a fresh `node_modules/.unplugin-icons-dist-*/dist` directory. Both
copies are retained. The build starts without a `dist` directory, so obsolete
entries and chunks cannot enter the new package. A failed rename stops the run
before the build; it never falls back to deleting or reusing the old output.

The standalone replay requires Bun 1.4.2. It validates updates using a fresh
`file:directory` consumer; it does not test tarball-file cache invalidation.

The runner compiles the checked-in code and icon catalog. It does not run
`prebuild`, regenerate the catalog, or validate release preparation.
