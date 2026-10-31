import { create } from 'zustand'

type OverlayName = 'command' | 'trails' | 'account'

type UiState = {
  overlay: OverlayName | null
  open: (name: OverlayName) => void
  close: () => void
}

export const useUi = create<UiState>()((set) => ({
  overlay: null,
  open: (overlay) => set({ overlay }),
  close: () => set({ overlay: null }),
}))
