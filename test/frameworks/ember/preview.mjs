import process from 'node:process'
import { preview } from 'vite'

preview({ preview: { host: '127.0.0.1', port: Number(process.env.PORT), strictPort: true } }).then((server) => {
  console.warn(`READY http://127.0.0.1:${process.env.PORT}`)
  process.on('SIGTERM', () => server.httpServer.close(() => process.exit(0)))
}).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
