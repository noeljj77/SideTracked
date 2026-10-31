import { layoutTrailMap } from './mapLayout'

it('draws each topic once and joins consecutive steps, a revisit closing a loop', () => {
  const { nodes, edges } = layoutTrailMap(['A', 'B', 'C', 'A', 'D'])
  expect(nodes.map((n) => n.id)).toEqual(['A', 'B', 'C', 'D'])
  expect(nodes.find((n) => n.id === 'A')).toMatchObject({ first: 0, last: 3 })
  expect(edges).toEqual([
    { source: 'A', target: 'B' },
    { source: 'B', target: 'C' },
    { source: 'C', target: 'A' },
    { source: 'A', target: 'D' },
  ])
})

it('is the same picture every time, and the box holds every node', () => {
  const steps = ['Octopus', 'Squid', 'Kraken', 'Ink', 'Aristotle']
  const one = layoutTrailMap(steps)
  expect(layoutTrailMap(steps)).toEqual(one)
  const { x, y, w, h } = one.box
  expect(one.nodes.every((n) => n.x > x && n.x < x + w && n.y > y && n.y < y + h)).toBe(true)
})

it('copes with an empty trail and keeps topics apart', () => {
  expect(layoutTrailMap([]).nodes).toEqual([])
  const { nodes } = layoutTrailMap(Array.from({ length: 30 }, (_, i) => `T${i}`))
  const close = nodes.some((a, i) =>
    nodes.slice(i + 1).some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 40),
  )
  expect(close).toBe(false)
})
