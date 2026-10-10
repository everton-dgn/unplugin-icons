import type { ComponentProps, CSSProperty, HTMLAttributes } from 'astro/types'
import type { Font, Image, Picture } from 'astro:assets'
import type { ClientRouter } from 'astro:transitions'

const css: CSSProperty = 'background-color'
const styles: HTMLAttributes<'svg'> = { style: { 'background-color': 'red', 'fontSize': 12 } }
const image: ComponentProps<typeof Image> = { src: 'https://example.com/image.png', alt: 'image', width: 100, height: 80 }
const picture: ComponentProps<typeof Picture> = { ...image, formats: ['webp'], pictureAttributes: { id: 'picture' } }
const font: ComponentProps<typeof Font> = { cssVariable: '--font-body', preload: true }
const router: ComponentProps<typeof ClientRouter> = { fallback: 'swap' }
// @ts-expect-error Unknown CSS property is not a CSSProperty.
const invalidCss: CSSProperty = 'not-a-css-property'
// @ts-expect-error CSS properties are strings.
const invalidNumber: CSSProperty = 123
// @ts-expect-error Image alt is required.
const missingAlt: ComponentProps<typeof Image> = { src: 'image.png', width: 100, height: 80 }
// @ts-expect-error Image src is required.
const missingSrc: ComponentProps<typeof Image> = { alt: 'image' }
// @ts-expect-error Picture formats must be strings.
const invalidFormat: ComponentProps<typeof Picture> = { ...image, formats: [123] }
// @ts-expect-error Picture attributes preserve HTML types.
const invalidPicture: ComponentProps<typeof Picture> = { ...image, pictureAttributes: { id: 123 } }
// @ts-expect-error Font requires a CSS variable.
const missingVariable: ComponentProps<typeof Font> = {}
// @ts-expect-error Font CSS variable must be a string.
const invalidVariable: ComponentProps<typeof Font> = { cssVariable: 123 }
// @ts-expect-error Font preload filter rejects numbers.
const invalidPreload: ComponentProps<typeof Font> = { cssVariable: '--body', preload: 123 }
// @ts-expect-error Router fallback is a closed union.
const invalidFallback: ComponentProps<typeof ClientRouter> = { fallback: 'instant' }
void [css, styles, image, picture, font, router, invalidCss, invalidNumber, missingAlt, missingSrc, invalidFormat, invalidPicture, missingVariable, invalidVariable, invalidPreload, invalidFallback]

const customFormat: ComponentProps<typeof Picture> = { ...image, formats: ['custom-codec'] }
const customVariable: ComponentProps<typeof Font> = { cssVariable: 'custom-variable' }
void [customFormat, customVariable]
