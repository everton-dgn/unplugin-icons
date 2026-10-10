import assert from 'node:assert/strict'
import { toStyleString } from 'astro/runtime/server/render/util.js'

const cases = [
  ['backgroundColor', 'background-color'],
  ['fontSize', 'font-size'],
  ['WebkitTransform', '-webkit-transform'],
  ['webkitTransform', 'webkit-transform'],
  ['msTransform', 'ms-transform'],
  ['SVGColor', '-s-v-g-color'],
]
for (const [input, expected] of cases)
  assert.equal(toStyleString({ [input]: 'value' }), `${expected}:value`)

assert.equal(toStyleString({ '--customColor': 'red', 'opacity': 0, [Symbol('hidden')]: 'unused' }), '--customColor:red;opacity:0')
console.warn('Astro toStyleString: six ASCII key cases and custom-property/symbol behavior passed.')
