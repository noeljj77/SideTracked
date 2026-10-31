import { useEffect, useState } from 'react'

/** True after `ms` without pointer, key or touch activity. */
export function useIdle(ms: number) {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), ms)
    const wake = () => {
      setIdle(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), ms)
    }
    const events = ['pointermove', 'pointerdown', 'keydown'] as const
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, wake))
    }
  }, [ms])

  return idle
}
