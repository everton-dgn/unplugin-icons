import process from 'node:process'

export function typeGates(command, failures) {
  const gates = [
    ['patch-provenance', process.execPath, ['patch-provenance.mjs']],
    ['astro-check', 'bun', ['x', '--no-install', 'astro', 'check']],
    ['types-consumer', 'bun', ['x', '--no-install', 'tsc', '--noEmit', '-p', 'tsconfig.types.json']],
    ['types-upstream', 'bun', ['x', '--no-install', 'tsc', '--noEmit', '-p', 'tsconfig.upstream.json']],
    ['types-negative', process.execPath, ['type-negatives.mjs']],
    ['style-runtime', process.execPath, ['style-runtime.mjs']],
  ]
  for (const [name, binary, args] of gates) {
    try {
      command(binary, args)
    }
    catch (error) {
      console.error(name, error)
      failures.push(name)
    }
  }
}
