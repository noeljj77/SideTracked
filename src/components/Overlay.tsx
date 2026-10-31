import { useEffect, useRef, type ReactNode } from 'react'
import { useUi } from '@/stores/uiStore'
import styles from './Overlay.module.css'

const FOCUSABLE = 'a[href],button,input,[tabindex]:not([tabindex="-1"])'

/** Modal layer: Esc or backdrop click closes, Tab stays inside, focus returns afterwards. */
export function Overlay({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: ReactNode
}) {
  const close = useUi((s) => s.close)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close()
      if (e.key !== 'Tab' || !ref.current) return
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = items[0]
      const last = items.at(-1)
      if (!first || !last) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [close])

  return (
    <div
      className={`${styles.backdrop} ${wide ? styles.backdropWide : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        ref={ref}
        className={`${styles.panel} ${wide ? styles.panelWide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  )
}
