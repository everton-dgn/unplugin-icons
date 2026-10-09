import Alias from 'virtual:icons/test/gradient?width=2em'
import { h } from 'vue'
import Icon from '~icons/test/gradient'

export default {
  render: () => h('main', [h(Icon), h(Icon), h(Alias)]),
}
