import { fetchRandomTitle, fetchRelated, fetchTopic, searchTitles } from './client'

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
