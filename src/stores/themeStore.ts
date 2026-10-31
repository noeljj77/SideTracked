import { create } from 'zustand'

type Theme = 'light' | 'dark'

const KEY = 'sidetracked-theme'

type ThemeState = {
  theme: Theme
  toggle: () => void
}

// index.html has already put the saved (or system) theme on <html> before the first paint; start from that.
export const useTheme = create<ThemeState>()((set, get) => ({
  theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  toggle: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // Storage unavailable: the choice lasts until the page is closed.
    }
    set({ theme })
  },
}))
