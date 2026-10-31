import { useMemo, useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Overlay } from '@/components/Overlay'
import { useTrail } from '@/stores/trailStore'
import { useUi } from '@/stores/uiStore'
import { layoutTrailMap } from './mapLayout'
import { usePanZoom } from './usePanZoom'
import styles from './TrailMap.module.css'

/** Everywhere this trail has been, as one constellation you can pan and zoom. Pick a star to go back to it. */
export function TrailMap() {
  const steps = useTrail((s) => s.steps)
  const rewind = useTrail((s) => s.rewind)
  const close = useUi((s) => s.close)
  const navigate = useNavigate()
  const { nodes, edges, stars, box } = useMemo(() => layoutTrailMap(steps), [steps])
  const svg = useRef<SVGSVGElement>(null)
  const layer = useRef<SVGGElement>(null)
  const { reset } = usePanZoom(svg, layer, steps.length)

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const here = steps.at(-1)
  const hops = Math.max(steps.length - 1, 0)

  function jump(id: string) {
    const node = byId.get(id)
    close()
    if (!node || id === here) return
    rewind(node.last)
    navigate(`/explore/${encodeURIComponent(id)}`)
  }

  return (
    <Overlay label="Trail map" wide>
      <header className={styles.head}>
        <p className={styles.count}>
          {nodes.length} {nodes.length === 1 ? 'topic' : 'topics'}, {hops}{' '}
          {hops === 1 ? 'hop' : 'hops'}
        </p>
        <button type="button" className={styles.close} onClick={close}>
          Close
        </button>
      </header>
      {nodes.length < 2 ? (
        <p className={styles.empty}>
          Your map begins with your first step. Follow a topic and it will appear here.
        </p>
      ) : (
        <div className={styles.stage}>
          <svg
            ref={svg}
            className={styles.svg}
            viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
            role="group"
            aria-label="Map of your trail"
          >
            <rect
              data-pan
              className={styles.bg}
              x={box.x - 4000}
              y={box.y - 4000}
              width={box.w + 8000}
              height={box.h + 8000}
            />
            <g ref={layer}>
              {stars.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={1.6} className={styles.dust} />
              ))}
              {edges.map((e) => {
                const a = byId.get(e.source)
                const b = byId.get(e.target)
                if (!a || !b) return null
                const mx = (a.x + b.x) / 2 - (b.y - a.y) * 0.15
                const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.15
                return (
                  <path
                    key={`${e.source}>${e.target}`}
                    className={styles.edge}
                    d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`}
                  />
                )
              })}
              {nodes.map((n, i) => {
                const isHere = n.id === here
                return (
                  <g
                    key={n.id}
                    className={`${styles.star} ${isHere ? styles.here : ''}`}
                    style={
                      { transform: `translate(${n.x}px, ${n.y}px)`, '--i': i } as CSSProperties
                    }
                    role="link"
                    tabIndex={0}
                    aria-label={isHere ? `${n.id}, where you are` : `Go back to ${n.id}`}
                    onClick={() => jump(n.id)}
                    onKeyDown={(e) => e.key === 'Enter' && jump(n.id)}
                  >
                    <circle r={26} className={styles.hit} />
                    {isHere && <circle r={30} fill="url(#map-glow)" />}
                    <circle r={isHere ? 11 : 7} className={styles.disc} />
                    <text y={-(isHere ? 20 : 15)} textAnchor="middle" className={styles.label}>
                      {n.id}
                    </text>
                  </g>
                )
              })}
            </g>
            <defs>
              <radialGradient id="map-glow">
                <stop offset="0%" className={styles.glow} />
                <stop offset="100%" className={styles.glowEnd} />
              </radialGradient>
            </defs>
          </svg>
          <button type="button" className={styles.reset} onClick={reset}>
            Reset view
          </button>
          <p className={styles.hint}>Scroll to zoom · drag to pan · pick a star to return</p>
        </div>
      )}
    </Overlay>
  )
}
