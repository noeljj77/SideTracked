import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  fetchLinkers,
  fetchLinks,
  fetchLinksAmong,
  fetchMutual,
  fetchTopic,
} from '@/api/wikipedia/client'
import { isBoilerplate, rankChains, rankMeetingPoints, type Bridge } from '@/domain/bridge'

/** One of the two typed topics could not be found; says which, so the message can name it. */
export class Unresolved extends Error {
  constructor(
    readonly id: string,
    readonly reason: unknown,
  ) {
    super(id)
  }
}

async function canonical(id: string, signal: AbortSignal) {
  try {
    return (await fetchTopic(id, signal)).id
  } catch (reason) {
    throw new Unresolved(id, reason)
  }
}

/** `longer` is set while the search widens to chains of two stones. */
export type Progress = { checked: number; total: number; longer?: boolean }

const CHAIN_POOL = 100 // well-known links per end to test against each other: 4 requests
const CHAINS = 8

/**
 * Find topics between two articles. Fetch what each links to, then ask Wikipedia which of the
 * smaller list link on to the other end, so the answer is complete but costs only a few requests.
 * If no single stone exists, test the best-known links of each end against each other for chains of two.
 */
export function useBridge(from: string, to: string) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const query = useQuery({
    queryKey: ['bridge', from, to],
    enabled: !!from && !!to,
    staleTime: Infinity,
    retry: false, // a search is many requests; the user can press the button again
    queryFn: async ({ signal }): Promise<Bridge> => {
      setProgress(null)
      const [a, b] = await Promise.all([canonical(from, signal), canonical(to, signal)])
      if (a === b) return { from: a, to: b, direct: false, via: [] }
      const [linksA, linksB] = await Promise.all([fetchLinks(a, signal), fetchLinks(b, signal)])
      const linkedByA = linksA.map((l) => l.id)
      const linkedByB = linksB.map((l) => l.id)
      const sizes = new Map([...linksA, ...linksB].map((l) => [l.id, l.length]))
      const size = (t: string) => sizes.get(t) ?? 0
      const usable = (links: string[]) =>
        links.filter((t) => t !== a && t !== b && !isBoilerplate(t))
      const scanA = usable(linkedByA).length <= usable(linkedByB).length
      const candidates = usable(scanA ? linkedByA : linkedByB)
      const total = candidates.length
      const found = await fetchLinkers(candidates, scanA ? b : a, signal, (checked) =>
        setProgress({ checked, total }),
      )
      const direct = linkedByA.includes(b) || linkedByB.includes(a)
      const stones = rankMeetingPoints(found, linkedByA, linkedByB, size).map((t) => [t])
      if (stones.length || direct) return { from: a, to: b, direct, via: stones }

      setProgress({ checked: 0, total: 0, longer: true })
      // Only stones that link back to their end: citation hubs like news sites link everywhere but never back.
      const [mutualA, mutualB] = await Promise.all([fetchMutual(a, signal), fetchMutual(b, signal)])
      for (const m of [...mutualA, ...mutualB]) sizes.set(m.id, m.length)
      const best = (links: string[]) =>
        usable(links)
          .sort((x, y) => size(y) - size(x)) // big articles connect the most
          .slice(0, CHAIN_POOL)
      const xs = best(mutualA.map((m) => m.id))
      const ys = best(mutualB.map((m) => m.id)).filter((y) => !xs.includes(y))
      const pairs = (await fetchLinksAmong(xs, ys, signal)).filter(([x, y]) => x !== y)
      return { from: a, to: b, direct, via: rankChains(pairs, size).slice(0, CHAINS) }
    },
  })
  return { ...query, progress }
}
