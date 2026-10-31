// Takes the README screenshots (docs/) and the social preview (public/og.jpg) from a running dev server.
// Start it first with `npm run dev`, then run `npm run screenshots`. It uses live Wikipedia, so topics vary a little.
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:5173'
const DOCS = 'docs'

// A fixed random sequence, so the landing page always deals the same five notes.
function seeded(page) {
  return page.addInitScript(() => {
    let a = 20261031
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  })
}

async function page(browser, theme, size = { width: 1440, height: 900 }, scale = 1) {
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: scale,
    colorScheme: theme,
    acceptDownloads: true,
  })
  const p = await context.newPage()
  await p.addInitScript((t) => localStorage.setItem('sidetracked-theme', t), theme)
  await seeded(p)
  return p
}

async function walk(p, topic, steps) {
  await p.goto(`${BASE}/explore/${encodeURIComponent(topic)}`)
  for (let i = 0; i < steps; i++) {
    // Unexplored neighbours only: the first link on the page can be an earlier step, which walks the trail back.
    const next = p.locator('[data-nb]').first()
    await next.waitFor({ timeout: 20000 })
    await p.waitForTimeout(1200)
    await next.click()
  }
  await p.locator('[data-nb]').first().waitFor({ timeout: 20000 })
  await p.waitForTimeout(2200)
}

const browser = await chromium.launch({ channel: 'chrome' })
await mkdir(DOCS, { recursive: true })

for (const theme of ['light', 'dark']) {
  const landing = await page(browser, theme)
  await landing.goto(BASE)
  await landing.waitForTimeout(3600) // the intro animation
  await landing.screenshot({ path: `${DOCS}/landing-${theme}.jpg`, type: 'jpeg', quality: 88 })

  const explore = await page(browser, theme)
  await walk(explore, 'Octopus', 4)
  await explore.screenshot({ path: `${DOCS}/explore-${theme}.jpg`, type: 'jpeg', quality: 88 })

  if (theme === 'light') {
    await explore.getByRole('button', { name: 'Trails' }).click()
    const download = explore.waitForEvent('download')
    await explore.getByRole('button', { name: 'Download poster' }).click()
    await (await download).saveAs(`${DOCS}/poster.png`)
  }
  await landing.context().close()
  await explore.context().close()
}

const collide = await page(browser, 'light')
await collide.goto(`${BASE}/collide?from=Octopus&to=Byzantine%20Empire`)
await collide.getByText(/Meeting points|Octopus/).first().waitFor({ timeout: 30000 })
await collide.waitForTimeout(6000)
await collide.screenshot({ path: `${DOCS}/collide-light.jpg`, type: 'jpeg', quality: 88 })
await collide.context().close()

// 1600 x 840 drawn at 0.75 is the 1200 x 630 that link previews expect.
const social = await page(browser, 'light', { width: 1600, height: 840 }, 0.75)
await social.goto(BASE)
await social.waitForTimeout(3600)
await social.screenshot({ path: 'public/og.jpg', type: 'jpeg', quality: 88 })
await social.context().close()

await browser.close()
