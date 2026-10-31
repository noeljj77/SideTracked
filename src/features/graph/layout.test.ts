import type { Neighbor } from '@/domain/types'
import { fitAll, layoutGraph, starfield, VIEW, VIEWS } from './layout'

const near = (ids: string[]): Neighbor[] =>
  ids.map((id) => ({ id, strength: 'strong', why: 'similar' }))

it('shows every step of the journey once, with the current topic and its neighbours ahead of it', () => {
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
  expect(nodes.find((n) => n.id === 'A')?.state).toBe('visited')
  expect(edges.filter((e) => e.kind === 'trail')).toHaveLength(2)
  const here = nodes.find((n) => n.id === 'C')
  expect(nodes.filter((n) => n.state === 'discoverable').every((n) => n.x > (here?.x ?? 0))).toBe(
    true,
  )
})

it('keeps a long trail on the map instead of forgetting all but the last few steps', () => {
  const trail = Array.from({ length: 12 }, (_, i) => `T${i}`)
  const { nodes } = layoutGraph('T11', trail, [])
  expect(nodes.filter((n) => n.state === 'visited')).toHaveLength(11)
  const spots = nodes.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`)
  expect(new Set(spots).size).toBe(12)
})

it('never moves a step that was already placed when the journey grows', () => {
  const before = layoutGraph('C', ['A', 'B', 'C'], near(['D']))
  const after = layoutGraph('D', ['A', 'B', 'C', 'D'], near(['E']), VIEWS.wide, before.world)
  for (const id of ['A', 'B', 'C', 'D']) {
    expect(after.world.get(id)).toEqual(before.world.get(id))
  }
})

it('is the same picture every time for the same trail', () => {
  const trail = ['A', 'B', 'C', 'D']
  expect(layoutGraph('D', trail, near(['E', 'F']))).toEqual(
    layoutGraph('D', trail, near(['E', 'F'])),
  )
})

it('rests the camera on the current topic, pulling back only to keep the previous step in view', () => {
  const { nodes, home } = layoutGraph('C', ['A', 'B', 'C'], [])
  const here = nodes.find((n) => n.id === 'C')
  expect(here && here.x * home.k + home.x).toBeCloseTo(VIEW.cx)
  expect(here && here.y * home.k + home.y).toBeCloseTo(VIEW.cy)
  expect(home.k).toBeLessThanOrEqual(1)
  expect(home.k).toBeGreaterThanOrEqual(0.75)
})

it('compact view caps neighbours', () => {
  const { nodes } = layoutGraph(
    'C',
    ['C'],
    near(Array.from({ length: 9 }, (_, i) => `N${i}`)),
    VIEWS.compact,
  )
  expect(nodes.filter((n) => n.state === 'discoverable')).toHaveLength(5)
})

it('spaces neighbours evenly so labels cannot overlap, best matches in the middle', () => {
  const { nodes } = layoutGraph('C', ['C'], near(Array.from({ length: 9 }, (_, i) => `N${i}`)))
  const ys = nodes
    .filter((n) => n.state === 'discoverable')
    .map((n) => n.y)
    .sort((a, b) => a - b)
  expect(ys.slice(1).every((y, i) => y - (ys[i] ?? 0) >= 30)).toBe(true)
  expect(nodes.find((n) => n.id === 'N0')?.y).toBe(nodes.find((n) => n.id === 'C')?.y)
})

it('fits the whole journey on screen', () => {
  const trail = Array.from({ length: 30 }, (_, i) => `T${i}`)
  const { nodes } = layoutGraph('T29', trail, [])
  const cam = fitAll(VIEW, nodes)
  expect(cam.k).toBeLessThan(0.5)
  for (const n of nodes) {
    const [x, y] = [n.x * cam.k + cam.x, n.y * cam.k + cam.y]
    expect(x).toBeGreaterThanOrEqual(VIEW.room.left)
    expect(x).toBeLessThanOrEqual(VIEW.room.right)
    expect(y).toBeGreaterThanOrEqual(VIEW.room.top)
    expect(y).toBeLessThanOrEqual(VIEW.room.bottom)
  }
})

it('keeps the same stars in place as the sky grows', () => {
  const small = starfield([{ x: 0, y: 0 }])
  const wide = starfield([
    { x: 0, y: 0 },
    { x: 2000, y: 300 },
  ])
  expect(small.length).toBeGreaterThan(0)
  const key = (p: { x: number; y: number }) => `${p.x},${p.y}`
  const have = new Set(wide.map(key))
  expect(small.every((p) => have.has(key(p)))).toBe(true)
})
