import { expect, test, type Page } from '@playwright/test'
import { mockWikipedia } from './wikipedia'

test.beforeEach(async ({ page }) => {
  await mockWikipedia(page)
})

const notes = (page: Page) => page.locator('main a[href^="/explore/"]')
const titles = (page: Page) => notes(page).locator('strong').allInnerTexts()

test('the landing page pins five topics to start from, each with a line on why', async ({
  page,
}) => {
  await page.goto('/')
  await expect(notes(page)).toHaveCount(5)
  const first = notes(page).first()
  await expect(first.locator('strong')).not.toBeEmpty()
  await expect(first.locator('em')).not.toBeEmpty()
})

test('Shuffle deals five different topics', async ({ page }) => {
  await page.goto('/')
  await expect(notes(page)).toHaveCount(5)
  const before = await titles(page)
  await page.getByRole('button', { name: 'Shuffle' }).click()
  await expect(notes(page)).toHaveCount(5)
  const after = await titles(page)
  expect(after.some((t) => before.includes(t))).toBe(false)
})

test('a fresh visit usually deals a different hand', async ({ browser, baseURL }) => {
  // Five of 40 topics, so two visits sharing all five is vanishingly unlikely.
  const hands: string[] = []
  for (let i = 0; i < 3; i++) {
    const page = await browser.newPage({ baseURL })
    await mockWikipedia(page)
    await page.goto('/')
    await expect(notes(page)).toHaveCount(5)
    hands.push((await titles(page)).join('|'))
    await page.close()
  }
  expect(new Set(hands).size).toBeGreaterThan(1)
})

test('starting a trail from the search box works', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Topic').fill('Octopus')
  await page.getByRole('button', { name: 'Start a trail' }).click()
  await expect(page).toHaveURL(/\/explore\/Octopus$/)
})
