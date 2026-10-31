import { useNavigate } from 'react-router-dom'
import { Overlay } from '@/components/Overlay'
import { useSavedTrails } from '@/stores/savedTrailsStore'
import { useTrail } from '@/stores/trailStore'
import { useUi } from '@/stores/uiStore'
import { openTrail, startFresh } from './actions'
import { hopLabel } from './hops'
import styles from './TrailsOverlay.module.css'

export function TrailsOverlay() {
  const navigate = useNavigate()
  const close = useUi((s) => s.close)
  const steps = useTrail((s) => s.steps)
  const { trails, save, remove } = useSavedTrails()

  function open(trailSteps: string[]) {
    const last = trailSteps.at(-1)
    if (!last) return
    openTrail(trailSteps)
    close()
    navigate(`/explore/${encodeURIComponent(last)}`)
  }

  return (
    <Overlay label="Your trails">
      <header className={styles.head}>
        <h2>Your trails</h2>
        <button className={styles.action} onClick={() => { startFresh(); close(); navigate('/') }}>
          Start a fresh trail
        </button>
      </header>

      {steps.length > 1 && (
        <section className={styles.current}>
          <span className={styles.kicker}>Current · {hopLabel(steps.length)}</span>
          <p>{steps.join(' · ')}</p>
          <button className={styles.action} onClick={() => save(steps)}>
            Save this trail
          </button>
        </section>
      )}

      {trails.length === 0 ? (
        <p className={styles.empty}>
          No saved trails yet. Explore a few topics and they're kept here when you start a new trail.
        </p>
      ) : (
        <ul className={styles.list}>
          {trails.map((t) => (
            <li key={t.id} className={styles.item}>
              <button className={styles.open} onClick={() => open(t.steps)}>
                <span className={styles.name}>
                  {t.steps[0]} → {t.steps.at(-1)}
                </span>
                <span className={styles.meta}>
                  {hopLabel(t.steps.length)} · {new Date(t.savedAt).toLocaleDateString()}
                </span>
              </button>
              <button
                className={styles.remove}
                aria-label={`Delete trail ${t.steps[0]} to ${t.steps.at(-1)}`}
                onClick={() => remove(t.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </Overlay>
  )
}
