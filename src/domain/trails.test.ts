import { mergeTrails, MAX_SAVED, type SavedTrail } from './trails'

const t = (id: string, steps: string[], savedAt: number): SavedTrail => ({ id, steps, savedAt })

it('keeps trails from both sides, newest first', () => {
  const merged = mergeTrails([t('l1', ['A', 'B'], 1)], [t('r1', ['C', 'D'], 2)])
  expect(merged.map((x) => x.id)).toEqual(['r1', 'l1'])
})

it('counts identical steps once and keeps the remote copy', () => {
  const merged = mergeTrails([t('local', ['A', 'B'], 5)], [t('remote', ['A', 'B'], 1)])
  expect(merged).toEqual([t('remote', ['A', 'B'], 1)])
})

it('caps the list', () => {
  const many = Array.from({ length: MAX_SAVED + 5 }, (_, i) => t(`id${i}`, ['A', `B${i}`], i))
  expect(mergeTrails(many, [])).toHaveLength(MAX_SAVED)
})
