<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import virtualRaw from 'virtual:icons-raw/fixture/sample.dot?raw=false'
import Alias from 'virtual:icons/fixture/sample.dot?width=2.5&height=3.5'
import queryRaw from 'virtual:icons/fixture/sample.dot?width=2.5&raw=true&height=3.5'
import raw from '~icons-raw/fixture/sample.dot?raw=false'
import Icon from '~icons/fixture/sample.dot'

const count = ref(0)
const label = computed(() => `Icon ${count.value} <&"`)
const mounted = ref(false)
const icon = ref()
const svgRef = ref(false)
onMounted(() => {
  mounted.value = true
  svgRef.value = icon.value instanceof SVGSVGElement || icon.value?.$el instanceof SVGSVGElement
})
</script>

<template>
  <main :data-mounted="mounted" :data-svg-ref="svgRef">
    <Icon ref="icon" data-testid="icon" :width="32 + count" :aria-label="label" role="img" @click="count++" />
    <Alias data-testid="alias" />
    <button @click="count++">Update {{ count }}</button>
    <pre data-testid="raw">{{ raw }}</pre>
    <pre data-testid="virtual-raw">{{ virtualRaw }}</pre>
    <pre data-testid="query-raw">{{ queryRaw }}</pre>
  </main>
</template>
