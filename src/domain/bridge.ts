/**
 * A bridge between two articles. `via` are topics that sit between them: the first article links to the
 * topic and the topic links to the second (or the other way round), best first. `direct` means the
 * two articles link to each other.
 */
export type Bridge = { from: string; to: string; direct: boolean; via: string[] }

// Citation plumbing and catch-all pages that link everywhere and say nothing about a topic.
const BOILERPLATE =
  /\((identifier|disambiguation)\)$|^(Wayback Machine|The Guardian|The New York Times|Cambridge University Press|Oxford University Press|Routledge|Springer|Wiley)$|^List of /
const YEAR = /^\d{1,4}( BC)?$/

/** True for links that connect nearly every article and so make poor stepping stones. */
export const isBoilerplate = (title: string) => BOILERPLATE.test(title) || YEAR.test(title)

/**
 * Order the topics found between two articles. Ones both articles mention come first,
 * since they are the most likely to be something the two really share. Otherwise the order is kept.
 */
export function rankMeetingPoints(found: string[], linkedByA: string[], linkedByB: string[]): string[] {
  const a = new Set(linkedByA)
  const b = new Set(linkedByB)
  const both = (t: string) => a.has(t) && b.has(t)
  return [...found.filter(both), ...found.filter((t) => !both(t))]
}
