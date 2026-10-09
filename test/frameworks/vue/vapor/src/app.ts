import { createApp as createClientApp, createSSRApp, vaporInteropPlugin } from 'vue'
import App from './App.vue'

export function createApp(ids: boolean, clientOnly = false) {
  return (clientOnly ? createClientApp : createSSRApp)(App, { ids }).use(vaporInteropPlugin)
}
