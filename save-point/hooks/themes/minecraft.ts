// "Tokencraft": a voxel-survival homage. Every sprite is drawn fresh for this theme in that blocky style.
//
// The model is the miner's armor (leather, iron, enchanted diamond, enchanted
// netherite), effort is the pickaxe, context is how deep you have mined (grass
// and sky, stone, deepslate, then lava over bedrock), the cache is the hunger
// bar (and the day clock in the corner: when it runs out the light goes, night
// above ground and a dead torch below, on an empty stomach), cents are emeralds.
//
// Layout: the ring and its price tag own columns 0..10 down to y 16. The miner
// stands at 12..27 (the champion at 10..29) and every prop is in 30..45, so the
// action is whole in a 48-column pane. Scenery past column 45 hangs from the
// right edge and joins at 58, 80 and 96 columns.
//
// The miner and the pickaxe use single-letter pixel keys (so 'C' is the
// chestplate) that every armor tier and pickaxe material swaps. Scenery is
// drawn with a legend per sprite, or painted in code (terrain strips).

import { at, hero, loop, once, mixHex, weapon } from './kit'
import { rotate } from './pixel'
import type { Actor, Animation, Frame, HeroTier, SceneText, Sprite, Theme, ThemeAction } from './types'

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const pixels: Record<string, string> = {
  // The miner: armor keys default to iron; every tier swaps them.
  A: '#eeeeee', // helmet
  a: '#bcbcbc',
  C: '#eeeeee', // chestplate and sleeves
  c: '#bcbcbc',
  L: '#eeeeee', // leggings
  l: '#bcbcbc',
  B: '#bcbcbc', // boots
  b: '#7c7c7c',
  E: '#ffffff', // enchantment glint spot on the chest
  e: '#ffffff', // and the one on the helmet (hair on a bare head)
  T: '#7c7c7c', // trim
  R: '#c4262e', // cape
  r: '#7e1218',
  S: '#f0b48c', // skin
  s: '#c98d66',
  H: '#6a4630', // beard
  W: '#ffffff',
  K: '#4433aa', // eyes
  // The pickaxe
  M: '#8f8f8f', // head
  m: '#5e5e5e',
  n: '#b0b0b0', // head highlight (the glint on enchanted picks)
  w: '#7a5230', // stick
  // Armor materials
  leaL: '#b07445',
  leaS: '#8a552e',
  leaD: '#5e3a1e',
  ironL: '#eeeeee',
  ironS: '#bcbcbc',
  ironD: '#7c7c7c',
  diaL: '#7af5ec',
  diaS: '#33c9c0',
  diaD: '#1a8a84',
  nethL: '#6e666b',
  nethS: '#4a4347',
  nethD: '#2c272a',
  gold: '#f2c53d',
  glint: '#d890ff',
  glint2: '#a65ef0',
  capeR: '#c4262e',
  capeRS: '#7e1218',
  capeP: '#7b3fc4',
  capePS: '#45207a',
  // The unarmored wanderer
  shirt: '#16a8a8',
  shirtS: '#0e7a7a',
  pants: '#3a3a9e',
  pantsS: '#28287a',
  shoe: '#5c5c5c',
  shoeS: '#3e3e3e',
  hair: '#3d2614',
  hairS: '#2a190c',
  // Taking damage
  hurt: '#ff4848',
  hurtD: '#b01818',
  hurtL: '#ff9a9a',
  // Pickaxe materials
  woodM: '#c29a5b',
  woodS: '#7a5a2e',
  woodN: '#dcb878',
  stoneM: '#9a9a9a',
  stoneS: '#5e5e5e',
  stoneN: '#c0c0c0',
  ironM: '#e8e8e8',
  ironP: '#9c9c9c',
  ironN: '#ffffff',
  diaM: '#5ff2e6',
  diaP: '#1fa39a',
  nethM: '#625a60',
  nethP: '#36302f',
  // Terrain
  grass1: '#7ec850',
  grass2: '#5fa83a',
  grass3: '#4a8a2c',
  dirt1: '#9a6a44',
  dirt2: '#865a38',
  dirt3: '#6c472a',
  stone1: '#9a9a9a',
  stone2: '#858585',
  stone3: '#6e6e6e',
  deep1: '#5e5e66',
  deep2: '#4a4a52',
  deep3: '#38383f',
  bed1: '#5a5a5a',
  bed2: '#2e2e2e',
  bed3: '#141414',
  lava1: '#fff07a',
  lava2: '#ffb02a',
  lava3: '#e8661a',
  lava4: '#b83c10',
  // Ores
  coal: '#2a2a2a',
  coalD: '#121212',
  ironO: '#e2c0a2',
  ironOD: '#b08a6a',
  goldO: '#fce25a',
  goldOD: '#c8a020',
  redO: '#ff2a2a',
  redOD: '#a80c0c',
  diaO: '#6ff8ec',
  diaOD: '#1fb0a6',
  lapis: '#3a5ce0',
  lapisD: '#203a9a',
  // Wood and blocks
  plankL: '#c8a064',
  plank: '#ad8650',
  plankD: '#7e5e34',
  logD: '#5a4024',
  tool: '#4a4a4a',
  leaf1: '#4ca02c',
  leaf2: '#3a8020',
  leaf3: '#2a6416',
  bark: '#6a4a28',
  barkD: '#4a321a',
  // Light and fire
  flame: '#ffd84a',
  flameO: '#ff8a1a',
  flameW: '#fffbe0',
  sunY: '#fff26b',
  sunO: '#f5c542',
  sunsetD: '#e0602a',
  cloudW: '#ffffff',
  cloudG: '#e4ecf6',
  night: '#0c1230',
  dusk1: '#241a4e',
  dusk2: '#4e2a6e',
  dusk3: '#93406e',
  dusk4: '#d8684e',
  dusk5: '#f6a84a',
  cave1: '#34343e',
  cave2: '#2a2a33',
  cave3: '#22222a',
  caveD1: '#24242c',
  caveD2: '#1c1c23',
  caveD3: '#15151b',
  dim1: '#1a1a21',
  dim2: '#14141a',
  dim3: '#0f0f14',
  dark1: '#0e0e14',
  dark2: '#0a0a0f',
  dark3: '#060609',
  glow1: '#8a3410',
  glow2: '#5a1c0a',
  glow3: '#34120c',
  glow4: '#1c0c0c',
  birchL: '#9ad85e',
  pageS: '#cfc4a8',
  starW: '#f4f4ff',
  starD: '#9aa6d8',
  moon: '#f0f0d8',
  moonD: '#c8c8a8',
  // Things and mobs
  book1: '#b03a2e',
  book2: '#2e5ab0',
  book3: '#3a9a3a',
  book4: '#c8a03a',
  cloth: '#b0242c',
  clothD: '#7a141a',
  obsid: '#1e1428',
  obsidL: '#3c2a5a',
  page: '#f4ecd8',
  cover: '#7a3a1e',
  rune: '#e8d8ff',
  anvil: '#4e4e4e',
  anvilL: '#6e6e6e',
  anvilD: '#2e2e2e',
  quilt: '#c8303a',
  quiltL: '#e05a60',
  quiltD: '#8a1a22',
  pillow: '#f2f2f2',
  dust: '#5a0a0a',
  dustOn: '#ff2a2a',
  lampK: '#3a2414',
  lampL: '#6b4a2a',
  lampl: '#4f3420',
  lampOnK: '#7a5424',
  lampOnL: '#ffe8a0',
  lampOnl: '#f0a030',
  cobble1: '#8a8a8a',
  cobble2: '#5e5e5e',
  creep1: '#5fbc4a',
  creep2: '#3e8a2e',
  creep3: '#8fd87a',
  creepK: '#141414',
  wolf: '#e8e8e8',
  wolfS: '#b8b8b8',
  collar: '#d02828',
  boneW: '#f0ead8',
  boneY: '#ead79a',
  love: '#ff5a7a',
  orbG: '#a8ff3a',
  orbY: '#f0ff8a',
  orbD: '#5ab01a',
  smoke1: '#ffffff',
  smoke2: '#cfcfcf',
  smoke3: '#9a9a9a',
  boomO: '#ffcc3a',
  sweat: '#e6f6ff',
  sweatS: '#6ab4f0',
  borderR: '#ff3a3a',
  borderD: '#c01a1a',
  toastF: '#212121',
  toastB: '#5a5a5a',
  gridF: '#c6c6c6',
  gridS: '#8b8b8b',
  gridD: '#555555',
  ink: '#1e1e1e',
  // Status bar
  hudBg: '#1e1e1e',
  slot: '#8b8b8b',
  hudText: '#ffffff',
  hudLabel: '#ffff55',
  mapGray: '#555555',
  heart: '#e8202c',
  heartL: '#ff9a9a',
  heartD: '#a00f1c',
  heartE: '#4a1616',
  heartED: '#300d0d',
  meat: '#b4632f',
  meatL: '#e09454',
  meatD: '#84421c',
  foodE: '#3e2c1c',
  foodED: '#2a1d12',
  emerald: '#17dd62',
  emeraldL: '#a8ffc8',
  emeraldD: '#0a8a3a',
  clockDay: '#ffd84a',
  clockNight: '#3442a0',
  clockCold: '#c8d4e6',
  lineupBg: '#78a4ff',
  msgBg: '#1a1a1a',
}

// ---------------------------------------------------------------------------
// Painting helpers
// ---------------------------------------------------------------------------

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&*+-=?@^_~<>/|:;,'

/** A sprite painted in code: `at` names the pixel color at (x, y), or null. */
function paint(w: number, h: number, at: (x: number, y: number) => string | null): Sprite {
  const map = new Map<string, string>()
  const legend: Record<string, string> = {}
  const rows: string[] = []
  for (let y = 0; y < h; y++) {
    let row = ''
    for (let x = 0; x < w; x++) {
      const n = at(x, y)
      if (!n) {
        row += '.'
        continue
      }
      let ch = map.get(n)
      if (!ch) {
        ch = POOL[map.size]!
        map.set(n, ch)
        legend[ch] = n
      }
      row += ch
    }
    rows.push(row)
  }
  return { rows, legend }
}

/** A steady pseudo-random number in [0, 1) for a pixel. */
function rnd(x: number, y: number, seed: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return v - Math.floor(v)
}

/** One of three shades, the middle one most often. */
const tone = (ramp: [string, string, string], x: number, y: number, seed: number) => {
  const r = rnd(x, y, seed)
  return r < 0.22 ? ramp[0] : r > 0.78 ? ramp[2] : ramp[1]
}

const spr = (rows: string[], legend: Record<string, string | null>): Sprite => ({ rows, legend })

const STONE: [string, string, string] = ['stone1', 'stone2', 'stone3']
const DIRT: [string, string, string] = ['dirt1', 'dirt2', 'dirt3']
const DEEP: [string, string, string] = ['deep1', 'deep2', 'deep3']
const BEDROCK: [string, string, string] = ['bed1', 'bed2', 'bed3']

/** Where ore sits inside an 8 by 8 block: light specks, then their shade. */
const ORE_LIGHT = ['1,1', '2,1', '5,2', '2,5', '5,5', '6,4']
const ORE_DARK = ['1,2', '6,2', '3,5', '6,5', '2,6', '5,1']
function oreAt(x: number, y: number, ore: [string, string] | null): string | null {
  if (!ore) return null
  const k = `${x & 7},${y & 7}`
  return ORE_LIGHT.includes(k) ? ore[0] : ORE_DARK.includes(k) ? ore[1] : null
}

/** An 8 by 8 block of a stone ramp with an ore. */
const block = (ramp: [string, string, string], seed: number, ore: [string, string] | null = null) =>
  paint(8, 8, (x, y) => oreAt(x, y, ore) ?? tone(ramp, x, y, seed))

// Terrain strips: 96 wide, the widest pane.
const STRIP = 96
const ORES: Record<string, [string, string]> = {
  coal: ['coal', 'coalD'],
  iron: ['ironO', 'ironOD'],
  gold: ['goldO', 'goldOD'],
  red: ['redO', 'redOD'],
  dia: ['diaO', 'diaOD'],
  lapis: ['lapis', 'lapisD'],
}
const stoneOre = (bx: number) => (bx % 4 === 1 ? ORES.coal! : bx % 6 === 3 ? ORES.iron! : null)
const deepOre = (bx: number) => (bx % 5 === 2 ? ORES.red! : bx % 7 === 4 ? ORES.dia! : bx % 6 === 0 ? ORES.gold! : bx % 9 === 7 ? ORES.lapis! : null)

const floorGrass = paint(STRIP, 6, (x, y) => {
  if (y === 0) return rnd(x, y, 1) < 0.3 ? 'grass1' : 'grass2'
  if (y === 1) return rnd(x, y, 1) < 0.25 ? 'grass3' : 'grass2'
  if (y === 2 && rnd(x, y, 2) < 0.45) return 'grass3'
  return tone(DIRT, x, y, 3)
})
const floorStone = paint(STRIP, 6, (x, y) => oreAt(x, y, stoneOre(x >> 3)) ?? tone(STONE, x, y, 4))
const floorDeep = paint(STRIP, 6, (x, y) => oreAt(x, y, deepOre(x >> 3)) ?? (y % 3 === 0 && rnd(x, y, 6) < 0.5 ? 'deep3' : tone(DEEP, x, y, 5)))
// At the bottom the miner walks a deepslate shelf on piers over the lava; bedrock under it.
const floorLava = paint(STRIP, 6, (x, y) => {
  if (y < 2) return oreAt(x, y + 1, (x >> 3) % 4 === 0 ? ORES.dia! : null) ?? tone(DEEP, x, y, 11)
  if (x % 16 < 2) return tone(DEEP, x, y, 11)
  if (y === 5) return tone(BEDROCK, x, y, 10)
  if (y === 2) return rnd(x, y, 7) < 0.4 ? 'lava1' : 'lava2'
  return rnd(x, y, 8) < 0.3 ? (y === 3 ? 'lava2' : 'lava4') : 'lava3'
})
/** Where a lava fall lands: lava up to the floor line. */
const lavaPool = (w: number) => paint(w, 6, (x, y) => (y === 0 ? (rnd(x, y, 7) < 0.5 ? 'lava1' : 'lava2') : y < 3 ? (rnd(x, y, 8) < 0.3 ? 'lava2' : 'lava3') : rnd(x, y, 9) < 0.3 ? 'lava4' : 'lava3'))
/** A cave ceiling: rock with a ragged lower edge. */
const ceiling = (ramp: [string, string, string], ore: (bx: number) => [string, string] | null, seed: number) =>
  paint(STRIP, 6, (x, y) => {
    if (y === 5 && rnd(x, 0, seed) < 0.6) return null
    if (y === 4 && rnd(x, 0, seed + 1) < 0.25) return null
    return oreAt(x, y + 2, ore(x >> 3)) ?? tone(ramp, x, y, seed)
  })
/** The rock behind a cave, in two-pixel grains, darker than the floor so armor and props stand out. Taller than the tallest scene. */
const caveWall = (ramp: [string, string, string], seed: number) => paint(STRIP, 60, (x, y) => tone(ramp, x >> 1, y >> 1, seed))
/** The same rock, `h` rows of it with a ragged lower edge: over the lava it stops short of the floor and the glow shows under it. */
const caveBrow = (h: number) => paint(STRIP, h, (x, y) => (y >= h - 4 && rnd(x >> 1, y >> 1, 19) < (y - (h - 6)) / 5 ? null : tone(['caveD1', 'caveD2', 'caveD3'], x >> 1, y >> 1, 18)))

// Skies that cover the scene above the floor at any height it grows to (the
// design height shows their lower 34 rows), for the surface. The moon and the
// low sun are over the second prop column, clear of the bed, the torch and a
// two-line message.
const SKY_H = 54
const nightSky = paint(STRIP, SKY_H, (x, y) => {
  if (x >= 38 && x < 44 && y >= 32 && y < 38) return x === 38 || y === 37 ? 'moonD' : 'moon'
  const r = rnd(x, y, 12)
  return r < 0.012 ? 'starW' : r < 0.022 ? 'starD' : 'night'
})
const DUSK = ['dusk1', 'dusk2', 'dusk3', 'dusk4', 'dusk5']
const duskSky = paint(STRIP, SKY_H, (x, y) => {
  if (x >= 38 && x < 46 && y >= SKY_H - 8) return x === 38 || x === 45 || y === SKY_H - 8 ? 'sunsetD' : 'sunY'
  // Bands from indigo down to gold at the horizon, checkered where they meet.
  const k = ((y - 16) / (SKY_H - 17)) * 4 + ((x + y) % 2 ? 0.06 : -0.06)
  return DUSK[Math.max(0, Math.min(4, Math.round(k)))]!
})

/** A stone ramp `t` (0..1) of the way to black. */
const dimmed = (ramp: [string, string, string], t: number) => ramp.map(n => mixHex(pixels[n]!, '#000000', t)) as [string, string, string]
/**
 * The cave with the torch guttering, or out: the rock barely seen, no sky. As tall as the skies, and six
 * rows more: the cave's own floor (`floor`: its ramp, and how far to black) without its ore. Over the lava
 * (`glow`, from the floor up) a dull red is left along the floor instead, and the lava keeps its light.
 */
const caveDark = (ramp: [string, string, string], seed: number, o: { glow?: string[]; floor?: [[string, string, string], number] } = {}) => {
  const ground = o.floor ? dimmed(...o.floor) : null
  const deep = o.floor?.[0] === DEEP
  return paint(STRIP, SKY_H + 6, (x, y) => {
    // The same grain as `floorStone` and `floorDeep`.
    if (y >= SKY_H) return !ground ? null : deep ? ((y - SKY_H) % 3 === 0 && rnd(x, y - SKY_H, 6) < 0.5 ? ground[2] : tone(ground, x, y - SKY_H, 5)) : tone(ground, x, y - SKY_H, 4)
    const g = (SKY_H - 1 - y) / 3 + ((x + y) % 2 ? 0.3 : -0.3)
    return o.glow && g < o.glow.length ? o.glow[Math.max(0, Math.floor(g))]! : tone(ramp, x >> 1, y >> 1, seed)
  })
}

/** A lava fall, `w` wide. Drawn twice, hung from the ceiling and standing on the floor, so it spans a taller scene too. */
const lavaFall = (w: number) => paint(w, 30, (x, y) => ((y + x * 3) % 7 === 0 ? 'lava1' : (y + x) % 5 === 0 ? 'lava3' : w > 2 && (x === 0 || x === w - 1) ? 'lava3' : 'lava2'))

/** Explosion clouds: rings of white puffs. */
const puff = (w: number, h: number, seed: number, hot: boolean) =>
  paint(w, h, (x, y) => {
    const dx = (x + 0.5 - w / 2) / (w / 2)
    const dy = (y + 0.5 - h / 2) / (h / 2)
    const d = dx * dx + dy * dy
    if (d > 1 || rnd(x, y, seed) < d * 0.55) return null
    if (hot && d < 0.25) return 'boomO'
    return d < 0.45 ? 'smoke1' : d < 0.75 ? 'smoke2' : 'smoke3'
  })

/** The world border: a wall of red diagonal stripes rising from the ground, thinning out at the top. */
const borderWall = paint(6, 30, (x, y) => {
  const stripe = (x + y) % 4
  if (stripe > 1 || (y < 8 && rnd(x, y, 16) > (y + 1) / 9)) return null
  return stripe === 0 ? 'borderR' : 'borderD'
})

/** The advancement toast: a dark panel with a diamond. Seven rows: two of text, and a pixel to spare over a raised diamond. */
const DIAMOND_ICON = ['.cCCc.', 'cWCCCc', 'kcCCck', '.kcck.', '..kk..']
const toastPanel = paint(27, 7, (x, y) => {
  const edge = x === 0 || x === 26 || y === 0 || y === 6
  if ((x === 0 || x === 26) && (y === 0 || y === 6)) return null
  const icon = DIAMOND_ICON[y - 1]?.[x - 2]
  if (icon && icon !== '.') return { c: 'diaS', C: 'diaL', W: 'W', k: 'diaD' }[icon] ?? null
  return edge ? 'toastB' : 'toastF'
})

// ---------------------------------------------------------------------------
// The miner: 16 by 16, facing right. Armor keys swap per tier.
// ---------------------------------------------------------------------------

const HEAD = [
  '....AAAAAAAA....',
  '...AAAAAAAAeA...',
  '...aaaaaaaaaaa..',
  '...aaSSSSSSSS...',
  '...aaSWKSSWKS...',
  '...aaSSSSsSSS...',
  '....aSSHHHHSS...',
]
const HEAD_ASLEEP = [...HEAD.slice(0, 4), '...aaSKKSSKKS...', ...HEAD.slice(5)]
const BODY = ['....CCCCCCCC....', '...cCCCECCCCCC..', '...cCCCCCCCCcC..', '...cCCCCCCCCcC..', '...SCCCCCCCCSS..']
const LEGS = ['....LLLLLLLL....', '....LLLlLLLl....', '....LLLlLLLl....', '....BBBbBBBb....']
const STRIDE = ['....LLLLLLLL....', '...LLLl.LLLl....', '..LLLl...LLLl...', '..BBBb...BBBb...']

// The champion (Opus and above): 20 by 20, a bigger miner in full gear with a
// trimmed helm, broad shoulders and a cape. Feet level with the standard miner's.
const G_HEAD = [
  '......AAAAAAAAA.....',
  '.....AAAeAAAAAAA....',
  '....AAAAAAAAAAAAA...',
  '....aTTTTTTTTTTTTT..',
  '....aaSSSSSSSSSS....',
  '....aaSWWKSSWWKS....',
  '....aaSSSSSssSSS....',
  '....aaSSHHHHHHSS....',
  '.....aSSSSSSSSSS....',
]
const G_HEAD_ASLEEP = [...G_HEAD.slice(0, 5), '....aaSKKKSSKKKS....', ...G_HEAD.slice(6)]
const G_BODY = [
  '..RRCCCCCCCCCCCCC...',
  '.RRcCCCCCCEECCCCCC..',
  '.RRcCCCTTTTTCCCcCC..',
  'RRrcCCCCCCCCCCCcCC..',
  'RRrcCCCECCCCCCCcCC..',
  'RRrSSCCCCCCCCCCSSS..',
]
const G_LEGS = ['RRr.LLLLLLLLLLLL....', 'Rr..LLLLLlLLLLLl....', 'r...LLLLLlLLLLLl....', '....TTTTTbTTTTTb....', '....BBBBBbBBBBBb....']
const G_STRIDE = ['RRr.LLLLLLLLLLLL....', 'Rr.LLLLLl..LLLLLl...', 'r.LLLLLl....LLLLLl..', '.TTTTTb......TTTTTb.', '.BBBBBb......BBBBBb.']

// The pickaxe like its inventory icon: head at the top right, stick to the
// bottom left. Raised, it is held by the stick's end; flipped (`flipY`) it is
// mid-strike, head down on the block.
const PICK_ICON = ['..nMMMM..', '.MMmmmMM.', 'Mm...wmMM', '....ww.MM', '...ww..mM', '..ww....M', '.ww.....m', 'ww.......', 'w........']

const sprites: Theme['sprites'] = {
  stand: { rows: [...HEAD, ...BODY, ...LEGS] },
  walk: { rows: [...HEAD, ...BODY, ...STRIDE] },
  attack: {
    rows: [...HEAD, '....CCCCCCCC....', '...cCCCECCCCCCSS', '...cCCCCCCCCCCSS', '...cCCCCCCCC....', '...SCCCCCCCC....', ...LEGS],
  },
  itemGet: {
    rows: [
      'SS..AAAAAAAA..SS',
      'cC.AAAAAAAAeA.Cc',
      'cC.aaaaaaaaaaaCc',
      'cC.aaSSSSSSSS.Cc',
      'cC.aaSWKSSWKS.Cc',
      'cC.aaSSSSsSSS.Cc',
      'cC..aSSHHHHSS.Cc',
      'cCCCCCCCCCCCCCCc',
      '...cCCCECCCCc...',
      '...cCCCCCCCCc...',
      '...cCCCCCCCCc...',
      '...cCCCCCCCCc...',
      ...LEGS,
    ],
  },
  sleep: { rows: [...HEAD_ASLEEP, ...BODY, ...LEGS] },
  gStand: { rows: [...G_HEAD, ...G_BODY, ...G_LEGS] },
  gWalk: { rows: [...G_HEAD, ...G_BODY, ...G_STRIDE] },
  gAttack: {
    rows: [
      ...G_HEAD,
      '..RRCCCCCCCCCCCCC...',
      '.RRcCCCCCCEECCCCCCSS',
      '.RRcCCCTTTTTCCCCCCSS',
      'RRrcCCCCCCCCCCCC....',
      'RRrcCCCECCCCCCCC....',
      'RRrSSCCCCCCCCCCC....',
      ...G_LEGS,
    ],
  },
  gItemGet: {
    rows: [
      '.SS...AAAAAAAAA...SS',
      '.cC..AAAeAAAAAAA..Cc',
      '.cC.AAAAAAAAAAAAA.Cc',
      '.cC.aTTTTTTTTTTTTTCc',
      '.cC.aaSSSSSSSSSS..Cc',
      '.cC.aaSWWKSSWWKS..Cc',
      '.cC.aaSSSSSssSSS..Cc',
      '.cC.aaSSHHHHHHSS..Cc',
      '.cC..aSSSSSSSSSS..Cc',
      '.cCCCCCCCCCCCCCCCCc.',
      '.R.cCCCCCCEECCCc....',
      'RR.cCCCTTTTTCCCc....',
      'RR.cCCCCCCCCCCCc....',
      'Rr.cCCCECCCCCCCc....',
      'Rr.cCCCCCCCCCCCc....',
      ...G_LEGS,
    ],
  },
  gSleep: { rows: [...G_HEAD_ASLEEP, ...G_BODY, ...G_LEGS] },
  pick: { rows: PICK_ICON },
  pickAura: {
    rows: ['....g.g....', '.g.......g.', '...........', 'g.........g', '...........', '.g.......g.', '...........', 'g.........g', '...........', '.g.......g.', '....g.g....'],
    legend: { g: 'glint' },
  },
  // Status bar
  // Three and four pixels wide, a pixel apart, the last row blank so the two rows of five do not touch.
  heart0: spr(['e.e', 'eee', 'eeE', '.E.', '...'], { e: 'heartE', E: 'heartED' }),
  heart1: spr(['H.e', 'hhe', 'hhE', '.h.', '...'], { h: 'heart', H: 'heartL', e: 'heartE', E: 'heartED' }),
  heart2: spr(['H.h', 'hhh', 'hhd', '.d.', '...'], { h: 'heart', H: 'heartL', d: 'heartD' }),
  food0: spr(['.ee.', 'eeeE', 'eeEE', '.eE.', 'e...'], { e: 'foodE', E: 'foodED' }),
  food1: spr(['.Me.', 'MMeE', 'MmEE', '.bE.', 'b...'], { M: 'meatL', m: 'meat', e: 'foodE', E: 'foodED', b: 'boneW' }),
  food2: spr(['.MM.', 'MMMm', 'MMmd', '.bd.', 'b...'], { M: 'meatL', m: 'meat', d: 'meatD', b: 'boneW' }),
  emeraldIcon: spr(['.g.', 'gGg', 'ggd', '.d.'], { g: 'emerald', G: 'emeraldL', d: 'emeraldD' }),
  chestIcon: { rows: ['CC.CC', 'CcCcC', 'cCCCc', '.CEC.', '.CCC.', '.ccc.'] },
  pickIcon: { rows: ['.MMMn', '...wM', '..w.m', '.w...', 'w....'] },
  // Terrain
  floorGrass,
  floorStone,
  floorDeep,
  floorLava,
  ceilStone: ceiling(STONE, stoneOre, 13),
  ceilDeep: ceiling(DEEP, deepOre, 14),
  caveStone: caveWall(['cave1', 'cave2', 'cave3'], 17),
  caveDeep: caveWall(['caveD1', 'caveD2', 'caveD3'], 18),
  caveBrow: caveBrow(20),
  caveBrowTall: caveBrow(36),
  nightSky,
  duskSky,
  // Half-dark is one step down from each cave's own rock; dark is the same rock everywhere, over each cave's floor.
  stoneDim: caveDark(['caveD1', 'caveD2', 'caveD3'], 23, { floor: [STONE, 0.45] }),
  deepDim: caveDark(['dim1', 'dim2', 'dim3'], 23, { floor: [DEEP, 0.4] }),
  lavaDim: caveDark(['dim1', 'dim2', 'dim3'], 23, { glow: ['glow1', 'glow2', 'glow3', 'glow4'] }),
  stoneDark: caveDark(['dark1', 'dark2', 'dark3'], 24, { floor: [STONE, 0.72] }),
  deepDark: caveDark(['dark1', 'dark2', 'dark3'], 24, { floor: [DEEP, 0.65] }),
  lavaDark: caveDark(['dark1', 'dark2', 'dark3'], 24, { glow: ['glow2', 'glow3', 'glow4'] }),
  lavaFall: lavaFall(4),
  lavaTrickle: lavaFall(2),
  lavaPool: lavaPool(10),
  lavaPuddle: lavaPool(6),
  // Six rows: a one-line message box hides it whole.
  sun: spr(['oooooo', 'oyyyyo', 'oyyyyo', 'oyyyyo', 'oyyyyo', 'oooooo'], { o: 'sunO', y: 'sunY' }),
  cloud: spr(['....WWWWWWWW......', 'WWWWWWWWWWWWWWWWWW', 'GGGGGGGGGGGGGGGGGG'], { W: 'cloudW', G: 'cloudG' }),
  cloudSmall: spr(['..WWWWWW..', 'WWWWWWWWWW', 'GGGGGGGGGG'], { W: 'cloudW', G: 'cloudG' }),
  // Scenery past the action, from the right edge in. Nine wide: from 56 columns on the oak is clear of column 45.
  oak: spr(
    [
      '..vvvvv..',
      '.vVvvXvv.',
      'vvvXvvvVv',
      'vVvvvvvvv',
      'vvvVvvXvv',
      'vXvvvvvVv',
      '.vvvvvvv.',
      ...Array<string>(13).fill('....bB...'),
    ],
    { v: 'leaf1', V: 'leaf2', X: 'leaf3', b: 'barkD', B: 'bark' },
  ),
  birch: spr(
    ['..llll..', '.lLlllL.', 'llllLlll', 'lLllllLl', 'llLlllll', '.llllLl.', ...Array.from({ length: 10 }, (_, k) => ['...wk...', '...ww...', '...kw...', '...ww...'][k % 4]!)],
    { l: 'birchL', L: 'leaf1', w: 'pillow', k: 'tool' },
  ),
  flowers: spr(['.r...y.', 'rkr.yoy', '.g...g.', '.g...g.'], { r: 'redO', k: 'coal', y: 'goldO', o: 'sunO', g: 'grass3' }),
  stalagmite: spr(['..a..', '..a..', '.aA..', '.aAb.', '.aAb.', 'aaAb.', 'aAAbb', 'aAAAb'], { a: 'stone1', A: 'stone2', b: 'stone3' }),
  veinIron: spr(['..oO...', '.oOo.o.', 'oO..oOo', '.o.oOo.', '..oO...', '...o...'], { o: 'ironO', O: 'ironOD' }),
  veinDiamond: spr(['..oO...', '.oOo.o.', 'oO..oOo', '.o.oOo.', '..oO...', '...o...'], { o: 'diaO', O: 'diaOD' }),
  chest: spr(['kkkkkkkk', 'kPPPPPPk', 'kppppppk', 'kkkLLkkk', 'kPPLLPPk', 'kppppppk', 'kkkkkkkk'], { k: 'logD', P: 'plankL', p: 'plank', L: 'ironL' }),
  rails: spr(['rrrrrrrrrrrrrrrr', 't..t..t..t..t..t'], { r: 'cobble1', t: 'plankD' }),
  minecart: spr(['r.......r', 'rAAAAAAAr', 'raaaaaaar', '.raaaaar.', '..o...o..'], { r: 'stone1', A: 'anvilL', a: 'anvil', o: 'cobble1' }),
  drip: spr(['mmm', 'mMm', '.m.', '.m.', '.M.'], { m: 'dirt3', M: 'dirt2' }),
  wallTorch: spr(['.y.', 'yoy', '.O.', '.w.', '.w.', '.w.'], { y: 'flame', o: 'flameO', O: 'flameW', w: 'w' }),
  // Props
  craftTable: spr(['tTtTTtTt', 'tttttttt', 'dPPPPPPd', 'dPkPPPkd', 'dPkkPkkd', 'dPkPPPkd', 'dPPPPPPd', 'dddddddd'], {
    t: 'plankD',
    T: 'plankL',
    d: 'logD',
    P: 'plank',
    k: 'tool',
  }),
  torchA: spr(['.y.', 'yoy', '.O.', '.w.', '.w.', '.w.', '.w.', '.w.'], { y: 'flame', o: 'flameO', O: 'flameW', w: 'w' }),
  torchB: spr(['y..', '.oy', '.O.', '.w.', '.w.', '.w.', '.w.', '.w.'], { y: 'flame', o: 'flameO', O: 'flameW', w: 'w' }),
  // Burning low, and out: an ember at the tip and a wisp of smoke.
  torchLow: spr(['...', '.y.', '.o.', '.w.', '.w.', '.w.', '.w.', '.w.'], { y: 'flame', o: 'flameO', w: 'w' }),
  torchOutA: spr(['.s.', 's..', '.e.', '.w.', '.w.', '.w.', '.w.', '.w.'], { s: 'smoke3', e: 'redOD', w: 'w' }),
  torchOutB: spr(['s..', '.s.', '.e.', '.w.', '.w.', '.w.', '.w.', '.w.'], { s: 'smoke3', e: 'redOD', w: 'w' }),
  grid: paint(13, 13, (x, y) => (x % 4 === 0 || y % 4 === 0 ? 'gridF' : x % 4 === 1 && y % 4 === 1 ? 'gridD' : 'gridS')),
  slotPlank: spr(['ppp', 'PPP', 'ppp'], { p: 'plank', P: 'plankD' }),
  slotStick: spr(['..w', '.w.', 'w..'], { w: 'w' }),
  bookshelf: spr(['PPPPPPPP', 'dddddddd', 'rbgyrb.g', 'rbgyrbyg', 'PPPPPPPP', 'dddddddd', 'gyr.bgyr', 'gyrbbgyr'], {
    P: 'plank',
    d: 'plankD',
    r: 'book1',
    b: 'book2',
    g: 'book3',
    y: 'book4',
  }),
  enchTable: spr(['DccccccD', 'oCCCCCCo', 'oooooooo', 'oOooooOo', 'oooooooo', 'oooOoooo'], {
    D: 'diaL',
    c: 'cloth',
    C: 'clothD',
    o: 'obsid',
    O: 'obsidL',
  }),
  bookOpen: spr(['pp..pp', 'spppps', 'cccccc'], { p: 'page', s: 'pageS', c: 'cover' }),
  bookShut: spr(['......', '.cccc.', '.pppp.'], { p: 'page', c: 'cover' }),
  runeA: spr(['r.r', '.r.', 'rr.'], { r: 'rune' }),
  runeB: spr(['.r.', 'r.r', '.rr'], { r: 'rune' }),
  stoneBlock: block(STONE, 20),
  diamondOre: block(STONE, 21, ORES.dia!),
  dirtBlock: block(DIRT, 22),
  planks: spr(['PPPPPdPP', 'LPPPPdPP', 'dddddddd', 'PPdPPPPL', 'PPdPPPPP', 'dddddddd', 'PPPPPPdP', 'LPPPPPdP'], {
    P: 'plank',
    L: 'plankL',
    d: 'plankD',
  }),
  crack1: spr(['........', '........', '...k....', '...kk...', '....k...', '........', '........', '........'], { k: 'ink' }),
  crack2: spr(['........', '.....k..', '...k.k..', '..kkk...', '....kk..', '...k..k.', '........', '........'], { k: 'ink' }),
  crack3: spr(['.k....k.', '..k..k..', 'k..kk...', '.kkk.k.k', '..k.kk..', '.k.k..k.', 'k...k..k', '..k...k.'], { k: 'ink' }),
  debris: spr(['.a....b.', '...b....', 'b.....a.', '....a...', '.b......', '......b.'], { a: 'stone1', b: 'stone3' }),
  diamond: spr(DIAMOND_ICON, { c: 'diaS', C: 'diaL', W: 'W', k: 'diaD' }),
  orbA: spr(['.y.', 'yGy', '.y.'], { y: 'orbG', G: 'orbY' }),
  orbB: spr(['.g.', 'gyg', '.g.'], { g: 'orbD', y: 'orbG' }),
  // The lever stands as high as the miner's hand.
  lever0: spr(['k....', 'kw...', '.w...', '..w..', '..w..', '.ccc.', 'cCcCc', 'CcccC'], { k: 'dust', w: 'w', c: 'cobble1', C: 'cobble2' }),
  lever1: spr(['....k', '...wk', '...w.', '..w..', '..w..', '.ccc.', 'cCcCc', 'CcccC'], { k: 'dustOn', w: 'w', c: 'cobble1', C: 'cobble2' }),
  lampOff: spr(['kkkkkkkk', 'kLLlLLlk', 'kLlLLlLk', 'klLLLLlk', 'kLLlLLlk', 'kLlLLlLk', 'klLLlLLk', 'kkkkkkkk'], {
    k: 'lampK',
    L: 'lampL',
    l: 'lampl',
  }),
  lampOn: spr(['kkkkkkkk', 'kLLlLLlk', 'kLlLLlLk', 'klLLLLlk', 'kLLlLLlk', 'kLlLLlLk', 'klLLlLLk', 'kkkkkkkk'], {
    k: 'lampOnK',
    L: 'lampOnL',
    l: 'lampOnl',
  }),
  dustOff: spr(['r.r', 'rrr'], { r: 'dust' }),
  dustLit: spr(['r.r', 'rrr'], { r: 'dustOn' }),
  anvil: spr(['AAAAAAAAAA', '.aAAAAAAa.', '...aAAa...', '...aAAa...', '..AAAAAA..', '.dddddddd.'], { A: 'anvilL', a: 'anvil', d: 'anvilD' }),
  bedBase: spr(['PPPPPPPPdqqqqqqqqqqqq', 'wwwwwwwwwwwwwwwwwwwww', 'ww.................ww', 'WW.................WW'], {
    P: 'pillow',
    d: 'quiltD',
    q: 'quiltD',
    w: 'plank',
    W: 'plankD',
  }),
  // A pixel lower than the sleeper's head, turned down at the chin, rounded at the foot.
  quilt: paint(13, 10, (x, y) => (x === 12 && y === 0 ? null : x === 0 ? 'pillow' : y === 0 ? 'quiltL' : x === 12 || y === 9 ? 'quiltD' : (x + y * 3) % 7 === 0 ? 'quiltL' : 'quilt')),
  pieceHelm: { rows: ['.AAAAAA.', 'AAAeAAAA', 'Aa....aA', 'a......a'] },
  pieceChest: { rows: ['CC....CC', 'CCcCCcCC', '.CCEECC.', '.CCCCCC.', '.cccccc.'] },
  creeper: spr(
    [
      'gGglgGgg',
      'gglggGgl',
      'gKKggKKg',
      'gKKggKKg',
      'lggKKggG',
      'ggKKKKgg',
      'gGKggKgl',
      'ggglgGgg',
      '..gGgg..',
      '..glgG..',
      '..gggl..',
      '..Gggg..',
      '..glgg..',
      'gGgl.Ggg',
      'gggG.ggl',
    ],
    { g: 'creep1', G: 'creep2', l: 'creep3', K: 'creepK' },
  ),
  boom1: puff(14, 12, 30, true),
  boom2: puff(18, 14, 31, false),
  wolf: spr(['.........W.W.', 'g........WWW.', '.W.......kWWW', '..WWWWWWRRWWk', '..WWWWWWWWW..', '..gWWWWWWWg..', '..W.W...W.W..', '..g.g...g.g..'], {
    W: 'wolf',
    g: 'wolfS',
    R: 'collar',
    k: 'creepK',
  }),
  wolfRun: spr(['.........W.W.', '.........WWW.', 'gW.......kWWW', '..WWWWWWRRWWk', '..WWWWWWWWW..', '..gWWWWWWWg..', '.W..W...W..W.', 'g...g...g...g'], {
    W: 'wolf',
    g: 'wolfS',
    R: 'collar',
    k: 'creepK',
  }),
  // Sitting, facing left: narrow enough for one each side of the miner.
  wolfSit: spr(['.W.W...', '.WWW...', 'WWkW...', 'kWWWW..', '..RRWW.', '..WWWWW', '..gWWWW', '..W.WWg'], { W: 'wolf', g: 'wolfS', R: 'collar', k: 'creepK' }),
  bone: spr(['b..b', 'bbbb', 'b..b'], { b: 'boneY' }),
  love: spr(['h.h', 'hhh', '.h.'], { h: 'love' }),
  sweat: spr(['.O.', '.O.', 'OOO', 'OOs', '.s.'], { O: 'sweat', s: 'sweatS' }),
  sparkA: spr(['.g.', 'gWg', '.g.'], { g: 'glint', W: 'W' }),
  sparkB: spr(['g.g', '.G.', 'g.g'], { g: 'glint2', G: 'glint' }),
  // Actions: the viewer's arm (a red sleeve, a blocky hand), the sign's post, the creeper's crater and its smoke.
  arm: spr(['rrrrrrrr', 'RRRRRRRR', 'SSSSSSSS', 'SsSsSsSS', 'SSSSSSSS', 'SSSSSSSS', '.SSSSSS.', '..ssss..'], { r: 'capeR', R: 'capeRS', S: 'S', s: 's' }),
  signPost: spr(['.w.', '.w.', '.w.', '.w.'], { w: 'w' }),
  crater: spr(['..kkkkkkkk..', '.kKKKKKKKKk.', 'kKKkkkkkkKKk', '.kKKKKKKKKk.'], { k: 'bed2', K: 'bed3' }),
  wispA: spr(['.s.', 's..', '.S.'], { s: 'smoke3', S: 'smoke2' }),
  wispB: spr(['s..', '.s.', '.S.'], { s: 'smoke3', S: 'smoke2' }),
  toast: toastPanel,
  borderWall,
}

// Lying down asleep: the dozing poses turned a quarter, head to the left.
sprites.lie = rotate(sprites.sleep!, 'ccw')

// ---------------------------------------------------------------------------
// Frames: actors relative to the miner's top-left; the floor is at y 16.
// ---------------------------------------------------------------------------

const SMALL: HeroTier[] = ['tier1', 'tier2', 'unknown']
const GRAND: HeroTier[] = ['tier3', 'tier4']
/** How far the champion's props over the head move up (`heroForms.lift`). */
const LIFT = 4

/** Scenery above the miner's head that stays put for every tier. */
const fixed = (sprite: string, x: number, y: number, swap?: Record<string, string>): Actor => at(sprite, x, y, { swap, fixed: true })
/** The enchantment glint shimmering over the champion's armor: helm and chest, chest and leg. Placed on his own sprite, so nothing lifts it. */
const glint = (k: number): Actor[] =>
  [
    [
      [6, -3],
      [10, 9],
    ],
    [
      [11, 6],
      [4, 11],
    ],
    [
      [7, 6],
      [9, 12],
    ],
  ][k % 3]!.map(([x, y], i) => ({ sprite: i ? 'sparkB' : 'sparkA', x: x!, y: y!, tiers: GRAND, fixed: true }))

/** The pickaxe raised over the block, and down on it: the head ends on the floor line. */
const windup = () => weapon(14, 1)
const strike = () => weapon(14, 7, { flipY: true })

const P = 18 // a prop on the floor, right of the miner (scene columns 30..37)
const Q = 26 // a second one beside it (38..45)
const BY = 8 // the top of a block on the floor
const table = () => at('craftTable', P, BY)
const torch = (lit: 0 | 1) => at(lit ? 'torchB' : 'torchA', P + 2, 0)
const lookBack: Actor = { sprite: '@stand', x: 0, y: 0, flip: true }

const GX = 15
const GY = -15
/** The crafting grid over the table, with the first `n` items of a pickaxe recipe placed. */
const RECIPE: [string, number, number][] = [
  ['slotPlank', 0, 0],
  ['slotPlank', 1, 0],
  ['slotPlank', 2, 0],
  ['slotStick', 1, 1],
  ['slotStick', 1, 2],
]
const craft = (n: number, shuffle = false): Actor[] => [
  fixed('grid', GX, GY),
  ...RECIPE.slice(0, n).map(([s, i, j], k) => fixed(s, GX + 1 + 4 * (shuffle && k === 4 ? 2 : i), GY + 1 + 4 * j)),
]

const Z = '#ffffff'

// Shell: a lever, redstone dust, and two lamps one on the other, lit from the bottom.
const redstone = (lever: 0 | 1, lit: 0 | 1 | 2): Actor[] => [
  at(lever ? 'lever1' : 'lever0', P, 8),
  at(lever ? 'dustLit' : 'dustOff', P + 5, 14),
  at(lit ? 'lampOn' : 'lampOff', Q, BY),
  at(lit === 2 ? 'lampOn' : 'lampOff', Q, 0),
]

// Reading: the enchanting table, its book, runes drifting in from the shelf.
const RUNES = [
  [
    [28, 4],
    [25, 1],
  ],
  [
    [25, 2],
    [22, 4],
  ],
  [
    [22, 1],
    [28, 2],
  ],
]
const enchant = (open: boolean, k: number): Actor[] => [
  at('bookshelf', Q, BY),
  at('enchTable', P, 10),
  at(open ? 'bookOpen' : 'bookShut', P + 1, 6),
  ...RUNES[k % 3]!.map(([x, y], i) => at((k + i) % 2 ? 'runeA' : 'runeB', x!, y!)),
]

// Bed: the frame and pillow under the sleeper, the quilt over the body. The champion lies where the small miner does.
const inBed = (): Actor[] => [at('bedBase', -1, 12), { ...hero('lie', 0, -4), tiers: SMALL }, { ...hero('lie', 2, -4), tiers: GRAND }, at('quilt', 7, 2)]
// Dark and half-dark behind everything, the cache ring included, whatever the scene's width and height.
// Above ground (under 25% of the context) they are the night sky and the sunset; in the caves the torch
// gutters and goes out, and the rock goes dark.
const SURFACE = 25
const DEEP_AT = 50
const LAVA = 75
const layer = (sprite: string, minPercent: number, maxPercent?: number): Actor => ({ sprite, x: -12, y: 16 - SKY_H, fixed: true, backdrop: true, minPercent, maxPercent })
const night = (): Actor[] => [layer('nightSky', 0, SURFACE), layer('stoneDark', SURFACE, DEEP_AT), layer('deepDark', DEEP_AT, LAVA), layer('lavaDark', LAVA)]
const dusk = (): Actor[] => [layer('duskSky', 0, SURFACE), layer('stoneDim', SURFACE, DEEP_AT), layer('deepDim', DEEP_AT, LAVA), layer('lavaDim', LAVA)]
const above = (a: Actor): Actor => ({ ...a, maxPercent: SURFACE })
const below = (a: Actor): Actor => ({ ...a, minPercent: SURFACE })
/** The torch on the crafting table underground, where it is the only light. */
const caveTorch = (sprite: string) => below(at(sprite, P + 2, 0))
/** And the one stuck in the ground by the foot of the bed. */
const bedTorch = (sprite: string) => below(at(sprite, 22, 8))
const smoke = (k: number) => (k % 2 ? 'torchOutB' : 'torchOutA')

const zzz = (k: number) => [{ text: k % 2 ? 'Z' : 'z', x: 2 + k, y: -6 - 2 * k, color: Z }]

const HURT = { A: 'hurt', a: 'hurtD', C: 'hurt', c: 'hurtD', L: 'hurt', l: 'hurtD', B: 'hurtD', b: 'hurtD', S: 'hurtL', s: 'hurt', E: 'hurt', e: 'hurt', T: 'hurtD', H: 'hurtD' }
// Out of armor. `clear` is no color at all: the champion's cape is not drawn.
const BARE = { A: 'hair', a: 'hairS', C: 'shirt', c: 'shirtS', L: 'pants', l: 'pantsS', B: 'shoe', b: 'shoeS', E: 'shirt', e: 'hair', T: 'hairS', R: 'clear', r: 'clear' }

// Two wolves sit either side of the miner, run off past the edge of the widest pane, and come back with a bone each.
const WOLF_L = -10
const WOLF_R = 19
const RUN = [22, 38, 54, 70]
const wolvesSit = (): Actor[] => [at('wolfSit', WOLF_L, 8, { flip: true }), at('wolfSit', WOLF_R, 8)]
const running = (k: number) => (k % 2 ? 'wolf' : 'wolfRun')
const wolvesOut = (k: number): Actor[] => [...(k === 0 ? [at('wolfRun', -19, 8, { flip: true, offstage: true })] : []), at(running(k), RUN[k]!, 8, { offstage: true })]
// A bone sticks out of the mouth by three pixels.
const wolvesBack = (k: number): Actor[] => [
  ...(k === 0 ? [at('wolfRun', -19, 8, { offstage: true }), at('bone', -7, 10)] : []),
  at(running(k), RUN[k]!, 8, { flip: true, offstage: true }),
  at('bone', RUN[k]! - 3, 10, { offstage: true }),
]
// The miner holds the two bones up, one over each fist.
const bones = (): Actor[] => [
  { ...at('bone', -1, -3, { fixed: true }), tiers: SMALL },
  { ...at('bone', 13, -3, { fixed: true }), tiers: SMALL },
  { ...at('bone', -2, -7, { fixed: true }), tiers: GRAND },
  { ...at('bone', 15, -7, { fixed: true }), tiers: GRAND },
]
const waiting = (dots: string): SceneText[] => [{ text: dots, x: 9, y: -2, color: Z, lift: true }]

const states: Theme['states'] = {
  idle: loop(
    { actors: [table(), torch(0), hero('stand'), ...glint(0)], hold: 3 },
    { actors: [table(), torch(1), hero('stand'), ...glint(1)], hold: 3 },
    { actors: [table(), torch(0), hero('sleep')], hold: 1 },
    { actors: [table(), torch(1), hero('stand'), ...glint(2)], hold: 3 },
    { actors: [table(), torch(0), lookBack], hold: 3 },
    { actors: [table(), torch(1), hero('stand'), ...glint(0)], hold: 2 },
  ),
  thinking: loop(
    { actors: [table(), hero('stand'), ...craft(0)], texts: waiting('.'), hold: 2 },
    { actors: [table(), hero('attack'), ...craft(1)], texts: waiting('..'), hold: 1 },
    { actors: [table(), hero('attack'), ...craft(2)], texts: waiting('...'), hold: 1 },
    { actors: [table(), hero('attack'), ...craft(3)], hold: 1 },
    { actors: [table(), hero('attack'), ...craft(4)], hold: 1 },
    { actors: [table(), hero('stand'), ...craft(5, true), ...glint(1)], texts: [{ text: '?', x: 10, y: -2, color: Z, lift: true }], hold: 2 },
    { actors: [table(), hero('attack'), ...craft(5)], hold: 1 },
    { actors: [table(), hero('stand'), ...craft(5), ...glint(2)], texts: [{ text: '!', x: 10, y: -2, color: Z, lift: true }], hold: 2 },
  ),
  reading: loop(
    { actors: [...enchant(true, 0), hero('stand'), ...glint(0)], hold: 2 },
    { actors: [...enchant(true, 1), hero('attack')], hold: 2 },
    { actors: [...enchant(false, 2), hero('attack'), ...glint(1)], hold: 1 },
    { actors: [...enchant(true, 3), hero('stand')], hold: 2 },
    { actors: [...enchant(true, 4), hero('stand'), ...glint(2)], hold: 2 },
  ),
  editing: loop(
    { actors: [at('stoneBlock', P, BY), hero('stand')], hold: 1 },
    { actors: [at('stoneBlock', P, BY), hero('attack'), windup()], hold: 1 },
    { actors: [at('stoneBlock', P, BY), at('crack1', P, BY), hero('attack'), strike()], hold: 1 },
    { actors: [at('stoneBlock', P, BY), at('crack1', P, BY), hero('attack'), windup()], hold: 1 },
    { actors: [at('stoneBlock', P, BY), at('crack2', P, BY), hero('attack'), strike()], hold: 1 },
    { actors: [at('stoneBlock', P, BY), at('crack2', P, BY), hero('attack'), windup()], hold: 1 },
    { actors: [at('stoneBlock', P, BY), at('crack3', P, BY), hero('attack'), strike()], hold: 1 },
    { actors: [at('debris', P, 9), hero('stand')], hold: 1 },
    { actors: [at('planks', P, BY), hero('attack')], hold: 2 },
    { actors: [at('planks', P, BY), hero('stand'), ...glint(1)], hold: 2 },
  ),
  shell: loop(
    { actors: [...redstone(0, 0), hero('stand')], hold: 2 },
    { actors: [...redstone(1, 0), hero('attack')], hold: 1 },
    { actors: [...redstone(1, 1), hero('attack')], hold: 2 },
    { actors: [...redstone(1, 2), hero('stand'), ...glint(0)], hold: 3 },
    { actors: [...redstone(0, 2), hero('attack')], hold: 1 },
    { actors: [...redstone(0, 0), hero('stand')], hold: 1 },
  ),
  agents: loop(
    { actors: [...wolvesSit(), hero('itemGet'), ...glint(0)], hold: 2 },
    { actors: [...wolvesOut(0), hero('stand')], hold: 1 },
    { actors: [...wolvesOut(1), hero('stand')], texts: waiting('.'), hold: 1 },
    { actors: [...wolvesOut(2), hero('stand')], texts: waiting('..'), hold: 1 },
    { actors: [...wolvesOut(3), hero('stand')], texts: waiting('...'), hold: 1 },
    { actors: [hero('stand'), ...glint(1)], texts: waiting('...'), hold: 2 },
    { actors: [...wolvesBack(3), hero('stand')], texts: waiting('...'), hold: 1 },
    { actors: [...wolvesBack(2), hero('stand')], texts: waiting('...'), hold: 1 },
    { actors: [...wolvesBack(1), hero('stand')], texts: waiting('...'), hold: 1 },
    { actors: [...wolvesBack(0), hero('stand')], hold: 1 },
    { actors: [...wolvesSit(), ...bones(), at('love', WOLF_L + 2, 4), at('love', WOLF_R + 2, 4), hero('itemGet'), ...glint(2)], hold: 3 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop(
    { actors: [...night(), ...inBed(), bedTorch(smoke(0))], texts: zzz(0), hold: 3 },
    { actors: [...night(), ...inBed(), bedTorch(smoke(1))], texts: zzz(1), hold: 3 },
    { actors: [...night(), ...inBed(), bedTorch(smoke(0))], texts: zzz(2), hold: 3 },
    { actors: [...night(), ...inBed(), bedTorch(smoke(1))], hold: 3 },
  ),
}

const SIGH = 'Overqualified for this.'
// A drop behind the brow, clear of the pickaxe and of the price tag.
const sweat: Actor[] = [
  { ...at('sweat', -1, 2), tiers: SMALL },
  { ...at('sweat', -1, -2, { fixed: true }), tiers: GRAND },
]
const sigh = [{ text: '~sigh~', x: 17, y: -2, color: Z, lift: true }]
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [at('dirtBlock', P, BY), hero('stand'), ...sweat], hold: 2, caption: SIGH },
    { actors: [at('dirtBlock', P, BY), hero('attack'), windup(), ...sweat], hold: 1, caption: SIGH },
    { actors: [at('dirtBlock', P, BY), at('crack3', P, BY), hero('attack'), strike(), ...sweat], hold: 1, caption: SIGH },
    { actors: [hero('stand'), ...sweat], texts: sigh, hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [...redstone(0, 0), hero('stand'), ...sweat], hold: 2, caption: SIGH },
    { actors: [...redstone(1, 1), hero('attack'), ...sweat], hold: 2, caption: SIGH },
    { actors: [...redstone(1, 2), hero('stand'), ...sweat], texts: sigh, hold: 3, caption: SIGH },
  ),
}

const TOAST: SceneText[] = [
  { text: 'Advancement Made!', x: 9, y: -16, color: '#ffff55' },
  { text: 'Diamonds!', x: 9, y: -14, color: '#ffffff' },
]
const toast = () => fixed('toast', 0, -18)

// The armor pieces on their way to the miner: beside him, then half way. The champion's head is higher.
const ARMORED: HeroTier[] = ['tier1', 'tier2']
const pieces = (step: 0 | 1): Actor[] => [
  { sprite: 'pieceHelm', x: step ? 11 : 19, y: step ? 0 : 1, tier: true, tiers: ARMORED },
  { sprite: 'pieceChest', x: step ? 11 : 19, y: 7, tier: true, tiers: ARMORED },
  { sprite: 'pieceHelm', x: step ? 12 : 21, y: step ? -4 : -3, tier: true, tiers: GRAND, fixed: true },
  { sprite: 'pieceChest', x: step ? 12 : 21, y: step ? 5 : 6, tier: true, tiers: GRAND },
]

const stone = () => at('stoneBlock', P, BY)
const MILESTONE = 'milestone'

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [at('diamondOre', P, BY), hero('attack'), windup()], hold: 1 },
    { actors: [at('diamondOre', P, BY), at('crack2', P, BY), hero('attack'), strike()], hold: 1 },
    { actors: [at('debris', P, 9), at('diamond', P + 1, 11), hero('stand')], hold: 1 },
    { actors: [at('diamond', P, 9), at('orbA', 22, 4), at('orbB', 17, 1), hero('stand')], hold: 1 },
    { actors: [at('orbB', 15, 5), at('orbA', 12, 2), hero('stand')], texts: [{ text: '+XP', x: 17, y: -2, color: '#a8ff3a', lift: true }], hold: 1 },
  ),
  // The creeper comes up from the right; the blast knocks the miner back two pixels and he steps up again.
  toolError: once(
    { actors: [at('creeper', Q, 1), hero('stand')], hold: 1 },
    { actors: [at('creeper', 23, 1), hero('stand')], hold: 1 },
    { actors: [at('creeper', 20, 1), hero('stand')], texts: [{ text: 'sss', x: 21, y: -2, color: '#8fd87a' }], hold: 1 },
    {
      actors: [at('creeper', 20, 1, { swap: { creep1: 'W', creep2: 'smoke2', creep3: 'W' } }), hero('stand')],
      texts: [{ text: 'SSSS', x: 20, y: -2, color: '#ffffff' }],
      hold: 1,
    },
    { actors: [at('boom1', 17, 2), hero('stand', -1, 0, HURT)], hold: 1 },
    { actors: [at('boom2', 15, 0), hero('stand', -2, 0, { ...HURT, A: 'hurtL', C: 'hurtL' })], hold: 1 },
    { actors: [at('boom1', 18, 4, { swap: { boomO: 'smoke3', smoke1: 'smoke2' } }), hero('stand', -2, 0, HURT)], hold: 1 },
    { actors: [hero('stand', -1, 0)], hold: 1 },
    { actors: [hero('stand')], hold: 1 },
  ),
  turnComplete: once(
    { actors: [hero('itemGet'), at('diamond', 5, -6)], hold: 1 },
    { actors: [toast(), hero('itemGet'), at('diamond', 5, -6), ...glint(0)], texts: TOAST, hold: 4 },
    { actors: [toast(), hero('stand'), ...glint(1)], texts: TOAST, hold: 6 },
  ),
  // He digs a block out from under the message, then waits by the torch.
  milestone: once(
    { actors: [stone(), hero('stand')], message: MILESTONE, hold: 2 },
    { actors: [stone(), hero('attack'), windup()], message: MILESTONE, hold: 1 },
    { actors: [stone(), at('crack1', P, BY), hero('attack'), strike()], message: MILESTONE, hold: 1 },
    { actors: [stone(), at('crack1', P, BY), hero('attack'), windup()], message: MILESTONE, hold: 1 },
    { actors: [stone(), at('crack3', P, BY), hero('attack'), strike()], message: MILESTONE, hold: 1 },
    { actors: [at('debris', P, 9), hero('stand')], message: MILESTONE, hold: 2 },
    { actors: [table(), torch(0), hero('stand'), ...glint(0)], message: MILESTONE, hold: 5 },
    { actors: [table(), torch(1), hero('stand'), ...glint(1)], message: MILESTONE, hold: 5 },
  ),
  // Sunset, night, bed. Underground: the torch burns low, goes out, and he turns in beside another dead one.
  cacheCold: once(
    { actors: [...dusk(), table(), above(torch(0)), caveTorch('torchLow'), hero('stand')], message: 'cacheCold', hold: 2 },
    { actors: [...night(), table(), above(torch(1)), caveTorch(smoke(0)), hero('sleep')], message: 'cacheCold', hold: 2 },
    { actors: [...night(), ...inBed(), bedTorch(smoke(1))], message: 'cacheCold', hold: 12 },
  ),
  // The wall comes in from the right until it presses on him.
  limitWarning: once(
    { actors: [fixed('borderWall', 28, -14), hero('stand')], message: 'limitWarning', hold: 3 },
    { actors: [fixed('borderWall', 21, -14), hero('walk', -1, 0)], message: 'limitWarning', hold: 3 },
    { actors: [fixed('borderWall', 15, -14), hero('stand', -2, 0, { C: 'hurt', c: 'hurtD' })], message: 'limitWarning', hold: 9 },
  ),
  compaction: once(
    { actors: [...night(), ...inBed(), bedTorch(smoke(0))], texts: zzz(1), hold: 3, caption: 'compaction' },
    { actors: [...dusk(), ...inBed(), bedTorch('torchLow')], hold: 2, caption: 'compaction' },
    {
      actors: [hero('itemGet'), ...glint(0)],
      texts: [{ text: 'Saving world...', x: 0, y: -12, color: Z }],
      hold: 3,
      caption: 'compaction',
    },
  ),
  modelChange: once(
    { actors: [hero('stand', 0, 0, BARE), ...pieces(0)], hold: 2 },
    { actors: [hero('stand', 0, 0, BARE), ...pieces(1)], hold: 1 },
    { actors: [at('boom2', -1, 1, { swap: { smoke2: 'glint', smoke3: 'glint2' } })], hold: 1 },
    { actors: [hero('itemGet'), at('sparkA', -2, 4), at('sparkB', 16, 6), ...glint(0)], hold: 3, caption: 'modelChange' },
    { actors: [hero('stand'), ...glint(1)], hold: 3, caption: 'modelChange' },
  ),
  effortChange: once(
    { actors: [at('anvil', P, 10), hero('attack'), at('sparkA', P + 3, 6)], hold: 1 },
    { actors: [at('anvil', P, 10), hero('stand'), at('sparkB', P + 5, 5)], texts: [{ text: '*', x: 22, y: -2, color: '#ffff55' }], hold: 1 },
    { actors: [at('anvil', P, 10), hero('attack'), at('sparkA', P + 2, 5)], hold: 1 },
    {
      actors: [at('anvil', P, 10), hero('itemGet'), weapon(14, -9), ...glint(0)],
      texts: [{ text: '*', x: 24, y: -4, color: '#ffff55' }],
      hold: 5,
      caption: 'effortChange',
    },
  ),
}

// ---------------------------------------------------------------------------
// Actions: the buttons under the scene. You are a blocky arm in a red sleeve
// from the top of the scene, the first-person arm of this kind of game, holding
// the current pickaxe head-down. Each press plays one of the tier's takes,
// picked at random; the target's patience wears down with repeated presses
// (see `pressAction`).
// ---------------------------------------------------------------------------

const YELLOW = '#ffff55' // chat and advancement yellow
const RED = '#ff5555'
const CREEP = '#8fd87a' // what a creeper says
const say = (text: string, x: number, y: number, color = Z): SceneText => ({ text, x, y, color })
/** A reaction: one-shot, every frame held twice as long as written (a line stays about a second at 6 fps). */
const take = (...frames: Frame[]): Animation => once(...frames.map(f => ({ ...f, hold: 2 * Math.max(1, f.hold ?? 1) })))
/** The same caption on every frame from `from` on. */
const captioned = (caption: string, frames: Frame[], from = 2): Frame[] => frames.map((f, k) => (k >= from ? { ...f, caption } : f))
/** A take that is only picked while these are present. */
const needing = (needs: string[], anim: Animation): Animation => ({ ...anim, needs })
// Who is who, for the rests: the miner (and what is his) is `miner`, the wolf `wolf`, the creeper `creeper`.
const minerOf = (actors: Actor[]): Actor[] => actors.map(a => ({ ...a, gone: 'miner' }))
const miner = (pose: string, x = 0, y = 0, swap?: Record<string, string>): Actor => ({ ...hero(pose, x, y, swap), gone: 'miner' })
/** The arm (8 by 8) with the pickaxe hanging head-down from the fist: its head ends 14 pixels under the arm's top. Scenery: it does not move with the champion. */
const you = (x: number, y: number, opts: Partial<Actor> = {}): Actor[] => [weapon(x + 2, y + 5, { flipY: true, fixed: true, ...opts }), at('arm', x, y, { fixed: true, ...opts })]
/** The empty fist, scenery. */
const fist = (x: number, y: number, opts: Partial<Actor> = {}): Actor => at('arm', x, y, { fixed: true, ...opts })
/**
 * The arm over the miner's head: it rises with the champion as a prop over the head does. The pickaxe is
 * placed per tier (a weapon over the head would otherwise slide to the champion's `aloft` spot).
 */
const youOverhead = (x: number, y: number, opts: Partial<Actor> = {}): Actor[] => [
  { ...weapon(x + 2, y + 5, { flipY: true, fixed: true, ...opts }), tiers: SMALL },
  { ...weapon(x + 2, y + 5 - LIFT, { flipY: true, fixed: true, ...opts }), tiers: GRAND },
  at('arm', x, y, opts),
]
/** The spark where the pickaxe meets the helmet; it rises with the champion. */
const CLINK: Actor = at('sparkA', 7, -3)

// 1. Poke the miner. The arm comes down on the helmet from the top of the
// scene, by the crafting table: in from above, a hover, the poke, then the
// reaction. His lines sit right of his head, under the arm's rows.
const AX = 2
const A_ENTER = -24
const A_HOVER = -18
const A_POKE = -14
/** The miner and the arm at `y` (null: gone), by the table and the torch (`flicker`: its other frame). */
const minerScene = (y: number | null, crew: Actor[], more: Actor[] = [], flicker = false): Actor[] => [
  table(),
  torch(flicker ? 1 : 0),
  ...minerOf(crew),
  ...(y === null ? [] : youOverhead(AX, y, y < A_POKE ? { offstage: true } : {})),
  ...more,
]
const aStart = (crew: Actor[] = [hero('stand')]): Frame[] => [
  { actors: minerScene(A_ENTER, crew), hold: 1 },
  { actors: minerScene(A_HOVER, crew), hold: 1 },
  { actors: minerScene(A_POKE, crew, [CLINK], true), hold: 1 },
]
/** The miner's line beside his head: right of the champion's shoulders, clear of the arm (at most 18 characters). */
const aside = (text: string, y = -2, color = Z): SceneText => ({ ...say(text, 18, y, color), gone: 'miner' })
const EMERALD: Actor = { ...at('emeraldIcon', 15, -5), gone: 'miner' }
const BLOCK_HAT: Actor = { ...at('dirtBlock', 4, -2), gone: 'miner' }
const POOF = (swap: Record<string, string>): Actor => at('boom2', -1, 1, { swap })
const POKED_TOAST: SceneText[] = [
  { text: 'Advancement Made!', x: 9, y: -16, color: YELLOW, gone: 'miner' },
  { text: 'Got Poked', x: 9, y: -14, color: Z, gone: 'miner' },
]
/** The sign he puts up on the table: planks with ink on them, on a post. */
const SIGN: SceneText = { text: ' NO POKING ', x: 23, y: 2, color: '#1e1e1e', bg: '#ad8650', gone: 'miner' }
const SIGN_POST: Actor = { ...at('signPost', 27, 4, { fixed: true }), gone: 'miner' }
const wolfAt = (x: number, flip = false): Actor => at('wolfSit', x, 8, { fixed: true, flip, gone: 'wolf' })
const wolfSay = (text: string, x: number): SceneText => ({ ...say(text, x, 4), gone: 'wolf' })
const probeMiner: ThemeAction = {
  id: 'miner',
  label: 'POKE MINER',
  restLabel: '(MINER GONE)',
  gone: ['miner'],
  needs: ['miner'],
  reactions: {
    calm: [
      take(
        ...captioned('Poked the miner. Helmets exist for a reason.', [
          ...aStart(),
          { actors: minerScene(A_POKE, [hero('stand')], [CLINK], true), texts: [say('clink', 13, -6)], hold: 2 },
          { actors: minerScene(A_HOVER, [hero('stand')]), texts: [aside("HELMET'S ON.")], hold: 3 },
          { actors: minerScene(null, [hero('stand')], [], true), texts: [aside('NICE TRY.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Poked the miner. He offered an emerald. One.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [hero('itemGet'), EMERALD]), texts: [aside('1 EMERALD?', -4)], hold: 3 },
          { actors: minerScene(A_HOVER, [hero('itemGet'), EMERALD], [], true), texts: [aside('NO? OK.', -4)], hold: 2 },
          { actors: minerScene(null, [hero('stand')]), hold: 2 },
        ]),
      ),
      take(
        ...captioned('Poked the miner. Half a heart. He noticed.', [
          ...aStart(),
          { actors: minerScene(A_POKE, [hero('stand', 0, 0, HURT)], [CLINK], true), hold: 1 },
          { actors: minerScene(A_HOVER, [hero('stand', -1)]), texts: [aside('OW.')], hold: 2 },
          { actors: minerScene(A_HOVER, [hero('stand', -1)], [], true), texts: [aside('HALF A HEART.')], hold: 3 },
          { actors: minerScene(null, [hero('stand')]), texts: [aside('RUDE.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Poked the miner. He looked the wrong way.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [lookBack]), texts: [aside('?')], hold: 2 },
          { actors: minerScene(A_HOVER, [hero('stand')], [], true), hold: 1 },
          { actors: minerScene(A_POKE, [hero('stand')], [CLINK]), hold: 1 },
          { actors: minerScene(A_HOVER, [lookBack], [], true), texts: [aside('WHO IS THERE?')], hold: 3 },
          { actors: minerScene(null, [hero('stand')]), texts: [aside('...')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Poked the miner. He is AFK. Try later.', [
          ...aStart(),
          { actors: minerScene(A_POKE, [hero('sleep')], [CLINK], true), texts: [aside('z', -4)], hold: 2 },
          { actors: minerScene(A_HOVER, [hero('sleep')]), texts: [aside('Z', -6)], hold: 2 },
          { actors: minerScene(A_POKE, [hero('sleep')], [CLINK], true), texts: [aside('z', -4)], hold: 2 },
          { actors: minerScene(null, [hero('sleep')]), texts: [aside('AFK', -4, YELLOW)], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Advancement made: Got Poked. Worth 0 XP.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [hero('stand')]), texts: [aside('!')], hold: 1 },
          { actors: minerScene(null, [hero('itemGet'), toast()]), texts: POKED_TOAST, hold: 4 },
          { actors: minerScene(null, [hero('stand'), toast()], [], true), texts: POKED_TOAST, hold: 3 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('The miner put his head in a block. Safe now.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [hero('stand'), BLOCK_HAT]), hold: 2 },
          { actors: minerScene(-16, [hero('stand'), BLOCK_HAT], [], true), texts: [say('thud', 13, -6)], hold: 2 },
          { actors: minerScene(A_HOVER, [hero('stand'), BLOCK_HAT]), texts: [aside('...')], hold: 2 },
          { actors: minerScene(null, [hero('stand'), BLOCK_HAT], [], true), texts: [aside("CAN'T SEE YOU.")], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The miner swings back. Mind your fingers.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [hero('attack'), weapon(14, -8)]), hold: 1 },
          { actors: minerScene(A_ENTER, [hero('attack'), weapon(14, -12)], [at('sparkB', 10, -14)]), texts: [aside('MY TURN.')], hold: 2 },
          { actors: minerScene(null, [hero('attack'), weapon(14, -12)], [], true), texts: [aside('HA.')], hold: 2 },
          { actors: minerScene(null, [hero('stand')]), hold: 1 },
        ]),
      ),
      take(
        ...captioned('The miner would like to mine in peace.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [hero('stand'), ...sweat]), texts: [aside('STOP THAT.')], hold: 3 },
          { actors: minerScene(A_HOVER, [hero('stand'), ...sweat], [], true), texts: [aside("I'M MINING HERE.")], hold: 3 },
          { actors: minerScene(null, [hero('stand'), ...sweat]), hold: 2 },
        ]),
      ),
      take(
        ...captioned('The miner typed /kick. He lacks permission.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [hero('stand')]), texts: [aside('/KICK YOU')], hold: 3 },
          { actors: minerScene(A_HOVER, [hero('stand')], [], true), texts: [aside('/KICK YOU', -4), aside('NO PERMISSION.', -2, RED)], hold: 3 },
          { actors: minerScene(null, [hero('stand'), ...sweat]), texts: [aside('NO PERMISSION.', -2, RED)], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The miner is eating. Hunger bar first.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [hero('stand'), at('food2', 12, 3)]), texts: [aside('nom nom', 0)], hold: 2 },
          { actors: minerScene(A_POKE, [hero('stand'), at('food2', 12, 3)], [CLINK], true), texts: [aside('nom nom', 0)], hold: 1 },
          { actors: minerScene(A_HOVER, [hero('stand'), at('food1', 12, 3)]), texts: [aside("I'M EATING.")], hold: 3 },
          { actors: minerScene(null, [hero('stand'), at('food0', 12, 3)], [], true), texts: [aside('nom.', 0)], hold: 2 },
        ]),
      ),
    ],
    fedUp: [
      needing(['wolf'], take(
        ...captioned('The miner whistled. Two wolves have opinions.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [hero('stand')], [wolfAt(-10, true), wolfAt(27)], true), texts: [aside('HERE, BOYS.')], hold: 2 },
          { actors: minerScene(A_POKE, [hero('stand')], [CLINK, wolfAt(-10, true), wolfAt(27)]), texts: [wolfSay('GRR', -10), wolfSay('GRR', 27)], hold: 1 },
          { actors: minerScene(A_ENTER, [hero('stand')], [wolfAt(-10, true), wolfAt(27)], true), texts: [wolfSay('GRRR', -10), wolfSay('GRRR', 27)], hold: 3 },
          { actors: minerScene(null, [hero('stand')], [wolfAt(-10, true), wolfAt(27)]), texts: [aside('GOOD BOYS.')], hold: 2 },
        ]),
      )),
      take(
        ...captioned('The miner took your pickaxe. Finders keepers.', [
          ...aStart(),
          { actors: minerScene(A_POKE, [hero('itemGet')], [], true), hold: 1 },
          // The pickaxe leaves the fist for his hands; the fist stays, empty.
          { actors: [table(), torch(0), ...minerOf([hero('itemGet'), weapon(4, -9, { flipY: true })]), at('arm', AX, A_POKE)], hold: 1 },
          { actors: [table(), torch(1), ...minerOf([hero('itemGet'), weapon(4, -9, { flipY: true })]), at('arm', AX, A_HOVER, { offstage: true })], texts: [aside('MINE NOW.', -4)], hold: 3 },
          { actors: [table(), torch(0), ...minerOf([hero('itemGet'), weapon(4, -9, { flipY: true })]), at('arm', AX, A_ENTER, { offstage: true })], texts: [aside('MINE NOW.', -4)], hold: 1 },
          { actors: [table(), torch(1), ...minerOf([hero('itemGet'), weapon(4, -9, { flipY: true })])], texts: [aside('FINDERS KEEPERS.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The miner put up a sign. It says NO POKING.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [hero('attack')], [], true), hold: 1 },
          { actors: minerScene(A_HOVER, [hero('stand')], [SIGN_POST]), texts: [SIGN], hold: 3 },
          { actors: minerScene(A_POKE, [hero('stand')], [SIGN_POST, CLINK], true), texts: [SIGN, aside('READ THE SIGN.')], hold: 3 },
          { actors: minerScene(null, [hero('stand')], [SIGN_POST]), texts: [SIGN], hold: 2 },
        ]),
      ),
    ],
    snapped: [
      take(
        ...captioned('The miner left the game.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [hero('stand')]), texts: [aside("THAT'S IT.")], hold: 2 },
          { actors: minerScene(null, [hero('stand')], [], true), texts: [aside('BYE.')], hold: 2 },
          { actors: [table(), torch(0), POOF({ smoke2: 'glint', smoke3: 'glint2' })], hold: 1 },
          { actors: [table(), torch(1)], texts: [say('Miner left the game.', 0, -2, YELLOW)], hold: 3 },
          { actors: [table(), torch(0)], texts: [say('Miner left the game.', 0, -2, YELLOW)], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The miner typed /kill. Respawning elsewhere.', [
          ...aStart(),
          { actors: minerScene(A_HOVER, [hero('stand'), ...sweat]), texts: [aside('/KILL @S')], hold: 3 },
          { actors: minerScene(null, [hero('stand', 0, 0, HURT)], [], true), hold: 1 },
          { actors: [table(), torch(0), miner('lie', 0, 0, HURT)], hold: 1 },
          { actors: [table(), torch(1), POOF({ smoke1: 'smoke2', smoke2: 'smoke3' })], texts: [say('YOU DIED!', 4, -8, RED)], hold: 2 },
          { actors: [table(), torch(0)], texts: [say('YOU DIED!', 4, -8, RED), say('Respawning...', 2, -4)], hold: 3 },
          { actors: [table(), torch(1)], hold: 1 },
        ]),
      ),
    ],
  },
  // The miner's rest: the table and the torch, nobody at them; the wolf comes to wait.
  rest: loop(
    { actors: [table(), torch(0)], hold: 6 },
    { actors: [table(), torch(1)], texts: [say('...', 4, -2)], hold: 6 },
    { actors: [table(), torch(0), wolfAt(4, true)], hold: 6 },
    { actors: [table(), torch(1), wolfAt(4, true)], texts: [wolfSay('?', 7)], hold: 6 },
    { actors: [table(), torch(0), wolfAt(4, true)], texts: [wolfSay('awoo.', 5)], hold: 6 },
    { actors: [table(), torch(1)], hold: 6 },
  ),
}

// 2. Pet the wolf. It sits right of the miner, facing him; the empty fist
// comes down on its head. The hand is scenery here (the wolf is the same
// height whoever the miner is).
const WX = 22
const HX = 20
const W_ENTER = -22
const W_HOVER = -8
const W_POKE = 0
const wolfSits = (opts: Partial<Actor> = {}): Actor => at('wolfSit', WX, 8, { fixed: true, gone: 'wolf', ...opts })
/** The miner watching, the wolf (or `wolf` in its place), the fist at `y` (null: gone). */
const wolfScene = (y: number | null, wolf: Actor[] = [wolfSits()], more: Actor[] = [], crew: Actor[] = [hero('stand')], hand: Partial<Actor> = {}): Actor[] => [
  ...minerOf(crew),
  ...wolf,
  ...(y === null ? [] : [fist(HX, y, { ...hand, ...(y <= W_ENTER ? { offstage: true } : {}) })]),
  ...more,
]
const wStart = (wolf: Actor[] = [wolfSits()]): Frame[] => [
  { actors: wolfScene(W_ENTER, wolf), hold: 1 },
  { actors: wolfScene(W_HOVER, wolf), hold: 1 },
  { actors: wolfScene(W_POKE, wolf), hold: 1 },
]
/** The wolf's line, left of its muzzle (at most 8 characters); `woofR`: right of it, over the hand's rows. */
const woof = (text: string, color = Z): SceneText => ({ ...say(text, 14, 10, color), gone: 'wolf' })
const woofR = (text: string): SceneText => ({ ...say(text, 29, 8), gone: 'wolf' })
const HEART = (k: number): Actor => at('love', 30 + k, 5 - 2 * k, { fixed: true, gone: 'wolf' })
const BONE_GIFT: Actor = at('bone', WX - 5, 13, { fixed: true, gone: 'wolf' })
const BONE_GROUND: Actor = { ...at('bone', WX + 1, 13, { fixed: true }), gone: 'miner' }
const WOLF_HIDES: Actor = at('wolfSit', -8, 8, { fixed: true, gone: 'wolf' })
const WOLF_TWO: Actor = at('wolfSit', 29, 8, { fixed: true, gone: 'wolf' })
const BITTEN = { S: 'hurt', s: 'hurtD' }
const drop = (x: number, y: number): Actor => at('sweat', x, y, { fixed: true })
/** The wolf gets up, runs off to the right, and the miner is left looking at the spot. */
const wolfLeaves = (): Frame[] => [
  { actors: wolfScene(null, [at('wolf', WX, 8, { fixed: true, gone: 'wolf' })]), hold: 1 },
  { actors: wolfScene(null, [at('wolfRun', 30, 8, { fixed: true, offstage: true, gone: 'wolf' })]), texts: [woofR('AWOO')], hold: 1 },
  { actors: wolfScene(null, [at('wolfRun', 40, 8, { fixed: true, offstage: true, gone: 'wolf' })]), hold: 1 },
  { actors: wolfScene(null, [], [], [hero('stand'), ...sweat]), texts: [aside('...')], hold: 3 },
]
const petWolf: ThemeAction = {
  id: 'wolf',
  label: 'PET WOLF',
  restLabel: '(WOLF GONE)',
  gone: ['wolf'],
  needs: ['wolf'],
  reactions: {
    calm: [
      take(
        ...captioned('Petted the wolf. Good boy. Best boy.', [
          ...wStart(),
          { actors: wolfScene(-1, undefined, [HEART(0)]), texts: [woof('wag wag')], hold: 2 },
          { actors: wolfScene(W_POKE, undefined, [HEART(0), HEART(1)]), texts: [woof('wag wag')], hold: 2 },
          { actors: wolfScene(null, undefined, [HEART(1)]), hold: 2 },
        ]),
      ),
      take(
        ...captioned('The wolf licked your hand. It is wet now.', [
          ...wStart(),
          { actors: wolfScene(W_POKE), texts: [woof('SLURP.')], hold: 2 },
          { actors: wolfScene(W_HOVER, undefined, [drop(HX + 3, 0)]), texts: [woof('SLURP.')], hold: 2 },
          { actors: wolfScene(W_ENTER, undefined, [drop(HX + 3, -12)]), hold: 1 },
          { actors: wolfScene(null, undefined, [], [hero('stand'), ...sweat]), texts: [aside('EW.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The wolf brought you a bone. It is yours now.', [
          ...wStart(),
          { actors: wolfScene(W_HOVER, [wolfSits(), BONE_GIFT]), texts: [woof('FOR YOU.')], hold: 3 },
          { actors: wolfScene(null, [wolfSits(), BONE_GIFT]), texts: [woof('FOR YOU.')], hold: 1 },
          { actors: wolfScene(null, [wolfSits(), BONE_GIFT], [], [hero('stand'), ...sweat]), texts: [aside('KEEP IT.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Petted the wolf. It howled. The chunk heard.', [
          ...wStart(),
          { actors: wolfScene(W_POKE), texts: [woof('AWOO!')], hold: 2 },
          { actors: wolfScene(W_HOVER), texts: [woof('AWOOOO!')], hold: 3 },
          { actors: wolfScene(null, undefined, [], [hero('stand'), ...sweat]), texts: [woof('awoo.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The wolf is asleep. You petted it anyway.', [
          ...wStart(),
          { actors: wolfScene(W_POKE), texts: [woofR('z')], hold: 2 },
          { actors: wolfScene(-1), texts: [woofR('Z')], hold: 2 },
          { actors: wolfScene(W_POKE), texts: [woofR('z')], hold: 2 },
          { actors: wolfScene(null), texts: [woof('zzz')], hold: 2 },
        ]),
      ),
      needing(['miner'], take(
        ...captioned('The miner says the wolf likes you. Mostly.', [
          ...wStart(),
          { actors: wolfScene(W_POKE, undefined, [HEART(0)]), texts: [aside('HE LIKES YOU.')], hold: 3 },
          { actors: wolfScene(W_POKE, undefined, [HEART(0)]), texts: [aside('MOSTLY.')], hold: 2 },
          { actors: wolfScene(null), hold: 2 },
        ]),
      )),
    ],
    irritated: [
      take(
        ...captioned('The wolf growls. The miner backs up a step.', [
          ...wStart(),
          { actors: wolfScene(W_POKE), texts: [woof('GRRR.')], hold: 2 },
          { actors: wolfScene(W_HOVER, undefined, [], [hero('stand', -2), ...sweat]), texts: [woof('GRRR.')], hold: 3 },
          { actors: wolfScene(null, undefined, [], [hero('stand', -2), ...sweat]), texts: [aside('EASY, BOY.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The wolf snapped at your hand. Missed. Barely.', [
          ...wStart(),
          { actors: wolfScene(W_POKE), texts: [woof('SNAP!')], hold: 1 },
          { actors: wolfScene(W_ENTER, undefined, [at('sparkB', WX - 2, 9, { fixed: true })]), texts: [woof('SNAP!')], hold: 2 },
          { actors: wolfScene(null), texts: [woof('...')], hold: 2 },
          { actors: wolfScene(null, undefined, [], [hero('stand'), ...sweat]), texts: [aside('CLOSE ONE.')], hold: 2 },
        ]),
      ),
      needing(['miner'], take(
        ...captioned('The wolf hid behind the miner. Shy, suddenly.', [
          ...wStart(),
          { actors: wolfScene(W_HOVER, [at('wolf', WX - 4, 8, { fixed: true, flip: true, gone: 'wolf' })]), hold: 1 },
          { actors: [at('wolfRun', 6, 8, { fixed: true, flip: true, gone: 'wolf' }), miner('stand'), fist(HX, W_HOVER)], hold: 1 },
          { actors: [WOLF_HIDES, miner('stand'), fist(HX, W_HOVER)], texts: [{ ...say('...', -6, 4), gone: 'wolf' }], hold: 2 },
          { actors: [WOLF_HIDES, miner('stand'), fist(HX, W_POKE)], texts: [aside('HE IS SHY.')], hold: 3 },
          { actors: [WOLF_HIDES, miner('stand')], hold: 1 },
        ]),
      )),
      take(
        ...captioned('The wolf barks. The whole chunk heard that.', [
          ...wStart(),
          { actors: wolfScene(W_POKE), texts: [woof('WOOF!')], hold: 1 },
          { actors: wolfScene(W_HOVER, undefined, [], [hero('itemGet')]), texts: [woof('WOOF!'), woofR('WOOF!')], hold: 2 },
          { actors: wolfScene(W_ENTER, undefined, [], [hero('itemGet')]), texts: [woofR('WOOF!')], hold: 2 },
          { actors: wolfScene(null, undefined, [], [hero('stand'), ...sweat]), texts: [aside('INSIDE VOICE.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The wolf shook itself dry. On you.', [
          ...wStart(),
          { actors: wolfScene(W_HOVER, [wolfSits({ flip: true })], [drop(WX - 3, 6), drop(WX + 8, 7)]), texts: [woof('shake')], hold: 1 },
          { actors: wolfScene(W_HOVER, [wolfSits()], [drop(WX + 2, 4), drop(WX + 9, 10)]), texts: [woof('shake')], hold: 1 },
          { actors: wolfScene(W_HOVER, [wolfSits({ flip: true })], [drop(WX - 3, 6), drop(WX + 8, 7)]), hold: 1 },
          { actors: wolfScene(W_ENTER, [wolfSits()], [drop(HX + 3, -12)]), texts: [woof('...')], hold: 2 },
          { actors: wolfScene(null, undefined, [], [hero('stand'), ...sweat]), texts: [aside('HE SWAM EARLIER.')], hold: 2 },
        ]),
      ),
    ],
    fedUp: [
      take(
        ...captioned('The wolf bit the hand. Fair enough, honestly.', [
          ...wStart(),
          { actors: wolfScene(W_POKE, undefined, [], undefined, { swap: BITTEN }), texts: [woof('CHOMP.')], hold: 2 },
          { actors: wolfScene(W_HOVER, undefined, [], [hero('stand'), ...sweat], { swap: BITTEN }), texts: [say('OW', HX + 9, -6)], hold: 2 },
          { actors: wolfScene(W_ENTER, undefined, [], [hero('stand'), ...sweat], { swap: BITTEN }), texts: [woof('HMPH.')], hold: 2 },
          { actors: wolfScene(null, undefined, [], [hero('stand'), ...sweat]), texts: [aside('FAIR ENOUGH.')], hold: 2 },
        ]),
      ),
      needing(['miner'], take(
        ...captioned('The miner steps in. That is his dog, thanks.', [
          ...wStart(),
          { actors: wolfScene(W_HOVER, undefined, [], [hero('walk', 1)]), texts: [woof('GRRR.')], hold: 1 },
          { actors: wolfScene(W_HOVER, undefined, [], [hero('itemGet', 2)]), texts: [{ ...say('MY DOG.', 8, -8), gone: 'miner' }], hold: 3 },
          { actors: wolfScene(W_ENTER, undefined, [], [hero('itemGet', 2)]), texts: [{ ...say('MY DOG.', 8, -8), gone: 'miner' }], hold: 2 },
          { actors: wolfScene(null, undefined, [HEART(0)], [hero('stand', 2)]), texts: [woof('wag')], hold: 2 },
        ]),
      )),
      take(
        ...captioned('The wolf called a friend. Two sets of teeth.', [
          ...wStart(),
          { actors: wolfScene(W_POKE), texts: [woof('GRRR.')], hold: 1 },
          { actors: wolfScene(W_HOVER), texts: [woof('AWOO!')], hold: 2 },
          { actors: wolfScene(W_HOVER, [wolfSits(), at('wolfRun', 34, 8, { fixed: true, flip: true, offstage: true, gone: 'wolf' })]), hold: 1 },
          { actors: wolfScene(W_HOVER, [wolfSits(), WOLF_TWO]), texts: [woof('GRRR.'), { ...say('GRRR.', 29, 6), gone: 'wolf' }], hold: 3 },
          { actors: wolfScene(W_ENTER, [wolfSits(), WOLF_TWO]), texts: [woof('GRRR.'), { ...say('GRRR.', 29, 6), gone: 'wolf' }], hold: 1 },
          { actors: wolfScene(null, [wolfSits(), WOLF_TWO], [], [hero('stand'), ...sweat]), texts: [aside('TWO NOW.')], hold: 2 },
        ]),
      ),
    ],
    snapped: [
      take(
        ...captioned('The wolf ran off. It will be back. Probably.', [
          ...wStart(),
          { actors: wolfScene(W_POKE), texts: [woof('GRRR.')], hold: 2 },
          { actors: wolfScene(W_ENTER), texts: [woof('NO.')], hold: 2 },
          ...wolfLeaves(),
        ]),
      ),
      take(
        ...captioned('The wolf is wild again. It left for the woods.', [
          ...wStart(),
          { actors: wolfScene(W_POKE, [wolfSits({ swap: { collar: 'wolf' } })]), texts: [woof('...')], hold: 2 },
          { actors: wolfScene(W_HOVER, [wolfSits({ swap: { collar: 'wolf' } })], [], [hero('stand'), ...sweat]), texts: [aside('HIS COLLAR!')], hold: 3 },
          { actors: wolfScene(null, [at('wolf', WX, 8, { fixed: true, swap: { collar: 'wolf' }, gone: 'wolf' })], [], [hero('stand'), ...sweat]), hold: 1 },
          { actors: wolfScene(null, [at('wolfRun', 30, 8, { fixed: true, offstage: true, swap: { collar: 'wolf' }, gone: 'wolf' })], [], [hero('stand'), ...sweat]), hold: 1 },
          { actors: wolfScene(null, [at('wolfRun', 40, 8, { fixed: true, offstage: true, swap: { collar: 'wolf' }, gone: 'wolf' })], [], [hero('stand'), ...sweat]), hold: 1 },
          { actors: wolfScene(null, [], [], [hero('stand'), ...sweat]), texts: [aside('BE FREE, I GUESS.')], hold: 3 },
        ]),
      ),
    ],
  },
  // The wolf's rest: the miner calls; nobody comes. A bone is left out, just in case.
  rest: loop(
    { actors: [miner('stand')], hold: 6 },
    { actors: [miner('stand')], texts: [aside('HERE, BOY?')], hold: 6 },
    { actors: [miner('itemGet'), BONE_GROUND], texts: [aside('I HAVE A BONE.')], hold: 6 },
    { actors: [miner('stand'), BONE_GROUND], texts: [aside('...')], hold: 6 },
    { actors: [{ ...lookBack, gone: 'miner' }, BONE_GROUND], hold: 6 },
  ),
}

// 3. Poke the creeper. It stands where the props go, as when it comes for a
// failed tool; the arm comes down on its head with the pickaxe. Its hisses sit
// over its head while the arm is up, beside it while the arm is down.
const CX = 24
const C_ENTER = -24
const C_HOVER = -18
const C_POKE = -13
const FLASHED = { creep1: 'W', creep2: 'smoke2', creep3: 'W' }
const creeperAt = (x: number, opts: Partial<Actor> = {}): Actor => at('creeper', x, 1, { fixed: true, gone: 'creeper', ...opts })
const creeper = (opts: Partial<Actor> = {}): Actor => creeperAt(Q, opts)
/** The miner watching, the creeper (or `creep` in its place), the arm at `y` (null: gone). */
const creeperScene = (y: number | null, creep: Actor[] = [creeper()], more: Actor[] = [], crew: Actor[] = [hero('stand')]): Actor[] => [
  ...minerOf(crew),
  ...creep,
  ...(y === null ? [] : you(CX, y, y <= C_ENTER ? { offstage: true } : {})),
  ...more,
]
const cStart = (creep: Actor[] = [creeper()]): Frame[] => [
  { actors: creeperScene(C_ENTER, creep), hold: 1 },
  { actors: creeperScene(C_HOVER, creep), hold: 1 },
  { actors: creeperScene(C_POKE, creep, [at('sparkA', Q + 1, -2, { fixed: true })]), hold: 1 },
]
/** The creeper's line beside it, under the arm (at most 8 characters); `hissUp`: over its head, the arm up or gone (at most 11). */
const hiss = (text: string, color = CREEP): SceneText => ({ ...say(text, 17, 2, color), gone: 'creeper' })
const hissUp = (text: string, color = CREEP): SceneText => ({ ...say(text, 25, -2, color), gone: 'creeper' })
const fleeing = (x: number): Actor => ({ ...hero('walk', x), flip: true })
const WALL_LOW: Actor = { ...at('dirtBlock', P, 8), gone: 'miner' }
const WALL_HIGH: Actor = { ...at('dirtBlock', P, 0), gone: 'miner' }
const CRATER: Actor = at('crater', Q - 2, 16, { fixed: true })
const WISP_A: Actor = at('wispA', Q + 2, 11, { fixed: true })
const WISP_B: Actor = at('wispB', Q + 3, 9, { fixed: true })
const boom = (sprite: string, x: number, y: number, swap?: Record<string, string>): Actor => at(sprite, x, y, { fixed: true, swap, gone: 'creeper' })
/** The fuse runs out: the blast at the creeper's spot knocks the miner back; a crater smokes where it stood. */
const creeperBlows = (crew: Actor[] = [hero('stand')], x = 0): Frame[] => [
  { actors: creeperScene(null, [creeper({ swap: FLASHED })], [], crew), texts: [hiss('SSSS')], hold: 1 },
  { actors: creeperScene(null, [], [boom('boom1', Q - 4, 2)], [hero('stand', x - 1, 0, HURT)]), hold: 1 },
  { actors: creeperScene(null, [], [boom('boom2', Q - 8, 0)], [hero('stand', x - 2, 0, { ...HURT, A: 'hurtL', C: 'hurtL' })]), hold: 1 },
  { actors: creeperScene(null, [], [CRATER, boom('boom1', Q - 4, 4, { boomO: 'smoke3', smoke1: 'smoke2' })], [hero('stand', x - 2, 0, HURT)]), hold: 1 },
  { actors: creeperScene(null, [], [CRATER, WISP_A], [hero('stand', x - 1), ...sweat]), hold: 1 },
  { actors: creeperScene(null, [], [CRATER, WISP_B], [hero('stand', x), ...sweat]), texts: [aside('...')], hold: 3 },
]
const pokeCreeper: ThemeAction = {
  id: 'creeper',
  label: 'POKE CREEPER',
  restLabel: '(KABOOM)',
  gone: ['creeper'],
  needs: ['creeper'],
  reactions: {
    calm: [
      take(
        ...captioned('Poked the creeper. It hissed. Politely.', [
          ...cStart(),
          { actors: creeperScene(C_POKE), texts: [hiss('sss')], hold: 2 },
          { actors: creeperScene(C_HOVER), texts: [hissUp('sss.')], hold: 2 },
          { actors: creeperScene(null), hold: 2 },
        ]),
      ),
      take(
        ...captioned('Creeper poked. No arms, so no poking back.', [
          ...cStart(),
          { actors: creeperScene(C_POKE), texts: [hiss('...')], hold: 2 },
          { actors: creeperScene(C_HOVER), texts: [hissUp('NO ARMS.')], hold: 3 },
          { actors: creeperScene(null), texts: [hissUp('UNFAIR.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Poked the creeper. It thought about it. No.', [
          ...cStart(),
          { actors: creeperScene(C_POKE, [creeper({ swap: FLASHED })]), texts: [hiss('SSSS')], hold: 1 },
          { actors: creeperScene(C_HOVER), texts: [hiss('...')], hold: 2 },
          { actors: creeperScene(null), texts: [hissUp('NAH.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The creeper took one step back. Just one.', [
          ...cStart(),
          { actors: creeperScene(C_HOVER, [creeperAt(Q + 2)]), texts: [hiss('sss')], hold: 2 },
          { actors: creeperScene(C_POKE, [creeperAt(Q + 2)]), texts: [hiss('...')], hold: 2 },
          { actors: creeperScene(null, [creeperAt(Q + 2)]), texts: [hissUp('sss.')], hold: 2 },
        ]),
      ),
      needing(['miner'], take(
        ...captioned('The miner would like you to not poke that.', [
          ...cStart(),
          { actors: creeperScene(C_POKE, undefined, [], [hero('stand'), ...sweat]), texts: [aside("DON'T.")], hold: 2 },
          { actors: creeperScene(C_HOVER, undefined, [], [hero('stand'), ...sweat]), texts: [aside("DON'T POKE THAT.")], hold: 3 },
          { actors: creeperScene(null, undefined, [], [hero('stand'), ...sweat]), texts: [aside('PLEASE.')], hold: 2 },
        ]),
      )),
      take(
        ...captioned('The creeper admires your pickaxe. Uh oh.', [
          ...cStart(),
          { actors: creeperScene(C_POKE), texts: [hiss('sss?')], hold: 2 },
          { actors: creeperScene(C_HOVER), texts: [hissUp('NICE PICK.')], hold: 3 },
          { actors: creeperScene(C_HOVER, undefined, [], [hero('stand'), ...sweat]), texts: [hissUp('NICE PICK.'), aside('OH NO.')], hold: 2 },
          { actors: creeperScene(null, undefined, [], [hero('stand'), ...sweat]), texts: [hissUp('SHAME IF...')], hold: 3 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('The creeper counted to two. Then stopped.', [
          ...cStart(),
          { actors: creeperScene(C_POKE, [creeper({ swap: FLASHED })]), texts: [hiss('SSSS')], hold: 1 },
          { actors: creeperScene(C_HOVER), texts: [hiss('sss')], hold: 1 },
          { actors: creeperScene(C_HOVER, [creeper({ swap: FLASHED })], [], [hero('stand'), ...sweat]), texts: [hiss('SSSS'), aside('!')], hold: 1 },
          { actors: creeperScene(C_ENTER, undefined, [], [hero('stand'), ...sweat]), texts: [hiss('...')], hold: 2 },
          { actors: creeperScene(null, undefined, [], [hero('stand'), ...sweat]), texts: [hissUp('TWO. HAPPY?')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The creeper moved closer to the miner. Great.', [
          ...cStart(),
          { actors: creeperScene(C_HOVER, [creeperAt(23)]), texts: [hiss('sss')], hold: 1 },
          { actors: creeperScene(C_HOVER, [creeperAt(20)], [], [hero('stand'), ...sweat]), texts: [hiss('sss')], hold: 2 },
          { actors: creeperScene(null, [creeperAt(20)], [], [hero('stand'), ...sweat]), texts: [aside('TOO CLOSE.')], hold: 2 },
          { actors: creeperScene(null, [creeperAt(20)], [], [hero('stand', -2), ...sweat]), texts: [aside('TOO CLOSE.')], hold: 3 },
        ]),
      ),
      needing(['miner'], take(
        ...captioned('The miner drew his pickaxe. At everyone.', [
          ...cStart(),
          { actors: creeperScene(C_HOVER, undefined, [], [hero('attack'), windup()]), texts: [aside('BACK OFF.', -4)], hold: 3 },
          { actors: creeperScene(C_HOVER, [creeperAt(Q + 2)], [], [hero('attack'), windup()]), texts: [hissUp('sss.')], hold: 2 },
          { actors: creeperScene(null, [creeperAt(Q + 2)], [], [hero('attack'), windup()]), texts: [aside('AND YOU TOO.', -4)], hold: 2 },
        ]),
      )),
      take(
        ...captioned('The creeper hissed at your hand. You flinched.', [
          ...cStart(),
          { actors: creeperScene(C_POKE, [creeper({ swap: FLASHED })]), texts: [hiss('SSSS!')], hold: 1 },
          { actors: creeperScene(C_ENTER), texts: [hiss('sss')], hold: 2 },
          { actors: creeperScene(C_HOVER), texts: [hissUp('...')], hold: 1 },
          { actors: creeperScene(C_ENTER, [creeper({ swap: FLASHED })]), texts: [hiss('SSSS!')], hold: 1 },
          { actors: creeperScene(null), texts: [hissUp('HEH.')], hold: 3 },
        ]),
      ),
    ],
    fedUp: [
      take(
        ...captioned("False alarm. The miner's heart rate disagrees.", [
          ...cStart(),
          { actors: creeperScene(C_POKE, [creeper({ swap: FLASHED })], [], [hero('stand'), ...sweat]), texts: [hiss('SSSS'), aside('RUN!')], hold: 1 },
          { actors: creeperScene(C_HOVER, undefined, [], [fleeing(-3)]), texts: [hiss('SSSS')], hold: 1 },
          { actors: creeperScene(C_HOVER, [creeper({ swap: FLASHED })], [], [fleeing(-3)]), texts: [hiss('SSSS')], hold: 1 },
          { actors: creeperScene(C_ENTER, undefined, [], [hero('stand', -3), ...sweat]), texts: [hissUp('...')], hold: 2 },
          { actors: creeperScene(null, undefined, [], [hero('stand', -3), ...sweat]), texts: [hissUp('KIDDING.')], hold: 3 },
        ]),
      ),
      needing(['miner'], take(
        ...captioned('The miner walled off the creeper. Two blocks.', [
          ...cStart(),
          { actors: creeperScene(C_POKE, undefined, [], [hero('attack')]), texts: [hiss('sss')], hold: 1 },
          { actors: creeperScene(C_HOVER, undefined, [WALL_LOW], [hero('attack')]), hold: 1 },
          { actors: creeperScene(C_HOVER, undefined, [WALL_LOW, WALL_HIGH], [hero('stand')]), texts: [aside('NOPE.', -4)], hold: 2 },
          { actors: creeperScene(C_ENTER, undefined, [WALL_LOW, WALL_HIGH], [hero('stand')]), texts: [hissUp('...')], hold: 2 },
          { actors: creeperScene(null, undefined, [WALL_LOW, WALL_HIGH], [hero('stand')]), texts: [aside('PROBLEM SOLVED.', -4)], hold: 3 },
        ]),
      )),
      take(
        ...captioned('Another creeper. They travel in pairs now.', [
          ...cStart(),
          { actors: creeperScene(C_POKE), texts: [hiss('sss')], hold: 1 },
          { actors: creeperScene(C_HOVER, [creeperAt(23), creeperAt(34, { offstage: true })]), texts: [hiss('sss')], hold: 1 },
          { actors: creeperScene(C_HOVER, [creeperAt(20), creeperAt(28)], [], [hero('stand'), ...sweat]), texts: [hiss('sss'), hissUp('sss')], hold: 2 },
          { actors: creeperScene(C_ENTER, [creeperAt(20), creeperAt(28)], [], [hero('stand'), ...sweat]), texts: [aside('TWO?!'), hissUp('sss')], hold: 2 },
          { actors: creeperScene(null, [creeperAt(20), creeperAt(28)], [], [hero('stand', -2), ...sweat]), texts: [aside('TWO?!'), hissUp('sss')], hold: 3 },
        ]),
      ),
    ],
    snapped: [
      take(
        ...captioned('BOOM. The creeper is gone. So is the lawn.', [
          ...cStart(),
          { actors: creeperScene(C_POKE, [creeper({ swap: FLASHED })]), texts: [hiss('SSSS')], hold: 1 },
          { actors: creeperScene(C_HOVER), texts: [hiss('sss')], hold: 1 },
          { actors: creeperScene(C_ENTER, [creeper({ swap: FLASHED })], [], [hero('stand'), ...sweat]), texts: [hiss('SSSS'), aside('UH OH.')], hold: 2 },
          ...creeperBlows([hero('stand'), ...sweat]),
        ]),
      ),
      take(
        ...captioned('The creeper blew up. The miner ran. Mostly.', [
          ...cStart(),
          { actors: creeperScene(C_POKE, [creeper({ swap: FLASHED })], [], [hero('stand'), ...sweat]), texts: [hiss('SSSS'), aside('RUN!')], hold: 1 },
          { actors: creeperScene(C_ENTER, undefined, [], [fleeing(-2)]), texts: [hiss('SSSS')], hold: 1 },
          { actors: creeperScene(null, [creeper({ swap: FLASHED })], [], [fleeing(-3)]), texts: [hiss('SSSS')], hold: 1 },
          ...creeperBlows([fleeing(-3)], -3),
        ]),
      ),
    ],
  },
  // The creeper's rest: a smoking crater where it stood; the miner keeps his distance.
  rest: loop(
    { actors: [miner('stand'), ...minerOf(sweat), CRATER, WISP_A], hold: 6 },
    { actors: [miner('stand'), ...minerOf(sweat), CRATER, WISP_B], texts: [aside('...')], hold: 6 },
    { actors: [miner('stand'), CRATER, WISP_A], texts: [aside('THAT WAS CLOSE.')], hold: 6 },
    { actors: [{ ...lookBack, gone: 'miner' }, CRATER, WISP_B], hold: 6 },
    { actors: [miner('stand'), CRATER], texts: [aside('WELL.')], hold: 6 },
  ),
}

const actions: ThemeAction[] = [probeMiner, petWolf, pokeCreeper]

const MINER_POSES = { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'sleep', lie: 'lie' }
// Under the quilt the champion is just a miner in a bed: the small lying pose keeps the bed in scale.
const CHAMPION_POSES = { stand: 'gStand', walk: 'gWalk', attack: 'gAttack', itemGet: 'gItemGet', sleep: 'gSleep', lie: 'lie' }
// His fists are two pixels right of the small miner's, held and raised.
const CHAMPION_FORM = { poses: CHAMPION_POSES, dx: -2, dy: -4, lift: LIFT, hand: { x: 2, y: -2 }, aloft: { x: 2, y: 0 } }
const armor = (l: string, s: string, d: string, glintTo: string, trim: string, cape?: [string, string]) => ({
  A: l,
  a: s,
  C: l,
  c: s,
  L: l,
  l: s,
  B: s,
  b: d,
  E: glintTo,
  e: glintTo,
  T: trim,
  ...(cape ? { R: cape[0], r: cape[1] } : {}),
})

/** A lava fall `x` from the right edge: hung from the ceiling and standing on the floor (the two overlap), with a pool at its foot. */
const fall = (sprite: string, pool: string, x: number, poolX: number, minColumns: number) => [
  { sprite, x, y: 4, sky: true, minPercent: 75, minColumns },
  { sprite, x, y: 4, minPercent: 75, minColumns },
  { sprite: pool, x: poolX, y: 34, minPercent: 75, minColumns },
]

export const minecraft: Theme = {
  id: 'minecraft',
  name: 'Tokencraft',
  description: 'Voxel survival homage: armor per model, a pickaxe per effort, hearts, hunger and emeralds, mining deeper as context fills',
  version: '1.1.0',
  palette: {
    dark: { accent: '#55ff55', gold: '#ffff55', red: '#ff5555', label: '#55ffff', dim: '#aaaaaa', text: '#ffffff' },
    light: { accent: '#007a00', gold: '#8a6200', red: '#aa0000', label: '#007574', dim: '#555555', text: '#1e1e1e' },
  },
  pixels,
  labels: {
    context: 'HEALTH',
    spend: 'EMERALDS',
    cache: 'HUNGER',
    limits: 'BORDER',
    modelItem: 'ARMOR',
    effortItem: 'PICKAXE',
    heroes: 'Armor',
    weapons: 'Pickaxes',
  },
  headings: {
    Context: 'Health',
    Cost: 'Emeralds',
    'Next message': 'Hunger',
    Tokens: 'Blocks mined',
    Limits: 'Border',
    'Tool calls': 'Statistics',
    Files: 'Chunks loaded',
  },
  sprites,
  states,
  cold,
  overkill,
  events,
  actions,
  scene: {
    height: 40,
    anchor: { x: 12, y: 18 },
    background: {
      ground: '#7aa6ff',
      gradient: ['#5a8cff', '#78a4ff', '#98bcff', '#b4d0ff'],
      deep: ['#0e0c12', '#18121c', '#24161a', '#4a1c0c', '#8a3410'],
      shade: { color: '#000000', amount: 0.3 },
      // The backdrop changes at 25, 50 and 75% of the context. Past the action (columns 0..45) the
      // scenery hangs from the right edge: one piece at 58 columns, more at 80, the rest at 96.
      decor: [
        { sprite: 'caveStone', x: 0, y: 0, sky: true, minPercent: 25, maxPercent: 50 },
        { sprite: 'caveDeep', x: 0, y: 0, sky: true, minPercent: 50, maxPercent: 75 },
        // Over the lava the rock ends 14 rows above the floor, at any height: one piece from the top, one riding on the floor.
        { sprite: 'caveBrow', x: 0, y: 0, sky: true, minPercent: 75 },
        { sprite: 'caveBrowTall', x: 0, y: -20, minPercent: 75 },
        // Grass and sky
        { sprite: 'sun', x: -5, y: 2, sky: true, maxPercent: 25 },
        { sprite: 'oak', x: -1, y: 14, maxPercent: 25, minColumns: 56 },
        { sprite: 'cloudSmall', x: -16, y: 10, sky: true, maxPercent: 25, minColumns: 78 },
        { sprite: 'flowers', x: -14, y: 30, maxPercent: 25, minColumns: 78 },
        { sprite: 'cloud', x: -30, y: 4, sky: true, maxPercent: 25, minColumns: 94 },
        { sprite: 'birch', x: -34, y: 18, maxPercent: 25, minColumns: 94 },
        { sprite: 'floorGrass', x: 0, y: 34, maxPercent: 25 },
        // Stone, then deepslate
        { sprite: 'ceilStone', x: 0, y: 0, sky: true, minPercent: 25, maxPercent: 50 },
        { sprite: 'floorStone', x: 0, y: 34, minPercent: 25, maxPercent: 50 },
        { sprite: 'ceilDeep', x: 0, y: 0, sky: true, minPercent: 50 },
        { sprite: 'drip', x: 44, y: 5, sky: true, minPercent: 50 },
        { sprite: 'drip', x: 29, y: 5, sky: true, minPercent: 60 },
        { sprite: 'floorDeep', x: 0, y: 34, minPercent: 50, maxPercent: 75 },
        { sprite: 'wallTorch', x: -4, y: 18, minPercent: 25, maxPercent: 75, minColumns: 56 },
        { sprite: 'veinIron', x: -1, y: 9, minPercent: 25, maxPercent: 50, minColumns: 56 },
        { sprite: 'veinDiamond', x: -1, y: 9, minPercent: 50, maxPercent: 75, minColumns: 56 },
        { sprite: 'stalagmite', x: -14, y: 26, minPercent: 25, maxPercent: 75, minColumns: 78 },
        { sprite: 'chest', x: -22, y: 27, minPercent: 25, maxPercent: 75, minColumns: 78 },
        { sprite: 'rails', x: -30, y: 32, minPercent: 25, maxPercent: 75, minColumns: 94 },
        { sprite: 'minecart', x: -34, y: 27, minPercent: 25, maxPercent: 75, minColumns: 94 },
        // Lava over bedrock
        { sprite: 'floorLava', x: 0, y: 34, minPercent: 75 },
        ...fall('lavaFall', 'lavaPool', -4, -1, 56),
        ...fall('lavaTrickle', 'lavaPuddle', -20, -18, 78),
        ...fall('lavaFall', 'lavaPool', -38, -35, 94),
      ],
      particles: [{ colors: ['#ffb02a', '#ff6a1a', '#fff07a'], count: 14, drift: 'up', speed: 0.6, minPercent: 75 }],
    },
    hero: MINER_POSES,
    heroTiers: {
      tier1: armor('leaL', 'leaS', 'leaD', 'leaD', 'leaD'),
      tier2: armor('ironL', 'ironS', 'ironD', 'W', 'ironD'),
      tier3: armor('diaL', 'diaS', 'diaD', 'glint', 'diaD', ['capeR', 'capeRS']),
      tier4: armor('nethL', 'nethS', 'nethD', 'glint', 'gold', ['capeP', 'capePS']),
      unknown: { A: 'hair', a: 'hairS', C: 'shirt', c: 'shirtS', L: 'pants', l: 'pantsS', B: 'shoe', b: 'shoeS', E: 'shirt', e: 'hair', T: 'hairS' },
    },
    heroForms: {
      tier3: CHAMPION_FORM,
      tier4: CHAMPION_FORM,
    },
    heroNames: {
      tier1: 'Leather Rookie',
      tier2: 'Iron Veteran',
      tier3: 'Diamond Champion',
      tier4: 'Netherite Legend',
      unknown: 'Unarmored Wanderer',
    },
    weapons: {
      low: { sprite: 'pick', swap: { M: 'woodM', m: 'woodS', n: 'woodN' }, name: 'Wooden Pickaxe' },
      medium: { sprite: 'pick', swap: { M: 'stoneM', m: 'stoneS', n: 'stoneN' }, name: 'Stone Pickaxe' },
      high: { sprite: 'pick', swap: { M: 'ironM', m: 'ironP', n: 'ironN' }, name: 'Iron Pickaxe' },
      xhigh: { sprite: 'pick', swap: { M: 'diaM', m: 'diaP', n: 'glint' }, name: 'Diamond Pickaxe, enchanted' },
      max: { sprite: 'pick', swap: { M: 'nethM', m: 'nethP', n: 'glint' }, aura: 'pickAura', name: 'Netherite Pickaxe, Efficiency V' },
    },
    // 48 and 58 columns: emeralds and hearts over hunger and the two slots. 80: one row, 77 columns.
    // The counter keeps five characters, so a growing sum moves nothing.
    bar: {
      widgets: [
        { kind: 'counter', value: 'spend', icon: 'emeraldIcon', chars: 5 },
        { kind: 'meter', value: 'contextLeft', count: 10, perRow: 5, sprites: ['heart0', 'heart1', 'heart2'], label: 'HEALTH', pulseBelow: 0.2 },
        { kind: 'meter', value: 'cache', count: 10, perRow: 5, sprites: ['food0', 'food1', 'food2'], label: 'HUNGER', pulseBelow: 0.15, wrap: true, drop: 3 },
        { kind: 'box', shows: 'model', sprite: 'chestIcon', label: 'ARMOR', x: 1, y: 4, drop: 1 },
        { kind: 'box', shows: 'effort', sprite: 'pickIcon', label: 'PICKAXE', x: 1, y: 5, drop: 2 },
      ],
      colors: { bg: 'hudBg', box: 'slot', text: 'hudText', label: 'hudLabel', map: 'mapGray', mapDot: 'emerald' },
    },
    stamina: { x: 1, y: 1, radius: 4, full: 'clockDay', empty: 'clockNight', cold: 'clockCold', tagIcon: 'emeraldIcon', tagColor: '#ffffff', tagColdColor: '#c9d6ee' },
    lineup: { ground: 'lineupBg', ink: '#1e1e1e', dim: '#2a3558', mark: '#7a0000' },
    message: { bg: 'msgBg', ink: '#ffffff' },
  },
  text: {
    idle: 'The miner waits by the crafting table, torch lit.',
    thinking: 'The miner stares at the crafting grid...',
    reading: 'The miner pores over the enchanting book.',
    editing: 'The miner breaks stone and places fresh planks.',
    shell: 'The miner pulls a lever; redstone lights the lamps.',
    agents: 'Tamed wolves run off on errands and bring back bones.',
    toolSuccess: 'Diamonds! A few XP orbs, too.',
    toolError: 'Sssss... BOOM. A creeper got the miner.',
    turnComplete: 'Advancement made!',
    milestone: 'The miner digs to a new depth.',
    cacheCold: 'Night falls, or underground the torch burns out; the miner goes to bed hungry.',
    limitWarning: 'The world border closes in.',
    compaction: 'The miner sleeps through the dark; the world is saved.',
    modelChange: 'The miner changes armor.',
    effortChange: 'The anvil rings: a new pickaxe.',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75). Two lines at most in 48 columns.
  milestones: [
    { level: 'ok', message: 'Y=64 AND DIGGING. {pct}% OF THE WAY TO BEDROCK. PLENTY OF TORCHES.' },
    { level: 'warn', message: '{pct}% OF THE WAY TO BEDROCK. THE STONE GETS HARD. MIND YOUR TORCHES.' },
    { level: 'orange', message: '{pct}% OF THE WAY TO BEDROCK. DEEPSLATE BELOW. FIND A SPOT TO SET YOUR BED.' },
    { level: 'alert', message: "{pct}% OF THE WAY TO BEDROCK. CREEPERS, NO SPAWN POINT: IT'S DANGEROUS DOWN HERE." },
    { level: 'critical', message: 'LAVA AHEAD! {pct}% DUG. SAVE YOUR PROGRESS AND /clear BEFORE YOU FALL IN.' },
  ],
  messages: {
    cacheCold: 'LIGHTS OUT AND THE HUNGER BAR IS EMPTY. YOUR CACHE WENT COLD.',
    limitWarning: 'THE WORLD BORDER CLOSES IN! {name} AT {pct}%.',
    compaction: 'You slept through the night. World saved (compacted).',
    modelChange: 'Armor changed: {name}!',
    effortChange: 'Anvil used: {weapon}!',
  },
}
