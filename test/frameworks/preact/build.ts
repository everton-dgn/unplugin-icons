import { mkdtempSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { build } from 'vite-plus'

export async function buildFixture() {
  const root = process.cwd()
  const output = mkdtempSync(resolve(root, 'build-'))
  const client = resolve(output, 'client')
  const server = resolve(output, 'server')
  await build({ build: { outDir: client, emptyOutDir: false, rollupOptions: { input: resolve(root, 'entry-client.tsx'), output: { entryFileNames: 'client.mjs' } } } })
  await build({ build: { ssr: 'entry-server.tsx', outDir: server, emptyOutDir: false, rollupOptions: { output: { entryFileNames: 'server.mjs' } } } })
  return { client, ...await import(pathToFileURL(resolve(server, 'server.mjs')).href) }
}
