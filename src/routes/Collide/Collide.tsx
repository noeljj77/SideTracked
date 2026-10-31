import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { describeError } from '@/api/wikipedia/errors'
import { useTopic } from '@/api/wikipedia/queries'
import type { Bridge } from '@/domain/bridge'
import { BridgeGraph } from '@/features/collide/BridgeGraph'
import { Unresolved, useBridge } from '@/features/collide/useBridge'
import { openTrail } from '@/features/trail/actions'
import styles from './Collide.module.css'

const CHIPS = 8

/** The summary of whichever stone you are pointing at. */
function Detail({ id }: { id: string }) {
  const { data } = useTopic(id)
  return (
    <div className={styles.detail} aria-live="polite">
      {data?.thumbnail && (
        <img className={styles.thumb} src={data.thumbnail} alt="" loading="lazy" />
      )}
      <div className={styles.card}>
        <h2 className={styles.name}>{id}</h2>
        <p className={styles.summary}>{data ? data.summary : 'Reading…'}</p>
      </div>
    </div>
  )
}

/** The stones between two topics. Remounted for each search, so the picked meeting point starts at the best. */
function Stones({ bridge }: { bridge: Bridge }) {
  const [pick, setPick] = useState(0)
  const [active, setActive] = useState<string | null>(null)
  const navigate = useNavigate()
  const middle = bridge.via[pick]
  const path = [bridge.from, ...(middle ?? []), bridge.to]
  const alternatives = bridge.via
    .map((stones, index) => ({ index, label: stones[0] ?? '', single: stones.length === 1 }))
    .filter((a) => a.single && a.index !== pick)
    .slice(0, CHIPS)

  // Walking keeps the stones up to (and including) the one you chose as your trail, so it can be saved.
  const walk = (upTo: number) => openTrail(path.slice(0, upTo + 1))
  const open = (i: number) => {
    const id = path[i]
    if (!id) return
    walk(i)
    navigate(`/explore/${encodeURIComponent(id)}`)
  }

  return (
    <>
      <p className={styles.hops}>
        {path.length - 1} {path.length === 2 ? 'hop · they link to each other' : 'hops'}
      </p>
      <BridgeGraph
        path={path}
        alternatives={alternatives}
        onPick={setPick}
        onOpen={open}
        onActive={setActive}
      />
      <Detail id={active ?? path[1] ?? path[0] ?? ''} />
      {bridge.via.length > 1 && (
        <div className={styles.others}>
          <p className={styles.hops}>Other meeting points</p>
          <ul className={styles.chips}>
            {bridge.via.slice(0, CHIPS).map((stones, i) => (
              <li key={stones.join('>')}>
                <button
                  className={styles.chip}
                  aria-pressed={i === pick}
                  onClick={() => setPick(i)}
                  type="button"
                >
                  {stones.join(' → ')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button className={styles.go} onClick={() => open(path.length - 1)}>
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
            {progress?.longer
              ? 'Nothing between them. Looking for longer chains…'
              : 'Searching the dark…'}
            {progress && !progress.longer && (
              <em>
                {progress.checked} of {progress.total} connections checked
              </em>
            )}
          </p>
        )}
        {isError && (
          <p className={styles.status}>
            {error instanceof Unresolved
              ? describeError(error.reason, error.id)
              : describeError(error, '')}
          </p>
        )}
        {!isFetching && sameTopic && <p className={styles.status}>Those are the same topic.</p>}
        {!isFetching && nothing && (
          <p className={styles.status}>
            Nothing sits between those two. Try a pair that is a little closer, or one with more to
            say.
          </p>
        )}
        {!isFetching && data && !sameTopic && !nothing && (
          <Stones key={`${data.from}>${data.to}`} bridge={data} />
        )}
      </div>
    </main>
  )
}
