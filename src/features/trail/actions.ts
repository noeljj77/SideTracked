import { useSavedTrails } from '@/stores/savedTrailsStore'
import { useTrail } from '@/stores/trailStore'

/** Keep the current trail in the saved list (no-op if it is one topic or already saved). */
export function archiveCurrent() {
  useSavedTrails.getState().save(useTrail.getState().steps)
}

export function startFresh() {
  archiveCurrent()
  useTrail.getState().set([])
}

export function openTrail(steps: string[]) {
  archiveCurrent()
  useTrail.getState().set(steps)
}
