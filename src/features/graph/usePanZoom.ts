import { useCallback, useEffect, useRef, type RefObject } from 'react'

export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 3

export type Transform = { k: number; x: number; y: number }
const HOME: Transform = { k: 1, x: 0, y: 0 }

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Pure: the transform after zooming by `factor` around point (px, py), given in the svg's own coordinates. */
export function zoomAround(t: Transform, factor: number, px: number, py: number): Transform {
  const k = clamp(t.k * factor, MIN_ZOOM, MAX_ZOOM)
  const ratio = k / t.k
  return { k, x: px - (px - t.x) * ratio, y: py - (py - t.y) * ratio }
}

/**
 * Wheel to zoom, drag the background to pan, double-click the background to reset. The transform is
 * written straight to `layer`, so moving the view never re-renders React. `resetKey` snaps the
 * view home when it changes (the topic did). Only elements marked `data-pan` start a pan.
 * While the view is off home the svg carries `data-moved`, which CSS uses to show a Reset button.
 */
export function usePanZoom(
  svg: RefObject<SVGSVGElement | null>,
  layer: RefObject<SVGGElement | null>,
  resetKey: unknown,
) {
  const t = useRef<Transform>(HOME)
  const place = useRef<(next: Transform, smooth?: boolean) => void>(() => {})

  const reset = useCallback(() => place.current(HOME, true), [])
  useEffect(() => place.current(HOME), [resetKey])

  useEffect(() => {
    const el = svg.current
    if (!el) return
    const apply = (next: Transform, smooth = false) => {
      t.current = next
      const g = layer.current
      if (!g) return
      g.style.setProperty('transition', smooth ? 'transform 0.5s var(--ease)' : 'none')
      g.style.setProperty('transform', `translate(${next.x}px, ${next.y}px) scale(${next.k})`)
      const home = next.k === HOME.k && next.x === HOME.x && next.y === HOME.y
      if (home) delete el.dataset.moved
      else el.dataset.moved = ''
    }
    place.current = apply

    /** Pixels on screen per unit of svg coordinates. */
    const unit = () => el.getScreenCTM()?.a ?? 1
    const toSvg = (cx: number, cy: number) => {
      const m = el.getScreenCTM()
      return m ? { x: (cx - m.e) / m.a, y: (cy - m.f) / m.d } : { x: 0, y: 0 }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const p = toSvg(e.clientX, e.clientY)
      apply(zoomAround(t.current, Math.exp(-e.deltaY * 0.0015), p.x, p.y))
    }

    let pan: { id: number; cx: number; cy: number; from: Transform } | null = null
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !(e.target as Element).hasAttribute('data-pan')) return
      pan = { id: e.pointerId, cx: e.clientX, cy: e.clientY, from: t.current }
      el.setPointerCapture(e.pointerId)
      el.dataset.panning = ''
    }
    const onMove = (e: PointerEvent) => {
      if (!pan || e.pointerId !== pan.id) return
      const s = unit()
      apply({
        ...pan.from,
        x: pan.from.x + (e.clientX - pan.cx) / s,
        y: pan.from.y + (e.clientY - pan.cy) / s,
      })
    }
    const onUp = (e: PointerEvent) => {
      if (!pan || e.pointerId !== pan.id) return
      pan = null
      delete el.dataset.panning
    }
    const onDouble = (e: MouseEvent) => {
      if ((e.target as Element).hasAttribute('data-pan')) apply(HOME, true)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('dblclick', onDouble)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('dblclick', onDouble)
    }
  }, [svg, layer])

  /** Zoom factor now in effect, for turning screen pixels into svg units. */
  const scale = useCallback(() => t.current.k, [])
  return { reset, scale }
}
