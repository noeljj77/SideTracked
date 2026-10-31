import { expect, test } from '@playwright/test'
import { mockWikipedia } from './wikipedia'

test.beforeEach(async ({ page }) => {
  await mockWikipedia(page)
})

test('Ctrl K jumps to a topic, and Escape closes the bar', async ({ page }) => {
  await page.goto('/explore/Octopus')

  await page.keyboard.press('Control+k')
  const box = page.getByRole('combobox', { name: 'Jump to a topic' })
  await expect(box).toBeFocused()
  await box.fill('kra')
  await expect(page.getByRole('option', { name: /Kraken/ })).toBeVisible()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/explore\/Kraken$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.keyboard.press('/')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('Surprise me from the landing page opens a random topic', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Surprise me' }).click()
  await expect(page).toHaveURL(/\/explore\/Kraken$/)
})

test('starting a new trail saves the old one, and it can be reopened', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Topic').fill('Octopus')
  await page.keyboard.press('Enter')
  await page.getByRole('link', { name: 'Go to Squid' }).click()
  await expect(page).toHaveURL(/\/explore\/Squid$/)

  // Back to the landing page and begin somewhere new.
  await page.getByRole('link', { name: 'SideTracked' }).click()
  // The landing topics are dealt at random, so take whichever one is first.
  const note = page.locator('main a[href^="/explore/"]').first()
  const title = await note.locator('strong').innerText()
  await note.click()
  await expect(page).toHaveURL((url) => url.pathname === `/explore/${encodeURIComponent(title)}`)

  await page.getByRole('button', { name: 'Trails' }).click()
  const dialog = page.getByRole('dialog', { name: 'Your trails' })
  await dialog.getByRole('button', { name: /Octopus → Squid/ }).click()

  await expect(page).toHaveURL(/\/explore\/Squid$/)
  await expect(page.getByRole('navigation', { name: 'Your trail' })).toContainText('Octopus')
})
