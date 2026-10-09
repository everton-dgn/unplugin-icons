import VirtualIcon from 'virtual:icons/test/icon'
import TildeIcon from '~icons/test/icon'

customElements.define('tilde-icon', TildeIcon)
customElements.define('virtual-icon', VirtualIcon)

const constructors: CustomElementConstructor[] = [TildeIcon, VirtualIcon]
const elements: HTMLElement[] = [new TildeIcon(), new VirtualIcon()]
elements.forEach(element => document.body.append(element))

class ExtendedIcon extends TildeIcon {}
customElements.define('extended-icon', ExtendedIcon)

// @ts-expect-error The exported class is not an element instance.
const invalidInstance: HTMLElement = TildeIcon
// @ts-expect-error An instance cannot be registered as a constructor.
customElements.define('invalid-icon', new VirtualIcon())
// @ts-expect-error Element constructors cannot be called as functions.
VirtualIcon()

export { constructors, elements, invalidInstance }
