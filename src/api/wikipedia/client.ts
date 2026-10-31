import { z } from 'zod'
import { rankNeighbors, type Mutual } from '@/domain/ranking'
import type { Neighbor, Topic } from '@/domain/types'
import { getJson as http, parse } from '../http'

const HEADERS = { 'Api-User-Agent': 'SideTracked/0.1 (https://github.com/noeljj77/SideTracked)' }
const REST = 'https://en.wikipedia.org/api/rest_v1'
const ACTION = 'https://en.wikipedia.org/w/api.php'

const summarySchema = z.object({
  title: z.string(),
  extract: z.string(),
  type: z.string(),
  thumbnail: z.object({ source: z.string() }).optional(),
  content_urls: z.object({ desktop: z.object({ page: z.string() }) }),
})

const searchSchema = z.object({
  query: z.object({ search: z.array(z.object({ title: z.string() })) }).optional(),
})

const titleSearchSchema = z.object({
  pages: z.array(z.object({ title: z.string(), description: z.string().nullish() })),
})

const getJson = (url: string, signal?: AbortSignal) => http(url, signal, HEADERS)

export async function fetchTopic(id: string, signal?: AbortSignal): Promise<Topic> {
  const data = parse(
    summarySchema,
    await getJson(`${REST}/page/summary/${encodeURIComponent(id)}`, signal),
  )
  return {
    id: data.title,
    title: data.title,
    summary: data.extract,
    thumbnail: data.thumbnail?.source,
    url: data.content_urls.desktop.page,
    disambiguation: data.type === 'disambiguation',
  }
}

/** Similar articles by text, best first. */
async function fetchSimilar(id: string, signal?: AbortSignal): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: `morelike:${id}`,
    srnamespace: '0',
    srlimit: '50',
    format: 'json',
    origin: '*',
  })
  const data = parse(searchSchema, await getJson(`${ACTION}?${params}`, signal))
  return (data.query?.search ?? []).map((r) => r.title)
}

/**
 * Combine text similarity with links that run both ways. The links half is optional: if it fails
 * the topic still gets neighbours from similarity alone.
 */
export async function fetchRelated(id: string, signal?: AbortSignal): Promise<Neighbor[]> {
  const [similar, mutual] = await Promise.all([
    fetchSimilar(id, signal),
    fetchMutual(id, signal).catch((err: unknown) => {
      if (signal?.aborted) throw err
      return []
    }),
  ])
  return rankNeighbors(similar, mutual, id)
}

const linksSchema = z.object({
  continue: z.record(z.string(), z.string()).optional(),
  query: z
    .object({
      pages: z.array(
        z.object({ title: z.string(), links: z.array(z.object({ title: z.string() })).optional() }),
      ),
    })
    .optional(),
})

const linksUrl = (params: Record<string, string>) =>
  `${ACTION}?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', ...params })}`

const mutualSchema = z.object({
  continue: z.record(z.string(), z.string()).optional(),
  query: z
    .object({
      pages: z.array(
        z.object({
          title: z.string(),
          length: z.number().optional(),
          links: z.array(z.object({ title: z.string() })).optional(),
        }),
      ),
    })
    .optional(),
})

// shortcut: only the first 1000 links (alphabetical) are checked to keep a step under ~2 s; upgrade if tangents of huge articles skew A to M.
const MUTUAL_PAGES = 2

/**
 * Articles this one links to that link straight back, with their size. One generator request walks
 * the outgoing links and keeps, for each, only a link to `id`, so an article costs 1 or 2 calls.
 */
export async function fetchMutual(id: string, signal?: AbortSignal): Promise<Mutual[]> {
  const found = new Map<string, Mutual & { back: boolean }>()
  let more: Record<string, string> = {}
  for (let i = 0; i < MUTUAL_PAGES; i++) {
    const data = parse(
      mutualSchema,
      await getJson(
        linksUrl({
          generator: 'links',
          titles: id,
          gplnamespace: '0',
          gpllimit: 'max',
          prop: 'links|info',
          pltitles: id,
          pllimit: 'max',
          ...more,
        }),
        signal,
      ),
    )
    for (const page of data.query?.pages ?? []) {
      const prev = found.get(page.title)
      found.set(page.title, {
        id: page.title,
        length: page.length ?? prev?.length ?? 0,
        back: !!page.links?.length || !!prev?.back,
      })
    }
    if (!data.continue) break
    more = data.continue
  }
  return [...found.values()]
    .filter((m) => m.back)
    .map(({ id: title, length }) => ({ id: title, length }))
}

const LINK_PAGES = 8 // 500 links per request: enough for the biggest articles
const BATCH = 50 // titles per request, the API's limit
const PARALLEL = 4 // polite to Wikipedia, and still quick

/** Every article this one links to (main namespace), following continuation. */
export async function fetchLinks(id: string, signal?: AbortSignal): Promise<string[]> {
  const out: string[] = []
  let more: Record<string, string> = {}
  for (let i = 0; i < LINK_PAGES; i++) {
    const data = parse(
      linksSchema,
      await getJson(
        linksUrl({
          prop: 'links',
          titles: id,
          pllimit: 'max',
          plnamespace: '0',
          redirects: '1',
          ...more,
        }),
        signal,
      ),
    )
    for (const page of data.query?.pages ?? []) out.push(...(page.links ?? []).map((l) => l.title))
    if (!data.continue) break
    more = data.continue
  }
  return out
}

/**
 * Which of `titles` link to `target`, in the order given. One request checks 50 articles, so even
 * a long list is a handful of calls. `onProgress` reports how many have been checked.
 */
export async function fetchLinkers(
  titles: string[],
  target: string,
  signal?: AbortSignal,
  onProgress?: (checked: number) => void,
): Promise<string[]> {
  const batches: string[][] = []
  for (let i = 0; i < titles.length; i += BATCH) batches.push(titles.slice(i, i + BATCH))
  const hits = new Set<string>()
  let next = 0
  let checked = 0
  const worker = async () => {
    for (let batch = batches[next++]; batch; batch = batches[next++]) {
      const data = parse(
        linksSchema,
        await getJson(
          linksUrl({ prop: 'links', titles: batch.join('|'), pltitles: target, pllimit: 'max' }),
          signal,
        ),
      )
      for (const page of data.query?.pages ?? []) if (page.links?.length) hits.add(page.title)
      checked += batch.length
      onProgress?.(checked)
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, batches.length) }, worker))
  return titles.filter((t) => hits.has(t))
}

export type TitleHit = { title: string; description?: string }

export async function searchTitles(q: string, signal?: AbortSignal): Promise<TitleHit[]> {
  const params = new URLSearchParams({ q, limit: '6' })
  const data = parse(
    titleSearchSchema,
    await getJson(`https://en.wikipedia.org/w/rest.php/v1/search/title?${params}`, signal),
  )
  return data.pages.map((p) => ({ title: p.title, description: p.description ?? undefined }))
}

export async function fetchRandomTitle(signal?: AbortSignal): Promise<string> {
  return parse(summarySchema, await getJson(`${REST}/page/random/summary`, signal)).title
}
