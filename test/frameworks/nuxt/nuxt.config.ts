export default defineNuxtConfig({
  ssr: true,
  devtools: { enabled: false },
  telemetry: false,
  modules: [['unplugin-icons/nuxt', {
    customCollections: {
      fixture: {
        'sample.dot': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><title>Literal &amp; title</title><path fill="currentColor" d="M2 2h20v20H2z"/><use xlink:href="/sprite.svg#shape"/></svg>',
      },
    },
  }]],
  typescript: {
    strict: true,
    tsConfig: { compilerOptions: { types: ['unplugin-icons/types/raw-prefix'] } },
  },
})
