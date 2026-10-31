import { useEffect } from 'react'
import { useUi } from '@/stores/uiStore'

/** True when a key press is going into a text field, so shortcuts must stay out of the way. */
export function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

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
      if (e.key === '/' && !isTyping(e.target) && !overlay) {
        e.preventDefault()
        open('command')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
