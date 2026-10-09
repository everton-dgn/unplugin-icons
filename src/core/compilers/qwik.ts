import type { ToJsComponentOptions } from '@svgx/core'
import type { Compiler } from './types'
import { camelize } from '@iconify/utils/lib/misc/strings'
import { importPeerModule } from './peer'

const RE_INVALID_IDENTIFIER = /[^\w$]/g

export const QwikCompiler = (async (
  svg,
  collection,
  icon,
  options,
) => {
  const defaultOptions: ToJsComponentOptions = {
    importSource: '@builder.io/qwik',
    runtime: 'automatic',
    elementAttributeNameCase: 'html',
    componentName: camelize(`${collection}-${icon}`).replace(RE_INVALID_IDENTIFIER, '_'),
  }
  const mergedOptions = Object.assign({}, defaultOptions, options)
  const svgx = await importPeerModule('@svgx/core')
  const toJsxComponent = svgx.toJsxComponent
  const res = toJsxComponent(svg, {
    ...mergedOptions,
    defaultExport: true,
  })
  return res
}) as Compiler
