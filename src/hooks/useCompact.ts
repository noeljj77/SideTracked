import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 899px)'

/** True on tablet/phone widths, where the reading panel becomes a bottom sheet. */
export function useCompact() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(QUERY)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () => window.matchMedia(QUERY).matches,
  )
}
