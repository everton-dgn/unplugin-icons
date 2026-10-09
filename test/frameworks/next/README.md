# Next App Router compatibility

This consumer uses Next 16.4.0 with React/ReactDOM 19.3.0, React types 19.3.0,
Node types 24.19.2, TypeScript 7.0.2, SVGR 8.1.0 and Playwright 1.64.0.
Bun 1.4.2 installs dependencies; Node runs Next and Playwright (tested with
Node 24.21.0 on macOS). The runner uses Unix tools available on macOS/Linux;
Linux and Windows execution have not been verified in this change.
Next uses its own Webpack through explicit `--webpack` scripts.
Vite+ is not part of this fixture.

## Run

From the repository root, with the root dependencies installed:

```sh
node test/frameworks/next/run.mjs
pnpm exec eslint test/frameworks/next
```

The runner backs up an existing `dist` under `os.tmpdir()/unplugin-icons-backups`, then builds
with `pnpm exec tsdown --no-clean --no-exports` before packing the library.
Set `UNPLUGIN_ICONS_BACKUP_DIR` to override the backup directory. Backups are retained.
It does not regenerate the icon catalog or rewrite the root manifest.
Do not run `pnpm build`.

Every invocation creates a fresh directory under `os.tmpdir()`, outside the
checkout. Peer resolution must fail before installation, preventing inheritance
from ancestor `node_modules`. The runner extracts the tarball into `package`,
backs up its manifest, and removes only `devDependencies` and `scripts` there.
This models registry installation without Bun installing the library's development
toolchain. The source manifest stays untouched; `dist` and `types` bytes remain
identical to the tarball. All installed `dist`/`types` hashes are verified, and
peer paths must remain inside the consumer. `evidence.json` records that proof.

The runner installs the real package through `file:./package`, then runs a frozen
Bun install, strict types, a production Next build, and Playwright against `next start`.
Next only builds inside this new directory; do not rebuild an old run if its
outputs need to be retained. The runner does not remove previous runs.

The consumer no longer needs the `transpilePackages` workaround for application
TSX under `node_modules`. Playwright loads TS through `tsx`. Its `*.e2e.ts` testMatch avoids
collection by the root Vitest suite.

Chromium is installed locally in `node_modules/next-browser-1.64.0`, unless
the caller supplies `PLAYWRIGHT_BROWSERS_PATH`. Browser garbage collection is
disabled with `PLAYWRIGHT_SKIP_BROWSER_GC=1`. Browser results use fresh paths.
Set `PORT` to override 4197; an existing server is never reused. Network access
is required for uncached dependencies and the first browser download.

## Contract and assertions

`app/page.tsx` is a Server Component and imports both raw prefixes. It renders
`client-icons.tsx`, whose `use client` boundary contains both component prefixes,
state, an event and an SVG ref. Client Components still produce server HTML;
this fixture does not disable SSR or import generated components directly into
the RSC graph outside that boundary.

The browser test first blocks external scripts, checks the rendered SVG and
server raw strings, and stores the SVG node. After releasing scripts, it checks
hydration retained the node, the ref is an SVGSVGElement, attributes and namespace
references survived, and an event updates props/title/ARIA without replacing it.
Browser errors are asserted empty. Next owns hydrateRoot; this test does not
replace its internal onRecoverableError callback.

The separate `tsconfig.types.json` uses `strict: true` and `skipLibCheck: false`,
including only `types.tsx` and the React/raw-prefix declarations, without generated
Next declarations. Invalid props, a div ref and invalid raw assignments must be rejected.
The application keeps `strict: true`; its `skipLibCheck: true` follows Next 16.4.0's
suggested setting in `next/dist/lib/typescript/writeConfigurationDefaults.js`.
Next still checks application code during the build; `ignoreBuildErrors` is not enabled.
This separates strict library declaration coverage from the framework's declaration defaults.
TypeScript 7.0.2 is retained: Next declares no TypeScript peer upper bound, and its
CLI typecheck completed successfully in this fixture.

## Verified result

Frozen installation (127 packages), strict public types, the production Webpack build
and the Chromium SSR/hydration test pass with the virtual-scheme fix from PR #19.
The validated package was built from commit `3c6a7afb243ac58c4c683828189f7a0fb8075b14`
(tree `0ed55b6cbc5ba06725d348a7669c1dc84658632a`, clean working tree).
Both component aliases and both raw aliases remain covered. Installed `dist`/`types`
hashes matched the tarball, and all checked peers resolved inside the isolated consumer.
Run the normal runner from a checkout containing that fix; the original library
base `b8ce6b4` predates it.

Webpack also reports cache-dependency warnings for dynamic imports in local-pkg,
Iconify utils and mlly. Persistent cache behavior is not validated here.
Turbopack, direct RSC component imports, development HMR and Firefox/WebKit are
outside this fixture's current coverage.

To update pinned dependencies, use `node test/frameworks/next/run.mjs --resolve-lock`.
The new lock is generated without reusing the old lock in the run directory.
Back up the checked-in fixture
lock before replacing it, review it, then rerun without that flag.

`node test/frameworks/next/replay.mjs /path/to/prepared-run` checks fresh frozen
installation after a harmless comment changes the packed webpack entry's bytes
at the same package version. It verifies installed hashes from the modified
`file:./package` directory and an unchanged lock, and writes `replay-evidence.json`. Source files and
the original run remain unchanged.

References: [Client Component boundaries](https://nextjs.org/docs/app/getting-started/server-and-client-components),
[transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages).

Before building, the packaging helper backs up existing `dist` externally, then
renames it to a fresh `node_modules/.unplugin-icons-dist-*/dist` directory. Both
copies are retained. The build starts without a `dist` directory, so obsolete
entries and chunks cannot enter the new package. A failed rename stops the run
before the build; it never falls back to deleting or reusing the old output.

The standalone replay requires Bun 1.4.2. It validates updates using a fresh
`file:directory` consumer; it does not test tarball-file cache invalidation.

The runner compiles the checked-in code and icon catalog. It does not run
`prebuild`, regenerate the catalog, or validate release preparation.
