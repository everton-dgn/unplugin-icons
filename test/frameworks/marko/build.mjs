import process from 'node:process'
import { createBuilder } from 'vite'

async function main() {
  const builder = await createBuilder()
  await builder.buildApp()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
