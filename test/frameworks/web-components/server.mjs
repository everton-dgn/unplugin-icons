import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import process from 'node:process'

const root = resolve('dist')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const file = resolve(root, `.${path.endsWith('/') ? `${path}index.html` : path}`)
  if (!file.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end()
    return
  }
  try {
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream')
    response.end(await readFile(file))
  }
  catch {
    response.writeHead(404).end()
  }
})
server.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})
server.listen(0, '127.0.0.1', () => process.send?.({ port: server.address().port }))
process.on('message', (message) => {
  if (message === 'close') {
    server.close(() => process.disconnect())
  }
})
