import { smooth } from '@/domain/curve'
import { unit } from '@/domain/hash'

export const POSTER = { width: 1200, margin: 90, top: 320, bottom: 160, row: 240, noteH: 150 }

export type PosterNote = {
  title: string
  /** Position in the trail, from 0. */
  index: number
  /** Top-left corner before the tilt; the note hangs from its pin at the top middle. */
  x: number
  y: number
  w: number
  h: number
  tilt: number
}

export type PosterLayout = { width: number; height: number; notes: PosterNote[]; thread: string }

/**
 * Pins every step of a trail to a board, row by row, each row running the opposite way to the one above so the
 * red thread can pass through them in order without crossing back. The same trail always gives the same board.
 */
export function layoutPoster(steps: string[]): PosterLayout {
  const { width, margin, top, bottom, row, noteH } = POSTER
  const count = steps.length
  const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count))))
  const rows = Math.ceil(count / cols)
  const cell = (width - margin * 2) / cols
  const w = Math.min(300, cell - 36)

  const notes = steps.map((title, index): PosterNote => {
    const r = Math.floor(index / cols)
    const c = index % cols
    const col = r % 2 ? cols - 1 - c : c
    const cx = margin + cell * (col + 0.5) + (unit(`${title}x`) - 0.5) * 28
    return {
      title,
      index,
      x: cx - w / 2,
      y: top + r * row + (unit(`${title}y`) - 0.5) * 44,
      w,
      h: noteH,
      tilt: (unit(`${title}t`) - 0.5) * 6,
    }
  })

  const thread = smooth(notes.map((n) => ({ x: n.x + n.w / 2, y: n.y })))
  return { width, height: top + Math.max(rows, 1) * row + bottom, notes, thread }
}
