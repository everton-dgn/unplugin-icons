import { hydrate, render } from 'preact'
import App from './App'

const root = document.getElementById('root')!
if (root.hasChildNodes())
  hydrate(<App />, root)
else render(<App />, root)
document.documentElement.dataset.ready = 'true'
