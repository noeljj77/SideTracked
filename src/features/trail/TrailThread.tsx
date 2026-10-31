import { hopLabel } from './hops'
import styles from './TrailThread.module.css'

type Props = { steps: string[]; onRewind: (index: number) => void }

export function TrailThread({ steps, onRewind }: Props) {
  if (steps.length === 0) return null
  const last = steps.length - 1

  return (
    <nav className={styles.thread} aria-label="Your trail">
      {steps.map((id, i) =>
        i === last ? (
          <span key={i} className={styles.now} aria-current="page">
            {id}
          </span>
        ) : (
          <span key={i} className={styles.step}>
            <button onClick={() => onRewind(i)}>{id}</button>
            <span aria-hidden="true">—</span>
          </span>
        ),
      )}
      <span className={styles.depth}>{hopLabel(steps.length)}</span>
    </nav>
  )
}
