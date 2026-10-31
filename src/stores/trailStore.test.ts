import { useTrail } from './trailStore'

beforeEach(() => useTrail.setState({ steps: [] }))

it('pushes new topics and ignores repeats', () => {
  const { visit } = useTrail.getState()
  visit('A')
  visit('A')
  visit('B')
  expect(useTrail.getState().steps).toEqual(['A', 'B'])
})

it('steps back when returning to the previous topic', () => {
  const { visit } = useTrail.getState()
  visit('A')
  visit('B')
  visit('A')
  expect(useTrail.getState().steps).toEqual(['A'])
})

it('rewinds to a chosen step', () => {
  const { visit, rewind } = useTrail.getState()
  ;['A', 'B', 'C', 'D'].forEach(visit)
  rewind(1)
  expect(useTrail.getState().steps).toEqual(['A', 'B'])
})
