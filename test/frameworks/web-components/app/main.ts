import rawAlias from 'virtual:icons-raw/test/glyph?width=2em&width=3em&title=a%252Eb'
import Alias from 'virtual:icons/test/glyph?width=1.5em&raw=false'
import raw from '~icons-raw/test/glyph?raw=false&width=2em'
import Icon from '~icons/test/glyph?width=1.5em&raw=false'
import './raw-query.js'

async function main() {
  const mode = __MODE__
  const generatedName = `${mode.prefix}-test-glyph`
  const tag = mode.autoDefine ? generatedName : `manual-${mode.name}`
  const before = customElements.get(generatedName)
  let unregisteredThrows = false
  if (!mode.autoDefine) {
    try {
      Reflect.construct(Icon, [])
    }
    catch (error) { unregisteredThrows = error instanceof TypeError }
  }
  const ready = customElements.whenDefined(tag)
  if (!mode.autoDefine)
    customElements.define(tag, Icon)
  const defined = await ready
  class ExtendedIcon extends Icon {}
  customElements.define(`extended-${mode.name}`, ExtendedIcon)
  const primary = new Icon()
  const second = document.createElement(tag)
  const extended = new ExtendedIcon()
  const svgBeforeConnect = !!(primary.shadowRoot || primary).querySelector('svg')
  const container = document.querySelector('#icons')!
  container.append(primary, second, extended)
  const root = primary.shadowRoot || primary
  const initialSvg = root.querySelector('svg')!
  let clicks = 0
  primary.addEventListener('click', () => {
    clicks++
  })
  Reflect.set(window, 'fixture', {
    mode,
    primary,
    second,
    extended,
    initialSvg,
    container,
    raw,
    rawAlias,
    clicks: () => clicks,
    registration: {
      aliasesEqual: Icon === Alias,
      autoDefined: before === Icon,
      unregisteredThrows,
      whenDefined: defined === Icon,
      registered: customElements.get(tag) === Icon,
      constructors: primary instanceof HTMLElement && second instanceof Icon && extended instanceof ExtendedIcon,
      svgBeforeConnect,
      subclassSvg: !!(extended.shadowRoot || extended).querySelector('svg'),
    },
  })
  document.body.dataset.ready = 'true'
}
main().catch((error) => {
  throw error
})
