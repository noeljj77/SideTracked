import { useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchRandomTitle } from '@/api/wikipedia/client'
import { useSearch } from '@/api/wikipedia/queries'
import { Overlay } from '@/components/Overlay'
import { useDebounced } from '@/hooks/useDebounced'
import { startFresh } from '@/features/trail/actions'
import { useUi } from '@/stores/uiStore'
import styles from './CommandBar.module.css'

type Item = { key: string; label: string; hint?: string; run: () => void }

export function CommandBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { open, close } = useUi()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState(false)
  const typed = q.trim()
  const search = useSearch(useDebounced(typed, 200))

  // Jumping from the landing page starts a new trail; from a workspace it is one more step.
  function go(title: string) {
    if (pathname === '/') startFresh()
    close()
    navigate(`/explore/${encodeURIComponent(title)}`)
  }

  async function surprise() {
    setFailed(false)
    try {
      go(await fetchRandomTitle())
    } catch {
      setFailed(true)
    }
  }

  const items: Item[] = typed
    ? (search.data ?? []).map((r) => ({
        key: r.title,
        label: r.title,
        hint: r.description,
        run: () => go(r.title),
      }))
    : [
        { key: 'surprise', label: 'Surprise me', hint: 'A random article', run: () => void surprise() },
        { key: 'trails', label: 'Your trails', hint: 'Saved and recent journeys', run: () => open('trails') },
      ]
  const current = Math.min(active, items.length - 1)

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((current + step + items.length) % Math.max(items.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[current]
      if (item) item.run()
      else if (typed) go(typed)
    }
  }

  return (
    <Overlay label="Search topics">
      <input
        className={styles.input}
        autoFocus
        role="combobox"
        aria-expanded
        aria-controls="command-list"
        aria-activedescendant={items[current] ? `cmd-${items[current].key}` : undefined}
        aria-label="Jump to a topic"
        placeholder="Jump to any topic…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
          setFailed(false)
        }}
        onKeyDown={onKeyDown}
      />
      <ul id="command-list" role="listbox" className={styles.list}>
        {items.map((item, i) => (
          <li
            key={item.key}
            id={`cmd-${item.key}`}
            role="option"
            aria-selected={i === current}
            className={`${styles.row} ${i === current ? styles.active : ''}`}
            onMouseMove={() => setActive(i)}
            onClick={item.run}
          >
            <span>{item.label}</span>
            {item.hint && <em>{item.hint}</em>}
          </li>
        ))}
      </ul>
      {failed && <p className={styles.note}>Couldn't fetch a surprise. Try again.</p>}
      {typed && search.isError && <p className={styles.note}>Couldn't search right now.</p>}
      {typed && !search.isError && !search.isFetching && items.length === 0 && (
        <p className={styles.note}>No matches. Press Enter to try "{typed}" anyway.</p>
      )}
    </Overlay>
  )
}
