import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'
import { version } from 'vue'
import { icons } from './icons.js'

export default defineConfig({
  define: { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true },
  build: { emptyOutDir: false },
  plugins: [
    vue(),
    Icons({ compiler: version.includes('3.6.') ? 'vue-vapor' : 'vue3', customCollections: { test: icons } }),
  ],
})
