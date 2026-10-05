// "Context Prime": a bounty-hunter homage. Every sprite is drawn fresh for this
// theme in a 16-bit style.
//
// The model is the suit (Power, Varia, Gravity, Chozo Light), effort is the
// beam, context is energy tanks, the cache is the charge, cents are missiles.
//
// Sprites are rows of characters; each character is a key of `pixels` below
// (so 'A' is the suit). Suit tiers and beams recolor by swapping keys.
//
// Pose notes: `sleep` is the morph ball (the hunter curled up), so the ball
// wears the tier's suit colors; `lie` is the reveal: helmet off, resting at a
// save station.

import { at, hero, loop, once, weapon } from './kit'
import type { Sprite, Theme } from './types'

const pixels = {
  // The suit (Power Suit colors; tiers swap these)
  K: '#0e0a16', // outline
  A: '#e8701c', // suit
  a: '#a03c10', // suit shade
  Y: '#f8d040', // armor plates
  y: '#c08a1c', // plate shade
  V: '#58e040', // visor
  v: '#d8ffc0', // visor glint
  L: '#f8d040', // suit lights
  G: '#a8a0b8', // cannon metal
  g: '#625a78', // cannon shade
  // The hunter under the helmet
  S: '#f8c8a0', // skin
  s: '#d09070', // skin shade
  H: '#f8e070', // hair
  h: '#c8a030', // hair shade
  e: '#2a5cb0', // eyes
  // Tier suits
  variaA: '#d84420',
  variaa: '#801c0c',
  variaY: '#f8a830',
  variay: '#b86414',
  variaL: '#fce070',
  gravA: '#8a3ce0',
  grava: '#46188c',
  gravY: '#f070d8',
  gravy: '#a02c98',
  gravL: '#ffb8ff',
  lightA: '#eef0fc',
  lighta: '#8c94c4',
  lightY: '#f8d038',
  lighty: '#b08818',
  lightV: '#40e8ff',
  lightv: '#e0ffff',
  lightL: '#70f8ff',
  protoA: '#a4a4b0',
  protoa: '#5e5e6c',
  protoY: '#d0d0d8',
  protoy: '#8a8a96',
  protoV: '#78a878',
  hurtA: '#fcfcfc',
  hurtB: '#f03850',
  glowA: '#fff8d0',
  glowB: '#fce060',
  // Beams (the weapon keys P core, p body, Q fringe)
  P: '#fffce0',
  p: '#f8d040',
  Q: '#f88c20',
  waveP: '#f8e0ff',
  wavep: '#c060f8',
  waveQ: '#7020c0',
  iceP: '#f0ffff',
  icep: '#60d8fc',
  iceQ: '#2078d8',
  plasmaP: '#f0fff0',
  plasmap: '#40f070',
  plasmaQ: '#109040',
  hyperP: '#ffffff',
  hyperp: '#ff50c8',
  hyperQ: '#8040ff',
  r1: '#ff4040',
  r2: '#ffa020',
  r3: '#fff040',
  r4: '#40f060',
  r5: '#40c0ff',
  r6: '#b060ff',
  aura: '#fce8ff',
  // Cavern
  rock: '#4a3a62',
  rockHi: '#6c5a88',
  rockLo: '#271c38',
  moss: '#2c8a64',
  mossHi: '#5cd09a',
  ground: '#c4bcd4', // the lineup's backdrop
  // Machines
  m: '#8c8ca4', // metal
  M: '#c8c8dc', // metal light
  n: '#44445c', // metal dark
  B: '#2c78f8', // hatch
  b: '#1440b0',
  c: '#a8e0ff', // hatch shine
  O: '#58f0a0', // save glow
  o: '#20a868',
  w: '#d8fff0', // save beam core
  // Creatures
  N: '#90f0b0', // metroid membrane
  u: '#40b878',
  R: '#f02848', // nucleus
  r: '#901030',
  T: '#f8f8f8', // fangs, sparks
  Z: '#e08828', // crawler
  z: '#f8e048', // crawler spikes
  X: '#fcf8d0', // blast core
  x: '#f86018', // blast fire
  // Chozo stone
  C: '#a89060',
  j: '#6c5830',
  // Sweat
  d: '#8cd0fc',
  // Status bar
  black: '#000000',
  hudBox: '#3c8cc8',
  hudLabel: '#f0a0d0',
  hudText: '#f8f8f8',
  mapGrid: '#5a2a78',
  mapDot: '#f8f070',
  tankFull: '#f0a0d0',
  tankHalf: '#8c4c78',
  tankEmpty: '#2c1c34',
  chargeFull: '#80f0ff',
  chargeEmpty: '#1c2c48',
  chargeCold: '#4c4c5c',
  plate: '#b8b4c8',
  plateLo: '#6c6880',
}

/** A sprite whose rows are padded to one width. */
function S(rows: string[], legend?: Sprite['legend']): Sprite {
  const w = Math.max(...rows.map(r => r.length))
  return { rows: rows.map(r => r.padEnd(w, '.')), ...(legend ? { legend } : {}) }
}

/** `rows` with each listed row replaced (a pose made from another). */
function edit(rows: string[], changes: Record<number, string>): string[] {
  return rows.map((r, k) => changes[k] ?? r)
}

// ---------------------------------------------------------------------------
// The hunter. Three builds: the standard 16x16 (Power Suit, Prototype), the
// Varia build with round pauldrons (18x18), the Gravity build (22x22) that
// Opus and the legendary suit wear.
// ---------------------------------------------------------------------------

const STD = [
  '.....KKKKK......',
  '....KAAAAAK.....',
  '...KAAAAAAAK....',
  '...KAAAKVVVK....',
  '...KAAKVvVVVK...',
  '...KaAKVVVVVK...',
  '...KaaAKKKKK....',
  '..KYYKaaaaKK....',
  '.KYyyYKAAKYYK...',
  '.KYyyYKAAKyYYKKK',
  '..KYYKAYYKGGGGGK',
  '...KKaAYYaKgggKK',
  '...KaaKKKaaKKK..',
  '...KAAK.KAAK....',
  '..KYYYK.KYYYK...',
  '..KKKKK.KKKKKK..',
]
const STD_WALK = edit(STD, {
  12: '...KaaKKaaK.....',
  13: '..KAAK..KAAK....',
  14: '.KYYYK...KYYYK..',
  15: '.KKKKK...KKKKK..',
})
const STD_ATTACK = edit(STD, {
  9: '.KYyyYKAAKyYYKKK..',
  10: '..KYYKAYYKGGGGGKTT',
  11: '...KKaAYYaKgggKK.T',
})
const STD_FRONT = [
  '......KKKK......',
  '.....KAAAAK.....',
  '....KAAAAAAK....',
  '....KAVVVVAK....',
  '....KVvVVVVK....',
  '....KaVVVVaK....',
  '..KKKaKKKKaKKK..',
  '.KYYYKaAAaKYYYK.',
  '.KYyYKAYYAKYyYK.',
  '.KAAKKAYYAKKGGK.',
  '.KAAKaAAAAaKGGGK',
  '.KYYKKaaaaKKgggK',
  '..KK.KAAAAK.KKK.',
  '.....KAKKAK.....',
  '....KYYKKYYK....',
  '....KKKK.KKK....',
]

const VARIA = [
  '.......KKKKK......',
  '......KAAAAAK.....',
  '.....KAAAAAAAK....',
  '.....KAAAKVVVK....',
  '.....KAAKVvVVVK...',
  '.....KaAKVVVVVK...',
  '.....KaaAKKKKK....',
  '..KKKKKaaaaKKKK...',
  '.KYYYYKKAAKYYYYK..',
  'KYYyyYYKAAKYyyYYK.',
  'KYyyyyYKAAKYyyyYKK',
  'KYyyyYKAAYKKYYYKGGK',
  '.KYYYKAAYYKGGGGGGGK',
  '..KKKaAAYYaKgggggKK',
  '...KaaAKKAaaKKKKK..',
  '...KaaK..KaaK.....',
  '..KYYYK..KYYYK....',
  '..KKKKK..KKKKKK...',
]
const VARIA_WALK = edit(VARIA, {
  14: '...KaaAKKaaK......',
  15: '..KaaK....KaaK....',
  16: '.KYYYK....KYYYK...',
  17: '.KKKKK....KKKKKK..',
})
const VARIA_ATTACK = edit(VARIA, {
  11: 'KYyyyYKAAYKKYYYKGGK..',
  12: '.KYYYKAAYYKGGGGGGGKTT',
  13: '..KKKaAAYYaKgggggKK.T',
})
const VARIA_FRONT = [
  '.......KKKK.......',
  '......KAAAAK......',
  '.....KAAAAAAK.....',
  '.....KAVVVVAK.....',
  '.....KVvVVVVK.....',
  '.....KaVVVVaK.....',
  '.KKKKKaKKKKaKKKKK.',
  'KYYYYKKaAAaKYYYYYK',
  'KYyyyYKAYYAKYyyyYK',
  'KYyyyYKAYYAKYyyyYK',
  '.KYYYKAAYYAAKYYYK.',
  '..KAAKaAAAAaKGGGK.',
  '..KAAKKaaaaKKGGGK.',
  '..KYYK.KAAK.KgggK.',
  '...KK.KAAAAK.KKK..',
  '.....KAAKKAAK.....',
  '.....KYYKKYYK.....',
  '.....KKKK.KKKK....',
]

const GRAND = [
  '..........KKKKK.........',
  '........KKAAAAAKK.......',
  '.......KAAAAAAAAAK......',
  '.......KAAAAAAAAAK......',
  '.......KAAAAKKKKKKK.....',
  '.......KAAAKVVVVVVK.....',
  '.......KYAAKVvvVVVK.....',
  '.......KYAAKVVVVVVK.....',
  '.......KyYAAKVVVVK......',
  '...KKKKKyyYAKKKKKKKKK...',
  '..KYYYYYKKaaaaKKYYYYYK..',
  '.KYYyyyyYKLaaLKYYyyyYYK.',
  '.KYyyyyyyYKLLKYYyyyyyYK.',
  '.KYyyyyyyYKAAKYyyyyyyYK.',
  '.KYyyyyyYKAALAKYyyyyyYK.',
  '..KYyyyYKAAALAAKKKKKKKK.',
  '...KYYYKAAALLAKGGGGGGGGK',
  '....KKKaAAYYYYKGGGGGGGGGK',
  '....KaaKAYLLYAKggggggggK',
  '....KaaKaKKKKaKKKKKKKKK.',
  '....KaaaAAK.KAAAAaK.....',
  '.....KaAAAK..KAAAaK.....',
  '....KYYYYYK..KYYYYYK....',
  '...KYYyYYYK.KYYYyYYK....',
  '...KKKKKKKK.KKKKKKKKK...',
]
const GRAND_WALK = edit(GRAND, {
  20: '....KaaaAAK..KAAAAaK....',
  21: '....KaAAAK.....KAAAaK...',
  22: '...KYYYYYK.....KYYYYYK..',
  23: '..KYYyYYYK.....KYYYyYYK.',
  24: '..KKKKKKKK.....KKKKKKKKK',
})
const GRAND_ATTACK = edit(GRAND, {
  16: '...KYYYKAAALLAKGGGGGGGGK...',
  17: '....KKKaAAYYYYKGGGGGGGGGKTT',
  18: '....KaaKAYLLYAKggggggggK..T',
})
/** The grand helmet one row lower: drops the fourth row. */
const lower = (rows: string[]) => rows.filter((_, k) => k !== 3)
/** A front view from its left half, mirrored. */
const mirror = (half: string[]) => half.map(r => r + [...r].reverse().join(''))
const GRAND_FRONT = edit(
  mirror([
    '..........KK',
    '........KKAA',
    '.......KAAAA',
    '.......KAAAA',
    '.......KAAKK',
    '.......KKVVV',
    '.......KYVVV',
    '.......KYVVV',
    '.......KyYKK',
    '...KKKKKyyaa',
    '..KYYYYYKKLa',
    '.KYYyyyyYKaL',
    '.KYyyyyyyYKA',
    '.KYyyyyyyYKA',
    '.KYyyyyyYKAA',
    '..KYYYYYKaAL',
    '...KAAAKaAAY',
    '...KAAAKKaYY',
    '...KYYYK.KaL',
    '....KKK.KAAK',
    '.......KaAAK',
    '......KYYYYK',
    '......KYyYYK',
    '......KKKKKK',
  ]),
  {
    6: '.......KYVvvVVVVYK.......',
    16: '...KAAAKaAAYYAAaKGGGGK...',
    17: '...KAAAKKaYYYYaKKGGGGK...',
    18: '...KYYYK.KaLLaK.KggggK...',
    19: '....KKK.KAAKKAAK.KKKK....',
  },
)

// The reveal: helmet off, ponytail down her back, sitting against the save
// station with the helmet set down beside her.
const HAIR = [
  '.....HHHH.....',
  '....HHHHHHH...',
  '...HHHHHHHSS..',
  '..rHHHHHSSeS..',
  '.hHhHHHhSSSSS.',
  '.hH..HhSSSs...',
  '.hH...KSSK....',
]
const sit = (torso: string[]) =>
  S([
    ...HAIR,
    ...torso,
    '.....KaAAAAAaKKaaK.......',
    '.....KaaaaaaK.KYYK.KKKK..',
    '.....KKKKKKKK.KYYYKAAAAK.',
    '..............KKKKKVvVVK.',
  ])
const SIT_STD = sit(['.h...KYYKAK......', '.hH.KYyYKAAK..KK.', '.h..KYyYKAAAKKAAK', '.h..KYYKAAAAAAAAK'])
const SIT_VARIA = sit(['.h.KKYYYKAK......', '.hKYYyyYYKAK..KK.', '.hKYyyyYKAAAKKAAK', '.h.KYYYKAAAAAAAAK'])
const SIT_GRAND = sit(['.hKKYYYYKLK......', '.KYYyyyyYKAK..KK.', '.KYyyyyyYKALKKAAK', '.hKYYYYKAAAAAAAAK'])

const BALL = [
  '..KKKK..',
  '.KYAAYK.',
  'KYAvLAaK',
  'KAALLAaK',
  'KAAAAaaK',
  'KyAaaayK',
  '.KyaayK.',
  '..KKKK..',
]
const BIG_BALL = [
  '...KKKK...',
  '.KKYAAYKK.',
  '.KYAAAAaK.',
  'KYAAvLAAaK',
  'KAAALLLAaK',
  'KAAAALAaaK',
  'KyAAAAaaaK',
  '.KyAaaaayK',
  '.KKyaaayKK',
  '...KKKK...',
]

const sprites: Theme['sprites'] = {
  stand: S(STD),
  walk: S(STD_WALK),
  attack: S(STD_ATTACK),
  itemGet: S(STD_FRONT),
  ball: S(BALL),
  lie: SIT_STD,
  variaStand: S(VARIA),
  variaWalk: S(VARIA_WALK),
  variaAttack: S(VARIA_ATTACK),
  variaItemGet: S(VARIA_FRONT),
  variaLie: SIT_VARIA,
  grandStand: S(lower(GRAND)),
  grandWalk: S(lower(GRAND_WALK)),
  grandAttack: S(lower(GRAND_ATTACK)),
  grandItemGet: S(lower(GRAND_FRONT)),
  grandLie: SIT_GRAND,
  bigBall: S(BIG_BALL),

  // Beams, pointing right (the lineup turns them upright)
  beamPower: S(['.pp.', 'pPPp', 'pPPp', '.pp.']),
  beamWave: S(['.p.....p', 'pPp...pP', '...pPp..', '....p...']),
  beamIce: S(['..p...', '.pPp..', 'pPPPPQ', '.pPp..', '..p...']),
  beamPlasma: S(['.ppppppp.', 'pPPPPPPPp', '.ppppppp.']),
  beamHyper: S(['..23456...', '.1PPPPPP6.', '6PPPPPPPP1', '.5PPPPPP2.', '...43216..'], { 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4', 5: 'r5', 6: 'r6' }),
  hyperAura: S(['.a.a.a.a.a', 'a........a', '..........', '..........', 'a........a', '.a.a.a.a.a'], { a: 'aura' }),
  // A charged shot gathering at the muzzle
  charge1: S(['.p.', 'pPp', '.p.']),
  charge2: S(['.Q.Q.', 'QpPpQ', '.PPP.', 'QpPpQ', '.Q.Q.']),

  // The cavern
  ceiling: S([
    'rrRrrrrrRrrrrrrR',
    'RrrRRrrRRrRrrRRr',
    'rRR.RrR..RRr.RR.',
    '.R...R....R...R.',
    '.....R..........',
  ], { r: 'rock', R: 'rockLo' }),
  floorRock: S([
    'qqrrrrqrrrrqqrrr',
    'rrrRrrrrrRrrrrRr',
    'rRrrrRRrrrrRrrrr',
    'RRRRRRRRRRRRRRRR',
  ], { q: 'rockHi', r: 'rock', R: 'rockLo' }),
  weed: S(['.g..', '.g.g', 'g.gg', 'gggg'], { g: 'moss' }),
  sporePod: S(['.gG.', 'gGGg', '.gg.', '..g.', '..g.'], { g: 'moss', G: 'mossHi' }),
  chozo: S([
    '.....CCC....',
    '....CCCCC...',
    '...jjCKCC...',
    '..jj.CCCC...',
    '.....jCCC...',
    '....CCCCCC..',
    '...CCjCCCCC.',
    '..CCCjjCCCC.',
    '.OOCCjCCCCC.',
    '.ooCjCCCCCC.',
    '...CCCCCjCC.',
    '..CCCCCCCjC.',
    '.jCCjjjCCCCj',
    'jjjjjjjjjjjj',
  ], { O: 'gravY', o: 'gravy' }),
  // The charge orb's console: the price tag sits on it
  console: S([
    'nnnnnnnnnnnn',
    'nMMMMMMMMMMn',
    'nMMMMMMMMMMn',
    'nMMMMMMMMMMn',
    'nmmmmmmmmmmn',
    '.n........n.',
    '.n........n.',
    '.n........n.',
    '.n........n.',
    'nnn......nnn',
  ], { M: 'plate', m: 'plateLo' }),

  // The save station: a pad and a capsule of light
  saveOn1: S([
    '..nnnnnnnn..',
    '.nMmmmmmmMn.',
    '..O.w..w.O..',
    '..O..ww..O..',
    '..o.w..w.o..',
    '..O..ww..O..',
    '..o.w..w.o..',
    '..O..ww..O..',
    '..o.w..w.o..',
    '.nMmmmmmmMn.',
    'nnnnnnnnnnnn',
    'nMMMMMMMMMMn',
  ]),
  saveOn2: S([
    '..nnnnnnnn..',
    '.nMmmmmmmMn.',
    '..o..ww..o..',
    '..O.w..w.O..',
    '..o..ww..o..',
    '..O.w..w.O..',
    '..o..ww..o..',
    '..O.w..w.O..',
    '..o..ww..o..',
    '.nMmmmmmmMn.',
    'nnnnnnnnnnnn',
    'nMMMMMMMMMMn',
  ]),
  saveOff: S([
    '..nnnnnnnn..',
    '.nmnnnnnnmn.',
    '..n......n..',
    '..n......n..',
    '..n......n..',
    '..n......n..',
    '..n......n..',
    '..n......n..',
    '..n......n..',
    '.nmnnnnnnmn.',
    'nnnnnnnnnnnn',
    'nmmmmmmmmmmn',
  ]),
  // The energy recharge station: a column pouring light down on her
  rechargeTop: S([
    'nnnnnnnnnnnnnnnnnnnn',
    '.nMMMMMMMMMMMMMMMMn.',
    '..nmmmmmmmmmmmmmmn..',
    '....O..O..O..O.O....',
  ]),
  rechargeRain1: S(['.O...o...O...o..', '...o...O...o...O', '.o...O...o...O..', '...O...o...O...o']),
  rechargeRain2: S(['...o...O...o...O', '.O...o...O...o..', '...O...o...O...o', '.o...O...o...O..']),

  // A blast hatch: closed, flashing, open
  hatch: S([
    '.nnnn',
    'nMBBn',
    'nBcBn',
    'nBcBn',
    'nBBBn',
    'nBBbn',
    'nBBbn',
    'nBBbn',
    'nBBbn',
    'nBBbn',
    'nBbbn',
    'nBbbn',
    'nBbbn',
    'nbbbn',
    'nMbbn',
    '.nnnn',
  ]),
  hatchFlash: S([
    '.nnnn',
    'nTTTn',
    'nTcTn',
    'nTcTn',
    'nTTTn',
    'nTTcn',
    'nTTcn',
    'nTTcn',
    'nTTcn',
    'nTTcn',
    'nTccn',
    'nTccn',
    'nTccn',
    'nTccn',
    'nTccn',
    '.nnnn',
  ]),
  hatchOpen: S([
    '.nnnn',
    'nM..n',
    'n...n',
    'n...n',
    'n...n',
    'n...n',
    'n...n',
    'n...n',
    'n...n',
    'n...n',
    'n...n',
    'n...n',
    'n...n',
    'n...n',
    'nM..n',
    '.nnnn',
  ]),

  // Bomb blocks
  blocks: S([
    'mMMMnmMMMn',
    'MmmmnMmmmn',
    'MmnmnMmnmn',
    'MmmmnMmmmn',
    'nnnnnnnnnn',
    'mMMMnmMMMn',
    'MmmmnMmmmn',
    'MmnmnMmnmn',
    'MmmmnMmmmn',
    'nnnnnnnnnn',
  ]),
  blocksBroken: S([
    '.....mMMMn',
    '.....MmmmN',
    '.m...MmnmN',
    '.....MmmmN',
    '..n..nnnnn',
    '.M...mMMMn',
    '.....MmmmN',
    'm..n.MmnmN',
    '.....MmmmN',
    'nn.m.nnnnn',
  ], { N: 'n' }),
  bomb: S(['.T.', 'TRT', '.T.']),
  bombLit: S(['.R.', 'RTR', '.R.']),
  boom2: S(['x..x..x', '.x.X.x.', '..XXX..', 'xXX.XXx', '..XXX..', '.x.X.x.', 'x..x..x']),
  boom3: S(['x.....x', '...x...', '.x...x.', 'x.....x', '.x...x.', '...x...', 'x.....x']),

  // Scanning
  scanCone1: S(['.....c', '...cc.', 'icc...', '...cc.', '.....c'], { c: 'icep', i: 'iceP' }),
  scanCone2: S(['.........c', '......cc..', '...cc.....', 'icc.......', '...cc.....', '......cc..', '.........c'], { c: 'icep', i: 'iceP' }),
  scanCone3: S([
    '.............c',
    '..........cc..',
    '.......cc.....',
    '....cc........',
    'icc...........',
    '....cc........',
    '.......cc.....',
    '..........cc..',
    '.............c',
  ], { c: 'icep', i: 'iceP' }),
  tablet: S([
    '.CCCCCC.',
    'CCjCCjCC',
    'CjjCCjjC',
    'CCCjjCCC',
    'CjCCCCjC',
    'CCjjjjCC',
    'CCCCCCCC',
    'CjCjjCjC',
    'CCCCCCCC',
    'jjjjjjjj',
  ]),
  tabletLit: S([
    '.CCCCCC.',
    'CCiCCiCC',
    'CiiCCiiC',
    'CCCiiCCC',
    'CiCCCCiC',
    'CCiiiiCC',
    'CCCCCCCC',
    'CiCiiCiC',
    'CCCCCCCC',
    'jjjjjjjj',
  ], { i: 'icep' }),
  reticle: S([
    'ii........ii',
    'i..........i',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    'i..........i',
    'ii........ii',
  ], { i: 'iceP' }),
  scanBar1: S(['iiiiiiiiii', 'iccooooooi', 'iiiiiiiiii'], { i: 'n', c: 'icep', o: 'rockLo' }),
  scanBar2: S(['iiiiiiiiii', 'iccccooooi', 'iiiiiiiiii'], { i: 'n', c: 'icep', o: 'rockLo' }),
  scanBar3: S(['iiiiiiiiii', 'iccccccooi', 'iiiiiiiiii'], { i: 'n', c: 'icep', o: 'rockLo' }),
  scanBar4: S(['iiiiiiiiii', 'icccccccci', 'iiiiiiiiii'], { i: 'n', c: 'icep' }),

  // Creatures
  metroid1: S([
    '...NNNNN...',
    '.NNuNNNuNN.',
    'NNRRNuNRRNN',
    'NRrRNNNRrRN',
    'NNRRNNNRRNN',
    '.NNNNNNNNN.',
    '..T.T.T.T..',
    '..T.....T..',
  ]),
  metroid2: S([
    '...NNNNN...',
    '.NNuNNNuNN.',
    'NNRRNuNRRNN',
    'NRrRNNNRrRN',
    'NNRRNNNRRNN',
    '.NNNNNNNNN.',
    '.T..T.T..T.',
    'T.........T',
  ]),
  crawler1: S(['.z.z.z..', 'zZZZZZz.', 'ZZKZZZZz', 'ZZZZZZZZ', '.KK..KK.']),
  crawler2: S(['z.z.z.z.', '.ZZZZZZz', 'zZKZZZZZ', 'ZZZZZZZZ', 'K..KK..K']),
  energyDrop: S(['.R.', 'RTR', '.R.']),

  // Rewards
  itemSphere1: S(['..pppp..', '.pPPPPp.', 'pPTPPPPp', 'pPPQQPPp', 'pPPQQPPp', 'pPPPPPPp', '.pPPPPp.', '..pppp..'], { p: 'gravy', P: 'gravY', Q: 'R', T: 'T' }),
  itemSphere2: S(['..pppp..', '.pPPPPp.', 'pPTPPPPp', 'pPPRRPPp', 'pPPRRPPp', 'pPPPPPPp', '.pPPPPp.', '..pppp..'], { p: 'variay', P: 'variaY', R: 'T', T: 'T' }),
  sparkle: S(['..T..', '..T..', 'TTXTT', '..T..', '..T..']),
  alarm1: S(['.RR.', 'RTTR', 'RRRR', 'nnnn']),
  alarm2: S(['.rr.', 'rRRr', 'rrrr', 'nnnn']),
  sweat: S(['.d.', 'ddd', '.d.']),

  // Status bar
  tank0: S(['ooo', 'ooo', 'ooo', '...'], { o: 'tankEmpty' }),
  tank1: S(['ooo', 'fff', 'fff', '...'], { o: 'tankEmpty', f: 'tankHalf' }),
  tank2: S(['fff', 'fff', 'fff', '...'], { f: 'tankFull' }),
  missile: S(['.T.', 'TGT', 'GGG', 'GgG', 'GgG', 'x.x'].map(r => r), { T: 'T', G: 'G', g: 'g', x: 'x' }),
  helmet: S(['.KKK.', 'KAAAK', 'AAVVK', 'AVvVK', 'aaVVK', '.aaa.']),
  miniBeam: S(['.pp.', 'pPPp', 'pPPp', '.pp.']),
}

// ---------------------------------------------------------------------------
// Frames: actors are placed relative to the hero's top-left.
// ---------------------------------------------------------------------------

/** A beam shot from the arm cannon. */
const shot = (x = 17, y = 8) => weapon(x, y)

const ink = '#c8f0ff'
const warn = '#f8d040'
const danger = '#f03850'

const SAVE = { x: 22, y: 4 }
const BLOCKS = { x: 16, y: 6 }
const HATCH = { x: 28, y: 0 }
const TABLET = { x: 24, y: 6 }

const states: Theme['states'] = {
  idle: loop(
    { actors: [at('saveOn1', SAVE.x, SAVE.y), hero('lie')], texts: [{ text: 'z', x: 6, y: -2, color: ink }], hold: 3 },
    { actors: [at('saveOn2', SAVE.x, SAVE.y), hero('lie')], texts: [{ text: 'z', x: 7, y: -4, color: ink }], hold: 3 },
    { actors: [at('saveOn1', SAVE.x, SAVE.y), hero('lie')], texts: [{ text: 'Z', x: 8, y: -6, color: ink }], hold: 3 },
    { actors: [at('saveOn2', SAVE.x, SAVE.y), hero('lie')], hold: 3 },
  ),
  thinking: loop(
    { actors: [hero('stand'), at('scanCone1', 13, 0)], hold: 2 },
    { actors: [hero('stand'), at('scanCone2', 13, -1)], hold: 2 },
    { actors: [hero('stand'), at('scanCone3', 13, -2)], hold: 2 },
    { actors: [hero('stand')], texts: [{ text: '?', x: 16, y: -2, color: ink }], hold: 2 },
  ),
  reading: loop(
    { actors: [hero('stand'), at('tablet', TABLET.x, TABLET.y), at('scanCone3', 13, -2)], hold: 2 },
    { actors: [hero('stand'), at('tabletLit', TABLET.x, TABLET.y), at('reticle', TABLET.x - 2, TABLET.y - 1), at('scanBar1', TABLET.x - 1, TABLET.y - 6)], hold: 2 },
    { actors: [hero('stand'), at('tabletLit', TABLET.x, TABLET.y), at('reticle', TABLET.x - 2, TABLET.y - 1), at('scanBar2', TABLET.x - 1, TABLET.y - 6)], hold: 2 },
    { actors: [hero('stand'), at('tabletLit', TABLET.x, TABLET.y), at('reticle', TABLET.x - 2, TABLET.y - 1), at('scanBar3', TABLET.x - 1, TABLET.y - 6)], hold: 2 },
    { actors: [hero('stand'), at('tablet', TABLET.x, TABLET.y), at('scanBar4', TABLET.x - 1, TABLET.y - 6)], texts: [{ text: 'LOG', x: TABLET.x + 1, y: TABLET.y - 10, color: ink }], hold: 2 },
  ),
  editing: loop(
    { actors: [at('blocks', BLOCKS.x, BLOCKS.y), hero('sleep', 2)], hold: 1 },
    { actors: [at('blocks', BLOCKS.x, BLOCKS.y), hero('sleep', 6)], hold: 1 },
    { actors: [at('blocks', BLOCKS.x, BLOCKS.y), at('bomb', 10, 13), hero('sleep', 4)], hold: 1 },
    { actors: [at('blocks', BLOCKS.x, BLOCKS.y), at('bombLit', 10, 13), hero('sleep', 1)], hold: 1 },
    { actors: [at('blocksBroken', BLOCKS.x, BLOCKS.y), at('boom2', 8, 10), hero('sleep', 1)], hold: 1 },
    { actors: [at('blocksBroken', BLOCKS.x, BLOCKS.y), at('boom3', 8, 10), hero('sleep', 3)], hold: 1 },
    { actors: [at('blocksBroken', BLOCKS.x, BLOCKS.y), hero('sleep', 8)], hold: 2 },
  ),
  shell: loop(
    { actors: [hero('stand'), at('hatch', HATCH.x, HATCH.y)], hold: 2 },
    { actors: [hero('attack'), shot(18), at('hatch', HATCH.x, HATCH.y)], hold: 1 },
    { actors: [hero('attack'), shot(23), at('hatch', HATCH.x, HATCH.y)], hold: 1 },
    { actors: [hero('stand'), at('hatchFlash', HATCH.x, HATCH.y)], hold: 1 },
    { actors: [hero('stand'), at('hatchOpen', HATCH.x, HATCH.y)], hold: 2 },
    { actors: [hero('walk', 3), at('hatchOpen', HATCH.x, HATCH.y)], hold: 1 },
    { actors: [hero('stand', 5), at('hatchOpen', HATCH.x, HATCH.y)], hold: 2 },
  ),
  agents: loop(
    { actors: [hero('stand'), at('metroid1', 16, -2)], hold: 2 },
    { actors: [hero('stand'), at('metroid2', 20, -5), at('metroid1', -12, 0)], hold: 2 },
    { actors: [hero('stand'), at('metroid1', 26, -8), at('metroid2', -16, -4)], hold: 2 },
    { actors: [hero('stand'), at('metroid2', 32, -6)], hold: 2 },
    { actors: [hero('itemGet')], hold: 2 },
    { actors: [hero('stand'), at('metroid2', 26, -4), at('metroid1', -14, -2)], hold: 2 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop(
    { actors: [at('saveOff', SAVE.x, SAVE.y), hero('lie')], texts: [{ text: 'z', x: 6, y: -2, color: '#6c7c9c' }], hold: 4 },
    { actors: [at('saveOff', SAVE.x, SAVE.y), hero('lie')], texts: [{ text: 'Z', x: 7, y: -4, color: '#6c7c9c' }], hold: 4 },
  ),
}

const SIGH = 'THREAT LEVEL: NEGLIGIBLE. OVERQUALIFIED.'
const sweat = at('sweat', 12, -2)
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), at('tablet', TABLET.x, TABLET.y), sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), at('tabletLit', TABLET.x, TABLET.y), at('reticle', TABLET.x - 2, TABLET.y - 1), sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), at('tablet', TABLET.x, TABLET.y), sweat], texts: [{ text: '...', x: 16, y: -2, color: ink }], hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [hero('stand'), at('hatch', HATCH.x, HATCH.y), sweat], hold: 2, caption: SIGH },
    { actors: [hero('attack'), shot(18), at('hatch', HATCH.x, HATCH.y), sweat], hold: 1, caption: SIGH },
    { actors: [hero('stand'), at('hatchOpen', HATCH.x, HATCH.y), sweat], texts: [{ text: '...', x: 16, y: -2, color: ink }], hold: 3, caption: SIGH },
  ),
}

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('attack'), shot(18), at('crawler1', 26, 11)], hold: 1 },
    { actors: [hero('attack'), shot(22), at('crawler2', 25, 11)], hold: 1 },
    { actors: [hero('stand'), at('boom2', 25, 8)], hold: 1 },
    { actors: [hero('stand'), at('boom3', 25, 8)], hold: 1 },
    { actors: [hero('stand'), at('energyDrop', 27, 12)], hold: 2 },
  ),
  toolError: once(
    { actors: [hero('stand', -1, 0, { A: 'hurtA', a: 'hurtB', Y: 'hurtA', y: 'hurtB' })], hold: 1 },
    { actors: [hero('stand', -3, -2, { A: 'hurtB', a: 'hurtB', Y: 'hurtA', y: 'hurtA' })], hold: 1 },
    { actors: [hero('stand', -4, -1, { A: 'hurtA', a: 'hurtB', Y: 'hurtA', y: 'hurtB' })], hold: 1 },
    { actors: [hero('stand', -4, 0, { A: 'hurtB', a: 'hurtB', Y: 'hurtA', y: 'hurtA' })], hold: 1 },
    { actors: [hero('stand', -3, 0)], hold: 1 },
  ),
  turnComplete: once(
    { actors: [hero('stand'), at('itemSphere1', 4, -8)], hold: 2 },
    { actors: [hero('itemGet'), at('itemSphere2', 4, -8)], hold: 1 },
    {
      actors: [hero('itemGet'), at('itemSphere1', 4, -8), at('sparkle', -2, -12), at('sparkle', 14, -8)],
      texts: [{ text: 'ITEM ACQUIRED', x: 18, y: -8, color: warn }],
      hold: 2,
    },
    {
      actors: [hero('itemGet'), at('itemSphere2', 4, -8), at('sparkle', -3, -6), at('sparkle', 15, -13)],
      texts: [{ text: 'ITEM ACQUIRED', x: 18, y: -8, color: warn }],
      hold: 3,
    },
  ),
  milestone: once({ actors: [hero('stand')], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [at('saveOn1', SAVE.x, SAVE.y), hero('lie')], hold: 2 },
    { actors: [at('saveOn2', SAVE.x, SAVE.y), hero('lie')], hold: 1 },
    { actors: [at('saveOff', SAVE.x, SAVE.y), hero('lie')], hold: 1 },
    { actors: [at('saveOff', SAVE.x, SAVE.y), hero('lie')], message: 'cacheCold', hold: 12 },
  ),
  limitWarning: once(
    { actors: [hero('stand', 0, 0, { A: 'hurtB' }), at('alarm1', -10, 12), at('alarm1', 30, 12)], message: 'limitWarning', hold: 3 },
    { actors: [hero('stand'), at('alarm2', -10, 12), at('alarm2', 30, 12)], message: 'limitWarning', hold: 3 },
    { actors: [hero('stand', 0, 0, { A: 'hurtB' }), at('alarm1', -10, 12), at('alarm1', 30, 12)], message: 'limitWarning', hold: 3 },
    { actors: [hero('walk'), at('alarm2', -10, 12), at('alarm2', 30, 12)], message: 'limitWarning', hold: 6 },
  ),
  compaction: once(
    { actors: [at('rechargeTop', -2, -14), hero('itemGet')], hold: 1, caption: 'compaction' },
    { actors: [at('rechargeTop', -2, -14), at('rechargeRain1', 0, -10), hero('itemGet')], hold: 2, caption: 'compaction' },
    { actors: [at('rechargeTop', -2, -14), at('rechargeRain2', 0, -10), hero('itemGet', 0, 0, { A: 'glowA', Y: 'glowB' })], hold: 2, caption: 'compaction' },
    { actors: [at('rechargeTop', -2, -14), at('rechargeRain1', 0, -10), hero('itemGet')], hold: 2, caption: 'compaction' },
    { actors: [hero('stand')], hold: 2, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [hero('itemGet', 0, 0, { A: 'glowA', a: 'glowB', Y: 'glowA', y: 'glowB' })], hold: 1 },
    { actors: [hero('itemGet', 0, 0, { A: 'glowB', a: 'Q', Y: 'glowA', y: 'Q' }), at('sparkle', -4, 2), at('sparkle', 16, 6)], hold: 1 },
    { actors: [hero('itemGet', 0, 0, { A: 'glowA', a: 'glowB', Y: 'glowA', y: 'glowB' }), at('sparkle', -3, 8), at('sparkle', 15, -2)], hold: 1 },
    { actors: [hero('itemGet')], hold: 6, caption: 'modelChange' },
  ),
  effortChange: once(
    { actors: [hero('itemGet'), at('charge1', 6, -6)], hold: 2 },
    { actors: [hero('itemGet'), at('charge2', 5, -6), shot(5, -9)], hold: 2 },
    {
      actors: [hero('itemGet'), shot(5, -9)],
      texts: [{ text: '*', x: 2, y: -12, color: '#fcfcfc' }, { text: '*', x: 13, y: -9, color: '#fcfcfc' }],
      hold: 5,
      caption: 'effortChange',
    },
  ),
}

const STD_POSES = { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'ball', lie: 'lie' }
const VARIA_POSES = { stand: 'variaStand', walk: 'variaWalk', attack: 'variaAttack', itemGet: 'variaItemGet', sleep: 'ball', lie: 'variaLie' }
const GRAND_POSES = { stand: 'grandStand', walk: 'grandWalk', attack: 'grandAttack', itemGet: 'grandItemGet', sleep: 'bigBall', lie: 'grandLie' }

export const metroid: Theme = {
  id: 'metroid',
  name: 'Context Prime',
  description: 'Metroid homage: energy tanks, missiles, a power suit per model and a beam per effort',
  version: '1.0.0',
  palette: {
    dark: { accent: '#58e040', gold: '#f8d040', red: '#f03850', label: '#f0a0d0', dim: '#8c88a0', text: '#f0f0f8' },
    light: { accent: '#1c8a1c', gold: '#9c7000', red: '#c01830', label: '#9c2c78', dim: '#6c6880', text: '#1c1828' },
  },
  pixels,
  labels: {
    context: 'ENERGY',
    spend: 'MISSILES',
    cache: 'CHARGE',
    limits: 'ESCAPE',
    modelItem: 'SUIT',
    effortItem: 'BEAM',
    heroes: 'Suits',
    weapons: 'Beams',
  },
  headings: {
    Context: 'Energy',
    Cost: 'Missiles',
    'Next message': 'Charge',
    Tokens: 'Logbook',
    Limits: 'Escape timer',
    'Tool calls': 'Arsenal',
    Files: 'Area map',
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
      ground: '#120a1c',
      gradient: ['#05030a', '#100a1e', '#1a1030', '#221636'],
      deep: ['#0a0204', '#1c0608', '#33100e', '#4a1810'],
      border: 'ceiling',
      floor: 'floorRock',
      decor: [
        { sprite: 'console', x: 0, y: 24 },
        { sprite: 'weed', x: 34, y: 32 },
        { sprite: 'chozo', x: 50, y: 22 },
        { sprite: 'sporePod', x: 46, y: 5 },
      ],
      particles: [
        { colors: ['moss', 'mossHi'], count: 12, drift: 'up', speed: 0.5, maxPercent: 70 },
        { colors: ['#f06020', '#f8a030', '#c02818'], count: 16, drift: 'up', speed: 1, minPercent: 50 },
      ],
    },
    hero: STD_POSES,
    heroTiers: {
      tier1: {},
      tier2: { A: 'variaA', a: 'variaa', Y: 'variaY', y: 'variay', L: 'variaL' },
      tier3: { A: 'gravA', a: 'grava', Y: 'gravY', y: 'gravy', L: 'gravL' },
      tier4: { A: 'lightA', a: 'lighta', Y: 'lightY', y: 'lighty', V: 'lightV', v: 'lightv', L: 'lightL' },
      unknown: { A: 'protoA', a: 'protoa', Y: 'protoY', y: 'protoy', V: 'protoV', L: 'protoY' },
    },
    heroForms: {
      tier2: { poses: VARIA_POSES, dx: -1, dy: -2, lift: 2 },
      tier3: { poses: GRAND_POSES, dx: -4, dy: -8, lift: 8 },
      tier4: { poses: GRAND_POSES, dx: -4, dy: -8, lift: 8 },
    },
    heroNames: {
      tier1: 'Power Suit',
      tier2: 'Varia Suit',
      tier3: 'Gravity Suit',
      tier4: 'Chozo Light Suit',
      unknown: 'Prototype Suit',
    },
    weapons: {
      low: { sprite: 'beamPower', swap: {}, name: 'Power Beam' },
      medium: { sprite: 'beamWave', swap: { P: 'waveP', p: 'wavep', Q: 'waveQ' }, name: 'Wave Beam' },
      high: { sprite: 'beamIce', swap: { P: 'iceP', p: 'icep', Q: 'iceQ' }, name: 'Ice Beam' },
      xhigh: { sprite: 'beamPlasma', swap: { P: 'plasmaP', p: 'plasmap', Q: 'plasmaQ' }, name: 'Plasma Beam' },
      max: { sprite: 'beamHyper', swap: { P: 'hyperP', p: 'hyperp', Q: 'hyperQ' }, aura: 'hyperAura', name: 'Hyper Beam' },
    },
    bar: {
      widgets: [
        { kind: 'counter', value: 'contextLeft', format: 'EN {v}', digits: 2 },
        { kind: 'meter', value: 'contextLeft', count: 10, perRow: 5, sprites: ['tank0', 'tank1', 'tank2'], label: 'ENERGY', pulseBelow: 0.2 },
        { kind: 'counter', value: 'spend', icon: 'missile', digits: 3 },
        { kind: 'box', shows: 'model', sprite: 'helmet', label: 'SUIT', x: 1, y: 4, drop: 2 },
        { kind: 'box', shows: 'effort', sprite: 'miniBeam', label: 'BEAM', x: 2, y: 5, drop: 1 },
        { kind: 'counter', value: 'limitMax', label: 'ESCAPE', format: '{v}%', drop: 4 },
        { kind: 'map', drop: 3 },
      ],
      colors: { bg: 'black', box: 'hudBox', text: 'hudText', label: 'hudLabel', map: 'mapGrid', mapDot: 'mapDot' },
    },
    lineup: { ground: 'ground' },
    stamina: { x: 1, y: 11, radius: 5, full: 'chargeFull', empty: 'chargeEmpty', cold: 'chargeCold', tagIcon: 'missile' },
  },
  text: {
    idle: 'The hunter rests at a save station, helmet off.',
    thinking: 'The scan visor sweeps the cavern...',
    reading: 'Scanning a Chozo lore tablet.',
    editing: 'Morph ball bombs break the blocks.',
    shell: 'The arm cannon blasts a hatch open.',
    agents: 'Baby metroids drift off on errands.',
    toolSuccess: 'A crawler is destroyed.',
    toolError: 'Hit! The suit flashes.',
    turnComplete: 'ITEM ACQUIRED.',
    milestone: 'The suit sounds an energy warning.',
    cacheCold: 'The save station powers down.',
    limitWarning: 'Time bomb set. Escape!',
    compaction: 'An energy recharge station refills the tanks.',
    modelChange: 'Suit upgrade installed.',
    effortChange: 'New beam acquired.',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: 'ENERGY NOMINAL. {pct}% DEPLETED. CONTINUE MISSION.' },
    { level: 'warn', message: '{pct}% ENERGY DEPLETED. MONITOR SUIT RESERVES.' },
    { level: 'orange', message: '{pct}% ENERGY DEPLETED. LOCATE A SAVE STATION.' },
    { level: 'alert', message: 'WARNING: ENERGY LOW. {pct}% DEPLETED. HOSTILE CONDITIONS.' },
    { level: 'critical', message: 'ENERGY CRITICAL. {pct}% DEPLETED. SAVE YOUR PROGRESS AND RETURN TO SHIP (/clear).' },
  ],
  messages: {
    cacheCold: 'SAVE STATION OFFLINE. CACHE COLD. NEXT SHOT AT FULL COST.',
    limitWarning: 'TIME BOMB SET. {name} AT {pct}%. ESCAPE IMMEDIATELY.',
    compaction: 'Energy recharge complete. Logs compacted.',
    modelChange: '{name} equipped.',
    effortChange: '{weapon} acquired.',
  },
}
