import { renderToString } from '@vue/server-renderer'
import { createApp } from './app'

export async function render(ids: boolean) {
  return renderToString(createApp(ids))
}
