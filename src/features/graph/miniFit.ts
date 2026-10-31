import type { Pt } from '@/domain/types'

export type MiniFit = {
  /** Minimap pixels per world unit. */
  s: number
  toMini: (p: Pt) => Pt
  toWorld: (p: Pt) => Pt
}

const MAX_SCALE = 0.25 // a journey of one or two steps must not blow up to fill the map

/** Fit world points into a w × h minimap, centred, with room around the edge. */
export function miniFit(points: Pt[], w: number, h: number, pad = 12): MiniFit {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const [x0, x1] = [Math.min(...xs, 0), Math.max(...xs, 0)]
  const [y0, y1] = [Math.min(...ys, 0), Math.max(...ys, 0)]
  const s = Math.min(
    (w - pad * 2) / Math.max(x1 - x0, 1),
    (h - pad * 2) / Math.max(y1 - y0, 1),
    MAX_SCALE,
  )
  const ox = (w - (x1 - x0) * s) / 2 - x0 * s
  const oy = (h - (y1 - y0) * s) / 2 - y0 * s
  return {
    s,
    toMini: (p) => ({ x: p.x * s + ox, y: p.y * s + oy }),
    toWorld: (p) => ({ x: (p.x - ox) / s, y: (p.y - oy) / s }),
  }
}
