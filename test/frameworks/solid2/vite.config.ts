import { readFileSync } from 'node:fs'
import solid from '@solidjs/vite-plugin'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  plugins: [solid({ ssr: true }), Icons({ compiler: 'solid', customCollections: { fixture: { icon: readFileSync(new URL('./icon.svg', import.meta.url), 'utf8') } } })],
  build: { emptyOutDir: false, minify: false },
})
