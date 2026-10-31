export type SavedTrail = { id: string; steps: string[]; savedAt: number }

export const MAX_SAVED = 30

export const stepsKey = (steps: string[]) => steps.join('\n')

/** Union of two trail lists. The same steps count once, and the remote copy (with its id) wins. Newest first. */
export function mergeTrails(local: SavedTrail[], remote: SavedTrail[]): SavedTrail[] {
  const byKey = new Map<string, SavedTrail>()
  for (const t of [...local, ...remote]) byKey.set(stepsKey(t.steps), t)
  return [...byKey.values()].sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_SAVED)
}

/** Where saved trails live for a signed-in user. Implemented by the Firebase client, faked in tests. */
export type TrailsRepo = {
  /** Calls back with the full list now and on every change. Returns an unsubscribe function. */
  subscribe: (
    uid: string,
    onTrails: (trails: SavedTrail[]) => void,
    onError: (err: unknown) => void,
  ) => () => void
  upsert: (uid: string, trail: SavedTrail) => Promise<void>
  remove: (uid: string, id: string) => Promise<void>
}
