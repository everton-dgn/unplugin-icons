import { hydrate, render } from '@solidjs/web'
import App from './App'

const root = document.getElementById('root')!
if (root.hasChildNodes())
  hydrate(() => <App />, root)
else render(() => <App />, root)
document.documentElement.dataset.ready = 'true'
