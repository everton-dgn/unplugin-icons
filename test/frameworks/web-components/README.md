# Web component runtime compatibility

This native browser fixture consumes the freshly packed checkout. It uses
Bun 1.4.2, Vite+/core 1.1.0, TypeScript 7.0.2 and Playwright 1.64.0, pinned in
the local manifest and lock. No UI framework or SSR is involved.

## Run

From the repository root, after `pnpm install --frozen-lockfile`:

```sh
node test/frameworks/web-components/prepare.mjs
node test/frameworks/web-components/verify.mjs <RUN_DIR>
```

Preparation prints `RUN_DIR`, creates it in the OS temporary directory outside
the checkout, and installs with `bun install --frozen-lockfile`. Missing locks
fail before mutation. For an intentional dependency refresh, use
`prepare.mjs --refresh-lock`, review the retained run's lock and back up the
previous fixture lock before copying the new one. Repeat the frozen run.

Preparation checks that package/tool/compiler peers cannot resolve before
installation. It backs up old `dist` externally and renames it into retained
`node_modules/.unplugin-icons-dist-*/dist` before building with
`pnpm exec tsdown --no-clean --no-exports`. Rename errors stop the build.
It packs without lifecycle scripts and extracts `file:./package`; only
`devDependencies` and `scripts` are removed from its backed-up manifest.
`provenance.json` records every `dist`/`types` SHA-256, installed tool versions
and paths, and backup locations. Installed hashes must equal the fresh package.

Backups default to `unplugin-icons-backups` in the OS temporary directory;
`UNPLUGIN_ICONS_BACKUP_DIR` overrides that base. Nothing is deleted. Reusing a
run with build output is rejected. Browser output uses a unique directory.
`PLAYWRIGHT_BROWSERS_PATH` is preserved when supplied; otherwise Chromium lives
in this fixture's ignored `node_modules/browsers`. Only the headless shell is
requested and browser GC is disabled. The static server binds port 0 after all
builds, so the OS assigns an available port without a reservation/release race.

## Coverage and observed behavior

Twelve browser tests exercise all four `autoDefine`/`shadow` combinations:

- Public constructors, `customElements.define`, `whenDefined`, `get`, `new`,
  `document.createElement` and subclass registration/instantiation.
- Both icon aliases resolve to the same constructor for the same query.
- SVG namespace, escaped title text, literal IDs and matching URL references.
- Connection, disconnection, reconnection and native click events.
- Both raw aliases, a runtime `?raw=true` import, decimal widths, `raw=false` on a raw prefix, repeated query
  parameters and percent-encoded values.

TypeScript checks real packaged declarations with strict mode and
`skipLibCheck: false`, including invalid constructor/instance/raw assignments.
Playwright uses `*.e2e.ts` and an explicit `testMatch` to avoid root Vitest.

With `autoDefine: false` (the default), register the class before constructing
it. With `autoDefine: true`, importing the module registers
`<iconPrefix>-<collection>-<icon>`; the default prefix is `icon`. The fixture
uses `icon-test-glyph` and `fixture-test-glyph`. Use valid, unique custom-element
names with lowercase letters and a hyphen. Registration names do not include
queries, so automatic registration cannot assign distinct names to query
variants of the same icon; use manual registration when names must differ.

Without shadow DOM, each connection replaces the inner SVG. With shadow DOM,
the open shadow root is created in the constructor and its SVG survives
reconnection. Host listeners survive in both cases. Setting a host `width`
attribute does not update the compiled SVG; no reactive props are promised.
IDs remain literal and are repeated across instances. This is a behavior check,
not a claim of automatic ID isolation in light DOM.

Validated on macOS arm64 with Chromium 156.0.8078.4. Firefox, WebKit, Windows,
Linux, development HMR and SSR are not covered. Production sources are unchanged.
