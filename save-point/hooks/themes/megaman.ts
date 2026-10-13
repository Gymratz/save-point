// "Mega Context": an 8-bit blue-bomber action homage. Every sprite is drawn fresh for this theme in that NES style.
//
// The model is the robot on stage (the helper bot, the Blue Bomber, the winged
// Super Adaptor, the rival fused with his wolf, the whistling stranger), effort
// is the shot the buster fires, context is the life energy ticks, the cache is
// weapon energy, cents are bolts, the rate limits are the boss's energy bar
// (it fills as a limit is used), and the Doctor's skull fortress rises on a
// reddening sky as the context fills.
//
// The stranger is the Blue Bomber's rows recolored under a scarf and a shield;
// the helper bot and the two big forms have rows of their own.

import { at, hero, loop, once, weapon } from './kit'
import type { Actor, Animation, Frame, HeroTier, SceneText, Theme, ThemeAction } from './types'

const pixels = {
  // The Blue Bomber
  K: '#000000', // outline
  D: '#0070ec', // helmet, hands, boots
  B: '#3cbcfc', // suit
  S: '#fcd8a8', // skin
  W: '#fcfcfc',
  // The helper bot
  Y: '#f8d878', // hair
  R: '#d82800', // dress, armor
  g: '#30b830', // ribbon
  // The Super Adaptor
  G: '#fcc400', // gold
  o: '#b07000',
  // The rival and his wolf
  n: '#34343e', // black armor
  N: '#787888', // armor sheen
  P: '#a060f8', // wolf wings
  p: '#5c28b0',
  // The stranger
  V: '#3c3c50', // visor
  x: '#b8b8c8', // grey
  s: '#fcd800', // scarf
  // Shots and effects
  c: '#a8f0fc', // charge
  e: '#f8f8a0', // lemon
  m: '#d0d0d8', // metal
  M: '#787880',
  O: '#fc9838', // flame, orange
  // Scenery
  f: '#a8b0c0', // floor block
  F: '#505868',
  h: '#e8ecf8',
  k: '#24202c', // fortress
  q: '#585068',
  Q: '#3c3448',
  u: '#e8e0d0', // skull
  v: '#6480b4', // the fortress far off, in haze
  // Hurt flash
  hurtA: '#fcfcfc',
  hurtB: '#fc7460',
  // Shot-get palette flashes
  bladeA: '#c8c8c8',
  bladeB: '#787878',
  bombA: '#a060f8',
  bombB: '#4818a0',
  chargeA: '#a8f0fc',
  chargeB: '#2890d8',
  // Status bar
  black: '#000000',
  tickOff: '#2c2c3c',
  barLabel: '#fc9838',
  boxFrame: '#3cbcfc',
}

type Rows = string[]

/** Pads every row to the widest. */
const sp = (rows: Rows): { rows: Rows } => {
  const w = Math.max(...rows.map(r => r.length))
  return { rows: rows.map(r => r.padEnd(w, '.')) }
}
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
const recolor = (rows: Rows, map: Record<string, string>): Rows => rows.map(r => [...r].map(c => map[c] ?? c).join(''))
const shift = (rows: Rows, left: number, width: number): Rows => rows.map(r => ('.'.repeat(left) + r).padEnd(width, '.'))
const blank = (w: number, h: number): Rows => Array.from({ length: h }, () => '.'.repeat(w))
/** Eyes shut: the rows naming the eyes lose their whites. */
const shut = (rows: Rows, eyeRows: number[]): Rows =>
  rows.map((r, y) => (y === eyeRows[0] ? r.replace(/WK/g, 'SS') : y === eyeRows[1] ? r.replace(/WK/g, 'KK') : r))

// ---------------------------------------------------------------------------
// The Blue Bomber (16x16, the standard hero)
// ---------------------------------------------------------------------------

const MM_HEAD = [
  '.....KKKKKK.....',
  '....KDDDBBDK....',
  '...KDDDDDBBDK...',
  '..KDDDDDDDBDDK..',
  '..KBBDDKKKKKDK..',
  '..KBBDKSSSSSSK..',
  '..KBBDKSWKSWKK..',
  '..KDDDKSWKSWKK..',
  '...KDDKSSSSSK...',
]
const MM_BODY = ['....KKKBBKKK....', '...KBBBBBBBBK...', '..KDKBBBBBBKDK..', '..KDKDDDDDDKDK..']
const MM_LEGS = ['...KBBBK.KBBBK..', '..KDDDK..KDDDK..', '.KDDDDK..KDDDDK.']
const MM_STEP = ['...KBBBK.KBBBBK.', '..KDDDK..KDDDDDK', '.KDDDDK.........']
const MM_GUN = ['....KKKBBKKK....', '...KBBBBBBBBKKKK', '..KDKBBBBBBDDDDK', '..KDKDDDDDDKDDDK']
const MM_GUN_LEGS = ['...KBBBK.KBBBKKK', ...MM_LEGS.slice(1)]
const MM_UP_HEAD = [
  '.....KKKKKK.....',
  '....KDDDBBDK....',
  'KK.KDDDDDBBDK.KK',
  'KDKDDDDDDDBDDKDK',
  'KDKBBDDKKKKKDKDK',
  'KBKBBDKSSSSSSKBK',
  'KBKBBDKSWKSWKKBK',
  '.KKDDDKSWKSWKKK.',
  '...KDDKSSSSSK...',
]
const MM_UP_BODY = ['....KKKBBKKK....', '...KBBBBBBBBK...', '...KBBBBBBBBK...', '...KKDDDDDDKK...']

const mmStand = [...MM_HEAD, ...MM_BODY, ...MM_LEGS]
const mmWalk = [...MM_HEAD, ...MM_BODY, ...MM_STEP]
const mmAttack = [...MM_HEAD, ...MM_GUN, ...MM_GUN_LEGS]
const mmItemGet = [...MM_UP_HEAD, ...MM_UP_BODY, ...MM_LEGS]
const mmSleep = shut(mmStand, [6, 7])

// ---------------------------------------------------------------------------
// The helper bot (18x15): blonde ponytail, green ribbon, red dress. Two columns
// wider than her body on the left, so a raised arm clears the ribbon.
// ---------------------------------------------------------------------------

const ROLL_W = 18
const roll = (rows: Rows): Rows => shift(rows, 2, ROLL_W)
const ROLL_HEAD = roll([
  '.....KKKKKK.....',
  '...KKYYYYYYK....',
  '..KYYYYYYYYYK...',
  '.KYYYYYYYYYYYK..',
  'KYYYYYKYYYYYYK..',
  'KggYYKSSSSSSYK..',
  'KggYKSSWKSWKSK..',
  'KYYYKSSWKSWKSK..',
  'KYYYYKSSSSSSK...',
  'KYYYKKKSSSKK....',
])
const ROLL_BODY = roll(['.KYKKRRRRRRK....', '..KSKRRRRRRKSK..', '..KKRRRRRRRRRK..'])
const ROLL_LEGS = roll(['...KKKSKKKSKK...', '...KRRK...KRRK..'])
const ROLL_STEP = roll(['...KKKSKKKRRK...', '...KRRK.........'])
const ROLL_POINT = roll(['.KYKKRRRRRRKKKK.', '..KSKRRRRRRKSSSK', '..KKRRRRRRRRRKK.'])
const ROLL_UP_ARMS = ['', '', '', 'KK..............KK', 'KS..............SK', 'KS..............SK', 'KS..............SK', '.K..............K.']
const ROLL_UP_BODY = roll(['.KYKKRRRRRRK....', '...KKRRRRRRK....', '..KKRRRRRRRRRK..'])

const rollStand = [...ROLL_HEAD, ...ROLL_BODY, ...ROLL_LEGS]
const rollWalk = [...ROLL_HEAD, ...ROLL_BODY, ...ROLL_STEP]
const rollAttack = [...ROLL_HEAD, ...ROLL_POINT, ...ROLL_LEGS]
const rollItemGet = over([...ROLL_HEAD, ...ROLL_UP_BODY, ...ROLL_LEGS], ROLL_UP_ARMS)
const rollSleep = shut(rollStand, [6, 7])

// ---------------------------------------------------------------------------
// The whistling stranger (20x16): red helm, dark visor, yellow scarf, shield
// ---------------------------------------------------------------------------

const PROTO = { D: 'R', B: 'x' }
/** The visor over the eyes; its glint goes out when he blinks. */
const visor = (rows: Rows, glint: boolean): Rows =>
  rows.map((r, y) => (y === 6 ? r.replace('SWKSWK', glint ? 'VVVVxV' : 'VVVVVV') : y === 7 ? r.replace('SWKSWK', 'SSSSSS') : r))
const SCARF = ['', '', '', '', '', '', '', '', '', '...KKKsssssK', '.KsssssK', 'Ksss.', '.KK', '', '', '']
const SCARF_FLAP = ['', '', '', '', '', '', '', '', 'KK', 'KssKKKsssssK', '.KssssK', '..KK', '', '', '', '']
const SHIELD = ['', '', '', '', '', '', '', '', '', '.KKKK.', 'KxRRxK', 'KRWWRK', 'KRWWRK', 'KRWWRK', 'KxRRxK', '.KKKK.']
const proto = (rows: Rows, scarf = SCARF, shield = true, glint = true): Rows => {
  const body = shift(visor(recolor(rows, PROTO), glint), 2, 20)
  const withBody = over(over(blank(20, 16), body), scarf.map(r => r.padEnd(20, '.')))
  return (shield ? over(withBody, SHIELD.map(r => r.padEnd(6, '.')), 14, 0) : withBody).map(r => r.slice(0, 20))
}
const protoStand = proto(mmStand)
const protoWalk = proto(mmWalk, SCARF_FLAP)
const protoAttack = proto(mmAttack, SCARF_FLAP, false)
const protoItemGet = proto(mmItemGet, SCARF, false)
const protoSleep = proto(mmStand, SCARF, true, false)

// ---------------------------------------------------------------------------
// The Super Adaptor (24x23): gold-crested helm, jet wings, rocket fist
// ---------------------------------------------------------------------------

const BIG_W = 24
const SA_CREST = [
  '........KK.....KK.......',
  '.......KGGK...KGGK......',
  '.......KGoGK.KGoGK......',
  '........KGoGKGoGK.......',
]
const SA_HEAD = shift(recolor(MM_HEAD, { D: 'R', B: 'G' }), 4, BIG_W)
const SA_BODY = [
  '.......KKKKGGKKKK.......',
  '.....KKGGGKRRRKGGGKK....',
  '....KGGGGGKRWRKGGGGGK...',
  '....KGoGGKRRRRRKGGoGK...',
  '....KRRRKBRRGRRBKRRRK...',
  '....KDDDKKBBBBBKKDDDK...',
]
const SA_LEGS = ['........KRRRKKRRRK......', '.......KRRRRKKRRRRK.....', '......KGGGGGKKGGGGGK....', '.....KGGGGGGK.KGGGGGGK..']
const SA_STEP = ['........KRRRKKRRRRK.....', '.......KRRRRK.KRRRRK....', '......KGGGGGK.KGGGGGGK..', '.....KGGGGGGK...........']
const SA_GUN = [
  '.......KKKKGGKKKK.......',
  '.....KKGGGKRRRKGGGKKKKK.',
  '....KGGGGGKRWRKRRRRRRRRK',
  '....KGoGGKRRRRRRRGGGGGGK',
  '....KRRRKBRRGRRBKRRRRRRK',
  '....KDDDKKBBBBBKKKKKKKK.',
]
// Arms up: the body without the hanging arms, and both forearms (H: fist, A and a: arm) laid over the wings beside the helm.
const SA_UP_BODY = [
  '.......KKKKGGKKKK.......',
  '.....KKGGGKRRRKGGGKK....',
  '....KGGGGGKRWRKGGGGGK...',
  '....KGoGGKRRRRRKGGoGK...',
  '.....KKKKBRRGRRBKKKK....',
  '........KKBBBBBKK.......',
]
const BIG_UP_ARMS = [
  '',
  '',
  '',
  '',
  '',
  '...KK..............KK...',
  '..KHHK............KHHK..',
  '..KHHK............KHHK..',
  '..KAaK............KaAK..',
  '..KAaK............KaAK..',
  '..KAaK............KaAK..',
  '...KAaK..........KaAK...',
  '...KAaK..........KaAK...',
  '....KAaK........KaAK....',
]
const SA_WINGS = [
  '',
  '',
  '',
  'KK',
  'KWK',
  '.KWK',
  '.KWWK................KK',
  'KKKWRK..............KWK',
  'KWWKWRK............KWWK',
  '.KWWWRRK..........KWWRK',
  '..KKWRRK.........KWWRK',
  'KKKWWRRK.........KWRRK',
  'KWWWWRRK.........KRRK',
  '.KKWWRRK.........KKK',
  '...KKRRK',
  '....KRK',
  '.....K',
  '',
  '',
  '',
  '',
  '',
  '',
].map(r => r.padEnd(BIG_W, '.'))
const winged = (rows: Rows) => over(SA_WINGS, rows)
const saStand = winged([...SA_CREST, ...SA_HEAD, ...SA_BODY, ...SA_LEGS])
const saWalk = winged([...SA_CREST, ...SA_HEAD, ...SA_BODY, ...SA_STEP])
const saAttack = winged([...SA_CREST, ...SA_HEAD, ...SA_GUN, ...SA_LEGS])
const saItemGet = over(winged([...SA_CREST, ...SA_HEAD, ...SA_UP_BODY, ...SA_LEGS]), recolor(BIG_UP_ARMS, { H: 'D', A: 'R', a: 'R' }))
const saSleep = shut(saStand, [10, 11])

// ---------------------------------------------------------------------------
// The rival fused with his wolf (24x23): black and gold, finned helm, wings
// ---------------------------------------------------------------------------

const FIN = ['..KK', '..KGK', '..KGnK', '...KGnK', '....KGnK', '.....KGnK', '......KK'].map(r => r.padEnd(12, '.'))
/** The rival's helm fins, left and mirrored right, laid over the helm. */
const BS_FINS = FIN.map(r => r + [...r].reverse().join(''))
const BS = { D: 'n', B: 'N' }
const BS_ARMOR = { R: 'n', W: 'R', B: 'N', D: 'G' }
const BS_HEAD = shift(recolor(MM_HEAD, BS), 4, BIG_W).map((r, y) => (y === 1 ? r.replace('KnnnNNnK', 'KnnRRnnK') : y === 2 ? r.replace('KnnnnnNNnK', 'KnnnRRnnnK') : r))
const BS_LEGS = recolor(SA_LEGS, { R: 'n' })
const BS_STEP = recolor(SA_STEP, { R: 'n' })
const BS_WINGS = [
  '',
  '',
  'K',
  'KPK',
  'KPPK',
  '.KPPK',
  'KPPPpK...............KK',
  'KPPPppK.............KPK',
  '.KPPPppK...........KPPK',
  'KPPPPppK..........KPPpK',
  'KPPPpppK.........KPPpK',
  '.KPPPppK.........KPppK',
  '..KPPPpK.........KppK',
  '.KPPPPpK.........KKK',
  '..KPPPpK',
  '...KPPK',
  '....KPK',
  '.....K',
  '',
  '',
  '',
  '',
  '',
].map(r => r.padEnd(BIG_W, '.'))
const bass = (body: Rows, legs: Rows) => over(over(BS_WINGS, [...blank(BIG_W, 4), ...BS_HEAD, ...recolor(body, BS_ARMOR), ...legs]), BS_FINS)
const bsStand = bass(SA_BODY, BS_LEGS)
const bsWalk = bass(SA_BODY, BS_STEP)
const bsAttack = bass(SA_GUN, BS_LEGS)
const bsItemGet = over(bass(SA_UP_BODY, BS_LEGS), recolor(BIG_UP_ARMS, { H: 'G', A: 'N', a: 'n' }))
const bsSleep = shut(bsStand, [10, 11])

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

/** Pads a shot to 9 rows, centered, so every shot flies at one height. */
const shot = (rows: Rows): { rows: Rows } => {
  const w = Math.max(...rows.map(r => r.length))
  const top = Math.floor((9 - rows.length) / 2)
  return sp([...blank(w, top), ...rows, ...blank(w, 9 - rows.length - top)])
}
const SHOT_W = 11
/** A shot held up: centered in the widest shot's width and resting on the sprite's last row, so each sits just over the middle of the head. */
const held = (s: { rows: Rows }): { rows: Rows } => {
  const inked = s.rows.filter(r => /[^.]/.test(r))
  const left = Math.floor((SHOT_W - (inked[0]?.length ?? 0)) / 2)
  return { rows: [...blank(SHOT_W, s.rows.length - inked.length), ...inked.map(r => ('.'.repeat(left) + r).padEnd(SHOT_W, '.'))] }
}

const SHOTS = {
  // Rimmed in a color that shows on the pale sky near the floor as well as on the red one.
  lemon: shot(['.ss.', 'sWWs', 'sWWs', '.ss.']),
  halfCharge: shot(['..DD..', '.DccD.', 'DcWWcD', 'DcWWcD', '.DccD.', '..DD..']),
  chargeShot: shot(['....DDDDD..', '.DD.DcccWD.', '...DcWWWWcD', 'DDDcWWWWWcD', 'DDDcWWWWWcD', '...DcWWWWcD', '.DD.DcccWD.', '....DDDDD..']),
  metalBlade: shot(['...M.M...', '.M.mmm.M.', '..mmMmm..', 'MmmMRMmmM', '.mMRKRMm.', 'MmmMRMmmM', '..mmMmm..', '.M.mmm.M.', '...M.M...']),
  blackHole: shot(['...PPP...', '.PPpppPP.', '.PpKKKpP.', 'PpKKKKKpP', 'PpKKWKKpP', 'PpKKKKKpP', '.PpKKKpP.', '.PPpppPP.', '...PPP...']),
}
// Ten rows, not eleven: fired at the buster's height, an eleventh would lie on the floor.
const AURA = ['.W.......P.', '', 'P.........W', '', '', '', '', 'W.........P', '', '.P.......W.'].map(r => r.padEnd(SHOT_W, '.'))

const TICK_ON = ['e.', 'W.', 'W.', 'W.', 'W.', 'W.', 'W.', 'e.']
const TICK_OFF = ['X.', 'X.', 'X.', 'X.', 'X.', 'X.', 'X.', 'X.']

/** The boss's energy bar as the stage shows it: nine ticks, `lit` of them from the bottom. */
const bossBar = (lit: number) => ({
  rows: ['KKKKK', ...Array.from({ length: 9 }, (_, k) => [9 - k <= lit ? 'KROOK' : 'KXXXK', 'KKKKK']).flat()],
  legend: { X: 'tickOff' },
})
const SLATS = (n: number): Rows => Array.from({ length: n }, (_, y) => (y % 3 === 2 ? 'KKKKKKKK' : y % 3 === 0 ? 'KmmmmmmK' : 'KMMMMMMK'))
const ETANK = ['.KKKKKK.', 'KmmmmmmK', 'KDBBBBDK', 'KDWWWBDK', 'KDWBBBDK', 'KDWWBBDK', 'KDWBBBDK', 'KDWWWBDK', 'KDBBBBDK', '.KKKKKK.']
/** The E-Tank drained down to row `from`. */
const drained = (from: number): Rows => ETANK.map((r, y) => (y < from ? r.replace(/B/g, 'n') : r))
const BEAM = (n: number): Rows => Array.from({ length: n }, (_, y) => (y % 3 === 0 ? '.WW.' : 'cWWc'))

const sprites: Theme['sprites'] = {
  // The Blue Bomber
  stand: sp(mmStand),
  walk: sp(mmWalk),
  attack: sp(mmAttack),
  itemGet: sp(mmItemGet),
  sleep: sp(mmSleep),
  // The helper bot
  rollStand: sp(rollStand),
  rollWalk: sp(rollWalk),
  rollAttack: sp(rollAttack),
  rollItemGet: sp(rollItemGet),
  rollSleep: sp(rollSleep),
  // The stranger
  protoStand: sp(protoStand),
  protoWalk: sp(protoWalk),
  protoAttack: sp(protoAttack),
  protoItemGet: sp(protoItemGet),
  protoSleep: sp(protoSleep),
  // The Super Adaptor
  saStand: sp(saStand),
  saWalk: sp(saWalk),
  saAttack: sp(saAttack),
  saItemGet: sp(saItemGet),
  saSleep: sp(saSleep),
  // The rival and his wolf
  bsStand: sp(bsStand),
  bsWalk: sp(bsWalk),
  bsAttack: sp(bsAttack),
  bsItemGet: sp(bsItemGet),
  bsSleep: sp(bsSleep),
  // Shots, padded to one height so each leaves the buster at the same row
  ...SHOTS,
  lemonHeld: held(SHOTS.lemon),
  halfChargeHeld: held(SHOTS.halfCharge),
  chargeShotHeld: held(SHOTS.chargeShot),
  metalBladeHeld: held(SHOTS.metalBlade),
  blackHoleHeld: held(SHOTS.blackHole),
  blackHoleAura: { rows: AURA },
  // The aura is drawn a pixel left of its shot; the held bomb sits a pixel in from its sprite's edge.
  blackHoleAuraHeld: { rows: AURA.map(r => `.${r}`) },
  // Status bar
  lifeOn: { rows: TICK_ON },
  wpnOn: { rows: TICK_ON, legend: { e: 'B', W: 'c' } },
  tickOff: { rows: TICK_OFF, legend: { X: 'tickOff' } },
  bossOn: { rows: TICK_ON, legend: { e: 'R', W: 'O' } },
  bolt: sp(['.mm.', 'mWmM', 'mmMM', '.mM.', '.Mm.', '.mM.']),
  miniMega: sp(['.KKK.', 'KDBDK', 'BKSSK', 'DSWSW', '.KSS.']),
  miniRoll: sp(['.KKK.', 'KYYYK', 'gKSSK', 'YSWSW', 'Y.SS.']),
  miniSuper: sp(['G...G', 'KGKGK', 'RKSSK', 'GSWSW', '.KSS.']),
  miniBass: sp(['G...G', 'KnRnK', 'NKSSK', 'nSWSW', '.KSS.']),
  miniProto: sp(['.KKK.', 'KRxRK', 'xKSSK', 'RVVVV', 's.SS.']),
  iconLemon: sp(['.....', '.ee..', 'eWWe.', '.ee..', '.....']),
  iconHalf: sp(['..c..', '.cWc.', 'cWWWc', '.cWc.', '..c..']),
  iconCharge: sp(['.ccc.', 'cWWWc', 'cWWWc', 'cWWWc', '.ccc.']),
  iconBlade: sp(['m.m.m', '.mMm.', 'mMRMm', '.mMm.', 'm.m.m']),
  iconBomb: sp(['.PPP.', 'PpKpP', 'PKWKP', 'PpKpP', '.PPP.']),
  // Scenery
  floor: sp(['hhhhhhhf', 'hffffffF', 'hffffffF', 'fFFFFFFF']),
  cloud: sp(['....WWWW....', '..WWWWWWWW..', '.WWWWWWWWWWW', 'WWWWWWWWWWWW', '.cWWcWWWcWW.', '...cccccc...']),
  cloudSmall: sp(['...WWW...', '.WWWWWWW.', 'WWWWWWWWW', '.cWWcWWc.', '..cccc...']),
  // Tall enough to run from the floor off the top of the tallest scene.
  ladder: sp(Array.from({ length: 60 }, (_, y) => (y % 4 === 1 ? 'MmmmmM' : 'M....M'))),
  // The skull fortress in three parts from the right edge in (tower, keep, gate), each far off, nearer, then looming.
  towerFar: sp(['..v..', '..v..', '.vvv.', '.vuv.', '.vvv.', '.vvv.', '.vvv.', '.vvv.', 'vvvvv']),
  towerMid: sp(['...k...', '..kqk..', '..kqk..', '.kkqkk.', '.kuuuk.', '.kuKuk.', '.kkkkk.', '.kqqqk.', '.kqOqk.', '.kqqqk.', '.kqqqk.', '.kqOqk.', 'kkkkkkk']),
  tower: sp([
    '....k....',
    '...kqk...',
    '...kqk...',
    '..kkqkk..',
    '.kqqqqqk.',
    '.kqOqOqk.',
    '.kqqqqqk.',
    'kkkkkkkkk',
    'kquuuuuqk',
    'kuKKuKKuk',
    'kuKRuKRuk',
    'kuuuKuuuk',
    'kquKuKuqk',
    'kqqqqqqqk',
    'kqQqqqQqk',
    'kqQqOqQqk',
    'kqQqqqQqk',
    'kqQqqqQqk',
    'kqQqOqQqk',
    'kqQqqqQqk',
    'kqQqqqQqk',
    'kqQqOqQqk',
    'kqQqqqQqk',
    'kqQqqqQqk',
    'kqQQQQQqk',
    'kqQkkkQqk',
    'kkkkkkkkk',
  ]),
  keepFar: sp(['.v..........v.', '.v...vvvv...v.', 'vvv.vuuuuv.vvv', 'vvv.vuvvuv.vvv', 'vvvvvvuuvvvvvv', 'vvvvvvvvvvvvvv', 'vvvvvvvvvvvvvv']),
  keepMid: sp([
    '..k..........k..',
    '.kqk...kk...kqk.',
    '.kqk..kuuk..kqk.',
    'kqqqk.kuuk.kqqqk',
    'kqOqkkkKKkkkqOqk',
    'kqqqqqqqqqqqqqqk',
    'kqQqOqqqqqqOqQqk',
    'kqQqqqQkkQqqqQqk',
    'kqQqqqQkkQqqqQqk',
    'kkkkkkkkkkkkkkkk',
  ]),
  // 22 wide: at 78 columns it stands between the action and the tower.
  fortress: sp([
    '..k................k..',
    '.kqk..............kqk.',
    '.kqk....kuuuuk....kqk.',
    'kqqqk..kuuuuuuk..kqqqk',
    'kqOqk.kuuuuuuuuk.kqOqk',
    'kqqqk.kuKKuuKKuk.kqqqk',
    'kqqqk.kuKRuuKRuk.kqqqk',
    'kqOqk.kuuuKKuuuk.kqOqk',
    'kqqqk..kuuuuuuk..kqqqk',
    'kqqqk..kuKuKuKk..kqqqk',
    'kqqqkkkkkukukukkkkqqqk',
    'kqQqqqqqkkkkkkqqqqqQqk',
    'kqQqOqqOqqqqqqOqqOqQqk',
    'kqQqqqqqqqqqqqqqqqqQqk',
    'kqQqqqqqQQQQQQqqqqqQqk',
    'kqQqqqqQkkkkkkQqqqqQqk',
    'kqQqqqqQkkkkkkQqqqqQqk',
    'kkkkkkkkkkkkkkkkkkkkkk',
  ]),
  gateFar: sp(['v.v.vv.v.v', 'vvvvvvvvvv', 'vvvvvvvvvv', 'vvvvvvvvvv']),
  gateMid: sp(['k.k.kk.k.k', 'kkkkkkkkkk', 'kqqqqqqqqk', 'kqqkKKkqqk', 'kqqkKKkqqk', 'kqqkKKkqqk', 'kkkkkkkkkk']),
  gate: sp([
    'k.k.k.k..k.k.k.k',
    'kkkkkkkkkkkkkkkk',
    'kqqqqqqqqqqqqqqk',
    'kqOqqqqqqqqqqOqk',
    'kqqqqkkkkkkqqqqk',
    'kqqqkKKKKKKkqqqk',
    ...Array.from({ length: 6 }, () => 'kqQqkKmKmKmkqQqk'),
    'kkkkkkkkkkkkkkkk',
  ]),
  // Stage props
  met: sp(['..GGGG..', '.GGGGGG.', 'GGGoGGGG', 'GGGGGGGG', 'oooooooo']),
  metPeek: sp(['..GGGG..', '.GGGGGG.', 'GGGGGGGG', 'oooooooo', '.KWKKWK.', '.KKKKKK.', '.OO..OO.']),
  boom1: sp(['...W...', '.W.c.W.', '..cWc..', 'WcWWWcW', '..cWc..', '.W.c.W.', '...W...']),
  boom2: sp(['W...W...W', '.........', '..c...c..', '.........', 'W...W...W', '.........', '..c...c..', '.........', 'W...W...W']),
  // The bolt a Met drops, outlined to show on the pale sky by the floor (the bar's is on black).
  boltDrop: sp(['.KKKK.', 'KmWmMK', 'KmmMMK', '.KmMK.', '.KMmK.', '.KmMK.', '..KK..']),
  note: sp(['..WW.', '..W.W', '..W..', 'WWW..', 'WW...']),
  disk: sp(['..mmm..', '.mcWcm.', 'mcWmWcm', 'mWmKmWm', 'mcWmWcm', '.mcWcm.', '..mmm..']),
  block: sp(['oGGGGGGo', 'GoooooGo', 'GoGGGGoo', 'GoGooGoo', 'GoGooGoo', 'GoGGGGoo', 'GoooooGo', 'oooooooo']),
  debris: sp(['GG.', 'Goo', '.o.']),
  rush: sp([
    '...K.K........',
    '..KRKRK.......',
    '.KRRRRRK......',
    'KRRWKRRK......',
    'KKRRRRRK.....K',
    '.KKKKRRRKKKKRK',
    '....KmmRRRRRK.',
    '....KRRRRRRRK.',
    '....KRRRRRRK..',
    '...KRRKKKRRK..',
    '...KKK..KKK...',
  ]),
  // Rush Coil: the spring on his back, sprung and at rest.
  coilLow: sp(['KRRRRK', 'mmmmmm', '.MMMM.']),
  coilHigh: sp(['KRRRRK', 'mmmmmm', '.MMMM.', 'mmmmmm', '.MMMM.', 'mmmmmm', '.MMMM.']),
  beat1: sp(['.K..K...', 'KBKKBK..', '.KBBBKK.', 'KBBWKBGK', '.KBBBBK.', '..KGKG..']),
  beat2: sp(['........', 'KK...KK.', 'KBKKKBK.', '.KBBWKGK', '.KBBBBK.', '..KGKG..']),
  // Eight wide: he stands between the ladder's foot and the hero.
  eddie: sp(['.KKKKKK.', 'KRRRRRRK', 'KRRRRRRK', 'KKKKKKKK', 'KmmmmmmK', 'KWKmWKmK', 'KmmmmmmK', '.KmmmmK.', '.KK..KK.', 'KRK..KRK']),
  capsule: sp([
    '...KKKKKKKKKKKKKKKKKK...',
    '..KmmmmmmmmmmmmmmmmmmK..',
    '.KmMMMMMMMMMMMMMMMMMMmK.',
    ...Array.from({ length: 20 }, (_, y) => (y % 7 === 2 ? 'KMKc................cKMK' : y % 7 === 3 ? 'KMK.c................KMK' : 'KMK..................KMK')),
    'KmmmmmmmmmmmmmmmmmmmmmmK',
    'KMMMcMMMMMMMMMMMMMMcMMMK',
    'KKKKKKKKKKKKKKKKKKKKKKKK',
  ]),
  // The teleport beam: a streak, and a column long enough to reach from the floor off the top of the tallest scene.
  beam: sp(BEAM(16)),
  beamCol: sp(BEAM(60)),
  beamLand: sp(['..cWWc..', '.cW..Wc.', 'cW....Wc', '.cW..Wc.', 'cWWWWWWc']),
  etank: sp(ETANK),
  etankHalf: sp(drained(6)),
  etankEmpty: sp(drained(10)),
  // The boss gate: a wall from above the scene down to the doorway, and the shutter that drops in it.
  gateWall: sp([...Array.from({ length: 40 }, (_, y) => (y % 4 === 3 ? 'KQQQQQQK' : Math.floor(y / 4) % 2 ? 'KqqqQqqK' : 'KqQqqqqK')), 'KmmmmmmK', 'KKKKKKKK']),
  doorOpen: sp(['KmmmmmmK', 'KMMMMMMK', 'KmMmMmMK', 'KKKKKKKK']),
  doorHalf: sp([...SLATS(9), 'KKKKKKKK']),
  doorShut: sp(SLATS(18)),
  bossBar1: bossBar(3),
  bossBar2: bossBar(5),
  bossBar3: bossBar(7),
  hitSpark: sp(['W..W..W', '.W.W.W.', '..WWW..', 'WWWOWWW', '..WWW..', '.W.W.W.', 'W..W..W']),
  sparkle: sp(['..W..', '..c..', 'WcWcW', '..c..', '..W..']),
  sweat: sp(['.D.', '.c.', 'DcD', 'DWD', '.D.']),
  // You: a white glove with a red cuff, from the top of the stage. A finger to poke, a palm to pat.
  finger: sp(['..RRRRRR.', '..RRRRRR.', '..KWWWWK.', '.KWWWWWWK', 'KWWWWWWWK', 'KWWWWWWWK', '.KWWWWWWK', '..KKKKWWK', '.....KWWK', '.....KWWK', '......KK.']),
  palm: sp(['...RRRRRR.', '...RRRRRR.', '...KWWWWK.', '..KWWWWWWK', '.KKWWWWWWK', 'KWWWWWWWWK', 'KWWWWWWWWK', '.KKWWWWWWK', '..KWWWWWK.', '...KWWWWK.', '....KKKK..']),
  // Rush wagging (the tail up), and Rush Jet's flames under him.
  rushWag: sp(['...K.K........', '..KRKRK.......', '.KRRRRRK....KK', 'KRRWKRRK....KR', 'KKRRRRRK....KR', '.KKKKRRRKKKKRK', '....KmmRRRRRK.', '....KRRRRRRRK.', '....KRRRRRRK..', '...KRRKKKRRK..', '...KKK..KKK...']),
  jet: sp(['O.O.O', 'eOeOe', '.e.e.']),
  // The Met mid-step, glaring, and its pellet.
  metStep: sp(['..GGGG..', '.GGGGGG.', 'GGGGGGGG', 'oooooooo', '.KWKKWK.', '.KKKKKK.', 'OO....OO']),
  metGlare: sp(['..GGGG..', '.GGGGGG.', 'GGGGGGGG', 'oooooooo', '.KRKKRK.', '.KKKKKK.', '.OO..OO.']),
  pellet: sp(['.e.', 'eWe', '.e.']),
}

// ---------------------------------------------------------------------------
// Frames. Actors sit relative to the hero's top-left; the floor is y 16.
//
// The action keeps to columns 0..45 (the pane at its slimmest): the ladder at
// 0..5, the small robots at 10..25, the big forms at 6..29 with the buster's
// tip at 29, and whatever is shot at, shut or bounced on up to column 45.
// ---------------------------------------------------------------------------

const SMALL: HeroTier[] = ['tier1', 'tier2', 'unknown']
const BIG: HeroTier[] = ['tier3', 'tier4']
const only = (tiers: HeroTier[], actor: Actor): Actor => ({ ...actor, tiers })

const txt = (text: string, x: number, y: number, color = '#fcfcfc', opts: { bg?: string; lift?: boolean } = {}): SceneText => ({ text, x, y, color, ...opts })
const banner = (text: string, x: number, y: number, color = '#fcfcfc') => txt(text, x, y, color, { bg: '#000000' })
/** Scenery placed in the stage, not carried over a robot's head. */
const prop = (sprite: string, x: number, y: number, opts: { flip?: boolean; offstage?: boolean; swap?: Record<string, string> } = {}): Actor => at(sprite, x, y, { ...opts, fixed: true })
/** The buster's shot, in flight. */
const fire = (x: number) => weapon(x, 7)
const capsule = () => prop('capsule', -4, -10)
/** The teleport beam on the hero's spot: the whole column, or only what is still above `bottom`. */
const beamDown = (bottom = 16) => prop('beamCol', 6, bottom - 60, { offstage: true })

/** The stranger whistles his tune (a note only he gets). */
const whistle = (x: number, y: number): Actor => only(['unknown'], at('note', x, y))

// What the buster is aimed at stands at columns 38..45.
const TARGET = 28
const BLOCKS = { x: TARGET, y: 8 }
const blocks = (top = true): Actor[] => [prop('block', BLOCKS.x, BLOCKS.y), ...(top ? [prop('block', BLOCKS.x, BLOCKS.y - 8)] : [])]
const DISK = { x: 4, y: -8 }
const ETANK_AT = { x: 4, y: -11 }
// Rush faces the way he will carry the hero; the coil is on his back, the hero's side.
const RUSH = { x: 18, y: 5 }
const rushCoil = (sprung = false): Actor[] => [at('rush', RUSH.x, RUSH.y, { flip: true }), sprung ? at('coilHigh', RUSH.x, RUSH.y - 2) : at('coilLow', RUSH.x, RUSH.y + 2)]
/** The hero off his spot: the big forms have less sky over them and wider boots, so they get a place of their own. */
const leap = (pose: string, small: [number, number], big: [number, number]): Actor[] => [only(SMALL, hero(pose, small[0], small[1])), only(BIG, hero(pose, big[0], big[1]))]

const states: Theme['states'] = {
  idle: loop(
    { actors: [hero('stand'), whistle(17, -6)], hold: 3 },
    { actors: [hero('walk')], hold: 1 },
    { actors: [hero('stand')], hold: 1 },
    { actors: [hero('walk'), whistle(20, -10)], hold: 1 },
    { actors: [hero('stand'), whistle(20, -10)], hold: 3 },
    { actors: [hero('sleep')], hold: 1 },
    { actors: [hero('stand')], hold: 2 },
  ),
  thinking: loop(
    { actors: [hero('stand')], texts: [txt('.', 17, -2, undefined, { lift: true })], hold: 2 },
    { actors: [hero('stand')], texts: [txt('..', 17, -2, undefined, { lift: true })], hold: 2 },
    { actors: [hero('sleep')], texts: [txt('...', 17, -2, undefined, { lift: true })], hold: 1 },
    { actors: [hero('stand')], texts: [txt('...', 17, -2, undefined, { lift: true })], hold: 1 },
    { actors: [hero('walk')], texts: [txt('?', 18, -4, '#fcc400', { lift: true })], hold: 2 },
  ),
  // A disk arcs in from the right, over the crest of the big forms, into the raised hands.
  reading: loop(
    { actors: [hero('stand'), prop('disk', 29, -3)], hold: 1 },
    { actors: [hero('stand'), prop('disk', 22, -9)], hold: 1 },
    { actors: [hero('stand'), prop('disk', 14, -14)], hold: 1 },
    { actors: [hero('itemGet'), at('disk', DISK.x, DISK.y)], hold: 2 },
    { actors: [hero('itemGet'), at('disk', DISK.x, DISK.y), at('sparkle', DISK.x - 6, DISK.y - 3)], texts: [txt('DATA', 18, -8, '#a8f0fc')], hold: 2 },
    { actors: [hero('stand')], hold: 1 },
  ),
  // The shot takes out the lower block; the upper one drops into its place and a new one comes down on top.
  editing: loop(
    { actors: [hero('stand'), ...blocks()], hold: 2 },
    { actors: [hero('attack'), ...blocks(), fire(16)], hold: 1 },
    { actors: [hero('attack'), ...blocks(), fire(21)], hold: 1 },
    { actors: [hero('attack'), prop('block', BLOCKS.x, BLOCKS.y - 8), prop('hitSpark', BLOCKS.x, BLOCKS.y), prop('debris', 25, 5), prop('debris', 26, 11)], hold: 1 },
    { actors: [hero('stand'), prop('block', BLOCKS.x, BLOCKS.y - 4), prop('debris', 23, 9), prop('debris', 25, 13)], hold: 1 },
    { actors: [hero('stand'), ...blocks(false), prop('debris', 22, 13)], hold: 1 },
    { actors: [hero('walk'), ...blocks(false), prop('block', BLOCKS.x, BLOCKS.y - 16)], hold: 1 },
    { actors: [hero('stand'), ...blocks()], hold: 1 },
  ),
  shell: loop(
    { actors: [...rushCoil(), hero('stand')], hold: 2 },
    { actors: [...rushCoil(), ...leap('walk', [6, -11], [4, -11])], hold: 1 },
    { actors: [...rushCoil(), ...leap('stand', [11, -9], [8, -9])], hold: 1 },
    { actors: [...rushCoil(true), ...leap('itemGet', [11, -13], [8, -12])], texts: [txt('BOING', 28, -6)], hold: 1 },
    { actors: [...rushCoil(true), ...leap('itemGet', [10, -19], [7, -13])], texts: [txt('BOING', 28, -6)], hold: 1 },
    { actors: [...rushCoil(), ...leap('walk', [6, -10], [4, -9])], hold: 1 },
    { actors: [...rushCoil(), hero('stand')], hold: 2 },
  ),
  // Each leaves the stage his own way: Rush by teleport beam, Beat up into the sky, Eddie off the left edge.
  agents: loop(
    { actors: [at('eddie', -10, 6), hero('itemGet'), at('rush', 19, 5), prop('beat1', 20, -10)], hold: 2 },
    { actors: [at('eddie', -10, 5), hero('itemGet'), at('rush', 19, 5), prop('beat2', 21, -11)], hold: 1 },
    { actors: [hero('stand'), at('beamLand', 22, 11, { swap: { c: 'R' } }), prop('beat1', 23, -15), at('eddie', -12, 6, { offstage: true })], hold: 1 },
    { actors: [hero('stand'), prop('beam', 24, -4, { swap: { c: 'R' } }), prop('beat2', 26, -20, { offstage: true }), at('eddie', -15, 5, { offstage: true })], hold: 1 },
    { actors: [hero('stand'), prop('beam', 24, -30, { swap: { c: 'R' }, offstage: true }), prop('beat1', 28, -26, { offstage: true }), at('eddie', -18, 6, { offstage: true })], hold: 1 },
    { actors: [hero('stand')], texts: [txt('. . .', 18, -2, undefined, { lift: true })], hold: 2 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop(
    { actors: [hero('sleep'), capsule()], texts: [txt('z', 21, -6, '#a8f0fc')], hold: 3 },
    { actors: [hero('sleep'), capsule()], texts: [txt('Z', 22, -8, '#a8f0fc')], hold: 3 },
  ),
  thinking: loop(
    { actors: [hero('stand'), capsule()], hold: 3 },
    { actors: [hero('sleep'), capsule()], hold: 1 },
    { actors: [hero('stand'), capsule()], texts: [txt('?', 21, -8, '#a8f0fc')], hold: 3 },
  ),
}

const SIGH = 'Overpowered for this stage.'
// A drop off the brow: beside the helmet, or for the big forms above the wing and clear of the rival's fin.
const sweat: Actor[] = [only(SMALL, at('sweat', 16, 1)), only(BIG, prop('sweat', 19, -8))]
const sigh = txt('~sigh~', 23, -4)
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), prop('disk', 29, -3), ...sweat], hold: 2, caption: SIGH },
    { actors: [hero('itemGet'), at('disk', DISK.x, DISK.y), ...sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), ...sweat], texts: [sigh], hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [...rushCoil(), hero('stand'), ...sweat], hold: 2, caption: SIGH },
    { actors: [...rushCoil(), ...leap('stand', [11, -9], [8, -9])], hold: 1, caption: SIGH },
    { actors: [...rushCoil(), hero('stand'), ...sweat], texts: [sigh], hold: 3, caption: SIGH },
  ),
}

const FLASH = { D: 'hurtA', B: 'hurtB', R: 'hurtA', G: 'hurtB', n: 'hurtA', Y: 'hurtB', x: 'hurtB' }
/** The shot-get palette flashes, on every robot's main colors. */
const tint = (a: string, b: string) => ({ D: b, B: a, R: b, G: a, n: b, N: a, x: a, Y: a, o: b })
const CHARGE = tint('chargeA', 'chargeB')
const BLADE = tint('bladeA', 'bladeB')
const BOMB = tint('bombA', 'bombB')
const stageClear = banner(' STAGE CLEAR! ', 1, -14)
const energyOut = banner(' WEAPON ENERGY 0 ', 0, -14, '#a8f0fc')
const heldShot = () => weapon(2, -10, { pose: 'held' })
/** The boss gate at the right of the stage, its shutter open, half down or shut. */
const gate = (door: string): Actor[] => [prop('gateWall', TARGET, -44, { offstage: true }), prop(door, TARGET, -2)]
const bossBarAt = (n: 1 | 2 | 3) => prop(`bossBar${n}`, 21, -3)

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('stand'), at('met', TARGET, 11)], hold: 1 },
    { actors: [hero('attack'), at('metPeek', TARGET, 9)], hold: 1 },
    { actors: [hero('attack'), at('metPeek', TARGET, 9), fire(16)], hold: 1 },
    { actors: [hero('attack'), at('metPeek', TARGET, 9), fire(21)], hold: 1 },
    { actors: [hero('stand'), at('boom1', TARGET, 8)], hold: 1 },
    { actors: [hero('stand'), at('boom2', TARGET - 1, 7)], hold: 1 },
    { actors: [hero('stand'), at('boltDrop', TARGET + 1, 9)], hold: 2 },
  ),
  // Knocked back two pixels, flickering, and back on his spot at the end.
  toolError: once(
    { actors: [hero('stand'), at('hitSpark', 10, 4)], hold: 1 },
    { actors: [hero('walk', -2, -2, FLASH), at('hitSpark', 8, 3)], hold: 1 },
    { actors: [], hold: 1 },
    { actors: [hero('stand', -2, 0)], hold: 1 },
    { actors: [], hold: 1 },
    { actors: [hero('stand', -1, 0)], hold: 1 },
    { actors: [], hold: 1 },
    { actors: [hero('stand')], hold: 1 },
  ),
  turnComplete: once(
    { actors: [hero('stand')], hold: 1 },
    { actors: [hero('itemGet'), prop('sparkle', 21, -9), prop('sparkle', 27, 3)], texts: [stageClear], hold: 2 },
    { actors: [hero('itemGet'), prop('sparkle', 26, -11), prop('sparkle', 22, 6)], texts: [stageClear], hold: 2 },
    { actors: [hero('itemGet'), prop('sparkle', 21, -9), prop('sparkle', 27, 3)], texts: [stageClear], hold: 3 },
  ),
  milestone: once({ actors: [hero('stand')], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [hero('stand')], texts: [energyOut], hold: 2 },
    { actors: [hero('sleep')], texts: [energyOut], hold: 2 },
    { actors: [hero('sleep'), capsule()], hold: 2 },
    { actors: [hero('sleep'), capsule()], message: 'cacheCold', hold: 12 },
  ),
  // The shutter comes down, then the boss's energy bar fills beside it, as it does when a boss fight begins.
  limitWarning: once(
    { actors: [hero('stand'), ...gate('doorOpen')], hold: 1 },
    { actors: [hero('stand'), ...gate('doorHalf')], hold: 1 },
    { actors: [hero('stand'), ...gate('doorShut')], hold: 2 },
    { actors: [hero('stand'), ...gate('doorShut'), bossBarAt(1)], message: 'limitWarning', hold: 4 },
    { actors: [hero('stand'), ...gate('doorShut'), bossBarAt(2)], message: 'limitWarning', hold: 5 },
    { actors: [hero('stand'), ...gate('doorShut'), bossBarAt(3)], message: 'limitWarning', hold: 5 },
  ),
  // The tank drains as the energy goes in.
  compaction: once(
    { actors: [hero('itemGet'), at('etank', ETANK_AT.x, ETANK_AT.y)], hold: 2, caption: 'compaction' },
    { actors: [hero('itemGet', 0, 0, CHARGE), at('etankHalf', ETANK_AT.x, ETANK_AT.y)], texts: [txt('+++', 21, -4, '#f8f8a0')], hold: 2, caption: 'compaction' },
    { actors: [hero('itemGet'), at('etankEmpty', ETANK_AT.x, ETANK_AT.y)], texts: [txt('++++++', 21, -4, '#f8f8a0')], hold: 2, caption: 'compaction' },
    { actors: [hero('stand')], texts: [txt('REFILL', 21, -4)], hold: 3, caption: 'compaction' },
  ),
  // The robot before beams out (the scene already holds the new one), the new one beams in.
  modelChange: once(
    { actors: [at('beamLand', 4, 11)], hold: 1 },
    { actors: [beamDown()], hold: 1 },
    { actors: [beamDown(-4)], hold: 1 },
    { actors: [], hold: 1 },
    { actors: [beamDown(-4)], hold: 1 },
    { actors: [beamDown()], hold: 1 },
    { actors: [at('beamLand', 4, 11)], hold: 1 },
    { actors: [hero('itemGet')], hold: 5, caption: 'modelChange' },
  ),
  effortChange: once(
    { actors: [hero('itemGet', 0, 0, CHARGE), heldShot()], hold: 1 },
    { actors: [hero('itemGet', 0, 0, BLADE), heldShot()], hold: 1 },
    { actors: [hero('itemGet', 0, 0, BOMB), heldShot()], hold: 1 },
    { actors: [hero('itemGet'), heldShot()], texts: [banner(' NEW BUSTER SHOT! ', 15, -12)], hold: 5, caption: 'effortChange' },
  ),
}

// ---------------------------------------------------------------------------
// Actions: the buttons under the scene. You are a white glove with a red cuff
// from the top of the stage: a finger to poke and knock, a palm to pat. Each
// press plays one of the tier's takes, picked at random; the target's patience
// wears down with repeated presses (see `pressAction`).
// ---------------------------------------------------------------------------

/** A reaction: one-shot, every frame held twice as long as written (a line stays about a second at 6 fps). */
const take = (...frames: Frame[]): Animation => once(...frames.map(f => ({ ...f, hold: 2 * Math.max(1, f.hold ?? 1) })))
/** The same caption on every frame from `from` on. */
const captioned = (caption: string, frames: Frame[], from = 2): Frame[] => frames.map((f, k) => (k >= from ? { ...f, caption } : f))
/** A take that is only picked while these are present. */
const needing = (needs: string[], anim: Animation): Animation => ({ ...anim, needs })
/** The glove at `y`; past `enter` it is still coming in from above. */
const glove = (sprite: 'finger' | 'palm', x: number, y: number, enter: number, opts: Partial<Actor> = {}): Actor => at(sprite, x, y, { ...(y <= enter ? { offstage: true } : {}), ...opts })
// Who is who, for the rests: whatever robot is on stage is `robot`, the dog is `rush`, the hard hat is `met`.
const robot = (pose: string, x = 0, y = 0, swap?: Record<string, string>): Actor => ({ ...hero(pose, x, y, swap), gone: 'robot' })
const robotOf = (actors: Actor[]): Actor[] => actors.map(a => ({ ...a, gone: 'robot' }))
const ROBOT_SWEAT = robotOf(sweat)
const GOLD = '#fcc400'
const RED = '#fc5838'
const CYAN = '#a8f0fc'
/** The robot's line beside its head, lifted clear of the big forms (as the thinking dots are). */
const says = (text: string, y = -2, color = '#fcfcfc'): SceneText => ({ ...txt(text, 17, y, color, { lift: true }), gone: 'robot' })
const RED_BEAM = { swap: { c: 'R' } }

// 2. Pet Rush. He stands past the robot facing it; the palm comes down on his
// head. The palm is scenery here (it does not rise with the big forms).
const RX = 20
const RUSH_Y = 5
const R_ENTER = -24
const R_HOVER = -12
const R_PAT = -6
/** Rush (or something in his place), as scenery and his. */
function rushAt(sprite = 'rush', x = RX, y = RUSH_Y, opts: Partial<Actor> = {}): Actor {
  return at(sprite, x, y, { fixed: true, gone: 'rush', ...opts })
}
const RUSH_DOG = rushAt()
const RUSH_WAG = rushAt('rushWag')
/** Rush Jet's flames under him at (x, y). */
const jet = (x: number, y: number, opts: Partial<Actor> = {}): Actor => rushAt('jet', x + 5, y + 11, opts)
/** Rush's line, over his back and right of the palm. */
function woof(text: string, x = 29, y = 0, color = '#fcfcfc'): SceneText {
  return { ...txt(text, x, y, color), gone: 'rush' }
}
const rushScene = (y: number | null, dog: Actor[] = [RUSH_DOG], more: Actor[] = [], who: Actor[] = [robot('stand')], hx = RX - 1): Actor[] => [
  ...who,
  ...dog,
  ...(y === null ? [] : [glove('palm', hx, y, R_ENTER, { fixed: true })]),
  ...more,
]
const rStart = (dog: Actor[] = [RUSH_DOG]): Frame[] => [
  { actors: rushScene(R_ENTER, dog), hold: 1 },
  { actors: rushScene(R_HOVER, dog), hold: 1 },
  { actors: rushScene(R_PAT, dog), hold: 1 },
]
/** Rush beams out, red, as he does on errands; the robot is left looking at the spot. */
const RUSH_BEAMS_OUT: Frame[] = [
  { actors: rushScene(null, [rushAt('beamLand', 23, 11, RED_BEAM)]), hold: 1 },
  { actors: rushScene(null, [rushAt('beam', 25, -4, RED_BEAM)]), hold: 1 },
  { actors: rushScene(null, [rushAt('beam', 25, -30, { ...RED_BEAM, offstage: true })]), hold: 1 },
  { actors: rushScene(null, []), texts: [says('...')], hold: 2 },
  { actors: rushScene(null, [], ROBOT_SWEAT), texts: [says('RUSH?')], hold: 3 },
]
/** Rush Jet: he flies off up and to the right. */
const RUSH_JETS_OUT: Frame[] = [
  { actors: rushScene(null, [rushAt('rushWag', 22, -4), jet(22, -4)]), hold: 1 },
  { actors: rushScene(null, [rushAt('rush', 24, -14), jet(24, -14)]), hold: 1 },
  { actors: rushScene(null, [rushAt('rushWag', 30, -24, { offstage: true }), jet(30, -24, { offstage: true })]), hold: 1 },
  { actors: rushScene(null, []), texts: [says('...')], hold: 2 },
  { actors: rushScene(null, [], ROBOT_SWEAT), texts: [says('RUSH!')], hold: 3 },
]
// 1. Poke the robot. The finger comes down on the helmet from the top of the
// scene (it rises with the big forms, as a prop over the head does): in from
// above, a hover, the poke, then the reaction.
const AX = 1
const A_ENTER = -22
const A_HOVER = -13
const A_POKE = -11
/** The poke's sparkle on the helmet, at the fingertip. */
const POKED = at('sparkle', AX + 4, -4)
const robotScene = (y: number | null, who: Actor[], more: Actor[] = []): Actor[] => [...who, ...(y === null ? [] : [glove('finger', AX, y, A_ENTER)]), ...more]
const aStart = (who: Actor[] = [robot('stand')]): Frame[] => [
  { actors: robotScene(A_ENTER, who), hold: 1 },
  { actors: robotScene(A_HOVER, who), hold: 1 },
  { actors: robotScene(A_POKE, who, [POKED]), hold: 1 },
]
/** The robot beams out, as a robot does between stages: what the first snapped take ends with. */
const ROBOT_BEAMS_OUT: Frame[] = [
  { actors: [at('beamLand', 4, 11, { gone: 'robot' })], hold: 1 },
  { actors: [{ ...beamDown(), gone: 'robot' }], hold: 1 },
  { actors: [{ ...beamDown(-4), gone: 'robot' }], hold: 1 },
  { actors: [], hold: 1 },
  { actors: [], texts: [txt('...', 17, -2)], hold: 3 },
]
/** The robot walks to the ladder and climbs off the top of the stage: what the second snapped take ends with. */
const ROBOT_CLIMBS_OUT: Frame[] = [
  { actors: [robot('walk', -6)], hold: 1 },
  { actors: [{ ...robot('walk', -12), offstage: true }], hold: 1 },
  { actors: [{ ...robot('itemGet', -12, -8), offstage: true }], hold: 1 },
  { actors: [{ ...robot('itemGet', -12, -18), offstage: true }], hold: 1 },
  { actors: [{ ...robot('itemGet', -12, -30), offstage: true }], hold: 1 },
  { actors: [{ ...robot('itemGet', -12, -44), offstage: true }], hold: 1 },
  { actors: [], texts: [txt('...', 17, -2)], hold: 3 },
]
const pokeRobot: ThemeAction = {
  id: 'robot',
  label: 'POKE ROBOT',
  restLabel: '(ROBOT GONE)',
  gone: ['robot'],
  needs: ['robot'],
  reactions: {
    calm: [
      take(
        ...captioned('Poked the robot. The robot beeped.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('stand')]), texts: [says('BEEP.')], hold: 3 },
          { actors: robotScene(A_POKE, [robot('stand')], [POKED]), texts: [says('BEEP.')], hold: 1 },
          { actors: robotScene(null, [robot('stand')]), texts: [says('BEEP BEEP.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Diagnostic complete: the robot is ticklish.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('walk')]), texts: [says('HA.')], hold: 1 },
          { actors: robotScene(A_POKE, [robot('itemGet')], [POKED]), texts: [says('HA HA.')], hold: 2 },
          { actors: robotScene(A_HOVER, [robot('itemGet')]), texts: [says('ERROR: TICKLISH.')], hold: 3 },
          { actors: robotScene(null, [robot('stand'), ...ROBOT_SWEAT]), texts: [says('ERROR: TICKLISH.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The robot checks its helmet for dents.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('itemGet')]), texts: [says('?', -4, GOLD)], hold: 2 },
          { actors: robotScene(null, [robot('itemGet')]), texts: [says('...')], hold: 2 },
          { actors: robotScene(null, [robot('stand')]), texts: [says('NO DENTS.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Poked. The robot reboots. Please wait.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('sleep')]), texts: [says('REBOOTING', -2, CYAN)], hold: 2 },
          { actors: robotScene(A_HOVER, [robot('sleep')]), texts: [says('REBOOTING..', -2, CYAN)], hold: 2 },
          { actors: robotScene(null, [robot('sleep')]), texts: [says('REBOOTING....', -2, CYAN)], hold: 2 },
          { actors: robotScene(null, [robot('stand')]), texts: [says('OK.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The robot took you for a Met. Nearly fired.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('attack')]), texts: [says('!', -4, GOLD)], hold: 2 },
          { actors: robotScene(A_HOVER, [robot('attack')]), texts: [says('OH. IT IS YOU.')], hold: 3 },
          { actors: robotScene(null, [robot('stand')]), texts: [says('OH. IT IS YOU.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Scanned the finger. Not a weapon. Yet.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('stand')], [at('sparkle', AX + 10, -12)]), texts: [says('SCANNING...', -2, CYAN)], hold: 2 },
          { actors: robotScene(A_HOVER, [robot('stand')], [at('sparkle', AX - 5, -12)]), texts: [says('SCANNING...', -2, CYAN)], hold: 2 },
          { actors: robotScene(A_HOVER, [robot('stand')]), texts: [says('NOT A WEAPON.')], hold: 3 },
          { actors: robotScene(null, [robot('stand')]), texts: [says('YET.')], hold: 2 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('The robot beeps. Angrily, in red.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('stand')]), texts: [says('BEEP.', -2, RED)], hold: 1 },
          { actors: robotScene(A_POKE, [robot('stand')], [POKED]), texts: [says('BEEP BEEP.', -2, RED)], hold: 1 },
          { actors: robotScene(A_HOVER, [robot('stand')]), texts: [says('BEEP BEEP BEEP.', -2, RED)], hold: 3 },
          { actors: robotScene(null, [robot('stand')]), texts: [says('BEEP BEEP BEEP.', -2, RED)], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The robot files a bug report. Subject: you.', [
          ...aStart(),
          { actors: robotScene(A_ENTER, [robot('itemGet'), at('disk', DISK.x, DISK.y, { gone: 'robot' })]), texts: [says('BUG REPORT:')], hold: 3 },
          { actors: robotScene(null, [robot('itemGet'), at('disk', DISK.x, DISK.y, { gone: 'robot' })]), texts: [says('SUBJECT: YOU.')], hold: 3 },
          { actors: robotScene(null, [robot('stand')]), texts: [says('FILED.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The robot headbutts the finger. Ow.', [
          { actors: robotScene(A_ENTER, [robot('stand')]), hold: 1 },
          { actors: robotScene(A_HOVER, [robot('stand')]), hold: 2 },
          { actors: robotScene(A_HOVER, robotOf(leap('walk', [0, -8], [0, -6])), [at('hitSpark', AX + 3, -11)]), hold: 1 },
          { actors: robotScene(A_ENTER, robotOf(leap('walk', [0, -4], [0, -3]))), texts: [says('OW.', -6)], hold: 1 },
          { actors: robotScene(null, [robot('stand')]), texts: [says('OW.')], hold: 3 },
          { actors: robotScene(null, [robot('stand')]), texts: [says('WORTH IT.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Poke limit reached. The robot has a counter.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('stand')]), texts: [says('!', -4, GOLD)], hold: 1 },
          { actors: robotScene(A_ENTER, [robot('stand')]), hold: 1 },
          { actors: robotScene(null, [robot('stand')]), texts: [{ ...banner(' POKE LIMIT REACHED ', 0, -14), gone: 'robot' }], hold: 3 },
          { actors: robotScene(null, [robot('stand'), ...ROBOT_SWEAT]), texts: [{ ...banner(' POKE LIMIT REACHED ', 0, -14), gone: 'robot' }, says('...')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The robot would like you to stop. Beep.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('stand'), ...ROBOT_SWEAT]), texts: [says('PLEASE STOP.')], hold: 3 },
          { actors: robotScene(A_POKE, [robot('stand'), ...ROBOT_SWEAT], [POKED]), texts: [says('PLEASE STOP.')], hold: 1 },
          { actors: robotScene(null, [robot('stand'), ...ROBOT_SWEAT]), texts: [says('BEEP.')], hold: 3 },
        ]),
      ),
    ],
    fedUp: [
      needing(['rush'], take(
        ...captioned('The robot calls Rush. Rush has opinions.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('itemGet')]), texts: [says('RUSH!')], hold: 2 },
          { actors: robotScene(A_HOVER, [robot('itemGet'), rushAt('beamLand', 23, 11, RED_BEAM)]), texts: [says('RUSH!')], hold: 1 },
          { actors: robotScene(A_HOVER, [robot('stand'), rushAt('beam', 25, -4, RED_BEAM)]), hold: 1 },
          { actors: robotScene(A_HOVER, [robot('stand'), RUSH_DOG]), texts: [woof('WOOF!', 29, 0, RED)], hold: 2 },
          { actors: robotScene(A_ENTER, [robot('stand'), RUSH_WAG]), texts: [woof('WOOF WOOF', 29, 0, RED)], hold: 2 },
          { actors: robotScene(null, [robot('stand'), RUSH_DOG]), texts: [says('GOOD BOY.')], hold: 3 },
        ]),
      )),
      take(
        ...captioned('A warning shot. The next one is not.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('attack')]), texts: [says('!', -4, GOLD)], hold: 1 },
          { actors: robotScene(A_HOVER, [robot('attack'), { ...fire(16), gone: 'robot' }]), hold: 1 },
          { actors: robotScene(A_ENTER, [robot('attack'), { ...fire(22), gone: 'robot' }]), texts: [says('WARNING SHOT.')], hold: 2 },
          { actors: robotScene(null, [robot('attack'), { ...fire(36), gone: 'robot', offstage: true }]), texts: [says('WARNING SHOT.')], hold: 1 },
          { actors: robotScene(null, [robot('stand')]), texts: [says('NEXT ONE COUNTS.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The robot charges up. Aimed at the finger.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('itemGet', 0, 0, CHARGE)]), hold: 1 },
          { actors: robotScene(A_HOVER, [robot('itemGet')]), hold: 1 },
          { actors: robotScene(A_HOVER, [robot('itemGet', 0, 0, CHARGE)]), texts: [says('CHARGING...', -2, CYAN)], hold: 1 },
          { actors: robotScene(A_ENTER, [robot('itemGet'), { ...heldShot(), gone: 'robot' }]), texts: [says('CHARGING...', -2, CYAN)], hold: 2 },
          { actors: robotScene(null, [robot('itemGet'), { ...heldShot(), gone: 'robot' }]), texts: [says('LEAVE.')], hold: 3 },
          { actors: robotScene(null, [robot('stand')]), hold: 1 },
        ]),
      ),
    ],
    snapped: [
      take(
        ...captioned('The robot beamed out. Try another stage.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('stand')]), texts: [says('NOPE.')], hold: 2 },
          { actors: robotScene(null, [robot('stand')]), texts: [says('NOPE.')], hold: 1 },
          { actors: robotScene(null, [robot('itemGet')]), hold: 1 },
          ...ROBOT_BEAMS_OUT,
        ]),
      ),
      take(
        ...captioned('The robot took the ladder. Not coming back.', [
          ...aStart(),
          { actors: robotScene(A_HOVER, [robot('stand')]), texts: [says('THAT IS IT.')], hold: 2 },
          { actors: robotScene(A_ENTER, [robot('stand')]), texts: [says('I QUIT.')], hold: 2 },
          ...ROBOT_CLIMBS_OUT,
        ]),
      ),
    ],
  },
  // The robot's rest: an empty stage, with Rush waiting on it.
  rest: loop(
    { actors: [RUSH_DOG], hold: 8 },
    { actors: [RUSH_DOG], texts: [woof('?', 29, 0, GOLD)], hold: 6 },
    { actors: [rushAt('rush', RX, RUSH_Y, { flip: true })], hold: 8 },
    { actors: [RUSH_DOG], texts: [woof('WHINE.')], hold: 6 },
  ),
}

const petRush: ThemeAction = {
  id: 'rush',
  label: 'PET RUSH',
  restLabel: '(RUSH GONE)',
  gone: ['rush'],
  needs: ['rush'],
  reactions: {
    calm: [
      take(
        ...captioned('Petted Rush. Rush approves.', [
          ...rStart(),
          { actors: rushScene(R_PAT, [RUSH_WAG]), texts: [woof('WOOF!')], hold: 2 },
          { actors: rushScene(R_HOVER, [RUSH_DOG]), texts: [woof('WOOF!')], hold: 1 },
          { actors: rushScene(R_PAT, [RUSH_WAG]), hold: 1 },
          { actors: rushScene(null, [RUSH_DOG]), hold: 1 },
          { actors: rushScene(null, [RUSH_WAG]), texts: [woof('WOOF.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Rush rolls over. Belly rubs are mandatory.', [
          ...rStart(),
          { actors: rushScene(R_HOVER, [rushAt('rush', RX, RUSH_Y, { flipY: true })]), hold: 2 },
          { actors: rushScene(R_PAT, [rushAt('rush', RX, RUSH_Y, { flipY: true })]), texts: [woof('...')], hold: 2 },
          { actors: rushScene(R_HOVER, [rushAt('rush', RX, RUSH_Y, { flipY: true })]), texts: [woof('MORE.')], hold: 2 },
          { actors: rushScene(R_PAT, [rushAt('rush', RX, RUSH_Y, { flipY: true })]), texts: [woof('MORE.')], hold: 2 },
          { actors: rushScene(null, [rushAt('rush', RX, RUSH_Y, { flipY: true })]), hold: 2 },
        ]),
      ),
      take(
        ...captioned('Rush wags. Rush Jet engages by accident.', [
          ...rStart(),
          { actors: rushScene(R_PAT, [RUSH_WAG]), hold: 1 },
          { actors: rushScene(R_HOVER, [rushAt('rush', RX, 1), jet(RX, 1)]), hold: 1 },
          { actors: rushScene(R_ENTER, [rushAt('rushWag', RX, -8), jet(RX, -8)]), texts: [woof('?', 29, -12, GOLD)], hold: 2 },
          { actors: rushScene(null, [rushAt('rush', RX, -8), jet(RX, -8)]), texts: [woof('WOOF?', 29, -12)], hold: 2 },
          { actors: rushScene(null, [rushAt('rushWag', RX, 1)]), hold: 1 },
          { actors: rushScene(null, [RUSH_DOG]), texts: [woof('OOPS.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Rush brings a bolt. Keep it.', [
          ...rStart(),
          { actors: rushScene(R_HOVER, [RUSH_WAG]), texts: [woof('WOOF!')], hold: 1 },
          { actors: rushScene(R_ENTER, [rushAt('rush', 24, RUSH_Y), rushAt('boltDrop', 18, 9)]), hold: 2 },
          { actors: rushScene(null, [rushAt('rushWag', 24, RUSH_Y), rushAt('boltDrop', 18, 9), rushAt('sparkle', 16, 6)]), texts: [woof('WOOF.', 32)], hold: 3 },
          { actors: rushScene(null, [rushAt('rush', 24, RUSH_Y), rushAt('boltDrop', 18, 9)]), texts: [says('THANKS.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Rush licks the hand. Twice.', [
          ...rStart(),
          { actors: rushScene(R_PAT, [rushAt('rush', RX, 3)]), texts: [woof('SLURP')], hold: 2 },
          { actors: rushScene(R_PAT, [RUSH_DOG]), hold: 1 },
          { actors: rushScene(R_PAT, [rushAt('rushWag', RX, 3)]), texts: [woof('SLURP', 30, -2)], hold: 2 },
          { actors: rushScene(R_ENTER, [RUSH_WAG]), hold: 1 },
          { actors: rushScene(null, [RUSH_DOG]), texts: [woof('...')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Rush sniffs the hand. Smells like bolts.', [
          ...rStart(),
          { actors: rushScene(R_PAT, [rushAt('rush', RX, 4)]), texts: [woof('SNIFF')], hold: 2 },
          { actors: rushScene(R_PAT, [RUSH_DOG]), hold: 1 },
          { actors: rushScene(R_PAT, [rushAt('rush', RX, 4)]), texts: [woof('SNIFF')], hold: 2 },
          { actors: rushScene(R_HOVER, [RUSH_WAG]), texts: [woof('BOLTS?')], hold: 3 },
          { actors: rushScene(null, [RUSH_WAG]), texts: [woof('BOLTS?')], hold: 1 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('Rush growls. The hand reconsiders.', [
          ...rStart(),
          { actors: rushScene(R_PAT, [RUSH_DOG]), texts: [woof('GRRR.', 29, 0, RED)], hold: 2 },
          { actors: rushScene(R_HOVER, [RUSH_DOG]), texts: [woof('GRRRR.', 29, 0, RED)], hold: 2 },
          { actors: rushScene(R_ENTER, [RUSH_DOG]), texts: [woof('GRRRR.', 29, 0, RED)], hold: 2 },
          { actors: rushScene(null, [RUSH_DOG]), texts: [woof('HMPH.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Rush Coil. The hand goes up. Way up.', [
          { actors: rushScene(R_ENTER, [RUSH_DOG, rushAt('coilLow', 28, 7)], [], undefined, 28), hold: 1 },
          { actors: rushScene(R_HOVER, [RUSH_DOG, rushAt('coilLow', 28, 7)], [], undefined, 28), hold: 1 },
          { actors: rushScene(R_PAT, [RUSH_DOG, rushAt('coilLow', 28, 7)], [], undefined, 28), hold: 2 },
          { actors: rushScene(-16, [RUSH_DOG, rushAt('coilHigh', 28, 3)], [], undefined, 28), texts: [woof('BOING', 20, -8)], hold: 1 },
          { actors: rushScene(R_ENTER, [RUSH_WAG, rushAt('coilHigh', 28, 3)], [], undefined, 28), texts: [woof('BOING', 20, -8)], hold: 2 },
          { actors: rushScene(null, [RUSH_DOG, rushAt('coilLow', 28, 7)]), hold: 1 },
          { actors: rushScene(null, [RUSH_WAG, rushAt('coilLow', 28, 7)]), texts: [woof('WOOF.')], hold: 3 },
        ]),
      ),
      needing(['robot'], take(
        ...captioned('Rush hides behind the robot. Mostly.', [
          { actors: rushScene(R_ENTER), hold: 1 },
          { actors: rushScene(R_HOVER, [rushAt('rush', 6, RUSH_Y)]), hold: 1 },
          { actors: rushScene(R_HOVER, [], [], [rushAt('rush', -8, RUSH_Y, { flip: true }), robot('stand')]), hold: 1 },
          { actors: rushScene(R_PAT, [], [], [rushAt('rush', -8, RUSH_Y, { flip: true }), robot('stand')]), texts: [txt('?', 28, 0, GOLD)], hold: 3 },
          { actors: rushScene(R_ENTER, [], [], [rushAt('rush', -8, RUSH_Y, { flip: true }), robot('stand')]), texts: [says('...')], hold: 2 },
          { actors: rushScene(null, [], [], [rushAt('rush', -8, RUSH_Y, { flip: true }), robot('stand')]), texts: [says('HE IS BEHIND ME.')], hold: 3 },
        ]),
      )),
      take(
        ...captioned('Rush chews the hand. Gently. For now.', [
          ...rStart(),
          { actors: rushScene(R_PAT, [rushAt('rush', RX, 3)]), texts: [woof('CHOMP.')], hold: 2 },
          { actors: rushScene(R_PAT, [rushAt('rush', RX, 3)]), texts: [woof('...')], hold: 2 },
          { actors: rushScene(R_HOVER, [RUSH_DOG]), hold: 1 },
          { actors: rushScene(R_ENTER, [RUSH_DOG]), texts: [woof('GENTLY.')], hold: 2 },
          { actors: rushScene(null, [RUSH_DOG]), texts: [woof('FOR NOW.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Rush whines. Rush would like a bolt first.', [
          ...rStart(),
          { actors: rushScene(R_PAT, [RUSH_DOG]), texts: [woof('WHINE.')], hold: 3 },
          { actors: rushScene(R_HOVER, [RUSH_DOG]), texts: [woof('A BOLT?')], hold: 3 },
          { actors: rushScene(null, [RUSH_DOG]), texts: [woof('A BOLT?')], hold: 2 },
        ]),
      ),
    ],
    fedUp: [
      needing(['robot'], take(
        ...captioned('The robot steps in. Buster out. His dog.', [
          ...rStart(),
          { actors: rushScene(R_PAT, [RUSH_DOG], [], [{ ...robot('walk', 2), tiers: SMALL }, { ...robot('walk', 0), tiers: BIG }]), texts: [woof('WHINE.')], hold: 1 },
          { actors: rushScene(R_HOVER, [RUSH_DOG], [], [{ ...robot('attack', 4), tiers: SMALL }, { ...robot('attack', 0), tiers: BIG }]), texts: [says('HEY.')], hold: 3 },
          { actors: rushScene(R_ENTER, [RUSH_DOG], [], [{ ...robot('attack', 4), tiers: SMALL }, { ...robot('attack', 0), tiers: BIG }]), texts: [says('MY DOG.')], hold: 3 },
          { actors: rushScene(null, [RUSH_WAG], [], [{ ...robot('attack', 4), tiers: SMALL }, { ...robot('attack', 0), tiers: BIG }]), texts: [says('MY DOG.')], hold: 1 },
          { actors: rushScene(null, [RUSH_DOG], [], [{ ...robot('walk', 2), tiers: SMALL }, { ...robot('walk', 0), tiers: BIG }]), hold: 1 },
          { actors: rushScene(null, [RUSH_DOG]), hold: 1 },
        ]),
      )),
      take(
        ...captioned('Rush calls Beat. Beat pecks the hand.', [
          ...rStart(),
          { actors: rushScene(R_PAT, [RUSH_DOG], [rushAt('beat1', 34, -22, { offstage: true })]), texts: [woof('WOOF!')], hold: 1 },
          { actors: rushScene(R_HOVER, [RUSH_DOG], [rushAt('beat2', 30, -16)]), hold: 1 },
          { actors: rushScene(R_HOVER, [RUSH_DOG], [rushAt('beat1', 29, -13), rushAt('hitSpark', 26, -14)]), texts: [woof('PECK', 20, -8)], hold: 1 },
          { actors: rushScene(R_ENTER, [RUSH_DOG], [rushAt('beat2', 30, -16), rushAt('hitSpark', 27, -16)]), texts: [woof('PECK PECK', 20, -8)], hold: 2 },
          { actors: rushScene(null, [RUSH_WAG], [rushAt('beat1', 33, -24, { offstage: true })]), texts: [woof('PECK PECK', 20, -8)], hold: 1 },
          { actors: rushScene(null, [RUSH_WAG]), texts: [woof('GOOD BIRD')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Rush Jet. Rush hovers out of reach.', [
          ...rStart(),
          { actors: rushScene(R_HOVER, [RUSH_DOG]), texts: [woof('NOPE.')], hold: 1 },
          { actors: rushScene(R_HOVER, [rushAt('rush', RX, -18), jet(RX, -18)]), hold: 1 },
          { actors: rushScene(R_PAT, [rushAt('rush', RX, -18), jet(RX, -18)]), texts: [txt('?', 28, 0, GOLD)], hold: 2 },
          { actors: rushScene(R_HOVER, [rushAt('rushWag', RX, -18), jet(RX, -18)]), texts: [txt('?', 28, 0, GOLD), woof('WOOF.', 24, -20)], hold: 2 },
          { actors: rushScene(R_ENTER, [rushAt('rush', RX, -18), jet(RX, -18)]), texts: [woof('WOOF.', 24, -20)], hold: 2 },
          { actors: rushScene(null, [rushAt('rushWag', RX, 1)]), hold: 1 },
          { actors: rushScene(null, [RUSH_DOG]), hold: 1 },
        ]),
      ),
    ],
    snapped: [
      take(
        ...captioned('Rush teleported out. Rush has had enough.', [
          ...rStart(),
          { actors: rushScene(R_PAT, [RUSH_DOG]), texts: [woof('GRRR.', 29, 0, RED)], hold: 2 },
          { actors: rushScene(R_ENTER, [RUSH_DOG]), texts: [woof('ENOUGH.', 29, 0, RED)], hold: 2 },
          { actors: rushScene(null, [RUSH_DOG]), texts: [woof('ENOUGH.', 29, 0, RED)], hold: 1 },
          ...RUSH_BEAMS_OUT,
        ]),
      ),
      take(
        ...captioned('Rush Jet. Rush flew off without you.', [
          ...rStart(),
          { actors: rushScene(R_PAT, [RUSH_DOG]), texts: [woof('...')], hold: 2 },
          { actors: rushScene(R_HOVER, [rushAt('rush', RX, 1), jet(RX, 1)]), texts: [woof('BYE.')], hold: 2 },
          { actors: rushScene(R_ENTER, [rushAt('rush', RX, 1), jet(RX, 1)]), hold: 1 },
          ...RUSH_JETS_OUT,
        ]),
      ),
    ],
  },
  // Rush's rest: the robot alone on the stage, looking for the dog.
  rest: loop(
    { actors: [robot('stand')], hold: 8 },
    { actors: [robot('stand')], texts: [says('RUSH?')], hold: 6 },
    { actors: [robot('stand'), { ...whistle(17, -6), gone: 'robot' }], hold: 6 },
    { actors: [robot('stand')], texts: [txt('...', 28, 0)], hold: 8 },
  ),
}

// 3. Knock on the Met. It sits where the buster aims; the finger comes down on
// the hard hat. The finger is scenery here too.
const MX = TARGET
/** Where the finger comes down: its tip (the sprite's columns 6..7) over the hat's middle. */
const M_HAND = MX - 3
const M_ENTER = -24
const M_HOVER = -6
const M_KNOCK = 0
const MET_H: Record<string, number> = { met: 5, metPeek: 7, metStep: 7, metGlare: 7, boltDrop: 7, disk: 7, hitSpark: 7, pellet: 3 }
/** A Met (hidden, peeking, stepping, glaring) on the floor at `x`, or `up` pixels over it. */
const metAt = (sprite = 'met', x = MX, up = 0, opts: Partial<Actor> = {}): Actor => at(sprite, x, 16 - (MET_H[sprite] ?? 5) - up, { fixed: true, gone: 'met', ...opts })
const MET = metAt()
const PEEK = metAt('metPeek')
const STEP = metAt('metStep')
/** The Met's line, left of it and over the floor; on a knock frame the finger is in its row, so keep those short. */
const metSays = (text: string, y = 6, x = 20, color = '#fcfcfc'): SceneText => ({ ...txt(text, x, y, color), gone: 'met' })
const KNOCKED = metAt('sparkle', MX + 2, 3)
const metScene = (y: number | null, mets: Actor[] = [MET], more: Actor[] = [], who: Actor[] = [robot('stand')]): Actor[] => [
  ...who,
  ...mets,
  ...(y === null ? [] : [glove('finger', M_HAND, y, M_ENTER, { fixed: true })]),
  ...more,
]
const mStart = (mets: Actor[] = [MET]): Frame[] => [
  { actors: metScene(M_ENTER, mets), hold: 1 },
  { actors: metScene(M_HOVER, mets), hold: 1 },
  { actors: metScene(M_KNOCK, mets, [KNOCKED]), hold: 1 },
]
/** The Met walks off to the right on its little feet. */
const MET_WALKS_OFF: Frame[] = [
  { actors: metScene(null, [metAt('metStep', 32, 0, { offstage: true })]), hold: 1 },
  { actors: metScene(null, [metAt('metPeek', 36, 0, { offstage: true })]), hold: 1 },
  { actors: metScene(null, [metAt('metStep', 41, 0, { offstage: true })]), hold: 1 },
  { actors: metScene(null, []), texts: [txt('...', 20, 6)], hold: 3 },
]
/** The Met walks behind the robot to the ladder and climbs off the top. */
const MET_TAKES_LADDER: Frame[] = [
  { actors: [STEP, robot('stand')], hold: 1 },
  { actors: [metAt('metPeek', 18), robot('stand')], hold: 1 },
  { actors: [metAt('metStep', 6), robot('stand')], hold: 1 },
  { actors: [metAt('metPeek', -10), robot('stand')], hold: 1 },
  { actors: [metAt('metStep', -10, 8), robot('stand')], hold: 1 },
  { actors: [metAt('metPeek', -10, 18), robot('stand')], hold: 1 },
  { actors: [metAt('metStep', -10, 30, { offstage: true }), robot('stand')], hold: 1 },
  { actors: [metAt('metPeek', -10, 44, { offstage: true }), robot('stand')], hold: 1 },
  { actors: [robot('stand')], texts: [txt('...', 20, 6)], hold: 3 },
]
const knockMet: ThemeAction = {
  id: 'met',
  label: 'KNOCK ON MET',
  restLabel: '(MET GONE)',
  gone: ['met'],
  needs: ['met'],
  reactions: {
    calm: [
      take(
        ...captioned('Knock knock. Nobody is home.', [
          ...mStart(),
          { actors: metScene(M_HOVER), texts: [metSays('KNOCK.')], hold: 1 },
          { actors: metScene(M_KNOCK, [MET], [KNOCKED]), texts: [metSays('KNOCK.')], hold: 1 },
          { actors: metScene(M_HOVER), texts: [metSays('...')], hold: 3 },
          { actors: metScene(null), texts: [metSays('...')], hold: 1 },
          { actors: metScene(null, [PEEK]), texts: [metSays('?', 6, 20, GOLD)], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The Met peeks out. Then thinks better of it.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('HI.')], hold: 2 },
          { actors: metScene(M_KNOCK, [PEEK], [KNOCKED]), texts: [metSays('!', 6, 20, GOLD)], hold: 1 },
          { actors: metScene(M_HOVER, [MET]), hold: 2 },
          { actors: metScene(null, [MET]), texts: [metSays('NO.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The Met waves back. With its feet.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('HI.')], hold: 1 },
          { actors: metScene(M_HOVER, [STEP]), texts: [metSays('HI.')], hold: 1 },
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('HI HI.')], hold: 1 },
          { actors: metScene(null, [STEP]), texts: [metSays('HI HI.')], hold: 1 },
          { actors: metScene(null, [PEEK]), texts: [metSays('HI HI HI.')], hold: 3 },
          { actors: metScene(null, [MET]), hold: 1 },
        ]),
      ),
      take(
        ...captioned('Knocked on the Met. Sounds hollow.', [
          { actors: metScene(M_ENTER), hold: 1 },
          { actors: metScene(M_HOVER), hold: 1 },
          { actors: metScene(M_KNOCK, [MET], [metAt('sparkle', MX + 1, 3)]), hold: 1 },
          { actors: metScene(M_HOVER), texts: [txt('*tonk*', 20, 6)], hold: 2 },
          { actors: metScene(M_KNOCK, [MET], [metAt('sparkle', MX + 3, 3)]), hold: 1 },
          { actors: metScene(M_HOVER), texts: [txt('*tonk*', 20, 6)], hold: 2 },
          { actors: metScene(null, [PEEK]), texts: [metSays('HEY.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The Met drops a bolt. A tip for the knock.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK]), hold: 1 },
          { actors: metScene(M_HOVER, [PEEK, metAt('boltDrop', 22, 0)]), texts: [metSays('TIP.', 6, 20)], hold: 2 },
          { actors: metScene(M_ENTER, [MET, metAt('boltDrop', 22, 0), metAt('sparkle', 20, 5)]), hold: 2 },
          { actors: metScene(null, [MET, metAt('boltDrop', 22, 0)]), texts: [says('THANKS?')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The Met is asleep. The Met is still asleep.', [
          { actors: metScene(M_ENTER), texts: [metSays('z', 4, 27, CYAN)], hold: 1 },
          { actors: metScene(M_HOVER), texts: [metSays('z', 4, 27, CYAN)], hold: 1 },
          { actors: metScene(M_KNOCK, [MET], [KNOCKED]), hold: 1 },
          { actors: metScene(M_HOVER), texts: [metSays('z', 4, 27, CYAN)], hold: 2 },
          { actors: metScene(M_KNOCK, [MET], [KNOCKED]), hold: 1 },
          { actors: metScene(M_ENTER), texts: [metSays('z', 4, 27, CYAN)], hold: 2 },
          { actors: metScene(null), texts: [metSays('z', 4, 27, CYAN), metSays('Z', 2, 28, CYAN)], hold: 3 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('The Met fires. Three ways. Rude.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('!', 6, 20, RED)], hold: 1 },
          { actors: metScene(M_HOVER, [PEEK], [metAt('pellet', 25, 10), metAt('pellet', 29, 11), metAt('pellet', 33, 10)]), hold: 1 },
          { actors: metScene(M_ENTER, [PEEK], [metAt('pellet', 22, 17), metAt('pellet', 29, 21), metAt('pellet', 35, 17)]), hold: 1 },
          { actors: metScene(null, [PEEK], [metAt('pellet', 19, 27), metAt('pellet', 29, 34, { offstage: true }), metAt('pellet', 35, 27)]), hold: 1 },
          { actors: metScene(null, [MET], [], [robot('stand'), ...ROBOT_SWEAT]), texts: [says('RUDE.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The Met glares. From under the helmet.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [metAt('metGlare')]), texts: [metSays('...')], hold: 3 },
          { actors: metScene(M_ENTER, [metAt('metGlare')]), texts: [metSays('GRR.', 6, 20, RED)], hold: 2 },
          { actors: metScene(null, [metAt('metGlare')]), texts: [metSays('GRR.', 6, 20, RED)], hold: 2 },
          { actors: metScene(null, [MET]), hold: 1 },
        ]),
      ),
      take(
        ...captioned('The Met writes to the Doctor. About you.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK, metAt('disk', 21, 0)]), texts: [metSays('DEAR DOCTOR,')], hold: 3 },
          { actors: metScene(M_ENTER, [PEEK, metAt('disk', 21, 0)]), texts: [metSays('...')], hold: 1 },
          { actors: metScene(null, [PEEK, metAt('disk', 21, 0)]), texts: [metSays('SINCERELY, MET.')], hold: 3 },
          { actors: metScene(null, [MET, metAt('disk', 21, 0)]), hold: 1 },
        ]),
      ),
      take(
        ...captioned('The Met calls its union rep. Also a Met.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('REP!')], hold: 2 },
          { actors: metScene(M_HOVER, [MET, metAt('metStep', 16)]), hold: 1 },
          { actors: metScene(M_HOVER, [MET, metAt('met', 20)]), texts: [metSays('...', 6, 20), metSays('...', 6, 28)], hold: 3 },
          { actors: metScene(null, [MET, metAt('met', 20)]), texts: [metSays('...', 6, 20), metSays('...', 6, 28)], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Please stop knocking. Signed, the Met.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('STOP KNOCKING.')], hold: 3 },
          { actors: metScene(M_KNOCK, [PEEK], [KNOCKED]), texts: [metSays('!', 6, 20, GOLD)], hold: 1 },
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('I SAID STOP.')], hold: 3 },
          { actors: metScene(null, [MET]), hold: 1 },
        ]),
      ),
    ],
    fedUp: [
      take(
        ...captioned('The Met calls the boss. The boss is busy.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('BOSS!', 6, 20, RED)], hold: 2 },
          { actors: metScene(M_ENTER, [MET], gate('doorOpen')), hold: 1 },
          { actors: metScene(null, [MET], gate('doorHalf')), hold: 1 },
          { actors: metScene(null, [MET], gate('doorShut')), hold: 1 },
          { actors: metScene(null, [MET], [...gate('doorShut'), bossBarAt(1)]), hold: 2 },
          { actors: metScene(null, [MET], [...gate('doorShut'), bossBarAt(1)]), texts: [says('...')], hold: 2 },
          { actors: metScene(null, [MET], gate('doorHalf')), hold: 1 },
          { actors: metScene(null, [PEEK], gate('doorOpen')), texts: [metSays('BUSY.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The Met jumps at the hand. Little feet.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('HYAH!', 6, 20, RED)], hold: 1 },
          { actors: metScene(M_HOVER, [metAt('metPeek', MX, 6)], [metAt('hitSpark', 26, 1)]), texts: [metSays('HYAH!', 6, 20, RED)], hold: 1 },
          { actors: metScene(M_ENTER, [metAt('metPeek', MX, 3)]), hold: 1 },
          { actors: metScene(null, [STEP]), hold: 1 },
          { actors: metScene(null, [PEEK]), texts: [metSays('...')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The Mets stack up. The top one is in charge.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('MET!', 6, 20, RED)], hold: 1 },
          { actors: metScene(M_HOVER, [MET, metAt('met', MX, 5)]), hold: 1 },
          { actors: metScene(M_ENTER, [MET, metAt('met', MX, 5), metAt('met', MX, 10)]), hold: 1 },
          { actors: metScene(null, [MET, metAt('met', MX, 5), metAt('met', MX, 10)]), texts: [metSays('...', 6), metSays('...', 1), metSays('...', -4)], hold: 3 },
          { actors: metScene(null, [MET, metAt('met', MX, 5), metAt('met', MX, 10)], [], [robot('stand'), ...ROBOT_SWEAT]), texts: [metSays('...', 6), metSays('...', 1), metSays('...', -4)], hold: 2 },
        ]),
      ),
    ],
    snapped: [
      take(
        ...captioned('The Met walked off. To another stage.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('BYE.')], hold: 2 },
          { actors: metScene(M_ENTER, [STEP]), texts: [metSays('BYE.')], hold: 1 },
          ...MET_WALKS_OFF,
        ]),
      ),
      take(
        ...captioned('The Met took the ladder. Somewhere to be.', [
          ...mStart(),
          { actors: metScene(M_HOVER, [PEEK]), texts: [metSays('THAT IS IT.')], hold: 2 },
          { actors: metScene(M_ENTER, [PEEK]), hold: 1 },
          ...MET_TAKES_LADDER,
        ]),
      ),
    ],
  },
  // The Met's rest: the robot alone, the spot by the buster empty.
  rest: loop(
    { actors: [robot('stand')], hold: 8 },
    { actors: [robot('stand')], texts: [txt('...', 20, 6)], hold: 6 },
    { actors: [robot('walk')], hold: 2 },
    { actors: [robot('stand')], texts: [says('MET?')], hold: 6 },
  ),
}

const actions: ThemeAction[] = [pokeRobot, petRush, knockMet]

const poses = (p: string) => ({ stand: `${p}Stand`, walk: `${p}Walk`, attack: `${p}Attack`, itemGet: `${p}ItemGet`, sleep: `${p}Sleep` })
// The big forms' buster is four columns further out and two rows higher than the Blue Bomber's.
const BIG_FORM = { dx: -4, dy: -7, lift: 7, hand: { x: 4, y: -2 } }

export const megaman: Theme = {
  id: 'megaman',
  name: 'Mega Context',
  description: 'Blue-bomber action homage: a robot per model, a buster shot per effort, life energy ticks, bolts and a skull fortress',
  version: '1.1.0',
  palette: {
    dark: { accent: '#3cbcfc', gold: '#fcc400', red: '#fc5838', label: '#fc9838', dim: '#8c8c9c', text: '#fcfcfc' },
    light: { accent: '#0058c8', gold: '#906400', red: '#c02000', label: '#b04c00', dim: '#6c6c78', text: '#1c1c24' },
  },
  pixels,
  labels: {
    // The gauges by the names on the bar; spelled out as "life energy" and so on, the rows would not fit 48 columns.
    context: 'LIFE',
    spend: 'BOLTS',
    cache: 'WEAPON',
    limits: 'BOSS',
    modelItem: 'ROBOT',
    effortItem: 'BUSTER',
    heroes: 'Robots',
    weapons: 'Buster shots',
  },
  headings: {
    Context: 'Life energy',
    Cost: 'Bolts',
    'Next message': 'Weapon energy',
    Tokens: 'Score',
    Limits: 'Boss energy',
    'Tool calls': 'Support items',
    Files: 'Stage select',
  },
  sprites,
  states,
  cold,
  overkill,
  events,
  actions,
  scene: {
    height: 40,
    anchor: { x: 10, y: 20 },
    background: {
      ground: '#3cbcfc',
      gradient: ['#2c88f0', '#58b8fc', '#a8e0fc'],
      deep: ['#200410', '#681020', '#d84818'],
      floor: 'floor',
      shade: { color: '#300818', amount: 0.35 },
      // Past the action (columns 0..45), from the right edge in: the fortress's tower at 58, its keep at 80, its gate at 96.
      decor: [
        { sprite: 'cloud', x: 30, y: 2, sky: true, maxPercent: 45 },
        { sprite: 'cloudSmall', x: -1, y: 9, sky: true, maxPercent: 30, minColumns: 56 },
        { sprite: 'cloud', x: -20, y: 5, sky: true, maxPercent: 45, minColumns: 78 },
        { sprite: 'cloudSmall', x: -39, y: 11, sky: true, maxPercent: 30, minColumns: 94 },
        { sprite: 'ladder', x: 0, y: -24 },
        { sprite: 'towerFar', x: -3, y: 27, maxPercent: 30, minColumns: 56 },
        { sprite: 'towerMid', x: -2, y: 23, minPercent: 30, maxPercent: 50, minColumns: 56 },
        { sprite: 'tower', x: -1, y: 9, minPercent: 50, minColumns: 56 },
        { sprite: 'keepFar', x: -14, y: 29, maxPercent: 30, minColumns: 78 },
        { sprite: 'keepMid', x: -13, y: 26, minPercent: 30, maxPercent: 50, minColumns: 78 },
        { sprite: 'fortress', x: -10, y: 18, minPercent: 50, minColumns: 78 },
        { sprite: 'gateFar', x: -35, y: 32, maxPercent: 30, minColumns: 94 },
        { sprite: 'gateMid', x: -35, y: 29, minPercent: 30, maxPercent: 50, minColumns: 94 },
        { sprite: 'gate', x: -32, y: 23, minPercent: 50, minColumns: 94 },
      ],
      particles: [
        { colors: ['W', 'c'], count: 10, drift: 'none', minPercent: 40, maxPercent: 75 },
        { colors: ['O', 'R', 'e'], count: 14, drift: 'up', speed: 1, minPercent: 75 },
      ],
    },
    hero: { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'sleep' },
    heroTiers: { tier1: {}, tier2: {}, tier3: {}, tier4: {}, unknown: {} },
    heroForms: {
      // Her pointing hand is a row lower than the buster.
      tier1: { poses: poses('roll'), dx: -2, dy: 1, lift: 0, hand: { x: 0, y: 1 } },
      tier3: { poses: poses('sa'), ...BIG_FORM },
      tier4: { poses: poses('bs'), ...BIG_FORM },
      unknown: { poses: poses('proto'), dx: -2, dy: 0, lift: 0 },
    },
    heroNames: {
      tier1: 'Housekeeping Bot',
      tier2: 'Blue Bomber',
      tier3: 'Super Adaptor',
      tier4: 'Treble Boost',
      unknown: 'Whistling Stranger',
    },
    weapons: {
      low: { sprite: 'lemon', swap: {}, poses: { held: { sprite: 'lemonHeld' } }, name: 'Lemon Shot' },
      medium: { sprite: 'halfCharge', swap: {}, poses: { held: { sprite: 'halfChargeHeld' } }, name: 'Half Charge' },
      high: { sprite: 'chargeShot', swap: {}, poses: { held: { sprite: 'chargeShotHeld' } }, name: 'Charge Shot' },
      xhigh: { sprite: 'metalBlade', swap: {}, poses: { held: { sprite: 'metalBladeHeld' } }, name: 'Metal Blade' },
      max: { sprite: 'blackHole', swap: {}, aura: 'blackHoleAura', poses: { held: { sprite: 'blackHoleHeld', aura: 'blackHoleAuraHeld' } }, name: 'Black Hole Bomb' },
    },
    bar: {
      // Ten life ticks, one per milestone. 77 columns with five digits of bolts: one row at 80; below that the hero's own gauges, then the boss and the boxes.
      widgets: [
        { kind: 'meter', value: 'contextLeft', count: 10, perRow: 10, sprites: ['tickOff', 'lifeOn'], gap: 0, label: 'LIFE', pulseBelow: 0.25 },
        { kind: 'meter', value: 'cache', count: 6, perRow: 6, sprites: ['tickOff', 'wpnOn'], gap: 0, label: 'WPN', drop: 2 },
        { kind: 'counter', value: 'spend', icon: 'bolt', digits: 3 },
        { kind: 'meter', value: 'limitsUsed', count: 6, perRow: 6, sprites: ['tickOff', 'bossOn'], gap: 0, label: 'BOSS', pulseAbove: 0.9, drop: 3, wrap: true },
        { kind: 'box', shows: 'model', sprite: 'miniMega', sprites: { tier1: 'miniRoll', tier3: 'miniSuper', tier4: 'miniBass', unknown: 'miniProto' }, label: 'ROBOT', x: 1, y: 5, drop: 5 },
        { kind: 'box', shows: 'effort', sprite: 'iconCharge', sprites: { low: 'iconLemon', medium: 'iconHalf', xhigh: 'iconBlade', max: 'iconBomb' }, label: 'BUSTER', x: 1, y: 5, drop: 4 },
      ],
      colors: { bg: 'black', box: 'boxFrame', text: 'W', label: 'barLabel', map: 'tickOff', mapDot: 'B' },
    },
    lineup: { ground: '#58b8fc', ink: '#1c1c24', dim: '#243448', mark: '#7c0800' },
    message: { bg: '#000000', ink: '#fcfcfc' },
  },
  text: {
    idle: 'The robot waits for orders, tapping a foot.',
    thinking: 'The robot sizes up the stage...',
    reading: 'A data disk flies in! The robot catches it.',
    editing: 'The buster blasts a block and a new one drops in.',
    shell: 'Rush Coil! A bounce to run a command.',
    agents: 'Rush, Beat and Eddie head off on errands.',
    toolSuccess: 'A Met goes down and drops a bolt.',
    toolError: 'Hit! Knocked back, flickering.',
    turnComplete: 'Stage clear! A victory pose.',
    milestone: 'A tick drops off the life energy bar.',
    cacheCold: 'Weapon energy drained: back in the lab capsule.',
    limitWarning: 'The boss shutter drops and the boss energy bar fills.',
    compaction: 'An E-Tank refills life energy.',
    modelChange: 'A new robot beams in.',
    effortChange: 'The buster loads a new shot.',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: 'READY! {pct}% OF YOUR LIFE ENERGY USED. KEEP BUSTING.' },
    { level: 'warn', message: '{pct}% OF YOUR LIFE ENERGY USED. WATCH FOR SPIKES.' },
    { level: 'orange', message: '{pct}% OF YOUR LIFE ENERGY USED. REACH A CHECKPOINT SOON.' },
    { level: 'alert', message: 'WARNING! {pct}% OF YOUR LIFE ENERGY USED. THE SKY DARKENS.' },
    { level: 'critical', message: 'WILY STAGE 4! {pct}% OF YOUR LIFE ENERGY IS GONE. SAVE YOUR PROGRESS AND /clear.' },
  ],
  messages: {
    cacheCold: 'WEAPON ENERGY EMPTY. THE CACHE WENT COLD.',
    limitWarning: 'WARNING! BOSS ENERGY RISING: {name} AT {pct}%.',
    compaction: 'E-TANK USED! Life energy refilled (context compacted).',
    modelChange: '{name} beams in!',
    effortChange: 'YOU GOT {weapon}!',
  },
}
