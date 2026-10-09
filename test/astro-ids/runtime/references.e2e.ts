import { writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const idAttribute = / id="([^"\s]+)"/g

test('every rendered instance has unique IDs in raw HTML and the DOM', async ({ page, request }, info) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)
  const html = await response.text()
  const htmlPath = info.outputPath('server.html')
  writeFileSync(htmlPath, html, { flag: 'wx' })
  await info.attach('server-html', { path: htmlPath, contentType: 'text/html' })
  const ids = Array.from(html.matchAll(idAttribute), match => match[1])
  expect(ids.length).toBeGreaterThan(20)
  expect(new Set(ids).size).toBe(ids.length)
  await page.goto('/')
  const actual = await page.locator('svg [id], svg[id]').evaluateAll(nodes => nodes.map(node => node.id))
  expect(new Set(actual).size).toBe(actual.length)
})

test('fragment, ARIA and SMIL references resolve within their own instance', async ({ page }) => {
  await page.goto('/')
  const results = await page.locator('section > svg').evaluateAll((icons) => {
    // This callback runs in the browser and cannot capture module constants.
    // eslint-disable-next-line e18e/prefer-static-regex
    const fragmentUrl = /#([^'"\s)]+)/
    return icons.map((svg) => {
      const byRole = (role: string) => svg.querySelector(`[data-role="${role}"]`)!
      const shape = byRole('shape')
      const motion = svg.querySelector('animate')!
      const title = svg.querySelector('title')!
      const description = svg.querySelector('desc')!
      const fragment = (value: string | null) => value?.slice(1)
      const spacedUse = byRole('spaced-href') as SVGUseElement
      const spacedHref = spacedUse.getAttribute('href')!
      const glyph = svg.querySelector('defs > path')!
      const urls = [shape.getAttribute('fill'), shape.getAttribute('clip-path'), (shape as SVGElement).style.stroke]
        .map(value => value?.match(fragmentUrl)?.[1])
      const links = [fragment(byRole('href').getAttribute('href')), fragment(byRole('xlink').getAttributeNS('http://www.w3.org/1999/xlink', 'href'))]
      links.push(fragment(spacedHref.trim()))
      return {
        spacedHref,
        expectedSpacedHref: ` #${glyph.id} `,
        spacedWidth: spacedUse.getBBox().width,
        local: [...urls, ...links].every(id => id && document.getElementById(id)?.closest('svg') === svg),
        described: shape.getAttribute('aria-describedby'),
        expectedDescribed: `${description.id} ${title.id}`,
        labelled: svg.getAttribute('aria-labelledby'),
        expectedLabelled: svg.parentElement?.getAttribute('data-instance') === 'null' ? null : `${title.id} ${description.id}`,
        begin: motion.getAttribute('begin'),
        expectedBegin: `${shape.id}.click; ${motion.id}.end+1s; 2s`,
        end: motion.getAttribute('end'),
        expectedEnd: `${motion.id}.end; indefinite`,
      }
    })
  })
  expect(results).toHaveLength(5)
  for (const result of results) {
    expect.soft(result.spacedHref).toBe(result.expectedSpacedHref)
    expect.soft(result.spacedWidth).toBe(2)
    expect.soft(result.local).toBe(true)
    expect.soft(result.described).toBe(result.expectedDescribed)
    expect.soft(result.labelled).toBe(result.expectedLabelled)
    expect.soft(result.begin).toBe(result.expectedBegin)
    expect.soft(result.end).toBe(result.expectedEnd)
  }
})

test('CSS selectors and gradient lookup stay instance-local without rewriting red', async ({ page }) => {
  await page.goto('/')
  for (const [name, color] of [['red-one', 'rgb(255, 0, 0)'], ['red-two', 'rgb(255, 0, 0)'], ['blue', 'rgb(0, 0, 255)']]) {
    const result = await page.locator(`[data-instance="${name}"] > svg`).evaluate((svg) => {
      const shape = svg.querySelector('[data-role="shape"]')!
      const style = svg.querySelector('style')!.textContent!
      const computed = getComputedStyle(shape)
      // Browser callbacks cannot capture module constants.
      // eslint-disable-next-line e18e/prefer-static-regex
      const fragmentUrl = /#([^'"\s)]+)/
      const id = computed.fill.match(fragmentUrl)?.[1]
      const gradient = id ? document.getElementById(id) : null
      return { selector: style.includes(`#${shape.id}`), local: gradient?.closest('svg') === svg, stop: gradient ? getComputedStyle(gradient.querySelector('stop')!).stopColor : null, color: computed.color }
    })
    expect.soft(result.selector).toBe(true)
    expect.soft(result.local).toBe(true)
    expect.soft(result.stop).toBe(color)
    expect.soft(result.color).toBe('rgb(255, 0, 0)')
  }
})
