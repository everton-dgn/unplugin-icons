import type { Options } from '../src/types'
import { describe, expect, it } from 'vitest'
import { generateComponentFromPath } from '../src/core/loader'
import { resolveOptions } from '../src/core/options'

const child = '<rect width="576" height="512" />'
const customSvg = `<svg viewBox="0 0 576 512">${child}</svg>`

async function renderIcon(path: string, options: Options = {}) {
  const { config } = await resolveOptions({
    compiler: 'none',
    customCollections: { test: { wide: customSvg } },
    ...options,
  })
  const result = await generateComponentFromPath(`~icons/${path}`, config)
  expect(result).not.toBeNull()
  const svg = result!.code
  const root = svg.match(/<svg\b[^>]*>/)?.[0]
  expect(root).toContain('viewBox="0 0 576 512"')
  if (path.startsWith('test/'))
    expect(svg).toContain(child)
  return {
    width: root?.match(/\swidth="([^"]*)"/)?.[1],
    height: root?.match(/\sheight="([^"]*)"/)?.[1],
  }
}

const dimensionCases: { name: string, props: Record<string, string>, width?: string, height?: string }[] = [
  { name: 'unset width', props: { width: 'unset' } },
  { name: 'unset height', props: { height: 'unset' } },
  { name: 'unset both dimensions', props: { width: 'unset', height: 'unset' } },
  { name: 'none width', props: { width: 'none' } },
  { name: 'none height', props: { height: 'none' } },
  { name: 'none both dimensions', props: { width: 'none', height: 'none' } },
  { name: 'explicit width', props: { width: '2.25em' }, width: '2.25em', height: '2em' },
  { name: 'explicit height', props: { height: '2em' }, width: '2.25em', height: '2em' },
  { name: 'unset width with explicit height', props: { width: 'unset', height: '3em' }, height: '3em' },
  { name: 'unset height with explicit width', props: { width: '3em', height: 'unset' }, width: '3em' },
  { name: 'two explicit dimensions', props: { width: '3em', height: '2em' }, width: '3em', height: '2em' },
  { name: 'auto attributes', props: { width: 'auto', height: 'auto' }, width: 'auto', height: 'auto' },
]

describe.each(['fa-solid/comments', 'test/wide'])('dimensions for %s', (path) => {
  it.each(dimensionCases)('$name via iconCustomizer', async ({ props, width, height }) => {
    expect(await renderIcon(path, {
      iconCustomizer(_, __, attributes) {
        Object.assign(attributes, props)
      },
    })).toEqual({ width, height })
  })

  it.each(dimensionCases)('$name via query parameters', async ({ props, width, height }) => {
    expect(await renderIcon(`${path}?${new URLSearchParams(props)}`)).toEqual({ width, height })
  })

  it.each([
    { custom: { width: 'unset', height: 'unset' }, query: 'width=3em&height=2em', width: '3em', height: '2em' },
    { custom: { width: '3em', height: '2em' }, query: 'width=unset&height=unset', width: undefined, height: undefined },
    { custom: { width: 'unset', height: '3em' }, query: 'width=2em', width: '2em', height: '3em' },
  ])('query $query overrides iconCustomizer', async ({ custom, query, width, height }) => {
    expect(await renderIcon(`${path}?${query}`, {
      iconCustomizer(_, __, props) {
        Object.assign(props, custom)
      },
    })).toEqual({ width, height })
  })

  it('omits generated dimensions with scale zero', async () => {
    expect(await renderIcon(path, { scale: 0 })).toEqual({ width: undefined, height: undefined })
  })

  it('calculates the missing side from an explicit dimension even with scale zero', async () => {
    expect(await renderIcon(`${path}?height=2em`, { scale: 0 })).toEqual({ width: '2.25em', height: '2em' })
  })
})

it('uses proportional default dimensions for Iconify icons', async () => {
  expect(await renderIcon('fa-solid/comments')).toEqual({ width: '1.36em', height: '1.2em' })
})

it('uses square default dimensions for custom SVGs without width and height', async () => {
  expect(await renderIcon('test/wide')).toEqual({ width: '1.2em', height: '1.2em' })
})

it('preserves dimensions already present in a custom SVG when unset is requested', async () => {
  expect(await renderIcon('test/wide?width=unset&height=unset', {
    customCollections: { test: { wide: `<svg width="576" height="512" viewBox="0 0 576 512">${child}</svg>` } },
  })).toEqual({ width: '576', height: '512' })
})
