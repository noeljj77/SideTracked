import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { describeError } from '@/api/wikipedia/errors'
import { useTopic } from '@/api/wikipedia/queries'
import type { Bridge } from '@/domain/bridge'
import { Unresolved, useBridge } from '@/features/collide/useBridge'
import { openTrail } from '@/features/trail/actions'
import styles from './Collide.module.css'

const CHIPS = 8

function Stone({ id, index, ends, onWalk }: { id: string; index: number; ends: boolean; onWalk: () => void }) {
  const { data } = useTopic(id)
  return (
    <li className={`${styles.stone} ${ends ? styles.end : ''}`} style={{ '--i': index } as CSSProperties}>
      <span className={styles.disc} aria-hidden />
      <div className={styles.card}>
        <Link className={styles.name} to={`/explore/${encodeURIComponent(id)}`} onClick={onWalk}>
          {id}
        </Link>
        {data && <p className={styles.summary}>{data.summary}</p>}
      </div>
      {data?.thumbnail && <img className={styles.thumb} src={data.thumbnail} alt="" loading="lazy" />}
    </li>
  )
}

/** The stones between two topics. Remounted for each search, so the picked meeting point starts at the best. */
function Stones({ bridge }: { bridge: Bridge }) {
  const [pick, setPick] = useState(0)
  const navigate = useNavigate()
  const middle = bridge.via[pick]
  const path = middle ? [bridge.from, middle, bridge.to] : [bridge.from, bridge.to]

  // Walking keeps the stones up to (and including) the one you chose as your trail, so it can be saved.
  const walk = (upTo: number) => openTrail(path.slice(0, upTo + 1))

  return (
    <>
      <p className={styles.hops}>
        {path.length - 1} {path.length === 2 ? 'hop · they link to each other' : 'hops'}
      </p>
      <ol className={styles.stones}>
        {path.map((id, i) => (
          <Stone key={id} id={id} index={i} ends={i === 0 || i === path.length - 1} onWalk={() => walk(i)} />
        ))}
      </ol>
      {bridge.via.length > 1 && (
        <div className={styles.others}>
          <p className={styles.hops}>Other meeting points</p>
          <ul className={styles.chips}>
            {bridge.via.slice(0, CHIPS).map((id, i) => (
              <li key={id}>
                <button
                  className={styles.chip}
                  aria-pressed={i === pick}
                  onClick={() => setPick(i)}
                  type="button"
                >
                  {id}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        className={styles.go}
        onClick={() => {
          walk(path.length - 1)
          navigate(`/explore/${encodeURIComponent(bridge.to)}`)
        }}
      >
        Walk this trail
      </button>
    </>
  )
}

export function Collide() {
  const [params, setParams] = useSearchParams()
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const [a, setA] = useState(from)
  const [b, setB] = useState(to)
  const { data, isFetching, isError, error, progress } = useBridge(from, to)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (a.trim() && b.trim()) setParams({ from: a.trim(), to: b.trim() })
  }

  const sameTopic = data && data.from === data.to
  const nothing = data && !sameTopic && !data.direct && data.via.length === 0

  return (
    <main className={styles.page}>
      <Link to="/" className={styles.brand}>
        SideTracked
      </Link>
      <h1 className={styles.title}>
        Collide <em>two topics.</em>
      </h1>
      <p className={styles.lede}>Pick any two. We'll look for the stepping stone between them.</p>

      <form onSubmit={onSubmit} className={styles.form}>
        <input
          className={styles.input}
          aria-label="From"
          placeholder="Octopus"
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
        <span className={styles.vs} aria-hidden>
          ×
        </span>
        <input
          className={styles.input}
          aria-label="To"
          placeholder="Byzantine Empire"
          value={b}
          onChange={(e) => setB(e.target.value)}
        />
        <button className={styles.go} type="submit" disabled={!a.trim() || !b.trim()}>
          Find the bridge
        </button>
      </form>

      <div className={styles.result} aria-live="polite">
        {isFetching && (
          <p className={styles.status}>
            <span className={styles.dots} aria-hidden />
            Searching the dark…
            {progress && (
              <em>
                {progress.checked} of {progress.total} connections checked
              </em>
            )}
          </p>
        )}
        {isError && (
          <p className={styles.status}>
            {error instanceof Unresolved ? describeError(error.reason, error.id) : describeError(error, '')}
          </p>
        )}
        {!isFetching && sameTopic && <p className={styles.status}>Those are the same topic.</p>}
        {!isFetching && nothing && (
          <p className={styles.status}>
            Nothing sits between those two. Try a pair that is a little closer, or one with more to say.
          </p>
        )}
        {!isFetching && data && !sameTopic && !nothing && (
          <Stones key={`${data.from}>${data.to}`} bridge={data} />
        )}
      </div>
    </main>
  )
}
