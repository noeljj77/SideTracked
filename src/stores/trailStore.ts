import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type TrailState = {
  steps: string[]
  /** Step forward to id. Returning to the previous step steps back instead (browser back). */
  visit: (id: string) => void
  /** Cut the trail back so index is the last step. */
  rewind: (index: number) => void
}

export const useTrail = create<TrailState>()(
  persist(
    (set) => ({
      steps: [],
      visit: (id) =>
        set((s) => {
          if (s.steps.at(-1) === id) return s
          if (s.steps.at(-2) === id) return { steps: s.steps.slice(0, -1) }
          return { steps: [...s.steps, id] }
        }),
      rewind: (index) => set((s) => ({ steps: s.steps.slice(0, index + 1) })),
    }),
    { name: 'sidetracked-trail', version: 1 },
  ),
)
