import { expect, test } from '@playwright/test'
import { mockWikipedia } from './wikipedia'

test.beforeEach(async ({ page }) => {
  await mockWikipedia(page)
})

const thread = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Your trail' })

test('search, follow a neighbour, rewind via the trail, and reload keeps the trail', async ({
  page,
}) => {
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

test('arrow keys browse neighbours and Enter steps into one', async ({ page }) => {
  await page.goto('/explore/Octopus')
  await expect(page.getByRole('link', { name: 'Go to Squid' })).toBeVisible()

  await page.keyboard.press('ArrowRight')
  const first = page.locator('[data-nb]:focus')
  await expect(first).toHaveCount(1)
  const before = await first.getAttribute('aria-label')

  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[data-nb]:focus')).not.toHaveAttribute('aria-label', before ?? '')

  await page.keyboard.press('Enter')
  await expect(page).not.toHaveURL(/\/explore\/Octopus$/)
  await expect(thread(page)).toContainText('1 HOP')
})

test('hovering a neighbour shows a peek card with its summary', async ({ page }) => {
  await page.goto('/explore/Octopus')
  await page.getByRole('link', { name: 'Go to Squid' }).hover()
  await expect(page.getByText('Squid is a topic in the fake encyclopedia.').first()).toBeVisible()
})

test('the wheel zooms the graph, and Reset view brings it home', async ({ page }) => {
  await page.goto('/explore/Octopus')
  const graph = page.getByRole('group', { name: 'Topics connected to Octopus' })
  await expect(page.getByRole('link', { name: 'Go to Squid' })).toBeVisible()
  await graph.hover()
  await page.mouse.wheel(0, -400)
  await expect(graph).toHaveAttribute('data-moved', '')
  await page.getByRole('button', { name: 'Reset view' }).click()
  await expect(graph).not.toHaveAttribute('data-moved')
})

test('dragging a neighbour does not step into it', async ({ page }) => {
  await page.goto('/explore/Octopus')
  const squid = page.getByRole('link', { name: 'Go to Squid' })
  const box = await squid.locator('circle').first().boundingBox()
  if (!box) throw new Error('Squid has no box')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 60, y + 40, { steps: 6 })
  await page.mouse.up()
  await expect(page).toHaveURL(/\/explore\/Octopus$/)
  await squid.click()
  await expect(page).toHaveURL(/\/explore\/Squid$/)
})

test('the trail map shows every step and a star takes you back to it', async ({ page }) => {
  await page.goto('/explore/Octopus')
  await page.getByRole('link', { name: 'Go to Squid' }).click()
  await expect(page).toHaveURL(/\/explore\/Squid$/)

  await page.getByRole('button', { name: 'Map' }).click()
  const map = page.getByRole('dialog', { name: 'Trail map' })
  await expect(map).toContainText('2 TOPICS')
  await expect(map.getByRole('link', { name: 'Squid, where you are' })).toBeVisible()

  await map.getByRole('link', { name: 'Go back to Octopus' }).click()
  await expect(map).toBeHidden()
  await expect(page).toHaveURL(/\/explore\/Octopus$/)
  await expect(thread(page)).toContainText('Octopus')
})

test('M opens the trail map and Escape closes it', async ({ page }) => {
  await page.goto('/explore/Octopus')
  await expect(page.getByRole('link', { name: 'Go to Squid' })).toBeVisible()
  await page.keyboard.press('m')
  await expect(page.getByRole('dialog', { name: 'Trail map' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Trail map' })).toBeHidden()
})

test('a long journey stays on the map instead of dropping the early steps', async ({ page }) => {
  await page.goto('/explore/Octopus')
  for (const next of ['Nautilus', 'Ammonite', 'Fossil', 'Museum']) {
    await page.getByRole('link', { name: `Go to ${next}` }).click()
    await expect(page).toHaveURL(new RegExp(`/explore/${next}$`))
  }
  // Five steps in, the very first topic is still part of the graph.
  await expect(page.getByRole('link', { name: 'Go to Octopus' })).toBeAttached()
  await expect(page.getByRole('link', { name: 'Go to Nautilus' })).toBeAttached()
  await expect(page.getByRole('button', { name: 'Whole journey' })).toBeVisible()
})

test('pointing at a topic in the reading panel lights it up on the graph', async ({ page }) => {
  await page.goto('/explore/Octopus')
  const squid = page.getByRole('link', { name: 'Go to Squid' })
  const ink = page.getByRole('link', { name: 'Go to Ink' })
  await expect(squid).toBeVisible()
  await expect(ink).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: /^Squid/ }).hover()
  await expect(ink).toHaveCSS('opacity', '0.25')
  await expect(squid).toHaveCSS('opacity', '1')
})

test('after a few steps a minimap appears, and clicking it moves the camera', async ({ page }) => {
  await page.goto('/explore/Octopus')
  for (const next of ['Nautilus', 'Ammonite']) {
    await page.getByRole('link', { name: `Go to ${next}` }).click()
    await expect(page).toHaveURL(new RegExp(`/explore/${next}$`))
  }
  const graph = page.getByRole('group', { name: 'Topics connected to Ammonite' })
  const mini = page.locator('svg[aria-hidden="true"][width="188"]')
  await expect(mini).toBeVisible()
  await expect(graph).not.toHaveAttribute('data-moved')
  await mini.click({ position: { x: 20, y: 54 } })
  await expect(graph).toHaveAttribute('data-moved', '')
})
