import { renderToString } from '@vue/server-renderer'
import Gradient from 'virtual:icons/test/gradient'
import { createSSRApp, h } from 'vue'
import App from './app.js'

export const render = () => renderToString(createSSRApp(App))
export const renderIds = () => renderToString(createSSRApp({ render: () => h('main', [h(Gradient), h(Gradient)]) }))
