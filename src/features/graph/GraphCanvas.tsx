import { memo, useMemo, useState } from 'react'
import type { Neighbor } from '@/domain/types'
import { layoutGraph, VIEW, type GraphNode } from './layout'
import styles from './GraphCanvas.module.css'

type Props = {
  current: string
  trail: string[]
  neighbors: Neighbor[]
  onSelect: (id: string) => void
}

type Pt = { x: number; y: number }

function curve(a: Pt, b: Pt) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  return `M${a.x},${a.y} Q${mx - (b.y - a.y) * 0.15},${my + (b.x - a.x) * 0.15} ${b.x},${b.y}`
}

function Label({ n }: { n: GraphNode }) {
  if (n.state === 'current') {
    return (
      <text className={styles.labelCurrent} x={n.x} y={n.y + n.r + 30} textAnchor="middle">
        {n.id}
      </text>
    )
  }
  if (n.state === 'visited') {
    return (
      <text className={styles.label} x={n.x} y={n.y + n.r + 26} textAnchor="middle">
        {n.id}
      </text>
    )
  }
  return (
    <text className={styles.label} x={n.x + n.r + 12} y={n.y + 5}>
      {n.id}
    </text>
  )
}

export const GraphCanvas = memo(function GraphCanvas({ current, trail, neighbors, onSelect }: Props) {
  const { nodes, edges } = useMemo(
    () => layoutGraph(current, trail, neighbors),
    [current, trail, neighbors],
  )
  const [hover, setHover] = useState<string | null>(null)
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const near = useMemo(() => {
    const s = new Set<string>()
    if (hover) {
      s.add(hover)
      edges.forEach((e) => {
        if (e.source === hover) s.add(e.target)
        if (e.target === hover) s.add(e.source)
      })
    }
    return s
  }, [hover, edges])
  const dim = (id: string) => (hover && !near.has(id) ? styles.dim : '')

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      role="group"
      aria-label={`Topics connected to ${current}`}
    >
      <defs>
        <radialGradient id="glow-lantern">
          <stop offset="0%" className={styles.glowLantern} />
          <stop offset="100%" className={styles.glowEnd} />
        </radialGradient>
        <radialGradient id="glow-tide">
          <stop offset="0%" className={styles.glowTide} />
          <stop offset="100%" className={styles.glowEnd} />
        </radialGradient>
      </defs>

      {edges.map((e) => {
        const a = byId.get(e.source)
        const b = byId.get(e.target)
        if (!a || !b) return null
        const active = !hover || e.source === hover || e.target === hover
        return (
          <path
            key={`${e.kind}:${e.source}>${e.target}`}
            d={curve(a, b)}
            className={`${styles.edge} ${e.kind === 'trail' ? styles.trail : ''} ${active ? '' : styles.dim}`}
          />
        )
      })}

      {nodes.map((n) => {
        const isCurrent = n.state === 'current'
        return (
          <g
            key={n.id}
            className={`${styles.node} ${styles[n.state]} ${dim(n.id)}`}
            role={isCurrent ? undefined : 'link'}
            tabIndex={isCurrent ? undefined : 0}
            aria-label={isCurrent ? undefined : `Go to ${n.id}`}
            onClick={isCurrent ? undefined : () => onSelect(n.id)}
            onKeyDown={(e) => {
              if (!isCurrent && e.key === 'Enter') onSelect(n.id)
            }}
            onMouseEnter={() => setHover(n.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(n.id)}
            onBlur={() => setHover(null)}
          >
            <circle cx={n.x} cy={n.y} r={22} className={styles.hit} />
            {isCurrent && (
              <>
                <circle cx={n.x} cy={n.y} r={n.r * 3.2} fill="url(#glow-lantern)" />
                <circle cx={n.x} cy={n.y} r={n.r * 1.7} className={styles.pulse} />
              </>
            )}
            {n.state === 'discoverable' && (
              <circle cx={n.x} cy={n.y} r={n.r * 2.6} fill="url(#glow-tide)" />
            )}
            {n.state === 'visited' && <circle cx={n.x} cy={n.y} r={n.r + 3.5} className={styles.ring} />}
            <circle cx={n.x} cy={n.y} r={n.r} className={styles.body} />
            <Label n={n} />
          </g>
        )
      })}
    </svg>
  )
})
