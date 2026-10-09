import process from 'node:process'
import adapterBun from '@sveltejs/adapter-bun'
import adapterNode from '@sveltejs/adapter-node'
import { sveltekit } from '@sveltejs/kit/vite'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'
import { icons } from './icons.js'

export default defineConfig({
  build: { emptyOutDir: false },
  plugins: [
    Icons({ compiler: 'svelte', customCollections: { test: icons } }),
    sveltekit({ adapter: process.env.RUNTIME === 'bun' ? adapterBun({ out: 'build' }) : adapterNode({ out: 'build', precompress: false }) }),
  ],
})
