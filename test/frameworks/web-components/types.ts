import rawAlias from 'virtual:icons-raw/test/glyph'
import Alias from 'virtual:icons/test/glyph'
import raw from '~icons-raw/test/glyph'
import Icon from '~icons/test/glyph'

const constructors: (typeof HTMLElement)[] = [Icon, Alias]
customElements.define('typed-icon', Icon)
const instance: HTMLElement = new Icon()
class Extended extends Alias {}
customElements.define('typed-extended', Extended)
const strings: string[] = [raw, rawAlias]
// @ts-expect-error A constructor is not an element instance.
const invalid: HTMLElement = Icon
// @ts-expect-error Constructors must be invoked with new.
Icon()
// @ts-expect-error Registration requires a constructor.
customElements.define('invalid-instance', instance)
// @ts-expect-error Raw SVG text is not a constructor.
const invalidRaw: typeof HTMLElement = raw
export { constructors, instance, invalid, invalidRaw, strings }
