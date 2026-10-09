# Astro instance ID runtime tests

This module tests a real packed unplugin-icons consumer with Astro 7.3.8,
@astrojs/node 11.1.7, Vite+/core 1.1.0, Bun 1.4.2 and Node 24.21.0.
It targets server rendering in development and production. It is not a full
Astro type gate: upstream declaration failures remain outside this focused
harness, and no type errors are suppressed here.

## Run

After repository dependencies are installed, run from the repository root:

```sh
node test/astro-ids/runtime/run.mjs
pnpm exec eslint test/astro-ids/runtime
```

The runner builds a fresh library package with
`pnpm exec tsdown --no-clean --no-exports`. Existing dist is backed up outside
the repository and renamed into a retained `node_modules/.unplugin-icons-dist-*`
directory before compilation. Rename failure stops the build. The versioned
catalog is checked for unchanged bytes; prebuild and release preparation are
not tested. Do not run this mode while another process edits or builds production.

To test an already packed baseline without compiling the current checkout:

```sh
node test/astro-ids/runtime/run.mjs --package-tarball /absolute/path/package.tgz
node test/astro-ids/runtime/run.mjs --collision-only --package-tarball /absolute/path/package.tgz
node test/astro-ids/runtime/run.mjs --styles-only --package-tarball /absolute/path/package.tgz
```

`--collision-only` selects minimal gradient SVGs and the collision test. It
isolates duplicate IDs from other parsing failures in the full SVG matrix.
The default runs all tests against the full fixtures; neither mode marks
failures as expected or skips assertions. A pre-fix package collides across
repeated instances and different icons, making the blue icon reference a red
gradient. The old compiler also rejects the full text CDATA fixture before SSR.
With the instance ID and CSS scope fixes, all nine tests pass in development
and production SSR on the pinned stack, including CDATA selector matching.
Nested SVG styles were global in the baseline too; style isolation is not
presented as a regression caused by the ID change.

Every run gets a fresh directory outside the checkout and a cold Bun cache.
The frozen local lock is checked byte-for-byte after installation. The real
tarball is extracted; only its manifest's devDependencies and scripts are
removed after backup. Installed dist/types must have the same hashes as the
extracted package. Framework and Vite paths must resolve inside the consumer.
`evidence.json`, command/server logs, raw HTML and browser outputs are retained.

To create a new lock deliberately, add `--resolve-lock`, inspect the generated
run's bun.lock, back up the fixture lock before replacing it, and repeat frozen.
`UNPLUGIN_ICONS_BACKUP_DIR` overrides the default backup location under
`os.tmpdir()/unplugin-icons-backups`.

`--styles-only` selects CSS isolation and CDATA selector tests, with simple icons on the index
route, avoiding the baseline's unrelated CDATA parse failure. The separate
`/styles` page compares red and blue icon styles with a green external control.
`/paint` renders two `.shared { fill: url(#paint) }` icons with different gradient
colors. It requires each computed URL to resolve to a gradient in its own SVG;
private IDs alone do not prevent a global rule from selecting another icon.
`/cdata` checks an ARIA attribute selector inside CDATA: the rewritten ID must
match the DOM attribute while the literal `outside&name` token stays unchanged.
CSSOM selector matching and computed red fill must both succeed.
The full default matrix retains this test without skips or expected failures.

## Matrix and limits

The same imported icon is rendered repeatedly alongside another icon using the
same internal IDs. Assertions cover unique IDs in raw HTML and DOM, fragment
href/xlink references, including an href surrounded by ASCII spaces,
quoted and unquoted url references, CSS ID selectors,
inline styles, ARIA token lists and SMIL event/syncbase references. Gradient
lookup must stay inside its own SVG; computed stop colors distinguish red and
blue without relying on a screenshot similarity threshold. The spaced href must
retain both spaces, resolve inside its SVG and render the expected 2-unit glyph.

The style isolation test checks `.shared`, root/type `svg` and
`path:not(.shared)` selectors using computed fill and stroke values. The same
checks apply to an external SVG to detect leakage beyond sibling icons.

Controls cover the literal color red when an ID is named red, external URLs,
CSS strings that resemble references, comments, entities, quotes, text and
style CDATA. Escaped script-shaped text must remain text, without new elements.
Default root props, consumer overrides and explicit null are checked separately.
This is a concrete syntax matrix, not a claim of universal XML, CSS or SMIL
coverage. It does not cover client hydration, arbitrary consumer-provided
reference attributes, shared IDs supplied explicitly by consumers, or malformed SVG.

Both dev and production servers use Node and loopback-only ports selected just
before launch. Occupied ports get at most two retries; unknown servers are never
reused. The browser is a separate headless Chromium process with JavaScript
disabled. `PLAYWRIGHT_BROWSERS_PATH` is preserved; the default is the repository's
ignored `node_modules/astro-browser-1.64.0`. Browser GC is disabled. Nothing is
cleaned up automatically. Linux, Windows and other browsers are not verified.
