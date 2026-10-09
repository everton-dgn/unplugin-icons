<script setup lang="ts">
import FaSolidComments from 'virtual:icons/fa-solid/comments'
import FaSolidCommentsWithHeight from 'virtual:icons/fa-solid/comments?height=2em'
import FaSolidCommentsWithWidth from 'virtual:icons/fa-solid/comments?width=2.25em'
import RawFaSolidComments from 'virtual:icons/fa-solid/comments?raw'
import RawFaSolidCommentsWithHeight from 'virtual:icons/fa-solid/comments?raw&height=2em'
import RawFaSolidCommentsWithWidth from 'virtual:icons/fa-solid/comments?raw&width=2.25em'
import RawFaSolidCommentsWithSize from 'virtual:icons/fa-solid/comments?raw&width=3em&height=2em'
import RawFaSolidCommentsWithUnsetWidth from 'virtual:icons/fa-solid/comments?raw&width=unset'
import RawFaSolidCommentsWithUnsetHeight from 'virtual:icons/fa-solid/comments?raw&height=unset'
import RawFaSolidCommentsWithUnsetSize from 'virtual:icons/fa-solid/comments?raw&width=unset&height=unset'
import Custom1 from 'virtual:icons/plain-color-icons/about?raw'
import Custom2 from 'virtual:icons/test-color-icons/about?raw'
import ExternalCustom3 from 'virtual:icons/test-color-icons/about'
import VSCodePython from 'virtual:icons/vscode-icons/file-type-python'

const dimensionExamples = [
  { query: '?raw', svg: RawFaSolidComments },
  { query: '?raw&height=2em', svg: RawFaSolidCommentsWithHeight },
  { query: '?raw&width=2.25em', svg: RawFaSolidCommentsWithWidth },
  { query: '?raw&width=3em&height=2em', svg: RawFaSolidCommentsWithSize },
  { query: '?raw&width=unset', svg: RawFaSolidCommentsWithUnsetWidth },
  { query: '?raw&height=unset', svg: RawFaSolidCommentsWithUnsetHeight },
  { query: '?raw&width=unset&height=unset', svg: RawFaSolidCommentsWithUnsetSize },
]
</script>

<template>
  <div class="markdown-body" style="padding: 2em 3em">
    <i-logos-vue style="font-size: 2em" />
    <br>
    <h2>Icons</h2>
    <p>
      <i-mdi:light-flood-down />
      <i-mdi-account />
      <i-fa-solid-dice-five />
      <i-heroicons-outline:menu-alt-2 />
      <i-heroicons-outline-menu-alt-2 />
      <i-ri-apps-2-line />
      <i-mdi-dice-d12 />
      <i-mdi-light-alarm />
      <i-noto-v1-flag-for-flag-japan />
      <i-ic-twotone-24mp />
      <i-mdi:cactus />
      <i-twemoji-1st-place-medal />
      <IIcTwotone23mp />
      <FaSolidComments />
      <VSCodePython />
      <ExternalCustom3 />
      <i-test-color-icons:about />
      <i-plain-color-icons:about />
      <br>
    </p>
    <h2>Customizer via Config</h2>
    <p>
      <i-carbon-app-connectivity />
      <i-custom-car-a />
    </p>
    <h2>Custom Props via Query</h2>
    <p>
      <FaSolidCommentsWithHeight />
      <FaSolidCommentsWithWidth />
    </p>
    <h2>Custom Icons</h2>
    <p>
      <i-custom-steering-wheel style="color: rgb(32, 115, 129)" />
      <i-inline-foo />
      <i-inline-async />
      <i-custom-car-a />
    </p>
    <h2>Collection alias</h2>
    <p>
      <i-park-abnormal />
      <i-icon-park-abnormal />
    </p>
    <h2>
      Raw Icons from
      <strong>raw</strong> query param
    </h2>
    <p>Non-square icon: fa-solid/comments (576 × 512). Compare the generated dimensions below.</p>
    <div class="dimension-examples">
      <template v-for="example in dimensionExamples" :key="example.query">
        <span v-html="example.svg" />
        <div>
          <code>virtual:icons/fa-solid/comments{{ example.query }}</code>
          <pre>{{ example.svg }}</pre>
        </div>
      </template>
      <span v-html="Custom1" />
      <div>
        <code style="opacity: 0.5">import Custom1 from
          'virtual:icons/plain-color-icons/about?raw'</code>
        <pre>{{ Custom1 }}</pre>
      </div>
      <span v-html="Custom2" />
      <div>
        <code style="opacity: 0.5">import Custom2 from
          'virtual:icons/test-color-icons/about?raw'</code>
        <pre>{{ Custom2 }}</pre>
      </div>
    </div>
    <br>
  </div>
</template>

<style scoped>
pre {
  overflow-x: auto;
}

.dimension-examples {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  align-items: center;
  gap: 0.5em;
}

.dimension-examples > span {
  display: inline-flex;
  max-width: 100%;
  box-shadow: 0 0 0 1px rgb(128 128 128 / 50%);
}

.dimension-examples > span:has(svg[width]) {
  width: fit-content;
}
</style>
