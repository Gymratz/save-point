// "Mega Context": an 8-bit blue-bomber action homage. Every sprite is drawn fresh for this theme in that NES style.
//
// The model is the robot on stage (the helper bot, the Blue Bomber, the winged
// Super Adaptor, the rival fused with his wolf, the whistling stranger), effort
// is the buster's charge, context is the life energy ticks, the cache is weapon
// energy, cents are bolts, the rate limits are the boss's energy bar, and the
// Doctor's skull fortress rises on a reddening sky as the context fills.
//
// The other robots are built from the Blue Bomber's rows: recolored, shifted
// onto a wider canvas and overlaid with wings, fins, a scarf or a shield.

import { at, hero, loop, once, weapon } from './kit'
import type { Actor, Theme } from './types'

const pixels = {
  // The Blue Bomber
  K: '#000000', // outline
  D: '#0070ec', // helmet, hands, boots
  B: '#3cbcfc', // suit
  S: '#fcd8a8', // skin
  W: '#fcfcfc',
  // The helper bot
  Y: '#f8d878', // hair
  y: '#c89838',
  R: '#d82800', // dress, armor
  r: '#901000',
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
  // Hurt flash
  hurtA: '#fcfcfc',
  hurtB: '#fc7460',
  // Weapon-get palette flashes
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
// The helper bot (16x15): blonde ponytail, green ribbon, red dress
// ---------------------------------------------------------------------------

const ROLL_HEAD = [
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
]
const ROLL_BODY = ['.KYKKRRRRRRK....', '..KSKRRRRRRKSK..', '..KKRRRRRRRRRK..']
const ROLL_LEGS = ['...KKKSKKKSKK...', '...KRRK...KRRK..']
const ROLL_STEP = ['...KKKSKKKRRK...', '...KRRK.........']
const ROLL_POINT = ['.KYKKRRRRRRKKKK.', '..KSKRRRRRRKSSSK', '..KKRRRRRRRRRKK.']
const ROLL_UP_HEAD = [
  '.....KKKKKK.....',
  '...KKYYYYYYK....',
  '..KYYYYYYYYYK...',
  'KKYYYYYYYYYYYKKK',
  'KSKYYYKYYYYYYKSK',
  'KSggYKSSSSSSYKSK',
  'KSggKSSWKSWKSKSK',
  '.KYYKSSWKSWKSKK.',
  '.KYYYKSSSSSSKK..',
  'KYYYKKKSSSKK....',
]
const ROLL_UP_BODY = ['.KYKKRRRRRRK....', '...KKRRRRRRK....', '..KKRRRRRRRRRK..']

const rollStand = [...ROLL_HEAD, ...ROLL_BODY, ...ROLL_LEGS]
const rollWalk = [...ROLL_HEAD, ...ROLL_BODY, ...ROLL_STEP]
const rollAttack = [...ROLL_HEAD, ...ROLL_POINT, ...ROLL_LEGS]
const rollItemGet = [...ROLL_UP_HEAD, ...ROLL_UP_BODY, ...ROLL_LEGS]
const rollSleep = shut(rollStand, [6, 7])

// ---------------------------------------------------------------------------
// The whistling stranger (18x16): red helm, dark visor, yellow scarf, shield
// ---------------------------------------------------------------------------

const PROTO = { D: 'R', B: 'x' }
const visor = (rows: Rows): Rows => rows.map((r, y) => (y === 6 ? r.replace('SWKSWK', 'VVVVVV') : y === 7 ? r.replace('SWKSWK', 'SSSSSS') : r))
const SCARF = ['', '', '', '', '', '', '', '', '', '...KKKsssssK', '.KsssssK', 'Ksss.', '.KK', '', '', '']
const SCARF_FLAP = ['', '', '', '', '', '', '', '', 'KK', 'KssKKKsssssK', '.KssssK', '..KK', '', '', '', '']
const SHIELD = ['', '', '', '', '', '', '', '', '', '.KKKK.', 'KxRRxK', 'KRWWRK', 'KRWWRK', 'KRWWRK', 'KxRRxK', '.KKKK.']
const proto = (rows: Rows, scarf = SCARF, shield = true): Rows => {
  const body = shift(visor(recolor(rows, PROTO)), 2, 20)
  const withBody = over(over(blank(20, 16), body), scarf.map(r => r.padEnd(20, '.')))
  return (shield ? over(withBody, SHIELD.map(r => r.padEnd(6, '.')), 14, 0) : withBody).map(r => r.slice(0, 20))
}
const protoStand = proto(mmStand)
const protoWalk = proto(mmWalk, SCARF_FLAP)
const protoAttack = proto(mmAttack, SCARF_FLAP, false)
const protoItemGet = proto(mmItemGet, SCARF, false)
const protoSleep = proto(mmSleep)

// ---------------------------------------------------------------------------
// The Super Adaptor (24x22): gold-crested helm, jet wings, rocket fist
// ---------------------------------------------------------------------------

const BIG_W = 24
const SA_CREST = [
  '..........KK.....KK.....',
  '.........KGGK...KGGK....',
  '.........KGoGK.KGoGK....',
  '..........KGoGKGoGK.....',
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
const SA_LEGS = ['........KRRRKKRRRK......', '.......KRRRRKKRRRRK.....', '......KGGGGGKKGGGGGK....', '.....KGGGGGGK.KGGGGGGK...']
const SA_STEP = ['........KRRRKKRRRRK.....', '.......KRRRRK.KRRRRK....', '......KGGGGGK.KGGGGGGK...', '.....KGGGGGGK...........']
const SA_GUN = [
  '.......KKKKGGKKKK.......',
  '.....KKGGGKRRRKGGGKKKKK.',
  '....KGGGGGKRWRKRRRRRRRRK',
  '....KGoGGKRRRRRRRGGGGGGK',
  '....KRRRKBRRGRRBKRRRRRRK',
  '....KDDDKKBBBBBKKKKKKKK.',
]
const SA_UP_HEAD = [
  '..........KK.....KK.....',
  '.........KGGK...KGGK....',
  '...KK....KGoGK.KGoGK.KK.',
  '..KGGK....KGoGKGoGK.KGGK',
  ...shift(recolor(MM_HEAD, { D: 'R', B: 'G' }), 4, BIG_W).map((r, y) => (y < 4 ? over([r], [y === 0 ? '..KGGK' : '..KRRK'])[0]! : r)),
]
const SA_UP_BODY = [
  '..KRRK.KKKKGGKKKK.KRRK..',
  '...KRRKKGGKRRRKGGKRRK...',
  '....KGGGGGKRWRKGGGGGK...',
  '....KGoGGKRRRRRKGGoGK...',
  '.....KRRKBRRGRRBKRRK....',
  '.....KKKKKBBBBBKKKKK....',
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
].map(r => r.padEnd(BIG_W, '.'))
const winged = (rows: Rows, wings = SA_WINGS) => over(wings, rows)
const saStand = winged([...SA_CREST, ...SA_HEAD, ...SA_BODY, ...SA_LEGS])
const saWalk = winged([...SA_CREST, ...SA_HEAD, ...SA_BODY, ...SA_STEP])
const saAttack = winged([...SA_CREST, ...SA_HEAD, ...SA_GUN, ...SA_LEGS])
const saItemGet = winged([...SA_UP_HEAD, ...SA_UP_BODY, ...SA_LEGS])
const saSleep = shut(saStand, [9, 10])

// ---------------------------------------------------------------------------
// The rival fused with his wolf (24x22): black and gold, finned helm, wings
// ---------------------------------------------------------------------------

const FIN = ['..KK', '..KGK', '..KGnK', '...KGnK', '....KGnK', '.....KGnK', '......KK'].map(r => r.padEnd(12, '.'))
/** The rival's helm fins, left and mirrored right, laid over the helm. */
const BS_FINS = FIN.map(r => r + [...r].reverse().join(''))
const BS = { D: 'n', B: 'N' }
const BS_HEAD = shift(recolor(MM_HEAD, BS), 4, BIG_W).map((r, y) => (y === 1 ? r.replace('KnnnNNnK', 'KnnRRnnK') : y === 2 ? r.replace('KnnnnnNNnK', 'KnnnRRnnnK') : r))
const BS_BODY = recolor(SA_BODY, { G: 'G', o: 'o', R: 'n', W: 'R', B: 'N', D: 'G' })
const BS_GUN = recolor(SA_GUN, { R: 'n', W: 'R', B: 'N', D: 'G' })
const BS_LEGS = recolor(SA_LEGS, { R: 'n' })
const BS_STEP = recolor(SA_STEP, { R: 'n' })
const BS_UP = recolor(SA_UP_BODY, { R: 'n', W: 'R', B: 'N' })
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
].map(r => r.padEnd(BIG_W, '.'))
const bass = (rows: Rows) => over(over(BS_WINGS, rows), BS_FINS)
const bsStand = bass([...blank(BIG_W, 4), ...BS_HEAD, ...BS_BODY, ...BS_LEGS])
const bsWalk = bass([...blank(BIG_W, 4), ...BS_HEAD, ...BS_BODY, ...BS_STEP])
const bsAttack = bass([...blank(BIG_W, 4), ...BS_HEAD, ...BS_GUN, ...BS_LEGS])
const bsItemGet = bass([...blank(BIG_W, 4), ...BS_HEAD, ...BS_UP, ...BS_LEGS])
const bsSleep = shut(bsStand, [9, 10])

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

/** Pads a shot to 9 rows, centered, so every shot flies at one height. */
const shot = (rows: Rows): { rows: Rows } => {
  const w = Math.max(...rows.map(r => r.length))
  const top = Math.floor((9 - rows.length) / 2)
  return sp([...blank(w, top), ...rows, ...blank(w, 9 - rows.length - top)])
}

const TICK_ON = ['e.', 'W.', 'W.', 'W.', 'W.', 'W.', 'W.', 'e.']
const TICK_OFF = ['X.', 'X.', 'X.', 'X.', 'X.', 'X.', 'X.', 'X.']

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
  lemon: shot(['.ee.', 'eWWe', 'eWWe', '.ee.']),
  halfCharge: shot(['..cc..', '.cWWc.', 'cWWWWc', 'cWWWWc', '.cWWc.', '..cc..']),
  chargeShot: shot(['....ccccc..', '.cc.cWWWWc.', '...cWWWWWWc', 'cccWWWWWWWc', 'cccWWWWWWWc', '...cWWWWWWc', '.cc.cWWWWc.', '....ccccc..']),
  metalBlade: shot(['...m.m...', '.m.mmm.m.', '..mmMmm..', 'mmmMRMmmm', '.mMRKRMm.', 'mmmMRMmmm', '..mmMmm..', '.m.mmm.m.', '...m.m...']),
  blackHole: shot(['...PPP...', '.PPpppPP.', '.PpKKKpP.', 'PpKKKKKpP', 'PpKKWKKpP', 'PpKKKKKpP', '.PpKKKpP.', '.PPpppPP.', '...PPP...']),
  blackHoleAura: sp(['.W.......P.', '...........', 'P.........W', '...........', '...........', '...........', '...........', '...........', 'W.........P', '...........', '.P.......W.']),
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
  ladder: sp(Array.from({ length: 20 }, (_, y) => (y % 4 === 0 ? 'MmmmmM' : 'M....M'))),
  fortressFar: sp([
    '..k.....k...',
    '.kkk.kk.kkk.',
    '.kqk.kuk.kqk',
    'kkkkkukukkkk',
    'kqkkkkukkkqk',
    'kkkkkkkkkkkk',
  ]),
  fortress: sp([
    '..k.................k...',
    '.kqk...............kqk..',
    '.kqk.....kuuuuk....kqk..',
    'kqqqk...kuuuuuuk..kqqqk.',
    'kqOqk..kuuuuuuuuk.kqOqk.',
    'kqqqk..kuKKuuKKuk.kqqqk.',
    'kqqqk..kuKRuuKRuk.kqqqk.',
    'kqOqk..kuuuKKuuuk.kqOqk.',
    'kqqqk...kuuuuuuk..kqqqk.',
    'kqqqk...kuKuKuKk..kqqqk.',
    'kqqqkkkkkkukukukkkkqqqkk',
    'kqQqqqqqqkkkkkkqqqqqQqkk',
    'kqQqOqqOqqqqqqqqOqqOQqkk',
    'kqQqqqqqqqqqqqqqqqqqQqkk',
    'kqQqqqqqqQQQQQQqqqqqQqkk',
    'kqQqqqqqQkkkkkkQqqqqQqkk',
    'kqQqqqqqQkkkkkkQqqqqQqkk',
    'kkkkkkkkkkkkkkkkkkkkkkkk',
  ]),
  // Stage props
  met: sp(['..GGGG..', '.GGGGGG.', 'GGGoGGGG', 'GGGGGGGG', 'oooooooo']),
  metPeek: sp(['..GGGG..', '.GGGGGG.', 'GGGGGGGG', 'oooooooo', '.KWKKWK.', '.KKKKKK.', '.OO..OO.']),
  boom1: sp(['...W...', '.W.c.W.', '..cWc..', 'WcWWWcW', '..cWc..', '.W.c.W.', '...W...']),
  boom2: sp(['W...W...W', '.........', '..c...c..', '.........', 'W...W...W', '.........', '..c...c..', '.........', 'W...W...W']),
  boltDrop: sp(['.mm.', 'mWmM', 'mmMM', '.mM.', '.Mm.', '.mM.']),
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
  rushCoil: sp(['....mmmmmm....', '.....MMMM.....', '....mmmmmm....', '.....MMMM.....']),
  beat1: sp(['.K..K...', 'KBKKBK..', '.KBBBKK.', 'KBBWKBGK', '.KBBBBK.', '..KGKG..']),
  beat2: sp(['........', 'KK...KK.', 'KBKKKBK.', '.KBBWKGK', '.KBBBBK.', '..KGKG..']),
  eddie: sp(['..KKKKKK..', '.KRRRRRRK.', '.KRRRRRRK.', 'KKKKKKKKKK', 'KmmmmmmmmK', 'KmWKmmWKmK', 'KmmmmmmmmK', '.KmmmmmmK.', '.KKK..KKK.', 'KRRK..KRRK']),
  capsule: sp([
    '...KKKKKKKKKKKKKKKKKKKK...',
    '..KmmmmmmmmmmmmmmmmmmmmK..',
    '.KmMMMMMMMMMMMMMMMMMMMMmK.',
    'KMK....................KMK',
    ...Array.from({ length: 22 }, (_, y) => (y % 7 === 2 ? 'KMKc..................cKMK' : y % 7 === 3 ? 'KMK.c..................KMK' : 'KMK....................KMK')),
    'KmmmmmmmmmmmmmmmmmmmmmmmmK',
    'KMMMcMMMMMMMMMMMMMMMMcMMMK',
    'KKKKKKKKKKKKKKKKKKKKKKKKKK',
  ]),
  beam: sp(Array.from({ length: 16 }, (_, y) => (y % 3 === 0 ? '.WW.' : 'cWWc'))),
  beamLand: sp(['..cWWc..', '.cW..Wc.', 'cW....Wc', '.cW..Wc.', 'cWWWWWWc']),
  etank: sp(['.KKKKKK.', 'KmmmmmmK', 'KDBBBBDK', 'KDWWWBDK', 'KDWBBBDK', 'KDWWBBDK', 'KDWBBBDK', 'KDWWWBDK', 'KDBBBBDK', '.KKKKKK.']),
  doorOpen: sp(['KmmmmmmK', 'KMMMMMMK', ...Array.from({ length: 4 }, () => 'KmMmMmMK'), 'KKKKKKKK']),
  doorShut: sp(['KmmmmmmK', 'KMMMMMMK', ...Array.from({ length: 26 }, (_, y) => (y % 3 === 2 ? 'KKKKKKKK' : y % 3 === 0 ? 'KmmmmmmK' : 'KMMMMMMK')), 'KKKKKKKK']),
  doorHalf: sp(['KmmmmmmK', 'KMMMMMMK', ...Array.from({ length: 13 }, (_, y) => (y % 3 === 2 ? 'KKKKKKKK' : y % 3 === 0 ? 'KmmmmmmK' : 'KMMMMMMK')), 'KKKKKKKK']),
  hitSpark: sp(['W..W..W', '.W.W.W.', '..WWW..', 'WWWOWWW', '..WWW..', '.W.W.W.', 'W..W..W']),
  sparkle: sp(['..W..', '..c..', 'WcWcW', '..c..', '..W..']),
  sweat: sp(['.c.', 'cWc', '.c.']),
}

// ---------------------------------------------------------------------------
// Frames. Actors sit relative to the hero's top-left; the floor is y 16.
// ---------------------------------------------------------------------------

const txt = (text: string, x: number, y: number, color = '#fcfcfc', bg?: string) => ({ text, x, y, color, ...(bg ? { bg } : {}) })
const LIFT = 6
/** Scenery placed in the stage, not carried over a robot's head. */
const prop = (sprite: string, x: number, y: number, opts: { flip?: boolean } = {}): Actor => at(sprite, x, y, { ...opts, fixed: true })
/** The buster's shot, in flight. */
const fire = (x: number) => weapon(x, 7)
const capsule = () => prop('capsule', -5, -14)
const beam = (): Actor[] => [prop('beam', 6, 0), prop('beam', 6, -16), prop('beam', 6, -20)]

/** The stranger whistles his tune (a note only he gets). */
const whistle = (x: number, y: number): Actor => ({ ...at('note', x, y), tiers: ['unknown'] })

const BLOCKS = { x: 30, y: 8 }
const blocks = (top = true): Actor[] => [prop('block', BLOCKS.x, BLOCKS.y), ...(top ? [prop('block', BLOCKS.x, BLOCKS.y - 8)] : [])]
const DISK = { x: 6, y: -12 }
const RUSH = { x: 18, y: 6 }

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
    { actors: [hero('stand')], texts: [txt('.', 17, -2)], hold: 2 },
    { actors: [hero('stand')], texts: [txt('..', 17, -2)], hold: 2 },
    { actors: [hero('sleep')], texts: [txt('...', 17, -2)], hold: 1 },
    { actors: [hero('stand')], texts: [txt('...', 17, -2)], hold: 1 },
    { actors: [hero('walk')], texts: [txt('?', 18, -4, '#fcc400')], hold: 2 },
  ),
  reading: loop(
    { actors: [hero('stand'), prop('disk', 30, -2)], hold: 1 },
    { actors: [hero('stand'), prop('disk', 22, -6)], hold: 1 },
    { actors: [hero('stand'), prop('disk', 14, -10)], hold: 1 },
    { actors: [hero('itemGet'), at('disk', DISK.x + 1, DISK.y)], hold: 2 },
    { actors: [hero('itemGet'), at('disk', DISK.x + 1, DISK.y), at('sparkle', DISK.x - 4, DISK.y - 2)], texts: [txt('DATA', 18, -8, '#a8f0fc')], hold: 2 },
    { actors: [hero('stand')], hold: 1 },
  ),
  editing: loop(
    { actors: [hero('stand'), ...blocks()], hold: 2 },
    { actors: [hero('attack'), ...blocks(), fire(16)], hold: 1 },
    { actors: [hero('attack'), ...blocks(), fire(20)], hold: 1 },
    { actors: [hero('attack'), at('block', BLOCKS.x, BLOCKS.y), prop('debris', 30, -2), prop('debris', 35, -1), prop('hitSpark', 29, -1)], hold: 1 },
    { actors: [hero('stand'), at('block', BLOCKS.x, BLOCKS.y), prop('debris', 28, -6), prop('debris', 38, -4)], hold: 1 },
    { actors: [hero('stand'), at('block', BLOCKS.x, BLOCKS.y), at('debris', 27, 2), at('debris', 40, 4)], hold: 1 },
    { actors: [hero('walk'), at('block', BLOCKS.x, BLOCKS.y), prop('block', BLOCKS.x, BLOCKS.y - 14)], hold: 1 },
    { actors: [hero('stand'), ...blocks()], hold: 1 },
  ),
  shell: loop(
    { actors: [hero('stand'), at('rush', RUSH.x, RUSH.y)], hold: 2 },
    { actors: [at('rush', RUSH.x, RUSH.y), at('rushCoil', RUSH.x, RUSH.y - 4), hero('walk', 14, -10)], hold: 1 },
    { actors: [at('rush', RUSH.x, RUSH.y), at('rushCoil', RUSH.x, RUSH.y - 4), hero('stand', 16, -6)], hold: 1 },
    { actors: [at('rush', RUSH.x, RUSH.y), hero('itemGet', 16, -14)], texts: [txt('BOING', 34, -10, '#fc9838')], hold: 1 },
    { actors: [at('rush', RUSH.x, RUSH.y), hero('itemGet', 12, -14)], hold: 1 },
    { actors: [at('rush', RUSH.x, RUSH.y), hero('walk', 6, -10)], hold: 1 },
    { actors: [at('rush', RUSH.x, RUSH.y), hero('stand', 0, 0)], hold: 2 },
  ),
  agents: loop(
    { actors: [hero('itemGet'), at('rush', 18, 6), prop('beat1', 8, -12), at('eddie', -12, 6)], hold: 2 },
    { actors: [hero('itemGet'), at('rush', 24, 6, { flip: true }), prop('beat2', 14, -13), at('eddie', -12, 4)], hold: 1 },
    { actors: [hero('stand'), at('rush', 31, 6, { flip: true }), prop('beat1', 21, -14), at('eddie', -14, 6)], hold: 1 },
    { actors: [hero('stand'), at('rush', 38, 6, { flip: true }), prop('beat2', 29, -15), at('eddie', -18, 4)], hold: 1 },
    { actors: [hero('stand'), at('rush', 45, 6, { flip: true }), prop('beat1', 37, -16), at('eddie', -22, 6)], hold: 1 },
    { actors: [hero('stand')], texts: [txt('. . .', 18, -2)], hold: 2 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop(
    { actors: [hero('sleep'), capsule()], texts: [txt('z', 18, -6, '#a8f0fc')], hold: 3 },
    { actors: [hero('sleep'), capsule()], texts: [txt('Z', 19, -8, '#a8f0fc')], hold: 3 },
  ),
  thinking: loop(
    { actors: [hero('stand'), capsule()], hold: 3 },
    { actors: [hero('sleep'), capsule()], hold: 1 },
    { actors: [hero('stand'), capsule()], texts: [txt('?', 20, -8, '#a8f0fc')], hold: 3 },
  ),
}

const SIGH = 'Overpowered for this stage.'
const sweat = at('sweat', 16, -2)
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), prop('disk', 22, -6), sweat], hold: 2, caption: SIGH },
    { actors: [hero('itemGet'), at('disk', DISK.x + 1, DISK.y), sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), sweat], texts: [txt('~sigh~', 18, -6)], hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [hero('stand'), at('rush', RUSH.x, RUSH.y), sweat], hold: 2, caption: SIGH },
    { actors: [at('rush', RUSH.x, RUSH.y), hero('itemGet', 14, -10)], hold: 1, caption: SIGH },
    { actors: [at('rush', RUSH.x, RUSH.y), hero('stand'), sweat], texts: [txt('~sigh~', 18, -6)], hold: 3, caption: SIGH },
  ),
}

const FLASH = { D: 'hurtA', B: 'hurtB', R: 'hurtA', G: 'hurtB', n: 'hurtA', Y: 'hurtB', x: 'hurtB' }
/** The weapon-get palette flashes, on every robot's main colors. */
const tint = (a: string, b: string) => ({ D: b, B: a, R: b, G: a, n: b, N: a, x: a, Y: a, r: b, o: b })
const CHARGE = tint('chargeA', 'chargeB')
const BLADE = tint('bladeA', 'bladeB')
const BOMB = tint('bombA', 'bombB')
const stageClear = txt(' STAGE CLEAR! ', 18, -14, '#fcfcfc', '#000000')

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('stand'), at('met', 34, 11)], hold: 1 },
    { actors: [hero('attack'), at('metPeek', 34, 9)], hold: 1 },
    { actors: [hero('attack'), at('metPeek', 34, 9), fire(20)], hold: 1 },
    { actors: [hero('attack'), at('metPeek', 34, 9), fire(28)], hold: 1 },
    { actors: [hero('stand'), at('boom1', 34, 8)], hold: 1 },
    { actors: [hero('stand'), at('boom2', 33, 7)], hold: 1 },
    { actors: [hero('stand'), at('boltDrop', 36, 11)], hold: 2 },
  ),
  toolError: once(
    { actors: [hero('stand'), at('hitSpark', 10, 4)], hold: 1 },
    { actors: [hero('walk', -3, -2, FLASH), at('hitSpark', 8, 3)], hold: 1 },
    { actors: [], hold: 1 },
    { actors: [hero('stand', -5, 0)], hold: 1 },
    { actors: [], hold: 1 },
    { actors: [hero('stand', -5, 0)], hold: 1 },
    { actors: [], hold: 1 },
    { actors: [hero('stand', -5, 0)], hold: 1 },
  ),
  turnComplete: once(
    { actors: [hero('stand')], hold: 1 },
    { actors: [hero('itemGet'), at('sparkle', -6, -4), at('sparkle', 20, -2)], texts: [stageClear], hold: 2 },
    { actors: [hero('itemGet'), at('sparkle', -8, 4), at('sparkle', 22, -8)], texts: [stageClear], hold: 2 },
    { actors: [hero('itemGet'), at('sparkle', -6, -4), at('sparkle', 20, -2)], texts: [stageClear], hold: 3 },
  ),
  milestone: once({ actors: [hero('stand')], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [hero('stand')], texts: [txt(' WEAPON ENERGY 0 ', 18, -14, '#a8f0fc', '#000000')], hold: 2 },
    { actors: [hero('sleep')], texts: [txt(' WEAPON ENERGY 0 ', 18, -14, '#a8f0fc', '#000000')], hold: 2 },
    { actors: [hero('sleep'), capsule()], hold: 2 },
    { actors: [hero('sleep'), capsule()], message: 'cacheCold', hold: 12 },
  ),
  limitWarning: once(
    { actors: [hero('stand'), prop('doorOpen', 34, -14)], hold: 1 },
    { actors: [hero('stand'), prop('doorHalf', 34, -14)], hold: 1 },
    { actors: [hero('stand'), prop('doorShut', 34, -14)], hold: 2 },
    { actors: [hero('stand'), prop('doorShut', 34, -14)], message: 'limitWarning', hold: 14 },
  ),
  compaction: once(
    { actors: [hero('stand'), at('etank', 4, -12)], hold: 2, caption: 'compaction' },
    { actors: [hero('itemGet'), at('etank', 4, -12)], texts: [txt('E', 15, -10, '#fcfcfc')], hold: 2, caption: 'compaction' },
    { actors: [hero('itemGet', 0, 0, CHARGE)], texts: [txt('+++', 17, -4, '#f8f8a0')], hold: 1, caption: 'compaction' },
    { actors: [hero('itemGet')], texts: [txt('++++++', 17, -4, '#f8f8a0')], hold: 1, caption: 'compaction' },
    { actors: [hero('stand')], texts: [txt('FULL', 17, -4, '#fcfcfc')], hold: 3, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [hero('stand')], hold: 1 },
    { actors: [at('beamLand', 4, 11)], hold: 1 },
    { actors: [...beam()], hold: 1 },
    { actors: [prop('beam', 6, -20)], hold: 1 },
    { actors: [prop('beam', 6, -8)], hold: 1 },
    { actors: [...beam()], hold: 1 },
    { actors: [at('beamLand', 4, 11)], hold: 1 },
    { actors: [hero('itemGet')], hold: 5, caption: 'modelChange' },
  ),
  effortChange: once(
    { actors: [hero('itemGet', 0, 0, CHARGE), weapon(4, -12)], hold: 1 },
    { actors: [hero('itemGet', 0, 0, BLADE), weapon(4, -12)], hold: 1 },
    { actors: [hero('itemGet', 0, 0, BOMB), weapon(4, -12)], hold: 1 },
    { actors: [hero('itemGet'), weapon(4, -12)], texts: [txt(' WEAPON GET! ', 18, -12, '#fcfcfc', '#000000')], hold: 5, caption: 'effortChange' },
  ),
}

const poses = (p: string) => ({ stand: `${p}Stand`, walk: `${p}Walk`, attack: `${p}Attack`, itemGet: `${p}ItemGet`, sleep: `${p}Sleep` })

export const megaman: Theme = {
  id: 'megaman',
  name: 'Mega Context',
  description: 'Blue-bomber action homage: a robot per model, a buster charge per effort, life energy ticks, bolts and a skull fortress',
  version: '1.0.0',
  palette: {
    dark: { accent: '#3cbcfc', gold: '#fcc400', red: '#fc5838', label: '#fc9838', dim: '#8c8c9c', text: '#fcfcfc' },
    light: { accent: '#0058c8', gold: '#a07000', red: '#c02000', label: '#b85000', dim: '#6c6c78', text: '#1c1c24' },
  },
  pixels,
  labels: {
    context: 'LIFE ENERGY',
    spend: 'BOLTS',
    cache: 'WEAPON ENERGY',
    limits: 'BOSS BAR',
    modelItem: 'ROBOT',
    effortItem: 'BUSTER',
    heroes: 'Robots',
    weapons: 'Special weapons',
  },
  headings: {
    Context: 'Life energy',
    Cost: 'Bolts',
    'Next message': 'Weapon energy',
    Tokens: 'Score',
    Limits: 'Boss gates',
    'Tool calls': 'Robot masters',
    Files: 'Stage select',
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
      ground: '#3cbcfc',
      gradient: ['#2c88f0', '#58b8fc', '#a8e0fc'],
      deep: ['#200410', '#681020', '#d84818'],
      floor: 'floor',
      shade: { color: '#300818', amount: 0.35 },
      decor: [
        { sprite: 'cloud', x: 4, y: 4, maxPercent: 45 },
        { sprite: 'cloud', x: -12, y: 10, maxPercent: 30 },
        { sprite: 'ladder', x: 0, y: 16 },
        { sprite: 'fortressFar', x: -4, y: 26, minPercent: 30, maxPercent: 49, minColumns: 56 },
        { sprite: 'fortress', x: -1, y: 18, minPercent: 50, minColumns: 60 },
      ],
      particles: [
        { colors: ['W', 'c'], count: 10, drift: 'none', minPercent: 40, maxPercent: 74 },
        { colors: ['O', 'R', 'e'], count: 14, drift: 'up', speed: 1, minPercent: 75 },
      ],
    },
    hero: { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'sleep' },
    heroTiers: { tier1: {}, tier2: {}, tier3: {}, tier4: {}, unknown: {} },
    heroForms: {
      tier1: { poses: poses('roll'), dx: 0, dy: 1, lift: 0 },
      tier3: { poses: poses('sa'), dx: -4, dy: -6, lift: LIFT, hand: { x: 4, y: -2 } },
      tier4: { poses: poses('bs'), dx: -4, dy: -6, lift: LIFT, hand: { x: 4, y: -2 } },
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
      low: { sprite: 'lemon', swap: {}, name: 'Lemon Shot' },
      medium: { sprite: 'halfCharge', swap: {}, name: 'Half Charge' },
      high: { sprite: 'chargeShot', swap: {}, name: 'Charge Shot' },
      xhigh: { sprite: 'metalBlade', swap: {}, name: 'Metal Blade' },
      max: { sprite: 'blackHole', swap: {}, aura: 'blackHoleAura', name: 'Black Hole Bomb' },
    },
    bar: {
      widgets: [
        { kind: 'meter', value: 'contextLeft', count: 12, perRow: 12, sprites: ['tickOff', 'lifeOn'], gap: 0, label: 'LIFE', pulseBelow: 0.25 },
        { kind: 'counter', value: 'spend', icon: 'bolt', digits: 3 },
        { kind: 'meter', value: 'cache', count: 6, perRow: 6, sprites: ['tickOff', 'wpnOn'], gap: 0, label: 'WPN', drop: 2 },
        { kind: 'meter', value: 'limitsLeft', count: 6, perRow: 6, sprites: ['tickOff', 'bossOn'], gap: 0, label: 'BOSS', drop: 3 },
        { kind: 'box', shows: 'model', sprite: 'miniMega', sprites: { tier1: 'miniRoll', tier3: 'miniSuper', tier4: 'miniBass', unknown: 'miniProto' }, label: 'BOT', x: 1, y: 5, drop: 5 },
        { kind: 'box', shows: 'effort', sprite: 'iconCharge', sprites: { low: 'iconLemon', medium: 'iconHalf', xhigh: 'iconBlade', max: 'iconBomb' }, label: 'GET', x: 1, y: 5, drop: 4 },
      ],
      colors: { bg: 'black', box: 'boxFrame', text: 'W', label: 'barLabel', map: 'tickOff', mapDot: 'B' },
    },
    lineup: { ground: '#a8e0fc', ink: '#1c1c24', dim: '#4c5868', mark: '#c02000' },
    message: { bg: '#000000', ink: '#fcfcfc' },
  },
  text: {
    idle: 'The Blue Bomber taps his foot, waiting for orders.',
    thinking: 'The Blue Bomber sizes up the stage...',
    reading: 'A data disk! The Blue Bomber reads it.',
    editing: 'The buster blasts blocks and builds new ones.',
    shell: 'Rush Coil! Bouncing off to run a command.',
    agents: 'Rush, Beat and Eddie dash off on errands.',
    toolSuccess: 'A Met goes down and drops a bolt.',
    toolError: 'Hit! Knocked back, flickering.',
    turnComplete: 'Stage clear! A victory pose.',
    milestone: 'The life energy bar ticks down.',
    cacheCold: 'Weapon energy drained: back in the lab capsule.',
    limitWarning: 'The boss doors shutter closed.',
    compaction: 'An E-Tank refills life energy.',
    modelChange: 'A new robot beams in.',
    effortChange: 'WEAPON GET! The buster changes.',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: 'READY! {pct}% OF YOUR LIFE ENERGY USED. KEEP BUSTING.' },
    { level: 'warn', message: '{pct}% OF YOUR LIFE ENERGY USED. WATCH FOR SPIKES.' },
    { level: 'orange', message: '{pct}% OF YOUR LIFE ENERGY USED. REACH A CHECKPOINT BEFORE THE BOSS DOOR.' },
    { level: 'alert', message: 'WARNING! {pct}% OF YOUR LIFE ENERGY USED. THE SKULL FORTRESS LOOMS.' },
    { level: 'critical', message: 'WILY STAGE 4! {pct}% OF YOUR LIFE ENERGY IS GONE. WRITE DOWN YOUR PASSWORD (SAVE YOUR PROGRESS), THEN /clear.' },
  ],
  messages: {
    cacheCold: 'WEAPON ENERGY EMPTY. THE CACHE WENT COLD.',
    limitWarning: 'BOSS DOOR AHEAD! {name} AT {pct}%.',
    compaction: 'E-TANK USED! Life energy refilled (context compacted).',
    modelChange: '{name} beams in!',
    effortChange: 'WEAPON GET! {weapon}',
  },
}
