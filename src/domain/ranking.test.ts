import { rankNeighbors } from './ranking'

const sim = ['Self', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

it('falls back to similarity order when nothing is known about links', () => {
  const out = rankNeighbors(sim, [], 'Self')
  expect(out.map((n) => n.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
  expect(out.map((n) => n.strength)).toEqual([
    'strong',
    'strong',
    'strong',
    'related',
    'related',
    'related',
  ])
})

it('lifts similar topics that are also linked both ways', () => {
  const out = rankNeighbors(sim, [{ id: 'H', length: 5000 }], 'Self')
  expect(out[0]).toEqual({ id: 'H', strength: 'strong', why: 'both' })
  expect(out.slice(1).every((n) => n.why === 'similar')).toBe(true)
})

it('adds notable linked-only topics as tangents, skipping boilerplate and generic giants', () => {
  const mutual = [
    { id: 'Stub', length: 900 },
    { id: 'Kraken', length: 120_000 },
    { id: 'United States', length: 600_000 },
    { id: 'Aristotle', length: 150_000 },
    { id: 'Wayback Machine', length: 120_000 },
    { id: 'Camouflage', length: 100_000 },
    { id: 'A', length: 80_000 }, // already similar: not a tangent
  ]
  const out = rankNeighbors(sim, mutual, 'Self')
  const tangents = out.filter((n) => n.why === 'tangent')
  expect(tangents.map((n) => n.id)).toEqual(['Kraken', 'Camouflage', 'Aristotle'])
  expect(tangents.every((n) => n.strength === 'surprising')).toBe(true)
})

it('never offers the topic itself or a duplicate', () => {
  const out = rankNeighbors(['Self', 'A', 'A'], [{ id: 'Self', length: 1 }], 'Self')
  expect(out.map((n) => n.id)).toEqual(['A'])
})
