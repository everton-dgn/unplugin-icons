import { renderToString } from '@builder.io/qwik/server'
import { manifest } from '@qwik-client-manifest'
import Root from './root'

export function render() {
  return renderToString(<Root />, { manifest, base: '/build/', qwikLoader: 'inline' })
}
