import type { Page } from '@playwright/test'

/** A tiny fake Wikipedia: every topic links to the topics listed for it. Tests never hit the real site. */
const LINKS: Record<string, string[]> = {
  Octopus: ['Squid', 'Cuttlefish', 'Nautilus', 'Ink'],
  Squid: ['Ink', 'Octopus', 'Kraken'],
  Ink: ['Octopus'],
  Kraken: ['Squid'],
  Nautilus: ['Ammonite'],
  Ammonite: ['Fossil'],
  Fossil: ['Museum'],
  Museum: ['Fossil'],
  Island: ['Reef'],
  Reef: ['Island'],
}

/** Fake Wikidata: item ids per title, and which of them are people / events. Everything else is a "thing". */
const ITEM: Record<string, string> = { Octopus: 'Q1', Squid: 'Q2', Kraken: 'Q3' }
const CLASS_OF: Record<string, string> = { Q2: 'Q5', Q3: 'Q1190554' } // Squid is a "person", Kraken an "event"

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  headers: { 'access-control-allow-origin': '*' },
  body: JSON.stringify(body),
})

export async function mockWikipedia(page: Page) {
  await page.route('https://query.wikidata.org/**', (route) => {
    const query = new URL(route.request().url()).searchParams.get('query') ?? ''
    const bindings = Object.entries(CLASS_OF)
      .filter(([item]) => query.includes(`wd:${item} `))
      .map(([item, cls]) => ({
        item: { value: `http://www.wikidata.org/entity/${item}` },
        cls: { value: `http://www.wikidata.org/entity/${cls}` },
      }))
    return route.fulfill(json({ results: { bindings } }))
  })

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

    if (url.pathname.endsWith('/api.php') && url.searchParams.get('prop') === 'pageprops') {
      const pages = Object.fromEntries(
        (url.searchParams.get('titles') ?? '')
          .split('|')
          .filter((t) => t in ITEM)
          .map((title, i) => [String(i + 1), { title, pageprops: { wikibase_item: ITEM[title] } }]),
      )
      return route.fulfill(json({ query: { pages } }))
    }

    // Links walked as a generator: every linked article, with a `links` entry when it links back to `pltitles`.
    if (url.searchParams.get('generator') === 'links') {
      const self = url.searchParams.get('titles') ?? ''
      const pages = (LINKS[self] ?? []).map((title) => ({
        title,
        length: 100_000,
        ...((LINKS[title] ?? []).includes(self) ? { links: [{ title: self }] } : {}),
      }))
      return route.fulfill(json({ query: { pages } }))
    }

    // Outgoing links, optionally only those pointing at `pltitles` (formatversion 2 shape).
    if (url.pathname.endsWith('/api.php') && url.searchParams.get('prop') === 'links') {
      const only = url.searchParams.get('pltitles')
      const pages = (url.searchParams.get('titles') ?? '').split('|').map((title) => {
        const links = (LINKS[title] ?? [])
          .filter((t) => !only || t === only)
          .map((t) => ({ title: t }))
        return links.length ? { title, links } : { title }
      })
      return route.fulfill(json({ query: { pages } }))
    }

    if (url.pathname.endsWith('/api.php')) {
      const topic = (url.searchParams.get('srsearch') ?? '').replace('morelike:', '')
      const search = (LINKS[topic] ?? []).map((title) => ({ title }))
      return route.fulfill(json({ query: { search } }))
    }

    return route.fulfill(json({}, 404))
  })
}
