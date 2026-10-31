import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react'
import { KindGlyph } from '@/components/KindGlyph'
import type { Kind } from '@/domain/kind'
import type { Neighbor } from '@/domain/types'
import { isTyping } from '@/hooks/useShortcuts'
import { useCompact } from '@/hooks/useCompact'
import { useUi } from '@/stores/uiStore'
import { useWorld } from '@/stores/worldStore'
import { fitAll, layoutGraph, VIEWS, type GraphEdge, type GraphNode } from './layout'
import { Peek, type PeekAnchor } from './Peek'
import { Minimap } from './Minimap'
import { usePanZoom } from './usePanZoom'
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
const DRAG_PX = 4 // less movement than this is a click
const PULL = 0.08 // how much the other nodes follow a dragged one
const ZERO = { x: 0, y: 0 }
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
  // Text itself is not clickable between its letters, so each label gets a soft box to aim at.
  const wide = n.id.length * 9 + 24
  if (n.state === 'visited') {
    return (
      <>
        <rect
          className={styles.labelHit}
          x={-wide / 2}
          y={-(n.r + 32)}
          width={wide}
          height={n.r + 32 + n.r}
        />
        {kind && <KindGlyph kind={kind} x={-6.5} y={-(n.r + 43)} />}
        <text className={styles.label} y={-(n.r + 14)} textAnchor="middle">
          {n.id}
        </text>
      </>
    )
  }
  return (
    <>
      <rect className={styles.labelHit} x={n.r + 4} y={-16} width={wide + 28} height={32} />
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

export const GraphCanvas = memo(function GraphCanvas({
  current,
  trail,
  neighbors,
  kinds,
  onSelect,
}: Props) {
  const view = useCompact() ? VIEWS.compact : VIEWS.wide
  const layout = useMemo(
    () => layoutGraph(current, trail, neighbors, view, useWorld.getState().pos),
    [current, trail, neighbors, view],
  )
  const { nodes, edges, stars } = layout
  // Remember where everything sits, so a neighbour you pick stays put when it becomes the current topic.
  useEffect(() => useWorld.getState().remember(layout.world), [layout])
  const svg = useRef<SVGSVGElement>(null)
  const layer = useRef<SVGGElement>(null)
  const light = useRef<HTMLDivElement>(null)
  const { reset, goTo, scale, watch, camera } = usePanZoom(svg, layer, current, layout.home)
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

  // A node can be pulled aside; on release it springs back and the others sway after it.
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const grab = useRef<{
    id: string
    cx: number
    cy: number
    x: number
    y: number
    moved: boolean
  } | null>(null)
  const justDragged = useRef(false)
  const raf = useRef(0)

  useEffect(() => {
    const frame = raf
    const timer = peekTimer
    return () => {
      cancelAnimationFrame(frame.current)
      window.clearTimeout(timer.current)
    }
  }, [])

  function startDrag(id: string, e: PointerEvent<SVGGElement>) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    cancelAnimationFrame(raf.current)
    grab.current = { id, cx: e.clientX, cy: e.clientY, x: 0, y: 0, moved: false }
  }
  function moveDrag(e: PointerEvent<SVGGElement>) {
    const g = grab.current
    if (!g) return
    const px = (svg.current?.getScreenCTM()?.a ?? 1) * scale() // screen pixels per unit inside the zoomed layer
    const x = (e.clientX - g.cx) / px
    const y = (e.clientY - g.cy) / px
    if (!g.moved && Math.hypot(x, y) * px < DRAG_PX) return
    if (!g.moved) {
      g.moved = true
      leave()
    }
    g.x = x
    g.y = y
    setDrag({ id: g.id, x, y })
  }
  function endDrag() {
    const g = grab.current
    grab.current = null
    if (!g?.moved) return
    justDragged.current = true // the click that follows a drag must not step
    window.setTimeout(() => (justDragged.current = false), 0)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setDrag(null)
    let { x, y } = g
    let vx = 0
    let vy = 0
    let last = -1
    const step = (now: number) => {
      if (last < 0) last = now
      const dt = Math.min((now - last) / 1000, 0.032)
      last = now
      vx += (-180 * x - 14 * vx) * dt
      vy += (-180 * y - 14 * vy) * dt
      x += vx * dt
      y += vy * dt
      if (Math.hypot(x, y) < 0.3 && Math.hypot(vx, vy) < 2) return setDrag(null)
      setDrag({ id: g.id, x, y })
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }
  const offset = (id: string) => {
    if (!drag || id === current) return ZERO
    return id === drag.id ? drag : { x: drag.x * PULL, y: drag.y * PULL }
  }

  // The lamplight follows the mouse; it moves with CSS variables so nothing re-renders.
  function aim(e: PointerEvent<SVGSVGElement>) {
    const el = light.current
    if (!el || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    el.style.setProperty('--lx', `${e.clientX - r.left}px`)
    el.style.setProperty('--ly', `${e.clientY - r.top}px`)
    el.style.opacity = '1'
  }
  function unlight() {
    if (light.current) light.current.style.opacity = '0'
  }

  // Arrow keys browse the neighbours (Enter then steps, see the node's own handler).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = svg.current
      if (
        !el ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        isTyping(e.target) ||
        useUi.getState().overlay
      )
        return
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
      const onScreen = [...items].sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
      )
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
    const hit = e.currentTarget.querySelector('circle')
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

  // With fewer than three steps there is nothing to overview yet.
  const journey = nodes.filter((n) => n.state !== 'discoverable').length >= 3
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  // Pointing at a topic in the reading panel lights it up here just like hovering it does.
  const panelFocus = useUi((s) => s.focusId)
  const lit = hover ?? (panelFocus && nodes.some((n) => n.id === panelFocus) ? panelFocus : null)
  const near = useMemo(() => {
    const s = new Set<string>()
    if (lit) {
      s.add(lit)
      edges.forEach((e) => {
        if (e.source === lit) s.add(e.target)
        if (e.target === lit) s.add(e.source)
      })
    }
    return s
  }, [lit, edges])
  const dim = (id: string) => (lit && !near.has(id) ? styles.dim : '')

  return (
    <>
      <div ref={light} className={styles.light} aria-hidden />
      <svg
        ref={svg}
        className={`${styles.svg} ${drag ? styles.live : ''}`}
        viewBox={`0 0 ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMin meet"
        role="group"
        aria-label={`Topics connected to ${current}`}
        onPointerMove={aim}
        onPointerLeave={unlight}
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

        {/* Empty space you can grab to pan (see usePanZoom). */}
        <rect data-pan className={styles.bg} x={-4000} y={-4000} width={8000} height={8000} />
        <g ref={layer}>
          {/* Where you land, light spreads out in rings. */}
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={1.5} className={styles.dust} />
          ))}
          <g
            key={`arrive:${current}`}
            transform={`translate(${byId.get(current)?.x ?? 0} ${byId.get(current)?.y ?? 0})`}
            pointerEvents="none"
            aria-hidden
          >
            <circle r={20} className={styles.ripple} />
            <circle r={20} className={`${styles.ripple} ${styles.ripple2}`} />
          </g>

          {leaving?.edges.map((e) => {
            const a = leaving.from.get(e.source)
            const b = leaving.from.get(e.target)
            if (!a || !b) return null
            return (
              <path
                key={`out:${edgeKey(e)}`}
                d={curve(a, b)}
                pathLength={1}
                className={`${styles.edge} ${styles.edgeOut} ${e.kind === 'trail' ? styles.trail : ''}`}
              />
            )
          })}

          {edges.map((e) => {
            const a = byId.get(e.source)
            const b = byId.get(e.target)
            if (!a || !b) return null
            const active = !lit || e.source === lit || e.target === lit
            const [oa, ob] = [offset(a.id), offset(b.id)]
            const d = curve({ x: a.x + oa.x, y: a.y + oa.y }, { x: b.x + ob.x, y: b.y + ob.y })
            return (
              <path
                key={edgeKey(e)}
                d={d}
                pathLength={1}
                // CSS `d` lets Chrome animate the curve; other browsers snap via the attribute above.
                style={
                  {
                    d: `path("${d}")`,
                    ...(e.kind === 'trail' && {
                      strokeOpacity: Math.max(0.25, 0.9 - a.age * 0.04),
                    }),
                  } as CSSProperties
                }
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
                style={
                  {
                    '--tx': `${leaving.to.x - n.x}px`,
                    '--ty': `${leaving.to.y - n.y}px`,
                  } as CSSProperties
                }
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
                style={
                  {
                    transform: `translate(${n.x}px, ${n.y}px)`,
                    '--fade': Math.max(0.4, 1 - n.age * 0.05),
                  } as CSSProperties
                }
                className={`${styles.place} ${styles[n.state]} ${dim(n.id)} ${lit === n.id ? styles.lit : ''}`}
                role={isCurrent ? undefined : 'link'}
                tabIndex={isCurrent ? undefined : 0}
                aria-label={isCurrent ? undefined : `Go to ${n.id}`}
                data-nb={n.state === 'discoverable' ? '' : undefined}
                onClick={isCurrent ? undefined : () => !justDragged.current && onSelect(n.id)}
                onKeyDown={(e) => {
                  if (!isCurrent && e.key === 'Enter') onSelect(n.id)
                }}
                onPointerDown={isCurrent ? undefined : (e) => startDrag(n.id, e)}
                onPointerMove={isCurrent ? undefined : moveDrag}
                onPointerUp={isCurrent ? undefined : endDrag}
                onPointerCancel={isCurrent ? undefined : endDrag}
                onMouseEnter={(e) => enter(n.id, e)}
                onMouseLeave={leave}
                onFocus={(e) => enter(n.id, e)}
                onBlur={leave}
              >
                <g transform={`translate(${offset(n.id).x} ${offset(n.id).y})`}>
                  <circle r={22} className={styles.hit} />
                  <g className={styles.node}>
                    <Shape n={n} kind={kinds[n.id]} />
                  </g>
                </g>
              </g>
            )
          })}
        </g>
      </svg>
      <div className={styles.dock}>
        <div className={styles.dockButtons}>
          {journey && (
            <button
              type="button"
              className={styles.journey}
              onClick={() => goTo(fitAll(view, nodes))}
            >
              Whole journey
            </button>
          )}
          <button type="button" className={styles.resetView} onClick={reset}>
            Reset view
          </button>
        </div>
        {journey && (
          <Minimap
            nodes={nodes}
            edges={edges}
            view={view}
            home={layout.home}
            camera={camera}
            watch={watch}
            onJump={(p, smooth) => {
              // Put the chosen spot in the middle of the part of the screen the panel leaves free.
              const k = scale()
              const { left, right, top, bottom } = view.room
              goTo({ k, x: (left + right) / 2 - p.x * k, y: (top + bottom) / 2 - p.y * k }, smooth)
            }}
          />
        )}
      </div>
      {peek && <Peek anchor={peek} />}
    </>
  )
})
