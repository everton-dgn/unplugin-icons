import { mkdtempSync } from 'node:fs'
import process from 'node:process'
import { build } from 'vite'
import config from './vite.config.mjs'

build({
  ...config,
  configFile: false,
  environments: undefined,
  build: {
    ssr: true,
    emptyOutDir: false,
    outDir: mkdtempSync('node_modules/alias-build-'),
    rolldownOptions: { input: 'alias-entry.mjs' },
  },
}).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
