import { readFileSync } from 'node:fs'
import { ember, extensions } from '@embroider/vite'
import { babel } from '@rollup/plugin-babel'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  build: { emptyOutDir: false },
  plugins: [
    ember(),
    Icons({
      compiler: 'ember',
      customCollections: { fixture: { sample: readFileSync(new URL('./sample.svg', import.meta.url), 'utf8') } },
    }),
    babel({ babelHelpers: 'runtime', extensions }),
  ],
})
