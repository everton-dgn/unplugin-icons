import { readFile, realpath } from 'node:fs/promises'
import { createServer } from 'node:http'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { buildFixture } from './build'

export async function serveFixture() {
  const { html, client } = await buildFixture()
  const clientRoot = await realpath(client)
  const outside = (path: string) => {
    const local = relative(clientRoot, path)
    return local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local)
  }
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url!, 'http://localhost')
      if (url.pathname === '/') {
        const body = url.searchParams.has('csr') ? '' : await html()
        res.setHeader('Content-Type', 'text/html')
        res.end(`<!doctype html><html><body><div id="root">${body}</div><script>window.beforeHydration = document.querySelector("svg")</script><script type="module" src="/client.mjs"></script></body></html>`)
      }
      else {
        const asset = resolve(clientRoot, `.${decodeURIComponent(url.pathname)}`)
        if (outside(asset)) {
          res.statusCode = 403
          res.end()
          return
        }
        const actual = await realpath(asset)
        if (outside(actual)) {
          res.statusCode = 403
          res.end()
          return
        }
        res.setHeader('Content-Type', 'text/javascript')
        res.end(await readFile(actual))
      }
    }
    catch (error) {
      res.statusCode = error instanceof URIError ? 400 : 404
      res.end()
    }
  })
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Missing server port')
  return { client, url: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done())) }
}
