import { readFileSync } from 'node:fs'
import process from 'node:process'
import node from '@astrojs/node'
import { defineConfig } from 'astro/config'
import Icons from 'unplugin-icons/vite'

const rawIcon = name => readFileSync(new URL(`./icons/${name}.svg`, import.meta.url), 'utf8')
const icon = name => readFileSync(new URL(`./icons/${process.env.ASTRO_IDS_CASE !== 'full' ? 'collision-' : ''}${name}.svg`, import.meta.url), 'utf8')
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { host: '127.0.0.1' },
  devToolbar: { enabled: false },
  vite: {
    server: { strictPort: true },
    build: { emptyOutDir: false },
    plugins: [Icons({
      compiler: 'astro',
      customCollections: { fixture: {
        'red': icon('red'),
        'blue': icon('blue'),
        'style-red': rawIcon('style-red'),
        'style-blue': rawIcon('style-blue'),
        'paint-red': rawIcon('paint-red'),
        'paint-blue': rawIcon('paint-blue'),
        'cdata-selector': rawIcon('cdata-selector'),
      } },
    })],
  },
})
