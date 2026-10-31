import { forceCollide, forceSimulation, type SimulationNodeDatum } from 'd3-force'

export type MapNode = { id: string; x: number; y: number; first: number; last: number }
export type MapEdge = { source: string; target: string }
export type MapLayout = {
  nodes: MapNode[]
  edges: MapEdge[]
  /** Faint background dots, fixed for a given box. */
  stars: { x: number; y: number }[]
  /** The svg viewBox that fits every node and its label. */
  box: { x: number; y: number; w: number; h: number }
}

const STEP = 130
const PAD = 120

/** A stable number in [0, 1) for a title, so the same trail always draws the same shape. */
function unit(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10000) / 10000
}

type Sim = SimulationNodeDatum & { id: string }

/**
 * Lay a whole trail out as a constellation. Each topic appears once, however often it was visited,
 * so going back to somewhere closes a loop. The path wanders by a turn taken from each title, then
 * a short simulation only nudges overlaps apart. No randomness: the same trail is always the same picture.
 */
export function layoutTrailMap(steps: string[]): MapLayout {
  const order = [...new Set(steps)]

  const edgeKeys = new Set<string>()
  const edges: MapEdge[] = []
  steps.forEach((id, i) => {
    const next = steps[i + 1]
    if (next === undefined || next === id) return
    const key = [id, next].sort().join('\n')
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    edges.push({ source: id, target: next })
  })

  let angle = 0
  let x = 0
  let y = 0
  const sim: Sim[] = order.map((id, i) => {
    if (i) {
      angle += (unit(id) - 0.5) * 3.2
      x += STEP * Math.cos(angle)
      y += STEP * Math.sin(angle)
    }
    return { id, x, y }
  })

  // Only nudge overlaps apart: the wandering path is the shape.
  const run = forceSimulation(sim).force('collide', forceCollide(46)).stop()
  for (let i = 0; i < 60; i++) run.tick()

  const nodes = sim.map((d) => ({
    id: d.id,
    x: d.x ?? 0,
    y: d.y ?? 0,
    first: steps.indexOf(d.id),
    last: steps.lastIndexOf(d.id),
  }))
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const left = Math.min(...xs, 0) - PAD
  const top = Math.min(...ys, 0) - PAD
  const box = {
    x: left,
    y: top,
    w: Math.max(...xs, 0) + PAD - left,
    h: Math.max(...ys, 0) + PAD - top,
  }
  const stars = Array.from({ length: 48 }, (_, i) => ({
    x: box.x + unit(`star-x${i}`) * box.w,
    y: box.y + unit(`star-y${i}`) * box.h,
  }))
  return { nodes, edges, stars, box }
}
