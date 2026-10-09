import { createApp as createClientApp, createSSRApp } from 'vue'
import App from './App.vue'

export function createApp(ids: boolean, clientOnly = false) {
  return (clientOnly ? createClientApp : createSSRApp)(App, { ids })
}
