import { notable } from './notable'

/**
 * A bridge between two articles. Each `via` is the stones that sit between them, best first: one stone
 * when the first article links to it and it links to the second (or the other way round), two when
 * only a longer chain exists. `direct` means the two articles link to each other.
 */
export type Bridge = { from: string; to: string; direct: boolean; via: string[][] }

// Citation plumbing and catch-all pages that link everywhere and say nothing about a topic.
const BOILERPLATE =
  /\((identifier|disambiguation)\)$|^(Wayback Machine|The Guardian|The New York Times|Cambridge University Press|Oxford University Press|Routledge|Springer|Wiley)$|^(List|Outline) of /
const YEAR = /^\d{1,4}( BC)?$/

/** True for links that connect nearly every article and so make poor stepping stones. */
export const isBoilerplate = (title: string) => BOILERPLATE.test(title) || YEAR.test(title)

/**
 * Order the topics found between two articles. Ones both articles mention come first, since they are
 * the most likely to be something the two really share. Within each group, well-known articles
 * (by `size`) come before obscure ones; without sizes the order is kept.
 */
export function rankMeetingPoints(
  found: string[],
  linkedByA: string[],
  linkedByB: string[],
  size: (title: string) => number = () => 0,
): string[] {
  const a = new Set(linkedByA)
  const b = new Set(linkedByB)
  const both = (t: string) => a.has(t) && b.has(t)
  const byFame = (x: string, y: string) => notable(size(y)) - notable(size(x))
  return [...found.filter(both).sort(byFame), ...found.filter((t) => !both(t)).sort(byFame)]
}

/** Order two-stone chains [x, y] by how well known both stones are. */
export function rankChains(pairs: [string, string][], size: (title: string) => number): string[][] {
  const fame = ([x, y]: [string, string]) => notable(size(x)) + notable(size(y))
  return [...pairs].sort((p, q) => fame(q) - fame(p))
}
