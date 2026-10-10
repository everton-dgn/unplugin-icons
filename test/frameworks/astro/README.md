# Astro SSR compatibility fixture

This fixture installs a freshly packed unplugin-icons in an isolated OS temporary
directory. It uses Astro 7.3.8, @astrojs/node 11.1.7, Vite+/core 1.1.0,
Bun 1.4.2, TypeScript 6.0.3 and Playwright 1.64.0. Support is conditional on
the committed Astro declaration patch and the fixture's complete type dependencies.
The registry package without these additions fails strict TypeScript checking
with skipLibCheck: false. This fixture does not establish whether the patch is
required with Astro's default skipLibCheck: true.

## Run

From the repository root with Node 24.21.0 and Bun 1.4.2:

```sh
pnpm install --frozen-lockfile
node test/frameworks/astro/run.mjs
```

Installations and the Chromium download can require network access. The runner
preserves PLAYWRIGHT_BROWSERS_PATH, disables browser garbage collection and uses
headless Chromium. Without an override, browsers live in the checkout's ignored
node_modules. Set UNPLUGIN_ICONS_BACKUP_DIR to override the default backup path,
os.tmpdir()/unplugin-icons-backups. Runs, previous dist directories, backups and
logs are retained. The runner prints the run directory.

The runner executes patch provenance, astro check, the strict consumer, the
Astro-only control, 19 negative type cases and the real toStyleString helper.
It then runs five development browser tests, builds the Astro app and runs five
production browser tests. Each type gate has its own command log; a failed gate
remains in results.json and causes a nonzero final exit even if runtime passes.
Browser setup, development, build and production failures are recorded separately.
Production checks are skipped after a failed build; existing type failures remain
in the report. Run the failure-path regressions from the repository root with
pnpm exec vitest run test/frameworks/astro/runtime-gates.test.ts.
No type diagnostic is excluded. The ignoreDeprecations: "6.0" option suppresses
deprecations of inherited configuration options. Both tsc configurations use strict: true
and skipLibCheck: false. TypeScript 6.0.3 fits @astrojs/check 0.9.10's peer range;
this fixture does not claim TypeScript 7 support.

The retained run unplugin-astro-runtime-SiNIBW passed every gate and all ten
browser tests, with an unchanged frozen lock. Its results.json contains an empty
failures array. All 42 installed code/type hashes matched the packed library;
patch-evidence.json and type-negatives.json retain the declaration proof and
the 19 rejected cases. The previous dist marker remained outside the new package.

## Declaration patch and type dependencies

patches/astro@7.3.8.patch repairs the missing KebabKeys helper, two invalid
ambient Zod declarations, two omitted internal interfaces and declarations for
Image, Picture, Font and ClientRouter. A conditional types export resolves the
component declarations without changing their runtime targets.

The two interfaces were manually checked against their runtime consumers in
dist/core/fetch/fetch-state.js and dist/core/build/plugins/plugin-manifest.js.

KebabCase/KebabKeys are a local implementation, not a historical restoration.
Their ASCII uppercase conversion matches the installed runtime's kebab helper
in astro/dist/runtime/server/render/util.js. Tests cover camel case, vendor
prefixes, acronyms, optional and readonly properties, symbol and numeric keys.
The runtime control also preserves its special behavior for CSS custom properties;
no broader generic string-normalization contract is claimed.

The four component declarations come from the installed .astro sources via
@astrojs/astro2tsx 0.1.2 and TypeScript declaration emission. Every run checks the
source hashes, regenerates these declarations and compares them byte for byte.
Their return type is inherited from the official generator; props retain the
original contracts. patch-provenance.json also fixes the patch SHA-256 and all
ten patched file hashes. Bun reapplies the patch during each frozen installation.

The fixture includes @astrojs/markdown-remark 7.3.2, referenced by Astro's
published declarations, plus 31 development dependencies for the complete
optional storage-driver type graph. These SDKs/types are needed to check the
declarations that Unstorage imports eagerly; the app does not exercise those
drivers. Their versions and integrity remain fixed in package.json and bun.lock.
These additions do not change the plugin's runtime dependencies or root manifest.

platform-types.d.ts composes official Deno, Emscripten, Bun SQLite and Cloudflare
types. It imports only bun-types/sqlite, avoiding Bun globals that conflict with
Vite. Cloudflare KVNamespace and R2Bucket aliases retain their official types.
The same composition is included in astro check and both standalone tsc gates.
No substitute driver API or relaxed library checking is used.

The negatives cover SVG props/raw strings, all four patched components, Zod,
ContextProvider, adapter headers and KebabKeys. A separate generated consumer
removes the expectation directives; the checker must report exactly one error
at each of the 19 intended locations, with no additional diagnostics.

## Applying the patch in a Bun consumer

The published unplugin-icons package does not apply this patch automatically.
Pin Astro 7.3.8 and copy patches/astro@7.3.8.patch into your project's patches
directory. Merge this entry into package.json, preserving existing patches:

```json
{
  "patchedDependencies": {
    "astro@7.3.8": "patches/astro@7.3.8.patch"
  }
}
```

For the strict declaration graph verified here, include the Markdown peer and
the pinned SDK/type dependencies listed in this fixture's package.json. Copy
platform-types.d.ts and include it in the project's TypeScript configuration,
as tsconfig.types.json does. Keep strict checking and skipLibCheck: false.
Resolve the project's lock with bun install, then retain the patch, manifest,
platform types and lock together. Subsequent installs use bun install
--frozen-lockfile. This fixture adds --ignore-scripts because native SDKs are
used only for their declarations; preserve your application's lifecycle-script
policy. Playwright and astro2tsx are fixture verification tools, not requirements
for applying the patch. Run the project's own Astro and TypeScript checks after
these changes. Upgrading Astro or a storage dependency requires reviewing the
patch and its complete type graph again.

## Package isolation

Before building, the runner backs up dist externally and renames it into a unique
retained directory under node_modules. A stale marker must remain there and be
absent from the new tarball. The library build uses only pnpm exec tsdown
--no-clean --no-exports followed by pnpm pack. The icon catalog must stay identical.

The extracted manifest loses only devDependencies and scripts, after backup.
The fixture installs file:./package with bun install --frozen-lockfile
--ignore-scripts and asserts that the lock bytes stay unchanged. All installed
dist/types hashes must match the fresh archive; peers must resolve inside the
isolated consumer and must not resolve before installation. No source alias is used.

Use --resolve-lock only to deliberately resolve a new lock in a retained run.
The existing fixture lock is backed up. Review the resulting dependency changes
before copying it back; normal runs never regenerate the lock.

## Runtime coverage and limits

HTTP SSR is tested before browser JavaScript in development and the built Node
server. Coverage includes both component aliases, explicit .astro and decimal
queries, both raw aliases, repeated/encoded queries and raw flags. Assertions
check SVG namespaces, xlink references, title and attribute escaping, root
attribute precedence and preserved embedded dimensions. Three component instances,
including a repeated import, must have distinct IDs and local references; seven
raw SVGs retain literal IDs and references.

This is server-rendered Astro without a hydration claim. Vite+ runs through the
real Astro build. Validation covers macOS arm64; Linux, Windows, other browsers,
file-watcher HMR and deployment platforms are unverified. Optional storage drivers
are type-checked but are not runtime-tested.
