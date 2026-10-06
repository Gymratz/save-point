// "Twenty Thousand Tokens Under the Sea": an original theme. Context used is
// depth: the water darkens from sunlit turquoise to the black abyss as the
// conversation fills. The model is the vessel (snorkeler, diver, the Nautilus,
// the Leviathan), effort is the lamp, the cache is air, cents are pearls.
//
// Sprites are built two ways: small figures are drawn by hand (rows of
// characters, a legend per sprite), large hulls are shaded in code (a profile,
// a light ramp per material and a 4x4 ordered dither), then flattened into the
// same rows-and-legend form.

import { at, hero, loop, mixHex, once, weapon } from './kit'
import type { Actor, HeroTier, Sprite, Theme } from './types'

// ---------------------------------------------------------------------------
// Palette: ramps of shades, lightest first
// ---------------------------------------------------------------------------

const pixels: Record<string, string> = {}
const R = (prefix: string, colors: string[]): string[] =>
  colors.map((c, i) => {
    pixels[prefix + i] = c
    return prefix + i
  })
const C = (name: string, color: string): string => {
  pixels[name] = color
  return name
}

const HULL = R('hull', ['#e4f0f2', '#b4ccd4', '#8aa8b6', '#6a8898', '#4f6b7c', '#385262', '#243a48', '#15242f'])
const BRASS = R('brass', ['#fff4c4', '#f6d68a', '#dcae58', '#b4843a', '#865c24', '#5a3c14', '#3a260a'])
const GLOW = R('glow', ['#ffffff', '#fff6c8', '#ffe08a', '#ffbe5a', '#ff9440', '#e0682a'])
const DIMG = R('dimg', ['#5a7c98', '#3a5a76', '#24405a', '#162a3c'])
const LEVI = R('levi', ['#8f80ec', '#6e5cd0', '#5242b2', '#3c2e94', '#2b2074', '#1e1556', '#140d3a', '#0a0622'])
const BIO = R('bio', ['#f0ffff', '#a8fff8', '#5ef0f0', '#2cc4d8', '#1a8aa8'])
const BELL = R('bell', ['#ffffff', '#dce6ec', '#b0c0cc', '#8898a8', '#647484', '#46545f', '#2c363f'])
const SAND = R('sand', ['#e8d6a8', '#cbb682', '#a89464', '#86744c', '#665636', '#463a24'])
const KELP = R('kelp', ['#c8e070', '#98c048', '#6c9a30', '#4a7420', '#2e5014', '#1a320a'])
const CORAL = R('coral', ['#ffd0c0', '#ff9c84', '#f06a62', '#c84458', '#8c2a44'])
const ROCK = R('rock', ['#a8b4bc', '#84909a', '#646e78', '#48525c', '#323a42', '#1e242a'])
const SKIN = R('skin', ['#ffe0c4', '#f6c49a', '#d8946a', '#a8643e'])
const GLASS = R('glass', ['#f0feff', '#b8f0ff', '#6cd0ec', '#3592c0', '#1e5a84'])
const WET = R('wet', ['#7890a8', '#52667e', '#3a4a60', '#263244', '#151d2a'])
const TEAL = R('teal', ['#c0fff4', '#5ff0e0', '#22b8ac', '#147a74'])
const YEL = R('yel', ['#fff8c0', '#ffe060', '#f0b428', '#c08014', '#8a5408'])
const ORG = R('org', ['#ffd0a0', '#ffa048', '#e0701e', '#a84810'])
const TRK = R('trk', ['#7ff0e0', '#30c0b0', '#178a80', '#0e5c56'])
const HAIR = R('hair', ['#b06a30', '#7a4220', '#4a2410'])
const JEL = R('jel', ['#fff0ff', '#ffc0f0', '#f08ce0', '#c060c8', '#8a3aa0'])
const GOLD = R('gold', ['#fffbe0', '#ffe880', '#ffc830', '#e09a18', '#a86a10', '#6a400a'])
const WOOD = R('wood', ['#c89060', '#9a6438', '#704422', '#4a2a14', '#2e1a0c'])
const PEARL = R('pearl', ['#ffffff', '#fdf0f6', '#e8d0e2', '#c0a0bc', '#806484'])
const CLAM = R('clam', ['#efe0ec', '#c8acd0', '#9a7ca8', '#6a5080', '#40304e'])
const SPARK = R('spark', ['#ffffff', '#fff8b0', '#ffd050', '#ff8a30', '#e05020'])
const ARC = R('arc', ['#ffffff', '#d8f4ff', '#8ad8ff', '#4a9cff'])
const PING = R('ping', ['#f0ffff', '#a0f6ff', '#58dcf2', '#2eaad2', '#1a76a6'])
const PAPER = R('paper', ['#fbf3dc', '#e6d6b0', '#b8a47e', '#6e5c44'])
const LEATHER = R('lea', ['#a8503a', '#7a3424', '#4e1e14'])
const CANDLE = R('cdl', ['#fff4c0', '#ffd070', '#ffa040', '#f07828', '#c85018'])
const OIL = R('oil', ['#fffbe0', '#ffe89a', '#ffd060', '#f0b040', '#d08a28'])
const ARCL = R('arcl', ['#ffffff', '#e4f6ff', '#b8e4ff', '#88c8f8', '#5aa0e0'])
const SEARCH = R('srch', ['#ffffff', '#f6fffa', '#dcfff0', '#b0f4e4', '#7ee0d8'])
const SUN = R('sun', ['#ffffff', '#fffbe6', '#fff2b0', '#ffe27a', '#ffc848'])
const INK = C('ink', '#0a141c')
const WHITE = C('white', '#ffffff')
const MASK = C('maskF', '#22303c')
const HOSE = C('hose', '#18222c')
const BELT = C('belt', '#3a3f46')
const CAP = C('capRed', '#d8343a')
const CAPD = C('capDark', '#9a1c24')
C('stingW', '#fff4fa')
// Status bar and the air gauge
C('barBg', '#061420')
C('barText', '#e8f8ff')
C('barLabel', '#6fd4ec')
C('chart', '#1d4a66')
C('chartDot', '#ffd060')
C('airFull', '#8ff4ff')
C('airEmpty', '#2c5a72')
C('airCold', '#56626c')
// The lamp box: a lantern whose flame matches the effort
C('mlGlow', '#ffe08a')
C('mlCore', '#ffffff')

// ---------------------------------------------------------------------------
// A tiny raster for building sprites in code
// ---------------------------------------------------------------------------

type Cell = string | null
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&*+-=?@^_~<>/|:;,'

class Pix {
  g: Cell[][]
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.g = Array.from({ length: h }, () => new Array<Cell>(w).fill(null))
  }
  in(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h
  }
  set(x: number, y: number, n: Cell) {
    if (this.in(x, y)) this.g[y]![x] = n
  }
  get(x: number, y: number): Cell {
    return this.in(x, y) ? this.g[y]![x]! : null
  }
  stamp(rows: string[], legend: Record<string, string | null>, ox = 0, oy = 0) {
    rows.forEach((r, j) =>
      [...r].forEach((ch, i) => {
        if (ch === '.' || ch === ' ') return
        this.set(ox + i, oy + j, ch in legend ? legend[ch]! : ch)
      }),
    )
  }
  sprite(): Sprite {
    const map = new Map<string, string>()
    const legend: Record<string, string> = {}
    const rows = this.g.map(r =>
      r
        .map(n => {
          if (!n) return '.'
          let ch = map.get(n)
          if (!ch) {
            ch = POOL[map.size]!
            map.set(n, ch)
            legend[ch] = n
          }
          return ch
        })
        .join(''),
    )
    return { rows, legend }
  }
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const bayer = (x: number, y: number) => (BAYER[((y & 3) << 2) | (x & 3)]! + 0.5) / 16
const clamp = (v: number) => Math.max(0, Math.min(1, v))
/** The ramp shade for `v` (0 = lightest), dithered between neighbors. */
function shade(ramp: string[], v: number, x: number, y: number): string {
  const f = clamp(v) * (ramp.length - 1)
  const i = Math.floor(f)
  return ramp[Math.min(ramp.length - 1, i + (f - i > bayer(x, y) ? 1 : 0))]!
}
const spr = (rows: string[], legend: Record<string, string | null>): Sprite => ({ rows, legend })
/** Drops blank rows at the bottom so the sprite rests on the ground. */
function settle(s: Sprite): Sprite {
  const rows = [...s.rows]
  while (rows.length && /^[. ]*$/.test(rows[rows.length - 1]!)) rows.pop()
  return { ...s, rows }
}

type Light = 'on' | 'dim' | 'blaze'
const lit = (light: Light, on: string, dim: string, blaze: string) => (light === 'on' ? on : light === 'dim' ? dim : blaze)

// ---------------------------------------------------------------------------
// The Nautilus (Opus): a riveted steel cigar with brass strakes, glowing
// portholes, a pilothouse with a lantern, a serrated spine and a propeller.
// 24 by 18, its keel fins on the seabed.
// ---------------------------------------------------------------------------

function nautilus(o: { prop: 0 | 1; light: Light; arm?: boolean; hatch?: boolean }): Sprite {
  const W = 24
  const H = 18
  const p = new Pix(W, H)
  const cy = 10.5
  const xs = 2.5
  const xm = 10
  const xb = 23.6
  const R0 = 4.9
  const half = (x: number) => {
    if (x < xs || x > xb) return -1
    if (x <= xm) {
      const u = (xm - x) / (xm - xs)
      return R0 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.2)), 0.55)
    }
    const u = (x - xm) / (xb - xm)
    return R0 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.1)), 0.62)
  }
  const inside = (x: number, y: number) => {
    const hh = half(x + 0.5)
    return hh > 0.4 && Math.abs(y + 0.5 - cy) <= hh
  }
  const vOf = (x: number, y: number) => {
    const hh = half(x + 0.5)
    return (y + 0.5 - (cy - hh)) / (2 * hh)
  }
  const uOf = (x: number) => (x + 0.5 < xm ? (xm - x - 0.5) / (xm - xs) : (x + 0.5 - xm) / (xb - xm))

  // Stern fins first, the hull overlaps their roots.
  for (const [x, y0, y1] of [
    [3, 3, 8],
    [4, 4, 8],
    [5, 5, 8],
    [6, 6, 8],
    [3, 13, 16],
    [4, 13, 15],
    [5, 13, 14],
  ] as const) {
    for (let y = y0; y <= y1; y++) p.set(x, y, shade(HULL, 0.35 + (y - y0) * 0.08 + (x - 3) * 0.05, x, y))
    p.set(x, y0, HULL[6]!)
  }
  p.set(2, 3, HULL[6]!)
  p.set(2, 16, HULL[6]!)

  // The hull, lit from the surface above.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue
      const v = vOf(x, y)
      const u = uOf(x)
      let s = 0.1 + 0.82 * v
      if (v > 0.12 && v < 0.3) s -= 0.14
      s += 0.16 * u * u
      p.set(x, y, shade(HULL, s, x, y))
    }
  }
  // Plate seams with a darker line.
  for (const sx of [6, 10, 14, 18]) {
    for (let y = 0; y < H; y++) {
      if (!inside(sx, y)) continue
      const v = vOf(sx, y)
      if (v > 0.12 && v < 0.9) p.set(sx, y, shade(HULL, 0.32 + 0.7 * v, sx, y))
    }
  }
  // A brass strake along the hull, riveted.
  for (let x = 4; x <= 21; x++) {
    if (!inside(x, 13) || !inside(x, 12)) continue
    p.set(x, 13, x % 3 === 0 ? BRASS[0]! : shade(BRASS, 0.3 + 0.35 * uOf(x), x, 13))
    p.set(x, 14, inside(x, 14) ? BRASS[5]! : null)
  }
  // A brass nose cone and a brass ring at the stern.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue
      if (x >= 20 || x === 4) p.set(x, y, shade(BRASS, 0.08 + 0.85 * vOf(x, y) - (vOf(x, y) < 0.3 ? 0.1 : 0), x, y))
      if (x === 19) p.set(x, y, BRASS[5]!)
    }
  // Outline: dark all round, a bright catch-light just under the top edge.
  const rim: [number, number, string][] = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue
      const up = inside(x, y - 1)
      const dn = inside(x, y + 1)
      const lf = inside(x - 1, y)
      const rt = inside(x + 1, y)
      if (!up || !dn || !lf || !rt) rim.push([x, y, HULL[7]!])
      else if (!inside(x, y - 2)) rim.push([x, y, x % 2 || x > 19 ? HULL[0]! : HULL[1]!])
    }
  }
  for (const [x, y, n] of rim) p.set(x, y, n)
  // A serrated spine along the back.
  for (let x = 4; x <= 21; x += 2) {
    if (x >= 9 && x <= 15) continue
    let top = 0
    while (top < H && !inside(x, top)) top++
    p.set(x, top - 1, HULL[5]!)
  }

  // Pilothouse with a lit window slit, brass cap.
  const tower = {
    a: BRASS[0]!,
    B: BRASS[2]!,
    b: BRASS[4]!,
    k: HULL[7]!,
    L: HULL[1]!,
    l: HULL[2]!,
    H: HULL[3]!,
    M: HULL[5]!,
    g: lit(o.light, GLOW[1]!, DIMG[1]!, GLOW[0]!),
    G: lit(o.light, GLOW[3]!, DIMG[2]!, GLOW[1]!),
  }
  p.stamp(['..kaBBbk..', '.kLlHHHMk.', 'kLlgggGGMk', 'kLlHHHHMMk', 'kLlHHHHMMk'], tower, 8, 2)
  if (!o.hatch) p.stamp(['nBn', 'bgb'], { n: BRASS[3]!, B: BRASS[1]!, b: BRASS[4]!, g: lit(o.light, GLOW[1]!, DIMG[1]!, GLOW[0]!) }, 11, 0)

  // Portholes: brass rings around glowing glass.
  const port = {
    a: BRASS[1]!,
    b: BRASS[2]!,
    c: BRASS[3]!,
    d: BRASS[5]!,
    X: lit(o.light, GLOW[1]!, DIMG[0]!, GLOW[0]!),
    Y: lit(o.light, GLOW[2]!, DIMG[1]!, GLOW[1]!),
    Z: lit(o.light, GLOW[4]!, DIMG[2]!, GLOW[2]!),
  }
  for (const x0 of [5, 10, 15]) p.stamp(['.ab.', 'aXYc', 'bYZc', '.cd.'], port, x0, 8)

  // The ram at the bow.
  p.stamp(['ab', 'bcd'], { a: BRASS[1]!, b: BRASS[2]!, c: BRASS[3]!, d: BRASS[4]! }, 21, 11)
  p.set(23, 11, BRASS[2]!)

  // The propeller turns.
  const blade = { a: BRASS[1]!, b: BRASS[2]!, c: BRASS[3]!, d: BRASS[4]!, h: HULL[6]!, m: HULL[2]! }
  if (o.prop === 0) p.stamp(['.a', '.b', '.c', 'hd', 'hd', '.c', '.b', '.d'], blade, 0, 7)
  else p.stamp(['..', 'm.', 'ab', 'cd', 'cd', 'bd', 'm.', '..'], blade, 0, 7)
  p.set(2, 10, BRASS[3]!)
  p.set(2, 11, BRASS[4]!)

  // The manipulator arm, reaching forward under the ram: an open claw at the bow.
  if (o.arm) p.stamp(['...cc', 'abb..', '...dc'], { a: BRASS[3]!, b: BRASS[2]!, c: BRASS[1]!, d: BRASS[4]! }, 19, 13)
  if (!o.hatch) return p.sprite()
  // The hatch is open and the captain stands in it, arms up, red cap on: two rows taller than the other poses.
  const q = new Pix(W, H + 2)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) q.set(x, y + 2, p.get(x, y))
  q.stamp(['s..s..', 'scCS.b', '.sSnb.', 'bBBb..'], { c: CAP, C: CAPD, s: SKIN[1]!, S: SKIN[2]!, n: BRASS[3]!, b: BRASS[4]!, B: BRASS[2]! }, 11, 0)
  return q.sprite()
}

// ---------------------------------------------------------------------------
// The Leviathan (Fable / Mythos): a living ship of the abyss. An indigo whale
// with a glass dome on its back, rows of photophores, a gold eye and a lure.
// 22 by 18.
// ---------------------------------------------------------------------------

function leviathan(o: { tail: 0 | 1; light: Light; gape?: boolean; eyeShut?: boolean; raise?: boolean; dangle?: boolean }): Sprite {
  // Dangling the lantern, the stalk swings out past the snout.
  const W = o.dangle ? 23 : 22
  const H = 18
  const p = new Pix(W, H)
  const cy = 10.5
  const xs = 3
  const xm = 14
  const xb = 21.8
  const half = (x: number) => {
    if (x < xs || x > xb) return -1
    if (x <= xm) {
      const u = (xm - x) / (xm - xs)
      return 1.3 + 3.9 * Math.pow(Math.max(0, 1 - Math.pow(u, 1.7)), 0.7)
    }
    const u = (x - xm) / (xb - xm)
    return 5.2 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.8)), 0.5)
  }
  const inside = (x: number, y: number) => {
    const hh = half(x + 0.5)
    return hh > 0.4 && Math.abs(y + 0.5 - cy) <= hh
  }
  // Tail flukes.
  const fluke = o.tail === 0
    ? ['....', 'a...', 'Ab..', '.Ab.', '..Ab', '..Ab', '..Ab', '.Ab.', 'Ab..', 'a...', '....']
    : ['a...', 'Ab..', '.Ab.', '..Ab', '..Ab', '..Ab', '.Ab.', '.Ab.', '..b.', '....', '....']
  p.stamp(fluke, { a: lit(o.light, BIO[2]!, LEVI[3]!, BIO[0]!), A: LEVI[4]!, b: LEVI[3]! }, 0, 5)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue
      const hh = half(x + 0.5)
      const v = (y + 0.5 - (cy - hh)) / (2 * hh)
      let s = 0.12 + 0.75 * v
      if (v > 0.1 && v < 0.28) s -= 0.12
      if (v > 0.78) s -= 0.18 // a paler belly
      p.set(x, y, shade(LEVI, s, x, y))
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue
      if (!inside(x, y - 1)) p.set(x, y, LEVI[2]!)
      else if (!inside(x, y + 1) || !inside(x + 1, y) || !inside(x - 1, y)) p.set(x, y, LEVI[7]!)
    }
  }
  const glow = (k: number) => lit(o.light, BIO[k]!, LEVI[4]!, BIO[Math.max(0, k - 1)]!)
  // Photophores along the flank and a glowing seam on the back.
  for (const x of [5, 7, 9, 11, 13, 15]) p.set(x, 12, glow(x % 4 === 1 ? 1 : 2))
  for (const x of [6, 8, 10, 12]) p.set(x, 14, glow(3))
  for (const x of [4, 6, 14, 16, 18]) {
    let top = 0
    while (top < H && !inside(x, top)) top++
    p.set(x, top + 1, glow(3))
  }
  p.set(19, 8, glow(1))
  p.set(20, 9, glow(2))
  // The pectoral fin.
  p.stamp(['abbb.', '.abbc', '..bcc'], { a: glow(3), b: LEVI[5]!, c: LEVI[6]! }, 11, 15)
  // The glass dome on its back, a warm cabin light inside.
  const dome = {
    r: BRASS[2]!,
    R: BRASS[4]!,
    y: BRASS[0]!,
    w: GLASS[0]!,
    g: GLASS[2]!,
    G: GLASS[3]!,
    o: lit(o.light, GLOW[2]!, DIMG[1]!, GLOW[0]!),
    O: lit(o.light, GLOW[4]!, DIMG[2]!, GLOW[2]!),
    k: INK,
  }
  p.stamp(['..gwg..', '.wgoGg.', '.gkOgG.', 'yrRrRry'], dome, 7, 3)
  // The eye, the mouth.
  if (o.eyeShut) {
    p.set(17, 9, LEVI[7]!)
    p.set(18, 9, LEVI[7]!)
  } else {
    p.set(17, 9, GOLD[2]!)
    p.set(18, 9, GOLD[0]!)
    p.set(17, 10, GOLD[4]!)
  }
  if (o.gape) {
    p.stamp(['kkkkk', 'wkwkw', 'kkkk.', '.wkw.'], { k: LEVI[7]!, w: BELL[1]! }, 16, 12)
  } else {
    for (let x = 15; x <= 21; x++) if (inside(x, 13)) p.set(x, 13, LEVI[7]!)
    p.set(18, 14, BELL[2]!)
    p.set(20, 14, BELL[2]!)
  }
  // The lure: a stalk from the brow, a glowing bulb out front.
  const stalk = LEVI[4]!
  if (o.raise) {
    p.stamp(['....B', '...Bs', '..s..', '.s...', 's....'], { s: stalk, B: lit(o.light, BIO[0]!, BIO[3]!, WHITE) }, 16, 0)
  } else if (o.dangle) {
    // No bulb: the lamp of the day hangs here (the form's `hand`).
    p.stamp(['..sss..', '.s...s.', 's.....s', '......s', '......s'], { s: stalk }, 16, 2)
  } else {
    p.stamp(['..sss.', '.s...s', 's....B', '.....b'], { s: stalk, B: lit(o.light, BIO[0]!, BIO[3]!, WHITE), b: lit(o.light, BIO[2]!, LEVI[4]!, BIO[0]!) }, 16, 2)
  }
  return p.sprite()
}

// ---------------------------------------------------------------------------
// The diving bell (any other model): a riveted steel bell on a chain, a
// round brass-rimmed window, ballast weights. 16 by 18.
// ---------------------------------------------------------------------------

function divingBell(o: { light: Light; sway: number; lamp?: boolean }): Sprite {
  const W = 16
  const H = 18
  const p = new Pix(W, H)
  const cx = 7.5
  const hwOf = (y: number) => (y < 3 ? -1 : y === 3 ? 2.6 : y === 4 ? 4.4 : y === 5 ? 5.5 : y <= 13 ? 6.0 + (y - 6) * 0.12 : y <= 15 ? 7.4 : -1)
  // The chain.
  for (let y = 0; y < 3; y++) p.set(7 + ((y + o.sway) & 1), y, y % 2 ? ROCK[1]! : ROCK[3]!)
  const inside = (x: number, y: number) => {
    const hw = hwOf(y)
    return hw > 0 && Math.abs(x + 0.5 - cx) <= hw
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue
      const hw = hwOf(y)
      const v = (x + 0.5 - (cx - hw)) / (2 * hw)
      let s = 0.12 + 0.78 * v
      if (v > 0.14 && v < 0.32) s -= 0.16
      if (y < 6) s -= 0.08
      p.set(x, y, shade(BELL, s, x, y))
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue
      if (!inside(x, y - 1)) p.set(x, y, BELL[3]!)
      else if (!inside(x, y + 1) || !inside(x - 1, y) || !inside(x + 1, y)) p.set(x, y, BELL[6]!)
    }
  }
  // Brass bands with rivets.
  for (const by of [6, 14]) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, by)) continue
      const hw = hwOf(by)
      const v = (x + 0.5 - (cx - hw)) / (2 * hw)
      p.set(x, by, x % 2 ? BRASS[0]! : shade(BRASS, 0.2 + 0.7 * v, x, by))
    }
  }
  p.stamp(['abba'], { a: BRASS[3]!, b: BRASS[1]! }, 6, 3)
  // The window.
  const win = {
    a: BRASS[1]!,
    b: BRASS[2]!,
    c: BRASS[3]!,
    d: BRASS[4]!,
    X: lit(o.light, GLOW[1]!, DIMG[0]!, GLOW[0]!),
    Y: lit(o.light, GLOW[2]!, DIMG[1]!, GLOW[1]!),
    Z: lit(o.light, GLOW[3]!, DIMG[2]!, GLOW[2]!),
    k: lit(o.light, GLOW[5]!, DIMG[3]!, GLOW[3]!),
  }
  p.stamp(['.abbc.', 'aXXYZc', 'bXYkZd', 'bYZZZd', '.cddd.'], win, 5, 8)
  // Ballast weights.
  p.stamp(['ab', 'bc'], { a: ROCK[2]!, b: ROCK[3]!, c: ROCK[4]! }, 1, 15)
  p.stamp(['ab', 'bc'], { a: ROCK[2]!, b: ROCK[3]!, c: ROCK[4]! }, 13, 15)
  if (o.lamp) p.stamp(['ab', '.c'], { a: BRASS[3]!, b: BRASS[2]!, c: BRASS[4]! }, 14, 9)
  return p.sprite()
}

// ---------------------------------------------------------------------------
// Divers, drawn by hand. 16 by 16, facing right, fins on the seabed.
// ---------------------------------------------------------------------------

// The snorkeler (Haiku): a sun-hat of hair, a mask, an orange snorkel, a
// yellow rash guard, teal trunks, coral fins.
const SNORK = {
  k: INK,
  h: HAIR[0]!,
  H: HAIR[1]!,
  j: HAIR[2]!,
  l: SKIN[0]!,
  s: SKIN[1]!,
  S: SKIN[2]!,
  z: SKIN[3]!,
  m: MASK,
  w: GLASS[0]!,
  g: GLASS[1]!,
  G: GLASS[2]!,
  q: GLASS[3]!,
  r: ORG[0]!,
  t: ORG[1]!,
  T: ORG[2]!,
  y: YEL[1]!,
  Y: YEL[2]!,
  u: YEL[3]!,
  c: TRK[1]!,
  C: TRK[2]!,
  n: TRK[3]!,
  f: CORAL[2]!,
  F: CORAL[3]!,
  v: CORAL[4]!,
}
const SNORK_SLEEP = { ...SNORK, w: DIMG[0]!, g: DIMG[1]!, G: DIMG[2]!, q: DIMG[3]! }
const SN_HEAD = [
  '..........rt....',
  '....hhhhh.rT....',
  '...hhhhhhhrT....',
  '..hhhhhhhhrT....',
  '..hmmmmmmmmT....',
  '..hmwgGGGqmT....',
  '..SmgGGqqqmT....',
  '..SsmmmmmmsT....',
  '...SsssssTT.....',
  '....zSSSS.......',
]
const SN_BODY = ['...yyyYYYyu.....', '..syYYYYYyus....', '..SyYYYYYuuS....', '...cccccCn......']
const SN_LEGS = ['...sSz..sSz.....', '...fffFv.fffFFv.']
const SN_KICK = ['...sSz...sSz....', '..ffFv....fffFFv']

// The scuba diver (Sonnet): hood and mask, a yellow tank, a regulator hose,
// a teal-striped wetsuit, a weight belt, teal fins.
const SCUBA = {
  k: INK,
  x: WET[4]!,
  X: WET[3]!,
  E: WET[2]!,
  e: WET[1]!,
  d: WET[0]!,
  a: TEAL[1]!,
  A: TEAL[2]!,
  b: YEL[0]!,
  B: YEL[1]!,
  j: YEL[2]!,
  J: YEL[3]!,
  r: BELL[1]!,
  R: BELL[3]!,
  m: MASK,
  w: GLASS[0]!,
  g: GLASS[1]!,
  G: GLASS[2]!,
  q: GLASS[3]!,
  s: SKIN[1]!,
  S: SKIN[2]!,
  z: SKIN[3]!,
  h: HOSE,
  n: BELT,
  f: TEAL[1]!,
  F: TEAL[2]!,
  v: TEAL[3]!,
}
const SCUBA_SLEEP = { ...SCUBA, w: DIMG[0]!, g: DIMG[1]!, G: DIMG[2]!, q: DIMG[3]! }
const SC_HEAD = [
  '.....xxxx.......',
  '....xXEEXx......',
  '...xXEeeEXx.....',
  '.RrxXmmmmmmm....',
  '.BbjxmwgGGqm....',
  '.BbjxmgGGqqm....',
  '.BbjxXmmmmmmh...',
  '.BbjxXzsssRrh...',
  '.BbjxXEEeeEhh...',
]
const SC_BODY = ['.BbjXEEaedEEXe..', '.BbjXEEaeeEEXe..', '.jJJXEEaaEEEXx..', '..JJxnnnrnnx....']
const SC_LEGS = ['...xXEEx.xEEx...', '...xXEx..xXEx...', '..fFFFFv.fFFFFv.']
const SC_KICK = ['...xXEEx.xEEx...', '...xXEx...xXEx..', '..fFFFv....fFFFv']

const sprites: Theme['sprites'] = {
  // Snorkeler
  snStand: spr([...SN_HEAD, ...SN_BODY, ...SN_LEGS], SNORK),
  snWalk: spr([...SN_HEAD, ...SN_BODY, ...SN_KICK], SNORK),
  snAttack: spr([...SN_HEAD, '...yyyYYYyysssSS', '..syYYYYYuu...zS', '..SyYYYYYuu.....', '...cccccCn......', ...SN_LEGS], SNORK),
  snItemGet: spr(
    [...SN_HEAD.slice(0, 8), '.s.SsssssTT..s..', '.s..zSSSS....s..', '.yyyyyYYYyuuu...', '...yYYYYYYu.....', '...yYYYYYuu.....', '...cccccCn......', ...SN_LEGS],
    SNORK,
  ),
  snSleep: spr([...SN_HEAD, ...SN_BODY, ...SN_LEGS], SNORK_SLEEP),
  // Scuba diver
  scStand: spr([...SC_HEAD, ...SC_BODY, ...SC_LEGS], SCUBA),
  scWalk: spr([...SC_HEAD, ...SC_BODY, ...SC_KICK], SCUBA),
  scAttack: spr([...SC_HEAD, '.BbjXEEaedEEXee.', '.BbjXEEaeeEEXXxx', '.jJJXEEaaEEEX...', SC_BODY[3]!, ...SC_LEGS], SCUBA),
  scItemGet: spr(
    [
      '.....xxxx.......',
      '....xXEEXx......',
      '...xXEeeEXx.....',
      '.RrxXmmmmmmm.x..',
      'xBbjxmwgGGqm.x..',
      'xBbjxmgGGqqm.X..',
      'eBbjxXmmmmmmhX..',
      'eBbjxXzsssRrhE..',
      'EBbjxXEEeeEhhE..',
      '.BbjXEEaedEEX...',
      '.BbjXEEaeeEEX...',
      '.jJJXEEaaEEEX...',
      SC_BODY[3]!,
      ...SC_LEGS,
    ],
    SCUBA,
  ),
  scSleep: spr([...SC_HEAD, ...SC_BODY, ...SC_LEGS], SCUBA_SLEEP),

  // The Nautilus
  nauStand: nautilus({ prop: 0, light: 'on' }),
  nauWalk: nautilus({ prop: 1, light: 'on' }),
  nauAttack: nautilus({ prop: 0, light: 'on', arm: true }),
  nauItemGet: nautilus({ prop: 1, light: 'blaze', hatch: true }),
  nauSleep: nautilus({ prop: 0, light: 'dim' }),
  // The Leviathan
  levStand: leviathan({ tail: 0, light: 'on' }),
  levWalk: leviathan({ tail: 1, light: 'on' }),
  levAttack: leviathan({ tail: 0, light: 'on', gape: true }),
  levLamp: leviathan({ tail: 0, light: 'on', dangle: true }),
  levItemGet: leviathan({ tail: 1, light: 'blaze', raise: true }),
  levSleep: leviathan({ tail: 0, light: 'dim', eyeShut: true }),
  // The diving bell
  bellStand: divingBell({ light: 'on', sway: 0 }),
  bellWalk: divingBell({ light: 'on', sway: 1 }),
  bellAttack: divingBell({ light: 'on', sway: 0, lamp: true }),
  bellItemGet: divingBell({ light: 'blaze', sway: 1 }),
  bellSleep: divingBell({ light: 'dim', sway: 0 }),
}
// The divers asleep on the sand, seen from the side, head to the left: the snorkeler on his back, the snorkel
// still up; the reef diver on his front under the tank.
sprites.snLie = spr(
  ['.....t..........', '.....t..........', '.mmmmT..........', 'hmGGqs.........f', 'hhsssSyyyYYcC.fF', 'hhSssSyYYYucCsSF', '.hhzSSuuuuunnzSv'],
  SNORK_SLEEP,
)
sprites.scLie = spr(
  ['......rBbbbj....', '..xxx.BbbjjJ....', '.xXEEXxEEaEEXx..', 'xmGGqXEEEaEEEXXx', 'xmGqqzEEEnEEXxfF', '.xxsssxxxxxxx.fv'],
  SCUBA_SLEEP,
)
sprites.nauLie = settle(sprites.nauSleep!)
sprites.levLie = settle(sprites.levSleep!)
sprites.bellLie = settle(sprites.bellSleep!)

// ---------------------------------------------------------------------------
// Lamps (effort): a lantern and the cone of light it throws. The cone fades
// with distance and frays into the water through the dither.
// ---------------------------------------------------------------------------

function lampBeam(len: number, spread: number, ramp: string[], frame: Record<string, string>, power = 1, widen = 0.75): Sprite {
  const H = 9
  const cy = 4
  const p = new Pix(len + 2, H)
  for (let x = 2; x < len + 2; x++) {
    const d = (x - 2) / Math.max(1, len - 1)
    const hw = 0.5 + spread * Math.pow(d, widen)
    for (let y = 0; y < H; y++) {
      const off = Math.abs(y - cy)
      if (off > hw + 0.45) continue
      const edge = off / (hw + 0.5)
      const I = power * (1 - Math.pow(d, 1.25) * 0.8) * (1 - edge * edge * 0.75)
      if (I < 0.15 + bayer(x, y) * 0.55 * d + bayer(x + 1, y) * 0.2 * edge) continue
      p.set(x, y, shade(ramp, 1 - I, x, y))
    }
  }
  p.stamp(['ab', 'cg', 'de'], frame, 0, cy - 1)
  return p.sprite()
}
const lantern = (flame: string) => ({ a: BRASS[2]!, b: BRASS[3]!, g: flame, c: BRASS[3]!, d: BRASS[3]!, e: BRASS[5]! })
// The longest beam is 14: lantern and light end inside column 45 (see the animations).
sprites.candleLamp = lampBeam(4, 1.2, CANDLE, lantern(CANDLE[1]!), 0.9)
sprites.oilLamp = lampBeam(7, 2.2, OIL, lantern(OIL[0]!), 0.95)
sprites.arcLamp = lampBeam(9, 3, ARCL, lantern(WHITE), 1)
sprites.searchlight = lampBeam(12, 3.6, SEARCH, { a: HULL[2]!, b: HULL[4]!, g: WHITE, c: HULL[4]!, d: HULL[4]!, e: HULL[6]! }, 1.1, 0.9)
sprites.sunbeam = lampBeam(14, 4, SUN, { a: GOLD[1]!, b: GOLD[3]!, g: WHITE, c: GOLD[3]!, d: GOLD[3]!, e: GOLD[4]! }, 1.3, 1.1)
{
  // Motes glittering in the sunbeam.
  const p = new Pix(17, 11)
  for (const [x, y] of [
    [4, 2],
    [7, 9],
    [9, 0],
    [11, 10],
    [13, 1],
    [15, 8],
    [16, 2],
    [8, 5],
  ] as const)
    p.set(x, y, (x + y) % 3 ? SUN[2]! : WHITE)
  sprites.sunMotes = p.sprite()
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** A sonar ring: an arc of radius `r` opening to the right, `fade` 0 (bright) to 1. Its circle's center goes in `PING_CENTER`. */
const PING_CENTER: Record<string, { x: number; y: number }> = {}
function ping(name: string, r: number, fade: number): void {
  const a = 0.8
  const w = Math.ceil(r - r * Math.cos(a)) + 2
  const h = 2 * Math.round(r * Math.sin(a)) + 1
  const cx = w - 1.5 - r
  const cy = (h - 1) / 2
  const p = new Pix(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx
      const dy = y - cy
      const d = Math.sqrt(dx * dx + dy * dy)
      const ang = Math.abs(Math.atan2(dy, dx))
      if (Math.abs(d - r) > 0.62 || ang > a) continue
      const v = fade * 0.75 + (ang / a) * 0.35
      if (fade > 0.5 && bayer(x, y) < (fade - 0.5) * 1.2) continue
      p.set(x, y, shade(PING, v, x, y))
    }
  }
  sprites[name] = p.sprite()
  PING_CENTER[name] = { x: cx, y: cy }
}
ping('ping1', 3.5, 0)
ping('ping2', 6.5, 0.2)
ping('ping3', 9.5, 0.55)
ping('ping2dim', 6.5, 0.8)
sprites.blip = spr(['.a.', 'aWa', '.a.'], { a: CORAL[2]!, W: GOLD[0]! })

// Bubbles.
sprites.bub1 = spr(['w'], { w: '#e8fdff' })
sprites.bub2 = spr(['.a.', 'aWb', '.b.'], { a: '#c8f6ff', W: WHITE, b: '#7ad4ec' })
sprites.bub3 = spr(['.aa.', 'aW.b', 'a..b', '.bb.'], { a: '#c8f6ff', W: WHITE, b: '#6cc8e4' })
sprites.bubTrail = spr(['.a...', '.....', '...b.', 'a....', '..W..', '.....', 'b..a.', '..b..'], { a: '#c8f6ff', W: WHITE, b: '#7ad4ec' })
sprites.bubPop = spr(['a.a', '...', 'a.a'], { a: '#5a8aa0' })
sprites.sighBubble = spr(['.aaa.', 'aW..b', 'a...b', 'a...b', '.bbb.'], { a: '#c8f6ff', W: WHITE, b: '#6cc8e4' })

// A sunken ship's log on the seabed, its pages turning.
const BOOK = { p: PAPER[0]!, P: PAPER[1]!, l: PAPER[2]!, L: PAPER[3]!, k: LEATHER[2]!, w: LEATHER[0]!, W: LEATHER[1]!, g: GOLD[2]! }
sprites.book1 = spr(['...........', '...........', '.PPPP.PPPP.', 'PplLpkplLpP', 'PpplpkpLppP', 'wWWWWgWWWWw'], BOOK)
sprites.book2 = spr(['.....pp....', '....pPl....', '.PPPplPPPP.', 'PplLpkplLpP', 'PpplpkpLppP', 'wWWWWgWWWWw'], BOOK)
sprites.book3 = spr(['......p....', '......Pp...', '.PPPP.lPPP.', 'PplLpkplLpP', 'PpplpkpLppP', 'wWWWWgWWWWw'], BOOK)
sprites.glint = spr(['.a.', 'aWa', '.a.'], { a: GOLD[1]!, W: WHITE })

// A hull plate to weld, sparks, the welding arc.
{
  const p = new Pix(7, 12)
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 7; x++) {
      if (y < 2 && x > 4 - y * 2) continue
      p.set(x, y, shade(HULL, 0.25 + 0.06 * x + 0.03 * y, x, y))
    }
  for (let y = 1; y < 12; y += 3) {
    p.set(1, y, BRASS[1]!)
    p.set(5, y, BRASS[2]!)
  }
  for (const [x, y] of [
    [3, 6],
    [4, 7],
    [2, 9],
    [5, 10],
  ] as const)
    p.set(x, y, '#9a5434')
  for (let y = 0; y < 12; y++) p.set(6, y, HULL[6]!)
  for (let x = 0; x < 7; x++) p.set(x, 11, HULL[7]!)
  sprites.plate = p.sprite()
}
sprites.weld = spr(['.a.', 'aWa', '.a.'], { a: ARC[2]!, W: WHITE })
sprites.weldBig = spr(['..a..', '.aba.', 'abWba', '.aba.', '..a..'], { a: ARC[3]!, b: ARC[1]!, W: WHITE })
sprites.spark1 = spr(['a...b', '..c..', '.d.a.', 'c...d'], { a: SPARK[1]!, b: SPARK[3]!, c: SPARK[0]!, d: SPARK[2]! })
sprites.spark2 = spr(['..a..', 'b...c', '...d.', '.c..b', 'd....'], { a: SPARK[0]!, b: SPARK[2]!, c: SPARK[1]!, d: SPARK[3]! })

// The engine: a brass cylinder, a piston, a flywheel turning a quarter a frame.
function engine(f: number): Sprite {
  const p = new Pix(13, 14)
  const th = (f * Math.PI) / 2
  const wx = 8.5
  const wy = 7.5
  // Flywheel rim and spokes.
  for (let y = 0; y < 14; y++)
    for (let x = 0; x < 13; x++) {
      const d = Math.hypot(x + 0.5 - wx, y + 0.5 - wy)
      if (d > 3.3 && d < 4.4) p.set(x, y, shade(ROCK, 0.25 + 0.5 * ((y + 0.5 - wy) / 8 + 0.5), x, y))
    }
  for (let t = -3.2; t <= 3.2; t += 0.5) {
    p.set(Math.floor(wx + Math.cos(th) * t), Math.floor(wy + Math.sin(th) * t), ROCK[3]!)
  }
  p.set(8, 7, BRASS[1]!)
  // Cylinder.
  for (let y = 5; y < 12; y++)
    for (let x = 0; x < 4; x++) p.set(x, y, shade(BRASS, 0.15 + x * 0.18 + (y === 5 ? -0.1 : 0), x, y))
  p.set(0, 7, BRASS[5]!)
  p.set(0, 9, BRASS[5]!)
  // Piston rod and crosshead.
  const crank = { x: wx + Math.cos(th) * 2.4, y: wy + Math.sin(th) * 2.4 }
  const top = Math.round(1 + (1 + Math.sin(th)) * 1.2)
  for (let y = top; y < 5; y++) p.set(1, y, HULL[2]!), p.set(2, y, HULL[4]!)
  p.set(0, top, BRASS[1]!)
  p.set(3, top, BRASS[3]!)
  // Connecting rod.
  for (let t = 0; t <= 1; t += 0.1) p.set(Math.round(2 + (crank.x - 2) * t), Math.round(top + (crank.y - top) * t), BRASS[3]!)
  p.set(Math.floor(crank.x), Math.floor(crank.y), BRASS[0]!)
  // Base plate.
  for (let x = 0; x < 13; x++) {
    p.set(x, 12, x % 4 === 1 ? BRASS[1]! : ROCK[2]!)
    p.set(x, 13, ROCK[4]!)
  }
  return p.sprite()
}
sprites.engine0 = engine(0)
sprites.engine1 = engine(1)
sprites.engine2 = engine(2)
sprites.engine3 = engine(3)
sprites.steam = spr(['.a..', 'a.b.', '..a.', '.b..'], { a: '#d8f8ff', b: '#8ad4ea' })

// Scouts: little lantern fish sent off on errands.
// Facing right: a forked tail behind, the eye and the snout in front.
const SCOUT = ['t..aaa..', 'ttAAAAA.', '.tAAAAkA', 'ttbbbbb.', 't..bbb..']
sprites.scoutA = spr(SCOUT, { a: BIO[1]!, A: BIO[2]!, b: BIO[3]!, t: BIO[4]!, k: INK })
sprites.scoutB = spr(SCOUT, { a: '#ffd0a0', A: '#ffa860', b: '#f07a40', t: '#c05030', k: INK })

// A clam and its pearl.
const CL = { a: CLAM[0]!, b: CLAM[1]!, c: CLAM[2]!, d: CLAM[3]!, e: CLAM[4]!, p: CORAL[1]!, P: CORAL[2]!, w: PEARL[0]!, W: PEARL[2]!, v: PEARL[3]! }
sprites.clamShut = spr(['........', '..abba..', '.abcbcb.', 'abcbcbcd', 'eeeeeeee', '.dcdcdd.'], CL)
sprites.clamOpen = spr(['.abbba..', 'abcbcbd.', '.dcdcd..', 'pPwwPPp.', 'PpWvpPPd', '.dcdcdd.'], CL)
sprites.clamEmpty = spr(['.abbba..', 'abcbcbd.', '.dcdcd..', 'pPPpPPp.', 'PpPPpPPd', '.dcdcdd.'], CL)
sprites.pearl = spr(['.wW.', 'wwWv', 'WWvv', '.vv.'], { w: PEARL[0]!, W: PEARL[2]!, v: PEARL[3]! })
sprites.shine = spr(['...a...', '.b.W.b.', 'aaWWWaa', '.b.W.b.', '...a...'], { a: GOLD[1]!, b: GOLD[2]!, W: WHITE })

// A jellyfish and its sting.
sprites.jelly1 = spr(['..aaa..', '.abbba.', 'abcWcba', 'bcccccb', '.d.d.d.', 'd.d..d.', '.d..d..', '..d..d.'], { a: JEL[1]!, b: JEL[2]!, c: JEL[3]!, d: JEL[2]!, W: JEL[0]! })
sprites.jelly2 = spr(['.......', '..aaa..', '.abWba.', 'abcccba', 'bcdcdcb', 'd.d.d.d', '.d..d..', 'd..d...'], { a: JEL[1]!, b: JEL[2]!, c: JEL[3]!, d: JEL[2]!, W: JEL[0]! })
sprites.zap = spr(['a...a', '.b.b.', '..W..', '.b.b.', 'a...a'], { a: JEL[2]!, b: GOLD[1]!, W: WHITE })

// A treasure chest, the light bursting out of it.
const CH = { k: WOOD[4]!, w: WOOD[1]!, W: WOOD[2]!, v: WOOD[0]!, g: GOLD[2]!, G: GOLD[3]!, y: GOLD[1]!, Y: GOLD[0]!, o: GLOW[2]! }
sprites.chest = spr(['.kkkkkkkkk.', 'kvwwgwwwwWk', 'kwwwgwwwWWk', 'kGgggyggGGk', 'kWwwgYgwwWk', 'kwwwgggwwWk', 'kWwwgwwwWWk', 'kkkkkkkkkkk'], CH)
sprites.chestOpen = spr(['.kkkkkkkkk.', 'kWwwgwwwWWk', 'kkkkkkkkkkk', 'kyYoYyoYyYk', 'kGgggyggGGk', 'kWwwgYgwwWk', 'kwwwgggwwWk', 'kWwwgwwwWWk', 'kkkkkkkkkkk'], CH)
function rays(r: number, phase: number): Sprite {
  const w = 2 * r + 1
  const h = r + 2
  const p = new Pix(w, h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = x - r
      const dy = h - 1 - y
      const d = Math.hypot(dx, dy)
      if (d > r || d < 2) continue
      const ang = Math.atan2(dy, dx)
      const ray = Math.pow(Math.abs(Math.cos(ang * 4 + phase)), 4)
      const I = ray * (1 - Math.pow(d / r, 2))
      if (I < 0.05 + bayer(x, y) * 0.3) continue
      p.set(x, y, shade(GOLD, 1 - I * 2.2, x, y))
    }
  return p.sprite()
}
sprites.rays1 = rays(8, 0)
sprites.rays2 = rays(9, Math.PI / 4)
sprites.gem = spr(['.ab.', 'abWc', 'bccd', '.cd.'], { a: GOLD[0]!, b: GOLD[1]!, c: GOLD[2]!, d: GOLD[4]!, W: WHITE })
sprites.star = spr(['.a.', 'aWa', '.a.'], { a: GOLD[1]!, W: WHITE })

// A depth marker: a weighted post banded every fathom, a brass plate.
sprites.marker = spr(
  ['.bBBb.', '.BkkB.', '.BkkB.', '.bBBb.', '..rw..', '..wr..', '..rw..', '..wr..', '..rw..', '..wr..', '..rw..', '..wr..', '.dddd.', 'dddddd'],
  { b: BRASS[3]!, B: BRASS[1]!, k: BRASS[5]!, r: CORAL[3]!, w: BELL[1]!, d: ROCK[3]! },
)

// The tide turning: streaks of current.
sprites.tide1 = spr(['aab.....aab.....', '................', '....aaab....aab.', '................', '.aab......aaab..', '................', '......aab.......'], { a: '#c8f0ff', b: '#78c4e0' })
sprites.tide2 = spr(['....aab.....aab.', '................', 'aab.....aaab....', '................', '.....aaab....aab', '................', '..aab......aab..'], { a: '#c8f0ff', b: '#78c4e0' })

// A cloud of bubbles (a new vessel arrives).
function burst(r: number, seed: number): Sprite {
  const p = new Pix(2 * r + 2, 2 * r + 2)
  for (let k = 0; k < r * 5; k++) {
    const a = Math.sin(k * 12.9898 + seed) * 43758.5453
    const b = Math.sin(k * 78.233 + seed) * 12543.1234
    const fa = a - Math.floor(a)
    const fb = b - Math.floor(b)
    const rr = Math.sqrt(fa) * r
    const x = Math.round(r + Math.cos(fb * 6.283) * rr)
    const y = Math.round(r + Math.sin(fb * 6.283) * rr)
    const big = k % 3 === 0
    p.set(x, y, big ? '#e8fdff' : '#9ae0f0')
    if (big) {
      p.set(x + 1, y, '#9ae0f0')
      p.set(x, y + 1, '#6cc8e4')
      p.set(x + 1, y + 1, '#c8f6ff')
    }
  }
  return p.sprite()
}
sprites.burst1 = burst(6, 1)
sprites.burst2 = burst(8, 2)
sprites.flare = spr(['...a...', '.b.a.b.', '..aWa..', 'aaWWWaa', '..aWa..', '.b.a.b.', '...a...'], { a: GLOW[1]!, b: GLOW[3]!, W: WHITE })

// ---------------------------------------------------------------------------
// Scenery
// ---------------------------------------------------------------------------

// The seabed: rippled sand, a pebble, a shell, darker below.
{
  const p = new Pix(16, 5)
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 16; x++) {
      const ripple = Math.sin((x + y * 2) * 0.8) * 0.12
      if (y === 0 && (x % 7 === 3 || x % 11 === 6)) continue
      p.set(x, y, shade(SAND, 0.25 + y * 0.16 + ripple, x, y))
    }
  p.stamp(['ab', 'bc'], { a: ROCK[1]!, b: ROCK[2]!, c: ROCK[4]! }, 12, 2)
  p.stamp(['ab'], { a: CORAL[0]!, b: CORAL[2]! }, 4, 1)
  sprites.seabed = p.sprite()
}

function kelp(h: number, phase: number): Sprite {
  const p = new Pix(8, h)
  for (const [x0, ph] of [
    [2.5, phase],
    [5, phase + 1.9],
  ] as const) {
    const top = x0 > 3 ? 3 : 0
    for (let y = top; y < h; y++) {
      const sway = 1 - (y / h) * 0.7
      const x = Math.round(x0 + Math.sin(y * 0.42 + ph) * 1.3 * sway)
      const v = 0.15 + 0.6 * (y / h)
      p.set(x, y, shade(KELP, v + 0.15, x, y))
      if (y % 3 === 1 && y < h - 2) p.set(x + (y % 6 < 3 ? 1 : -1), y, shade(KELP, v - 0.1, x, y))
      if (y % 3 === 2 && y < h - 2) p.set(x + (y % 6 < 3 ? 1 : -1), y + 1, shade(KELP, v + 0.25, x, y))
    }
  }
  return p.sprite()
}
sprites.kelpL = kelp(13, 0)
sprites.kelpR = kelp(22, 2.4)
sprites.coral = spr(
  ['.a...a..', '.b.a.b..', '..bbb..a', 'a..b..b.', 'b.cbc.b.', '.bcccb..', '..cdc...', '..ddd...'],
  { a: CORAL[0]!, b: CORAL[1]!, c: CORAL[2]!, d: CORAL[3]! },
)
sprites.coralSmall = spr(['a...a', 'b.a.b', '.bbb.', '.cbc.', '..d..'], { a: CORAL[0]!, b: CORAL[1]!, c: CORAL[2]!, d: CORAL[3]! })
sprites.worms = spr(['a.....', 'b..a..', 'c..b.a', 'c..c.b', 'cd.c.c', 'cd.cdc'], { a: BIO[1]!, b: BIO[3]!, c: BELL[2]!, d: BELL[4]! })

// The wreck, in pieces from the right edge in. Its bow, nine columns: the stem
// rising out of the sand, a porthole, the stump of the bowsprit.
{
  const p = new Pix(9, 20)
  for (let y = 5; y < 20; y++) {
    const x0 = Math.max(0, Math.round(6 - (y - 5) * 0.45))
    for (let x = x0; x < 9; x++) {
      const plank = (y + (x > 5 ? 1 : 0)) % 3 === 0
      p.set(x, y, shade(WOOD, (plank ? 0.7 : 0.3) + (x - x0) * 0.03 + (y > 16 ? 0.15 : 0), x, y))
    }
    p.set(x0, y, WOOD[4]!)
  }
  // The broken rail.
  p.set(7, 5, null)
  p.set(8, 5, null)
  p.set(8, 6, null)
  // The bowsprit's stump, a rope hanging from it.
  for (let k = 0; k < 5; k++) p.set(5 - k, 4 - k, k < 4 ? WOOD[2]! : WOOD[3]!)
  p.set(2, 3, ROCK[2]!)
  p.set(2, 4, ROCK[3]!)
  p.set(2, 5, ROCK[2]!)
  p.stamp(['.ab.', 'acda', 'bdcb', '.bb.'], { a: BRASS[3]!, b: BRASS[4]!, c: '#1a3040', d: '#2a5068' }, 4, 10)
  sprites.wreck = p.sprite()
}
// Amidships: a mast still standing in the broken ribs, its lookout, a yard and what is left of a sail.
{
  const p = new Pix(12, 30)
  for (let y = 1; y < 30; y++) {
    p.set(5, y, y % 5 === 0 ? WOOD[3]! : WOOD[1]!)
    p.set(6, y, WOOD[3]!)
  }
  p.set(5, 0, WOOD[2]!)
  p.stamp(['a....a', 'abbbba', '.cccc.'], { a: WOOD[2]!, b: WOOD[1]!, c: WOOD[3]! }, 3, 4)
  for (let x = 1; x < 11; x++) p.set(x, 10, x === 5 || x === 6 ? WOOD[0]! : WOOD[2]!)
  // The sail, in tatters: whole under the yard, ragged below, a hole or two.
  const cloth = ['#e0d8c0', '#c4bca4', '#a09880']
  const hang = [0, 6, 8, 5, 7, 0, 0, 4, 8, 6, 3, 0]
  for (let x = 1; x < 11; x++)
    for (let k = 0; k < hang[x]!; k++) {
      if ((x * 3 + k) % 11 === 5) continue
      p.set(x, 11 + k, cloth[k < 2 ? 0 : k > hang[x]! - 3 ? 2 : 1]!)
    }
  // Ribs curving up out of the sand on both sides, the keel between.
  for (const [x, y] of [
    [0, 21],
    [0, 22],
    [1, 23],
    [1, 24],
    [1, 25],
    [2, 26],
    [2, 27],
    [3, 28],
    [11, 23],
    [10, 24],
    [10, 25],
    [10, 26],
    [9, 27],
    [9, 28],
    [3, 24],
    [3, 25],
    [8, 25],
    [8, 26],
  ] as const)
    p.set(x, y, x < 2 || x > 9 ? WOOD[2]! : WOOD[3]!)
  for (let x = 2; x < 11; x++) p.set(x, 29, x % 3 ? WOOD[3]! : WOOD[4]!)
  sprites.wreckMast = p.sprite()
}
// Her anchor, planted in the sand.
sprites.oldAnchor = spr(
  ['...aa...', '..a..b..', '...ab...', '.aaabbb.', '...ab...', '...ab...', 'a..ab..b', 'aa.ab.bb', '.aaabbb.', '...ab...'],
  { a: ROCK[0]!, b: ROCK[2]! },
)
// Sunlight from the surface, in the shallows only: thin slanting rays that break up and fade into the water.
{
  const p = new Pix(26, 24)
  for (const [x0, len] of [
    [0, 24],
    [6, 14],
    [11, 20],
    [18, 22],
  ] as const)
    for (let y = 0; y < len; y++) {
      const fade = y / len
      if (fade > 0.7 ? y % 3 !== 0 : fade > 0.35 && y % 3 === 2) continue
      p.set(Math.round(x0 + y * 0.35), y, mixHex('#dcfffa', '#6fd0dc', Math.floor(fade * 5) / 5))
    }
  sprites.sunShafts = p.sprite()
}

// The air gauge: a brass porthole the cache ring is drawn in, a brass-framed
// slate under it for the next message's price (dark, so the light ink reads
// at every depth). Ring center (7, 7).
{
  const p = new Pix(15, 20)
  for (let y = 13; y < 20; y++)
    for (let x = 1; x < 14; x++) {
      const edge = y === 13 || y === 19 || x === 1 || x === 13
      if ((y === 13 || y === 19) && (x === 1 || x === 13)) continue
      p.set(x, y, edge ? BRASS[y === 13 ? 2 : 4]! : y === 14 ? '#1a3446' : '#0a1824')
    }
  for (let y = 0; y < 15; y++)
    for (let x = 0; x < 15; x++) {
      const dx = x - 7
      const dy = y - 7
      const d = Math.hypot(dx, dy)
      if (d <= 5.7) {
        const v = clamp(0.5 + (dx + dy) / 16)
        p.set(x, y, d < 2.5 ? '#0a1824' : shade(['#2a4c64', '#1a3446', '#10222f', '#0a1620'], v, x, y))
      } else if (d <= 7.4) {
        const lightness = clamp(0.5 + (dx + dy) / (2 * d) * 0.55)
        p.set(x, y, d > 6.9 ? BRASS[5]! : shade(BRASS, lightness, x, y))
      }
    }
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4
    p.set(Math.round(7 + Math.cos(a) * 6.4), Math.round(7 + Math.sin(a) * 6.4), BRASS[0]!)
  }
  p.set(5, 4, '#6c9ab8')
  sprites.gauge = p.sprite()
}

// ---------------------------------------------------------------------------
// Status bar icons
// ---------------------------------------------------------------------------

sprites.anchorIcon = spr(['.a.', 'a.a', '.a.', 'aaa', '.a.', 'b.b', 'bab'], { a: BRASS[1]!, b: BRASS[2]! })
sprites.pearlIcon = spr(['.wW.', 'wwWv', 'WWvv', '.vv.'], { w: PEARL[0]!, W: PEARL[2]!, v: PEARL[4]! })
sprites.tideIcon = spr(['.a..', 'a.a.', '...a', '....', '.b..', 'b.b.', '...b'], { a: '#9ae0f0', b: '#4aa0c8' })
// Air bubbles, three rows and a blank one under: the meter's two rows stay apart.
sprites.air0 = spr(['.aa.', 'a..a', '.aa.', '....'], { a: '#24506a' })
sprites.air1 = spr(['.aa.', 'bccb', '.bb.', '....'], { a: '#2c6484', b: '#6fd4ec', c: '#3a9cc0' })
sprites.air2 = spr(['.ab.', 'aWbb', '.bb.', '....'], { a: '#c8fcff', b: '#8ff4ff', W: WHITE })
// The vessel box: each vessel in five columns.
sprites.iconSnorkeler = spr(['....o', '.hhho', 'hhhho', 'mgGmo', 'sssso', '.ssT.', '.yyy.'], { o: ORG[1]!, T: ORG[2]!, h: HAIR[0]!, m: MASK, g: GLASS[1]!, G: GLASS[2]!, s: SKIN[1]!, y: YEL[1]! })
sprites.iconDiver = spr(['.xxx.', 'xEEEx', 'mmmmm', 'mwgGm', 'xssrh', 'bAaAx', 'bAaAx'], { x: WET[3]!, E: WET[1]!, m: MASK, w: GLASS[0]!, g: GLASS[1]!, G: GLASS[2]!, s: SKIN[1]!, r: BELL[1]!, h: HOSE, b: YEL[1]!, A: TEAL[2]!, a: TEAL[1]! })
sprites.iconNautilus = spr(['..n..', '.LLL.', 'hhhhB', 'HgHgB', 'bbbbb', '.MMM.'], { n: BRASS[1]!, L: HULL[2]!, h: HULL[2]!, H: HULL[4]!, g: GLOW[3]!, B: BRASS[2]!, b: BRASS[3]!, M: HULL[5]! })
sprites.iconLeviathan = spr(['..ss.', '.s..B', '.LLL.', 'LLLeL', 'McLcM', '.MMM.'], { s: LEVI[1]!, B: BIO[1]!, L: LEVI[1]!, M: LEVI[3]!, e: GOLD[1]!, c: BIO[2]! })
sprites.iconBell = spr(['..c..', '.BBB.', 'BbbbK', 'BgGbK', 'BggbK', 'aAaAa', 'r...r'], { c: ROCK[1]!, B: BELL[1]!, b: BELL[3]!, K: BELL[4]!, g: GLOW[2]!, G: GLOW[0]!, a: BRASS[1]!, A: BRASS[3]!, r: ROCK[2]! })
// The lamp box: a lantern that burns brighter and throws more rays with each effort.
const lampIcon = (rows: string[]) => spr(rows, { a: BRASS[3]!, b: BRASS[1]!, c: BRASS[4]!, w: PAPER[1]!, g: 'mlGlow', G: 'mlCore' })
sprites.lampIcon0 = lampIcon(['..a..', '.aba.', '.c.c.', '.cgc.', '.cwc.', '.aba.'])
sprites.lampIcon1 = lampIcon(['..a..', '.aba.', '.cgc.', '.cGc.', '.cgc.', '.aba.'])
sprites.lampIcon2 = lampIcon(['..a..', '.aba.', '.cgc.', 'gcGcg', '.cgc.', '.aba.'])
sprites.lampIcon3 = lampIcon(['..a..', 'gabag', '.cGc.', 'gcGcg', '.cGc.', 'gabag'])
sprites.lampIcon4 = lampIcon(['g.G.g', '.aGa.', 'gcGcg', 'GGGGG', 'gcGcg', '.aGa.', 'g.G.g'])

// ---------------------------------------------------------------------------
// Hurt flashes: every color the vessels use, washed white or stung red
// ---------------------------------------------------------------------------

const HERO_SPRITES = ['levLamp', 'snStand', 'snWalk', 'snAttack', 'snItemGet', 'snSleep', 'scStand', 'scWalk', 'scAttack', 'scItemGet', 'nauStand', 'nauAttack', 'nauWalk', 'levStand', 'levWalk', 'levAttack', 'bellStand', 'bellWalk', 'bellAttack']
const heroColors = new Set<string>()
for (const n of HERO_SPRITES) for (const c of Object.values(sprites[n]?.legend ?? {})) if (c) heroColors.add(c)
const STING_W: Record<string, string> = {}
const STING_R: Record<string, string> = {}
for (const c of heroColors) {
  const hexc = pixels[c]
  if (!hexc) continue
  STING_W[c] = 'stingW'
  pixels[`${c}_r`] = mixHex(hexc, '#ff3060', 0.55)
  STING_R[c] = `${c}_r`
}

// ---------------------------------------------------------------------------
// Animations. Positions are relative to the hero's top-left (a 16x16 box whose
// feet rest on the seabed). The scene is laid out once, inside columns 0..45:
// the air gauge top-left (columns 0..14, down to row 19), every vessel ending at
// column 29 (the Nautilus starts at 6), props and the lamp's light in 30..45.
// Nothing rises left of column 15 while the scene is at its design height.
// ---------------------------------------------------------------------------

const SMALL: HeroTier[] = ['tier1', 'tier2']
const BIG: HeroTier[] = ['tier3', 'tier4', 'unknown']
/** An actor for some vessels only, placed in the scene (no lift). */
const only = (tiers: HeroTier[], a: Actor): Actor => ({ ...a, tiers, fixed: true })
const placed = (sprite: string, x: number, y: number, flip = false): Actor => at(sprite, x, y, { fixed: true, flip })

/** The lamp at the hand, the lantern at x 16..17, y 9..11; every vessel shows it in its `lamp` pose. */
const lamp = () => weapon(16, 6)
// The Leviathan hangs the lantern from its lure, two pixels higher.
const LURE = { x: 0, y: -2 }

const BOOK_AT = { x: 20, y: 10 }
const PLATE = { x: 18, y: 4 }
const ENGINE = { x: 19, y: 2 }
const CLAM_AT = { x: 17, y: 10 }
const CHEST_AT = { x: 17, y: 8 }
const MARKER = { x: 21, y: 2 }
// The sonar's rings share a center just inside the bow.
const SONAR = { x: 14, y: 7 }
const ring = (name: string): Actor => at(name, SONAR.x - PING_CENTER[name]!.x, SONAR.y - PING_CENTER[name]!.y)
const BLIP = at('blip', 27, 6)

/** Bubbles off the sleeper: from the snorkel of a diver lying on the sand, or ten pixels higher, off a hull's top. */
const rise = (sprite: string, x: number, y: number): Actor[] => [only(SMALL, at(sprite, x, y + 5)), only(BIG, at(sprite, x, y - 5))]

const book = (k: 1 | 2 | 3) => at(`book${k}`, BOOK_AT.x, BOOK_AT.y)
const plate = at('plate', PLATE.x, PLATE.y)
const engineAt = (k: number) => at(`engine${k}`, ENGINE.x, ENGINE.y)

// Two scouts leave the bow, one up into the water, one along the seabed, and come back the same ways.
const SCOUT_A = [
  { x: 16, y: 4 },
  { x: 20, y: 1 },
  { x: 24, y: -2 },
]
const SCOUT_B = [
  { x: 17, y: 10 },
  { x: 21, y: 9 },
  { x: 24, y: 10 },
]
const scouts = (step: 0 | 1 | 2, back = false): Actor[] => [
  placed('scoutA', SCOUT_A[step]!.x, SCOUT_A[step]!.y + (back ? 2 : 0), back),
  placed('scoutB', SCOUT_B[step]!.x, SCOUT_B[step]!.y, back),
]

const states: Theme['states'] = {
  idle: loop(
    { actors: [hero('lie'), ...rise('bub1', 4, 2)], hold: 3 },
    { actors: [hero('lie'), ...rise('bub2', 3, -1), ...rise('bub1', 5, 3)], hold: 3 },
    { actors: [hero('lie'), ...rise('bub3', 3, -5), ...rise('bub1', 4, 0)], hold: 3 },
    { actors: [hero('lie'), ...rise('bub2', 4, -9)], hold: 3 },
  ),
  thinking: loop(
    { actors: [hero('stand'), ring('ping1')], hold: 2 },
    { actors: [hero('stand'), ring('ping2')], hold: 2 },
    { actors: [hero('stand'), ring('ping3'), ring('ping2dim')], hold: 2 },
    { actors: [hero('walk'), BLIP], hold: 2 },
    { actors: [hero('stand'), BLIP], hold: 1 },
  ),
  reading: loop(
    { actors: [hero('lamp'), lamp(), book(1)], hold: 2 },
    { actors: [hero('lamp'), lamp(), book(2)], hold: 2 },
    { actors: [hero('lamp'), lamp(), book(3), at('glint', BOOK_AT.x + 4, BOOK_AT.y - 1)], hold: 2 },
    { actors: [hero('lamp'), lamp(), book(1)], hold: 1 },
  ),
  editing: loop(
    { actors: [hero('attack'), plate, at('weld', 16, 9), at('spark1', 15, 5)], hold: 1 },
    { actors: [hero('attack'), plate, at('weldBig', 15, 8), at('spark2', 17, 3)], hold: 1 },
    { actors: [hero('stand'), plate], hold: 1 },
    { actors: [hero('attack'), plate, at('weldBig', 15, 8), at('spark1', 16, 11)], hold: 1 },
    { actors: [hero('attack'), plate, at('weld', 16, 9), at('spark2', 15, 4)], hold: 1 },
  ),
  shell: loop(
    { actors: [hero('stand'), engineAt(0)], hold: 1 },
    { actors: [hero('walk'), engineAt(1), placed('steam', ENGINE.x, ENGINE.y - 4)], hold: 1 },
    { actors: [hero('stand'), engineAt(2), placed('bub1', ENGINE.x + 1, ENGINE.y - 7)], hold: 1 },
    { actors: [hero('walk'), engineAt(3), placed('steam', ENGINE.x + 1, ENGINE.y - 6)], hold: 1 },
  ),
  agents: loop(
    { actors: [hero('itemGet'), ...scouts(0)], hold: 2 },
    { actors: [hero('itemGet'), ...scouts(1)], hold: 2 },
    { actors: [hero('itemGet'), ...scouts(2)], hold: 2 },
    { actors: [hero('stand')], hold: 3 },
    { actors: [hero('stand'), ...scouts(2, true)], hold: 2 },
    { actors: [hero('itemGet'), ...scouts(1, true)], hold: 2 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop({ actors: [hero('lie'), ...rise('bubPop', 3, 1)], hold: 4 }, { actors: [hero('lie')], hold: 4 }),
}

const SIGH = 'Twenty thousand leagues, for this?'
const sigh = at('sighBubble', 12, -4)
const sighText = { text: '~sigh~', x: 18, y: -4, color: '#eafcff', bg: '#0c2636', lift: true }
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('lamp'), lamp(), book(1), sigh], hold: 2, caption: SIGH },
    { actors: [hero('lamp'), lamp(), book(2), sigh], hold: 2, caption: SIGH },
    { actors: [hero('stand'), book(3), at('sighBubble', 12, -8)], texts: [sighText], hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [hero('stand'), engineAt(0), sigh], hold: 2, caption: SIGH },
    { actors: [hero('stand'), engineAt(2), sigh], hold: 2, caption: SIGH },
    { actors: [hero('stand'), engineAt(0), at('sighBubble', 12, -8)], texts: [sighText], hold: 3, caption: SIGH },
  ),
}

// Where each vessel holds up what it found: a hand, the captain's hands, the raised lure, over the bell's chain.
const HOLD: Record<HeroTier, { x: number; y: number }> = {
  tier1: { x: 12, y: 4 },
  tier2: { x: 12, y: -1 },
  tier3: { x: 3, y: -8 },
  tier4: { x: 13, y: -6 },
  unknown: { x: 6, y: -7 },
}
const held = (sprite: string, twinkle: 0 | 1): Actor[] =>
  (Object.keys(HOLD) as HeroTier[]).flatMap(t => {
    const h = HOLD[t]
    return [only([t], at(sprite, h.x, h.y)), only([t], twinkle ? at('star', h.x + 5, h.y - 1) : at('star', h.x + 1, h.y - 4))]
  })
// The flare is centered on the lantern, wherever the vessel holds it.
const flare: Actor[] = [only(['tier1', 'tier2', 'tier3', 'unknown'], at('flare', 14, 7)), only(['tier4'], at('flare', 14 + LURE.x, 7 + LURE.y))]
const jelly = (k: 1 | 2, x: number, y: number) => placed(`jelly${k}`, x, y)
// The current runs right to left, over the vessel and in front of it.
const tide = (k: 0 | 1, dx: number): Actor[] => [at(k ? 'tide2' : 'tide1', 16 - dx, 2), at(k ? 'tide1' : 'tide2', -10 - dx, 6)]
const STOP = { text: 'STOP', x: 27, y: -2, color: '#ffe08a', bg: '#0c2636' }

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('attack'), at('clamShut', CLAM_AT.x, CLAM_AT.y)], hold: 2 },
    { actors: [hero('attack'), at('clamOpen', CLAM_AT.x, CLAM_AT.y)], hold: 1 },
    { actors: [hero('attack'), at('clamOpen', CLAM_AT.x, CLAM_AT.y), at('shine', CLAM_AT.x - 1, CLAM_AT.y)], hold: 2 },
    { actors: [hero('itemGet'), at('clamEmpty', CLAM_AT.x, CLAM_AT.y), ...held('pearl', 0)], hold: 3 },
  ),
  // Stung, knocked back two pixels at most (three, and the Nautilus's lantern touches the air gauge), and back in place.
  toolError: once(
    { actors: [hero('stand'), jelly(1, 19, -6)], hold: 1 },
    { actors: [hero('stand'), jelly(2, 17, -2)], hold: 1 },
    { actors: [hero('stand', -1, 0, STING_W), jelly(1, 16, 0), at('zap', 13, 3)], hold: 1 },
    { actors: [hero('stand', -2, 0, STING_R), jelly(2, 18, -1)], hold: 1 },
    { actors: [hero('stand', -2, 0, STING_W), jelly(1, 20, -4)], hold: 1 },
    { actors: [hero('stand', -2, 0, STING_R), jelly(2, 22, -7)], hold: 1 },
    { actors: [hero('stand', -1, 0)], hold: 1 },
    { actors: [hero('stand')], hold: 1 },
  ),
  // The light bursts out behind the vessel's bow.
  turnComplete: once(
    { actors: [hero('stand'), at('chest', CHEST_AT.x, CHEST_AT.y)], hold: 2 },
    { actors: [placed('rays1', CHEST_AT.x - 3, CHEST_AT.y - 9), hero('stand'), at('chestOpen', CHEST_AT.x, CHEST_AT.y - 1)], hold: 1 },
    { actors: [placed('rays2', CHEST_AT.x - 4, CHEST_AT.y - 10), hero('itemGet'), at('chestOpen', CHEST_AT.x, CHEST_AT.y - 1), ...held('gem', 0)], hold: 2 },
    { actors: [placed('rays1', CHEST_AT.x - 3, CHEST_AT.y - 9), hero('itemGet'), at('chestOpen', CHEST_AT.x, CHEST_AT.y - 1), ...held('gem', 1)], hold: 3 },
  ),
  milestone: once({ actors: [hero('stand'), at('marker', MARKER.x, MARKER.y)], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [hero('lie'), ...rise('bub2', 3, -1), ...rise('bub1', 4, 3)], hold: 2 },
    { actors: [hero('lie'), ...rise('bub1', 4, 1)], hold: 2 },
    { actors: [hero('lie'), ...rise('bubPop', 3, 1)], message: 'cacheCold', hold: 12 },
  ),
  limitWarning: once(
    { actors: [hero('stand'), ...tide(0, 0)], message: 'limitWarning', hold: 2 },
    { actors: [hero('walk', -1, 0), ...tide(1, 1)], message: 'limitWarning', hold: 2 },
    { actors: [hero('stand', -1, 0), ...tide(0, 2)], message: 'limitWarning', hold: 2 },
    { actors: [hero('walk', -2, 0), ...tide(1, 3)], message: 'limitWarning', hold: 2 },
    { actors: [hero('stand', -1, 0), ...tide(0, 0)], message: 'limitWarning', hold: 5 },
    { actors: [hero('stand'), ...tide(1, 1)], message: 'limitWarning', hold: 2 },
  ),
  // Forward and up (straight up, the Nautilus's stern would cross the air gauge), a stop, and down again.
  compaction: once(
    { actors: [placed('bubTrail', 6, 7), hero('walk', 6, -1)], hold: 2, caption: 'compaction' },
    { actors: [placed('bubTrail', 8, 7), hero('stand', 8, -3)], hold: 2, caption: 'compaction' },
    { actors: [placed('bubTrail', 10, 6), hero('walk', 10, -6)], hold: 2, caption: 'compaction' },
    { actors: [hero('stand', 10, -6), placed('bub2', 14, 11)], texts: [STOP], hold: 3, caption: 'compaction' },
    { actors: [hero('stand', 8, -3), placed('bub1', 12, 13)], hold: 1, caption: 'compaction' },
    { actors: [hero('stand')], hold: 2, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [hero('stand'), placed('burst1', 2, 2)], hold: 1 },
    { actors: [placed('burst2', 1, -3), placed('burst1', 6, 4)], hold: 2 },
    { actors: [hero('itemGet'), placed('burst1', 4, -6)], hold: 2, caption: 'modelChange' },
    { actors: [hero('itemGet')], hold: 5, caption: 'modelChange' },
  ),
  effortChange: once(
    { actors: [hero('stand')], hold: 2 },
    { actors: [hero('lamp'), ...flare], hold: 1 },
    { actors: [hero('lamp'), lamp(), ...flare], hold: 2, caption: 'effortChange' },
    { actors: [hero('lamp'), lamp()], hold: 4, caption: 'effortChange' },
  ),
}

/** A vessel's poses. `lamp`: holding the lamp out (the `attack` sprite, but for the Leviathan, which dangles it from its lure). */
const poses = (p: string, lamp = `${p}Attack`) => ({ stand: `${p}Stand`, walk: `${p}Walk`, attack: `${p}Attack`, itemGet: `${p}ItemGet`, sleep: `${p}Sleep`, lie: `${p}Lie`, lamp })

export const deepsea: Theme = {
  id: 'deepsea',
  name: 'Twenty Thousand Tokens Under the Sea',
  description: 'An original voyage: the sea darkens as context fills; vessels by model, lamps by effort, air for cache, pearls for cents',
  version: '1.1.0',
  palette: {
    dark: { accent: '#4fe0d8', gold: '#f0c860', red: '#ff6a5a', label: '#7fc8f0', dim: '#7892a0', text: '#e6f6fa' },
    light: { accent: '#0c7570', gold: '#8c6210', red: '#c0362c', label: '#1d5f8a', dim: '#586c78', text: '#10222c' },
  },
  pixels,
  labels: {
    context: 'DIVE',
    spend: 'PEARLS',
    cache: 'AIR',
    limits: 'TIDE',
    modelItem: 'VESSEL',
    effortItem: 'LAMP',
    heroes: 'Vessels',
    weapons: 'Lamps',
  },
  headings: {
    Context: 'Dive',
    Cost: 'Pearls',
    'Next message': 'Air',
    Tokens: 'Ballast',
    Limits: 'Tides',
    'Tool calls': "Ship's log",
    Files: 'Charts',
  },
  sprites,
  states,
  cold,
  overkill,
  events,
  scene: {
    height: 40,
    anchor: { x: 14, y: 20 },
    background: {
      ground: '#0e5280',
      gradient: ['#b4f4ee', '#7ce0e2', '#46c4d4', '#2aa2c4', '#1a82ae', '#136896', '#0e5280'],
      deep: ['#071244', '#050c30', '#030820', '#020514', '#01030c', '#000206', '#000103'],
      floor: 'seabed',
      shade: { color: '#000206', amount: 0.75 },
      // Under the gauge, left of every hull: kelp and coral in the light, tube worms in the dark. Past the action
      // (columns 0..45), from the right edge in: the wreck's bow at 58, her mast and more kelp at 80, the rest at 96.
      decor: [
        { sprite: 'sunShafts', x: 17, y: 0, sky: true, maxPercent: 30 },
        { sprite: 'gauge', x: 0, y: 0, sky: true, ring: true },
        { sprite: 'kelpL', x: 0, y: 23, maxPercent: 60 },
        { sprite: 'coralSmall', x: 0, y: 31, maxPercent: 50 },
        { sprite: 'worms', x: 0, y: 30, minPercent: 50 },
        { sprite: 'wreck', x: -1, y: 16, minColumns: 56 },
        { sprite: 'wreckMast', x: -11, y: 6, minColumns: 78 },
        { sprite: 'kelpR', x: -24, y: 14, minColumns: 78, maxPercent: 60 },
        { sprite: 'oldAnchor', x: -32, y: 27, minColumns: 94 },
        { sprite: 'coral', x: -40, y: 28, minColumns: 94, maxPercent: 50 },
        { sprite: 'worms', x: -41, y: 30, minColumns: 94, minPercent: 50 },
      ],
      // Bubbles; glints far down; marine snow; glowing plankton; sun motes in the shallows.
      particles: [
        { colors: ['#d8fbff', '#a8ecff', '#ffffff'], count: 9, drift: 'up', speed: 1 },
        { colors: ['#ffffff', '#9ffcff'], count: 6, drift: 'none', minPercent: 85 },
        { colors: ['#8aa4b0', '#6c8894', '#a8bcc4'], count: 22, drift: 'down', speed: 0.5, minPercent: 30 },
        { colors: ['#4ff8e8', '#7ac8ff', '#c49cff', '#8affb0', '#ff9ae8'], count: 18, drift: 'left', speed: 0.4, minPercent: 70 },
        { colors: ['#f8ffe0', '#e0fff8', '#fffbd0'], count: 18, drift: 'down', speed: 0.25, maxPercent: 35 },
      ],
    },
    hero: poses('sc'),
    heroTiers: { tier1: {}, tier2: {}, tier3: {}, tier4: {}, unknown: {} },
    heroForms: {
      tier1: { poses: poses('sn'), dx: 0, dy: 0, lift: 0 },
      tier3: { poses: poses('nau'), dx: -8, dy: -2, lift: 2 },
      tier4: { poses: poses('lev', 'levLamp'), dx: -6, dy: -2, lift: 2, hand: LURE },
      unknown: { poses: poses('bell'), dx: 0, dy: -2, lift: 2 },
    },
    heroNames: {
      tier1: 'The Snorkeler',
      tier2: 'The Reef Diver',
      tier3: 'The Nautilus',
      tier4: 'The Leviathan',
      unknown: 'The Diving Bell',
    },
    weapons: {
      low: { sprite: 'candleLamp', swap: { mlGlow: CANDLE[2]!, mlCore: CANDLE[0]! }, name: 'Candle Lantern' },
      medium: { sprite: 'oilLamp', swap: { mlGlow: OIL[2]!, mlCore: OIL[0]! }, name: 'Oil Lamp' },
      high: { sprite: 'arcLamp', swap: { mlGlow: ARCL[3]!, mlCore: WHITE }, name: 'Arc Lamp' },
      xhigh: { sprite: 'searchlight', swap: { mlGlow: SEARCH[3]!, mlCore: WHITE }, name: 'Searchlight' },
      max: { sprite: 'sunbeam', swap: { mlGlow: SUN[3]!, mlCore: WHITE }, aura: 'sunMotes', name: 'Sunbeam' },
    },
    bar: {
      // 48 and 58: the dive, the pearls and both boxes on the first row; air, tide (and the chart at 58) on the second.
      widgets: [
        { kind: 'map', drop: 5 },
        { kind: 'counter', value: 'contextUsed', icon: 'anchorIcon', label: 'DIVE', format: '{v}M', scale: 100, chars: 5 },
        { kind: 'counter', value: 'spend', icon: 'pearlIcon', label: 'PEARLS', format: 'x{v}' },
        {
          kind: 'box',
          shows: 'model',
          sprite: 'iconBell',
          sprites: { tier1: 'iconSnorkeler', tier2: 'iconDiver', tier3: 'iconNautilus', tier4: 'iconLeviathan' },
          label: 'VESSEL',
          x: 1,
          y: 4,
          drop: 3,
        },
        {
          kind: 'box',
          shows: 'effort',
          sprite: 'lampIcon1',
          sprites: { low: 'lampIcon0', high: 'lampIcon2', xhigh: 'lampIcon3', max: 'lampIcon4' },
          label: 'LAMP',
          x: 1,
          y: 4,
          drop: 2,
        },
        { kind: 'meter', value: 'cache', count: 8, perRow: 4, sprites: ['air0', 'air1', 'air2'], label: 'AIR', pulseBelow: 0.15, wrap: true },
        { kind: 'counter', value: 'limitMax', icon: 'tideIcon', label: 'TIDE', format: '{v}%', drop: 4 },
      ],
      colors: { bg: 'barBg', box: BRASS[3]!, text: 'barText', label: 'barLabel', map: 'chart', mapDot: 'chartDot' },
    },
    lineup: { ground: '#0e5280', ink: '#e8f8ff', dim: '#b0d4e4', mark: '#ffd060' },
    message: { bg: '#0c2636', ink: 'barText' },
    stamina: { x: 2, y: 2, radius: 5, full: 'airFull', empty: 'airEmpty', cold: 'airCold', tagIcon: 'pearlIcon', tagColor: '#e8f8ff', tagColdColor: '#a4b8c6' },
  },
  text: {
    idle: 'Resting on the seabed, bubbles rising slow.',
    thinking: 'Sonar pings out into the dark...',
    reading: 'The lamp lights the pages of a sunken log.',
    editing: 'Welding the hull, sparks in the water.',
    shell: 'The engine turns, pistons pounding.',
    agents: 'Scout fish dart off into the deep.',
    toolSuccess: 'A pearl, found in a clam!',
    toolError: 'Stung by a jellyfish!',
    turnComplete: 'A treasure chest bursts with light!',
    milestone: 'We pass a depth marker.',
    cacheCold: 'The air has run out.',
    limitWarning: 'The tide is turning.',
    compaction: 'A decompression ascent.',
    modelChange: 'A new vessel arrives!',
    effortChange: 'A new lamp is lit!',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: "CAPTAIN'S LOG: {pct}% FATHOMED. SUNLIT SHALLOWS; ALL IS CALM." },
    { level: 'warn', message: "CAPTAIN'S LOG: {pct}% FATHOMED. THE LIGHT FADES. MIND OUR DEPTH." },
    { level: 'orange', message: "CAPTAIN'S LOG: {pct}% FATHOMED. THE TWILIGHT ZONE. SEEK A PLACE TO MOOR." },
    { level: 'alert', message: "CAPTAIN'S LOG: {pct}% FATHOMED. THE MIDNIGHT ZONE. THE PRESSURE GROWS DANGEROUS." },
    { level: 'critical', message: "CAPTAIN'S LOG: {pct}% FATHOMED. THE ABYSS! SAVE YOUR PROGRESS AND SURFACE (/clear)." },
  ],
  messages: {
    cacheCold: 'THE AIR IS SPENT. YOUR CACHE IS COLD.',
    limitWarning: 'THE TIDE TURNS AGAINST US. {name} AT {pct}%.',
    compaction: 'Decompression stop: the log is compacted, and we rise.',
    modelChange: 'A new vessel puts to sea: {name}.',
    effortChange: 'The {weapon} is lit.',
  },
}
