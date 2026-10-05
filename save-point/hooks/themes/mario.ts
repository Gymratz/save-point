// "Super Context Bros.": a side-scrolling platformer homage. Every sprite is
// drawn fresh for this theme in that 8-bit style.
//
// The model is the plumber's power-up form (Small, Super, Cape, Star), the
// effort is the P-meter and the item he throws, the context is how far along
// the course you are (WORLD 1-1 to 8-4), coins are cents and TIME is the cache.

import { at, hero, loop, once, weapon } from './kit'
import type { Theme } from './types'

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
  hurt: '#fcfcfc',
  hurtB: '#fca044',
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
  F: '#f83800', // fire
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
/** Twinkles around the star-powered plumber: `ch` on the empty pixels named. */
const twinkle = (rows: Rows, pts: [number, number, string?][]): Rows =>
  rows.map((r, y) => [...r].map((c, x) => pts.find(p => p[0] === x && p[1] === y && c === '.')?.[2] ?? (pts.some(p => p[0] === x && p[1] === y && c === '.') ? 'W' : c)).join(''))
/** Eyes shut for a doze: the eye's upper pixel becomes skin, the lower a lash. */
const shut = (rows: Rows, eyeRow: number): Rows => rows.map((r, y) => (y === eyeRow ? r.replace(/K/g, 'S') : y === eyeRow + 1 ? r.replace(/K/g, 'H') : r))
const flipRows = (rows: Rows): Rows => [...rows].reverse()

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
]
const superStand = [...SUPER_HEAD, ...SUPER_BODY]
const superWalk = [...SUPER_HEAD, ...SUPER_BODY.slice(0, 6), '....BBBBBBBBB...', '...BBBB..BBBB...', '.OOOOO....OOOO..', 'OOOOO......OOOO.']
const superAttack = [...SUPER_HEAD, SUPER_BODY[0]!, ...THROW_ARM, ...SUPER_BODY.slice(6)]
const superItemGet = [...RAISED_ARM, '....BBBBBBBBB...', ...SUPER_BODY.slice(7)]
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
const caped = (body: Rows, cape = CAPE_FLOW) => over(cape, body)
const capeStand = caped(capeBody([...SUPER_HEAD, ...SUPER_BODY.slice(0, 6)]))
const capeWalk = caped(capeBody([...SUPER_HEAD, ...SUPER_BODY.slice(0, 6)], CAPE_STRIDE), CAPE_BILLOW)
const capeAttack = caped(capeBody([...SUPER_HEAD, SUPER_BODY[0]!, ...THROW_ARM]), CAPE_BILLOW)
const capeItemGet = caped(capeBody([...RAISED_ARM, '..SSBBBBBBBB....']))
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
const STAR_A: [number, number, string?][] = [[1, 1], [19, 0, 'Y'], [21, 6], [3, 3, 'Y'], [20, 13]]
const STAR_B: [number, number, string?][] = [[2, 0, 'Y'], [20, 2], [0, 7], [21, 10, 'Y'], [17, 16]]

// ---------------------------------------------------------------------------
// The item box: one 5x6 icon per tier (the box widget picks it by tier)
// ---------------------------------------------------------------------------

const ITEM_MUSHROOM = ['.RWR.', 'RWWRR', 'RRRWR', '.KSK.', '.SSS.', '.....'] // red for Super, green for the brother
const ITEM_FLOWER = ['.FeF.', 'FeWeF', '.FeF.', '..g..', 'gGgGg', '.ggg.']
const ITEM_FEATHER = ['....W', '...WC', '..WCC', '.WCCc', 'WCCc.', 'Cc...']
const ITEM_STAR = ['..Y..', '..Y..', 'YYYYY', '.KYK.', '.YYY.', 'Y...Y']

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

const QMARK_BLOCK = ['.qqqqqq.', 'qKqzzqKQ', 'qqzqqzqQ', 'qqqqqzqQ', 'qqqqzqqQ', 'qqqqqqqQ', 'qKqqzqKQ', '.QQQQQQ.']
const BRICK = ['pppNpppp', 'nnnNnnnn', 'nnnNnnnn', 'NNNNNNNN', 'ppppppNp', 'nnnnnnNn', 'nnnnnnNn', 'NNNNNNNN']
const PIPE = ['KKKKKKKKKKKKKKKK', 'KxxvvvvvvvvvVVVK', 'KxxvvvvvvvvvVVVK', 'KKKKKKKKKKKKKKKK', ...Array.from({ length: 12 }, () => '.KxvvvvvvvvvVVK.')]

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
const CLOUD = ['.....WWW......', '...WWWWWWW....', '..WWWWWWWWWW..', '.WWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', 'WWlWWWWlWWWWlW', '.llllllllllll.']
const BUSH = CLOUD.map(r => r.replace(/W/g, 'g').replace(/l/g, 'G'))

const sprites: Theme['sprites'] = {
  // Small
  smallStand: { rows: smallStand },
  smallWalk: { rows: smallWalk },
  smallAttack: { rows: smallAttack },
  smallItemGet: { rows: smallItemGet },
  smallSleep: { rows: shut(smallStand, 2) },
  smallLie: { rows: smallLie },
  // Super (the standard hero)
  stand: { rows: superStand },
  walk: { rows: superWalk },
  attack: { rows: superAttack },
  itemGet: { rows: superItemGet },
  sleep: { rows: shut(superStand, 2) },
  lie: { rows: superLie },
  // Cape
  capeStand: { rows: capeStand },
  capeWalk: { rows: capeWalk },
  capeAttack: { rows: capeAttack },
  capeItemGet: { rows: capeItemGet },
  capeSleep: { rows: shut(capeStand, 2) },
  capeLie: { rows: capeLie },
  // Star
  starStand: { rows: twinkle(capeStand, STAR_A) },
  starWalk: { rows: twinkle(capeWalk, STAR_B) },
  starAttack: { rows: twinkle(capeAttack, STAR_A) },
  starItemGet: { rows: twinkle(capeItemGet, STAR_B) },
  starSleep: { rows: twinkle(shut(capeStand, 2), STAR_B) },
  starLie: { rows: capeLie },
  // Thrown items, stored upside down: they are drawn flipped (as the About tab draws them)
  shell: { rows: flipRows(['..GGG..', '.GgWgG.', 'GgWgWgG', 'GgggggG', 'WWWWWWW', '.WWWWW.']) },
  fireball: { rows: ['.FeF.', 'FeYeF', 'eYWYe', 'FeYeF', '.FeF.'] },
  iceball: { rows: ['.AaA.', 'AaWaA', 'aWWWa', 'AaWaA', '.AaA.'] },
  hammer: { rows: flipRows(['MmmmmM', 'MmmmmM', 'MMMMMM', '..OO..', '..OO..', '..OO..', '..OO..']) },
  star: { rows: flipRows(['...Y...', '..YYY..', 'YYYYYYY', '.YKYKY.', '..YYY..', '.YY.YY.', '.Y...Y.']) },
  starAura: { rows: flipRows(['W.......W', '.........', '.........', '.........', '.........', '.........', '.........', '.........', 'W.......W']) },
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
  hillBig: { rows: hill(10) },
  hillSmall: { rows: hill(6) },
  cloud: { rows: CLOUD },
  bush: { rows: BUSH },
  castle: {
    rows: [
      '...n.nn.n...',
      '...nnnnnn...',
      '...nNnnNn...',
      '...nNnnNn...',
      '...nnnnnn...',
      'n.nn.nn.nn.n',
      'nnnnnnnnnnnn',
      'nnnNnnnnNnnn',
      'nnnnnKKnnnnn',
      'nNnnKKKKnnNn',
      'nnnnKKKKnnnn',
      'NnnnKKKKnnnN',
    ],
  },
  // Characters
  walker1: { rows: ['..dddd..', '.dddddd.', 'dKWddWKd', 'dKWddWKd', 'dddddddd', '.ffffff.', 'KKffffK.', 'KKK..KKK'] },
  walker2: { rows: ['..dddd..', '.dddddd.', 'dKWddWKd', 'dKWddWKd', 'dddddddd', '.ffffff.', '.KffffKK', 'KKK..KKK'] },
  walkerFlat: { rows: ['.dddddd.', 'dKWddWKd', 'KKKffKKK'] },
  toad1: { rows: ['..RWWR..', '.WWRRWW.', 'RWWRRWWR', 'WWWWWWWW', '.SKSSKS.', '..SSSS..', '.BBWWBB.', 'SBBBBBBS', '..WWWW..', '.OO..OO.'] },
  toad2: { rows: ['..RWWR..', '.WWRRWW.', 'RWWRRWWR', 'WWWWWWWW', '.SKSSKS.', '..SSSS..', '.BBWWBB.', '.SBBBBS.', '..WWWW..', 'OO....OO'] },
  mushroom: { rows: ['..RRWW..', '.RRRWWR.', 'RWWRRRRR', 'WWWRRWWR', 'RRRRRWWR', '.SKSSKS.', '.SKSSKS.', '..SSSS..'] },
  sweat: { rows: ['.A.', 'AaA', '.A.'] },
  // Status bar
  coinIcon: { rows: ['.Y.', 'YWy', 'YWy', 'YWy', '.y.'] },
  itemMushroom: { rows: ITEM_MUSHROOM },
  itemFlower: { rows: ITEM_FLOWER },
  itemFeather: { rows: ITEM_FEATHER },
  itemStar: { rows: ITEM_STAR },
  arrowOff: { rows: ['X..', 'XX.', 'XXX', 'XX.', 'X..'], legend: { X: 'arrowOff' } },
  arrowOn: { rows: ['X..', 'XX.', 'XXX', 'XX.', 'X..'], legend: { X: 'W' } },
  pOff: { rows: ['XXXX.', 'X...X', 'XXXX.', 'X....', 'X....'], legend: { X: 'arrowOff' } },
  pOn: { rows: ['XXXX.', 'X...X', 'XXXX.', 'X....', 'X....'], legend: { X: 'W' } },
}

// ---------------------------------------------------------------------------
// Animations. Actors sit relative to the hero's top-left; the ground is y 16.
// ---------------------------------------------------------------------------

/** The thrown item, stored upside down (see the sprites), so drawn flipped. */
const thrown = (x: number, y: number) => weapon(x, y, { flipY: true })
const txt = (text: string, x: number, y: number, color = '#fcfcfc') => ({ text, x, y, color })

const BLOCK = { x: 4, y: -12 }
const block = (dy = 0, swap?: Record<string, string>) => at('qblock', BLOCK.x, BLOCK.y + dy, { swap })
const SHIMMER = { q: 'qLight' }
const PIPE_AT = { x: 0, y: 4 }
const pipe = () => at('pipe', PIPE_AT.x, PIPE_AT.y)
const ON_PIPE = PIPE_AT.y - 16
const FLASH = { R: 'hurt', r: 'hurt', B: 'hurtB', C: 'hurt', c: 'hurtB', O: 'hurtB' }
const bricks = (top = true) => [at('brick', 20, 8), ...(top ? [at('brick', 20, 0)] : [])]

const states: Theme['states'] = {
  idle: loop(
    { actors: [hero('lie')], texts: [txt('z', 6, 2)], hold: 3 },
    { actors: [hero('lie')], texts: [txt('z', 7, 0)], hold: 3 },
    { actors: [hero('lie')], texts: [txt('Z', 8, -2)], hold: 3 },
    { actors: [hero('lie')], hold: 3 },
  ),
  thinking: loop(
    { actors: [hero('stand')], texts: [txt('.', 17, -2)], hold: 2 },
    { actors: [hero('walk')], texts: [txt('..', 17, -2)], hold: 1 },
    { actors: [hero('stand')], texts: [txt('..', 17, -2)], hold: 1 },
    { actors: [hero('walk')], texts: [txt('...', 17, -2)], hold: 1 },
    { actors: [hero('stand')], texts: [txt('...', 17, -2)], hold: 1 },
    { actors: [hero('stand')], texts: [txt('?', 17, -4)], hold: 2 },
  ),
  reading: loop(
    { actors: [hero('stand'), block()], hold: 2 },
    { actors: [hero('stand'), block(0, SHIMMER)], hold: 1 },
    { actors: [hero('itemGet', 0, -4), block(-1), at('coin', 5, -18)], hold: 1 },
    { actors: [hero('itemGet', 0, -2), block(0, SHIMMER), at('coinSpin', 6, -18)], hold: 1 },
    { actors: [hero('stand'), block(), at('sparkle', 5, -18)], texts: [txt('+1', 14, -16, '#fcd800')], hold: 1 },
    { actors: [hero('stand'), block(0, SHIMMER)], hold: 1 },
  ),
  editing: loop(
    { actors: [hero('stand'), ...bricks()], hold: 2 },
    { actors: [hero('attack'), ...bricks(), thrown(14, 6)], hold: 1 },
    { actors: [hero('attack'), ...bricks(), thrown(18, 3)], hold: 1 },
    { actors: [hero('stand'), ...bricks(false), at('debris', 18, -1), at('debris', 26, -1), at('debris', 18, 4), at('debris', 26, 4)], hold: 1 },
    { actors: [hero('stand'), ...bricks(false), at('debris', 16, -4), at('debris', 28, -4), at('debris', 17, 3), at('debris', 27, 3)], hold: 1 },
    { actors: [hero('stand'), ...bricks(false), at('debris', 15, 2), at('debris', 29, 2), at('debris', 16, 10), at('debris', 28, 10)], hold: 1 },
    { actors: [hero('stand'), ...bricks(false)], hold: 1 },
  ),
  shell: loop(
    { actors: [hero('stand', 0, ON_PIPE), pipe()], hold: 2 },
    { actors: [hero('stand', 0, ON_PIPE + 5), pipe()], hold: 1 },
    { actors: [hero('stand', 0, ON_PIPE + 10), pipe()], hold: 1 },
    { actors: [hero('stand', 0, ON_PIPE + 15), pipe()], hold: 1 },
    { actors: [pipe()], texts: [txt('. . .', 4, -2)], hold: 2 },
    { actors: [hero('itemGet', 0, ON_PIPE + 12), pipe()], hold: 1 },
    { actors: [hero('itemGet', 0, ON_PIPE + 5), pipe()], hold: 1 },
    { actors: [hero('itemGet', 0, ON_PIPE), pipe()], hold: 1 },
  ),
  agents: loop(
    { actors: [at('toad1', 6, 6), at('toad2', 2, 6, { flip: true }), hero('itemGet')], hold: 1 },
    { actors: [at('toad2', 15, 6), at('toad1', -6, 6, { flip: true }), hero('itemGet')], hold: 1 },
    { actors: [at('toad1', 22, 6), at('toad2', -11, 6, { flip: true }), hero('itemGet')], hold: 1 },
    { actors: [at('toad2', 29, 6), at('toad1', -16, 6, { flip: true }), hero('stand')], hold: 1 },
    { actors: [at('toad1', 36, 6), at('toad2', -21, 6, { flip: true }), hero('stand')], hold: 1 },
    { actors: [hero('stand')], hold: 2 },
  ),
}

const clear = { text: ' COURSE CLEAR! ', x: -11, y: -18, color: '#fcfcfc', bg: '#000000' }

const SIGH = 'Overpowered for a coin block.'
const sweat = at('sweat', 15, -1)
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), block(), sweat], hold: 2, caption: SIGH },
    { actors: [hero('itemGet', 0, -4), block(-1), at('coin', 5, -18), sweat], hold: 1, caption: SIGH },
    { actors: [hero('stand'), block(0, SHIMMER), sweat], texts: [txt('~sigh~', 17, 2)], hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [hero('stand', 0, ON_PIPE), pipe(), sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand', 0, ON_PIPE + 8), pipe()], hold: 1, caption: SIGH },
    { actors: [pipe()], hold: 1, caption: SIGH },
    { actors: [hero('stand', 0, ON_PIPE), pipe(), sweat], texts: [txt('~sigh~', 17, -10)], hold: 3, caption: SIGH },
  ),
}

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('stand'), at('walker1', 20, 8)], hold: 1 },
    { actors: [hero('itemGet', 0, -10), at('walker2', 12, 8)], hold: 1 },
    { actors: [hero('stand', 0, -8), at('walker1', 4, 8)], hold: 1 },
    { actors: [at('walkerFlat', 4, 13), hero('stand', 0, -3)], texts: [txt('100', 16, -8)], hold: 2 },
    { actors: [hero('stand')], texts: [txt('100', 16, -12)], hold: 1 },
  ),
  toolError: once(
    { actors: [hero('stand'), at('walker1', 14, 8)], hold: 1 },
    { actors: [hero('stand', -2, 0, FLASH), at('walker2', 16, 8)], hold: 1 },
    { actors: [{ ...at('smallStand', 0, 4), tier: true }, at('walker1', 18, 8)], hold: 1 },
    { actors: [hero('stand', -2, 0, FLASH), at('walker2', 20, 8)], hold: 1 },
    { actors: [{ ...at('smallStand', 0, 4), tier: true }], hold: 1 },
    { actors: [hero('stand', -2, 0)], hold: 1 },
  ),
  turnComplete: once(
    { actors: [at('pole', 18, -18), at('flag', 20, -15), hero('walk')], hold: 1 },
    { actors: [at('pole', 18, -18), at('flag', 20, -15), hero('itemGet', 3, -12)], hold: 1 },
    { actors: [at('pole', 18, -18), at('flag', 20, -8), hero('itemGet', 3, -6)], hold: 1 },
    { actors: [at('pole', 18, -18), at('flag', 20, 0), hero('itemGet', 3, 0)], hold: 1 },
    {
      actors: [at('pole', 18, -18), at('flag', 20, 6), hero('stand')],
      texts: [clear, txt('*', 26, -14, '#fcd800')],
      hold: 3,
    },
    {
      actors: [at('pole', 18, -18), at('flag', 20, 6), hero('itemGet')],
      texts: [clear, txt('*', 26, -14, '#f83800'), txt('*', -8, -10, '#fcd800'), txt('*', 32, -6, '#fcfcfc')],
      hold: 4,
    },
  ),
  milestone: once({ actors: [hero('stand')], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [hero('stand')], texts: [{ text: ' TIME 000 ', x: 17, y: -6, color: '#f83800', bg: '#000000' }], hold: 2 },
    { actors: [hero('itemGet', 0, -6)], texts: [{ text: ' TIME 000 ', x: 17, y: -6, color: '#f83800', bg: '#000000' }], hold: 1 },
    { actors: [hero('lie')], hold: 2 },
    { actors: [hero('lie')], message: 'cacheCold', hold: 12 },
  ),
  limitWarning: once(
    { actors: [hero('walk')], message: 'limitWarning', hold: 1 },
    { actors: [hero('stand')], message: 'limitWarning', hold: 1 },
    { actors: [hero('walk')], message: 'limitWarning', hold: 1 },
    { actors: [hero('stand')], message: 'limitWarning', hold: 12 },
  ),
  compaction: once(
    { actors: [hero('stand', 0, ON_PIPE), pipe()], hold: 1, caption: 'compaction' },
    { actors: [hero('stand', 0, ON_PIPE + 8), pipe()], hold: 1, caption: 'compaction' },
    { actors: [hero('stand', 0, ON_PIPE + 15), pipe()], hold: 1, caption: 'compaction' },
    { actors: [pipe()], texts: [txt('WHOOSH!', 18, -6)], hold: 2, caption: 'compaction' },
    { actors: [hero('itemGet', 0, ON_PIPE + 6), pipe()], hold: 1, caption: 'compaction' },
    { actors: [hero('itemGet', 0, ON_PIPE), pipe()], hold: 3, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [hero('stand'), at('mushroom', 22, 8)], hold: 1 },
    { actors: [hero('stand'), at('mushroom', 15, 8)], hold: 1 },
    { actors: [{ ...at('smallStand', 2, 4), tier: true }], hold: 1 },
    { actors: [hero('stand', 0, 0, FLASH)], hold: 1 },
    { actors: [{ ...at('smallStand', 2, 4), tier: true }], hold: 1 },
    { actors: [hero('stand')], hold: 1 },
    { actors: [hero('itemGet')], hold: 5, caption: 'modelChange' },
  ),
  effortChange: once(
    { actors: [hero('itemGet'), thrown(12, -8)], texts: [txt('>', 18, -2)], hold: 1 },
    { actors: [hero('itemGet'), thrown(12, -8)], texts: [txt('>>', 18, -2)], hold: 1 },
    { actors: [hero('itemGet'), thrown(12, -8)], texts: [txt('>>>', 18, -2)], hold: 1 },
    { actors: [hero('itemGet'), thrown(12, -8)], texts: [txt('>>>>', 18, -2)], hold: 1 },
    { actors: [hero('itemGet'), thrown(12, -8)], texts: [txt('>>>>', 18, -2), txt('P', 22, -2, '#fcd800')], hold: 5, caption: 'effortChange' },
  ),
}

const SMALL_POSES = { stand: 'smallStand', walk: 'smallWalk', attack: 'smallAttack', itemGet: 'smallItemGet', sleep: 'smallSleep', lie: 'smallLie' }
const CAPE_POSES = { stand: 'capeStand', walk: 'capeWalk', attack: 'capeAttack', itemGet: 'capeItemGet', sleep: 'capeSleep', lie: 'capeLie' }
const STAR_POSES = { stand: 'starStand', walk: 'starWalk', attack: 'starAttack', itemGet: 'starItemGet', sleep: 'starSleep', lie: 'starLie' }

export const mario: Theme = {
  id: 'mario',
  name: 'Super Context Bros.',
  description: 'Platformer homage: a power-up per model, a P-meter for effort, coins, WORLD and TIME',
  version: '1.0.0',
  palette: {
    dark: { accent: '#58d854', gold: '#fcd800', red: '#f83800', label: '#fca044', dim: '#9c9c9c', text: '#fcfcfc' },
    light: { accent: '#108c10', gold: '#a87000', red: '#c02000', label: '#c04c00', dim: '#6c6c6c', text: '#1c1c1c' },
  },
  pixels,
  labels: {
    context: 'WORLD',
    spend: 'COINS',
    cache: 'TIME',
    limits: 'LIVES',
    modelItem: 'POWER-UP',
    effortItem: 'P-METER',
    heroes: 'Power-ups',
    weapons: 'Items',
  },
  headings: {
    Context: 'World',
    Cost: 'Coins',
    'Next message': 'Time',
    Tokens: 'Score',
    Limits: 'Lives',
    'Tool calls': 'Blocks hit',
    Files: 'Course map',
  },
  sprites,
  states,
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
      decor: [
        { sprite: 'hillBig', x: 0, y: 26 },
        { sprite: 'hillSmall', x: -18, y: 30 },
        { sprite: 'cloud', x: 3, y: 2 },
        { sprite: 'cloud', x: -16, y: 6 },
        { sprite: 'bush', x: 30, y: 29 },
        { sprite: 'castle', x: -1, y: 24 },
      ],
      particles: [
        { colors: ['W', 'Y', 'l'], count: 14, drift: 'none', minPercent: 55 },
        { colors: ['F', 'e'], count: 6, drift: 'up', speed: 1, minPercent: 80 },
      ],
    },
    hero: { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'sleep', lie: 'lie' },
    heroTiers: {
      tier1: {},
      tier2: {},
      tier3: {},
      tier4: { R: 'starR', r: 'starr', B: 'starB', H: 'starH', C: 'starC', c: 'starc' },
      unknown: { R: 'luigiG', r: 'luigiS', B: 'luigiB' },
    },
    heroForms: {
      tier1: { poses: SMALL_POSES, dx: 2, dy: 4, lift: -4 },
      tier3: { poses: CAPE_POSES, dx: -6, dy: -2, lift: 2 },
      tier4: { poses: STAR_POSES, dx: -6, dy: -2, lift: 2 },
    },
    lineup: { ground: 'sky', flipWeapons: true },
    heroNames: {
      tier1: 'Small Plumber',
      tier2: 'Super Plumber',
      tier3: 'Cape Champion',
      tier4: 'Invincible Star',
      unknown: 'Green Brother',
    },
    weapons: {
      low: { sprite: 'shell', swap: {}, name: 'Green Shell' },
      medium: { sprite: 'fireball', swap: {}, name: 'Fire Flower' },
      high: { sprite: 'iceball', swap: {}, name: 'Ice Flower' },
      xhigh: { sprite: 'hammer', swap: {}, name: 'Hammer Suit' },
      max: { sprite: 'star', swap: {}, aura: 'starAura', name: 'Super Star' },
    },
    bar: {
      widgets: [
        { kind: 'counter', value: 'spend', icon: 'coinIcon', format: 'x{v}', digits: 2 },
        { kind: 'counter', value: 'world', label: 'WORLD' },
        { kind: 'counter', value: 'cacheSeconds', label: 'TIME', digits: 3 },
        { kind: 'box', shows: 'model', sprite: 'itemMushroom', sprites: { tier2: 'itemFlower', tier3: 'itemFeather', tier4: 'itemStar' }, label: 'ITEM', x: 1, y: 4, drop: 1 },
        { kind: 'meter', value: 'effort', count: 5, perRow: 5, sprites: ['arrowOff', 'arrowOn'], last: ['pOff', 'pOn'], label: 'P-METER' },
      ],
      colors: { bg: 'black', box: 'boxFrame', text: 'W', label: 'W', map: 'arrowOff', mapDot: 'Y' },
    },
  },
  text: {
    idle: 'The plumber naps in the meadow. zzz...',
    thinking: 'The plumber taps his foot and looks around.',
    reading: 'The plumber bumps a ? block. A coin!',
    editing: 'The plumber smashes bricks.',
    shell: 'The plumber dives down a warp pipe.',
    agents: 'Retainers dash off on errands.',
    toolSuccess: 'Stomp! 100 points.',
    toolError: 'Ouch! The plumber takes a hit.',
    turnComplete: 'Course clear! Down the flagpole.',
    milestone: 'A new world begins.',
    cacheCold: 'TIME UP! The cache went cold.',
    limitWarning: 'HURRY UP! A limit runs low.',
    compaction: 'Whoosh! Through the warp pipe.',
    modelChange: 'A power-up! The plumber changes form.',
    effortChange: 'The P-meter changes: a new item!',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: "LET'S-A GO! {pct}% OF THE COURSE IS BEHIND YOU. PLENTY OF TIME." },
    { level: 'warn', message: '{pct}% OF THE COURSE IS BEHIND YOU. MIND THE GAPS.' },
    { level: 'orange', message: '{pct}% OF THE COURSE IS BEHIND YOU. LOOK FOR A CHECKPOINT FLAG.' },
    { level: 'alert', message: 'HURRY UP! {pct}% OF THE COURSE IS BEHIND YOU. THE CASTLE IS NEAR.' },
    { level: 'critical', message: 'THANK YOU, PLUMBER! BUT YOUR CONTEXT IS IN ANOTHER WINDOW! {pct}% USED. SAVE YOUR PROGRESS, THEN /clear.' },
  ],
  messages: {
    cacheCold: 'TIME UP! YOUR CACHE WENT COLD.',
    limitWarning: 'HURRY UP! {name} AT {pct}%.',
    compaction: 'Down the warp pipe! The course was compacted.',
    modelChange: '{name} enters the course!',
    effortChange: 'You got the {weapon}!',
  },
}
