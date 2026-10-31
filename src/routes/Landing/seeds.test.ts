import { deal, SEEDS } from './seeds'

/** A tiny repeatable random source for tests. */
const counter = (start: number) => {
  let n = start
  return () => (n = (n * 9301 + 49297) % 233280) / 233280
}

it('has no repeated topics and a hook for every one', () => {
  expect(new Set(SEEDS.map((s) => s.topic)).size).toBe(SEEDS.length)
  expect(SEEDS.every((s) => s.hook.length > 8 && s.hook.length < 48)).toBe(true)
  expect(SEEDS.length).toBeGreaterThanOrEqual(30)
})

it('deals the requested number of different seeds', () => {
  const hand = deal(5, counter(1))
  expect(hand).toHaveLength(5)
  expect(new Set(hand.map((s) => s.topic)).size).toBe(5)
})

it('is repeatable for the same random source and varies between sources', () => {
  expect(deal(5, counter(7))).toEqual(deal(5, counter(7)))
  const hands = new Set(
    Array.from({ length: 8 }, (_, i) =>
      deal(5, counter(i + 1))
        .map((s) => s.topic)
        .join(),
    ),
  )
  expect(hands.size).toBeGreaterThan(4)
})

it('never re-deals what is already on show', () => {
  const first = deal(5, counter(3))
  const next = deal(5, counter(4), first)
  expect(next.some((s) => first.some((f) => f.topic === s.topic))).toBe(false)
})

it('gives every seed a chance to appear', () => {
  const seen = new Set<string>()
  for (let i = 1; i <= 400; i++) deal(5, counter(i)).forEach((s) => seen.add(s.topic))
  expect(seen.size).toBe(SEEDS.length)
})
