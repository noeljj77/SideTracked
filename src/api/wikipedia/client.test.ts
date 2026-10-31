import {
  fetchLinkers,
  fetchLinks,
  fetchLinksAmong,
  fetchMutual,
  fetchRandomTitle,
  fetchRelated,
  fetchTopic,
  searchTitles,
} from './client'

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }))

afterEach(() => vi.unstubAllGlobals())

const summary = {
  title: 'Octopus',
  extract: 'Eight arms.',
  type: 'standard',
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Octopus' } },
}

it('maps a summary to a Topic', async () => {
  vi.stubGlobal('fetch', reply(summary))
  expect(await fetchTopic('Octopus')).toMatchObject({ id: 'Octopus', disambiguation: false })
})

it('maps 404 to NotFound and bad shapes to Invalid', async () => {
  vi.stubGlobal('fetch', reply({}, 404))
  await expect(fetchTopic('Nope')).rejects.toMatchObject({ kind: 'NotFound' })
  vi.stubGlobal('fetch', reply({ title: 1 }))
  await expect(fetchTopic('Nope')).rejects.toMatchObject({ kind: 'Invalid' })
})

it('maps a network failure to Network', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
  await expect(fetchRelated('Octopus')).rejects.toMatchObject({ kind: 'Network' })
})

it('ranks related results and tolerates an empty result', async () => {
  // The same reply answers the links lookup too, which it cannot satisfy: similarity alone is used.
  vi.stubGlobal('fetch', reply({ query: { search: [{ title: 'Squid' }] } }))
  expect(await fetchRelated('Octopus')).toEqual([
    { id: 'Squid', strength: 'strong', why: 'similar' },
  ])
  vi.stubGlobal('fetch', reply({ batchcomplete: '' }))
  expect(await fetchRelated('Octopus')).toEqual([])
})

it('keeps only articles that link back, across continuation, with their size', async () => {
  const page1 = {
    continue: { gplcontinue: 'x' },
    query: {
      pages: [
        { title: 'Squid', length: 5000, links: [{ title: 'Octopus' }] },
        { title: 'Ink', length: 900 },
      ],
    },
  }
  const page2 = {
    query: { pages: [{ title: 'Kraken', length: 7000, links: [{ title: 'Octopus' }] }] },
  }
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(page1)))
      .mockResolvedValueOnce(new Response(JSON.stringify(page2))),
  )
  expect(await fetchMutual('Octopus')).toEqual([
    { id: 'Squid', length: 5000 },
    { id: 'Kraken', length: 7000 },
  ])
})

it('offers a linked-both-ways tangent next to the similar topics', async () => {
  const search = { query: { search: [{ title: 'Squid' }] } }
  const mutual = {
    query: { pages: [{ title: 'Kraken', length: 120000, links: [{ title: 'Octopus' }] }] },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(JSON.stringify(url.includes('generator=links') ? mutual : search)),
    ),
  )
  expect(await fetchRelated('Octopus')).toEqual([
    { id: 'Squid', strength: 'strong', why: 'similar' },
    { id: 'Kraken', strength: 'surprising', why: 'tangent' },
  ])
})

it('maps title search hits and tolerates a missing description', async () => {
  vi.stubGlobal(
    'fetch',
    reply({
      pages: [
        { title: 'Squid', description: null },
        { title: 'Squid game', description: 'TV series' },
      ],
    }),
  )
  expect(await searchTitles('squ')).toEqual([
    { title: 'Squid', description: undefined },
    { title: 'Squid game', description: 'TV series' },
  ])
})

it('returns the title of a random article', async () => {
  vi.stubGlobal('fetch', reply(summary))
  expect(await fetchRandomTitle()).toBe('Octopus')
})

it('collects links across continuation pages', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          continue: { gplcontinue: 'x', continue: 'gplcontinue||' },
          query: {
            pages: [
              { title: 'Squid', length: 5000 },
              { title: 'Gone', missing: true },
            ],
          },
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ query: { pages: [{ title: 'Ink', length: 900 }] } })),
    )
  vi.stubGlobal('fetch', fetchMock)
  expect(await fetchLinks('Octopus')).toEqual([
    { id: 'Squid', length: 5000 },
    { id: 'Ink', length: 900 },
  ])
  expect(String(fetchMock.mock.calls[1]?.[0])).toContain('gplcontinue=x')
})

it('finds which of some articles link to which of others, 50 by 50', async () => {
  const xs = Array.from({ length: 60 }, (_, i) => `X${i}`)
  const ys = ['Y1', 'Y2']
  const fetchMock = vi.fn(async (url: string) => {
    const asked = new URL(url).searchParams.get('titles')?.split('|') ?? []
    const pages = asked.map((title) => ({
      title,
      ...(title === 'X55' ? { links: [{ title: 'Y2' }] } : {}),
    }))
    return new Response(JSON.stringify({ query: { pages } }))
  })
  vi.stubGlobal('fetch', fetchMock)
  expect(await fetchLinksAmong(xs, ys)).toEqual([['X55', 'Y2']])
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('asks which articles link to a target in batches of 50 and keeps the given order', async () => {
  const titles = Array.from({ length: 120 }, (_, i) => `T${i}`)
  const fetchMock = vi.fn(async (url: string) => {
    const asked = new URL(url).searchParams.get('titles')?.split('|') ?? []
    const pages = asked.map((title) => ({
      title,
      ...(title === 'T7' || title === 'T100' ? { links: [{ title: 'Goal' }] } : {}),
    }))
    return new Response(JSON.stringify({ query: { pages } }))
  })
  vi.stubGlobal('fetch', fetchMock)
  const progress: number[] = []
  expect(await fetchLinkers(titles, 'Goal', undefined, (n) => progress.push(n))).toEqual([
    'T7',
    'T100',
  ])
  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(Math.max(...progress)).toBe(120)
})
