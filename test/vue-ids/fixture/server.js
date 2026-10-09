import { renderToString } from '@vue/server-renderer'
import { createSSRApp } from 'vue'
import App from './app.js'

export function render(prefix) {
  const app = createSSRApp(App)
  app.config.idPrefix = prefix
  return renderToString(app)
}
