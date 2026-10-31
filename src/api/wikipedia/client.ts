import { z } from 'zod'
import { rankNeighbors } from '@/domain/ranking'
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

export async function fetchRelated(id: string, signal?: AbortSignal): Promise<Neighbor[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: `morelike:${id}`,
    srnamespace: '0',
    srlimit: '9',
    format: 'json',
    origin: '*',
  })
  const data = parse(searchSchema, await getJson(`${ACTION}?${params}`, signal))
  return rankNeighbors(
    (data.query?.search ?? []).map((r) => r.title),
    id,
  )
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
