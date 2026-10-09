import { readFileSync } from 'node:fs'
import preact from '@preact/preset-vite'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  plugins: [
    preact({ babel: {}, reactAliasesEnabled: false, prefreshEnabled: false }),
    Icons({ compiler: 'jsx', jsx: 'preact', customCollections: { fixture: { icon: readFileSync(new URL('./icon.svg', import.meta.url), 'utf8') } } }),
    { name: 'no-react-compat', generateBundle() {
      for (const id of this.getModuleIds()) {
        if (id.includes('/preact/compat/') || id.includes('/react/') || id.includes('/react-dom/'))
          throw new Error(`Unexpected React compatibility module: ${id}`)
      }
    } },
  ],
  build: { emptyOutDir: false, minify: false },
})
