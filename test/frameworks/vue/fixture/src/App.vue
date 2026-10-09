<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { computed, onMounted, ref } from 'vue'
import Alias from 'virtual:icons/test/mark?width=1.5em&raw=false'
import virtualRaw from 'virtual:icons-raw/test/mark?title=a%252Eb&width=2em&width=3em'
import Icon from '~icons/test/mark'
import Gradient from '~icons/test/gradient'
import raw from '~icons-raw/test/document.json?raw=false&width=2em'

defineProps<{ ids: boolean }>()
const count = ref(0)
const clicks = ref(0)
const mounted = ref(false)
const iconRef = ref<ComponentPublicInstance | SVGSVGElement | null>(null)
const width = computed(() => count.value ? 48 : 24)
onMounted(() => {
  const value = iconRef.value
  const element = value instanceof SVGSVGElement ? value : value?.$el
  if (element instanceof SVGSVGElement)
    Reflect.set(window, 'iconRefElement', element)
  mounted.value = true
})
</script>

<template>
  <main :data-mounted="mounted">
    <template v-if="ids"><Gradient data-testid="gradient" /></template>
    <template v-else>
      <Icon ref="iconRef" data-testid="primary" :width="width" height="24"
        class="primary" role="img" aria-label="Primary icon" :data-count="count"
        :style="{ color: count ? 'blue' : 'red' }" @click="clicks++" />
      <Alias data-testid="alias" height="30" aria-label="Alias icon" />
      <button @click="count++">Update props</button>
      <output data-testid="count">{{ count }}</output>
      <output data-testid="clicks">{{ clicks }}</output>
      <pre data-testid="raw">{{ raw }}</pre>
      <pre data-testid="virtual-raw">{{ virtualRaw }}</pre>
    </template>
  </main>
</template>
