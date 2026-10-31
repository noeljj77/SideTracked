import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { mockWikipedia } from './wikipedia'

test.beforeEach(async ({ page }) => {
  await mockWikipedia(page)
})

/** Every WCAG A and AA rule axe knows how to check, with the failures named so a miss is easy to read. */
async function violations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
}

// Motion is paused so the contrast check never samples a note halfway through fading in.
test.use({ colorScheme: 'light', reducedMotion: 'reduce' })

for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('sidetracked-theme', t), theme)
    })

    test('the landing page has no accessibility violations', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('main a[data-seed]')).toHaveCount(5)
      // The audit only means something if the page really is in the theme under test.
      const html = page.locator('html')
      if (theme === 'dark') await expect(html).toHaveAttribute('data-theme', 'dark')
      else await expect(html).not.toHaveAttribute('data-theme', 'dark')
      await page.waitForTimeout(1800) // the one-off intro animation
      expect(await violations(page)).toEqual([])
    })

    test('a topic and its reading panel have no accessibility violations', async ({ page }) => {
      await page.goto('/explore/Octopus')
      await expect(page.getByRole('heading', { name: 'Octopus' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Go to Squid' })).toBeVisible()
      expect(await violations(page)).toEqual([])
    })

    test('Collide has no accessibility violations', async ({ page }) => {
      await page.goto('/collide')
      expect(await violations(page)).toEqual([])
    })

    test('the trails overlay has no accessibility violations', async ({ page }) => {
      await page.goto('/explore/Octopus')
      await page.getByRole('button', { name: 'Trails' }).click()
      await expect(page.getByRole('dialog', { name: 'Your trails' })).toBeVisible()
      expect(await violations(page)).toEqual([])
    })
  })
}

test('a keyboard user can skip the graph and reach the same topics as a list', async ({ page }) => {
  await page.goto('/explore/Octopus')
  await expect(page.getByRole('link', { name: 'Go to Squid' })).toBeVisible()

  await page.keyboard.press('Tab')
  const skip = page.getByRole('button', { name: 'Skip to the list of topics' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('list', { name: 'Topics to follow next' })).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /Squid/ }).first()).toBeFocused()
})
