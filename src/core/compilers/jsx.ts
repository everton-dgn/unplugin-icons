import type { Config } from '@svgr/core'
import type { Compiler } from './types'
import { camelize } from '@iconify/utils/lib/misc/strings'
import { importPeerModule } from './peer'

// Explicit SVG names from SVGR's attribute mapping. Case-sensitive SVG names
// such as viewBox and gradientUnits intentionally keep their original spelling.
const preactAttributeNames = new Map(Object.entries({
  accentHeight: 'accent-height',
  alignmentBaseline: 'alignment-baseline',
  arabicForm: 'arabic-form',
  baselineShift: 'baseline-shift',
  capHeight: 'cap-height',
  clipPath: 'clip-path',
  clipRule: 'clip-rule',
  colorInterpolation: 'color-interpolation',
  colorInterpolationFilters: 'color-interpolation-filters',
  colorProfile: 'color-profile',
  colorRendering: 'color-rendering',
  dominantBaseline: 'dominant-baseline',
  enableBackground: 'enable-background',
  fillOpacity: 'fill-opacity',
  fillRule: 'fill-rule',
  floodColor: 'flood-color',
  floodOpacity: 'flood-opacity',
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontSizeAdjust: 'font-size-adjust',
  fontStretch: 'font-stretch',
  fontStyle: 'font-style',
  fontVariant: 'font-variant',
  fontWeight: 'font-weight',
  glyphName: 'glyph-name',
  glyphOrientationHorizontal: 'glyph-orientation-horizontal',
  glyphOrientationVertical: 'glyph-orientation-vertical',
  horizAdvX: 'horiz-adv-x',
  horizOriginX: 'horiz-origin-x',
  imageRendering: 'image-rendering',
  letterSpacing: 'letter-spacing',
  lightingColor: 'lighting-color',
  markerEnd: 'marker-end',
  markerMid: 'marker-mid',
  markerStart: 'marker-start',
  overlinePosition: 'overline-position',
  overlineThickness: 'overline-thickness',
  paintOrder: 'paint-order',
  panose1: 'panose-1',
  pointerEvents: 'pointer-events',
  renderingIntent: 'rendering-intent',
  shapeRendering: 'shape-rendering',
  stopColor: 'stop-color',
  stopOpacity: 'stop-opacity',
  strikethroughPosition: 'strikethrough-position',
  strikethroughThickness: 'strikethrough-thickness',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeMiterlimit: 'stroke-miterlimit',
  strokeOpacity: 'stroke-opacity',
  strokeWidth: 'stroke-width',
  textAnchor: 'text-anchor',
  textDecoration: 'text-decoration',
  textRendering: 'text-rendering',
  underlinePosition: 'underline-position',
  underlineThickness: 'underline-thickness',
  unicodeBidi: 'unicode-bidi',
  unicodeRange: 'unicode-range',
  unitsPerEm: 'units-per-em',
  vAlphabetic: 'v-alphabetic',
  vectorEffect: 'vector-effect',
  vertAdvY: 'vert-adv-y',
  vertOriginX: 'vert-origin-x',
  vertOriginY: 'vert-origin-y',
  vHanging: 'v-hanging',
  vIdeographic: 'v-ideographic',
  vMathematical: 'v-mathematical',
  wordSpacing: 'word-spacing',
  writingMode: 'writing-mode',
  xHeight: 'x-height',
  xlinkActuate: 'xlink:actuate',
  xlinkArcrole: 'xlink:arcrole',
  xlinkHref: 'xlink:href',
  xlinkRole: 'xlink:role',
  xlinkShow: 'xlink:show',
  xlinkTitle: 'xlink:title',
  xlinkType: 'xlink:type',
  xmlBase: 'xml:base',
  xmlLang: 'xml:lang',
  xmlnsXlink: 'xmlns:xlink',
  xmlSpace: 'xml:space',
}))

type BabelPlugin = Extract<NonNullable<NonNullable<NonNullable<Config['jsx']>['babelConfig']>['plugins']>[number], { visitor?: unknown }>

const preactJsx: Config['jsx'] = {
  babelConfig: {
    plugins: [({ template }): BabelPlugin => ({
      visitor: {
        JSXAttribute(path) {
          const { node } = path
          if (node.name.type !== 'JSXIdentifier')
            return
          const name = preactAttributeNames.get(node.name.name)
          if (!name)
            return
          if (name.includes(':')) {
            let value = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : node.value
            if (value?.type === 'JSXEmptyExpression')
              return
            if (value?.type === 'StringLiteral') {
              // SVGR leaves XML entities in JSX strings. Let Babel decode them
              // before moving the value into a JavaScript object property.
              const parsed = template.expression.ast(`<svg value="${value.value.replaceAll('"', '&quot;')}" />`, { plugins: ['jsx'] })
              if (parsed.type === 'JSXElement') {
                const attribute = parsed.openingElement.attributes[0]
                if (attribute.type === 'JSXAttribute' && attribute.value?.type === 'StringLiteral')
                  value = { type: 'StringLiteral', value: attribute.value.value }
              }
            }
            path.replaceWith({
              type: 'JSXSpreadAttribute',
              argument: {
                type: 'ObjectExpression',
                properties: [{
                  type: 'ObjectProperty',
                  key: { type: 'StringLiteral', value: name },
                  value: value ?? { type: 'BooleanLiteral', value: true },
                  computed: false,
                  shorthand: false,
                }],
              },
            })
          }
          else {
            node.name.name = name
          }
        },
      },
    })],
  },
}

export const JSXCompiler = (async (
  svg,
  collection,
  icon,
  options,
) => {
  const svgrCore = await importPeerModule('@svgr/core')
  const jsxPlugin = await importPeerModule('@svgr/plugin-jsx')
  // check for v6/v7 transform (v7 on CJS it is in default), v5 default and previous versions
  const svgr = svgrCore.transform // v6 or v7 ESM
    || (svgrCore.default ? (svgrCore.default.transform /* v7 CJS */ ?? svgrCore.default) : svgrCore.default)
    || svgrCore
  let res = await svgr(
    svg,
    {
      plugins: [jsxPlugin],
      jsx: options.jsx === 'preact' ? preactJsx : undefined,
      ref: options.jsx === 'react',
      titleProp: options.jsx === 'react',
    },
    { componentName: camelize(`${collection}-${icon}`) },
  )
  // svgr does not provide an option to support preact (WHY?),
  // we manually remove the react import for preact
  if (options.jsx !== 'react')
    res = res.replace('import * as React from "react";', '')
  return res
}) as Compiler
