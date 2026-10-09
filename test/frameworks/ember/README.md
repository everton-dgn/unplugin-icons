# Ember browser compatibility fixture

This fixture builds an Ember application against a fresh `unplugin-icons`
tarball, then tests the production bundle in headless Chromium. It does not
exercise SSR, FastBoot or hydration. The runner requires strict type checks for
the upstream control and consumer, negative controls, and production browser tests.

## Versions

The local manifest and Bun lock pin Ember 7.3.0, `@embroider/vite` 1.7.15,
`@embroider/core` 4.6.9, Vite+/core 1.1.0, Babel core 7.29.7,
`@rollup/plugin-babel` 7.1.0, template compilation 4.0.1,
`@glimmer/component` 2.1.1, `ember-modifier` 4.3.0,
`@glint/ember-tsc` 1.11.6 and `@glint/template` 1.9.0.
Playwright is 1.64.0. Node 24.21.0 executes tools and the preview server;
Bun 1.4.2 installs dependencies. This combination was exercised on macOS arm64.
Linux, Windows and other browsers are unverified.

TypeScript 7.0.2 was attempted first. Glint failed to resolve
`typescript/lib/tsc`, which TS7 does not export. The fixture therefore pins
TypeScript 6.0.3, within Glint's declared `>=5.6.0` peer range.
`@ember/test-helpers` supplies Glint's declaration augmentation dependency.

## Run

From the repository root:

```sh
pnpm install --frozen-lockfile
node test/frameworks/ember/run.mjs
```

Bun installation and the initial Chromium download may need network access.
The runner prints the retained temporary consumer directory. It runs the
upstream-only control and consumer `.gts` check as separate gates, builds with
Vite+, and tests the production output. A type
failure remains a nonzero final result even when browser tests pass.

`ember()` precedes Babel. There is no `ember-cli-build.js`, so the fixture omits
`classicEmberSupport()`. Template compilation uses the plugin's current default
compiler resolution, not the obsolete `ember-source/dist` compiler path.
`@glimmer/tracking` resolves to Ember's integrated module; installing the old
standalone tracking package introduces a separate tracker and breaks updates.

## Artifact and process isolation

Each run lives outside the checkout and first verifies that its dependencies
cannot resolve from ancestor directories. The previous root `dist` is backed
up externally, then renamed into a unique retained `node_modules` directory.
The runner builds with `pnpm exec tsdown --no-clean --no-exports` and packs the
result. A stale marker must remain in the old directory and be absent from the
new tarball. Neither `pnpm build` nor `prebuild` runs. The versioned icon catalog
must remain byte-identical.

After extraction, only library `devDependencies` and `scripts` are removed from
the backed-up manifest. The consumer uses `file:./package`, frozen Bun
installation, and compares every installed `dist`/`types` SHA-256 hash with the
tarball. Dependency versions and resolved paths are recorded in `evidence.json`.
There is no alias to library production source.

Backups default to `os.tmpdir()/unplugin-icons-backups`; override this with
`UNPLUGIN_ICONS_BACKUP_DIR`. All runs, logs and artifacts are retained.
`--resolve-lock` explicitly resolves a fresh lock in a retained run after
backing up the existing fixture lock. Review and copy that lock back manually;
normal runs never regenerate it.

The runner preserves `PLAYWRIGHT_BROWSERS_PATH` when provided and sets
`PLAYWRIGHT_SKIP_BROWSER_GC=1`. Otherwise it keeps the browser in the checkout's
`node_modules`. Preview binds only localhost, selects a port after the build,
uses strict port binding, and makes at most three attempts on port collisions.
It never reuses an existing server or connects to the user's browser.

## Coverage and current limits

- Both component aliases and both raw prefixes; legacy raw queries in first,
  middle and last positions; repeated and encoded values and `raw=false`.
- SVG namespaces, case-sensitive attributes, title entities and consumer
  attribute escaping. Consumer width, height and fill override SVG defaults;
  omitted attributes retain their defaults, and class names combine.
- An SVG modifier captures the actual `SVGSVGElement`. A real click updates
  state and the consumer width on the same node. Removal disposes the modifier and
  listener; remount creates a new node without losing component state.
- Known IDs and fragment references remain intact, including duplicate IDs
  across instances. No uniqueness guarantee is claimed.
- `.gts` negatives reject undeclared component arguments, a modifier requiring
  `HTMLDivElement`, raw strings used as components, and components used as strings.

Both type gates keep `skipLibCheck: false`. The public icon declaration uses
`Element: SVGSVGElement`, which accepts root SVG width and height attributes.
`types/upstream.gts` supplies an independent component control without loading
unplugin-icons declarations.

Unpatched Ember 7.3.0 produces 251 diagnostics in the independent control.
The fixture pins exactly 7.3.0 and applies the declaration-only patch through
Bun's `patchedDependencies`. It corrects ambient import paths and supplies
14 missing declarations emitted from the official Ember source commit
[4bffdcad2967657793ebcbdb0b991ecb59d19cf7](https://github.com/emberjs/ember.js/tree/4bffdcad2967657793ebcbdb0b991ecb59d19cf7).
No runtime JavaScript or public icon types are changed by this patch.

Patch SHA-256: `64df3821021815bd1ba715c4b4640e9452acdb0e5689e326ef60f41602d569b2`.
The added files live directly in the existing `types/stable` directory because
Bun 1.4.2 fails to create their nested directories while applying the patch.
Their ambient module names and emitted contents are unchanged; the index imports
use the corresponding flat filenames.

A fresh consumer with an empty Bun cache passed `bun install --frozen-lockfile`
without changing the lock. Both strict type gates passed, and removing the four
expected-error directives produced the four expected diagnostics. The patch
must be reviewed when upgrading Ember; it is not evidence that unpatched Ember
passes strict declaration checking. Neither gate uses `skipLibCheck` or a
local declaration shim to suppress dependency errors.

After both positive gates, `negative-types.mjs` creates a new retained directory
and copies `types/contract.gts` without its four expected-error directives. Its
config extends the consumer config, preserving the same types and strictness.
The gate requires exit 2 and exactly four diagnostics, all in that copied file,
with codes TS2322, TS2345, TS2554 and TS2769. Dependency diagnostics, accepted
invalid cases or extra errors fail the gate. The directory retains the compiler
output and a JSON record of the command, exit status and diagnostics.

## Applying the patch in a Bun consumer

The published `unplugin-icons` package does not apply this fixture patch
automatically. To use it in a Bun 1.4.2 consumer, copy
`patches/ember-source@7.3.0.patch` from this fixture into the consumer's `patches`
directory. Merge these entries into the consumer's `package.json`, preserving
its other dependencies and patches:

```json
{
  "dependencies": {
    "ember-source": "7.3.0"
  },
  "patchedDependencies": {
    "ember-source@7.3.0": "patches/ember-source@7.3.0.patch"
  }
}
```

Resolve and retain the consumer's lock once, then use frozen installs:

```sh
bun install
bun install --frozen-lockfile
```

Keep the patch, manifest and `bun.lock` together in version control. Run the
consumer's strict type checks after applying it or upgrading dependencies.

With this patch, the complete runner passed both strict type gates, the
production build and all four Chromium tests. All 42 installed library
`dist`/`types` files matched the fresh package hashes. These results cover
macOS arm64 with the pinned versions, not unpatched Ember or SSR.
