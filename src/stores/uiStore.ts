import { create } from 'zustand'

type OverlayName = 'command' | 'trails' | 'account' | 'map'

type UiState = {
  overlay: OverlayName | null
  /** A topic the reading panel is pointing at, which the graph lights up. */
  focusId: string | null
  setFocus: (id: string | null) => void
  open: (name: OverlayName) => void
  close: () => void
}

export const useUi = create<UiState>()((set) => ({
  overlay: null,
  focusId: null,
  setFocus: (focusId) => set({ focusId }),
  open: (overlay) => set({ overlay }),
  close: () => set({ overlay: null }),
}))
