import { hopLabel } from './hops'
import { layoutPoster, POSTER, type PosterNote } from './posterLayout'

const SCALE = 2 // drawn at twice the size so it stays sharp when printed
const DISPLAY = '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif'
const TEXT = 'Newsreader, Georgia, serif'

/** Break text into at most `maxLines` lines that fit `width`, ending the last with an ellipsis if cut. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const lines: string[] = []
  let line = ''
  const words = text.split(/\s+/)
  for (const [i, word] of words.entries()) {
    const next = line ? `${line} ${word}` : word
    if (!line || ctx.measureText(next).width <= width) {
      line = next
      continue
    }
    lines.push(line)
    line = word
    if (lines.length === maxLines - 1) {
      line = words.slice(i).join(' ')
      break
    }
  }
  lines.push(line)
  const last = lines[maxLines - 1]
  if (lines.length === maxLines && last !== undefined && ctx.measureText(last).width > width) {
    let cut = last
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1)
    lines[maxLines - 1] = `${cut}…`
  }
  return lines.slice(0, maxLines)
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  note: PosterNote,
  last: boolean,
  c: (token: string) => string,
) {
  ctx.save()
  ctx.translate(note.x + note.w / 2, note.y)
  ctx.rotate((note.tilt * Math.PI) / 180)

  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)'
  ctx.shadowBlur = 22
  ctx.shadowOffsetY = 12
  ctx.fillStyle = c('--card')
  ctx.fillRect(-note.w / 2, 0, note.w, note.h)
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = c('--line-2')
  ctx.lineWidth = 1
  ctx.strokeRect(-note.w / 2, 0, note.w, note.h)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = c('--ink-3')
  ctx.font = `italic 400 22px ${TEXT}`
  ctx.fillText(String(note.index + 1), -note.w / 2 + 18, 40)

  ctx.fillStyle = c('--ink')
  ctx.font = `700 27px ${DISPLAY}`
  wrap(ctx, note.title, note.w - 36, 3).forEach((line, i) => {
    ctx.fillText(line, -note.w / 2 + 18, 76 + i * 31)
  })

  // The pin: red for where the trail ended, navy with a red ring for the places it passed.
  ctx.beginPath()
  ctx.arc(0, 0, last ? 11 : 9, 0, Math.PI * 2)
  ctx.fillStyle = last ? c('--thread') : c('--ink')
  ctx.fill()
  if (!last) {
    ctx.strokeStyle = c('--thread')
    ctx.lineWidth = 2.5
    ctx.stroke()
  }
  ctx.restore()
}

/** Draws a trail as a pinboard poster in the app's current colours and returns it as a PNG. */
export async function renderPoster(steps: string[], when = new Date()): Promise<Blob> {
  const { width, margin } = POSTER
  const layout = layoutPoster(steps)
  const { height } = layout
  const style = getComputedStyle(document.documentElement)
  const c = (token: string) => style.getPropertyValue(token).trim()

  // The canvas can only use fonts the page has already fetched; ask for the ones the poster needs.
  await Promise.all([
    document.fonts.load(`760 64px ${DISPLAY}`),
    document.fonts.load(`700 27px ${DISPLAY}`),
    document.fonts.load(`italic 400 22px ${TEXT}`),
  ]).catch(() => undefined)

  const canvas = document.createElement('canvas')
  canvas.width = width * SCALE
  canvas.height = height * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.scale(SCALE, SCALE)

  ctx.fillStyle = c('--ground')
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = c('--ink')
  ctx.globalAlpha = 0.15
  for (let x = 12; x < width; x += 24) {
    for (let y = 12; y < height; y += 24) ctx.fillRect(x, y, 1.6, 1.6)
  }
  ctx.globalAlpha = 1

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = c('--ink-2')
  ctx.font = `700 26px ${DISPLAY}`
  ctx.fillText('SideTracked', margin, 92)

  const first = steps[0] ?? ''
  const last = steps.at(-1) ?? ''
  ctx.fillStyle = c('--ink')
  ctx.font = `760 62px ${DISPLAY}`
  const heading = steps.length > 1 ? `${first} to ${last}` : first
  const headLines = wrap(ctx, heading, width - margin * 2, 2)
  headLines.forEach((line, i) => ctx.fillText(line, margin, 160 + i * 66))

  ctx.fillStyle = c('--ink-3')
  ctx.font = `italic 400 26px ${TEXT}`
  const date = when.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  ctx.fillText(`${hopLabel(steps.length)}, ${date}`, margin, 160 + headLines.length * 66 + 6)

  if (layout.thread) {
    ctx.strokeStyle = c('--thread')
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.stroke(new Path2D(layout.thread))
  }
  layout.notes.forEach((n) => drawNote(ctx, n, n.index === steps.length - 1, c))

  ctx.fillStyle = c('--ink-3')
  ctx.font = `italic 400 24px ${TEXT}`
  ctx.fillText('One thing leads to another.', margin, height - 70)
  ctx.textAlign = 'right'
  ctx.fillText('side-tracked.vercel.app', width - margin, height - 70)

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no image'))), 'image/png'),
  )
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)

/** Makes the poster for a trail and hands it to the browser as a download. */
export async function downloadPoster(steps: string[]) {
  const blob = await renderPoster(steps)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `sidetracked-${slug(steps[0] ?? 'trail')}-to-${slug(steps.at(-1) ?? 'trail')}.png`
  // Firefox only follows links that are in the page, and some browsers cancel a download whose URL is freed at once.
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
