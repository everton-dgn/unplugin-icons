import { readFileSync } from 'node:fs'
import node from '@astrojs/node'
import { defineConfig } from 'astro/config'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { host: '127.0.0.1' },
  devToolbar: { enabled: false },
  vite: { server: { strictPort: true }, build: { emptyOutDir: false }, plugins: [Icons({
    compiler: 'astro',
    customCollections: { fixture: { sample: readFileSync(new URL('./sample.svg', import.meta.url), 'utf8') } },
  })] },
})
