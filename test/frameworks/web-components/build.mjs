import Icons from 'unplugin-icons/vite'
import { build } from 'vite'
import { glyph } from './icons.mjs'
import { modes } from './modes.mjs'

async function main() {
  for (const mode of modes) {
    await build({
      configFile: false,
      envDir: false,
      define: { __MODE__: JSON.stringify(mode) },
      plugins: [Icons({
        compiler: 'web-components',
        webComponents: { autoDefine: mode.autoDefine, shadow: mode.shadow, ...(mode.prefix === 'icon' ? {} : { iconPrefix: mode.prefix }) },
        customCollections: { test: { glyph } },
      })],
      build: { outDir: `dist/${mode.name}`, emptyOutDir: false },
      base: `/${mode.name}/`,
    })
  }
}
main().catch((error) => {
  throw error
})
