import process from 'node:process'
import { build } from 'vite'

build().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
