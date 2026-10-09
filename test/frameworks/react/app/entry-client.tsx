import { hydrateRoot } from 'react-dom/client'
import { App } from './App'

window.probe = {
  original: document.querySelector('[data-testid="icon"]'),
  hydrated: false,
  reused: false,
  refIsSvg: false,
  errors: [],
}
hydrateRoot(document.getElementById('root')!, <App />, {
  onRecoverableError: error => window.probe.errors.push(String(error)),
})
