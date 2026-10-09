# Svelte runtime compatibility

This fixture packs this checkout, extracts it into a fresh OS temporary directory
and installs `file:./package`, with its own peers and lockfile. Versions are pinned in
`vite-plus/package.json` for the preferred Bun/Vite+ run and
`fixture/pnpm-workspace.yaml` for native Vite. Both are independent workspaces.

## Run

Use Node 24.21.0, pnpm 12.3.4 (package preparation) and Bun 1.4.2.
Run from the repository root:

```sh
pnpm install --frozen-lockfile
node test/frameworks/svelte/prepare.mjs
node test/frameworks/svelte/verify.mjs <RUN_DIR> bun
```

`prepare.mjs` prints `RUN_DIR`. It builds the package using
`tsdown --no-clean --no-exports`, then packs without lifecycle scripts. It backs
up the extracted manifest before removing its development dependencies and scripts.
Installation uses `bun install --frozen-lockfile` against the fresh directory,
avoiding a cached tarball with a reused filename. Existing `dist` is backed up
under `os.tmpdir()/unplugin-icons-backups` first (override with
`UNPLUGIN_ICONS_BACKUP_DIR`). Root files are untouched.

The native Vite alternative retains its pnpm lockfile. Prepare a separate run:

```sh
node test/frameworks/svelte/prepare.mjs --native
node test/frameworks/svelte/verify.mjs <NEW_RUN_DIR> node
```

The verifier runs Svelte diagnostics, builds the real Kit app with the selected
runtime and adapter, installs local Chromium, and runs two headless browser tests
against the production server. The server uses a dynamically allocated port.
The verifier rejects directories with an existing build. Runs and their build/test
artifacts remain in `os.tmpdir()`, outside the checkout and its ancestors' peer
resolution paths. The downloaded browser is cached in this module's ignored
`node_modules/browsers`; nothing is cleaned.
Playwright and typecheck binaries are invoked directly, so pnpm cannot replace
the Bun installation through automatic installation during `pnpm exec`.

Playwright loads `.e2e.ts` tests directly from the temporary fixture. Root Vitest
does not collect these tests. No transpilation workaround is needed outside
`node_modules`.

If package dependency metadata changes, refresh the fixture lock explicitly:
run `prepare.mjs --refresh-lock`, review the generated
lockfile, then copy it to `vite-plus/bun.lock` after backing up the previous file.
For native Vite, use `--native --refresh-lock` and `fixture/pnpm-lock.yaml`.
Re-run a normal frozen preparation. Do not update dependency versions as part
of that refresh.

`audit.mjs` compares the complete `dist`/`types` file lists and SHA-256 digests
between the extracted and installed packages before building. It also checks that
the installed manifest has no development dependencies/scripts, and resolves and
loads Svelte/compiler from the fixture in the selected runtime. Each audit writes
a fresh `audit-*/provenance.json` with paths, runtime and both hashes. A stale
installed package or a peer resolved outside the fixture fails the run.

## Coverage

- Svelte 5.57.2, Kit 3.0.1, Vite+/core 1.1.0 and plugin-svelte 7.3.1.
- Native Vite 8.3.4 is also validated with the same application and assertions.
- Adapter-node 6.0.0 and adapter-bun 1.0.0; production SSR and client builds.
- Both icon aliases, decimal query width, both raw prefixes, dotted raw names
  and the raw prefix's precedence over `raw=false`.
- SSR output before client scripts run, then identity of both SVG nodes across
  hydration, without replacing the server-rendered nodes.
- `$state`/`$derived`, updated width/data/style attributes, SVG click events,
  class, accessibility attributes and a second icon instance.
- TypeScript 6.0.3, svelte-check 4.7.6 and public Svelte 5/raw declarations.
  Positive SVG props and event types plus negative component/string and width
  assignments are checked with `skipLibCheck: false`.

Type diagnostics cover app sources and browser tests. Build configuration is
executed by Vite; it is excluded from this consumer typecheck because unplugin's
adapter declarations import optional bundlers that this fixture does not use.
No compiler/framework mocks, skipped tests or expected runtime failures are used.

TypeScript 6.0.3 stays within the installed packages' declared peer ranges:
Kit 3.0.1 requires `typescript: ^6.0.0`; svelte-check 4.7.6 accepts
`^5.0.0 || ^6.0.0`. Both exclude TypeScript 7.0.2. This is a declared support
boundary; TypeScript 7 execution has not been tested here.

## Vite+ peer metadata

Vite+ 1.1.0 with the official `vite` alias/override to
`@voidzero-dev/vite-plus-core@1.1.0` reports its own version `1.1.0`. Kit's peer
range is `^8.0.12`; plugin-svelte's range includes `^8`. An earlier strict pnpm
installation rejected this metadata with `ERR_PNPM_PEER_DEP_ISSUES`. That did not
establish a runtime incompatibility. Bun installation, Kit SSR/client builds and
both SSR/hydration tests now pass with the core. The Bun installation emitted no
peer warning; pnpm with non-strict peers warned about the mismatch.

The verifier uses the installed core's CLI (`dist/vite/node/cli.js`) to run the
Kit multi-environment build. Native Vite's `bin/vite.js` path does not exist in
the aliased package. This validates the core, not every command in the `vp` CLI.

Validated on macOS arm64 with Chromium 156.0.8078.4 / Playwright 1.64.0.
Other operating systems, browser engines and development HMR are not covered.
