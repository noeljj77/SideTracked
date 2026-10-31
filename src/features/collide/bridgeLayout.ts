export type Pt = { x: number; y: number }
export type BridgeBox = { w: number; h: number; nodes: Pt[]; slots: Pt[] }

const WIDE = { w: 680, h: 260, cy: 130 }
const SLOT_X = [-210, -72, 72, 210]
const ROW = 110 // vertical gap between stones on a phone

/**
 * Where each stone of a bridge sits. Wide screens run the thread left to right with the middle stones
 * swaying above and below it, and offer 8 `slots` above and below for the other meeting points.
 * Phones stack the stones in a column and skip the slots (the chip list does that job).
 */
export function bridgeLayout(count: number, vertical = false): BridgeBox {
  const last = Math.max(count - 1, 1)
  if (vertical) {
    return {
      w: 340,
      h: 90 + last * ROW,
      nodes: Array.from({ length: count }, (_, i) => ({ x: 60, y: 45 + i * ROW })),
      slots: [],
    }
  }
  const { w, h, cy } = WIDE
  const nodes = Array.from({ length: count }, (_, i) => ({
    x: 70 + (i * 540) / last,
    y: i === 0 || i === count - 1 ? cy : cy + (i % 2 ? -18 : 18),
  }))
  const slots = Array.from({ length: 8 }, (_, j) => ({
    x: w / 2 + (SLOT_X[Math.floor(j / 2)] ?? 0),
    y: j % 2 ? 225 : 35,
  }))
  return { w, h, nodes, slots }
}
