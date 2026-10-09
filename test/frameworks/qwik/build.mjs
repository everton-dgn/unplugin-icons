import process from 'node:process'
import { build } from 'vite'

build({ build: { ssr: process.argv.includes('--ssr') } }).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
