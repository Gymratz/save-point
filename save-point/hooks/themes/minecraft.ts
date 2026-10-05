// "Tokencraft": a voxel-survival homage. Every sprite is drawn fresh for this theme in that blocky style.
//
// The model is the miner's armor (leather, iron, enchanted diamond, enchanted
// netherite), effort is the pickaxe, context is how deep you have mined (grass
// and sky, stone, deepslate, then lava over bedrock), the cache is the hunger
// bar, cents are emeralds.
//
// The miner and the pickaxe use single-letter pixel keys (so 'C' is the
// chestplate) that every armor tier and pickaxe material swaps. Scenery is
// drawn with a legend per sprite, or painted in code (terrain strips).

import { at, hero, loop, once, weapon } from './kit'
import { rotate } from './pixel'
import type { Actor, HeroTier, SceneText, Sprite, Theme } from './types'

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
  E: '#ffffff', // enchantment glint spots
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
  diaN: '#c8fffa',
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
  sunset: '#ff9a3a',
  sunsetD: '#e0602a',
  cloudW: '#ffffff',
  cloudG: '#e4ecf6',
  night: '#0c1230',
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
  love: '#ff5a7a',
  orbG: '#a8ff3a',
  orbY: '#f0ff8a',
  orbD: '#5ab01a',
  smoke1: '#ffffff',
  smoke2: '#cfcfcf',
  smoke3: '#9a9a9a',
  boomO: '#ffcc3a',
  sweat: '#8cd0fc',
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
  heartE: '#4a1616',
  meat: '#b4632f',
  meatL: '#e09454',
  foodE: '#3e2c1c',
  emerald: '#17dd62',
  emeraldL: '#a8ffc8',
  emeraldD: '#0a8a3a',
  clockDay: '#ffd84a',
  clockNight: '#2a3470',
  clockCold: '#5a5a5a',
  lineupBg: '#c6c6c6',
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
const floorLava = paint(STRIP, 6, (x, y) => {
  const bx = x >> 3
  if (bx % 5 === 2 || bx % 5 === 3) {
    if (y === 0) return rnd(x, y, 7) < 0.4 ? 'lava1' : 'lava2'
    return y < 3 ? (rnd(x, y, 8) < 0.3 ? 'lava2' : 'lava3') : rnd(x, y, 9) < 0.3 ? 'lava4' : 'lava3'
  }
  if (y >= 4) return tone(BEDROCK, x, y, 10)
  return oreAt(x, y, bx % 4 === 0 ? ORES.dia! : null) ?? tone(DEEP, x, y, 11)
})
/** A cave ceiling: rock with a ragged lower edge. */
const ceiling = (ramp: [string, string, string], ore: (bx: number) => [string, string] | null, seed: number) =>
  paint(STRIP, 6, (x, y) => {
    if (y === 5 && rnd(x, 0, seed) < 0.6) return null
    if (y === 4 && rnd(x, 0, seed + 1) < 0.25) return null
    return oreAt(x, y + 2, ore(x >> 3)) ?? tone(ramp, x, y, seed)
  })

/** Night over the whole scene above the floor: stars and the square moon. */
const nightSky = paint(STRIP, 34, (x, y) => {
  if (x >= 28 && x < 34 && y >= 3 && y < 9) return x === 28 || y === 8 ? 'moonD' : 'moon'
  const r = rnd(x, y, 12)
  return r < 0.012 ? 'starW' : r < 0.022 ? 'starD' : 'night'
})

/** A lava fall down the right wall. */
const lavaFall = paint(4, 29, (x, y) => ((y + x * 3) % 7 === 0 ? 'lava1' : (y + x) % 5 === 0 ? 'lava3' : x === 0 || x === 3 ? 'lava3' : 'lava2'))

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

/** The world border: a wall of red diagonal stripes. */
const borderWall = paint(6, 34, (x, y) => ((x + y) % 4 === 0 ? 'borderR' : (x + y) % 4 === 1 ? 'borderD' : null))

/** The advancement toast: a dark panel with a diamond. */
const DIAMOND_ICON = ['.cCCc.', 'cWCCCc', 'kcCCck', '.kcck.', '..kk..']
const toast = paint(27, 8, (x, y) => {
  const edge = x === 0 || x === 26 || y === 0 || y === 7
  if ((x === 0 || x === 26) && (y === 0 || y === 7)) return null
  const icon = DIAMOND_ICON[y - 2]?.[x - 2]
  if (icon && icon !== '.') return { c: 'diaS', C: 'diaL', W: 'W', k: 'diaD' }[icon] ?? null
  return edge ? 'toastB' : 'toastF'
})

// ---------------------------------------------------------------------------
// The miner: 16 by 16, facing right. Armor keys swap per tier.
// ---------------------------------------------------------------------------

const HEAD = [
  '....AAAAAAAA....',
  '...AAAAAAAAEA...',
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
  '.....AAAEAAAAAAA....',
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
      'cC.AAAAAAAAEA.Cc',
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
      '.cC..AAAEAAAAAAA..Cc',
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
  heart0: spr(['ee.ee', 'eeeee', 'eeeee', '.eee.', '..e..'], { e: 'heartE' }),
  heart1: spr(['hh.ee', 'Hhhee', 'hhhee', '.hhe.', '..h..'], { h: 'heart', H: 'heartL', e: 'heartE' }),
  heart2: spr(['hh.hh', 'Hhhhh', 'hhhhh', '.hhh.', '..h..'], { h: 'heart', H: 'heartL' }),
  food0: spr(['..eee', '.eeee', '.eeee', '.ee..', 'e....'], { e: 'foodE' }),
  food1: spr(['..eMM', '.eMMm', '.emmm', '.ee..', 'e....'], { M: 'meatL', m: 'meat', e: 'foodE' }),
  food2: spr(['..MMM', '.MMMm', '.mmmm', '.bm..', 'b....'], { M: 'meatL', m: 'meat', b: 'boneW' }),
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
  nightSky,
  lavaFall,
  sun: spr(['oooooooo', 'oyyyyyyo', 'oyyyyyyo', 'oyyyyyyo', 'oyyyyyyo', 'oyyyyyyo', 'oyyyyyyo', 'oooooooo'], { o: 'sunO', y: 'sunY' }),
  cloud: spr(['....WWWWWWWW......', 'WWWWWWWWWWWWWWWWWW', 'GGGGGGGGGGGGGGGGGG'], { W: 'cloudW', G: 'cloudG' }),
  cloudSmall: spr(['..WWWWWW..', 'WWWWWWWWWW', 'GGGGGGGGGG'], { W: 'cloudW', G: 'cloudG' }),
  oak: spr(
    [
      '...vvvvvvvv...',
      '..vVvvvvXvvv..',
      '.vvvvXvvvvVvv.',
      'vvVvvvvvvvvvvv',
      'vvvvvvVvvXvvvv',
      'vXvvvvvvvvvVvv',
      'vvvvVvvvXvvvvv',
      '.vvvvvvvvvvvv.',
      '......bB......',
      '......bB......',
      '......bB......',
      '......bB......',
      '......bB......',
      '......bB......',
      '......bB......',
      '......bB......',
      '......bB......',
      '......bB......',
      '......bB......',
      '......bB......',
      '......bB......',
      '......bB......',
    ],
    { v: 'leaf1', V: 'leaf2', X: 'leaf3', b: 'barkD', B: 'bark' },
  ),
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
  enchTable: spr(['DcccccD.', 'oCCCCCCo', 'oooooooo', 'oOooooOo', 'oooooooo', 'oooOoooo'], {
    D: 'diaL',
    c: 'cloth',
    C: 'clothD',
    o: 'obsid',
    O: 'obsidL',
  }),
  bookOpen: spr(['pp..pp', 'pPpPpp', 'cccccc'], { p: 'page', P: 'ink', c: 'cover' }),
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
  lever0: spr(['k....', '.w...', '..w..', '.ccc.', 'cCcCc'], { k: 'dust', w: 'w', c: 'cobble1', C: 'cobble2' }),
  lever1: spr(['....k', '...w.', '..w..', '.ccc.', 'cCcCc'], { k: 'dustOn', w: 'w', c: 'cobble1', C: 'cobble2' }),
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
  dustOff: spr(['r.rr', 'rrr.'], { r: 'dust' }),
  dustLit: spr(['r.rr', 'rrr.'], { r: 'dustOn' }),
  anvil: spr(['AAAAAAAAAA', '.aAAAAAAa.', '...aAAa...', '...aAAa...', '..AAAAAA..', '.dddddddd.'], { A: 'anvilL', a: 'anvil', d: 'anvilD' }),
  bedBase: spr(['PPPPPPPPdqqqqqqqqqqqq', 'wwwwwwwwwwwwwwwwwwwww', 'ww.................ww', 'WW.................WW'], {
    P: 'pillow',
    d: 'quiltD',
    q: 'quiltD',
    w: 'plank',
    W: 'plankD',
  }),
  quilt: paint(13, 13, (x, y) => (x === 0 ? 'pillow' : y === 0 ? 'quiltL' : y === 12 ? 'quiltD' : (x + y * 3) % 7 === 0 ? 'quiltL' : 'quilt')),
  pieceHelm: { rows: ['.AAAAAA.', 'AAAEAAAA', 'Aa....aA', 'a......a'] },
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
  bone: spr(['b..b', 'bbbb', 'b..b'], { b: 'boneW' }),
  love: spr(['h.h', 'hhh', '.h.'], { h: 'love' }),
  sweat: spr(['.O.', 'OOO', '.O.'], { O: 'sweat' }),
  sparkA: spr(['.g.', 'gWg', '.g.'], { g: 'glint', W: 'W' }),
  sparkB: spr(['g.g', '.G.', 'g.g'], { g: 'glint2', G: 'glint' }),
  toast,
  borderWall,
}

// Lying down asleep: the dozing poses turned a quarter, head to the left.
sprites.lie = rotate(sprites.sleep!, 'ccw')

// ---------------------------------------------------------------------------
// Frames: actors relative to the miner's top-left; the floor is at y 16.
// ---------------------------------------------------------------------------

const GRAND: HeroTier[] = ['tier3', 'tier4']
/** How far the champion's props over the head move up (`heroForms.lift`). */
const LIFT = 4

/** Scenery above the miner's head that stays put for every tier. */
const fixed = (sprite: string, x: number, y: number, swap?: Record<string, string>): Actor => at(sprite, x, y, { swap, fixed: true })
/** The enchantment glint shimmering over the champion's armor. */
const glint = (k: number): Actor[] =>
  [
    [
      [2, 1],
      [10, 9],
    ],
    [
      [12, 2],
      [4, 11],
    ],
    [
      [7, 6],
      [14, 12],
    ],
  ][k % 3]!.map(([x, y], i) => ({ sprite: i ? 'sparkB' : 'sparkA', x: x!, y: y!, tiers: GRAND }))

/** The pickaxe raised over the block, and down on it. */
const windup = () => weapon(14, 1)
const strike = () => weapon(14, 9, { flipY: true })

const P = 18 // a prop on the floor, right of the miner
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

// Shell: a lever by a redstone lamp, dust to a second lamp.
const redstone = (lever: 0 | 1, lit: 0 | 1 | 2): Actor[] => [
  at(lever ? 'lever1' : 'lever0', 16, 11),
  at(lit ? 'lampOn' : 'lampOff', 21, BY),
  at(lit === 2 ? 'dustLit' : 'dustOff', 29, 14),
  at(lit === 2 ? 'lampOn' : 'lampOff', 33, BY),
]

// Reading: the enchanting table, its book, runes drifting in from the shelf.
const enchant = (open: boolean, k: number): Actor[] => [
  at('bookshelf', 29, BY),
  at('enchTable', P, 10),
  at(open ? 'bookOpen' : 'bookShut', P + 1, 6),
  at(k % 2 ? 'runeA' : 'runeB', 27 - (k % 3) * 3, 3 + (k % 2) * 2),
  at(k % 2 ? 'runeB' : 'runeA', 24 - (k % 3) * 2, 1 + (k % 3)),
]

// Bed: the frame and pillow under the sleeper, the quilt over the body.
const inBed = (): Actor[] => [at('bedBase', -1, 12), hero('lie', 0, -4), at('quilt', 7, -1)]
const night = () => fixed('nightSky', -12, -18)

const Z = '#ffffff'
const zzz = (k: number) => [{ text: k % 2 ? 'Z' : 'z', x: 2 + k, y: -6 - 2 * k, color: Z }]

const HURT = { A: 'hurt', a: 'hurtD', C: 'hurt', c: 'hurtD', L: 'hurt', l: 'hurtD', B: 'hurtD', b: 'hurtD', S: 'hurtL', s: 'hurt', E: 'hurt', T: 'hurtD', H: 'hurtD' }
const BARE = { A: 'hair', a: 'hairS', C: 'shirt', c: 'shirtS', L: 'pants', l: 'pantsS', B: 'shoe', b: 'shoeS', E: 'shirt', T: 'hairS' }

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
    { actors: [table(), hero('stand'), ...craft(0)], texts: [{ text: '.', x: 9, y: -6, color: Z }], hold: 2 },
    { actors: [table(), hero('attack'), ...craft(1)], texts: [{ text: '..', x: 9, y: -6, color: Z }], hold: 1 },
    { actors: [table(), hero('attack'), ...craft(2)], texts: [{ text: '...', x: 9, y: -6, color: Z }], hold: 1 },
    { actors: [table(), hero('attack'), ...craft(3)], hold: 1 },
    { actors: [table(), hero('attack'), ...craft(4)], hold: 1 },
    { actors: [table(), hero('stand'), ...craft(5, true), ...glint(1)], texts: [{ text: '?', x: 10, y: -6, color: Z }], hold: 2 },
    { actors: [table(), hero('attack'), ...craft(5)], hold: 1 },
    { actors: [table(), hero('stand'), ...craft(5), ...glint(2)], texts: [{ text: '!', x: 10, y: -6, color: Z }], hold: 2 },
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
    { actors: [at('wolf', -13, 8, { flip: true }), at('wolf', 17, 8), hero('itemGet'), ...glint(0)], hold: 2 },
    { actors: [at('wolfRun', -17, 8, { flip: true }), at('wolfRun', 22, 8), hero('stand')], hold: 1 },
    { actors: [at('wolf', -22, 8, { flip: true }), at('wolf', 30, 8), hero('stand')], hold: 1 },
    { actors: [at('wolfRun', -28, 8, { flip: true }), at('wolfRun', 40, 8), hero('stand')], hold: 1 },
    { actors: [hero('stand'), ...glint(1)], texts: [{ text: '...', x: 9, y: -6, color: Z }], hold: 3 },
    { actors: [at('wolfRun', -22, 8), at('bone', -9, 11), at('wolfRun', 30, 8, { flip: true }), at('bone', 28, 11), hero('stand')], hold: 1 },
    { actors: [at('wolf', -14, 8), at('bone', -1, 11), at('wolf', 19, 8, { flip: true }), at('bone', 17, 11), hero('stand')], hold: 1 },
    { actors: [at('wolf', -13, 8), at('wolf', 17, 8, { flip: true }), at('love', -7, 4), at('love', 23, 3), hero('itemGet'), ...glint(2)], hold: 3 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop(
    { actors: [night(), ...inBed()], texts: zzz(0), hold: 3 },
    { actors: [night(), ...inBed()], texts: zzz(1), hold: 3 },
    { actors: [night(), ...inBed()], texts: zzz(2), hold: 3 },
    { actors: [night(), ...inBed()], hold: 3 },
  ),
}

const SIGH = 'Full enchants to dig dirt? Overqualified.'
const sweat = at('sweat', 14, -1)
const sigh = [{ text: '~sigh~', x: 17, y: -6, color: Z }]
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [at('dirtBlock', P, BY), hero('stand'), sweat], hold: 2, caption: SIGH },
    { actors: [at('dirtBlock', P, BY), hero('attack'), windup(), sweat], hold: 1, caption: SIGH },
    { actors: [at('dirtBlock', P, BY), at('crack3', P, BY), hero('attack'), strike(), sweat], hold: 1, caption: SIGH },
    { actors: [hero('stand'), sweat], texts: sigh, hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [...redstone(0, 0), hero('stand'), sweat], hold: 2, caption: SIGH },
    { actors: [...redstone(1, 1), hero('attack'), sweat], hold: 2, caption: SIGH },
    { actors: [...redstone(1, 2), hero('stand'), sweat], texts: sigh, hold: 3, caption: SIGH },
  ),
}

const TOAST: SceneText[] = [
  { text: 'Advancement Made!', x: 8, y: -16, color: '#ffff55' },
  { text: 'Diamonds!', x: 8, y: -14, color: '#ffffff' },
]

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [at('diamondOre', P, BY), hero('attack'), windup()], hold: 1 },
    { actors: [at('diamondOre', P, BY), at('crack2', P, BY), hero('attack'), strike()], hold: 1 },
    { actors: [at('debris', P, 9), at('diamond', P + 1, 11), hero('stand')], hold: 1 },
    { actors: [at('diamond', P, 9), at('orbA', 22, 4), at('orbB', 17, 1), hero('stand')], hold: 1 },
    { actors: [at('orbB', 15, 5), at('orbA', 12, 2), hero('stand')], texts: [{ text: '+XP', x: 17, y: -6, color: '#a8ff3a' }], hold: 1 },
  ),
  toolError: once(
    { actors: [at('creeper', 32, 1), hero('stand')], hold: 1 },
    { actors: [at('creeper', 25, 1), hero('stand')], hold: 1 },
    { actors: [at('creeper', 20, 1), hero('stand')], texts: [{ text: 'sss', x: 21, y: -6, color: '#8fd87a' }], hold: 1 },
    {
      actors: [at('creeper', 20, 1, { swap: { creep1: 'W', creep2: 'smoke2', creep3: 'W' } }), hero('stand')],
      texts: [{ text: 'SSSS', x: 20, y: -6, color: '#ffffff' }],
      hold: 1,
    },
    { actors: [at('boom1', 17, 2), hero('stand', -2, 0, HURT)], hold: 1 },
    { actors: [at('boom2', 15, 0), hero('stand', -4, 0, { ...HURT, A: 'hurtL', C: 'hurtL' })], hold: 1 },
    { actors: [at('boom1', 18, 4, { swap: { boomO: 'smoke3', smoke1: 'smoke2' } }), hero('stand', -4, 0, HURT)], hold: 1 },
    { actors: [hero('stand', -2, 0)], hold: 1 },
  ),
  turnComplete: once(
    { actors: [fixed('toast', -1, -24), hero('itemGet'), at('diamond', 5, -6)], hold: 1 },
    { actors: [fixed('toast', -1, -18), hero('itemGet'), at('diamond', 5, -6), ...glint(0)], texts: TOAST, hold: 4 },
    { actors: [fixed('toast', -1, -18), hero('stand'), ...glint(1)], texts: TOAST, hold: 6 },
  ),
  milestone: once({ actors: [table(), torch(0), hero('stand')], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [fixed('sun', 26, -6, { sunY: 'sunset', sunO: 'sunsetD' }), table(), hero('stand')], hold: 2 },
    { actors: [night(), table(), hero('sleep')], hold: 2 },
    { actors: [night(), ...inBed()], message: 'cacheCold', hold: 12 },
  ),
  limitWarning: once(
    { actors: [fixed('borderWall', 36, -18), hero('stand')], message: 'limitWarning', hold: 3 },
    { actors: [fixed('borderWall', 30, -18), hero('walk', -1, 0)], message: 'limitWarning', hold: 3 },
    { actors: [fixed('borderWall', 24, -18), hero('stand', -2, 0, { C: 'hurt', c: 'hurtD' })], message: 'limitWarning', hold: 9 },
  ),
  compaction: once(
    { actors: [night(), ...inBed()], texts: zzz(1), hold: 3, caption: 'compaction' },
    { actors: [fixed('sun', 26, -2, { sunY: 'sunset', sunO: 'sunsetD' }), ...inBed()], hold: 2, caption: 'compaction' },
    {
      actors: [fixed('sun', 26, -12), hero('itemGet'), ...glint(0)],
      texts: [{ text: 'Saving world...', x: 0, y: -14, color: Z }],
      hold: 3,
      caption: 'compaction',
    },
  ),
  modelChange: once(
    { actors: [hero('stand', 0, 0, BARE), { sprite: 'pieceHelm', x: 18, y: 1, tier: true }, { sprite: 'pieceChest', x: 18, y: 7, tier: true }], hold: 2 },
    { actors: [hero('stand', 0, 0, BARE), { sprite: 'pieceHelm', x: 10, y: 0, tier: true }, { sprite: 'pieceChest', x: 9, y: 7, tier: true }], hold: 1 },
    { actors: [at('boom2', -1, 1, { swap: { smoke2: 'glint', smoke3: 'glint2' } })], hold: 1 },
    { actors: [hero('itemGet'), at('sparkA', -2, 4), at('sparkB', 16, 6), ...glint(0)], hold: 3, caption: 'modelChange' },
    { actors: [hero('stand'), ...glint(1)], hold: 3, caption: 'modelChange' },
  ),
  effortChange: once(
    { actors: [at('anvil', P, 10), hero('attack'), at('sparkA', P + 3, 6)], hold: 1 },
    { actors: [at('anvil', P, 10), hero('stand'), at('sparkB', P + 5, 5)], texts: [{ text: '*', x: 22, y: -2, color: '#ffff55' }], hold: 1 },
    { actors: [at('anvil', P, 10), hero('attack'), at('sparkA', P + 2, 5)], hold: 1 },
    {
      actors: [at('anvil', P, 10), hero('itemGet'), weapon(13, -8), ...glint(0)],
      texts: [{ text: '*', x: 23, y: -10, color: '#ffff55' }],
      hold: 5,
      caption: 'effortChange',
    },
  ),
}

const MINER_POSES = { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'sleep', lie: 'lie' }
// Under the quilt the champion is just a miner in a bed: the small lying pose keeps the bed in scale.
const CHAMPION_POSES = { stand: 'gStand', walk: 'gWalk', attack: 'gAttack', itemGet: 'gItemGet', sleep: 'gSleep', lie: 'lie' }
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
  T: trim,
  ...(cape ? { R: cape[0], r: cape[1] } : {}),
})

export const minecraft: Theme = {
  id: 'minecraft',
  name: 'Tokencraft',
  description: 'Voxel survival homage: armor per model, a pickaxe per effort, hearts, hunger and emeralds, mining deeper as context fills',
  version: '1.0.0',
  palette: {
    dark: { accent: '#55ff55', gold: '#ffff55', red: '#ff5555', label: '#55ffff', dim: '#aaaaaa', text: '#ffffff' },
    light: { accent: '#00aa00', gold: '#a87800', red: '#aa0000', label: '#00807f', dim: '#555555', text: '#1e1e1e' },
  },
  pixels,
  labels: {
    context: 'HEALTH',
    spend: 'EMERALDS',
    cache: 'HUNGER',
    limits: 'WORLD BORDER',
    modelItem: 'ARMOR',
    effortItem: 'PICKAXE',
    heroes: 'Armor',
    weapons: 'Pickaxes',
  },
  headings: {
    Context: 'Depth',
    Cost: 'Emeralds',
    'Next message': 'Hunger',
    Tokens: 'Blocks mined',
    Limits: 'World border',
    'Tool calls': 'Statistics',
    Files: 'Chunks loaded',
  },
  sprites,
  states,
  cold,
  overkill,
  events,
  scene: {
    height: 40,
    anchor: { x: 12, y: 18 },
    background: {
      ground: '#7aa6ff',
      gradient: ['#5a8cff', '#78a4ff', '#98bcff', '#b4d0ff'],
      deep: ['#0e0c12', '#18121c', '#24161a', '#4a1c0c', '#8a3410'],
      shade: { color: '#000000', amount: 0.3 },
      decor: [
        { sprite: 'sun', x: -5, y: 2, maxPercent: 25 },
        { sprite: 'cloud', x: 22, y: 5, maxPercent: 25 },
        { sprite: 'cloudSmall', x: -26, y: 11, maxPercent: 25, minColumns: 56 },
        { sprite: 'oak', x: -2, y: 12, maxPercent: 25, minColumns: 56 },
        { sprite: 'floorGrass', x: 0, y: 34, maxPercent: 25 },
        { sprite: 'ceilStone', x: 0, y: 0, minPercent: 25, maxPercent: 50 },
        { sprite: 'floorStone', x: 0, y: 34, minPercent: 25, maxPercent: 50 },
        { sprite: 'wallTorch', x: -8, y: 18, minPercent: 25, maxPercent: 75, minColumns: 56 },
        { sprite: 'ceilDeep', x: 0, y: 0, minPercent: 50 },
        { sprite: 'drip', x: 44, y: 5, minPercent: 50 },
        { sprite: 'drip', x: 24, y: 5, minPercent: 60 },
        { sprite: 'floorDeep', x: 0, y: 34, minPercent: 50, maxPercent: 75 },
        { sprite: 'lavaFall', x: -2, y: 5, minPercent: 75, minColumns: 56 },
        { sprite: 'floorLava', x: 0, y: 34, minPercent: 75 },
      ],
      particles: [
        { colors: ['#b0b0b0', '#8a8a8a'], count: 8, drift: 'down', speed: 0.3, minPercent: 25, maxPercent: 75 },
        { colors: ['#ffb02a', '#ff6a1a', '#fff07a'], count: 14, drift: 'up', speed: 0.6, minPercent: 75 },
      ],
    },
    hero: MINER_POSES,
    heroTiers: {
      tier1: armor('leaL', 'leaS', 'leaD', 'leaD', 'leaD'),
      tier2: armor('ironL', 'ironS', 'ironD', 'W', 'ironD'),
      tier3: armor('diaL', 'diaS', 'diaD', 'glint', 'diaD', ['capeR', 'capeRS']),
      tier4: armor('nethL', 'nethS', 'nethD', 'glint', 'gold', ['capeP', 'capePS']),
      unknown: { A: 'hair', a: 'hairS', C: 'shirt', c: 'shirtS', L: 'pants', l: 'pantsS', B: 'shoe', b: 'shoeS', E: 'shirt', T: 'hairS' },
    },
    heroForms: {
      tier3: { poses: CHAMPION_POSES, dx: -2, dy: -4, lift: LIFT, hand: { x: 2, y: -2 } },
      tier4: { poses: CHAMPION_POSES, dx: -2, dy: -4, lift: LIFT, hand: { x: 2, y: -2 } },
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
    bar: {
      widgets: [
        { kind: 'counter', value: 'spend', icon: 'emeraldIcon' },
        { kind: 'meter', value: 'contextLeft', count: 10, perRow: 5, sprites: ['heart0', 'heart1', 'heart2'], label: 'HEALTH', pulseBelow: 0.2 },
        { kind: 'meter', value: 'cache', count: 10, perRow: 5, sprites: ['food0', 'food1', 'food2'], label: 'HUNGER', pulseBelow: 0.15, drop: 1 },
        { kind: 'box', shows: 'model', sprite: 'chestIcon', label: 'ARMOR', x: 1, y: 4, drop: 2 },
        { kind: 'box', shows: 'effort', sprite: 'pickIcon', label: 'PICK', x: 1, y: 5, drop: 3 },
      ],
      colors: { bg: 'hudBg', box: 'slot', text: 'hudText', label: 'hudLabel', map: 'mapGray', mapDot: 'emerald' },
    },
    stamina: { x: 1, y: 1, radius: 4, full: 'clockDay', empty: 'clockNight', cold: 'clockCold', tagIcon: 'emeraldIcon', tagColor: '#ffffff', tagColdColor: '#aaaaaa' },
    lineup: { ground: 'lineupBg', ink: '#404040', dim: '#6a6a6a', mark: '#aa0000' },
    message: { bg: 'msgBg', ink: '#ffffff' },
  },
  text: {
    idle: 'The miner waits by the crafting table, torch lit.',
    thinking: 'The miner stares at the crafting grid...',
    reading: 'The miner pores over the enchanting book.',
    editing: 'The miner breaks stone and places fresh planks.',
    shell: 'The miner pulls a lever; redstone lights the lamps.',
    agents: 'Tamed wolves run off on errands.',
    toolSuccess: 'Diamonds! A few XP orbs, too.',
    toolError: 'Sssss... BOOM. A creeper got the miner.',
    turnComplete: 'Advancement made!',
    milestone: 'The miner digs to a new depth.',
    cacheCold: 'Night falls. The miner sleeps in a bed.',
    limitWarning: 'The world border closes in.',
    compaction: 'The miner sleeps through the night; the world is saved.',
    modelChange: 'The miner equips new armor.',
    effortChange: 'The anvil rings: a new pickaxe.',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: 'Y=64 AND DIGGING. {pct}% OF THE WAY TO BEDROCK. PLENTY OF TORCHES.' },
    { level: 'warn', message: '{pct}% OF THE WAY TO BEDROCK. THE STONE GETS HARD. MIND YOUR TORCHES.' },
    { level: 'orange', message: '{pct}% OF THE WAY TO BEDROCK. DEEPSLATE BELOW. FIND A SPOT TO SET YOUR BED.' },
    { level: 'alert', message: "{pct}% OF THE WAY TO BEDROCK. CAVES, CREEPERS, NO SPAWN POINT. IT'S DANGEROUS DOWN HERE." },
    { level: 'critical', message: 'LAVA AHEAD, BEDROCK BELOW! {pct}% DUG. SAVE YOUR PROGRESS AND /clear BEFORE YOU FALL IN.' },
  ],
  messages: {
    cacheCold: 'NIGHT FALLS. YOUR CACHE WENT COLD.',
    limitWarning: 'THE WORLD BORDER CLOSES IN! {name} AT {pct}%.',
    compaction: 'You slept through the night. World saved (compacted).',
    modelChange: 'Armor equipped: {name}!',
    effortChange: 'Anvil used: {weapon}!',
  },
}
