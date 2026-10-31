import type { Neighbor } from './types'

/** Search results arrive best-first: top 3 are strong, next 3 related, the rest surprising. */
export function rankNeighbors(titles: string[], self: string): Neighbor[] {
  const seen = new Set([self])
  const unique = titles.filter((t) => !seen.has(t) && !!seen.add(t))
  return unique.map((id, i) => ({
    id,
    strength: i < 3 ? 'strong' : i < 6 ? 'related' : 'surprising',
  }))
}
