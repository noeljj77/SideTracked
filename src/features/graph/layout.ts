import { unit } from '@/domain/hash'
import type { Neighbor, Pt, Strength } from '@/domain/types'

export type NodeState = 'current' | 'visited' | 'discoverable'
/** `age` counts steps back from the current topic (0 for the current topic and its neighbours). */
export type GraphNode = {
  id: string
  state: NodeState
  r: number
  x: number
  y: number
  age: number
}
export type GraphEdge = { source: string; target: string; kind: 'trail' | 'path' }
export type Camera = { k: number; x: number; y: number }

/** Canvas geometry. The current topic sits at (cx, cy) whenever the camera is home. */
export type View = {
  w: number
  h: number
  cx: number
  cy: number
  /** Distance from the current topic to its neighbours. */
  ring: number
  maxNeighbors: number
  /** Where on screen the world may be seen (the rest is under the reading panel or bottom sheet). */
  room: { left: number; right: number; top: number; bottom: number }
}
export const VIEWS = {
  wide: {
    w: 1000,
    h: 600,
    cx: 300,
    cy: 300,
    ring: 170,
    maxNeighbors: 9,
    room: { left: 40, right: 640, top: 60, bottom: 530 },
  },
  // Portrait: the graph sits in the top half, above the bottom sheet.
  compact: {
    w: 400,
    h: 600,
    cx: 110,
    cy: 250,
    ring: 100,
    maxNeighbors: 5,
    room: { left: 20, right: 230, top: 50, bottom: 360 },
  },
} satisfies Record<string, View>
export const VIEW = VIEWS.wide

const RADIUS: Record<Strength, number> = { strong: 9, related: 7, surprising: 5 }
const STEP = 230 // distance from one step to the next along the journey
const CLEAR = 95 // nearest two topics may sit
const MAX_TRAIL = 80 // older steps live on in the trail map and the trail thread
const MIN_ZOOM = 0.75 // the camera never zooms out further than this to follow you, so labels stay readable

/** Where each topic of the trail sits. Ones already placed (`known`) stay exactly where they were. */
function placeTrail(chain: string[], known: ReadonlyMap<string, Pt>) {
  const at = new Map<string, Pt>()
  let before: Pt | undefined
  for (const id of chain) {
    let p = at.get(id) ?? known.get(id)
    if (!p) p = before ? stepFrom(before, id, at) : { x: 0, y: 0 }
    at.set(id, p)
    before = p
  }
  return at
}

/** One step onward, heading right with a turn taken from the title; swerves if that spot is taken. */
function stepFrom(from: Pt, id: string, at: ReadonlyMap<string, Pt>): Pt {
  const base = (unit(id) - 0.5) * 1.1
  for (let t = 0; t < 8; t++) {
    const a = base + (t % 2 ? 1 : -1) * Math.ceil(t / 2) * 0.55
    const p = { x: from.x + STEP * Math.cos(a), y: from.y + STEP * Math.sin(a) }
    if ([...at.values()].every((q) => Math.hypot(q.x - p.x, q.y - p.y) > CLEAR)) return p
  }
  return { x: from.x + STEP, y: from.y }
}

/**
 * The whole journey as one world. Steps you took keep their place (so the picture only ever grows),
 * the current topic's neighbours fan out on an arc ahead of it at even vertical spacing, so their labels
 * never overlap, best matches in the middle. `home` is where the camera rests: on the current topic, zoomed
 * out just far enough to keep the previous step in sight. `world` is every position drawn, for `known` next time.
 */
export function layoutGraph(
  current: string,
  trail: string[],
  allNeighbors: Neighbor[],
  view: View = VIEWS.wide,
  known: ReadonlyMap<string, Pt> = new Map(),
) {
  const { cx, cy, ring, maxNeighbors, room } = view
  const neighbors = allNeighbors.slice(0, maxNeighbors)
  const chain = (trail.at(-1) === current ? trail : [...trail, current]).slice(-MAX_TRAIL)
  const at = placeTrail(chain, known)
  const here = at.get(current) ?? { x: 0, y: 0 }

  const nodes = new Map<string, GraphNode>()
  const distinct = [...new Set(chain)]
  distinct.forEach((id, i) => {
    const p = at.get(id)
    if (!p) return
    const age = distinct.length - 1 - i
    nodes.set(
      id,
      id === current
        ? { id, state: 'current', r: 12, ...p, age: 0 }
        : { id, state: 'visited', r: 7, ...p, age },
    )
  })

  const gap = Math.min(40, (ring * 0.94) / Math.max((neighbors.length - 1) / 2, 1))
  neighbors.forEach((n, i) => {
    if (nodes.has(n.id)) return
    const dy = (i % 2 ? -(i + 1) / 2 : i / 2) * gap
    const x = here.x + Math.sqrt(Math.max(ring * ring - dy * dy, 0))
    nodes.set(n.id, {
      id: n.id,
      state: 'discoverable',
      r: RADIUS[n.strength],
      x,
      y: here.y + dy,
      age: 0,
    })
  })

  const edges: GraphEdge[] = []
  chain.forEach((id, i) => {
    const next = chain[i + 1]
    if (next && next !== id) edges.push({ source: id, target: next, kind: 'trail' })
  })
  neighbors.forEach((n) => edges.push({ source: current, target: n.id, kind: 'path' }))

  // Pull back only as far as needed to keep the previous step on screen.
  const behind = distinct
    .filter((id) => id !== current)
    .slice(-1)
    .map((id) => at.get(id))
  let k = 1
  for (const p of behind) {
    if (!p) continue
    k = Math.min(
      k,
      (cx - room.left) / Math.max(here.x - p.x, 1),
      (cy - room.top) / Math.max(Math.abs(here.y - p.y), 1),
    )
  }
  k = Math.max(MIN_ZOOM, k)
  const home: Camera = { k, x: cx - here.x * k, y: cy - here.y * k }

  const list = [...nodes.values()]
  return {
    nodes: list,
    edges,
    home,
    world: new Map(list.map((n) => [n.id, { x: n.x, y: n.y }])),
    stars: starfield(list),
  }
}

const CELL = 260

/**
 * Faint dots scattered across the world around the journey. Each grid cell decides for itself, so
 * the sky never shifts as the trail grows.
 */
export function starfield(nodes: Pt[]): Pt[] {
  if (!nodes.length) return []
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const [x0, x1] = [
    Math.floor((Math.min(...xs) - 600) / CELL),
    Math.ceil((Math.max(...xs) + 600) / CELL),
  ]
  const [y0, y1] = [
    Math.floor((Math.min(...ys) - 500) / CELL),
    Math.ceil((Math.max(...ys) + 500) / CELL),
  ]
  const out: Pt[] = []
  for (let gx = x0; gx < x1; gx++) {
    for (let gy = y0; gy < y1; gy++) {
      const key = `${gx},${gy}`
      if (unit(`s${key}`) < 0.45) continue
      out.push({ x: (gx + unit(`x${key}`)) * CELL, y: (gy + unit(`y${key}`)) * CELL })
    }
  }
  return out
}

/** A camera that shows every node at once, centred in the part of the screen the panel leaves free. */
export function fitAll(view: View, nodes: Pt[]): Camera {
  const { room } = view
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const [left, right] = [Math.min(...xs) - 90, Math.max(...xs) + 190] // labels run to the right
  const [top, bottom] = [Math.min(...ys) - 70, Math.max(...ys) + 70]
  const k = Math.min(
    1,
    (room.right - room.left) / (right - left),
    (room.bottom - room.top) / (bottom - top),
  )
  return {
    k,
    x: (room.left + room.right) / 2 - ((left + right) / 2) * k,
    y: (room.top + room.bottom) / 2 - ((top + bottom) / 2) * k,
  }
}
