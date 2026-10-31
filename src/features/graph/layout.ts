import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force'
import type { Neighbor, Strength } from '@/domain/types'

export type NodeState = 'current' | 'visited' | 'discoverable'
export type GraphNode = { id: string; state: NodeState; r: number; x: number; y: number }
export type GraphEdge = { source: string; target: string; kind: 'trail' | 'path' }

/** Canvas geometry. `maxX` keeps right-hand labels clear of the reading panel / bottom sheet. */
export type View = {
  w: number
  h: number
  cx: number
  cy: number
  ring: number
  maxX: number
  maxNeighbors: number
  maxVisited: number
  /** Fixed spots (offset from the current node) for visited steps, newest first. Omit to let the forces place them. */
  slots?: { dx: number; dy: number }[]
}
export const VIEWS = {
  // Visited steps zigzag leftwards so their labels never overlap.
  wide: {
    w: 1000,
    h: 600,
    cx: 300,
    cy: 300,
    ring: 170,
    maxX: 480,
    maxNeighbors: 9,
    maxVisited: 3,
    slots: [
      { dx: -110, dy: 10 },
      { dx: -170, dy: 95 },
      { dx: -230, dy: -70 },
    ],
  },
  // Portrait: graph sits in the top half, above the bottom sheet.
  compact: {
    w: 400,
    h: 600,
    cx: 110,
    cy: 250,
    ring: 100,
    maxX: 210,
    maxNeighbors: 5,
    maxVisited: 2,
    slots: [
      { dx: -60, dy: -75 },
      { dx: -60, dy: -150 },
    ],
  },
} satisfies Record<string, View>
export const VIEW = VIEWS.wide
const RADIUS: Record<Strength, number> = { strong: 9, related: 7, surprising: 5 }

type SimNode = SimulationNodeDatum & GraphNode

/** Static layout: relax a force simulation for a fixed number of ticks, outside React. */
export function layoutGraph(
  current: string,
  trail: string[],
  allNeighbors: Neighbor[],
  view: View = VIEWS.wide,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const { h, cx, cy, ring, maxX, maxNeighbors, maxVisited, slots } = view
  const neighbors = allNeighbors.slice(0, maxNeighbors)
  const chain = trail.at(-1) === current ? trail : [...trail, current]
  const recent = chain.slice(-(maxVisited + 1))

  const nodes = new Map<string, SimNode>()
  nodes.set(current, { id: current, state: 'current', r: 12, x: cx, y: cy, fx: cx, fy: cy })

  const visited = [...new Set(recent)].filter((id) => id !== current)
  visited.forEach((id, i) => {
    const slot = slots?.[visited.length - 1 - i] // newest visited step takes slot 0
    const x = slot ? cx + slot.dx : cx - 130 * (visited.length - i)
    const y = slot ? cy + slot.dy : cy + (i % 2 ? -60 : 60)
    nodes.set(id, { id, state: 'visited', r: 7, x, y, ...(slot && { fx: x, fy: y }) })
  })

  // Neighbours sit on an arc at even vertical spacing, so their labels never overlap.
  // Best matches go in the middle (i = 0), weaker ones alternate outwards, up then down.
  const gap = Math.min(40, (ring * 0.94) / Math.max((neighbors.length - 1) / 2, 1))
  neighbors.forEach((n, i) => {
    if (nodes.has(n.id)) return
    const dy = (i % 2 ? -(i + 1) / 2 : i / 2) * gap
    const x = cx + Math.sqrt(Math.max(ring * ring - dy * dy, 0))
    const y = cy + dy
    nodes.set(n.id, { id: n.id, state: 'discoverable', r: RADIUS[n.strength], x, y, fx: x, fy: y })
  })

  const edges: GraphEdge[] = []
  recent.forEach((id, i) => {
    const next = recent[i + 1]
    if (next && next !== id) edges.push({ source: id, target: next, kind: 'trail' })
  })
  neighbors.forEach((n) => edges.push({ source: current, target: n.id, kind: 'path' }))

  const simNodes = [...nodes.values()]
  const sim = forceSimulation(simNodes)
    .force(
      'link',
      forceLink<SimNode, { source: string; target: string }>(
        edges.map((e) => ({ source: e.source, target: e.target })),
      )
        .id((d) => d.id)
        .distance(160),
    )
    .force('charge', forceManyBody().strength(-320))
    .force(
      'collide',
      forceCollide<SimNode>((d) => (d.state === 'visited' ? 70 : d.r + 40)),
    )
    .force(
      'x',
      forceX<SimNode>((d) => (d.state === 'visited' ? cx - ring * 1.5 : cx + ring * 0.9)).strength(
        0.04,
      ),
    )
    .force('y', forceY(cy).strength(0.03))
    .stop()
  for (let i = 0; i < 300; i++) sim.tick()

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
  return {
    nodes: simNodes.map((d) => ({
      id: d.id,
      state: d.state,
      r: d.r,
      x: clamp(d.x ?? cx, 50, maxX),
      y: clamp(d.y ?? cy, 50, h - 90),
    })),
    edges,
  }
}
