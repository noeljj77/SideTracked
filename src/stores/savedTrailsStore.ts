import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MAX_SAVED, stepsKey, type SavedTrail } from '@/domain/trails'

export type { SavedTrail }

type SavedState = {
  trails: SavedTrail[]
  /** Ignores one-topic trails and exact duplicates. Newest first. */
  save: (steps: string[]) => void
  remove: (id: string) => void
}

export const useSavedTrails = create<SavedState>()(
  persist(
    (set) => ({
      trails: [],
      save: (steps) =>
        set((s) => {
          const dup = s.trails.some((t) => stepsKey(t.steps) === stepsKey(steps))
          if (steps.length < 2 || dup) return s
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          return { trails: [{ id, steps: [...steps], savedAt: Date.now() }, ...s.trails].slice(0, MAX_SAVED) }
        }),
      remove: (id) => set((s) => ({ trails: s.trails.filter((t) => t.id !== id) })),
    }),
    { name: 'sidetracked-saved-trails', version: 1 },
  ),
)
