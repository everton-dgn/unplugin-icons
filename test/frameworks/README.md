# Framework compatibility checks

These consumers test the built package with pinned framework versions. They
complement the root regression suite and retain the existing examples for other
supported versions. Each fixture documents its dependencies, commands and limits.

| Consumer | Framework versions | Verified behavior | Instructions |
| --- | --- | --- | --- |
| React | React/ReactDOM 19.3.0 | Strict types, production SSR, hydration, SVG refs, reactive props and raw imports | [React fixture](./react/README.md) |
| Next App Router | Next 16.4.0, React/ReactDOM 19.3.0 | Strict public types, Webpack production build, SSR, hydration and raw imports across Server/Client Component boundaries | [Next fixture](./next/README.md) |
| Preact | Preact 11.0.1, preset 2.10.6 | Strict types, SSR, hydration, client rendering, native SVG attributes and refs without React compatibility | [Preact fixture](./preact/README.md) |
| Solid 2 | Core/web 2.0.0-rc.14, Vite plugin 3.0.0-next.49 | Strict types, production SSR, hydration, client rendering, SVG refs, reactive props and raw queries | [Solid 2 fixture](./solid2/README.md) |
| SvelteKit | Svelte 5.57.2, Kit 3.0.1, Vite plugin 7.3.1 | Strict types, production SSR, hydration, runes and SVG events with Node and Bun adapters | [Svelte fixture](./svelte/README.md) |

React, Preact, Solid and Svelte use local Vite+/core 1.1.0. Next uses its own
Webpack. All fixtures install with Bun 1.4.2. React, Next, Preact and Solid use
TypeScript 7.0.2; Svelte uses 6.0.3 to satisfy Kit and svelte-check's declared peer
ranges. Bun installs the dependencies; only the Svelte fixture also verifies
builds and server execution under Bun. The repository itself still uses pnpm.

## Reproduce a check

Install the root workspace with `pnpm install --frozen-lockfile`, then follow the
fixture's README. The runner rebuilds and packs the library before creating a
fresh consumer outside the checkout. A frozen fixture lock pins framework and
tooling dependencies. Registry access and a Chromium download are needed on a
cold cache.

The fixtures verify the installed code and type files against the freshly packed
files. The extracted package manifest omits development dependencies and scripts
so they cannot supply undeclared consumer dependencies. This deliberate manifest
adjustment is documented in each fixture; these are local package tests, rather
than installations from the registry.

Builds, package archives and reports are retained. Existing build output receives
an external backup, then moves to a retained directory under node_modules before
rebuilding. The new package contains only newly generated output. These runners
compile the checked-in icon catalog; they do not run catalog generation or validate
release preparation. Set `UNPLUGIN_ICONS_BACKUP_DIR` to choose its location
and `PLAYWRIGHT_BROWSERS_PATH` to reuse a browser installation. Browser garbage
collection is disabled.

## Scope of the evidence

The recorded runs use macOS arm64, Node 24.21.0 and Chromium. They do not establish
Linux/Windows, other browser engines, development HMR or every supported framework
version. The root suite is separate: run `pnpm test --run --maxWorkers=2`,
`pnpm lint` and `pnpm typecheck` for library regression checks.

The Solid 2 and Preact fixtures record literal SVG IDs repeated across instances. A successful
build or hydration check does not imply isolated gradients or references between
instances. Each fixture lists further limits beside its verified behavior.
