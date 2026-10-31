import { create } from 'zustand'
import type { Pt } from '@/domain/types'

type WorldState = {
  /** Where each topic of the last graph drawn sits, so a neighbour you pick stays put when it becomes the current topic. */
  pos: ReadonlyMap<string, Pt>
  remember: (pos: ReadonlyMap<string, Pt>) => void
}

/** Not persisted: after a reload the positions are worked out again from the trail. */
export const useWorld = create<WorldState>()((set) => ({
  pos: new Map(),
  remember: (pos) => set({ pos }),
}))
