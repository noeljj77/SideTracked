import type { Pt } from './types'

/** A smooth curve through the points (Catmull-Rom turned into cubic segments). */
export function smooth(points: Pt[]): string {
  const [first, ...rest] = points
  if (!first) return ''
  let d = `M${first.x},${first.y}`
  rest.forEach((p, i) => {
    const before = points[i - 1] ?? first
    const from = points[i] ?? first
    const after = points[i + 2] ?? p
    d += ` C${from.x + (p.x - before.x) / 6},${from.y + (p.y - before.y) / 6} ${p.x - (after.x - from.x) / 6},${p.y - (after.y - from.y) / 6} ${p.x},${p.y}`
  })
  return d
}
