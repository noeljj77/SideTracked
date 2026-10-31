import type { SavedTrail, TrailsRepo } from '@/domain/trails'
import { useSavedTrails } from '@/stores/savedTrailsStore'
import { startSync } from './sync'

const t = (id: string, steps: string[], savedAt: number): SavedTrail => ({ id, steps, savedAt })

/** An in-memory stand-in for Firestore that pushes the full list to subscribers after every write. */
function fakeRepo(initial: SavedTrail[]) {
  const docs = new Map(initial.map((x) => [x.id, x]))
  let listener: ((trails: SavedTrail[]) => void) | undefined
  const emit = () => listener?.([...docs.values()])
  const repo: TrailsRepo = {
    subscribe: (_uid, cb) => {
      listener = cb
      cb([...docs.values()])
      return () => (listener = undefined)
    },
    upsert: vi.fn(async (_uid, trail) => {
      docs.set(trail.id, trail)
      emit()
    }),
    remove: vi.fn(async (_uid, id) => {
      docs.delete(id)
      emit()
    }),
  }
  return { repo, docs, emit }
}

// Every sync a test starts is stopped afterwards, so one test's subscription never reacts to the next test's store.
const running: (() => void)[] = []
const sync: typeof startSync = (...args) => {
  const stop = startSync(...args)
  running.push(stop)
  return stop
}

beforeEach(() => useSavedTrails.setState({ trails: [], owner: null }))
afterEach(() => running.splice(0).forEach((stop) => stop()))

it('on first sync merges this device into the account and uploads only the local extras', () => {
  useSavedTrails.setState({ trails: [t('l1', ['A', 'B'], 2), t('same-local', ['X', 'Y'], 1)] })
  const { repo, docs } = fakeRepo([t('r1', ['C', 'D'], 3), t('same-remote', ['X', 'Y'], 1)])

  sync('u1', repo, vi.fn())

  expect(useSavedTrails.getState().trails.map((x) => x.id)).toEqual(['r1', 'l1', 'same-remote'])
  expect(repo.upsert).toHaveBeenCalledTimes(1)
  expect(docs.has('l1')).toBe(true)
})

it("does not upload another account's trails, and keeps merging for the same account", () => {
  useSavedTrails.setState({ trails: [t('a1', ['A', 'B'], 2)], owner: 'u1' })
  const second = fakeRepo([t('r1', ['C', 'D'], 3)])

  sync('u2', second.repo, vi.fn())

  expect(useSavedTrails.getState().trails.map((x) => x.id)).toEqual(['r1'])
  expect(useSavedTrails.getState().owner).toBe('u2')
  expect(second.repo.upsert).not.toHaveBeenCalled()

  // The same account signing in again still merges what it saved while signed out.
  useSavedTrails.setState({ trails: [t('r1', ['C', 'D'], 3), t('l2', ['E', 'F'], 4)] })
  const again = fakeRepo([t('r1', ['C', 'D'], 3)])
  sync('u2', again.repo, vi.fn())
  expect(again.docs.has('l2')).toBe(true)
})

it('pushes new saves and deletes, and does not echo remote changes back', () => {
  const { repo, docs, emit } = fakeRepo([])
  sync('u1', repo, vi.fn())

  useSavedTrails.getState().save(['A', 'B'])
  const id = useSavedTrails.getState().trails[0]!.id
  expect(docs.has(id)).toBe(true)
  expect(repo.upsert).toHaveBeenCalledTimes(1)

  useSavedTrails.getState().remove(id)
  expect(docs.has(id)).toBe(false)
  expect(repo.remove).toHaveBeenCalledTimes(1)

  // Another device saves something: it shows up here without any write from this device.
  docs.set('other', t('other', ['P', 'Q'], 9))
  emit()
  expect(useSavedTrails.getState().trails.map((x) => x.id)).toEqual(['other'])
  expect(repo.upsert).toHaveBeenCalledTimes(1)
  expect(repo.remove).toHaveBeenCalledTimes(1)
})

it('stops syncing when asked, and reports write failures', async () => {
  const { repo } = fakeRepo([])
  const onError = vi.fn()
  vi.mocked(repo.upsert).mockRejectedValueOnce(new Error('offline'))
  const stop = sync('u1', repo, onError)

  useSavedTrails.getState().save(['A', 'B'])
  await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1))

  stop()
  useSavedTrails.getState().save(['C', 'D'])
  expect(repo.upsert).toHaveBeenCalledTimes(1)
})
