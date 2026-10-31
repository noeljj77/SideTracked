import type { Page } from '@playwright/test'

/** A tiny fake Wikipedia: every topic links to the topics listed for it. Tests never hit the real site. */
const LINKS: Record<string, string[]> = {
  Octopus: ['Squid', 'Cuttlefish', 'Nautilus'],
  Squid: ['Ink', 'Octopus', 'Kraken'],
  Ink: ['Octopus'],
  Kraken: ['Squid'],
}

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  headers: { 'access-control-allow-origin': '*' },
  body: JSON.stringify(body),
})

export async function mockWikipedia(page: Page) {
  await page.route('https://en.wikipedia.org/**', (route) => {
    const url = new URL(route.request().url())

    if (url.pathname.includes('/page/summary/')) {
      const title = decodeURIComponent(url.pathname.split('/page/summary/')[1] ?? '')
      if (title === 'Missing topic') return route.fulfill(json({}, 404))
      return route.fulfill(
        json({
          title,
          extract: `${title} is a topic in the fake encyclopedia.`,
          type: 'standard',
          content_urls: { desktop: { page: `https://en.wikipedia.org/wiki/${title}` } },
        }),
      )
    }

    if (url.pathname.includes('/page/random/summary')) {
      return route.fulfill(
        json({
          title: 'Kraken',
          extract: 'A sea monster.',
          type: 'standard',
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Kraken' } },
        }),
      )
    }

    if (url.pathname.endsWith('/search/title')) {
      const q = (url.searchParams.get('q') ?? '').toLowerCase()
      const pages = Object.keys(LINKS)
        .filter((t) => t.toLowerCase().includes(q))
        .map((title) => ({ title, description: `About ${title}` }))
      return route.fulfill(json({ pages }))
    }

    if (url.pathname.endsWith('/api.php')) {
      const topic = (url.searchParams.get('srsearch') ?? '').replace('morelike:', '')
      const search = (LINKS[topic] ?? []).map((title) => ({ title }))
      return route.fulfill(json({ query: { search } }))
    }

    return route.fulfill(json({}, 404))
  })
}
