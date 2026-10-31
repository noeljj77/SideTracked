import type { Kind } from '@/domain/kind'
import styles from './KindGlyph.module.css'

// 12x12 outline icons, one per kind. Colour comes from the parent via currentColor.
const SHAPES: Record<Kind, React.ReactNode> = {
  person: (
    <>
      <circle cx="6" cy="3.6" r="2.1" />
      <path d="M1.8 11c0-2.6 1.9-4.1 4.2-4.1s4.2 1.5 4.2 4.1" />
    </>
  ),
  place: (
    <>
      <path d="M6 11.2S2 7.4 2 4.7a4 4 0 0 1 8 0C10 7.4 6 11.2 6 11.2z" />
      <circle cx="6" cy="4.7" r="1.2" />
    </>
  ),
  event: <path d="M6 1l1.2 3.8L11 6 7.2 7.2 6 11 4.8 7.2 1 6l3.8-1.2z" />,
  idea: (
    <>
      <path d="M6 1.2a3.5 3.5 0 0 0-1.8 6.5V9h3.6V7.7A3.5 3.5 0 0 0 6 1.2z" />
      <path d="M4.8 10.9h2.4" />
    </>
  ),
  thing: <path d="M6 1l4 2.3v4.4L6 10 2 7.7V3.3z" />,
}

export const KIND_LABEL: Record<Kind, string> = {
  person: 'Person',
  place: 'Place',
  event: 'Event',
  idea: 'Idea',
  thing: 'Thing',
}

type Props = { kind: Kind; size?: number; x?: number; y?: number }

/** Works inside an SVG (give x, y) or on its own in HTML. Decorative: the kind is named in text elsewhere. */
export function KindGlyph({ kind, size = 13, x, y }: Props) {
  return (
    <svg className={styles.glyph} x={x} y={y} width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      {SHAPES[kind]}
    </svg>
  )
}
