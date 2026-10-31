import { useSavedTrails } from './savedTrailsStore'

beforeEach(() => useSavedTrails.setState({ trails: [] }))

it('ignores one-topic trails and duplicates, newest first', () => {
  const { save } = useSavedTrails.getState()
  save(['A'])
  save(['A', 'B'])
  save(['A', 'B'])
  save(['C', 'D'])
  expect(useSavedTrails.getState().trails.map((t) => t.steps)).toEqual([
    ['C', 'D'],
    ['A', 'B'],
  ])
})

it('removes by id and caps the list at 30', () => {
  const { save } = useSavedTrails.getState()
  for (let i = 0; i < 35; i++) save(['A', `B${i}`])
  const { trails } = useSavedTrails.getState()
  expect(trails).toHaveLength(30)
  useSavedTrails.getState().remove(trails[0]!.id)
  expect(useSavedTrails.getState().trails).toHaveLength(29)
})
