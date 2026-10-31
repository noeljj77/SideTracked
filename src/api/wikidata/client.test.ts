import { fetchKinds } from './client'

const pages = {
  query: {
    normalized: [{ from: 'albert einstein', to: 'Albert Einstein' }],
    redirects: [{ from: 'Moss piglet', to: 'Tardigrade' }],
    pages: {
      '1': { title: 'Albert Einstein', pageprops: { wikibase_item: 'Q937' } },
      '2': { title: 'Tardigrade', pageprops: { wikibase_item: 'Q5194' } },
      '3': { title: 'Paris', pageprops: { wikibase_item: 'Q90' } },
      '-1': { title: 'No such page' },
    },
  },
}
const bindings = [
  { item: { value: 'http://www.wikidata.org/entity/Q937' }, cls: { value: 'http://www.wikidata.org/entity/Q5' } },
  { item: { value: 'http://www.wikidata.org/entity/Q90' }, cls: { value: 'http://www.wikidata.org/entity/Q486972' } },
]

afterEach(() => vi.unstubAllGlobals())

const stub = (sparql: unknown = { results: { bindings } }, sparqlStatus = 200) =>
  vi.fn(async (url: string) =>
    url.includes('query.wikidata.org')
      ? new Response(JSON.stringify(sparql), { status: sparqlStatus })
      : new Response(JSON.stringify(pages)),
  )

it('follows normalisation and redirects and picks a kind per title', async () => {
  vi.stubGlobal('fetch', stub())
  expect(await fetchKinds(['albert einstein', 'Moss piglet', 'Paris', 'No such page'])).toEqual({
    'albert einstein': 'person',
    'Moss piglet': 'thing',
    Paris: 'place',
    'No such page': 'thing',
  })
})

it('skips the Wikidata query when no title has an item', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ query: { pages: { '-1': { title: 'X' } } } })))
  vi.stubGlobal('fetch', fetchMock)
  expect(await fetchKinds(['X'])).toEqual({ X: 'thing' })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('reports a failing SPARQL service as an ApiError', async () => {
  vi.stubGlobal('fetch', stub({}, 500))
  await expect(fetchKinds(['Paris'])).rejects.toMatchObject({ kind: 'Network' })
})
