import assert from 'node:assert/strict'
import { readFile, realpath, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { isAbsolute, relative, resolve, sep } from 'node:path'
// eslint-disable-next-line antfu/no-import-dist -- The subject is the built SSR artifact.
import { render } from './dist/server/entry.ssr.js'

export async function serve() {
  const root = await realpath('dist/client')
  const manifest = JSON.parse(await readFile(`${root}/q-manifest.json`, 'utf8'))
  assert(Object.keys(manifest.mapping).length > 0)
  assert(Object.keys(manifest.bundles).length > 0)
  const { html } = await render()
  assert(html.includes('q:container="paused"'))
  await writeFile('ssr.html', html, { flag: 'wx' })
  const outside = (path) => {
    const part = relative(root, path)
    return part === '..' || part.startsWith(`..${sep}`) || isAbsolute(part)
  }
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      if (url.pathname === '/') {
        res.setHeader('Content-Type', 'text/html')
        res.end(html)
        return
      }
      const asset = resolve(root, `.${decodeURIComponent(url.pathname)}`)
      if (outside(asset)) {
        res.writeHead(403).end()
        return
      }
      const actual = await realpath(asset)
      if (outside(actual)) {
        res.writeHead(403).end()
        return
      }
      res.setHeader('Content-Type', actual.endsWith('.js') ? 'text/javascript' : 'application/json')
      res.end(await readFile(actual))
    }
    catch { res.writeHead(404).end() }
  })
  // OS-selected port, only after both builds. No retry for unrelated failures.
  for (let attempt = 0; ; attempt++) {
    try {
      await new Promise((done, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', () => {
          server.off('error', reject)
          done()
        })
      })
      break
    }
    catch (error) {
      if (error.code !== 'EADDRINUSE' || attempt === 2)
        throw error
    }
  }
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done, reject) => server.close(error => error ? reject(error) : done())),
  }
}
