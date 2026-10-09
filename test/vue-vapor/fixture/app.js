import rawAlias from 'virtual:icons-raw/test/icon'
import Alias from 'virtual:icons/test/icon?width=2em'
import { h, onMounted, ref } from 'vue'
import raw from '~icons-raw/test/icon?raw=false'
import rawQuery from '~icons/test/icon?raw=true'
import Icon from '~icons/test/icon?width=1.5em&raw=false'

export default {
  setup() {
    const count = ref(0)
    onMounted(() => {
      document.body.dataset.hydrated = 'true'
    })
    return () => h('main', [
      h(Icon, { 'data-testid': 'icon', 'data-count': count.value, 'onClick': () => count.value++ }),
      h(Alias, { 'data-testid': 'alias' }),
      h('output', String(count.value)),
      h('pre', { 'data-testid': 'raw' }, JSON.stringify([raw, rawAlias, rawQuery])),
    ])
  },
}
