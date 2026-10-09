import { renderToString } from 'preact-render-to-string'
import App from './App'

export const html = () => renderToString(<App />)
