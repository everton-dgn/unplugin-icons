import type { ResolvedOptions } from '../../src/types'
import { expect, it } from 'vitest'
import { EmberCompiler } from '../../src/core/compilers/ember'

it.each([
  ['<svg width="24"><path /></svg>', '<svg width="24" ...attributes><path /></svg>'],
  ['<svg/>', '<svg ...attributes/>'],
  ['<svg />', '<svg  ...attributes/>'],
  ['<svg data-value="a > b /> c"/>', '<svg data-value="a > b /> c" ...attributes/>'],
  ['<svg data-value=\'a > b /> c\'><svg /></svg>', '<svg data-value=\'a > b /> c\' ...attributes><svg /></svg>'],
  ['<svg title="&quot;safe&quot;"><title>A &amp; B</title></svg>', '<svg title="&quot;safe&quot;" ...attributes><title>A &amp; B</title></svg>'],
])('places consumer attributes after root defaults: %s', async (svg, expected) => {
  const output = await EmberCompiler(svg, 'fixture', 'sample', {} as ResolvedOptions)
  expect(output).toContain(`template(${JSON.stringify(expected)})`)
})
