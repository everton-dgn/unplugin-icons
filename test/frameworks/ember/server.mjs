import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import process from 'node:process'
import { setTimeout } from 'node:timers/promises'

const collision = /EADDRINUSE|already in use/i

async function availablePort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}

export async function withServer(run, test) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const port = await availablePort()
    const child = spawn(process.execPath, ['preview.mjs'], {
      cwd: run,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', data => output += data)
    child.stderr.on('data', data => output += data)
    const exited = once(child, 'exit')
    try {
      for (let tick = 0; tick < 300; tick++) {
        if (output.includes(`READY http://127.0.0.1:${port}`) || child.exitCode !== null)
          break
        await setTimeout(100)
      }
      if (collision.test(output))
        continue
      assert(child.exitCode === null && output.includes(`READY http://127.0.0.1:${port}`), output)
      await test(`http://127.0.0.1:${port}`)
      return
    }
    finally {
      if (child.exitCode === null) {
        child.kill('SIGTERM')
        await exited
      }
      writeFileSync(join(run, `server-${attempt}.log`), output, { flag: 'wx' })
    }
  }
  throw new Error('Three preview port collisions')
}
