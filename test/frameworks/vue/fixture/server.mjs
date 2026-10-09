import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import process from 'node:process'

const root = resolve('dist/client')
const template = readFile(resolve(root, 'index.html'), 'utf8')
const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
async function handle(request, response) {
  const path = new URL(request.url, 'http://localhost').pathname
  if (path === '/' || path === '/ids') {
    const { render } = await import('./dist/server/entry-server.js')
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end((await template).replace('<!--app-html-->', await render(path === '/ids')))
    return
  }
  if (path === '/csr') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end((await template).replace('<!--app-html-->', ''))
    return
  }
  if (path === '/favicon.ico') {
    response.writeHead(204).end()
    return
  }
  const file = resolve(root, `.${decodeURIComponent(path)}`)
  if (!file.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end()
    return
  }
  response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream')
  response.end(await readFile(file))
}
createServer((request, response) => {
  handle(request, response).catch((error) => {
    console.error(error)
    response.writeHead(500).end(String(error))
  })
}).listen(Number(process.env.PORT), '127.0.0.1')
