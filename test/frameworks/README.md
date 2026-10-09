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
| Qwik 1 | Qwik 1.20.2 with the documented declaration patch | Strict types and negative controls, production SSR, resumability, SVG refs and reactive props with Vite+ and native Vite | [Qwik fixture](./qwik/README.md) |
| SvelteKit | Svelte 5.57.2, Kit 3.0.1, Vite plugin 7.3.1 | Strict types, production SSR, hydration, runes and SVG events with Node and Bun adapters | [Svelte fixture](./svelte/README.md) |
| Vue | Vue/compiler 3.5.43 | Strict types, production SSR, hydration, refs, reactive attributes, events and raw queries | [Vue fixture](./vue/README.md) |
| Nuxt | Nuxt 4.6.0, Vue 3.5.43 | Native module registration, injected public types, production SSR, hydration and raw queries | [Nuxt fixture](./nuxt/README.md) |
| Marko | Marko 6.4.5, compiler 5.42.11, Vite plugin 6.1.13 | Production SSR, hydration, client rendering, reactive props, events and literal SVG/CDATA preservation | [Marko fixture](./marko/README.md) |
| Web Components | Native custom elements | Strict types, registration, constructors, subclassing, shadow/light DOM, reconnection and events | [Web Components fixture](./web-components/README.md) |
| Astro | Astro 7.3.8, Node adapter 11.1.7 | Strict types with the documented declaration patch and type dependencies, development and production SSR, SVG attributes and raw imports | [Astro fixture](./astro/README.md) |
| Ember | Ember 7.3.0 with the documented declaration patch | Strict template types, production rendering, SVG modifiers, reactive updates and disposal | [Ember fixture](./ember/README.md) |

These Vite consumers use local Vite+/core 1.1.0; Next uses its own Webpack.
Fixtures install with Bun 1.4.2. Build and server runtimes vary between fixtures.
React, Next, Preact, Solid, Qwik and Web Components use TypeScript
7.0.2. Svelte, Vue, Nuxt, Astro and Ember use 6.0.3 for their current checking tools.
Marko's fixture makes no claim of a public TypeScript declaration. The repository itself
still uses pnpm.

Vue Vapor 3.6.0-rc.10 has a separate [packed SSR and hydration regression](../vue-vapor/README.md)
through the Vite adapter. A separate [SVG ID regression](../vue-ids/README.md)
checks distinct per-instance IDs, concurrent server applications and hydration
with Vue 3.5.43 and Vapor 3.6.0-rc.10. The broader Vapor probe still exposes
rc.10 SVG width fallthrough. ID rewriting remains limited to the references
recognized by the Vue helper; other frameworks are not covered by this fix.

A separate [Astro instance ID regression](../astro-ids/runtime/README.md) checks
Astro 7.3.8 development and production SSR with JavaScript disabled. It verifies
private per-instance IDs, local CSS/ARIA/SMIL references, literal SVG content and
consumer prop precedence. The broader Astro fixture above separately verifies
strict types with its documented dependency patch.

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

Several fixtures record literal SVG IDs repeated across instances. A successful
build or hydration check does not imply isolated gradients or references between
instances. Each fixture lists further limits beside its verified behavior.
