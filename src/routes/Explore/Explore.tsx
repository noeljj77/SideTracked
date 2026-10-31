import { useCallback, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useRelated, useTopic } from '@/api/wikipedia/queries'
import { GraphCanvas } from '@/features/graph/GraphCanvas'
import { ReadingPanel } from '@/features/reader/ReadingPanel'
import { TrailThread } from '@/features/trail/TrailThread'
import { Pill } from '@/components/Pill'
import { useIdle } from '@/hooks/useIdle'
import { useTrail } from '@/stores/trailStore'
import { useUi } from '@/stores/uiStore'
import styles from './Explore.module.css'

const EMPTY: never[] = []

export function Explore() {
  const { topic: id = '' } = useParams()
  const navigate = useNavigate()
  const steps = useTrail((s) => s.steps)
  const visit = useTrail((s) => s.visit)
  const rewind = useTrail((s) => s.rewind)
  const open = useUi((s) => s.open)
  const idle = useIdle(4000)
  const topic = useTopic(id)
  const related = useRelated(id)

  useEffect(() => visit(id), [id, visit])

  const go = useCallback(
    (to: string) => navigate(`/explore/${encodeURIComponent(to)}`),
    [navigate],
  )

  return (
    <main className={styles.page} data-idle={idle}>
      <GraphCanvas
        current={id}
        trail={steps}
        neighbors={related.data ?? EMPTY}
        onSelect={go}
      />
      <div className={styles.bar}>
        <Link to="/" className={styles.brand}>
          SideTracked
        </Link>
        <Pill onClick={() => open('command')}>
          Search <kbd>Ctrl K</kbd>
        </Pill>
        <Pill onClick={() => open('trails')}>Trails</Pill>
      </div>
      <ReadingPanel id={id} topic={topic} related={related} onSelect={go} />
      <TrailThread
        steps={steps}
        onRewind={(i) => {
          const target = steps[i]
          rewind(i)
          if (target) go(target)
        }}
      />
    </main>
  )
}
