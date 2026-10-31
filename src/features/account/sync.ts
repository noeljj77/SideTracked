import { mergeTrails, type TrailsRepo } from '@/domain/trails'
import { useSavedTrails } from '@/stores/savedTrailsStore'

type Store = Pick<typeof useSavedTrails, 'getState' | 'setState' | 'subscribe'>

/**
 * Keep the saved-trails store and the signed-in user's remote copy equal.
 * - First remote answer: merge this device's trails into the account, so nothing is lost on sign-in.
 *   Unless they were last synced with another account: then they are replaced, so accounts never see each other's trails.
 * - After that the remote list is the truth: other devices' changes appear here.
 * - Local saves and deletes are pushed; `known` is what the remote already has, which stops echo writes.
 * Returns a function that stops syncing.
 */
export function startSync(
  uid: string,
  repo: TrailsRepo,
  onError: (err: unknown) => void,
  store: Store = useSavedTrails,
): () => void {
  let known = new Map<string, unknown>()
  let ready = false

  // Listen to local changes first: the remote may answer immediately, and the merge it triggers must be pushed.
  const stopStore = store.subscribe((state) => {
    if (!ready) return
    const next = new Map(state.trails.map((t) => [t.id, t]))
    for (const [id, trail] of next) {
      if (known.has(id)) continue
      known.set(id, trail)
      repo.upsert(uid, trail).catch(onError)
    }
    for (const id of [...known.keys()]) {
      if (next.has(id)) continue
      known.delete(id)
      repo.remove(uid, id).catch(onError)
    }
  })

  const stopRepo = repo.subscribe(
    uid,
    (remote) => {
      known = new Map(remote.map((t) => [t.id, t]))
      // Trails left behind by a different account are not ours to upload: the new account starts from its own copy.
      const { owner, trails: local } = store.getState()
      const foreign = owner !== null && owner !== uid
      const trails =
        ready || foreign
          ? [...remote].sort((a, b) => b.savedAt - a.savedAt)
          : mergeTrails(local, remote)
      ready = true
      store.setState({ trails, owner: uid })
    },
    onError,
  )

  return () => {
    stopRepo()
    stopStore()
  }
}
