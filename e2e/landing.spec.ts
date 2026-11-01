import { expect, test, type Page } from '@playwright/test'
import { mockWikipedia } from './wikipedia'

test.beforeEach(async ({ page }) => {
  await mockWikipedia(page)
})

const notes = (page: Page) => page.locator('main a[data-seed]')
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

test('the landing page offers to pick up the last trail', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Pick up where you left off')).toHaveCount(0)

  await page.getByLabel('Topic').fill('Octopus')
  await page.keyboard.press('Enter')
  await page.getByRole('link', { name: 'Go to Squid' }).click()
  await expect(page).toHaveURL(/\/explore\/Squid$/)

  await page.getByRole('link', { name: 'SideTracked' }).click()
  const resume = page.getByRole('link', { name: /Pick up where you left off/ })
  await expect(resume).toContainText('Squid')
  await expect(resume).toContainText('1 hop since Octopus')
  await resume.click()
  await expect(page).toHaveURL(/\/explore\/Squid$/)
  await expect(page.getByRole('navigation', { name: 'Your trail' })).toContainText('Octopus')
})

test('the landing page credits its sources and links to the code', async ({ page }) => {
  await page.goto('/')
  const foot = page.locator('footer')
  await expect(foot.getByRole('link', { name: 'Wikipedia' })).toHaveAttribute(
    'href',
    /wikipedia\.org/,
  )
  await expect(foot.getByRole('link', { name: 'Source on GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/noeljj77/SideTracked',
  )
})

test('an unknown address says so and leads back to the start', async ({ page }) => {
  await page.goto('/nowhere/at/all')
  await expect(page.getByRole('heading', { name: /isn.t on the board/ })).toBeVisible()
  await page.getByRole('link', { name: 'Back to the start' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('main a[data-seed]')).toHaveCount(5)
})
