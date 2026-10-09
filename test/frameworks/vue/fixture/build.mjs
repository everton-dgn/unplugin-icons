import { build } from 'vite'

async function main() {
  await build({ build: { outDir: 'dist/client', emptyOutDir: false } })
  await build({ build: { ssr: 'src/entry-server.ts', outDir: 'dist/server', emptyOutDir: false } })
}
main().catch((error) => {
  throw error
})
