// "Context Prime": a bounty-hunter homage. Every sprite is drawn fresh for this
// theme in a 16-bit style.
//
// The model is the suit (Power, Varia, Gravity, Light), effort is the
// beam, context is energy tanks, the cache is the charge, cents are missiles.
//
// Sprites are rows of characters; each character is a key of `pixels` below
// (so 'A' is the suit). Suit tiers and beams recolor by swapping keys.
//
// Pose notes: `sleep` is the morph ball (the hunter curled up), so the ball
// wears the tier's suit colors, and `roll` is the ball a quarter turn on;
// `lie` is the reveal: helmet off, resting at a save station.

import { at, hero, loop, once, weapon } from './kit'
import { quarter } from './pixel'
import type { Actor, HeroTier, Sprite, Theme } from './types'

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
  protoG: '#6a7088', // its cannon, darker than the grey suit
  protog: '#44445c',
  hurtA: '#fcfcfc',
  hurtB: '#f03850',
  hurtC: '#901030',
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
  scan: '#1c4670', // the scan visor's light
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
// Varia build with round pauldrons (19x18), the Gravity build (25x24) that
// Opus and the Light Suit wear.
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
    6: '.......KYVvvVVVYK.......',
    16: '...KAAAKaAAYYAAaKGGGGK...',
    17: '...KAAAKKaYYYYaKKGGGGK...',
    18: '...KYYYK.KaLLaK.KggggK...',
    19: '....KKK.KAAKKAAK.KKKK....',
  },
)

// The reveal: helmet off, ponytail down her back, sitting with her back against
// the save station; the helmet is its own sprite, set down by her boots. `pad`
// columns on the left put each build's sprite where the standard one sits.
const HAIR = [
  '.....HHHH.....',
  '....HHHHHHH...',
  '...HHHHHHHSS..',
  '..rHHHHHSSeS..',
  '.hHhHHHhSSSSS.',
  '.hH..HhSSSs...',
  '.hH...KSSK....',
]
const sit = (torso: string[], pad = 0) =>
  S(
    [
      ...HAIR,
      ...torso,
      '.....KaAAAAAaKKaaK.',
      '.....KaaaaaaK.KYYK.',
      '.....KKKKKKKK.KYYYK',
      '..............KKKKK',
    ].map(r => '.'.repeat(pad) + r),
  )
const SIT_STD = sit(['.h...KYYKAK......', '.hH.KYyYKAAK..KK.', '.h..KYyYKAAAKKAAK', '.h..KYYKAAAAAAAAK'])
const SIT_VARIA = sit(['.h.KKYYYKAK......', '.hKYYyyYYKAK..KK.', '.hKYyyyYKAAAKKAAK', '.h.KYYYKAAAAAAAAK'], 1)
const SIT_GRAND = sit(['.hKKYYYYKLK......', '.KYYyyyyYKAK..KK.', '.KYyyyyyYKALKKAAK', '.hKYYYYKAAAAAAAAK'], 4)

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
  '.KyAaaayK.',
  '.KKyaayKK.',
  '...KKKK...',
]

/** A blast hatch as tall as the Gravity build: its frame around three columns of `body`, 22 rows top to bottom. */
const hatch = (body: (k: number) => string) => S(['.nnnn', ...Array.from({ length: 22 }, (_, k) => `n${body(k)}n`), '.nnnn'])

// A pillar of Chozo lore: its glyphs light from the top as the scan goes on.
const LORE = [
  '.CCCCCC.',
  'CCCCCCCC',
  'CjjjCjCC',
  'CCCjCjCC',
  'CjCjCCjC',
  'CjCCCjjC',
  'CCCCCCCC',
  'CCjjjCjC',
  'CjCCCCjC',
  'CjCjjCCC',
  'CCCCCCCC',
  'CjjCCjjC',
  'CCjCjCCC',
  'CjjCjjCC',
  'CCCCCCCC',
  'CjCjjjCC',
  'CjCCCjCC',
  'CCjjCCjC',
  'CCCCCCCC',
  'CCCCCCCC',
  'jCCCCCCj',
  'jjjjjjjj',
]
const lore = (lit: number) => S(LORE.map((r, k) => (k < lit ? r.split('j').join('i') : r)), { i: 'icep' })

/**
 * The scan visor's light: a wedge `length` long from its tip at the left,
 * rising `rise` pixels on the way and opening to `spread` either side. `tip`
 * is the row of the tip.
 */
function cone(length: number, rise: number, spread: number): { sprite: Sprite; tip: number } {
  const cols = Array.from({ length }, (_, k) => {
    const t = k / (length - 1)
    const mid = -Math.round(t * rise)
    const half = Math.round(t * spread)
    return { top: mid - half, bottom: mid + half }
  })
  const top = Math.min(...cols.map(c => c.top))
  const bottom = Math.max(...cols.map(c => c.bottom))
  const rows = Array.from({ length: bottom - top + 1 }, (_, j) =>
    cols
      .map((c, k) => {
        const y = j + top
        if (y < c.top || y > c.bottom) return '.'
        if (k === 0) return 'i'
        if (y === c.top || y === c.bottom) return 'c'
        // The far end thins out: light, not a solid thing.
        return k < length - 4 || (k + y) % 2 === 0 ? 'f' : '.'
      })
      .join(''),
  )
  return { sprite: { rows, legend: { i: 'iceP', c: 'icep', f: 'scan' } }, tip: -top }
}
const SCAN_LEVEL = cone(14, 0, 4)
const SCAN_UP = cone(14, 6, 3)

/** The recharge station's light, floor to emitter: the same four rows of drops, `phase` rows further down. */
const RAIN = ['.O...o...O...o...O..', '...o...O...o...O...o', '.o...O...o...O...o..', '...O...o...O...o...O']
const rain = (phase: number) => S(Array.from({ length: 27 }, (_, k) => RAIN[(k + 4 - phase) % 4]!))

const sprites: Theme['sprites'] = {
  stand: S(STD),
  walk: S(STD_WALK),
  attack: S(STD_ATTACK),
  itemGet: S(STD_FRONT),
  ball: S(BALL),
  ball2: quarter(S(BALL), 'cw'),
  lie: SIT_STD,
  variaStand: S(VARIA),
  variaWalk: S(VARIA_WALK),
  variaAttack: S(VARIA_ATTACK),
  variaItemGet: S(VARIA_FRONT),
  variaLie: SIT_VARIA,
  grandStand: S(lower(GRAND)),
  grandWalk: S(lower(GRAND_WALK)),
  grandAttack: S(lower(GRAND_ATTACK)),
  grandItemGet: S(GRAND_FRONT),
  grandLie: SIT_GRAND,
  bigBall: S(BIG_BALL),
  bigBall2: quarter(S(BIG_BALL), 'cw'),
  // Her helmet, set down (it wears the suit's colors)
  helmetOff: S(['..KKKKK..', '.KAAAAAK.', 'KAAAAAAAK', 'KAAAKVVVK', 'KAAKVvVVV', 'KaAKVVVVV', 'KaaAKKKKK', '.KKKK....']),

  // Beams, flying right. Every beam is five rows with its middle on the third, so one height serves all.
  beamPower: S(['.....', '.ppp.', 'pPPPp', '.ppp.', '.....']),
  beamWave: S(['..pp....', '.pPPp..p', 'pP..Pp.P', 'p....PPp', '......p.']),
  beamIce: S(['.Qpp....', 'QpPPpp..', 'pPPPPPPp', 'QpPPpp..', '.Qpp....']),
  beamPlasma: S(['........', 'Qpppppp.', 'pPPPPPPp', 'Qpppppp.', '........']),
  beamHyper: S(['.23456.', '1PPPPP1', '6PPPPP2', '5PPPPP3', '.43216.'], { 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4', 5: 'r5', 6: 'r6' }),
  hyperAura: S(['.a.a.a.a.', 'a.......a', '.........', 'a.......a', '.........', 'a.......a', '.a.a.a.a.'], { a: 'aura' }),
  // A shot gathering at the muzzle, in the beam's colors
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
  // Spore pods hang from the longest stalactites (every 16 columns, at x 5).
  pod: S(['..g..', '..g..', '.gGg.', 'gGOGg', 'gGGGg', '.ggg.'], { g: 'moss', G: 'mossHi' }),
  podPair: S(['..g....', '..g....', '.gGg.g.', 'gGOGgg.', 'gGGGgGg', '.gggGOG', '....gGg'], { g: 'moss', G: 'mossHi' }),
  stalagmite: S(['..q..', '..r..', '.qr..', '.rrR.', '.rrR.', 'qrrRR', 'rrrRR'], { q: 'rockHi', r: 'rock', R: 'rockLo' }),
  chozo: S([
    '....CCC..',
    '...CCCCC.',
    '..jjCKCC.',
    '.jj.CCCC.',
    '....jCCC.',
    '...CCCCCC',
    '..CCjCCCC',
    '.CCCjjCCC',
    'OOCCjCCCC',
    'ooCjCCCCC',
    '..CCCCCjC',
    '.CCCCCCCj',
    'jCCjjjCCC',
    'jjjjjjjjj',
  ], { O: 'gravY', o: 'gravy' }),
  // The gunship, landed
  ship: S([
    '........KKKK........',
    '......KKAAAAKK......',
    '....KKAAAAAAAAKK....',
    '...KAAAAAAAAAAAAK...',
    '..KAAAAAAAAAAAAAAK..',
    '.KAAAKKKKKKKKKKAAAK.',
    'KYAAKVVVVvvVVVVKAAYK',
    'KYAAKVVVVVVVVVVKAAYK',
    'KYYAAKKKKKKKKKKAAYYK',
    'KyYYAAAAAAAAAAAAYYyK',
    '.KyyYYYYaaaaYYYYyyK.',
    '..KKKaaKKKKKKaaKKK..',
    '...mm....mm....mm...',
    '..mmm....mm....mmm..',
  ]),
  // An energy tank on its stand
  tankStand: S(['.nMMn.', 'nEEEEn', 'nETEEn', 'nEEEEn', '.nMMn.', '..nn..', '..nn..', '.nnnn.', 'nnnnnn'], { E: 'tankFull' }),

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
  // The energy recharge station: an emitter on a pipe from the ceiling, pouring light to the floor
  rechargeTop: S([
    'nnnnnnnnnnnnnnnnnnnnnnnn',
    '.nMMMMMMMMMMMMMMMMMMMMn.',
    '..nmmmmmmmmmmmmmmmmmmn..',
    '....O..O..O..O..O..O....',
  ]),
  rechargePipe: S(Array.from({ length: 21 }, () => 'nMmn')),
  rechargeRain1: rain(0),
  rechargeRain2: rain(1),
  rechargeRain3: rain(2),

  // A blast hatch: closed, flashing, open
  hatch: hatch(k => (k === 0 ? 'MBB' : k < 4 ? 'BcB' : k === 4 ? 'BBB' : k < 14 ? 'BBb' : k < 21 ? 'Bbb' : 'Mbb')),
  hatchFlash: hatch(k => (k === 0 ? 'TTT' : k < 4 ? 'TcT' : k === 4 ? 'TTT' : k < 14 ? 'TTc' : 'Tcc')),
  hatchOpen: hatch(k => (k === 0 || k === 21 ? 'M..' : '...')),

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
  scanLevel: SCAN_LEVEL.sprite,
  scanUp: SCAN_UP.sprite,
  lore0: lore(0),
  lore1: lore(7),
  lore2: lore(13),
  lore3: lore(20),

  // Creatures
  baby1: S(['..NNN..', '.NNuNN.', 'NRRNRRN', 'NNNNNNN', '.NNNNN.', '.T.T.T.']),
  baby2: S(['..NNN..', '.NNuNN.', 'NRRNRRN', 'NNNNNNN', '.NNNNN.', 'T..T..T']),
  crawler1: S(['..z..z..', '.zZzzZz.', 'zZZZZZZz', 'ZZKZZKZZ', 'ZZZZZZZZ', 'zZZZZZZz', '.KK..KK.']),
  crawler2: S(['.z..z..z', '.zZzzZz.', 'zZZZZZZz', 'ZKZZKZZZ', 'ZZZZZZZZ', 'zZZZZZZz', 'K..KK..K']),
  energyDrop: S(['.R.', 'RTR', '.R.']),

  // Rewards
  itemSphere1: S(['..pppp..', '.pPPPPp.', 'pPTPPPPp', 'pPPQQPPp', 'pPPQQPPp', 'pPPPPPPp', '.pPPPPp.', '..pppp..'], { p: 'gravy', P: 'gravY', Q: 'R', T: 'T' }),
  itemSphere2: S(['..pppp..', '.pPPPPp.', 'pPTPPPPp', 'pPPRRPPp', 'pPPRRPPp', 'pPPPPPPp', '.pPPPPp.', '..pppp..'], { p: 'variay', P: 'variaY', R: 'T', T: 'T' }),
  itemStand: S(['.mMMMMm.', '..nmmn..', '..nmmn..', '.nmmmmn.', 'mmmmmmmm']),
  sparkle: S(['..T..', '..T..', 'TTXTT', '..T..', '..T..']),
  alarm1: S(['.RR.', 'RTTR', 'RRRR', 'nnnn']),
  alarm2: S(['.rr.', 'rRRr', 'rrrr', 'nnnn']),
  sweat: S(['..d..', '..d..', '.ddd.', 'dTddd', 'ddddd', '.ddd.']),

  // Status bar
  tank0: S(['ooo', 'ooo', 'ooo', '...'], { o: 'tankEmpty' }),
  tank1: S(['ooo', 'fff', 'fff', '...'], { o: 'tankEmpty', f: 'tankHalf' }),
  tank2: S(['fff', 'fff', 'fff', '...'], { f: 'tankFull' }),
  missile: S(['.T.', 'TGT', 'GGG', 'GgG', 'GgG', 'x.x']),
  helmet: S(['.KKK.', 'KAAAK', 'AAVVK', 'AVvVK', 'aaVVK', '.aaa.']),
  miniBeam: S(['.ppp.', 'pPPPp', 'pPPPp', '.ppp.']),
}

// ---------------------------------------------------------------------------
// Frames. The scene is laid out once, in scene pixels at the design height:
// the charge ring and its price own columns 0..11, the hunter stands from 12
// (the Gravity build is 12..35, its muzzle flash to 37) and whatever she works
// on is at 38..45, so the action is whole in a pane 48 columns wide.
// ---------------------------------------------------------------------------

const ANCHOR = { x: 15, y: 20 }

/** A prop at scene pixel (x, y): placed in the cavern, so a taller suit does not lift it. */
const put = (sprite: string, x: number, y: number, opts: { swap?: Record<string, string>; flipY?: boolean; offstage?: boolean } = {}): Actor =>
  at(sprite, x - ANCHOR.x, y - ANCHOR.y, { fixed: true, ...opts })

/** Text at scene cell (col, row); `lift`: over her head, so it rises with a taller suit. */
const say = (text: string, col: number, row: number, color: string, lift = false) => ({ text, x: col - ANCHOR.x, y: row * 2 - ANCHOR.y, color, lift })

// The three builds: where each one's visor, muzzle and brow are.
const POWER: HeroTier[] = ['tier1', 'unknown']
const VARIA_SUIT: HeroTier[] = ['tier2']
const GRAVITY: HeroTier[] = ['tier3', 'tier4']
/** One actor per build, each drawn for its own suits only. */
const perSuit = (power: Actor, varia: Actor, gravity: Actor): Actor[] => [
  { ...power, tiers: POWER },
  { ...varia, tiers: VARIA_SUIT },
  { ...gravity, tiers: GRAVITY },
]

// The front edge of the visor on its glint row, per build: the cone's tip.
const VISOR = { power: { x: 27, y: 24 }, varia: { x: 28, y: 22 }, gravity: { x: 29, y: 17 } }
type Aim = 'up' | 'level' | 'down'
/** The scan visor's cone, its tip on the visor. */
const scan = (aim: Aim): Actor[] => {
  const one = (v: { x: number; y: number }) =>
    aim === 'level'
      ? put('scanLevel', v.x, v.y - SCAN_LEVEL.tip)
      : aim === 'up'
        ? put('scanUp', v.x, v.y - SCAN_UP.tip)
        : put('scanUp', v.x, v.y - (SCAN_UP.sprite.rows.length - 1 - SCAN_UP.tip), { flipY: true })
  return perSuit(one(VISOR.power), one(VISOR.varia), one(VISOR.gravity))
}

// Beams and charges are the weapon, so they take the beam's colors, and the Gravity
// build's `hand` raises them to its higher cannon. A beam's middle row is the barrel's.
const BARREL = 30 - ANCHOR.y
/** The beam with its left end at scene column `x`. */
const shot = (x: number) => weapon(x - ANCHOR.x, BARREL - 2)
/** The beam just out of the muzzle, per build. */
const fired = (): Actor[] => perSuit(shot(33), shot(35), shot(38))
/** A charge gathering at the muzzle: 1 small, 2 large. */
const charge = (n: 1 | 2): Actor[] => {
  const one = (x: number) => weapon(x - ANCHOR.x, BARREL - n, { pose: `charge${n}` })
  return perSuit(one(31), one(33), one(36))
}
/** Where a shot lands: everything she works on starts at this column. */
const TARGET = 38

const ink = '#c8f0ff'
const warn = '#f8d040'

const SAVE = { x: 12, y: 24 }
const BLOCKS = { x: 36, y: 26 }
const HATCH = { x: 41, y: 12 }
const LORE_AT = { x: 38, y: 14 }
const CRAWLER = { x: 38, y: 29 }
const ITEM = { x: 38, y: 22 }

// She sits four columns in from where she stands, her back to the station's pillar.
const resting = (station: string): Actor[] => [put(station, SAVE.x, SAVE.y), hero('lie', 4), { ...put('helmetOff', 37, 28), tier: true }]
const pillar = (lit: 0 | 1 | 2 | 3) => put(`lore${lit}`, LORE_AT.x, LORE_AT.y)
const door = (state: '' | 'Flash' | 'Open') => put(`hatch${state}`, HATCH.x, HATCH.y)
/** The morph ball `x` columns along, turned a quarter on odd steps so it rolls. */
const ball = (x: number, turned = false) => hero(turned ? 'roll' : 'sleep', x)
const blocks = (broken = false) => put(broken ? 'blocksBroken' : 'blocks', BLOCKS.x, BLOCKS.y)
/** A baby metroid at scene pixel (x, y), fangs in or out. */
const baby = (x: number, y: number, flap = false) => put(flap ? 'baby2' : 'baby1', x, y)

const states: Theme['states'] = {
  idle: loop(
    { actors: resting('saveOn1'), texts: [say('z', 33, 9, ink)], hold: 3 },
    { actors: resting('saveOn2'), texts: [say('z', 34, 8, ink)], hold: 3 },
    { actors: resting('saveOn1'), texts: [say('Z', 35, 7, ink)], hold: 3 },
    { actors: resting('saveOn2'), hold: 3 },
  ),
  thinking: loop(
    { actors: [hero('stand'), ...scan('up')], hold: 2 },
    { actors: [hero('stand'), ...scan('level')], hold: 2 },
    { actors: [hero('stand'), ...scan('down')], hold: 2 },
    { actors: [hero('stand')], texts: [say('?', 31, 9, ink, true)], hold: 2 },
  ),
  // The cone is drawn first, so it ends on the pillar's face.
  reading: loop(
    { actors: [hero('stand'), ...scan('level'), pillar(0)], hold: 2 },
    { actors: [hero('stand'), ...scan('level'), pillar(1)], hold: 2 },
    { actors: [hero('stand'), ...scan('level'), pillar(2)], hold: 2 },
    { actors: [hero('stand'), ...scan('level'), pillar(3)], hold: 2 },
    { actors: [hero('stand'), pillar(3)], texts: [say('LOG', 40, 5, ink)], hold: 2 },
  ),
  // She rolls up to the blocks, lays a bomb, rolls clear, and goes through the gap.
  editing: loop(
    { actors: [blocks(), ball(3)], hold: 1 },
    { actors: [blocks(), ball(7, true)], hold: 1 },
    { actors: [blocks(), ball(11)], hold: 1 },
    { actors: [blocks(), put('bomb', 31, 33), ball(7, true)], hold: 1 },
    { actors: [blocks(), put('bombLit', 31, 33), ball(3)], hold: 1 },
    { actors: [blocks(true), put('boom2', 29, 29), ball(3)], hold: 1 },
    { actors: [blocks(true), put('boom3', 29, 29), ball(5, true)], hold: 1 },
    { actors: [blocks(true), ball(9)], hold: 2 },
  ),
  shell: loop(
    { actors: [hero('stand'), door('')], hold: 2 },
    { actors: [hero('attack'), door(''), ...fired()], hold: 1 },
    { actors: [hero('attack'), door(''), shot(TARGET)], hold: 1 },
    { actors: [hero('stand'), door('Flash')], hold: 1 },
    { actors: [hero('stand'), door('Open')], hold: 2 },
    { actors: [hero('walk', 4), door('Open')], hold: 1 },
    { actors: [hero('stand', 8), door('Open')], hold: 2 },
  ),
  // Two babies leave her side for the cavern's upper corner, hover there, and come back.
  agents: loop(
    { actors: [hero('stand'), baby(33, 14)], hold: 2 },
    { actors: [hero('stand'), baby(38, 8, true), baby(33, 16)], hold: 2 },
    { actors: [hero('stand'), baby(39, 6), baby(36, 15, true)], hold: 2 },
    { actors: [hero('itemGet'), baby(38, 7, true), baby(39, 15)], hold: 2 },
    { actors: [hero('itemGet'), baby(39, 6), baby(38, 14, true)], hold: 2 },
    { actors: [hero('stand'), baby(36, 9, true), baby(33, 16)], hold: 2 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop(
    { actors: resting('saveOff'), texts: [say('z', 33, 9, '#6c7c9c')], hold: 4 },
    { actors: resting('saveOff'), texts: [say('Z', 34, 8, '#6c7c9c')], hold: 4 },
  ),
}

const SIGH = 'THREAT LEVEL: NEGLIGIBLE. OVERQUALIFIED.'
// A drop off the helmet's brow.
const sweat = perSuit(put('sweat', 29, 15), put('sweat', 30, 13), put('sweat', 30, 8))
const dots = say('...', 35, 9, ink, true)
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), pillar(0), ...sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), ...scan('level'), pillar(1), ...sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), pillar(0), ...sweat], texts: [dots], hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [hero('stand'), door(''), ...sweat], hold: 2, caption: SIGH },
    { actors: [hero('attack'), door(''), shot(TARGET), ...sweat], hold: 1, caption: SIGH },
    { actors: [hero('stand'), door('Open'), ...sweat], texts: [dots], hold: 3, caption: SIGH },
  ),
}

// The hit flashes white, then red: one of the two shows on every suit.
const HURT_A = { A: 'hurtA', a: 'hurtB', Y: 'hurtA', y: 'hurtB' }
const HURT_B = { A: 'hurtB', a: 'hurtC', Y: 'hurtA', y: 'hurtB' }
const ALARMED = { A: 'hurtB', a: 'hurtC', Y: 'hurtB', y: 'hurtC' }
const alarms = (lit: boolean): Actor[] => [put(lit ? 'alarm1' : 'alarm2', 6, 32), put(lit ? 'alarm1' : 'alarm2', 40, 32)]
const WHITE = { A: 'T', a: 'T', Y: 'T', y: 'T', L: 'T' }
const GLOW = { A: 'glowB', a: 'Q', Y: 'glowA', y: 'glowB' }
const RECHARGED = { A: 'O', a: 'o', Y: 'w', y: 'O' }
const station = (light?: 1 | 2 | 3): Actor[] => [
  put('rechargePipe', 22, -16, { offstage: true }),
  put('rechargeTop', 12, 5),
  ...(light ? [put(`rechargeRain${light}`, 14, 9)] : []),
]
const acquired = say('ITEM ACQUIRED', 17, 7, warn, true)

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('attack'), put('crawler1', CRAWLER.x, CRAWLER.y), ...fired()], hold: 1 },
    { actors: [hero('attack'), put('crawler2', CRAWLER.x, CRAWLER.y), shot(TARGET)], hold: 1 },
    { actors: [hero('stand'), put('boom2', CRAWLER.x, CRAWLER.y)], hold: 1 },
    { actors: [hero('stand'), put('boom3', CRAWLER.x, CRAWLER.y)], hold: 1 },
    { actors: [hero('stand'), put('energyDrop', CRAWLER.x + 3, CRAWLER.y + 3)], hold: 2 },
  ),
  // Knocked back one column (the Gravity build stays off the charge ring) with a hop, and back to her place.
  toolError: once(
    { actors: [hero('stand', -1, 0, HURT_A)], hold: 1 },
    { actors: [hero('stand', -1, -1, HURT_B)], hold: 1 },
    { actors: [hero('stand', -1, -1, HURT_A)], hold: 1 },
    { actors: [hero('stand', -1, 0, HURT_B)], hold: 1 },
    { actors: [hero('stand')], hold: 1 },
  ),
  turnComplete: once(
    { actors: [hero('stand'), put('itemStand', ITEM.x, 31), put('itemSphere1', ITEM.x, ITEM.y)], hold: 2 },
    { actors: [hero('itemGet'), put('itemStand', ITEM.x, 31), put('itemSphere2', ITEM.x, ITEM.y)], hold: 1 },
    { actors: [hero('itemGet'), put('itemStand', ITEM.x, 31), put('itemSphere1', ITEM.x, ITEM.y), put('sparkle', 36, 18), put('sparkle', 41, 25)], texts: [acquired], hold: 2 },
    { actors: [hero('itemGet'), put('itemStand', ITEM.x, 31), put('sparkle', 39, 23), put('sparkle', 41, 18), put('sparkle', 36, 26)], texts: [acquired], hold: 3 },
  ),
  milestone: once({ actors: [hero('stand')], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: resting('saveOn1'), hold: 2 },
    { actors: resting('saveOn2'), hold: 1 },
    { actors: resting('saveOff'), hold: 1 },
    { actors: resting('saveOff'), message: 'cacheCold', hold: 12 },
  ),
  limitWarning: once(
    { actors: [hero('stand', 0, 0, ALARMED), ...alarms(true)], message: 'limitWarning', hold: 3 },
    { actors: [hero('stand'), ...alarms(false)], message: 'limitWarning', hold: 3 },
    { actors: [hero('stand', 0, 0, ALARMED), ...alarms(true)], message: 'limitWarning', hold: 3 },
    { actors: [hero('walk'), ...alarms(false)], message: 'limitWarning', hold: 6 },
  ),
  // The light falls behind her, from the emitter to the floor.
  compaction: once(
    { actors: [...station(), hero('itemGet')], hold: 1, caption: 'compaction' },
    { actors: [...station(1), hero('itemGet')], hold: 2, caption: 'compaction' },
    { actors: [...station(2), hero('itemGet', 0, 0, RECHARGED)], hold: 2, caption: 'compaction' },
    { actors: [...station(3), hero('itemGet')], hold: 2, caption: 'compaction' },
    { actors: [hero('stand')], hold: 2, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [hero('itemGet', 0, 0, WHITE)], hold: 1 },
    { actors: [hero('itemGet', 0, 0, GLOW), put('sparkle', 15, 26), put('sparkle', 32, 20)], hold: 1 },
    { actors: [hero('itemGet', 0, 0, WHITE), put('sparkle', 14, 30), put('sparkle', 31, 12)], hold: 1 },
    { actors: [hero('itemGet')], hold: 6, caption: 'modelChange' },
  ),
  // The new beam gathers at the muzzle and is let go.
  effortChange: once(
    { actors: [hero('stand'), ...charge(1)], hold: 2 },
    { actors: [hero('stand'), ...charge(2)], hold: 2 },
    {
      actors: [hero('attack'), ...fired()],
      texts: [say('*', 37, 12, '#fcfcfc'), say('*', 43, 11, '#fcfcfc'), say('*', 40, 17, '#fcfcfc')],
      hold: 5,
      caption: 'effortChange',
    },
  ),
}

const STD_POSES = { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'ball', lie: 'lie', roll: 'ball2' }
const VARIA_POSES = { stand: 'variaStand', walk: 'variaWalk', attack: 'variaAttack', itemGet: 'variaItemGet', sleep: 'ball', lie: 'variaLie', roll: 'ball2' }
const GRAND_POSES = { stand: 'grandStand', walk: 'grandWalk', attack: 'grandAttack', itemGet: 'grandItemGet', sleep: 'bigBall', lie: 'grandLie', roll: 'bigBall2' }
// The Gravity build's cannon is two pixels higher than the others'.
const GRAND_FORM = { poses: GRAND_POSES, dx: -4, dy: -8, lift: 8, hand: { x: 0, y: -2 } }
const CHARGES = { charge1: { sprite: 'charge1' }, charge2: { sprite: 'charge2' } }

export const metroid: Theme = {
  id: 'metroid',
  name: 'Context Prime',
  description: 'Metroid homage: energy tanks, missiles, a power suit per model and a beam per effort',
  version: '1.1.0',
  palette: {
    dark: { accent: '#58e040', gold: '#f8d040', red: '#f4506a', label: '#f0a0d0', dim: '#8c88a0', text: '#f0f0f8' },
    light: { accent: '#187c18', gold: '#8a6200', red: '#c01830', label: '#9c2c78', dim: '#6c6880', text: '#1c1828' },
  },
  pixels,
  labels: {
    context: 'ENERGY',
    spend: 'MISSILES',
    cache: 'CHARGE',
    limits: 'ALERT',
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
    Limits: 'Alert level',
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
    anchor: ANCHOR,
    background: {
      ground: '#120a1c',
      gradient: ['#05030a', '#100a1e', '#1a1030', '#221636'],
      deep: ['#0a0204', '#1c0608', '#33100e', '#4a1810'],
      border: 'ceiling',
      floor: 'floorRock',
      // Past the action (columns 0..45), from the right edge in: the Chozo statue at 58, the gunship at 80,
      // an energy tank and a stalagmite at 96. The pods keep a fixed column: each hangs from a stalactite.
      decor: [
        { sprite: 'chozo', x: -1, y: 22, minColumns: 56 },
        { sprite: 'weed', x: -1, y: 32, minColumns: 56 },
        { sprite: 'pod', x: 51, y: 5, sky: true, minColumns: 56 },
        { sprite: 'ship', x: -12, y: 22, minColumns: 78 },
        { sprite: 'podPair', x: 67, y: 5, sky: true, minColumns: 78 },
        { sprite: 'tankStand', x: -35, y: 27, minColumns: 94 },
        { sprite: 'stalagmite', x: -43, y: 29, minColumns: 94 },
        { sprite: 'pod', x: 83, y: 5, sky: true, minColumns: 94 },
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
      unknown: { A: 'protoA', a: 'protoa', Y: 'protoY', y: 'protoy', V: 'protoV', L: 'protoY', G: 'protoG', g: 'protog' },
    },
    heroForms: {
      tier2: { poses: VARIA_POSES, dx: -1, dy: -2, lift: 2 },
      tier3: GRAND_FORM,
      tier4: GRAND_FORM,
    },
    heroNames: {
      tier1: 'Power Suit',
      tier2: 'Varia Suit',
      tier3: 'Gravity Suit',
      tier4: 'Light Suit',
      unknown: 'Prototype Suit',
    },
    weapons: {
      low: { sprite: 'beamPower', swap: {}, poses: CHARGES, name: 'Power Beam' },
      medium: { sprite: 'beamWave', swap: { P: 'waveP', p: 'wavep', Q: 'waveQ' }, poses: CHARGES, name: 'Wave Beam' },
      high: { sprite: 'beamIce', swap: { P: 'iceP', p: 'icep', Q: 'iceQ' }, poses: CHARGES, name: 'Ice Beam' },
      xhigh: { sprite: 'beamPlasma', swap: { P: 'plasmaP', p: 'plasmap', Q: 'plasmaQ' }, poses: CHARGES, name: 'Plasma Beam' },
      max: { sprite: 'beamHyper', swap: { P: 'hyperP', p: 'hyperp', Q: 'hyperQ' }, aura: 'hyperAura', poses: CHARGES, name: 'Hyper Beam' },
    },
    bar: {
      widgets: [
        { kind: 'counter', value: 'contextLeft', format: 'EN {v}', digits: 2, chars: 6 },
        { kind: 'meter', value: 'contextLeft', count: 10, perRow: 5, sprites: ['tank0', 'tank1', 'tank2'], label: 'ENERGY', pulseBelow: 0.2 },
        { kind: 'counter', value: 'spend', icon: 'missile', digits: 3, chars: 4, wrap: true },
        { kind: 'box', shows: 'model', sprite: 'helmet', label: 'SUIT', x: 1, y: 4, drop: 3 },
        { kind: 'box', shows: 'effort', sprite: 'miniBeam', label: 'BEAM', x: 1, y: 5, drop: 2 },
        { kind: 'counter', value: 'limitMax', label: 'ALERT', format: '{v}%', drop: 1 },
        { kind: 'map' },
      ],
      colors: { bg: 'black', box: 'hudBox', text: 'hudText', label: 'hudLabel', map: 'mapGrid', mapDot: 'mapDot' },
    },
    lineup: { ground: 'ground', dim: '#4a4460', mark: '#981020' },
    // No plate under the price: white on the cavern's dark, red once the charge is gone.
    stamina: { x: 1, y: 11, radius: 5, full: 'chargeFull', empty: 'chargeEmpty', cold: 'chargeCold', tagIcon: 'missile', tagColor: '#f8f8f8', tagColdColor: '#f03850' },
  },
  text: {
    idle: 'The hunter rests against a save station, helmet off.',
    thinking: 'The scan visor sweeps the cavern...',
    reading: 'The scan visor reads a pillar of Chozo lore.',
    editing: 'Morph ball bombs break the blocks.',
    shell: 'The arm cannon blasts a hatch open.',
    agents: 'Baby metroids drift off on errands.',
    toolSuccess: 'A crawler is destroyed.',
    toolError: 'Hit! The suit flashes.',
    turnComplete: 'ITEM ACQUIRED.',
    milestone: 'The suit sounds an energy warning.',
    cacheCold: 'The save station powers down.',
    limitWarning: 'Alarms flash: the alert level is rising.',
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
    cacheCold: 'SAVE STATION OFFLINE. CHARGE LOST: CACHE COLD. NEXT SHOT AT FULL COST.',
    limitWarning: 'EMERGENCY. ALERT LEVEL RISING: {name} AT {pct}%.',
    compaction: 'Energy recharge complete. Logs compacted.',
    modelChange: '{name} equipped.',
    effortChange: '{weapon} acquired.',
  },
}
