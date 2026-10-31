import { expect, test } from '@playwright/test'
import { mockWikipedia } from './wikipedia'

test.beforeEach(async ({ page }) => {
  await mockWikipedia(page)
})

const thread = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Your trail' })

test('search, follow a neighbour, rewind via the trail, and reload keeps the trail', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Topic').fill('Octopus')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/explore\/Octopus$/)
  await expect(page.getByText('Octopus is a topic in the fake encyclopedia.')).toBeVisible()

  await page.getByRole('link', { name: 'Go to Squid' }).click()
  await expect(page).toHaveURL(/\/explore\/Squid$/)
  await expect(thread(page)).toContainText('Octopus')
  await expect(thread(page)).toContainText('1 HOP')

  await page.getByRole('link', { name: 'Go to Ink' }).click()
  await expect(thread(page)).toContainText('2 HOPS')

  // Reload: the trail comes back from localStorage.
  await page.reload()
  await expect(thread(page)).toContainText('Octopus')
  await expect(thread(page)).toContainText('Squid')
  await expect(thread(page)).toContainText('Ink')

  // Rewind to the first step.
  await thread(page).getByRole('button', { name: 'Octopus' }).click()
  await expect(page).toHaveURL(/\/explore\/Octopus$/)
  await expect(thread(page)).not.toContainText('Ink')
})

test('browser back steps back along the trail', async ({ page }) => {
  await page.goto('/explore/Octopus')
  await page.getByRole('link', { name: 'Go to Squid' }).click()
  await expect(thread(page)).toContainText('1 HOP')

  await page.goBack()
  await expect(page).toHaveURL(/\/explore\/Octopus$/)
  await expect(thread(page)).toContainText('0 HOPS')
})

test('a missing topic shows a calm error and keeps the app usable', async ({ page }) => {
  await page.goto('/explore/Missing%20topic')
  await expect(page.getByText(`Couldn't find an article called "Missing topic".`)).toBeVisible()
  await page.getByRole('link', { name: 'SideTracked' }).click()
  await expect(page).toHaveURL('/')
})

test('topics are labelled with their kind', async ({ page }) => {
  await page.goto('/explore/Octopus')
  const panel = page.getByRole('complementary')
  await expect(panel).toContainText('Thing')

  await page.goto('/explore/Kraken')
  await expect(panel).toContainText('Event')

  await page.goto('/explore/Squid')
  await expect(panel).toContainText('Person')
})
