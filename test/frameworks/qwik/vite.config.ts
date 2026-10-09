import { readFileSync } from 'node:fs'
import { qwikVite } from '@builder.io/qwik/optimizer'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // Virtual JSX modules with queries have no filesystem tsconfig to inherit.
  esbuild: { jsx: 'automatic', jsxImportSource: '@builder.io/qwik' },
  plugins: [
    Icons({
      compiler: 'qwik',
      autoInstall: false,
      customCollections: {
        fixture: { sample: readFileSync(new URL('./sample.svg', import.meta.url), 'utf8') },
      },
    }),
    qwikVite({
      srcDir: 'app',
      client: { input: 'app/root.tsx', outDir: 'dist/client' },
      ssr: { input: 'app/entry.ssr.tsx', outDir: 'dist/server' },
    }),
  ],
  build: { emptyOutDir: false },
})
