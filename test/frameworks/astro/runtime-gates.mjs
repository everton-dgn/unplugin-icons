import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

export async function runtimeGates(run, commands, failures) {
  const runtimeFailures = new Set()
  for (const phase of ['browser', 'dev', 'build', 'prod']) {
    if ((phase === 'dev' || phase === 'prod') && runtimeFailures.has('browser'))
      continue
    if (phase === 'prod' && runtimeFailures.has('build'))
      continue
    try {
      await commands[phase]()
    }
    catch (error) {
      console.error(error)
      runtimeFailures.add(phase)
      failures.push(phase)
    }
  }
  const runtime = runtimeFailures.size ? 'failed' : 'dev and prod completed'
  writeFileSync(join(run, 'results.json'), JSON.stringify({ failures, runtime }, null, 2), { flag: 'wx' })
  assert.deepEqual(failures, [], `Failed gates: ${failures.join(', ')}; retained: ${run}`)
}
