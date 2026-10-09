# Marko 6 runtime fixture

This is a real packed-package consumer. With the Marko SVG escaping fix and the
explicit alias configuration below, all 21 tests pass. Assertions remain active,
without skips or expected-failure markers. Run from a checkout containing the fix.

## Run

Use Node 24.21.0, pnpm 12.3.4 and Bun 1.4.2. From the repository root:

```sh
pnpm install --frozen-lockfile
node test/frameworks/marko/run.mjs
pnpm exec eslint test/frameworks/marko
```

The runner creates a fresh consumer under `os.tmpdir()`, outside the checkout.
It verifies that framework packages cannot resolve from an ancestor, backs up
existing `dist` under `os.tmpdir()/unplugin-icons-backups` (override with
`UNPLUGIN_ICONS_BACKUP_DIR`), then renames the old output into a fresh
`node_modules/.unplugin-icons-dist-*/dist` directory. Both copies are retained.
A failed rename stops before building. It builds with
`pnpm exec tsdown --no-clean --no-exports`, without running `prebuild` or changing
the versioned icon catalog. This does not validate release preparation.

The real tarball is extracted into `package`. Only that extracted manifest has
its development dependencies and scripts removed, after backup. Bun installs
`file:./package` with the frozen local lock. All installed `dist`/`types` hashes
must match the extracted package, and framework/compiler paths must resolve
inside the consumer, including the explicit `vite` alias. `evidence.json` records
these checks. The fixture does not rely on automatic peer installation for Vite.

Node builds the SSR and client environments through `@marko/vite` linked mode.
The HTTP server awaits `template.render({})`; no Marko Run
or browser simulation is involved. The browser launcher picks its port after
build and browser installation, retries at most twice for an occupied port only,
and never reuses an unknown server. Each attempt retains its own logs/results.
`PLAYWRIGHT_BROWSERS_PATH` is respected; the default is the root's ignored
`node_modules/marko-browser-1.64.0`. Browser GC is disabled. All artifacts remain.

To refresh the lock explicitly, run with `--resolve-lock`, inspect the new run's
`bun.lock`, back up the source fixture lock, then copy it back and rerun frozen.

## Versions and measured coverage

Pinned versions: Marko 6.4.5, compiler 5.42.11, `@marko/vite` 6.1.13,
`vite` is an explicit alias of `@voidzero-dev/vite-plus-core@1.1.0`, alongside
Vite+ 1.1.0, Playwright 1.64.0 and Bun 1.4.2. Marko requires Node >=22.
The Marko plugin declares Vite `^8` and compiler `^5`; the Vite+ core alias reports
version 1.1.0. The real linked builds succeeded, but this does not establish
peer-range compatibility or validate every Vite+ command.

Passing coverage includes server HTML before external scripts, hydration keeping
the original SVG node, independent CSR through `Template.mount`, SVG events,
reactive width/ARIA, SVG and xlink namespaces, dotted names, decimal query
dimensions, raw-query output and raw-prefix precedence over `raw=false`.
Literal `$1`, backticks, dollar-braces, backslash-n/t/u, multiple backslashes and
a trailing backslash survive both SSR and CSR, in text, child attributes and root
attributes. CDATA in SVG style and text preserves these bytes and preexisting
entities literally; normal SVG text still decodes entities once. Escaping SSR
cases disable JavaScript, independently of hydration tests. The interpolation-shaped SVG text does not set its global marker on
the server or browser. The runtime app uses `virtual:icons` and `~icons`, with
their raw equivalents. A separate build test also covers both direct tilde imports.

No `types/marko` declaration exists in the library. This fixture does not invent
that API or claim a strict component declaration test.

## Escaping regression and alias integration

- Before the escaping fix, `$1` in child text and attributes was corrupted. The library's
  `escapeTemplateLiteral` emits `&#36` without a semicolon, producing `&#361`.
  Browsers decoded that as `ũ`.
- Literal `C:\temp` became a tab followed by `emp`, in child text/attributes
  and the root attribute. Backslashes remain active in generated JavaScript
  string/template literals.
- Without explicit configuration, the direct tilde build fails: `@marko/vite` installs the
  alias `/^~(?!\/)/`, which strips the tilde before icon resolution. The actual
  build reports missing `icons/fixture/sample` and `icons-raw/fixture/sample`.
  The original reproduction had 6 passes and 5 failures; its artifacts are retained.

The library fix serializes the body with `JSON.stringify` inside Marko's raw
interpolation, preserving its bytes without interpreting SVG text as JavaScript.
Encoding special characters as HTML entities failed both real CDATA tests before
this adjustment (19 passed, 2 failed). Root attributes double backslashes for
Marko's string syntax; numeric entities there would be escaped a second time.

[vite.config.mjs](./vite.config.mjs) adds exact `~icons/` and `~icons-raw/` aliases
to the corresponding `virtual:` prefixes using Vite's public `resolve.alias`.
The small configuration-only plugin runs with `enforce: 'post'` so its `config`
hook executes after Marko's and puts these rules before the broad tilde rule.
Top-level `resolve.alias` alone was insufficient: Marko prepended its own rule.
There is no custom `resolveId` interceptor or change to library resolution.
This configuration is necessary for the tested direct tilde imports.

Observed on macOS arm64 with Chromium headless. Linux, Windows, other browsers,
development HMR, older Marko versions and direct compiler type integration are
unverified. These tests cover the pinned versions and listed cases only.

Sources: [Marko installation](https://github.com/marko-js/website/blob/main/docs/introduction/installation.md),
[Template API](https://github.com/marko-js/website/blob/main/docs/reference/template.md),
and the installed `@marko/vite` README and `dist/index.mjs` for linked builds,
environment orchestration and the tilde alias.
