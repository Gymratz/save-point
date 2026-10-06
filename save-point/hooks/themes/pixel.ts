// A pixel canvas drawn into a Raster: two pixels per terminal cell with the
// upper half block (foreground = top pixel, background = bottom pixel), plus
// text cells over it. Pure.

import type { Palette, Sprite } from './types'

const UPPER = 0x2580
const LOWER = 0x2584
const SPACE = 0x20
/** The terminal's own color. */
export const DEFAULT = 0x01000000

export function hex(color: string | undefined): number | null {
  if (!color) return null
  const m = /^#?([0-9a-f]{6})$/i.exec(color)
  return m ? parseInt(m[1] ?? '0', 16) : null
}

type TextCell = { ch: number; fg: number; bg: number | null }

export class Canvas {
  readonly px: (number | null)[]
  readonly text = new Map<number, TextCell>()

  constructor(
    readonly cols: number,
    readonly rows: number,
  ) {
    this.px = new Array(cols * rows * 2).fill(null)
  }

  get width() {
    return this.cols
  }

  get height() {
    return this.rows * 2
  }

  set(x: number, y: number, color: number | null) {
    if (color === null || x < 0 || y < 0 || x >= this.width || y >= this.height) return
    this.px[y * this.width + x] = color
  }

  rect(x: number, y: number, w: number, h: number, color: number | null) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color)
  }

  /** Draws `sprite` with its top-left at (x, y); `swap` renames palette entries first. */
  sprite(s: Sprite | undefined, x: number, y: number, pixels: Palette, swap: Record<string, string> = {}, flip = false, flipY = false, tint?: (c: number) => number) {
    if (!s) return
    const h = s.rows.length
    s.rows.forEach((row, j) => {
      const chars = [...row]
      chars.forEach((ch, i) => {
        const name = pixelName(s, ch)
        if (name === null) return
        const raw = hex(pixels[swap[name] ?? name] ?? name)
        const color = raw !== null && tint ? tint(raw) : raw
        this.set(x + (flip ? chars.length - 1 - i : i), y + (flipY ? h - 1 - j : j), color)
      })
    })
  }

  /** Text at a cell (column, row); background from the pixels beneath unless given. */
  write(col: number, row: number, s: string, fg: number, bg: number | null = null) {
    let c = col
    for (const ch of s) {
      if (c >= 0 && c < this.cols && row >= 0 && row < this.rows) {
        this.text.set(row * this.cols + c, { ch: ch.codePointAt(0) ?? SPACE, fg, bg })
      }
      c++
    }
  }

  /** The Raster's `cells`: base64 of `[codePoint, fg, bg]` u32 triplets, row-major. */
  encode(): string {
    const words = new Uint32Array(this.cols * this.rows * 3)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = (r * this.cols + c) * 3
        const top = this.px[r * 2 * this.width + c] ?? null
        const bottom = this.px[(r * 2 + 1) * this.width + c] ?? null
        const t = this.text.get(r * this.cols + c)
        if (t) {
          words[i] = t.ch
          words[i + 1] = t.fg
          words[i + 2] = t.bg ?? bottom ?? top ?? DEFAULT
        } else if (top === null && bottom === null) {
          words[i] = SPACE
          words[i + 1] = DEFAULT
          words[i + 2] = DEFAULT
        } else if (top === null) {
          words[i] = LOWER
          words[i + 1] = bottom ?? DEFAULT
          words[i + 2] = DEFAULT
        } else {
          words[i] = UPPER
          words[i + 1] = top
          words[i + 2] = bottom ?? DEFAULT
        }
      }
    }
    return toBase64(new Uint8Array(words.buffer))
  }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)
    out += B64[(n >> 18) & 63]
    out += B64[(n >> 12) & 63]
    out += b === undefined ? '=' : B64[(n >> 6) & 63]
    out += c === undefined ? '=' : B64[n & 63]
  }
  return out
}

/** The palette name a sprite's character draws with; null when it is transparent. */
export function pixelName(s: Sprite, ch: string): string | null {
  const legend = s.legend
  if (legend && ch in legend) return legend[ch] ?? null
  return ch === '.' || ch === ' ' ? null : ch
}

const inks = new WeakMap<Sprite, { x0: number; y0: number; x1: number; y1: number } | null>()

/** The box around a sprite's drawn pixels (`x1`, `y1` exclusive); null when it draws nothing. */
export function inkBox(s: Sprite): { x0: number; y0: number; x1: number; y1: number } | null {
  const hit = inks.get(s)
  if (hit !== undefined) return hit
  let box: { x0: number; y0: number; x1: number; y1: number } | null = null
  s.rows.forEach((row, j) => {
    ;[...row].forEach((ch, i) => {
      if (pixelName(s, ch) === null) return
      box = box ? { x0: Math.min(box.x0, i), y0: Math.min(box.y0, j), x1: Math.max(box.x1, i + 1), y1: Math.max(box.y1, j + 1) } : { x0: i, y0: j, x1: i + 1, y1: j + 1 }
    })
  })
  inks.set(s, box)
  return box
}

/** Width and height in pixels of a sprite. */
export function size(s: Sprite | undefined): { w: number; h: number } {
  if (!s) return { w: 0, h: 0 }
  return { w: Math.max(0, ...s.rows.map(r => [...r].length)), h: s.rows.length }
}

/**
 * A sprite turned a quarter: `ccw` lays a standing figure down with its head
 * to the left, `cw` with its head to the right. Blank rows are trimmed so the
 * result rests on the ground.
 */
export function rotate(s: Sprite, dir: 'cw' | 'ccw'): Sprite {
  const rows = [...quarter(s, dir).rows]
  const blank = (r: string) => /^[. ]*$/.test(r)
  while (rows.length && blank(rows[0]!)) rows.shift()
  while (rows.length && blank(rows[rows.length - 1]!)) rows.pop()
  return { rows, ...(s.legend ? { legend: s.legend } : {}) }
}

const quarters = new WeakMap<Sprite, { cw?: Sprite; ccw?: Sprite }>()

/**
 * A sprite turned a quarter, every pixel kept (w x h becomes h x w): `cw`
 * points its top to the right, `ccw` to the left. Turned once per sprite.
 */
export function quarter(s: Sprite, dir: 'cw' | 'ccw'): Sprite {
  const hit = quarters.get(s)?.[dir]
  if (hit) return hit
  const grid = s.rows.map(r => [...r])
  const h = grid.length
  const w = Math.max(0, ...grid.map(r => r.length))
  const at = (x: number, y: number) => grid[y]?.[x] ?? '.'
  const rows: string[] = []
  for (let y = 0; y < w; y++) {
    let row = ''
    for (let x = 0; x < h; x++) row += dir === 'ccw' ? at(w - 1 - y, x) : at(y, h - 1 - x)
    rows.push(row)
  }
  const turned: Sprite = { rows, ...(s.legend ? { legend: s.legend } : {}) }
  quarters.set(s, { ...quarters.get(s), [dir]: turned })
  return turned
}
