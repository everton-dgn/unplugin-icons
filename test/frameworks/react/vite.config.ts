import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  plugins: [
    react(),
    Icons({
      compiler: 'jsx',
      jsx: 'react',
      customCollections: {
        fixture: {
          sample: readFileSync(new URL('./sample.svg', import.meta.url), 'utf8'),
        },
      },
    }),
  ],
  build: { emptyOutDir: false, outDir: 'dist/client' },
})
