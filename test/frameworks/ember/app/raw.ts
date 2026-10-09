import { htmlSafe } from '@ember/template'
import Encoded from 'virtual:icons-raw/fixture/sample?data-probe=%252E&raw=false'
import Virtual from 'virtual:icons-raw/fixture/sample?data-probe=middle&raw=false&height=3'
import Repeated from '~icons-raw/fixture/sample?data-probe=old&data-probe=last&raw=true&raw=false'
import Raw from '~icons-raw/fixture/sample?raw=false&data-probe=first'
import Last from '~icons/fixture/sample?data-probe=last&raw'
import Middle from '~icons/fixture/sample?data-probe=middle&raw&height=3'
import First from '~icons/fixture/sample?raw&data-probe=first'

const values = [Raw, Virtual, First, Middle, Last, Repeated, Encoded]
export const rawTypes = JSON.stringify(values.map(value => typeof value))
export const rawCases = values.map((value, index) => {
  if (typeof value !== 'string')
    throw new TypeError('Raw icon must export a string')
  return { index, html: htmlSafe(value) }
})
