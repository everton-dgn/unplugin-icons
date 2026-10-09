import { readFileSync } from 'node:fs'
import Icons from 'unplugin-icons/webpack'

export default {
  webpack(config) {
    config.plugins.push(Icons({
      compiler: 'jsx',
      jsx: 'react',
      customCollections: {
        fixture: {
          sample: readFileSync(new URL('./sample.svg', import.meta.url), 'utf8'),
        },
      },
    }))
    return config
  },
}
