import { fetchLinkers, fetchLinks, fetchRandomTitle, fetchRelated, fetchTopic, searchTitles } from './client'

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
  vi.stubGlobal('fetch', reply({ query: { search: [{ title: 'Squid' }] } }))
  expect(await fetchRelated('Octopus')).toEqual([{ id: 'Squid', strength: 'strong' }])
  vi.stubGlobal('fetch', reply({ batchcomplete: '' }))
  expect(await fetchRelated('Octopus')).toEqual([])
})

it('maps title search hits and tolerates a missing description', async () => {
  vi.stubGlobal(
    'fetch',
    reply({ pages: [{ title: 'Squid', description: null }, { title: 'Squid game', description: 'TV series' }] }),
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
          continue: { plcontinue: 'x', continue: '||' },
          query: { pages: [{ title: 'Octopus', links: [{ title: 'Squid' }] }] },
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ query: { pages: [{ title: 'Octopus', links: [{ title: 'Ink' }] }] } })),
    )
  vi.stubGlobal('fetch', fetchMock)
  expect(await fetchLinks('Octopus')).toEqual(['Squid', 'Ink'])
  expect(String(fetchMock.mock.calls[1]?.[0])).toContain('plcontinue=x')
})

it('asks which articles link to a target in batches of 50 and keeps the given order', async () => {
  const titles = Array.from({ length: 120 }, (_, i) => `T${i}`)
  const fetchMock = vi.fn(async (url: string) => {
    const asked = new URL(url).searchParams.get('titles')?.split('|') ?? []
    const pages = asked.map((title) => ({ title, ...(title === 'T7' || title === 'T100' ? { links: [{ title: 'Goal' }] } : {}) }))
    return new Response(JSON.stringify({ query: { pages } }))
  })
  vi.stubGlobal('fetch', fetchMock)
  const progress: number[] = []
  expect(await fetchLinkers(titles, 'Goal', undefined, (n) => progress.push(n))).toEqual(['T7', 'T100'])
  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(Math.max(...progress)).toBe(120)
})
