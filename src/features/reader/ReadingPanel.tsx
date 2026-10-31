import type { UseQueryResult } from '@tanstack/react-query'
import { describeError } from '@/api/wikipedia/errors'
import { KIND_LABEL, KindGlyph } from '@/components/KindGlyph'
import type { Kind } from '@/domain/kind'
import type { Neighbor, Topic, Why } from '@/domain/types'
import { useUi } from '@/stores/uiStore'
import styles from './ReadingPanel.module.css'

const WHY: Record<Why, string> = {
  both: 'Links both ways',
  similar: 'Similar article',
  tangent: 'A tangent',
}

type Props = {
  id: string
  topic: UseQueryResult<Topic>
  related: UseQueryResult<Neighbor[]>
  kinds: Record<string, Kind>
  onSelect: (id: string) => void
}

export function ReadingPanel({ id, topic, related, kinds, onSelect }: Props) {
  const setFocus = useUi((s) => s.setFocus)
  const kind = kinds[id]
  return (
    <aside className={styles.panel} aria-live="polite">
      {kind && (
        <span className={styles.kind}>
          <KindGlyph kind={kind} size={12} /> {KIND_LABEL[kind]}
        </span>
      )}
      <h1 className={styles.title}>{topic.data?.title ?? id}</h1>

      {topic.isPending && <p className={styles.muted}>Loading…</p>}
      {topic.isError && (
        <div className={styles.error}>
          <p>{describeError(topic.error, id)}</p>
          <button onClick={() => void topic.refetch()}>Try again</button>
        </div>
      )}
      {topic.data && (
        <>
          {topic.data.disambiguation && (
            <p className={styles.muted}>This name has several meanings. Pick one below.</p>
          )}
          <p className={styles.summary}>{topic.data.summary}</p>
        </>
      )}

      <h2 className={styles.kicker}>Where next</h2>
      {related.isPending && <p className={styles.muted}>Finding connections…</p>}
      {related.isError && (
        <div className={styles.error}>
          <p>{describeError(related.error, id)}</p>
          <button onClick={() => void related.refetch()}>Try again</button>
        </div>
      )}
      {related.data && related.data.length === 0 && (
        <p className={styles.muted}>No connections found for this topic.</p>
      )}
      <ul className={styles.list}>
        {related.data?.map((n) => (
          <li key={n.id}>
            <button
              className={styles.row}
              onClick={() => {
                setFocus(null) // the row is about to go away, so it will never get a blur
                onSelect(n.id)
              }}
              onMouseEnter={() => setFocus(n.id)}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus(n.id)}
              onBlur={() => setFocus(null)}
            >
              <span className={styles.name}>
                {kinds[n.id] && <KindGlyph kind={kinds[n.id]!} size={12} />}
                {n.id}
              </span>
              <span className={styles.why}>
                <i className={styles[n.why]} aria-hidden />
                {WHY[n.why]}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {topic.data && (
        <p className={styles.source}>
          From{' '}
          <a href={topic.data.url} target="_blank" rel="noreferrer">
            Wikipedia
          </a>
          , CC BY-SA
        </p>
      )}
    </aside>
  )
}
