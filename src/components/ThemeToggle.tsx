import { useTheme } from '@/stores/themeStore'
import { Pill } from './Pill'

/** Switches between the paper board and the night board. */
export function ThemeToggle() {
  const theme = useTheme((s) => s.theme)
  const toggle = useTheme((s) => s.toggle)
  const dark = theme === 'dark'

  return (
    <Pill onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="currentColor">
        {dark ? (
          <path d="M8 1.5a.7.7 0 0 1 .7.7v1.1a.7.7 0 0 1-1.4 0V2.2A.7.7 0 0 1 8 1.5Zm0 10.5a.7.7 0 0 1 .7.7v1.1a.7.7 0 0 1-1.4 0v-1.1A.7.7 0 0 1 8 12Zm6.5-4a.7.7 0 0 1-.7.7h-1.1a.7.7 0 0 1 0-1.4h1.1a.7.7 0 0 1 .7.7ZM4 8a.7.7 0 0 1-.7.7H2.2a.7.7 0 0 1 0-1.4h1.1A.7.7 0 0 1 4 8Zm7.4-3.4a.7.7 0 0 1 0-1l.8-.8a.7.7 0 1 1 1 1l-.8.8a.7.7 0 0 1-1 0ZM3.8 12.2a.7.7 0 0 1 0-1l.8-.8a.7.7 0 1 1 1 1l-.8.8a.7.7 0 0 1-1 0Zm0-8.4a.7.7 0 0 1 1 0l.8.8a.7.7 0 1 1-1 1l-.8-.8a.7.7 0 0 1 0-1Zm7.6 7.6a.7.7 0 0 1 1 0l.8.8a.7.7 0 1 1-1 1l-.8-.8a.7.7 0 0 1 0-1ZM8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        ) : (
          <path d="M13.6 10.3A6 6 0 0 1 5.7 2.4a.5.5 0 0 0-.6-.6A6.5 6.5 0 1 0 14.2 10.9a.5.5 0 0 0-.6-.6Z" />
        )}
      </svg>
    </Pill>
  )
}
