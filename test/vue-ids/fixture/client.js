import { createSSRApp } from 'vue'
import App from './app.js'

async function mount() {
  const app = createSSRApp(App)
  app.config.idPrefix = 'icons'
  if (import.meta.env.VAPOR) {
    const { vaporInteropPlugin } = await import('vue')
    app.use(vaporInteropPlugin)
  }
  app.mount('#app')
  document.body.dataset.hydrated = 'true'
}

mount()
