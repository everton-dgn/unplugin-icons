import { readFileSync } from 'node:fs'
import marko from '@marko/vite'
import Icons from 'unplugin-icons/vite'

const iconAliases = [
  { find: /^~icons\//, replacement: 'virtual:icons/' },
  { find: /^~icons-raw\//, replacement: 'virtual:icons-raw/' },
]

export default {
  plugins: [Icons({
    compiler: 'marko',
    customCollections: {
      fixture: {
        'sample': readFileSync(new URL('./sample.svg', import.meta.url), 'utf8'),
        'sample.dot': readFileSync(new URL('./sample.svg', import.meta.url), 'utf8'),
        'escaping': readFileSync(new URL('./escaping.svg', import.meta.url), 'utf8'),
      },
    },
  }), marko(), {
    name: 'fixture:marko-icon-aliases',
    enforce: 'post',
    config: () => ({
      resolve: {
        alias: iconAliases,
      },
    }),
  }],
  environments: {
    ssr: { build: { outDir: 'build/server', emptyOutDir: false, rolldownOptions: { input: 'entry-server.mjs' } } },
    client: { build: { outDir: 'build/client', emptyOutDir: false } },
  },
}
