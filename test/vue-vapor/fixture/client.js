import { createSSRApp, vaporInteropPlugin } from 'vue'
import App from './app.js'

createSSRApp(App).use(vaporInteropPlugin).mount('#app')
