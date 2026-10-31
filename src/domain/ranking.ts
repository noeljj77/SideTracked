import { isBoilerplate } from './bridge'
import { notable } from './notable'
import type { Neighbor } from './types'

/** An article that links to the current topic and is linked from it, with its size in characters. */
export type Mutual = { id: string; length: number }

const SIMILAR = 50 // how deep into the similarity list we look
const CORE = 6
const TANGENTS = 3
const STRONG_RANK = 12 // top similar results that are also linked both ways count as strong

/**
 * Combine two signals. `similar` is text similarity, best first. `mutual` are articles that link to the
 * topic and are linked from it, which editors only do when the two really belong together.
 * Similar and mutual is the strongest sign. Mutual alone, ranked by `notable`, supplies the surprising tangents.
 * With no `mutual` (the lookup failed) the result falls back to similarity order alone.
 */
export function rankNeighbors(similar: string[], mutual: Mutual[], self: string): Neighbor[] {
  const seen = new Set([self])
  const ranked = similar.filter((t) => !seen.has(t) && !!seen.add(t))
  const linked = new Map(mutual.filter((m) => !isBoilerplate(m.id)).map((m) => [m.id, m.length]))

  const core = ranked
    .map((id, i) => ({
      id,
      i,
      both: linked.has(id),
      score: 0.6 * (1 - i / SIMILAR) + (linked.has(id) ? 0.4 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, CORE)
    .map(({ id, i, both }): Neighbor => ({
      id,
      strength: i < 3 || (both && i < STRONG_RANK) ? 'strong' : 'related',
      why: both ? 'both' : 'similar',
    }))

  const taken = new Set([self, ...ranked])
  const tangents = [...linked]
    .filter(([id]) => !taken.has(id))
    .sort((a, b) => notable(b[1]) - notable(a[1]) || a[0].localeCompare(b[0]))
    .slice(0, TANGENTS)
    .map(([id]): Neighbor => ({ id, strength: 'surprising', why: 'tangent' }))

  return [...core, ...tangents]
}
