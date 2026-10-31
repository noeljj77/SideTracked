/** A stable number in [0, 1) for a piece of text, so the same trail always draws the same shape. */
export function unit(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10000) / 10000
}
