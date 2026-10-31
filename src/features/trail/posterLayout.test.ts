import { layoutPoster, POSTER } from './posterLayout'

const trail = (n: number) => Array.from({ length: n }, (_, i) => `Topic ${i + 1}`)

it('gives every step a note, all inside the board', () => {
  const { notes, width, height } = layoutPoster(trail(11))
  expect(notes).toHaveLength(11)
  for (const n of notes) {
    expect(n.x).toBeGreaterThanOrEqual(0)
    expect(n.x + n.w).toBeLessThanOrEqual(width)
    expect(n.y + n.h).toBeLessThanOrEqual(height)
  }
})

it('runs each row the opposite way, so the thread never doubles back', () => {
  const { notes } = layoutPoster(trail(8)) // 3 columns: rows of 3, 3, 2
  const [a, b, c, d] = notes.map((n) => n.x)
  expect(a!).toBeLessThan(b!)
  expect(b!).toBeLessThan(c!)
  expect(d!).toBeGreaterThan(notes[4]!.x) // second row goes right to left
})

it('draws the same board for the same trail, and grows taller for a longer one', () => {
  expect(layoutPoster(trail(5))).toEqual(layoutPoster(trail(5)))
  expect(layoutPoster(trail(20)).height).toBeGreaterThan(layoutPoster(trail(4)).height)
  expect(layoutPoster(trail(4)).height).toBeGreaterThan(POSTER.top)
})

it('copes with a single step', () => {
  expect(layoutPoster(['Only']).notes).toHaveLength(1)
})
