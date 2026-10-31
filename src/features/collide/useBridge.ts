import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchLinkers, fetchLinks, fetchTopic } from '@/api/wikipedia/client'
import { isBoilerplate, rankMeetingPoints, type Bridge } from '@/domain/bridge'

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

export type Progress = { checked: number; total: number }

/**
 * Find topics between two articles. Fetch what each links to, then ask Wikipedia which of the
 * smaller list link on to the other end, so the answer is complete but costs only a few requests.
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
      const [linkedByA, linkedByB] = await Promise.all([fetchLinks(a, signal), fetchLinks(b, signal)])
      const usable = (links: string[]) => links.filter((t) => t !== a && t !== b && !isBoilerplate(t))
      const scanA = usable(linkedByA).length <= usable(linkedByB).length
      const candidates = usable(scanA ? linkedByA : linkedByB)
      const total = candidates.length
      const found = await fetchLinkers(candidates, scanA ? b : a, signal, (checked) =>
        setProgress({ checked, total }),
      )
      return {
        from: a,
        to: b,
        direct: linkedByA.includes(b) || linkedByB.includes(a),
        via: rankMeetingPoints(found, linkedByA, linkedByB),
      }
    },
  })
  return { ...query, progress }
}
