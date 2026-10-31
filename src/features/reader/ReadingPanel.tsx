import type { UseQueryResult } from '@tanstack/react-query'
import { describeError } from '@/api/wikipedia/errors'
import type { Neighbor, Topic } from '@/domain/types'
import styles from './ReadingPanel.module.css'

type Props = {
  id: string
  topic: UseQueryResult<Topic>
  related: UseQueryResult<Neighbor[]>
  onSelect: (id: string) => void
}

export function ReadingPanel({ id, topic, related, onSelect }: Props) {
  return (
    <aside className={styles.panel} aria-live="polite">
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
            <button className={styles.row} onClick={() => onSelect(n.id)}>
              <span>{n.id}</span>
              <em>{n.strength}</em>
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
