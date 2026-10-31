import { layoutGraph, VIEW, VIEWS } from './layout'

it('pins the current node, keeps every node in bounds, and shows visited steps once', () => {
  const { nodes, edges } = layoutGraph(
    'C',
    ['A', 'B', 'C'],
    [
      { id: 'A', strength: 'strong', why: 'similar' },
      { id: 'X', strength: 'strong', why: 'similar' },
      { id: 'Y', strength: 'surprising', why: 'tangent' },
    ],
  )
  expect(nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C', 'X', 'Y'])
  expect(nodes.find((n) => n.id === 'C')).toMatchObject({ x: VIEW.cx, y: VIEW.cy })
  expect(nodes.find((n) => n.id === 'A')?.state).toBe('visited')
  expect(nodes.every((n) => Number.isFinite(n.x) && n.x >= 50 && n.x <= VIEW.w)).toBe(true)
  expect(edges.filter((e) => e.kind === 'trail')).toHaveLength(2)
})

it('compact view caps neighbours and keeps labels clear of the bottom sheet', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({
    id: `N${i}`,
    strength: 'strong' as const,
    why: 'similar' as const,
  }))
  const { nodes } = layoutGraph('C', ['C'], many, VIEWS.compact)
  expect(nodes.filter((n) => n.state === 'discoverable')).toHaveLength(5)
  expect(nodes.every((n) => n.x <= VIEWS.compact.maxX)).toBe(true)
})

it('spaces neighbours evenly so labels cannot overlap, best matches in the middle', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({
    id: `N${i}`,
    strength: 'strong' as const,
    why: 'similar' as const,
  }))
  const { nodes } = layoutGraph('C', ['C'], many)
  const ys = nodes
    .filter((n) => n.state === 'discoverable')
    .map((n) => n.y)
    .sort((a, b) => a - b)
  expect(ys.slice(1).every((y, i) => y - ys[i]! >= 30)).toBe(true)
  expect(nodes.find((n) => n.id === 'N0')?.y).toBe(VIEW.cy)
})
