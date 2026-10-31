import { bridgeLayout, smooth } from './bridgeLayout'

it('runs the stones left to right with the ends on one line and room for 8 alternatives', () => {
  const { nodes, slots, w } = bridgeLayout(4)
  expect(nodes.map((n) => n.x)).toEqual([...nodes.map((n) => n.x)].sort((a, b) => a - b))
  expect(nodes[0]?.y).toBe(nodes[3]?.y)
  expect(nodes[1]?.y).not.toBe(nodes[0]?.y)
  expect(slots).toHaveLength(8)
  expect(nodes.concat(slots).every((p) => p.x > 0 && p.x < w)).toBe(true)
})

it('stacks the stones in a column on a phone, with no alternatives in the graph', () => {
  const { nodes, slots, h } = bridgeLayout(3, true)
  expect(nodes.map((n) => n.y)).toEqual([45, 155, 265])
  expect(slots).toEqual([])
  expect(h).toBeGreaterThan(265)
})

it('draws a curve through every point, starting at the first', () => {
  const d = smooth([
    { x: 0, y: 0 },
    { x: 100, y: 20 },
    { x: 200, y: 0 },
  ])
  expect(d.startsWith('M0,0')).toBe(true)
  expect(d.match(/C/g)).toHaveLength(2)
  expect(d.endsWith('200,0')).toBe(true)
  expect(smooth([])).toBe('')
})
