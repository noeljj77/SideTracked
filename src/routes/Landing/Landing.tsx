import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchRandomTitle } from '@/api/wikipedia/client'
import { Pill } from '@/components/Pill'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AccountPill } from '@/features/account/AccountPill'
import { smooth } from '@/domain/curve'
import { startFresh } from '@/features/trail/actions'
import { hopLabel } from '@/features/trail/hops'
import { useTrail } from '@/stores/trailStore'
import { useUi } from '@/stores/uiStore'
import { deal } from './seeds'
import styles from './Landing.module.css'

const HAND = 5

/**
 * Where each note is pinned on the board, in the board's own 1000 × 250 space. Staggered heights make
 * the thread wander; each note hangs slightly off the level, like paper pinned by hand.
 */
const PINS = [
  { x: 90, y: 46, tilt: -2.4, width: 18 },
  { x: 300, y: 104, tilt: 1.6, width: 16 },
  { x: 510, y: 40, tilt: -1.2, width: 19 },
  { x: 720, y: 108, tilt: 2.2, width: 17 },
  { x: 915, y: 56, tilt: -1.8, width: 16 },
]
// The thread comes in from off the left edge and leaves off the right one.
const THREAD = smooth([
  { x: -10, y: 84 },
  ...PINS.map((p) => ({ x: p.x, y: p.y })),
  { x: 1010, y: 96 },
])

export function Landing() {
  const [query, setQuery] = useState('')
  const [failed, setFailed] = useState(false)
  // A new hand on every visit; Shuffle deals another and replays the pinning.
  const [hand, setHand] = useState(() => deal(HAND))
  const [round, setRound] = useState(0)
  const navigate = useNavigate()
  const open = useUi((s) => s.open)
  const steps = useTrail((s) => s.steps)
  const last = steps.at(-1)

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

  function shuffle() {
    setHand((now) => deal(HAND, Math.random, now))
    setRound((r) => r + 1)
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <p className={styles.brand}>
          <svg viewBox="0 0 34 16" aria-hidden className={styles.mark}>
            <path d="M3 12C9 12 9 4 17 4S25 12 31 5" pathLength={1} />
            <circle cx="3" cy="12" r="2.6" />
          </svg>
          SideTracked
        </p>
        <nav className={styles.nav}>
          <ThemeToggle />
          <AccountPill />
          <Pill onClick={() => navigate('/collide')}>Collide</Pill>
          <Pill onClick={() => open('trails')}>Your trails</Pill>
          <Pill onClick={() => void surprise()}>Surprise me</Pill>
        </nav>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.title}>
          <span className={styles.line}>
            <span>One thing</span>
          </span>
          <span className={styles.line}>
            <span>leads to another.</span>
          </span>
        </h1>
        <p className={styles.lede}>
          Start with any topic and follow what it connects to. The path you leave behind is yours to
          keep.
        </p>
        <form onSubmit={onSubmit} className={styles.form}>
          <input
            className={styles.input}
            aria-label="Topic"
            placeholder="Octopus, jazz, the Byzantine Empire…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className={styles.go}>
            Start a trail
          </button>
        </form>
        {failed && <p className={styles.note}>Couldn't fetch a surprise. Try again.</p>}
        {last && (
          <Link to={`/explore/${encodeURIComponent(last)}`} className={styles.resume}>
            <span className={styles.pin} style={{ '--i': 0 } as CSSProperties} aria-hidden />
            <span>Pick up where you left off</span>
            <strong>{last}</strong>
            <em>
              {steps.length > 1 ? `${hopLabel(steps.length)} since ${steps[0]}` : 'Just started'}
            </em>
          </Link>
        )}
      </section>

      <section className={styles.board} aria-labelledby="pick-up">
        <div className={styles.boardHead}>
          <h2 id="pick-up" className={styles.boardTitle}>
            Or pick up a thread
          </h2>
          <button type="button" className={styles.shuffle} onClick={shuffle} data-round={round % 2}>
            <svg viewBox="0 0 20 20" aria-hidden>
              <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" />
              <circle cx="7" cy="7" r="1.2" />
              <circle cx="13" cy="13" r="1.2" />
              <circle cx="10" cy="10" r="1.2" />
            </svg>
            Shuffle
          </button>
        </div>
        <div className={styles.table} key={round}>
          <svg className={styles.string} viewBox="0 0 1000 250" aria-hidden>
            <path d={THREAD} pathLength={1} />
          </svg>
          {hand.map((seed, i) => {
            const pin = PINS[i]
            if (!pin) return null
            return (
              <Link
                key={seed.topic}
                data-seed
                to={`/explore/${encodeURIComponent(seed.topic)}`}
                onClick={startFresh}
                className={styles.noteCard}
                style={
                  {
                    '--i': i,
                    '--tilt': `${pin.tilt}deg`,
                    left: `${pin.x / 10}%`,
                    top: `${(pin.y / 250) * 100}%`,
                    width: `${pin.width}%`,
                    marginLeft: `${-pin.width / 2}%`,
                  } as CSSProperties
                }
              >
                <span className={styles.pin} aria-hidden />
                <strong>{seed.topic}</strong>
                <em>{seed.hook}</em>
              </Link>
            )
          })}
        </div>
      </section>

      <footer className={styles.foot}>
        <p>
          Topics and summaries come from{' '}
          <a href="https://www.wikipedia.org" target="_blank" rel="noreferrer">
            Wikipedia
          </a>{' '}
          (CC BY-SA) and{' '}
          <a href="https://www.wikidata.org" target="_blank" rel="noreferrer">
            Wikidata
          </a>
          .
        </p>
        <a href="https://github.com/noeljj77/SideTracked" target="_blank" rel="noreferrer">
          Source on GitHub
        </a>
      </footer>
    </main>
  )
}
