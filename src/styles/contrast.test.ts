import { readFileSync } from 'node:fs'

const css = readFileSync('src/styles/tokens.css', 'utf8')

/** The `--name: #hex` pairs in the first rule that follows `selector`. */
function tokens(selector: string) {
  const block = css.slice(css.indexOf(selector)).match(/\{([^}]*)\}/)?.[1] ?? ''
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]),
  )
}

const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

const light = tokens(':root {')
const dark = { ...light, ...tokens(":root[data-theme='dark']") }

// WCAG AA: 4.5 for text, 3 for the shapes you have to see (nodes, the thread, outlines).
const TEXT: [string, string][] = [
  ['--ink', '--ground'],
  ['--ink', '--card'],
  ['--ink-2', '--ground'],
  ['--ink-2', '--card'],
  ['--ink-3', '--ground'],
  ['--ink-3', '--card'],
  ['--ink-3', '--raise'],
  ['--on-thread', '--thread'],
]
const SHAPES: [string, string][] = [
  ['--thread', '--ground'],
  ['--thread', '--card'],
  ['--haze', '--ground'],
  ['--haze', '--card'],
]

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme', (_name, t) => {
  it.each(TEXT)('%s on %s reads as text (4.5:1)', (fg, bg) => {
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5)
  })
  it.each(SHAPES)('%s against %s stands out (3:1)', (fg, bg) => {
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(3)
  })
})
