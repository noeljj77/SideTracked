import { expect, test } from '@playwright/test'
import { mockWikipedia } from './wikipedia'

test.beforeEach(async ({ page }) => {
  await mockWikipedia(page)
})

test('collide finds the topic between two others and walks it as a trail', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Collide' }).click()
  await page.getByLabel('From').fill('Octopus')
  await page.getByLabel('To').fill('Kraken')
  await page.getByRole('button', { name: 'Find the bridge' }).click()

  await expect(page).toHaveURL(/from=Octopus&to=Kraken/)
  await expect(page.getByText('2 hops')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Squid' })).toBeVisible()

  await page.getByRole('button', { name: 'Walk this trail' }).click()
  await expect(page).toHaveURL(/\/explore\/Kraken$/)
  const thread = page.getByRole('navigation', { name: 'Your trail' })
  await expect(thread).toContainText('Octopus')
  await expect(thread).toContainText('Squid')
  await expect(thread).toContainText('2 hops')
})

test('collide widens to a chain of two stones when no single one exists', async ({ page }) => {
  await page.goto('/collide?from=Ink&to=Kraken')
  await expect(page.getByText('3 hops')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Octopus' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Squid' })).toBeVisible()
})

test('collide says so calmly when nothing sits between two topics', async ({ page }) => {
  await page.goto('/collide?from=Island&to=Kraken')
  await expect(page.getByText('Nothing sits between those two.')).toBeVisible()
})

test('collide names a topic it cannot find', async ({ page }) => {
  await page.goto('/collide?from=Missing%20topic&to=Kraken')
  await expect(page.getByText(`Couldn't find an article called "Missing topic".`)).toBeVisible()
})
