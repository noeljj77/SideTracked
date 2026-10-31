import { MAX_ZOOM, MIN_ZOOM, zoomAround } from './usePanZoom'

it('keeps the point under the cursor fixed while zooming', () => {
  const before = { k: 1, x: 40, y: -20 }
  const after = zoomAround(before, 2, 300, 200)
  // A point's screen position is x + k * p; the one under the cursor must not move.
  const p = { x: (300 - before.x) / before.k, y: (200 - before.y) / before.k }
  expect(after.x + after.k * p.x).toBeCloseTo(300)
  expect(after.y + after.k * p.y).toBeCloseTo(200)
  expect(after.k).toBe(2)
})

it('stops at the zoom limits', () => {
  expect(zoomAround({ k: 1, x: 0, y: 0 }, 100, 0, 0).k).toBe(MAX_ZOOM)
  expect(zoomAround({ k: 1, x: 0, y: 0 }, 0.001, 0, 0).k).toBe(MIN_ZOOM)
})
