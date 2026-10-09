import { generateHydrationScript, renderToString } from '@solidjs/web'
import App from './App'

export const html = () => renderToString(() => <App />)
export const hydrationScript = () => generateHydrationScript()
