import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchRandomTitle } from '@/api/wikipedia/client'
import { Pill } from '@/components/Pill'
import { AccountPill } from '@/features/account/AccountPill'
import { startFresh } from '@/features/trail/actions'
import { useUi } from '@/stores/uiStore'
import styles from './Landing.module.css'

const SEEDS = ['Voynich manuscript', 'Tardigrade', 'Brutalist architecture', 'Tunguska event']

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
    <main className={styles.page}>
      <nav className={styles.nav}>
        <AccountPill />
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
