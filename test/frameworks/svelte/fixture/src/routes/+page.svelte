<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '~icons/test/mark'
  import VirtualIcon from 'virtual:icons/test/mark?width=1.5em'
  import raw from '~icons-raw/test/document.json?raw=false&width=2em'
  import virtualRaw from 'virtual:icons-raw/test/mark?width=3em'
  let count = $state(0)
  let clicks = $state(0)
  let mounted = $state(false)
  const width = $derived(count ? '48' : '24')
  onMount(() => { mounted = true })
</script>

<svelte:head><title>Svelte icon compatibility</title></svelte:head>
<main data-mounted={mounted}>
  <h1>Packaged icons</h1>
  <Icon data-testid="primary" width={width} height="24"
    class="primary" role="img" aria-label="Primary icon" data-count={count}
    style={`color: ${count ? 'blue' : 'red'}`} onclick={() => clicks++} />
  <VirtualIcon data-testid="alias" height="30" aria-label="Alias icon" />
  <button onclick={() => count++}>Update props</button>
  <output data-testid="count">{count}</output>
  <output data-testid="clicks">{clicks}</output>
  <pre data-testid="raw">{raw}</pre>
  <pre data-testid="virtual-raw">{virtualRaw}</pre>
</main>
