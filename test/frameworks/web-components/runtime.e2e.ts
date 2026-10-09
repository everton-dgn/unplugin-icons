import { expect, test } from '@playwright/test'
import { modes } from './modes.mjs'

for (const mode of modes) {
  test.describe(mode.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${mode.name}/`)
      await expect(page.locator('body')).toHaveAttribute('data-ready', 'true')
    })

    test('registers constructors and preserves SVG namespace, escaping and literal IDs', async ({ page }) => {
      const actual = await page.evaluate(() => {
        const state = Reflect.get(window, 'fixture')
        const svg = state.initialSvg
        const other = (state.second.shadowRoot || state.second).querySelector('svg')
        return {
          ...state.registration,
          shadow: !!state.primary.shadowRoot,
          namespace: svg.namespaceURI,
          childNamespace: svg.querySelector('path').namespaceURI,
          title: svg.querySelector('title').textContent,
          id: svg.querySelector('linearGradient').id,
          otherId: other.querySelector('linearGradient').id,
          fill: svg.querySelector('path').getAttribute('fill'),
          width: svg.getAttribute('width'),
        }
      })
      expect(actual).toEqual({
        aliasesEqual: true,
        autoDefined: mode.autoDefine,
        unregisteredThrows: !mode.autoDefine,
        whenDefined: true,
        registered: true,
        constructors: true,
        svgBeforeConnect: mode.shadow,
        subclassSvg: true,
        shadow: mode.shadow,
        namespace: 'http://www.w3.org/2000/svg',
        childNamespace: 'http://www.w3.org/2000/svg',
        title: 'A & B <C> "D" ` \\',
        id: 'literal-paint',
        otherId: 'literal-paint',
        fill: 'url(#literal-paint)',
        width: '1.5em',
      })
    })

    test('reconnects with the implemented DOM lifetime and native events', async ({ page }) => {
      await page.locator('svg').first().click()
      const detached = await page.evaluate(() => {
        const state = Reflect.get(window, 'fixture')
        state.container.removeChild(state.primary)
        return { connected: state.primary.isConnected, clicks: state.clicks() }
      })
      expect(detached).toEqual({ connected: false, clicks: 1 })
      const reconnected = await page.evaluate(() => {
        const state = Reflect.get(window, 'fixture')
        state.container.prepend(state.primary)
        state.primary.setAttribute('width', '7em')
        const svg = (state.primary.shadowRoot || state.primary).querySelector('svg')
        return { connected: state.primary.isConnected, sameSvg: svg === state.initialSvg, width: svg.getAttribute('width') }
      })
      expect(reconnected).toEqual({ connected: true, sameSvg: mode.shadow, width: '1.5em' })
      await page.locator('svg').first().click()
      expect(await page.evaluate(() => Reflect.get(window, 'fixture').clicks())).toBe(2)
    })

    test('exports raw strings with prefix and query semantics', async ({ page }) => {
      const values = await page.evaluate(() => {
        const { raw, rawAlias } = Reflect.get(window, 'fixture')
        const parse = (value: string) => new DOMParser().parseFromString(value, 'image/svg+xml').documentElement
        return {
          strings: typeof raw === 'string' && typeof rawAlias === 'string',
          width: parse(raw).getAttribute('width'),
          repeatedWidth: parse(rawAlias).getAttribute('width'),
          title: parse(rawAlias).getAttribute('title'),
          rawAttribute: parse(raw).hasAttribute('raw'),
          rawQueryWidth: parse(Reflect.get(window, 'rawQuery')).getAttribute('width'),
        }
      })
      expect(values).toEqual({ strings: true, width: '2em', repeatedWidth: '3em', title: 'a%2Eb', rawAttribute: false, rawQueryWidth: '4em' })
    })
  })
}
