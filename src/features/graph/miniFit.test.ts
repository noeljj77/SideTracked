import { miniFit } from './miniFit'

const pts = [
  { x: -400, y: 50 },
  { x: 1800, y: 300 },
  { x: 700, y: -120 },
]

it('puts every point inside the minimap, and maps back to the same spot', () => {
  const fit = miniFit(pts, 180, 100)
  for (const p of pts) {
    const m = fit.toMini(p)
    expect(m.x).toBeGreaterThan(0)
    expect(m.x).toBeLessThan(180)
    expect(m.y).toBeGreaterThan(0)
    expect(m.y).toBeLessThan(100)
    const back = fit.toWorld(m)
    expect(back.x).toBeCloseTo(p.x)
    expect(back.y).toBeCloseTo(p.y)
  }
})

it('does not blow up a tiny journey to fill the map', () => {
  const fit = miniFit([{ x: 10, y: 10 }], 180, 100)
  expect(fit.s).toBeLessThanOrEqual(0.25)
  expect(Number.isFinite(fit.toMini({ x: 10, y: 10 }).x)).toBe(true)
})
