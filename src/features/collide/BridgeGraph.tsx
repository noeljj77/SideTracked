import type { CSSProperties } from 'react'
import { useMedia } from '@/hooks/useMedia'
import { smooth } from '@/domain/curve'
import { bridgeLayout, type Pt } from './bridgeLayout'
import styles from './BridgeGraph.module.css'

export type Alternative = { index: number; label: string }

type Props = {
  /** The stones in order: first topic, the stones between, last topic. */
  path: string[]
  /** Other single-stone meeting points. Shown as dim satellites on wide screens; the chip list covers the rest. */
  alternatives: Alternative[]
  onPick: (index: number) => void
  /** Walk the trail up to path[i] and open it. */
  onOpen: (i: number) => void
  onActive: (id: string | null) => void
}

const arc = (a: Pt, b: Pt) =>
  `M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 - (b.x - a.x) * 0.08} ${b.x},${b.y}`

/** The bridge as a glowing thread through its stones, with the other meeting points hanging off it. */
export function BridgeGraph({ path, alternatives, onPick, onOpen, onActive }: Props) {
  const vertical = useMedia('(max-width: 599px)')
  const { w, h, nodes, slots } = bridgeLayout(path.length, vertical)
  const head = nodes[0]
  const tail = nodes.at(-1)

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${w} ${h}`}
      role="group"
      aria-label={`Path from ${path[0]} to ${path.at(-1)}`}
    >
      {!vertical &&
        head &&
        tail &&
        alternatives.slice(0, slots.length).map((alt, j) => {
          const s = slots[j]
          if (!s) return null
          const above = s.y < h / 2
          return (
            // The chip list is the keyboard route to the same choice, so these are pointer-only.
            <g
              key={alt.index}
              className={styles.moon}
              aria-hidden
              onClick={() => onPick(alt.index)}
            >
              <path d={arc(head, s)} className={styles.moonEdge} />
              <path d={arc(s, tail)} className={styles.moonEdge} />
              <circle cx={s.x} cy={s.y} r={22} className={styles.moonHit} />
              <circle cx={s.x} cy={s.y} r={5} className={styles.moonBody} />
              <text
                x={s.x}
                y={s.y + (above ? -13 : 22)}
                textAnchor="middle"
                className={styles.moonLabel}
              >
                {alt.label}
              </text>
            </g>
          )
        })}

      <path d={smooth(nodes)} pathLength={1} className={styles.thread} />

      {path.map((id, i) => {
        const p = nodes[i]
        if (!p) return null
        const end = i === 0 || i === path.length - 1
        const hangs = vertical ? 0 : p.y >= h / 2 + 1 ? 1 : p.y <= h / 2 - 1 ? -1 : 1
        return (
          <g
            key={id}
            className={`${styles.stone} ${end ? styles.end : ''}`}
            style={{ '--i': i } as CSSProperties}
            role="link"
            tabIndex={0}
            aria-label={id}
            onClick={() => onOpen(i)}
            onKeyDown={(e) => e.key === 'Enter' && onOpen(i)}
            onMouseEnter={() => onActive(id)}
            onMouseLeave={() => onActive(null)}
            onFocus={() => onActive(id)}
            onBlur={() => onActive(null)}
          >
            <g transform={`translate(${p.x} ${p.y})`}>
              <circle r={26} className={styles.hit} />
              {end && <circle r={30} className={styles.glow} />}
              <circle r={end ? 11 : 9} className={styles.disc} />
              {vertical ? (
                <text x={26} y={6} className={styles.label}>
                  {id}
                </text>
              ) : (
                <text
                  y={hangs * 34 + (hangs < 0 ? 4 : 0)}
                  textAnchor="middle"
                  className={styles.label}
                >
                  {id}
                </text>
              )}
            </g>
          </g>
        )
      })}
    </svg>
  )
}
