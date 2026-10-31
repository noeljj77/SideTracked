import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchRandomTitle } from '@/api/wikipedia/client'
import { Pill } from '@/components/Pill'
import { AccountPill } from '@/features/account/AccountPill'
import { startFresh } from '@/features/trail/actions'
import { useUi } from '@/stores/uiStore'
import styles from './Landing.module.css'

const SEEDS = ['Voynich manuscript', 'Tardigrade', 'Brutalist architecture', 'Tunguska event']

// Decoration only: faint until the cursor's lamplight passes over them. Kept distinct from SEEDS.
const DRIFT = [
  'Byzantium', 'Octopus', 'Jazz', 'Silk Road', 'Aurora', 'Kintsugi', 'Mycelium', 'Antikythera',
  'Lighthouse', 'Bioluminescence', 'Origami', 'Cartography', 'Obsidian', 'Monsoon', 'Alchemy', 'Sundial',
]

export function Landing() {
  const [query, setQuery] = useState('')
  const [failed, setFailed] = useState(false)
  const navigate = useNavigate()
  const open = useUi((s) => s.open)

  // Every start from the landing page is a new trail; the old one is kept in "Your trails".
  function begin(topic: string) {
    startFresh()
    navigate(`/explore/${encodeURIComponent(topic)}`)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const topic = query.trim()
    if (topic) begin(topic)
  }

  async function surprise() {
    setFailed(false)
    try {
      begin(await fetchRandomTitle())
    } catch {
      setFailed(true)
    }
  }

  return (
    <main
      className={styles.page}
      // The lamplight follows the pointer through two CSS variables, so moving it never re-renders React.
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
      }}
    >
      <div className={styles.words} aria-hidden>
        {DRIFT.map((w, i) => (
          <span
            key={w}
            style={{
              left: `${(i * 37) % 88 + 4}%`,
              top: `${(i * 53) % 84 + 6}%`,
              fontSize: 20 + (i % 3) * 7,
              animationDuration: `${16 + (i % 5) * 4}s`,
              animationDelay: `${-i * 2.3}s`,
            }}
          >
            {w}
          </span>
        ))}
      </div>
      <nav className={styles.nav}>
        <AccountPill />
        <Pill onClick={() => navigate('/collide')}>Collide</Pill>
        <Pill onClick={() => open('trails')}>Your trails</Pill>
        <Pill onClick={() => void surprise()}>Surprise me</Pill>
      </nav>
      <p className={styles.brand}>SideTracked</p>
      <h1 className={styles.title}>
        One thing leads <em>to another.</em>
      </h1>
      <form onSubmit={onSubmit} className={styles.form}>
        <input
          className={styles.input}
          aria-label="Topic"
          placeholder="Type any topic: octopus, jazz, Byzantium…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      <div className={styles.seeds}>
        {SEEDS.map((s) => (
          <Link key={s} className={styles.seed} to={`/explore/${encodeURIComponent(s)}`} onClick={startFresh}>
            {s}
          </Link>
        ))}
      </div>
      {failed && <p className={styles.note}>Couldn't fetch a surprise. Try again.</p>}
    </main>
  )
}
