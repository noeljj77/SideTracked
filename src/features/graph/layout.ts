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

export const VIEW = { w: 1000, h: 600, cx: 300, cy: 300 }
const MAX_VISITED = 4
const RADIUS: Record<Strength, number> = { strong: 9, related: 7, surprising: 5 }

type SimNode = SimulationNodeDatum & GraphNode

/** Static layout: relax a force simulation for a fixed number of ticks, outside React. */
export function layoutGraph(
  current: string,
  trail: string[],
  neighbors: Neighbor[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const { w, h, cx, cy } = VIEW
  const chain = trail.at(-1) === current ? trail : [...trail, current]
  const recent = chain.slice(-(MAX_VISITED + 1))

  const nodes = new Map<string, SimNode>()
  nodes.set(current, { id: current, state: 'current', r: 12, x: cx, y: cy, fx: cx, fy: cy })

  const visited = [...new Set(recent)].filter((id) => id !== current)
  visited.forEach((id, i) =>
    nodes.set(id, {
      id,
      state: 'visited',
      r: 7,
      x: cx - 130 * (visited.length - i),
      y: cy + (i % 2 ? -60 : 60),
    }),
  )

  neighbors.forEach((n, i) => {
    if (nodes.has(n.id)) return
    const angle = ((-70 + (140 * i) / Math.max(neighbors.length - 1, 1)) * Math.PI) / 180
    nodes.set(n.id, {
      id: n.id,
      state: 'discoverable',
      r: RADIUS[n.strength],
      x: cx + Math.cos(angle) * 170,
      y: cy + Math.sin(angle) * 170,
    })
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
    .force('collide', forceCollide<SimNode>((d) => d.r + 40))
    .force('x', forceX<SimNode>((d) => (d.state === 'visited' ? cx - 250 : cx + 150)).strength(0.04))
    .force('y', forceY(cy).strength(0.03))
    .stop()
  for (let i = 0; i < 300; i++) sim.tick()

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
  return {
    nodes: simNodes.map((d) => ({
      id: d.id,
      state: d.state,
      r: d.r,
      x: clamp(d.x ?? cx, 50, w - 520),
      y: clamp(d.y ?? cy, 50, h - 90),
    })),
    edges,
  }
}
