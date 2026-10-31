import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useTopic } from '@/api/wikipedia/queries'
import styles from './Peek.module.css'

/** Where the hovered node sits on screen (px). */
export type PeekAnchor = { id: string; x: number; top: number; bottom: number }

const WIDTH = 280
/** Room the card needs above the node; below that it opens downwards instead. */
const ROOM_ABOVE = 170

/** A small card with a thumbnail and the first lines of the summary, so you can decide before stepping. */
export function Peek({ anchor }: { anchor: PeekAnchor }) {
  const { data } = useTopic(anchor.id)
  const left = Math.min(Math.max(anchor.x, WIDTH / 2 + 12), window.innerWidth - WIDTH / 2 - 12)
  const above = anchor.top > ROOM_ABOVE
  const place: CSSProperties = above
    ? { left, bottom: window.innerHeight - anchor.top + 8 }
    : { left, top: anchor.bottom + 8 }

  // Rendered in a portal so the idle-dimming of the page chrome does not touch it.
  return createPortal(
    <div className={styles.peek} style={{ ...place, width: WIDTH }} aria-hidden>
      {data?.thumbnail && <img className={styles.thumb} src={data.thumbnail} alt="" />}
      <div className={styles.text}>
        <p className={styles.title}>{data?.title ?? anchor.id}</p>
        <p className={styles.summary}>{data ? data.summary : 'Reading…'}</p>
      </div>
    </div>,
    document.body,
  )
}
