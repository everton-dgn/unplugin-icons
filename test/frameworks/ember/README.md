# Ember browser compatibility fixture

This fixture builds an Ember application against a fresh `unplugin-icons`
tarball, then tests the production bundle in headless Chromium. It does not
exercise SSR, FastBoot or hydration. Runtime passes do not imply a passing
strict type gate: the current declarations have the issues described below.

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
pnpm install --frozen-lockfile --offline
node test/frameworks/ember/run.mjs
```

The pnpm store must already contain the root dependencies for offline bootstrap.
Bun installation and the initial Chromium download may need network access.
The runner prints the retained temporary consumer directory. It runs strict
`.gts` checking, builds with Vite+, and tests the production output. A type
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
uses strict port binding, and retries only collisions, at most three times.
It never reuses an existing server or connects to the user's browser.

## Coverage and current limits

- Both component aliases and both raw prefixes; legacy raw queries in first,
  middle and last positions; repeated and encoded values and `raw=false`.
- SVG namespaces, case-sensitive attributes, title entities and consumer
  attribute escaping. Literal width, height and fill win over `...attributes`;
  class names combine, following Ember's current behavior.
- An SVG modifier captures the actual `SVGSVGElement`. A real click updates
  state and an attribute on the same node. Removal disposes the modifier and
  listener; remount creates a new node without losing component state.
- Known IDs and fragment references remain intact, including duplicate IDs
  across instances. No uniqueness guarantee is claimed.
- `.gts` negatives reject undeclared component arguments, a modifier requiring
  `HTMLDivElement`, raw strings used as components, and components used as strings.

The strict gate keeps `skipLibCheck: false`. The public icon declaration uses
`Element: SVGElement`, which makes Glint reject the valid root SVG `width` and
`height` attributes in `application.gts`. `types/upstream.gts` supplies an
independent `ComponentLike<{ Element: SVGSVGElement }>` control that accepts
those dimensions. The production declarations are not patched or shimmed here.

The dependency declarations also fail independently of unplugin-icons, including
missing `@glimmer/interfaces` exports and unresolved Glimmer internal subpaths.
In a retained consumer, run `node node_modules/@glint/ember-tsc/bin/ember-tsc.js
--noEmit -p tsconfig.upstream.json` to check the upstream control. This baseline
does not load unplugin-icons declarations. The full gate remains red until its
library and upstream issues are addressed; this fixture does not claim complete
Ember compatibility.
