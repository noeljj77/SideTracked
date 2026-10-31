import { z } from 'zod'
import { KIND_CLASSES, pickKind, type Kind } from '@/domain/kind'
import { getJson, parse } from '../http'

const ACTION = 'https://en.wikipedia.org/w/api.php'
const SPARQL = 'https://query.wikidata.org/sparql'

const pagesSchema = z.object({
  query: z.object({
    normalized: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
    redirects: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
    pages: z.record(
      z.string(),
      z.object({
        title: z.string(),
        pageprops: z.object({ wikibase_item: z.string().optional() }).optional(),
      }),
    ),
  }),
})

const sparqlSchema = z.object({
  results: z.object({
    bindings: z.array(z.object({ item: z.object({ value: z.string() }), cls: z.object({ value: z.string() }) })),
  }),
})

const lastSegment = (uri: string) => uri.split('/').pop() ?? uri

/**
 * Kind of each Wikipedia title, in two requests: titles -> Wikidata ids (Wikipedia API),
 * then ids -> matching classes incl. subclasses (one SPARQL query). Unknown titles are "thing".
 */
export async function fetchKinds(titles: string[], signal?: AbortSignal): Promise<Record<string, Kind>> {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'pageprops',
    ppprop: 'wikibase_item',
    titles: titles.join('|'),
    redirects: '1',
    format: 'json',
    origin: '*',
  })
  const { query } = parse(pagesSchema, await getJson(`${ACTION}?${params}`, signal))

  // A title may be normalised and then redirected; follow both hops.
  const moved = new Map([...(query.normalized ?? []), ...(query.redirects ?? [])].map((m) => [m.from, m.to]))
  const resolve = (t: string) => moved.get(moved.get(t) ?? t) ?? moved.get(t) ?? t

  const qidByTitle = new Map<string, string>()
  for (const p of Object.values(query.pages)) {
    if (p.pageprops?.wikibase_item) qidByTitle.set(p.title, p.pageprops.wikibase_item)
  }

  const ids = [...new Set(qidByTitle.values())]
  const classesOf = new Map<string, Set<string>>()
  if (ids.length > 0) {
    const classes = Object.values(KIND_CLASSES).flat()
    const sparql =
      `SELECT ?item ?cls WHERE { VALUES ?item { ${ids.map((i) => `wd:${i}`).join(' ')} } ` +
      `VALUES ?cls { ${classes.map((c) => `wd:${c}`).join(' ')} } ?item wdt:P31/wdt:P279* ?cls }`
    const data = parse(
      sparqlSchema,
      await getJson(`${SPARQL}?${new URLSearchParams({ format: 'json', query: sparql })}`, signal),
    )
    for (const b of data.results.bindings) {
      const id = lastSegment(b.item.value)
      classesOf.set(id, (classesOf.get(id) ?? new Set()).add(lastSegment(b.cls.value)))
    }
  }

  return Object.fromEntries(
    titles.map((t) => {
      const qid = qidByTitle.get(resolve(t))
      return [t, qid ? pickKind(classesOf.get(qid) ?? []) : 'thing']
    }),
  )
}
