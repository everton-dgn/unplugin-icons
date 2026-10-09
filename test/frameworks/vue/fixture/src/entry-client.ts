import { createApp } from './app'

createApp(location.pathname === '/ids', location.pathname === '/csr').mount('#app')
