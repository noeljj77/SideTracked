import { useCallback, useEffect, useMemo, useRef, type PointerEvent } from 'react'
import type { Pt } from '@/domain/types'
import type { GraphEdge, GraphNode, View } from './layout'
import { miniFit } from './miniFit'
import type { Transform } from './usePanZoom'
import styles from './Minimap.module.css'

const W = 188
const H = 108

type Props = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  view: View
  /** Where the camera rests, so the box for the current screen always fits in the map. */
  home: Transform
  /** The camera now, and a way to hear about every move. */
  camera: () => Transform
  watch: (fn: (t: Transform, smooth: boolean) => void) => () => void
  /** Look at this world point; `smooth` is false while the pointer is being dragged. */
  onJump: (world: Pt, smooth: boolean) => void
}

/** The whole journey in a corner, with a box for what the screen shows. Click or drag to go there. */
export function Minimap({ nodes, edges, view, home, camera, watch, onJump }: Props) {
  const fit = useMemo(() => {
    const corner = (x: number, y: number) => ({
      x: (x - home.x) / home.k,
      y: (y - home.y) / home.k,
    })
    return miniFit([...nodes, corner(0, 0), corner(view.w, view.h)], W, H)
  }, [nodes, home, view])
  const box = useRef<SVGRectElement>(null)
  const dragging = useRef(false)
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  // The box moves with CSS only, so panning and zooming never re-render React.
  const draw = useCallback(
    (t: Transform, smooth: boolean) => {
      const r = box.current
      if (!r) return
      const at = fit.toMini({ x: -t.x / t.k, y: -t.y / t.k })
      r.style.setProperty('transition', smooth ? '' : 'none')
      r.style.setProperty('x', `${at.x}px`)
      r.style.setProperty('y', `${at.y}px`)
      r.style.setProperty('width', `${(view.w / t.k) * fit.s}px`)
      r.style.setProperty('height', `${(view.h / t.k) * fit.s}px`)
    },
    [fit, view],
  )
  useEffect(() => {
    draw(camera(), false)
    return watch(draw)
  }, [draw, camera, watch])

  const aim = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return fit.toWorld({
      x: ((e.clientX - r.left) * W) / r.width,
      y: ((e.clientY - r.top) * H) / r.height,
    })
  }

  return (
    <svg
      className={styles.mini}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        dragging.current = true
        onJump(aim(e), true)
      }}
      onPointerMove={(e) => dragging.current && onJump(aim(e), false)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      {edges
        .filter((e) => e.kind === 'trail')
        .map((e) => {
          const [a, b] = [byId.get(e.source), byId.get(e.target)]
          if (!a || !b) return null
          const [p, q] = [fit.toMini(a), fit.toMini(b)]
          return (
            <line
              key={`${e.source}>${e.target}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              className={styles.trail}
            />
          )
        })}
      {nodes.map((n) => {
        const p = fit.toMini(n)
        return (
          <circle
            key={n.id}
            cx={p.x}
            cy={p.y}
            r={n.state === 'current' ? 3.6 : n.state === 'visited' ? 2.2 : 1.8}
            className={styles[n.state]}
          />
        )
      })}
      <rect ref={box} className={styles.view} />
    </svg>
  )
}
