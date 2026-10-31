import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchKinds } from './client'

const DAY = 24 * 60 * 60 * 1000

/** Kind per title. Keeps the previous answer while the next set loads, so glyphs don't blink. */
export const useKinds = (titles: string[]) => {
  const key = [...new Set(titles)].sort()
  return useQuery({
    queryKey: ['kinds', ...key],
    queryFn: ({ signal }) => fetchKinds(key, signal),
    staleTime: DAY,
    enabled: key.length > 0,
    placeholderData: keepPreviousData,
    retry: 1,
  })
}
