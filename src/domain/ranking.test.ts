import { rankNeighbors } from './ranking'

it('ranks by order, drops self and duplicates', () => {
  const out = rankNeighbors(['Self', 'A', 'B', 'A', 'C', 'D', 'E', 'F', 'G'], 'Self')
  expect(out.map((n) => n.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
  expect(out.map((n) => n.strength)).toEqual([
    'strong',
    'strong',
    'strong',
    'related',
    'related',
    'related',
    'surprising',
  ])
})
