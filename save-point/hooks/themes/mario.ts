// "Super Context Bros.": a side-scrolling platformer homage. Every sprite is
// drawn fresh for this theme in that 8-bit style.
//
// The model is the plumber's power-up (none, mushroom, feather, star: Small,
// Super, Cape, Star), the effort is the P-meter and the item he throws, the
// context is how far along the course you are (WORLD 1-1 to 8-4), coins are
// cents, TIME is the cache (it snows when it runs out) and the limits are lava.

import { at, hero, loop, once, weapon } from './kit'
import type { Actor, Frame, HeroTier, SceneText, Theme } from './types'

const pixels = {
  // The plumber
  R: '#d82800', // cap, shirt
  r: '#a01000',
  B: '#2c50e8', // overalls
  S: '#fcb890', // skin
  H: '#5c2800', // hair, mustache
  K: '#000000', // eyes, outlines
  W: '#fcfcfc',
  Y: '#fcd800', // buttons, coins, stars
  y: '#c88000',
  O: '#8c3c0c', // boots
  C: '#fcc800', // cape
  c: '#c87800', // cape fold
  // Tier colors
  luigiG: '#28a828',
  luigiS: '#0c6c0c',
  luigiB: '#203098',
  starR: '#fcd800',
  starr: '#c88000',
  starB: '#f85800',
  starH: '#a83c00',
  starC: '#fcfcfc',
  starc: '#88d0f8',
  // The hurt flash: no tier wears these
  hurt: '#fcfcfc',
  hurtB: '#a8dcfc',
  // Scenery
  g: '#3cb830', // hill
  G: '#0c6c0c',
  l: '#a8dcfc', // cloud shade
  n: '#c84c0c', // brick
  p: '#fcb8a0', // brick highlight
  N: '#3c1404', // mortar
  q: '#fc9838', // question block
  Q: '#8c3800',
  qLight: '#fcd8a0',
  z: '#fcfcfc', // the question mark
  d: '#a8400c', // walker
  f: '#fcc898', // walker face
  v: '#3cb818', // pipe
  V: '#0c6c08',
  x: '#b8f858',
  i: '#a8e030', // flagpole
  m: '#c0c0c0', // hammer head
  M: '#606060',
  a: '#d8f8fc', // ice
  A: '#3cbcfc',
  F: '#f83800', // fire, lava
  e: '#fca044',
  sky: '#5c94fc',
  // Status bar
  black: '#000000',
  arrowOff: '#5c5c5c',
  boxFrame: '#fcfcfc',
}

type Rows = string[]

/** Pads every row to `w` columns with transparent pixels. */
const fit = (rows: Rows, w: number): Rows => rows.map(r => r.padEnd(w, '.'))
/** `top` drawn over `base` at (dx, dy); `.` in `top` is see-through. */
function over(base: Rows, top: Rows, dx = 0, dy = 0): Rows {
  const grid = base.map(r => [...r])
  top.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      const line = grid[j + dy]
      if (ch === '.' || !line || i + dx < 0 || i + dx >= line.length) return
      line[i + dx] = ch
    }),
  )
  return grid.map(r => r.join(''))
}
const padLeft = (rows: Rows, n: number): Rows => rows.map(r => '.'.repeat(n) + r)
/** Twinkles around the star-powered plumber: white (or the color named) on the empty pixels listed. */
const twinkle = (rows: Rows, pts: [number, number, string?][]): Rows =>
  rows.map((r, y) => [...r].map((ch, x) => (ch === '.' ? (pts.find(p => p[0] === x && p[1] === y)?.[2] ?? (pts.some(p => p[0] === x && p[1] === y) ? 'W' : ch)) : ch)).join(''))

// ---------------------------------------------------------------------------
// The plumber: Small (12x12), Super (16x16, the standard hero), Cape (22x18)
// ---------------------------------------------------------------------------

const SMALL_HEAD = ['...RRRRR....', '..RRRRRRRRR.', '..HHHSSKS...', '.HSHSSSKSSS.', '.HHSSSSHHHH.', '...SSSSSS...']
const SMALL_BODY = ['..RRBRRBR...', '.RRRBBBBRRR.', '.SSBYBBYBSS.', '...BBBBBB...', '..OOO..OOO..', '.OOOO..OOOO.']
const smallStand = [...SMALL_HEAD, ...SMALL_BODY]
const smallWalk = [...SMALL_HEAD, ...SMALL_BODY.slice(0, 3), '..BBBBBBB...', '.OOOB..BOOO.', 'OOO......OOO']
const smallAttack = [...SMALL_HEAD, '..RRBRRBRSS.', '.RRRBBBBRSS.', '.SSBYBBYB...', ...SMALL_BODY.slice(3)]
const smallItemGet = [
  '...RRRRR..SS',
  '..RRRRRRRRSS',
  '..HHHSSKS.RR',
  '.HSHSSSKSSRR',
  '.HHSSSSHHHHR',
  '...SSSSSSRR.',
  '..RRBRRBRR..',
  '.SRRBBBBR...',
  '.SSBYBBYB...',
  ...SMALL_BODY.slice(3),
]
const smallLie = ['....SS.........', '.RR.SSSHH......', 'RRRRHSSSHH.WW..', 'RRRRSSSSSRRWWBO', 'RRRHSSSSRRBYBBO', 'RRRHHSSRRRBBBOO', '.RRHHHRRRBBBBB.']

const SUPER_HEAD = ['.....RRRRR......', '....RRRRRRRRR...', '....HHHSSKS.....', '...HSHSSSKSSS...', '...HHSSSSHHHH...', '.....SSSSSSS....']
const SUPER_BODY = [
  '....RRBRRRBR....',
  '...RRRBRRRBRRR..',
  '..RRRRBBBBBRRRR.',
  '..SSRBYBBBYBRSS.',
  '..SSSBBBBBBBSSS.',
  '..SSBBBBBBBBBSS.',
  '....BBBBBBBBB...',
  '....BBBB.BBBB...',
  '...OOOO...OOOO..',
  '..OOOOO...OOOOO.',
]
const THROW_ARM = ['...RRRBRRRBRRSS.', '..RRRRBBBBBRRSS.', '..SSRBYBBBYB....', '..SSSBBBBBBB....', '..SSBBBBBBBBB...']
// Head and torso with the right fist up: twelve rows, as tall as the standing ones.
const RAISED_ARM = [
  '.....RRRRR...SS.',
  '....RRRRRRRRRSS.',
  '....HHHSSKS..RR.',
  '...HSHSSSKSSSRR.',
  '...HHSSSSHHHHRR.',
  '.....SSSSSSSRR..',
  '....RRBRRRBRR...',
  '..SRRRBRRRBR....',
  '..SSRRBBBBB.....',
  '..SSRBYBBBYB....',
  '...SBBBBBBBB....',
  '....BBBBBBBB....',
]
const superStand = [...SUPER_HEAD, ...SUPER_BODY]
const superWalk = [...SUPER_HEAD, ...SUPER_BODY.slice(0, 6), '....BBBBBBBBB...', '...BBBB..BBBB...', '.OOOOO....OOOO..', 'OOOOO......OOOO.']
const superAttack = [...SUPER_HEAD, SUPER_BODY[0]!, ...THROW_ARM, ...SUPER_BODY.slice(6)]
const superItemGet = [...RAISED_ARM, ...SUPER_BODY.slice(6)]
const superLie = [
  '.....SSS............',
  '..RR.SSSSHHH........',
  '.RRRRHSSSSHH.WWW....',
  'RRRRRSSSSSSRRWWWBB.O',
  'RRRRHSSSSSRRBYBBBBOO',
  'RRRRHHSSSSRRRBBBBBOO',
  '.RRRHHHSSRRRRBBBBBOO',
  '..RRRHHHRRRRBBBBBBB.',
]

// The Cape form: taller, a wide heroic stance, a golden cape streaming behind.
const CAPE_LEGS = ['...BBBBBBBBBBB..', '...BBBBB.BBBBB..', '...BBBB...BBBB..', '...BBB.....BBB..', '..OOOO.....OOOO.', '.OOOOO.....OOOOO']
const CAPE_STRIDE = ['...BBBBBBBBBBB..', '...BBBBB.BBBBB..', '..BBBB....BBBB..', '.BBBB......BBB..', 'OOOOO......OOOO.', 'OOOO........OOOO']
// Feet together: the legs that fit down a pipe.
const CAPE_TUCKED_LEGS = ['...BBBBBBBBBBB..', '...BBBBB.BBBBB..', '...BBBB...BBBB..', '...BBBB...BBBB..', '..OOOOO...OOOO..', '.OOOOOO...OOOOO.']
const capeBody = (upper: Rows, legs = CAPE_LEGS) => padLeft([...upper, ...legs], 6)
const CAPE_FLOW = fit(
  [
    '',
    '',
    '',
    '',
    '',
    '.........CCCr',
    '.......CCCCCr',
    '.....CCCCCCcc',
    '....CCCCCCccC',
    '...CCCCCCcccC',
    '..CCCCCCcccCC',
    '.CCCCCCcccCCC',
    '.CCCCCcccCCCC',
    'CCCCCcccCCCC',
    'CCCCcccCCCC',
    'CCC.ccCCCC',
    'CC...CCCC',
    'C.....CC',
  ],
  22,
)
const CAPE_BILLOW = fit(
  [
    '',
    '',
    '',
    '',
    '',
    '..........CC',
    '.....CCCCCCCr',
    '..CCCCCCcccCr',
    'CCCCCCcccCCCC',
    '.CCcccCCCCCC',
    '..CCCCCCcccC',
    '...CCCcccCCC',
    '....CCCCCCC',
    '.....CCCCC',
    '',
    '',
    '',
    '',
  ],
  22,
)
// The cape hanging straight down his back, no wider than a pipe.
const CAPE_TUCKED = fit(['', '', '', '', '', '.......CCr', '.......CCc', '.......CCc', '.......CC', '.......CC', '.......CC', '.......CC', '.......CCc', '.......CC', '.......C', '', '', ''], 22)
const caped = (body: Rows, cape = CAPE_FLOW) => over(cape, body)
const capeStand = caped(capeBody([...SUPER_HEAD, ...SUPER_BODY.slice(0, 6)]))
const capeWalk = caped(capeBody([...SUPER_HEAD, ...SUPER_BODY.slice(0, 6)], CAPE_STRIDE), CAPE_BILLOW)
const capeAttack = caped(capeBody([...SUPER_HEAD, SUPER_BODY[0]!, ...THROW_ARM]), CAPE_BILLOW)
const capeItemGet = caped(capeBody(RAISED_ARM))
const capeDive = caped(capeBody([...SUPER_HEAD, ...SUPER_BODY.slice(0, 6)], CAPE_TUCKED_LEGS), CAPE_TUCKED)
const capeRise = caped(capeBody(RAISED_ARM, CAPE_TUCKED_LEGS), CAPE_TUCKED)
const capeLie = [
  '.....SSS..............',
  '..RR.SSSSHHH..........',
  '.RRRRHSSSSHHCCCCCC....',
  'RRRRRSSSSSSCCCCCCCCCO.',
  'RRRRHSSSSSCCCCcCCCCCOO',
  'RRRRHHSSSSCCCCcCCCCCOO',
  '.RRRHHHSSCCCCCcCCCCCOO',
  '..RRRHHHCCcccccccccccc',
]

// Star power: the Cape form ringed with twinkles that move from pose to pose.
const STAR_A: [number, number, string?][] = [[1, 1], [19, 0, 'Y'], [21, 6], [3, 3, 'Y'], [21, 14]]
const STAR_B: [number, number, string?][] = [[2, 0, 'Y'], [20, 2], [0, 7], [21, 10, 'Y'], [4, 2]]

// ---------------------------------------------------------------------------
// The POWER-UP box: one 5x6 icon per model. Nothing dark: the bar is black.
// ---------------------------------------------------------------------------

const ITEM_MUSHROOM = ['.RWR.', 'RWWRR', 'RRRWR', 'RRRRR', '.SSS.', '.SSS.'] // red for Super, green for the brother
const ITEM_NONE = ITEM_MUSHROOM.map(r => r.replace(/[RWS]/g, 'X')) // Small: the mushroom he has not got, unlit like the P-meter's arrows
const ITEM_FEATHER = ['....W', '...WC', '..WCC', '.WCCc', 'WCCc.', 'Cc...']
const ITEM_STAR = ['..Y..', '..Y..', 'YYYYY', '.YYY.', '.YYY.', 'YY.YY']

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

const QMARK_BLOCK = ['.qqqqqq.', 'qKqzzqKQ', 'qqzqqzqQ', 'qqqqqzqQ', 'qqqqzqqQ', 'qqqqqqqQ', 'qKqqzqKQ', '.QQQQQQ.']
const BRICK = ['pppNpppp', 'nnnNnnnn', 'nnnNnnnn', 'NNNNNNNN', 'ppppppNp', 'nnnnnnNn', 'nnnnnnNn', 'NNNNNNNN']
// Twelve rows: it stands on the floor line, its lip twelve pixels up.
const PIPE = ['KKKKKKKKKKKKKKKK', 'KxxvvvvvvvvvVVVK', 'KxxvvvvvvvvvVVVK', 'KKKKKKKKKKKKKKKK', ...Array.from({ length: 8 }, () => '.KxvvvvvvvvvVVK.')]

const hill = (r: number): Rows => {
  const rows: Rows = []
  for (let y = 0; y < r; y++) {
    let row = ''
    for (let x = 0; x < 2 * r; x++) {
      const d = Math.hypot(x - r + 0.5, (r - y) * 1.15)
      const spot = (x === r - 3 && y === 3) || (x === r + 2 && y === 4) || (x === r - 1 && y === 6) || (x === r - 2 && y === 4)
      row += d > r ? '.' : d > r - 1.2 ? 'G' : spot ? 'G' : 'g'
    }
    rows.push(row)
  }
  return rows
}
const BUSH = ['.....ggg......', '...ggggggg....', '..gggggggggg..', '.ggggggggggggg', 'gggggggggggggg', 'ggGggggGggggGg', '.GGGGGGGGGGGG.']
// Clouds are six rows at most and sit in rows 2..7, so a message box (which starts at row 2) covers one whole, never a sliver of it.
const CLOUD = ['.....WWW......', '...WWWWWWW....', '.WWWWWWWWWWWW.', 'WWWWWWWWWWWWWW', 'WWlWWWWlWWWWlW', '.llllllllllll.']

// Snow for the cold cache: flakes over the whole scene, the same field a little
// further down in each phase (it repeats every SNOW_FALL pixels, so the phases loop).
const SNOW_PHASES = 10
const SNOW_FALL = 20
const flake = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n) < 0.022
}
const snowField = (phase: number): Rows =>
  Array.from({ length: 56 }, (_, y) => Array.from({ length: 96 }, (_, x) => (flake(x, (((y - phase * (SNOW_FALL / SNOW_PHASES)) % SNOW_FALL) + SNOW_FALL) % SNOW_FALL) ? 'W' : '.')).join(''))

const sprites: Theme['sprites'] = {
  // Small
  smallStand: { rows: smallStand },
  smallWalk: { rows: smallWalk },
  smallAttack: { rows: smallAttack },
  smallItemGet: { rows: smallItemGet },
  smallLie: { rows: smallLie },
  // Super (the standard hero)
  stand: { rows: superStand },
  walk: { rows: superWalk },
  attack: { rows: superAttack },
  itemGet: { rows: superItemGet },
  lie: { rows: superLie },
  // Cape
  capeStand: { rows: capeStand },
  capeWalk: { rows: capeWalk },
  capeAttack: { rows: capeAttack },
  capeItemGet: { rows: capeItemGet },
  capeDive: { rows: capeDive },
  capeRise: { rows: capeRise },
  capeLie: { rows: capeLie },
  // Star
  starStand: { rows: twinkle(capeStand, STAR_A) },
  starWalk: { rows: twinkle(capeWalk, STAR_B) },
  starAttack: { rows: twinkle(capeAttack, STAR_A) },
  starItemGet: { rows: twinkle(capeItemGet, STAR_B) },
  // Thrown items, each 7x7 and resting on its bottom row, so one spot in the hand serves all five
  shell: { rows: ['.......', '..GGG..', '.GgWgG.', 'GgWgWgG', 'GgggggG', 'WWWWWWW', '.WWWWW.'] },
  fireball: { rows: ['.......', '.......', '..FeF..', '.FeYeF.', '.eYWYe.', '.FeYeF.', '..FeF..'] },
  iceball: { rows: ['.......', '.......', '..BAB..', '.BaWaB.', '.AWWWA.', '.BaWaB.', '..BAB..'] },
  hammer: { rows: ['.MmmmmM', '.MmmmmM', '.MMMMMM', '...OO..', '...OO..', '...OO..', '...OO..'] },
  bomb: { rows: ['....W..', '..KKK..', '.KKKKK.', 'KKWKWKK', 'KKWKWKK', '.KKKKK.', '.YY.YY.'] },
  // The lit fuse, drawn on alternate ticks
  bombSpark: { rows: ['....e.F..', '......e..', '.......F.'] },
  // Power-ups as they arrive in the scene
  mushroom: { rows: ['..RRWW..', '.RRRWWR.', 'RWWRRRRR', 'WWWRRWWR', 'RRRRRWWR', '.SKSSKS.', '.SKSSKS.', '..SSSS..'] },
  feather: { rows: ['.....WW.', '....WWC.', '...WWCC.', '..WWCCc.', '.WWCCc..', '.WCCc...', 'WCc.....', 'W.......'] },
  superStar: { rows: ['...Y...', '..YYY..', 'YYYYYYY', '.YKYKY.', '..YYY..', '.YY.YY.', '.Y...Y.'] },
  // Blocks and scenery
  qblock: { rows: QMARK_BLOCK },
  brick: { rows: BRICK },
  debris: { rows: ['nn.', 'npn', '.nN'] },
  coin: { rows: ['.YYY.', 'YWYYy', 'YWYYy', 'YWYYy', 'YWYYy', 'YWYYy', '.yyy.'] },
  coinSpin: { rows: ['.Y.', 'YWy', 'YWy', 'YWy', 'YWy', 'YWy', '.y.'] },
  sparkle: { rows: ['..W..', '.....', 'W.Y.W', '.....', '..W..'] },
  pipe: { rows: PIPE },
  pole: { rows: ['.v.', 'vxv', '.v.', ...Array.from({ length: 31 }, () => '.i.')] },
  flag: { rows: ['WW....', 'WWWW..', 'WvWWWW', 'WWWW..', 'WW....'] },
  ground: { rows: ['pppppppN', 'nnnnnnnN', 'nnnnnnnN', 'NNNNNNNN'] },
  // The big hill runs off the left edge, so the plumber never stands in front of it.
  hillEdge: { rows: hill(10).map(r => r.slice(10)) },
  hillMid: { rows: hill(8) },
  cloud: { rows: CLOUD },
  cloudSmall: { rows: ['...WWW...', '.WWWWWWW.', 'WWWWWWWWW', 'WlWWWlWWW', '.lllllll.'] },
  bush: { rows: BUSH },
  blockRow: { rows: BRICK.map((r, k) => r + QMARK_BLOCK[k] + r) },
  // Nine wide: at the right edge of a 56-column pane it stays clear of the action.
  castle: {
    rows: ['..n.n.n..', '..nnnnn..', '..nNnNn..', '..nnnnn..', 'n.nnnnn.n', 'nnnnnnnnn', 'nnNnnnNnn', 'nnnnnnnnn', 'nnnKKKnnn', 'nNnKKKnNn', 'nnnKKKnnn', 'NnnKKKnnN'],
  },
  // The lava of the limit warning: a pit in the floor and the fireball that leaps from it
  lava1: { rows: ['NeFFeFFFFeFFFeFN', 'NFFFFFFeFFFFFFFN', 'NFrFFFFFFFrFFFFN', 'NNNNNNNNNNNNNNNN'] },
  lava2: { rows: ['NFFeFFFeFFFeFFFN', 'NFFFFeFFFFFFFeFN', 'NFFFFFrFFFFFFrFN', 'NNNNNNNNNNNNNNNN'] },
  fireLeap: { rows: ['..FFF..', '.FeeeF.', 'FeKeKeF', 'FeeeeeF', 'FeeYeeF', '.FeYeF.', '..F.F..'] },
  // The cold cache: snow in the air and on the ground
  ...Object.fromEntries(Array.from({ length: SNOW_PHASES }, (_, k) => [`snow${k}`, { rows: snowField(k) }])),
  frost: { rows: ['W'.repeat(96), 'WWlWWWWWWlWW'.repeat(8)] },
  // Characters
  walker1: { rows: ['..dddd..', '.dddddd.', 'dKWddWKd', 'dKWddWKd', 'dddddddd', '.ffffff.', 'KKffffK.', 'KKK..KKK'] },
  walker2: { rows: ['..dddd..', '.dddddd.', 'dKWddWKd', 'dKWddWKd', 'dddddddd', '.ffffff.', '.KffffKK', 'KKK..KKK'] },
  walkerFlat: { rows: ['.dddddd.', 'dKWddWKd', 'KKKffKKK'] },
  toad1: { rows: ['..RWWR..', '.WWRRWW.', 'RWWRRWWR', 'WWWWWWWW', '.SKSSKS.', '..SSSS..', '.BBWWBB.', 'SBBBBBBS', '..WWWW..', '.OO..OO.'] },
  toad2: { rows: ['..RWWR..', '.WWRRWW.', 'RWWRRWWR', 'WWWWWWWW', '.SKSSKS.', '..SSSS..', '.BBWWBB.', '.SBBBBS.', '..WWWW..', 'OO....OO'] },
  // A retainer gone in a blink: the speed lines he leaves, then their last trace
  zip: { rows: ['WWWWWWWW', '........', '..WWWWWW', '........', 'WWWWWW..'] },
  zipThin: { rows: ['...WW...', '........', '.....WW.', '........', '.WW.....'] },
  // A drop of sweat: pale, so it shows on the sky
  sweat: { rows: ['.a.', '.a.', 'aWa', 'aaa', '.a.'] },
  // Status bar
  coinIcon: { rows: ['.Y.', 'YWy', 'YWy', 'YWy', '.y.'] },
  itemMushroom: { rows: ITEM_MUSHROOM },
  itemNone: { rows: ITEM_NONE, legend: { X: 'arrowOff' } },
  itemFeather: { rows: ITEM_FEATHER },
  itemStar: { rows: ITEM_STAR },
  arrowOff: { rows: ['X..', 'XX.', 'XXX', 'XX.', 'X..'], legend: { X: 'arrowOff' } },
  arrowOn: { rows: ['X..', 'XX.', 'XXX', 'XX.', 'X..'], legend: { X: 'W' } },
  pOff: { rows: ['XXXX.', 'X...X', 'XXXX.', 'X....', 'X....'], legend: { X: 'arrowOff' } },
  pOn: { rows: ['XXXX.', 'X...X', 'XXXX.', 'X....', 'X....'], legend: { X: 'W' } },
}

// ---------------------------------------------------------------------------
// Animations. Actors sit relative to the hero's top-left; the ground is y 16.
// The action stays inside columns 0..45: the plumber stands at 12..27 (the Cape
// form's cape from 6); blocks, bricks, the pole and the lava pit keep to 28..45.
// ---------------------------------------------------------------------------

const WHITE = '#fcfcfc'
const SMALL: HeroTier[] = ['tier1']
const SUPER: HeroTier[] = ['tier2', 'unknown']
const CAPE: HeroTier[] = ['tier3', 'tier4']
const txt = (text: string, x: number, y: number, color = WHITE): SceneText => ({ text, x, y, color })
/** Text beside the head: it follows the form's height. */
const said = (text: string, x: number, y: number): SceneText => ({ text, x, y, color: WHITE, lift: true })
const prop = (sprite: string, x: number, y: number, opts: Parameters<typeof at>[3] = {}) => at(sprite, x, y, { ...opts, fixed: true })
/** The hero in `pose` at a height of its own per form (Small, Super, Cape). */
const each = (pose: string, x: number, ys: [number, number, number]): Actor[] => [
  { ...hero(pose, x, ys[0]), tiers: SMALL },
  { ...hero(pose, x, ys[1]), tiers: SUPER },
  { ...hero(pose, x, ys[2]), tiers: CAPE },
]

// The ? block hangs at one height for every form; each jumps as far as its own
// head leaves, so the raised fist meets the block as it bumps.
const BLOCK = { x: 10, y: -12 }
const SHIMMER = { q: 'qLight' }
const block = (dy = 0, swap?: Record<string, string>) => prop('qblock', BLOCK.x, BLOCK.y + dy, { swap })
const bump = () => each('itemGet', 0, [-9, -5, -3])
const land = () => each('itemGet', 0, [-4, -2, -1])

const BRICKS = { x: 20, y: 0 }
const bricks = (top = true) => [at('brick', BRICKS.x, BRICKS.y + 8), ...(top ? [at('brick', BRICKS.x, BRICKS.y)] : [])]
const debris = (...spots: [number, number][]) => spots.map(([x, y]) => prop('debris', x, y))

// The pipe comes up under him. Down it he keeps his elbows (and cape) in: `dive`, `rise`.
const PIPE_AT = { x: 0, y: 4 }
const ON_PIPE = PIPE_AT.y - 16
const pipe = () => at('pipe', PIPE_AT.x, PIPE_AT.y)

const TOADS = { left: -12, right: 18, y: 6 }

// The snow falls behind him; the ground is white under it.
const snow = (phase: number): Actor[] => [
  at(`snow${phase % SNOW_PHASES}`, -12, -40, { fixed: true, offstage: true }),
  at('frost', -12, 16, { offstage: true }),
]
/** Frames with the snow falling through them, a phase a tick from `phase`. */
const snowed = (frames: Frame[], phase = 0): Frame[] => {
  let tick = phase
  return frames.flatMap(f => {
    const out = Array.from({ length: Math.max(1, f.hold ?? 1) }, (_, k) => ({ ...f, actors: [...snow(tick + k), ...f.actors], hold: 1 }))
    tick += out.length
    return out
  })
}

const dozing: Frame[] = [
  { actors: [hero('lie')], texts: [txt('z', 5, 4)], hold: 3 },
  { actors: [hero('lie')], texts: [txt('z', 6, 2)], hold: 3 },
  { actors: [hero('lie')], texts: [txt('Z', 7, 0)], hold: 3 },
  { actors: [hero('lie')], hold: 3 },
]
// He taps a foot, then looks over his shoulder (the Cape form turns on its own middle).
const lookBack = (): Actor[] => [
  { ...hero('stand'), flip: true, tiers: [...SMALL, ...SUPER] },
  { ...hero('stand', 6), flip: true, tiers: CAPE },
]
const pondering: Frame[] = [
  { actors: [hero('stand')], texts: [said('.', 17, -2)], hold: 2 },
  { actors: [hero('walk')], texts: [said('..', 17, -2)], hold: 1 },
  { actors: [hero('stand')], texts: [said('..', 17, -2)], hold: 1 },
  { actors: [hero('walk')], texts: [said('...', 17, -2)], hold: 1 },
  { actors: [hero('stand')], texts: [said('...', 17, -2)], hold: 1 },
  { actors: lookBack(), texts: [said('?', 17, -2)], hold: 2 },
]

const states: Theme['states'] = {
  idle: loop(...dozing),
  thinking: loop(...pondering),
  reading: loop(
    { actors: [hero('stand'), block()], hold: 2 },
    { actors: [hero('stand'), block(0, SHIMMER)], hold: 1 },
    { actors: [...bump(), prop('coin', 11, -18), block(-1)], hold: 1 },
    { actors: [...land(), prop('coinSpin', 12, -20), block(0, SHIMMER)], hold: 1 },
    { actors: [hero('stand'), block(), prop('sparkle', 11, -19)], texts: [txt('+1', 19, -10)], hold: 1 },
    { actors: [hero('stand'), block(0, SHIMMER)], hold: 1 },
  ),
  // The item leaves the form's own hand and meets the top brick at the same spot for all.
  editing: loop(
    { actors: [hero('stand'), ...bricks()], hold: 2 },
    { actors: [hero('attack'), ...bricks(), weapon(13, 4)], hold: 1 },
    { actors: [hero('attack'), ...bricks(), weapon(15, -1, { fixed: true })], hold: 1 },
    { actors: [hero('stand'), ...bricks(false), ...debris([18, -1], [26, -1], [18, 4], [26, 4])], hold: 1 },
    { actors: [hero('stand'), ...bricks(false), ...debris([16, -4], [28, -4], [17, 3], [27, 3])], hold: 1 },
    { actors: [hero('stand'), ...bricks(false), ...debris([15, 2], [29, 2], [16, 10], [28, 10])], hold: 1 },
    { actors: [hero('stand'), ...bricks(false)], hold: 1 },
  ),
  shell: loop(
    { actors: [hero('stand', 0, ON_PIPE), pipe()], hold: 2 },
    { actors: [hero('dive', 0, ON_PIPE + 4), pipe()], hold: 1 },
    { actors: [hero('dive', 0, ON_PIPE + 8), pipe()], hold: 1 },
    { actors: [hero('dive', 0, ON_PIPE + 12), pipe()], hold: 1 },
    { actors: [pipe()], texts: [txt('. . .', 5, -2)], hold: 2 },
    { actors: [hero('rise', 0, ON_PIPE + 12), pipe()], hold: 1 },
    { actors: [hero('rise', 0, ON_PIPE + 6), pipe()], hold: 1 },
    { actors: [hero('itemGet', 0, ON_PIPE), pipe()], hold: 1 },
  ),
  // He waves two retainers off; they are gone in a blink, speed lines where they stood.
  agents: loop(
    { actors: [hero('stand'), at('toad1', TOADS.left, TOADS.y, { flip: true }), at('toad1', TOADS.right, TOADS.y)], hold: 2 },
    { actors: [hero('itemGet'), at('toad2', TOADS.left, TOADS.y, { flip: true }), at('toad2', TOADS.right + 2, TOADS.y)], hold: 1 },
    { actors: [hero('itemGet'), at('zip', TOADS.left, TOADS.y + 3), at('zip', TOADS.right + 6, TOADS.y + 3, { flip: true })], hold: 1 },
    { actors: [hero('stand'), at('zipThin', TOADS.left, TOADS.y + 3), at('zipThin', TOADS.right + 6, TOADS.y + 3, { flip: true })], hold: 1 },
    { actors: [hero('stand')], hold: 2 },
  ),
}

// Both loops last SNOW_PHASES ticks, so the snow never skips.
const cold: Theme['cold'] = {
  idle: loop(...snowed([dozing[0]!, dozing[1]!, { ...dozing[2]!, hold: 2 }, { ...dozing[3]!, hold: 2 }])),
  thinking: loop(...snowed([...pondering.slice(0, 5), { ...pondering[5]!, hold: 4 }])),
}

// A drop by the brow, where each form's head is.
const sweat = (dy = 0): Actor[] => [
  { ...prop('sweat', 13, 3 + dy), tiers: SMALL },
  { ...prop('sweat', 14, -1 + dy), tiers: SUPER },
  { ...prop('sweat', 15, -3 + dy), tiers: CAPE },
]
const SIGH_BLOCK = 'Overpowered for a coin block.'
const SIGH_PIPE = 'Overpowered for a warp pipe.'
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), block(), ...sweat()], hold: 2, caption: SIGH_BLOCK },
    { actors: [...bump(), prop('coin', 11, -18), block(-1)], hold: 1, caption: SIGH_BLOCK },
    { actors: [hero('stand'), block(0, SHIMMER), ...sweat()], texts: [txt('~sigh~', 19, 2)], hold: 3, caption: SIGH_BLOCK },
  ),
  shell: loop(
    { actors: [hero('stand', 0, ON_PIPE), pipe(), ...sweat(ON_PIPE)], hold: 2, caption: SIGH_PIPE },
    { actors: [hero('dive', 0, ON_PIPE + 8), pipe()], hold: 1, caption: SIGH_PIPE },
    { actors: [pipe()], hold: 1, caption: SIGH_PIPE },
    { actors: [hero('stand', 0, ON_PIPE), pipe(), ...sweat(ON_PIPE)], texts: [txt('~sigh~', 19, -10)], hold: 3, caption: SIGH_PIPE },
  ),
}

const FLASH = { R: 'hurt', r: 'hurt', B: 'hurtB', C: 'hurtB', c: 'hurt', O: 'hurtB' }
/** The plumber as Small or as Super whatever his form, in the tier's colors (a hit shrinks him, a power-up grows him). */
const shrunk = (x = 0): Actor => ({ ...at('smallStand', x + 2, 4), tier: true })
const grown = (): Actor => ({ ...at('stand', 0, 0), tier: true })

const POLE = { x: 18, y: -18 }
const pole = (flagY: number): Actor[] => [prop('pole', POLE.x, POLE.y), prop('flag', POLE.x + 2, flagY)]
const clear: SceneText = { text: ' COURSE CLEAR! ', x: 0, y: -18, color: WHITE, bg: '#000000' }

const TIME_UP: SceneText = { text: ' TIME 000 ', x: 17, y: -6, color: '#f83800', bg: '#000000' }

// The lava pit opens in the floor to his right; a fireball leaps from it and falls back.
const PIT = { x: 18, y: 16 }
const lava = (k: number, pose: string, leap?: Actor, hold = 1): Frame => ({ actors: [hero(pose), at(k % 2 ? 'lava2' : 'lava1', PIT.x, PIT.y), ...(leap ? [leap] : [])], message: 'limitWarning', hold })
const leaping = (y: number, down = false) => prop('fireLeap', PIT.x + 4, y, { flipY: down })

// What the new model was before: Small, until the power-up lands (or Super, for the model that comes out Small).
const before = (): Actor[] => [
  { ...shrunk(), tiers: [...SUPER, ...CAPE] },
  { ...grown(), tiers: SMALL },
]
/** The power-up of each model on its way in: a mushroom along the ground, a feather drifting down, a star bouncing. */
const powerUp = (step: 0 | 1): Actor[] => [
  { ...prop('mushroom', step ? 15 : 22, 8), tier: true, tiers: SUPER },
  { ...prop('feather', step ? 15 : 21, step ? 5 : -3), tiers: ['tier3'] },
  { ...prop('superStar', step ? 15 : 22, step ? 9 : 3), tiers: ['tier4'] },
]

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('stand'), at('walker1', 20, 8)], hold: 1 },
    { actors: [hero('itemGet', 0, -10), at('walker2', 12, 8)], hold: 1 },
    { actors: [hero('stand', 0, -8), at('walker1', 4, 8)], hold: 1 },
    { actors: [at('walkerFlat', 4, 13), hero('stand', 0, -3)], texts: [txt('100', 17, -8)], hold: 2 },
    { actors: [hero('stand')], texts: [txt('100', 17, -10)], hold: 1 },
  ),
  // The walker walks into him, on through while he flickers, and off the left edge; he ends where he stood.
  toolError: once(
    { actors: [hero('stand'), at('walker1', 20, 8)], hold: 1 },
    { actors: [at('walker2', 13, 8), hero('stand', -2, 0, FLASH)], hold: 1 },
    { actors: [at('walker1', 6, 8), shrunk(-1)], hold: 1 },
    { actors: [at('walker2', -2, 8), hero('stand', -1, 0, FLASH)], hold: 1 },
    { actors: [at('walker1', -10, 8), shrunk()], hold: 1 },
    { actors: [at('walker2', -18, 8, { offstage: true }), hero('stand', 0, 0, FLASH)], hold: 1 },
    { actors: [hero('stand')], hold: 1 },
  ),
  turnComplete: once(
    { actors: [...pole(-15), hero('walk')], hold: 1 },
    { actors: [...pole(-15), hero('itemGet', 5, -12)], hold: 1 },
    { actors: [...pole(-8), hero('itemGet', 5, -6)], hold: 1 },
    { actors: [...pole(0), hero('itemGet', 5, 0)], hold: 1 },
    { actors: [...pole(6), hero('stand', 2)], texts: [clear, txt('*', 26, -14, '#fcd800')], hold: 3 },
    { actors: [...pole(6), hero('itemGet')], texts: [clear, txt('*', 26, -14, '#f83800'), txt('*', -8, -10, '#fcd800'), txt('*', 32, -6)], hold: 4 },
  ),
  milestone: once({ actors: [hero('stand')], message: 'milestone', hold: 18 }),
  // The clock stops, he jumps, and the snow starts as he lies down.
  cacheCold: once(
    { actors: [hero('stand')], texts: [TIME_UP], hold: 2 },
    { actors: [hero('itemGet', 0, -6)], texts: [TIME_UP], hold: 1 },
    // Fourteen ticks of snow that end where the cold loops begin.
    ...snowed([{ actors: [hero('lie')], hold: 2 }, { actors: [hero('lie')], message: 'cacheCold', hold: 12 }], SNOW_PHASES - 4),
  ),
  limitWarning: once(
    lava(0, 'stand', undefined, 2),
    lava(1, 'walk', leaping(7)),
    lava(0, 'stand', leaping(-3)),
    lava(1, 'walk', leaping(5, true)),
    lava(0, 'stand', undefined, 2),
    lava(1, 'walk', leaping(7)),
    lava(0, 'stand', leaping(-3)),
    lava(1, 'walk', leaping(5, true)),
    lava(0, 'stand', undefined, 2),
    lava(1, 'stand', undefined, 2),
    lava(0, 'stand', undefined, 2),
  ),
  compaction: once(
    { actors: [hero('stand', 0, ON_PIPE), pipe()], hold: 1, caption: 'compaction' },
    { actors: [hero('dive', 0, ON_PIPE + 6), pipe()], hold: 1, caption: 'compaction' },
    { actors: [hero('dive', 0, ON_PIPE + 12), pipe()], hold: 1, caption: 'compaction' },
    { actors: [pipe()], texts: [txt('WHOOSH!', 18, -6)], hold: 2, caption: 'compaction' },
    { actors: [hero('rise', 0, ON_PIPE + 8), pipe()], hold: 1, caption: 'compaction' },
    { actors: [hero('itemGet', 0, ON_PIPE), pipe()], hold: 3, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [...before(), ...powerUp(0)], hold: 1 },
    { actors: [...before(), ...powerUp(1)], hold: 1 },
    { actors: [hero('stand', 0, 0, FLASH)], hold: 1 },
    { actors: before(), hold: 1 },
    { actors: [hero('stand', 0, 0, FLASH)], hold: 1 },
    { actors: [hero('stand')], hold: 1 },
    { actors: [hero('itemGet')], hold: 5, caption: 'modelChange' },
  ),
  // The new item sits on the raised fist.
  effortChange: once(
    { actors: [hero('itemGet'), weapon(10, -7)], hold: 3 },
    { actors: [hero('itemGet'), weapon(10, -7)], texts: [{ ...said('*', 7, -8), color: '#fcd800' }, { ...said('*', 19, -5), color: '#fcd800' }], hold: 6, caption: 'effortChange' },
  ),
}

// A form names every pose; `sleep` (never drawn: each has `lie`) is its standing sprite.
const SMALL_POSES = { stand: 'smallStand', walk: 'smallWalk', attack: 'smallAttack', itemGet: 'smallItemGet', sleep: 'smallStand', lie: 'smallLie', dive: 'smallStand', rise: 'smallItemGet' }
const CAPE_POSES = { stand: 'capeStand', walk: 'capeWalk', attack: 'capeAttack', itemGet: 'capeItemGet', sleep: 'capeStand', lie: 'capeLie', dive: 'capeDive', rise: 'capeRise' }
const STAR_POSES = { ...CAPE_POSES, stand: 'starStand', walk: 'starWalk', attack: 'starAttack', itemGet: 'starItemGet', sleep: 'starStand' }

export const mario: Theme = {
  id: 'mario',
  name: 'Super Context Bros.',
  description: 'Platformer homage: a power-up per model, a P-meter for effort, coins, WORLD and TIME',
  version: '1.1.0',
  palette: {
    dark: { accent: '#58d854', gold: '#fcd800', red: '#fc4c24', label: '#fca044', dim: '#9c9c9c', text: '#fcfcfc' },
    light: { accent: '#0c7c0c', gold: '#8c5c00', red: '#c02000', label: '#b44400', dim: '#6c6c6c', text: '#1c1c1c' },
  },
  pixels,
  labels: {
    context: 'WORLD',
    spend: 'COINS',
    cache: 'TIME',
    limits: 'LAVA',
    modelItem: 'POWER-UP',
    effortItem: 'P-METER',
    heroes: 'Power-ups',
    weapons: 'P-meter items',
  },
  headings: {
    Context: 'World',
    Cost: 'Coins',
    'Next message': 'Time',
    Tokens: 'Score',
    Limits: 'Lava',
    'Tool calls': 'Blocks hit',
    Files: 'Course map',
  },
  sprites,
  states,
  cold,
  overkill,
  events,
  scene: {
    height: 40,
    anchor: { x: 12, y: 20 },
    background: {
      ground: 'sky',
      gradient: ['#5c94fc', '#5c94fc', '#94c0fc'],
      deep: ['#08082c', '#2c1858', '#b04020'],
      floor: 'ground',
      // The action owns columns 0..45. Past it, from the right edge in: the castle and
      // its cloud at 58, a hill and a cloud at 80, a bush, blocks and a third cloud at 96.
      decor: [
        { sprite: 'hillEdge', x: 0, y: 26 },
        { sprite: 'cloud', x: 2, y: 2, sky: true },
        { sprite: 'bush', x: 33, y: 29 },
        { sprite: 'castle', x: -1, y: 24, minColumns: 56 },
        { sprite: 'cloudSmall', x: -1, y: 3, sky: true, minColumns: 56 },
        { sprite: 'hillMid', x: -12, y: 28, minColumns: 78 },
        { sprite: 'cloud', x: -14, y: 2, sky: true, minColumns: 78 },
        { sprite: 'bush', x: -34, y: 29, minColumns: 94 },
        { sprite: 'blockRow', x: -24, y: 12, minColumns: 94 },
        { sprite: 'cloudSmall', x: -39, y: 3, sky: true, minColumns: 94 },
      ],
      particles: [
        { colors: ['W', 'Y', 'l'], count: 14, drift: 'none', minPercent: 55 },
        { colors: ['F', 'e'], count: 6, drift: 'up', speed: 1, minPercent: 80 },
      ],
    },
    hero: { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'stand', lie: 'lie', dive: 'stand', rise: 'itemGet' },
    heroTiers: {
      tier1: {},
      tier2: {},
      tier3: {},
      tier4: { R: 'starR', r: 'starr', B: 'starB', H: 'starH', C: 'starC', c: 'starc' },
      unknown: { R: 'luigiG', r: 'luigiS', B: 'luigiB' },
    },
    // `hand` and `aloft`: where each form's own fist is, thrown from and held up.
    heroForms: {
      tier1: { poses: SMALL_POSES, dx: 2, dy: 4, lift: -4, hand: { x: -2, y: 3 }, aloft: { x: -1, y: 0 } },
      tier3: { poses: CAPE_POSES, dx: -6, dy: -2, lift: 2, hand: { x: 0, y: -2 } },
      tier4: { poses: STAR_POSES, dx: -6, dy: -2, lift: 2, hand: { x: 0, y: -2 } },
    },
    lineup: { ground: '#94c0fc', dim: '#203098', mark: '#901000' },
    heroNames: {
      tier1: 'Small Plumber',
      tier2: 'Super Plumber',
      tier3: 'Cape Champion',
      tier4: 'Star Plumber',
      unknown: 'Green Brother',
    },
    weapons: {
      low: { sprite: 'shell', swap: {}, name: 'Green Shell' },
      medium: { sprite: 'fireball', swap: {}, name: 'Fireball' },
      high: { sprite: 'iceball', swap: {}, name: 'Ice Ball' },
      xhigh: { sprite: 'hammer', swap: {}, name: 'Hammer' },
      max: { sprite: 'bomb', swap: {}, aura: 'bombSpark', name: 'Walking Bomb' },
    },
    bar: {
      widgets: [
        { kind: 'counter', value: 'spend', icon: 'coinIcon', format: 'x{v}', digits: 2, chars: 5 },
        { kind: 'counter', value: 'world', label: 'WORLD' },
        { kind: 'counter', value: 'cacheSeconds', label: 'TIME', digits: 3, drop: 1 },
        { kind: 'box', shows: 'model', sprite: 'itemMushroom', sprites: { tier1: 'itemNone', tier3: 'itemFeather', tier4: 'itemStar' }, label: 'POWER-UP', x: 1, y: 4, drop: 2, wrap: true },
        { kind: 'meter', value: 'effort', count: 5, perRow: 5, sprites: ['arrowOff', 'arrowOn'], last: ['pOff', 'pOn'], label: 'P-METER' },
      ],
      colors: { bg: 'black', box: 'boxFrame', text: 'W', label: 'W', map: 'arrowOff', mapDot: 'Y' },
    },
  },
  text: {
    idle: 'The plumber naps in the meadow. zzz...',
    thinking: 'The plumber taps his foot and looks around.',
    reading: 'The plumber bumps a ? block. A coin!',
    editing: 'The plumber throws his item and smashes a brick.',
    shell: 'The plumber dives down a warp pipe.',
    agents: 'Retainers dash off on errands.',
    toolSuccess: 'Stomp! 100 points.',
    toolError: 'Ouch! The plumber takes a hit.',
    turnComplete: 'Course clear! Down the flagpole.',
    milestone: 'Further along the course.',
    cacheCold: 'TIME UP! The cache went cold: it snows.',
    limitWarning: 'The lava rises: a limit is filling up.',
    compaction: 'Whoosh! Through the warp pipe.',
    modelChange: 'A power-up! The plumber changes form.',
    effortChange: 'The P-meter changes: a new item to throw.',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: "LET'S-A GO! {pct}% OF THE COURSE IS BEHIND YOU. PLENTY OF WORLDS AHEAD." },
    { level: 'warn', message: '{pct}% OF THE COURSE IS BEHIND YOU. MIND THE GAPS.' },
    { level: 'orange', message: '{pct}% OF THE COURSE IS BEHIND YOU. LOOK FOR A CHECKPOINT FLAG.' },
    { level: 'alert', message: '{pct}% OF THE COURSE IS BEHIND YOU. THE CASTLE IS NEAR.' },
    { level: 'critical', message: 'THANK YOU, PLUMBER! BUT YOUR CONTEXT IS IN ANOTHER WINDOW! {pct}% USED. SAVE YOUR PROGRESS, THEN /clear.' },
  ],
  messages: {
    cacheCold: 'TIME UP! YOUR CACHE WENT COLD.',
    limitWarning: 'THE LAVA IS RISING! {name} AT {pct}%.',
    compaction: 'Down the warp pipe! The course was compacted.',
    modelChange: '{name} enters the course!',
    effortChange: 'You got the {weapon}!',
  },
}
