export type Kind = 'person' | 'place' | 'event' | 'idea' | 'thing'

/**
 * Wikidata classes per kind. An item matches when it is an instance of one of these
 * or of any subclass. Anything unmatched is a "thing".
 */
export const KIND_CLASSES: Record<Exclude<Kind, 'thing'>, string[]> = {
  person: ['Q5'], // human
  event: ['Q1656682', 'Q1190554', 'Q198', 'Q178561', 'Q10931'], // event, occurrence, war, battle, revolution
  place: ['Q2221906', 'Q486972', 'Q6256', 'Q82794', 'Q618123'], // location, settlement, country, region, geographical feature
  idea: ['Q151885', 'Q17737', 'Q5891', 'Q11862829', 'Q2465832'], // concept, theory, philosophy, discipline, branch of science
}

// First match wins, so a person who is also a "concept" stays a person.
const ORDER = ['person', 'event', 'place', 'idea'] as const

export function pickKind(classIds: Iterable<string>): Kind {
  const have = new Set(classIds)
  return ORDER.find((k) => KIND_CLASSES[k].some((c) => have.has(c))) ?? 'thing'
}
