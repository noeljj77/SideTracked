import { useEffect } from 'react'
import { useUi } from '@/stores/uiStore'

/** Ctrl/Cmd+K toggles the command bar; "/" opens it when you are not typing. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { overlay, open, close } = useUi.getState()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (overlay === 'command') close()
        else open('command')
        return
      }
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      if (e.key === '/' && !typing && !overlay) {
        e.preventDefault()
        open('command')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
