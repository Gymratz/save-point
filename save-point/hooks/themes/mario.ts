// "Super Context Bros.": a side-scrolling platformer homage. Every sprite is
// drawn fresh for this theme in that 8-bit style.
//
// The model is the plumber's power-up (none, mushroom, feather, star: Small,
// Super, Cape, Star), the effort is the P-meter and the item he throws, the
// context is how far along the course you are (WORLD 1-1 to 8-4), coins are
// cents, TIME is the cache (it snows when it runs out) and the limits are lava.

import { at, hero, loop, once, weapon } from './kit'
import type { Actor, Animation, Frame, HeroTier, SceneText, Theme, ThemeAction } from './types'

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
  // Your glove (the actions): white, a red cuff, from the top of the scene
  glove: { rows: ['.RRRRRR.', 'RRRRRRRR', 'KWWWWWWK', 'KWKWKWWK', 'KWWWWWWK', 'KWWWWWWK', '.KWWWWK.', '..KKKK..'] },
  // The retainer bowing (the head two rows lower, the vest tucked)
  toadBow: { rows: ['........', '........', '..RWWR..', '.WWRRWW.', 'RWWRRWWR', 'WWWWWWWW', '.SKSSKS.', 'SBBBBBBS', '..WWWW..', '.OO..OO.'] },
  // The bomb going off: the burst, then the ring it leaves
  boom: { rows: ['....F.F....', '..F.eYe.F..', '...eYWYe...', '.F.YWWWY.F.', '..eWWWWWe..', '.F.YWWWY.F.', '...eYWYe...', '..F.eYe.F..', '....F.F....'] },
  boom2: { rows: ['.F...W...F.', '...e...e...', '.W.......W.', '...........', 'F....W....F', '...........', '.W.......W.', '...e...e...', '.F...W...F.'] },
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

// ---------------------------------------------------------------------------
// Actions: the buttons under the scene. You are a white glove with a red cuff
// from the top of the scene, holding the plumber's own item upside down (the
// hammer bonks head first). Each press plays one of the tier's takes, picked at
// random; the target's patience wears down with repeated presses.
// ---------------------------------------------------------------------------

const NOT_SMALL: HeroTier[] = [...SUPER, ...CAPE]
/**
 * The glove (8 by 8) with the item of the current effort hanging from the fist, its bottom 12 pixels under
 * the glove's top. Over the plumber (not `fixed`) the Small form's `aloft` moves the item a pixel left: a pixel back for it.
 */
const you = (x: number, y: number, opts: Partial<Actor> = {}): Actor[] => [
  ...(opts.fixed
    ? [weapon(x + 2, y + 5, { flipY: true, ...opts })]
    : [
        { ...weapon(x + 3, y + 5, { flipY: true, ...opts }), tiers: SMALL },
        { ...weapon(x + 2, y + 5, { flipY: true, ...opts }), tiers: NOT_SMALL },
      ]),
  at('glove', x, y, opts),
]
/** The empty glove: knuckles for a block. */
const fist = (x: number, y: number, opts: Partial<Actor> = {}): Actor => at('glove', x, y, opts)
// Who is who, for the rests: the plumber (and whatever is his) is `plumber`, the ? block `block`, the retainer `toad`.
const plumber = (pose: string, x = 0, y = 0, swap?: Record<string, string>): Actor => ({ ...hero(pose, x, y, swap), gone: 'plumber' })
const his = (actors: Actor[]): Actor[] => actors.map(a => ({ ...a, gone: 'plumber' }))
/** The plumber's line beside his head (it follows the form's height), right of the glove. */
const says = (text: string, y = -2, x = 17): SceneText => ({ ...said(text, x, y), gone: 'plumber' })
const zz = (text: string, x: number, y: number): SceneText => ({ ...txt(text, x, y), gone: 'plumber' })
/** A take that is only picked while these are present. */
const needing = (needs: string[], anim: Animation): Animation => ({ ...anim, needs })
/** A reaction: one-shot, every frame held twice as long as written (a line stays about a second at 6 fps). */
const take = (...frames: Frame[]): Animation => once(...frames.map(f => ({ ...f, hold: 2 * Math.max(1, f.hold ?? 1) })))
/** The same caption on every frame from `from` on. */
const captioned = (caption: string, frames: Frame[], from = 2): Frame[] => frames.map((f, k) => (k >= from ? { ...f, caption } : f))
const bonk = (x: number, y: number, opts: Partial<Actor> = {}): Actor => at('sparkle', x, y, opts)
const STAR = { R: 'starR', r: 'starr', B: 'starB', H: 'starH', C: 'starC', c: 'starc' }

// 1. Poke the plumber. The glove comes down on his cap from the top of the
// scene (it rises with the Cape and drops to the Small form, as a prop over
// the head does): in from above, a hover, the poke, then the reaction.
const AX = 4
const A_ENTER = -22
const A_HOVER = -15
const A_POKE = -12
/** The plumber and the glove at `y` (null: gone). */
const aScene = (y: number | null, who: Actor[], more: Actor[] = []): Actor[] => [...who, ...(y === null ? [] : you(AX, y, y <= A_ENTER ? { offstage: true } : {})), ...more]
const aStart = (who: Actor[] = [plumber('stand')]): Frame[] => [
  { actors: aScene(A_ENTER, who), hold: 1 },
  { actors: aScene(A_HOVER, who), hold: 1 },
  { actors: aScene(A_POKE, who, [bonk(7, -4)]), hold: 1 },
]
const pokePlumber: ThemeAction = {
  id: 'plumber',
  label: 'POKE PLUMBER',
  restLabel: '(WARPED OFF)',
  gone: ['plumber'],
  needs: ['plumber'],
  reactions: {
    calm: [
      take(
        ...captioned("Poked the plumber. It's-a him, apparently.", [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('stand')]), texts: [says('!')], hold: 2 },
          { actors: aScene(A_HOVER, [plumber('stand')]), texts: [says("IT'S-A ME.")], hold: 3 },
          { actors: aScene(null, [plumber('stand')]), texts: [says("IT'S-A ME.")], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The plumber jumps. The glove regrets it.', [
          ...aStart(),
          { actors: aScene(A_HOVER, his(bump()), [bonk(7, -12)]), hold: 1 },
          { actors: aScene(A_ENTER, his(land())), texts: [says('HA!', -6)], hold: 2 },
          { actors: aScene(null, [plumber('stand')]), texts: [says('HA!')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Poked. The plumber thought it was a coin.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('itemGet')]), texts: [says('A COIN?', -4)], hold: 3 },
          { actors: aScene(A_HOVER, [plumber('stand')]), texts: [says('...NO.')], hold: 3 },
          { actors: aScene(null, [plumber('stand')]), hold: 1 },
        ]),
      ),
      take(
        ...captioned('The plumber tips his cap. Manners.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('itemGet')]), texts: [says('HELLO.', -4)], hold: 3 },
          { actors: aScene(A_HOVER, [plumber('stand')]), hold: 1 },
          { actors: aScene(null, [plumber('stand')]), texts: [says('GOODBYE.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Poked. The plumber takes a nap about it.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('stand')]), texts: [says('...')], hold: 2 },
          { actors: aScene(A_HOVER, [plumber('lie')]), texts: [zz('z', 5, 4)], hold: 2 },
          { actors: aScene(null, [plumber('lie')]), texts: [zz('z', 6, 2)], hold: 2 },
          { actors: aScene(null, [plumber('lie')]), texts: [zz('Z', 7, 0)], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The plumber checks the glove for coins. None.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('itemGet')]), texts: [says('HM.', -4)], hold: 2 },
          { actors: aScene(A_HOVER, [plumber('itemGet')]), texts: [says('NO COINS.', -4)], hold: 3 },
          { actors: aScene(null, [plumber('stand')]), texts: [says('CHEAP.')], hold: 2 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('The plumber throws his item at the glove.', [
          ...aStart(),
          // The thrown item is `fixed` throughout: held, `fixed` changes nothing (the form's `hand` still places it) and it keeps the straddle check off the glove's copy.
          { actors: aScene(A_HOVER, [plumber('attack'), weapon(13, 4, { fixed: true })]), hold: 1 },
          { actors: aScene(A_HOVER, [plumber('attack'), weapon(10, -9, { fixed: true })], [bonk(8, -11)]), hold: 1 },
          { actors: aScene(A_ENTER, [plumber('stand')]), texts: [says('HEY!')], hold: 2 },
          { actors: aScene(null, [plumber('stand')]), texts: [says('HEY!')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Mamma mia. The plumber has words.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('stand'), ...his(sweat())]), texts: [says('MAMMA MIA.')], hold: 3 },
          { actors: aScene(A_HOVER, [plumber('stand'), ...his(sweat())]), texts: [says('AGAIN?')], hold: 2 },
          { actors: aScene(null, [plumber('stand')]), texts: [says('AGAIN?')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The plumber sidesteps. The glove pokes air.', [
          { actors: aScene(A_ENTER, [plumber('stand')]), hold: 1 },
          { actors: aScene(A_HOVER, [plumber('walk', 8)]), hold: 1 },
          { actors: aScene(A_POKE, [plumber('stand', 8)]), hold: 2 },
          { actors: aScene(A_HOVER, [plumber('stand', 8)]), texts: [says('MISSED.', -2, -6)], hold: 3 },
          { actors: aScene(null, [plumber('walk', 4)]), hold: 1 },
          { actors: aScene(null, [plumber('stand')]), hold: 1 },
        ]),
      ),
      take(
        ...captioned('Poked too hard. That counted as a hit.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('stand', 0, 0, FLASH)]), hold: 1 },
          { actors: aScene(A_HOVER, his([shrunk()])), hold: 1 },
          { actors: aScene(A_ENTER, [plumber('stand', 0, 0, FLASH)]), hold: 1 },
          { actors: aScene(null, his([shrunk()])), texts: [says('OW.', 2)], hold: 2 },
          { actors: aScene(null, [plumber('stand')]), texts: [says('OW.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The plumber taps his foot. At you.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('stand')]), texts: [says('.')], hold: 1 },
          { actors: aScene(A_HOVER, [plumber('walk')]), texts: [says('..')], hold: 1 },
          { actors: aScene(A_HOVER, [plumber('stand')]), texts: [says('...')], hold: 1 },
          { actors: aScene(A_HOVER, [plumber('walk')]), texts: [says('....')], hold: 1 },
          { actors: aScene(null, his(lookBack())), texts: [says('WELL?')], hold: 3 },
        ]),
      ),
    ],
    fedUp: [
      needing(['toad'], take(
        ...captioned('A retainer has been summoned. He is tiny.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('itemGet')]), texts: [says('TOAD!', -4)], hold: 2 },
          { actors: aScene(A_HOVER, [plumber('itemGet'), { ...at('zip', TOADS.right + 6, TOADS.y + 3, { flip: true }), gone: 'toad' }]), hold: 1 },
          { actors: aScene(A_HOVER, [plumber('stand'), { ...at('toad1', TOADS.right, TOADS.y), gone: 'toad' }]), texts: [{ ...txt('SIR?', 26, 6), gone: 'toad' }], hold: 2 },
          { actors: aScene(A_ENTER, [plumber('stand'), { ...at('toad2', TOADS.right, TOADS.y), gone: 'toad' }]), texts: [{ ...txt('SHOO.', 26, 6), gone: 'toad' }], hold: 2 },
          { actors: aScene(null, [plumber('stand'), { ...at('toad1', TOADS.right, TOADS.y), gone: 'toad' }]), texts: [{ ...txt('SHOO.', 26, 6), gone: 'toad' }], hold: 2 },
        ]),
      )),
      take(
        ...captioned('Star power. The glove thinks twice.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('stand'), prop('superStar', 24, 4)]), hold: 1 },
          { actors: aScene(A_HOVER, [plumber('stand'), prop('superStar', 17, 8)]), hold: 1 },
          { actors: aScene(A_HOVER, [plumber('itemGet', 0, 0, STAR)], [bonk(7, -12)]), hold: 1 },
          { actors: aScene(A_ENTER, [plumber('itemGet', 0, 0, STAR)], [bonk(9, -16)]), texts: [says('COME ON.', -4)], hold: 2 },
          { actors: aScene(null, [plumber('stand', 0, 0, STAR)]), texts: [says('COME ON.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The plumber warps out. Back in a bit.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('stand')]), texts: [says('NOPE.')], hold: 2 },
          { actors: aScene(A_ENTER, [plumber('stand', 0, ON_PIPE), pipe()]), hold: 1 },
          { actors: aScene(null, [plumber('dive', 0, ON_PIPE + 6), pipe()]), hold: 1 },
          { actors: aScene(null, [plumber('dive', 0, ON_PIPE + 12), pipe()]), hold: 1 },
          { actors: aScene(null, [pipe()]), texts: [zz('. . .', 5, -2)], hold: 3 },
          { actors: aScene(null, [plumber('rise', 0, ON_PIPE + 6), pipe()]), hold: 1 },
          { actors: aScene(null, [plumber('itemGet', 0, ON_PIPE), pipe()]), texts: [says('GONE?', -14)], hold: 3 },
        ]),
      ),
    ],
    snapped: [
      take(
        ...captioned('The plumber warped off. No forwarding pipe.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('stand'), ...his(sweat())]), texts: [says("THAT'S IT.")], hold: 3 },
          { actors: aScene(A_ENTER, [plumber('stand', 0, ON_PIPE), pipe()]), hold: 1 },
          { actors: aScene(null, [plumber('dive', 0, ON_PIPE + 4), pipe()]), hold: 1 },
          { actors: aScene(null, [plumber('dive', 0, ON_PIPE + 8), pipe()]), hold: 1 },
          { actors: aScene(null, [plumber('dive', 0, ON_PIPE + 12), pipe()]), hold: 1 },
          { actors: aScene(null, [pipe()]), texts: [zz('. . .', 5, -2)], hold: 3 },
          { actors: [pipe()], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Course clear. The plumber clocked out.', [
          ...aStart(),
          { actors: aScene(A_HOVER, [plumber('stand')]), texts: [says('ENOUGH.')], hold: 2 },
          { actors: aScene(null, [...pole(-15), plumber('walk', 2)]), hold: 1 },
          { actors: [...pole(-15), plumber('itemGet', 5, -12)], hold: 1 },
          { actors: [...pole(-8), plumber('itemGet', 5, -6)], hold: 1 },
          { actors: [...pole(0), plumber('itemGet', 5, 0)], hold: 1 },
          { actors: [...pole(6), plumber('walk', 12)], hold: 1 },
          { actors: [...pole(6), { ...plumber('walk', 22), offstage: true }], hold: 1 },
          { actors: [...pole(6), { ...plumber('walk', 34), offstage: true }], hold: 1 },
          { actors: pole(6), texts: [txt('...', 22, -4)], hold: 3 },
        ]),
      ),
    ],
  },
  // The plumber's rest: the meadow without him; a walker strolls through, in peace for once.
  rest: loop(
    { actors: [], hold: 4 },
    ...[28, 22, 16, 10, 4, -2].map((x, k) => ({ actors: [at(k % 2 ? 'walker2' : 'walker1', x, 8)], hold: 2 })),
    { actors: [at('walker1', -6, 8)], texts: [txt('?', -3, 2)], hold: 4 },
    { actors: [at('walker2', -12, 8)], hold: 2 },
    { actors: [at('walker1', -18, 8, { offstage: true })], hold: 2 },
  ),
}

// 2. Hit the ? block. Knuckles from the top (the block hangs eight pixels under
// the scene's top edge, so the glove is mostly cuff): blocks are hit from
// below, and this one knows it.
const BX = BLOCK.x
const B_ENTER = -28
const B_HOVER = -23
const B_POKE = -20
const USED = { q: 'n', Q: 'N', z: 'n', K: 'N' }
/** The block, `dy` down (pushed by the knuckles) in a palette swap (shimmer, or brown when it plays empty). */
const qb = (dy = 0, swap?: Record<string, string>): Actor => ({ ...block(dy, swap), gone: 'block' })
const qbAt = (x: number, y: number, opts: Partial<Actor> = {}): Actor => ({ ...prop('qblock', x, y, opts), gone: 'block' })
/** What falls out of the block: a coin, a mushroom, a walker, a bomb... the block's, so gone with it. */
const out = (sprite: string, x: number, y: number, opts: Partial<Actor> = {}): Actor => ({ ...prop(sprite, x, y, opts), gone: 'block' })
const bits = (...spots: [number, number][]): Actor[] => spots.map(([x, y]) => out('debris', x, y))
/** The block's line, right of it (row 6, under the knuckles and the spark). */
const blockSays = (text: string, y = -8, x = 19): SceneText => ({ ...txt(text, x, y), gone: 'block' })
const BONK_B = bonk(16, -14, { fixed: true })
const bScene = (y: number | null, blocks: Actor[] = [qb()], more: Actor[] = [], who: Actor[] = [plumber('stand')]): Actor[] => [
  ...who,
  ...blocks,
  ...(y === null ? [] : [fist(BX, y, { fixed: true, ...(y <= B_HOVER ? { offstage: true } : {}) })]),
  ...more,
]
const bStart = (swap?: Record<string, string>): Frame[] => [
  { actors: bScene(B_ENTER, [qb(0, swap)]), hold: 1 },
  { actors: bScene(B_HOVER, [qb(0, swap)]), hold: 1 },
  { actors: bScene(B_POKE, [qb(1, swap)], [BONK_B]), hold: 1 },
]
const hitBlock: ThemeAction = {
  id: 'block',
  label: 'HIT BLOCK',
  restLabel: '(NO BLOCK)',
  gone: ['block'],
  needs: ['block'],
  reactions: {
    calm: [
      needing(['plumber'], take(
        ...captioned('Bonk. A coin fell out. The plumber kept it.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb()], [out('coin', 11, -4)]), hold: 1 },
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)], [out('coin', 11, 2)]), hold: 1 },
          { actors: bScene(null, [qb()], [out('coin', 12, 4)], [plumber('itemGet')]), texts: [says('+1', -4)], hold: 2 },
          { actors: bScene(null, [qb()], [], [plumber('itemGet')]), texts: [says('THANKS.', -4)], hold: 3 },
        ]),
      )),
      take(
        ...captioned('Bonk. Nothing. The block says it was empty.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb(0, USED)]), texts: [blockSays('...')], hold: 3 },
          { actors: bScene(B_HOVER, [qb(0, USED)], [], [plumber('stand'), ...his(sweat())]), texts: [says('EMPTY.')], hold: 2 },
          { actors: bScene(null, [qb(0, USED)]), hold: 1 },
          { actors: bScene(null, [qb()]), hold: 1 },
        ]),
      ),
      needing(['plumber'], take(
        ...captioned('Bonk. A mushroom. It is for the plumber.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)], [out('mushroom', 10, -4)]), hold: 1 },
          { actors: bScene(B_HOVER, [qb()], [out('mushroom', 16, 8)]), hold: 1 },
          { actors: bScene(null, [qb()], [out('mushroom', 16, 8)], [plumber('walk', 2)]), hold: 1 },
          { actors: bScene(null, [qb()], [], [plumber('itemGet', 2, 0, FLASH)]), hold: 1 },
          { actors: bScene(null, [qb()], [], [plumber('itemGet', 2)]), texts: [says('FOR ME?', -4, 19)], hold: 3 },
          { actors: bScene(null, [qb()], [], [plumber('walk', 1)]), hold: 1 },
          { actors: bScene(null, [qb()]), hold: 1 },
        ]),
      )),
      take(
        ...captioned('Bonk. Blocks do not talk. This one sulks.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb()]), texts: [blockSays('...')], hold: 2 },
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)]), texts: [blockSays('...')], hold: 1 },
          { actors: bScene(B_HOVER, [qb()], [], his(lookBack())), texts: [says('?')], hold: 3 },
          { actors: bScene(null, [qb()]), hold: 1 },
        ]),
      ),
      needing(['plumber'], take(
        ...captioned('Bonk. From the top. That is not how it works.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb()]), texts: [says('FROM BELOW.')], hold: 3 },
          { actors: bScene(null, [qb(-1)], [out('coin', 11, -18)], his(bump())), hold: 1 },
          { actors: bScene(null, [qb(0, SHIMMER)], [out('coinSpin', 12, -20)], his(land())), hold: 1 },
          { actors: bScene(null, [qb()], [out('sparkle', 11, -19)]), texts: [says('LIKE SO.')], hold: 3 },
        ]),
      )),
      take(
        ...captioned('Bonk. The block rang. Something shifted.', [
          ...bStart(),
          { actors: bScene(B_POKE, [qb(1)], [BONK_B]), texts: [blockSays('DING', -16)], hold: 1 },
          { actors: bScene(B_HOVER, [qb()]), texts: [blockSays('DING', -16)], hold: 1 },
          { actors: bScene(B_HOVER, [qb(1)]), texts: [blockSays('rattle')], hold: 2 },
          { actors: bScene(null, [qb()], [], [plumber('stand'), ...his(sweat())]), texts: [says('...')], hold: 3 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('The block spat a coin. At the glove. +0.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)], [out('coin', 11, -19), bonk(16, -19, { fixed: true })]), hold: 1 },
          { actors: bScene(B_ENTER, [qb()], [out('coinSpin', 12, -20)]), hold: 1 },
          { actors: bScene(null, [qb()]), texts: [blockSays('+0')], hold: 3 },
          { actors: bScene(null, [qb()]), texts: [says('HA.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The block turned brown. On purpose.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb(0, USED)]), hold: 2 },
          { actors: bScene(B_POKE, [qb(1, USED)]), texts: [blockSays('(empty)')], hold: 2 },
          { actors: bScene(null, [qb(0, USED)]), texts: [blockSays('(empty)')], hold: 3 },
          { actors: bScene(null, [qb()]), hold: 1 },
        ]),
      ),
      take(
        ...captioned('A walker fell out. Nobody wanted that.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)], [out('walker1', 16, -4)]), hold: 1 },
          { actors: bScene(B_HOVER, [qb()], [out('walker1', 16, 4)]), hold: 1 },
          { actors: bScene(null, [qb()], [out('walker1', 16, 8)]), texts: [{ ...txt('?', 26, 4), gone: 'block' }], hold: 2 },
          { actors: bScene(null, [qb()], [out('walker2', 16, 8)], [plumber('stand'), ...his(sweat())]), texts: [says('...')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The block scooted over. One block. Rude.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb()]), hold: 1 },
          { actors: bScene(B_HOVER, [qbAt(18, BLOCK.y)]), hold: 1 },
          { actors: bScene(B_POKE, [qbAt(18, BLOCK.y)]), texts: [blockSays('...', -8, 27)], hold: 2 },
          { actors: bScene(null, [qbAt(18, BLOCK.y)]), texts: [says('RUDE.')], hold: 3 },
          { actors: bScene(null, [qb()]), hold: 1 },
        ]),
      ),
      take(
        ...captioned('The block became a brick. Hit that instead.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)]), hold: 1 },
          { actors: bScene(B_HOVER, [out('brick', BX, BLOCK.y)]), hold: 1 },
          { actors: bScene(B_POKE, [out('brick', BX, BLOCK.y + 1)], [BONK_B]), hold: 1 },
          { actors: bScene(B_HOVER, [out('brick', BX, BLOCK.y)]), texts: [blockSays('(brick)')], hold: 3 },
          { actors: bScene(null, [qb(0, SHIMMER)]), hold: 1 },
          { actors: bScene(null, [qb()]), hold: 1 },
        ]),
      ),
    ],
    fedUp: [
      needing(['plumber'], take(
        ...captioned('The block called the plumber. His block.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)]), texts: [blockSays('HELP')], hold: 2 },
          { actors: bScene(B_HOVER, [qb()], [], [plumber('attack'), weapon(13, 4, { fixed: true })]), texts: [says('MY BLOCK.')], hold: 1 },
          { actors: bScene(B_HOVER, [qb()], [weapon(12, -17, { fixed: true }), bonk(16, -20, { fixed: true })], [plumber('attack')]), hold: 1 },
          { actors: bScene(B_ENTER, [qb()]), texts: [says('MY BLOCK.')], hold: 2 },
          { actors: bScene(null, [qb()]), hold: 1 },
        ]),
      )),
      take(
        ...captioned('The block dropped a bomb. Not a metaphor.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)], [out('bomb', 10, -4)]), hold: 1 },
          { actors: bScene(B_HOVER, [qb()], [out('bomb', 14, 2)]), hold: 1 },
          { actors: bScene(B_HOVER, [qb()], [out('bomb', 16, 9), out('bombSpark', 15, 7)], [plumber('stand'), ...his(sweat())]), texts: [says('UH.')], hold: 2 },
          { actors: bScene(B_ENTER, [qb()], [out('boom', 13, 4)], [plumber('stand', -3)]), texts: [{ ...txt('BOOM', 26, 0), gone: 'block' }], hold: 1 },
          { actors: bScene(null, [qb()], [out('boom2', 13, 4)], [plumber('stand', -3)]), texts: [{ ...txt('BOOM', 26, 0), gone: 'block' }], hold: 1 },
          { actors: bScene(null, [qb()], [], [plumber('stand', -3), ...his(sweat())]), texts: [says('...', -2, 14)], hold: 3 },
        ]),
      ),
      needing(['plumber'], take(
        ...captioned('The block emptied itself. x99. All his.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)], [out('coin', 10, -4), out('coin', 14, -2)]), hold: 1 },
          { actors: bScene(B_HOVER, [qb()], [out('coin', 10, 2), out('coin', 14, 0), out('coin', 12, -4)]), hold: 1 },
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)], [out('coin', 10, 6), out('coin', 14, 4), out('coin', 12, 1), out('coin', 16, -3)], [plumber('itemGet')]), texts: [blockSays('x99', -16)], hold: 1 },
          { actors: bScene(B_ENTER, [qb(0, USED)], [out('coin', 10, 8), out('coin', 14, 7), out('coin', 12, 5), out('coin', 16, 2)], [plumber('itemGet')]), texts: [says('x99!', -4)], hold: 2 },
          { actors: bScene(null, [qb(0, USED)], [], [plumber('itemGet')]), texts: [says('RICH.', -4)], hold: 3 },
        ]),
      )),
    ],
    snapped: [
      take(
        ...captioned('The block broke. No coins. No block.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)]), texts: [blockSays('!')], hold: 1 },
          { actors: bScene(B_POKE, [qb(1)], [BONK_B]), hold: 1 },
          { actors: bScene(B_POKE, [], bits([10, -12], [16, -12], [10, -7], [16, -7])), hold: 1 },
          { actors: bScene(B_HOVER, [], bits([7, -14], [19, -14], [9, -4], [17, -4])), hold: 1 },
          { actors: bScene(B_ENTER, [], bits([6, -8], [20, -8], [9, 3], [17, 3])), hold: 1 },
          { actors: bScene(null, [], [], [plumber('stand'), ...his(sweat())]), texts: [says('...')], hold: 3 },
          { actors: bScene(null, []), texts: [says('MY COINS.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The block floated off. Blocks can do that.', [
          ...bStart(),
          { actors: bScene(B_HOVER, [qb(0, SHIMMER)]), texts: [blockSays('ENOUGH.')], hold: 3 },
          { actors: bScene(B_ENTER, [qb(-3)]), hold: 1 },
          { actors: bScene(null, [qb(-7)]), hold: 1 },
          { actors: bScene(null, [{ ...qb(-12), offstage: true }]), hold: 1 },
          { actors: bScene(null, [{ ...qb(-18), offstage: true }], [], his(bump())), hold: 1 },
          { actors: bScene(null, [], [], his(land())), hold: 1 },
          { actors: bScene(null, []), texts: [says('?')], hold: 3 },
        ]),
      ),
    ],
  },
  // The block's rest: the plumber jumps where it hung. Nothing.
  rest: loop(
    { actors: [plumber('stand')], hold: 4 },
    { actors: his(bump()), hold: 1 },
    { actors: his(land()), hold: 1 },
    { actors: [plumber('stand')], texts: [says('?')], hold: 4 },
    { actors: his(bump()), hold: 1 },
    { actors: his(land()), hold: 1 },
    { actors: [plumber('stand')], texts: [says('...')], hold: 5 },
  ),
}

// 3. Poke the retainer, where he stands when the plumber sends him on errands
// (right of the plumber). The glove is scenery here: it does not rise with the Cape.
const TX = TOADS.right
const T_ENTER = -22
const T_HOVER = -10
const T_POKE = -6
const toadAt = (x = TOADS.right, sprite = 'toad1', opts: Partial<Actor> = {}): Actor => ({ ...at(sprite, x, TOADS.y, opts), gone: 'toad' })
const TOAD = toadAt()
const TOAD_BACK = toadAt(TOADS.right, 'toad1', { flip: true })
/** The speed lines the retainer leaves (or arrives by), as in the errands loop. */
const zip = (thin = false, flip = true, x = TOADS.right + 6): Actor => ({ ...at(thin ? 'zipThin' : 'zip', x, TOADS.y + 3, { flip }), gone: 'toad' })
/** The retainer's line beside him (ten characters at most), or over his head once the glove is away. */
const toadSays = (text: string, x = 26, y = 6): SceneText => ({ ...txt(text, x, y), gone: 'toad' })
const toadAbove = (text: string): SceneText => toadSays(text, TOADS.right, 0)
const BONK_T = bonk(24, 2, { fixed: true })
const tScene = (y: number | null, toads: Actor[] = [TOAD], more: Actor[] = [], who: Actor[] = [plumber('stand')]): Actor[] => [
  ...who,
  ...toads,
  ...(y === null ? [] : you(TX, y, { fixed: true, ...(y <= T_ENTER ? { offstage: true } : {}) })),
  ...more,
]
const tStart = (toads: Actor[] = [TOAD], who: Actor[] = [plumber('stand')]): Frame[] => [
  { actors: tScene(T_ENTER, toads, [], who), hold: 1 },
  { actors: tScene(T_HOVER, toads, [], who), hold: 1 },
  { actors: tScene(T_POKE, toads, [BONK_T], who), hold: 1 },
]
const pokeToad: ThemeAction = {
  id: 'toad',
  label: 'POKE TOAD',
  restLabel: '(NO TOAD)',
  gone: ['toad'],
  needs: ['toad'],
  reactions: {
    calm: [
      take(
        ...captioned('Thank you! But the princess is elsewhere.', [
          ...tStart(),
          { actors: tScene(T_HOVER), texts: [toadSays('THANK YOU!')], hold: 3 },
          { actors: tScene(T_HOVER), texts: [toadSays('BUT...')], hold: 2 },
          { actors: tScene(null), texts: [toadAbove('ANOTHER CASTLE.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Toad bows. Toad is a retainer. It is the job.', [
          ...tStart(),
          { actors: tScene(T_HOVER, [toadAt(TX, 'toadBow')]), hold: 2 },
          { actors: tScene(T_HOVER), texts: [toadSays('SIR.')], hold: 2 },
          { actors: tScene(T_HOVER, [toadAt(TX, 'toadBow')]), hold: 2 },
          { actors: tScene(null), texts: [toadSays("MA'AM.")], hold: 3 },
        ]),
      ),
      take(
        ...captioned("Poked. Toad's cap is not a mushroom. He says.", [
          ...tStart(),
          { actors: tScene(T_POKE, [TOAD], [BONK_T]), texts: [toadSays('NOT FOOD.')], hold: 3 },
          { actors: tScene(T_HOVER), texts: [toadSays('NOT FOOD.')], hold: 1 },
          { actors: tScene(null), texts: [toadAbove('IT IS A HAT.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Toad zips off, and back. Errand done.', [
          ...tStart(),
          { actors: tScene(T_HOVER, [zip()]), hold: 1 },
          { actors: tScene(T_HOVER, [zip(true)]), hold: 1 },
          { actors: tScene(T_HOVER, []), hold: 2 },
          { actors: tScene(T_HOVER, [zip(false, false)]), hold: 1 },
          { actors: tScene(null), texts: [toadSays('DONE.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Toad waves back. Toad is very polite.', [
          ...tStart(),
          { actors: tScene(T_HOVER, [toadAt(TX, 'toad2')]), texts: [toadSays('HI!')], hold: 2 },
          { actors: tScene(T_HOVER), texts: [toadSays('HI!')], hold: 2 },
          { actors: tScene(null, [toadAt(TX, 'toad2')]), texts: [toadSays('HELLO!')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Toad looks up. Toad sees a glove. Toad nods.', [
          ...tStart(),
          { actors: tScene(T_HOVER), texts: [toadSays('...')], hold: 2 },
          { actors: tScene(T_HOVER, [toadAt(TX, 'toadBow')]), hold: 1 },
          { actors: tScene(T_HOVER), hold: 1 },
          { actors: tScene(T_HOVER, [toadAt(TX, 'toadBow')]), hold: 1 },
          { actors: tScene(null), texts: [toadSays('OK.')], hold: 3 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('Toad steps back. Toad is quicker than you.', [
          { actors: tScene(T_ENTER), hold: 1 },
          { actors: tScene(T_HOVER, [toadAt(26, 'toad2')]), hold: 1 },
          { actors: tScene(T_POKE, [toadAt(26)]), hold: 2 },
          { actors: tScene(T_HOVER, [toadAt(26)]), texts: [toadSays('MISSED.', TX, 2)], hold: 3 },
          { actors: tScene(null, [toadAt(26, 'toad2')]), hold: 1 },
          { actors: tScene(null), hold: 1 },
        ]),
      ),
      take(
        ...captioned('Toad has had it with being poked. And castles.', [
          ...tStart(),
          { actors: tScene(T_HOVER), texts: [toadSays('ENOUGH.')], hold: 3 },
          { actors: tScene(T_HOVER, [TOAD_BACK]), texts: [toadSays('HMPH.')], hold: 2 },
          { actors: tScene(null, [TOAD_BACK]), hold: 2 },
        ]),
      ),
      needing(['plumber'], take(
        ...captioned('Toad tells the plumber. The plumber shrugs.', [
          ...tStart(),
          { actors: tScene(T_HOVER), texts: [toadSays('SIR!')], hold: 2 },
          { actors: tScene(T_HOVER, [TOAD], [], [plumber('itemGet')]), texts: [says('NOT MY JOB.', -4)], hold: 3 },
          { actors: tScene(null), texts: [toadSays('...')], hold: 2 },
        ]),
      )),
      take(
        ...captioned('Toad turns his back. Toad has one.', [
          ...tStart(),
          { actors: tScene(T_HOVER, [TOAD_BACK]), texts: [toadSays('...')], hold: 2 },
          { actors: tScene(T_POKE, [TOAD_BACK], [BONK_T]), hold: 1 },
          { actors: tScene(T_HOVER, [TOAD_BACK]), texts: [toadSays('STILL NO.')], hold: 3 },
          { actors: tScene(null, [TOAD_BACK]), hold: 1 },
        ]),
      ),
      take(
        ...captioned('Poked. Toad files a complaint with the castle.', [
          ...tStart(),
          { actors: tScene(T_HOVER), texts: [toadSays('NOTED.')], hold: 2 },
          { actors: tScene(T_HOVER), texts: [toadSays('WRITTEN.')], hold: 2 },
          { actors: tScene(null), texts: [toadAbove('TO THE CASTLE.')], hold: 3 },
        ]),
      ),
    ],
    fedUp: [
      take(
        ...captioned('Retainers. All of them. The whole staff.', [
          ...tStart(),
          { actors: tScene(T_HOVER, [TOAD], [zip(false, false, TOADS.left), zip(false, true, 26)]), texts: [toadSays('BACKUP!')], hold: 1 },
          { actors: tScene(T_HOVER, [TOAD, toadAt(TOADS.left, 'toad1', { flip: true }), toadAt(26)]), hold: 2 },
          { actors: tScene(T_ENTER, [TOAD, toadAt(TOADS.left, 'toad2', { flip: true }), toadAt(26, 'toad2')], [], [plumber('stand'), ...his(sweat())]), texts: [says('...')], hold: 2 },
          { actors: tScene(null, [TOAD, toadAt(TOADS.left, 'toad1', { flip: true }), toadAt(26)]), texts: [toadAbove('WE ARE MANY.')], hold: 3 },
        ]),
      ),
      needing(['plumber'], take(
        ...captioned('Toad fetched the plumber. He went back to bed.', [
          ...tStart([TOAD], [plumber('lie')]),
          { actors: tScene(T_HOVER, [toadAt(TX, 'toad2')], [], [plumber('lie')]), texts: [toadSays('SIR?'), zz('z', 5, 4)], hold: 2 },
          { actors: tScene(T_HOVER, [TOAD], [], [plumber('lie')]), texts: [toadSays('WAKE UP!'), zz('z', 6, 2)], hold: 2 },
          { actors: tScene(T_HOVER), texts: [says('WHAT.')], hold: 2 },
          { actors: tScene(T_ENTER), texts: [toadSays('A GLOVE.')], hold: 2 },
          { actors: tScene(null), texts: [says('SO?')], hold: 2 },
          { actors: tScene(null, [TOAD], [], [plumber('lie')]), texts: [zz('z', 5, 4), toadSays('...')], hold: 3 },
        ]),
      )),
      take(
        ...captioned('Toad threw a mushroom at the glove. Denied.', [
          ...tStart(),
          { actors: tScene(T_HOVER, [toadAt(TX, 'toad2')], [{ ...prop('mushroom', 26, 6), gone: 'toad' }]), hold: 1 },
          { actors: tScene(T_HOVER, [TOAD], [{ ...prop('mushroom', 22, -2), gone: 'toad' }, bonk(24, -4, { fixed: true })]), hold: 1 },
          { actors: tScene(T_ENTER, [TOAD], [{ ...prop('mushroom', 26, 6), gone: 'toad' }]), texts: [toadSays('1-UP. NO.', TX, 2)], hold: 2 },
          { actors: tScene(null, [TOAD], [{ ...prop('mushroom', 26, 6), gone: 'toad' }]), texts: [toadAbove('NOT FOR YOU.')], hold: 3 },
        ]),
      ),
    ],
    snapped: [
      take(
        ...captioned('Toad left for another castle. Which? Another.', [
          ...tStart(),
          { actors: tScene(T_HOVER), texts: [toadSays("THAT'S IT.")], hold: 3 },
          { actors: tScene(T_ENTER, [toadAt(TX, 'toad2')]), hold: 1 },
          { actors: tScene(null, [zip()]), hold: 1 },
          { actors: tScene(null, [zip(true)]), hold: 1 },
          { actors: tScene(null, []), hold: 2 },
          { actors: tScene(null, [], [], [plumber('stand'), ...his(sweat())]), texts: [says('TOAD?')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Toad quit. The princess can find herself.', [
          ...tStart(),
          { actors: tScene(T_HOVER), texts: [toadSays('I QUIT.')], hold: 3 },
          { actors: tScene(null), texts: [toadAbove('FIND HER YOURSELF.')], hold: 3 },
          { actors: tScene(null, [toadAt(26, 'toad2')]), hold: 1 },
          { actors: tScene(null, [toadAt(34, 'toad1', { offstage: true })]), hold: 1 },
          { actors: tScene(null, [toadAt(42, 'toad2', { offstage: true })]), hold: 1 },
          { actors: tScene(null, []), texts: [says('...')], hold: 3 },
        ]),
      ),
    ],
  },
  // The retainer's rest: the plumber looks for him where he stood.
  rest: loop(
    { actors: [plumber('stand')], hold: 4 },
    { actors: his(lookBack()), texts: [says('?')], hold: 4 },
    { actors: [plumber('stand'), at('zipThin', TOADS.right + 6, TOADS.y + 3, { flip: true })], hold: 3 },
    { actors: [plumber('stand')], texts: [says('TOAD?')], hold: 4 },
    { actors: [plumber('stand')], hold: 3 },
  ),
}

const actions: ThemeAction[] = [pokePlumber, hitBlock, pokeToad]

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
  actions,
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
