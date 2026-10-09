import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve, sep } from 'node:path'
import process from 'node:process'
// The server must exercise the production SSR bundle, not the source entry.
// eslint-disable-next-line antfu/no-import-dist
import { render } from './dist/server/entry-server.js'

const root = resolve('dist/client')
const template = readFileSync(`${root}/index.html`, 'utf8')
const html = template.replace('<!--ssr-->', render())
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }
createServer(async (request, response) => {
  if (request.url === '/') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(html)
    return
  }
  const path = resolve(root, `.${new URL(request.url, 'http://localhost').pathname}`)
  if (!path.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end()
    return
  }
  try {
    const body = await readFile(path)
    response.setHeader('Content-Type', types[path.slice(path.lastIndexOf('.'))] || 'application/octet-stream')
    response.end(body)
  }
  catch {
    response.writeHead(404).end()
  }
}).listen(Number(process.env.PORT), '127.0.0.1')
