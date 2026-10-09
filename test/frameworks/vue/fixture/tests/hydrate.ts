import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const scriptUrl = /\.js(?:\?|$)/
export async function hydrate(page: Page, path: string) {
  let release!: () => void
  const scripts = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(scriptUrl, async (route) => {
    await scripts
    await route.continue()
  })
  try {
    await page.goto(path, { waitUntil: 'commit' })
    await expect(page.locator('main')).toHaveAttribute('data-mounted', 'false')
    await expect(page.locator('svg').first()).toBeVisible()
    await page.evaluate(() => {
      Reflect.set(window, 'ssrIcons', [...document.querySelectorAll('svg')])
    })
  }
  finally { release() }
  await expect(page.locator('main')).toHaveAttribute('data-mounted', 'true')
}
