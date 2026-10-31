import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { KindGlyph } from '@/components/KindGlyph'
import type { Kind } from '@/domain/kind'
import type { Neighbor } from '@/domain/types'
import { isTyping } from '@/hooks/useShortcuts'
import { useCompact } from '@/hooks/useCompact'
import { useUi } from '@/stores/uiStore'
import { layoutGraph, VIEWS, type GraphEdge, type GraphNode } from './layout'
import { Peek, type PeekAnchor } from './Peek'
import styles from './GraphCanvas.module.css'

type Props = {
  current: string
  trail: string[]
  neighbors: Neighbor[]
  kinds: Record<string, Kind>
  onSelect: (id: string) => void
}

type Pt = { x: number; y: number }
type Layout = { nodes: GraphNode[]; edges: GraphEdge[] }
/** What the last layout had that the new one dropped, kept briefly so it can fade out. */
type Leaving = { nodes: GraphNode[]; edges: GraphEdge[]; from: Map<string, GraphNode>; to: Pt }

const LEAVE_MS = 650
const PEEK_DELAY_MS = 280

const edgeKey = (e: GraphEdge) => `${e.kind}:${e.source}>${e.target}`

function curve(a: Pt, b: Pt) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  return `M${a.x},${a.y} Q${mx - (b.y - a.y) * 0.15},${my + (b.x - a.x) * 0.15} ${b.x},${b.y}`
}

function departing(before: Layout, after: Layout): Leaving | null {
  const kept = new Set(after.nodes.map((n) => n.id))
  const keptEdges = new Set(after.edges.map(edgeKey))
  const nodes = before.nodes.filter((n) => !kept.has(n.id))
  const edges = before.edges.filter((e) => !keptEdges.has(edgeKey(e)))
  if (!nodes.length && !edges.length) return null
  const to = after.nodes.find((n) => n.state === 'current') ?? { x: 0, y: 0 }
  return { nodes, edges, from: new Map(before.nodes.map((n) => [n.id, n])), to }
}

/** Positions are relative to the node's own origin; the wrapper group does the moving. */
function Label({ n, kind }: { n: GraphNode; kind?: Kind }) {
  // Space for the glyph is always reserved, so labels don't shift when the kind arrives.
  if (n.state === 'current') {
    return (
      <>
        {kind && <KindGlyph kind={kind} x={-6.5} y={n.r + 8} />}
        <text className={styles.labelCurrent} y={n.r + 44} textAnchor="middle">
          {n.id}
        </text>
      </>
    )
  }
  if (n.state === 'visited') {
    // Near the left edge a centred label would be clipped, so it starts at the node instead.
    const edge = n.x < 120
    return (
      <>
        {kind && <KindGlyph kind={kind} x={-6.5} y={-(n.r + 43)} />}
        <text className={styles.label} x={edge ? -6 : 0} y={-(n.r + 14)} textAnchor={edge ? 'start' : 'middle'}>
          {n.id}
        </text>
      </>
    )
  }
  return (
    <>
      {kind && <KindGlyph kind={kind} x={n.r + 10} y={-6} />}
      <text className={styles.label} x={n.r + 29} y={5}>
        {n.id}
      </text>
    </>
  )
}

function Shape({ n, kind }: { n: GraphNode; kind?: Kind }) {
  return (
    <>
      {n.state === 'current' && (
        <>
          <circle r={n.r * 3.2} fill="url(#glow-lantern)" />
          <circle r={n.r * 1.7} className={styles.pulse} />
        </>
      )}
      {n.state === 'discoverable' && <circle r={n.r * 2.6} fill="url(#glow-tide)" />}
      {n.state === 'visited' && <circle r={n.r + 3.5} className={styles.ring} />}
      <circle r={n.r} className={styles.body} />
      <Label n={n} kind={kind} />
    </>
  )
}

export const GraphCanvas = memo(function GraphCanvas({ current, trail, neighbors, kinds, onSelect }: Props) {
  const view = useCompact() ? VIEWS.compact : VIEWS.wide
  const layout = useMemo(
    () => layoutGraph(current, trail, neighbors, view),
    [current, trail, neighbors, view],
  )
  const { nodes, edges } = layout
  const svg = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [peek, setPeek] = useState<PeekAnchor | null>(null)
  const peekTimer = useRef<number>(undefined)

  // Whatever the new layout drops flies toward the topic you chose, then is removed.
  const [prev, setPrev] = useState(layout)
  const [leaving, setLeaving] = useState<Leaving | null>(null)
  if (prev !== layout) {
    setPrev(layout)
    // The trail updates a moment after the route, giving a second layout; it must not cancel the first fade.
    const gone = departing(prev, layout)
    if (gone) setLeaving(gone)
  }
  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => setLeaving(null), LEAVE_MS)
    return () => window.clearTimeout(t)
  }, [leaving])

  useEffect(() => () => window.clearTimeout(peekTimer.current), [])

  // Arrow keys browse the neighbours (Enter then steps, see the node's own handler).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = svg.current
      if (!el || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target) || useUi.getState().overlay) return
      const active = document.activeElement
      if (active && active !== document.body && !el.contains(active)) return
      if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        if (active && active !== document.body) (active as HTMLElement).blur()
        return
      }
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowRight') return
      // DOM order is best match first; for up/down the order on screen is what matters.
      const items = [...el.querySelectorAll<SVGGElement>('[data-nb]')]
      const first = items[0]
      if (!first) return
      e.preventDefault()
      const onScreen = [...items].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
      const i = onScreen.findIndex((g) => g === active)
      if (i === -1 || e.key === 'ArrowRight') return first.focus()
      const step = e.key === 'ArrowDown' ? 1 : -1
      onScreen[(i + step + onScreen.length) % onScreen.length]?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function enter(id: string, e: { currentTarget: SVGGElement }) {
    setHover(id)
    window.clearTimeout(peekTimer.current)
    // Touch screens have no hover, and the current topic is already in the reading panel.
    if (!window.matchMedia('(hover: hover)').matches || id === current) return
    const hit = e.currentTarget.firstElementChild
    if (!hit) return
    peekTimer.current = window.setTimeout(() => {
      const r = hit.getBoundingClientRect()
      setPeek({ id, x: r.left + r.width / 2, top: r.top, bottom: r.bottom })
    }, PEEK_DELAY_MS)
  }
  function leave() {
    setHover(null)
    setPeek(null)
    window.clearTimeout(peekTimer.current)
  }

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
    <>
      <svg
        ref={svg}
        className={styles.svg}
        viewBox={`0 0 ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMin meet"
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

        {leaving?.edges.map((e) => {
          const a = leaving.from.get(e.source)
          const b = leaving.from.get(e.target)
          if (!a || !b) return null
          return (
            <path
              key={`out:${edgeKey(e)}`}
              d={curve(a, b)}
              className={`${styles.edge} ${styles.edgeOut} ${e.kind === 'trail' ? styles.trail : ''}`}
            />
          )
        })}

        {edges.map((e) => {
          const a = byId.get(e.source)
          const b = byId.get(e.target)
          if (!a || !b) return null
          const active = !hover || e.source === hover || e.target === hover
          return (
            <path
              key={edgeKey(e)}
              d={curve(a, b)}
              // CSS `d` lets Chrome animate the curve; other browsers snap via the attribute above.
              style={{ d: `path("${curve(a, b)}")` } as CSSProperties}
              className={`${styles.edge} ${e.kind === 'trail' ? styles.trail : ''} ${active ? '' : styles.dim}`}
            />
          )
        })}

        {leaving?.nodes.map((n) => (
          <g
            key={`out:${n.id}`}
            style={{ transform: `translate(${n.x}px, ${n.y}px)` }}
            className={`${styles.place} ${styles[n.state]}`}
            pointerEvents="none"
            aria-hidden
          >
            <g
              className={`${styles.node} ${styles.out}`}
              style={{ '--tx': `${leaving.to.x - n.x}px`, '--ty': `${leaving.to.y - n.y}px` } as CSSProperties}
            >
              <Shape n={n} kind={kinds[n.id]} />
            </g>
          </g>
        ))}

        {nodes.map((n) => {
          const isCurrent = n.state === 'current'
          return (
            <g
              key={n.id}
              style={{ transform: `translate(${n.x}px, ${n.y}px)` }}
              className={`${styles.place} ${styles[n.state]} ${dim(n.id)}`}
              role={isCurrent ? undefined : 'link'}
              tabIndex={isCurrent ? undefined : 0}
              aria-label={isCurrent ? undefined : `Go to ${n.id}`}
              data-nb={n.state === 'discoverable' ? '' : undefined}
              onClick={isCurrent ? undefined : () => onSelect(n.id)}
              onKeyDown={(e) => {
                if (!isCurrent && e.key === 'Enter') onSelect(n.id)
              }}
              onMouseEnter={(e) => enter(n.id, e)}
              onMouseLeave={leave}
              onFocus={(e) => enter(n.id, e)}
              onBlur={leave}
            >
              <circle r={22} className={styles.hit} />
              <g className={styles.node}>
                <Shape n={n} kind={kinds[n.id]} />
              </g>
            </g>
          )
        })}
      </svg>
      {peek && <Peek anchor={peek} />}
    </>
  )
})
