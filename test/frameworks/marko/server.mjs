import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve, sep } from 'node:path'
import process from 'node:process'
import page from './build/server/entry-server.js'

const assets = resolve('build/client')
createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname
    if (path === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8')
      const html = String(await page.render({}))
      response.setHeader('X-SVG-Executed', String(Object.hasOwn(globalThis, 'svgExecuted')))
      response.end(html)
      return
    }
    const file = resolve(assets, `.${path}`)
    if (!file.startsWith(`${assets}${sep}`)) {
      response.writeHead(404).end()
      return
    }
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
    response.end(await readFile(file))
  }
  catch (error) {
    console.error(error)
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end()
  }
}).listen(Number(process.env.PORT), '127.0.0.1')
