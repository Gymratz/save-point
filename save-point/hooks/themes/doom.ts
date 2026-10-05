// "Knee-Deep in the Context": a 1993 demon-shooter homage, turned side-on. Every sprite is drawn fresh for this theme in that 8-bit style.
//
// The model is the marine's armor (green, blue MegaArmor, the Doom Slayer's
// praetor suit, the Sentinel crown), effort is the gun (pistol to BFG 9000),
// context is HEALTH and the status-bar face that bloodies as it fills while the
// level walks the four episodes, the cache is ARMOR, and cents are AMMO spent.
//
// Sprites are rows of characters keyed into `pixels`; tiers recolor by swapping
// keys. The Slayer tiers are larger hero forms; the Sentinel is the Slayer crowned.

import { at, hero, loop, once, weapon } from './kit'
import { rotate } from './pixel'
import type { Actor, HeroTier, Sprite, Theme } from './types'

const pixels = {
  // The marine
  K: '#101010', // outline
  A: '#3c9c2c', // security armor
  a: '#22601a', // armor shade
  V: '#3a3226', // visor
  v: '#b8a888', // visor glint
  S: '#e0a070', // skin
  s: '#a86c40', // skin shade
  B: '#6c6048', // undersuit
  b: '#463e2c', // belt
  k: '#2c2418', // boots
  h: '#6c4420', // hair (status face)
  O: '#f4f4f4', // white: eyes, spikes, sparks
  R: '#a81010', // blood (classic level)
  // The Slayer's praetor suit
  P: '#55743a', // praetor green
  p: '#33482a', // praetor shade
  M: '#a0a0a8', // metal
  m: '#5a5a64', // metal shade
  Y: '#d8f050', // visor glow
  y: '#fcffd8', // visor core
  C: '#e0b040', // sentinel crown
  c: '#9c7018', // crown shade
  g: '#c060ff', // crown gem
  // Tier armors
  megaA: '#3c64e0',
  megaa: '#203c98',
  zomA: '#8c8468',
  zoma: '#5c5640',
  zomS: '#a4b484',
  zomV: '#c81c1c',
  zomv: '#ff7050',
  sentP: '#3c3c58',
  sentp: '#24243a',
  sentY: '#d070ff',
  senty: '#fff0ff',
  sentM: '#d8b048',
  sentm: '#8c6c1c',
  // Co-op buddies
  coopIndigo: '#5848b8',
  coopIndigoS: '#2c2070',
  coopBrown: '#946838',
  coopBrownS: '#5c3c1c',
  coopRed: '#c83028',
  coopRedS: '#7c1810',
  // Pain and shadow
  hurtA: '#fcfcfc',
  hurtB: '#f03030',
  hurtS: '#a01010',
  shadow: '#1c1c20',
  shadowS: '#121214',
  // Guns
  W: '#9c6430', // wood
  w: '#603a18',
  Q: '#78c8ff', // plasma cells
  q: '#2c64e0',
  E: '#90ff58', // BFG glow
  e: '#20b020',
  // Fire, flashes, demons
  F: '#fff8a0',
  f: '#f8a020',
  o: '#e04010',
  i: '#8c5a34', // imp
  I: '#5c3a1c',
  r: '#ff2020', // demon eyes, switch light
  d: '#946040', // cyberdemon hide
  D: '#5c3418',
  H: '#e4dcbc', // horns
  // Pickups
  U: '#5080ff', // soulsphere
  u: '#2040c0',
  t: '#8c7c5c', // crate
  T: '#5c5038',
  Z: '#50f050', // screen ink, switch on
  z: '#0c2c10', // screen
  N: '#6c8c4c', // barrel
  n: '#3c5428',
  L: '#80ff40', // nukage
  l: '#fff4c8', // lamp light
  u2: '#e0c020', // hazard stripes
  // Scenery
  darkness: '#060608',
  floorA: '#6c706c',
  floorB: '#4a4e4a',
  rockA: '#6c4c2c',
  rockB: '#4c3418',
  lavaRock: '#3c1408',
  fleshA: '#5c1010',
  fleshB: '#320606',
  hellA: '#3c1c10',
  hellB: '#22100a',
  // Status bar
  barBg: '#4a4a4a',
  barBox: '#8c8c8c',
  barRed: '#ff3c30',
  barLabel: '#e0e0e0',
  mapBg: '#141414',
  mapDot: '#f0d040',
  lineupBg: '#9c9c9c',
  txt: '#f8f8f8',
  tally: '#ff3c30',
  ink: '#000000',
}

/** A sprite whose rows are padded to one width. */
function S(rows: string[], legend?: Sprite['legend']): Sprite {
  const w = Math.max(...rows.map(r => [...r].length))
  return { rows: rows.map(r => r.padEnd(w, '.')), ...(legend ? { legend } : {}) }
}

/** `rows` with each listed row replaced (a pose made from another). */
const edit = (rows: string[], changes: Record<number, string>) => rows.map((r, k) => changes[k] ?? r)

/** Rows `from` to `to` (inclusive) leaned one pixel forward. */
const lean = (rows: string[], from: number, to: number) => rows.map((r, k) => (k >= from && k <= to ? `.${r.slice(0, -1)}` : r))

/** A tile repeated `n` times across. */
const wide = (rows: string[], n = 6) => rows.map(r => r.repeat(n))

// ---------------------------------------------------------------------------
// The marine (16x16): Haiku in green, Sonnet in blue, unknown as a former human
// ---------------------------------------------------------------------------

const MARINE = [
  '.....KKKKK......',
  '....KAAAAAK.....',
  '...KAAAAAAAK....',
  '...KAAAKKKKKK...',
  '...KAAKVvVVVK...',
  '...KaAKVVVVVK...',
  '...KaaAKSSSK....',
  '..KKKKKaKKKKK...',
  '.KAAAAAKAAAAAK..',
  '.KAaaAAAAAAAAK..',
  '.KAaaAAAAAABBBK.',
  '..KAAaaaaaKBBBK.',
  '...KbbbbbbbKK...',
  '...KBBBKKBBBK...',
  '..KkkkkK.KkkkK..',
  '..KKKKKK.KKKKKK.',
]
const MARINE_WALK = edit(MARINE, {
  13: '..KBBBK..KBBK...',
  14: '.KkkkK....KkkkK.',
  15: '.KKKKK....KKKKKK',
})
const MARINE_FRONT = [
  '.....KKKKKK.....',
  '.BK.KAAAAAAK.KB.',
  '.BBKAAAAAAAAKBB.',
  '.KBKAKKKKKKAKBK.',
  '..BKVvVVVVVVKB..',
  '..BKKaKSSKaKKB..',
  '..BAKKKKKKKKAB..',
  '..KAAAAKKAAAAK..',
  '..KAaAAAAAAaAK..',
  '...KAaAAAAaAK...',
  '...KaaaaaaaaK...',
  '...KbbbbbbbbK...',
  '...KBBBKKBBBK...',
  '...KBBK..KBBK...',
  '..KkkkK..KkkkK..',
  '..KKKKK..KKKKK..',
]

// ---------------------------------------------------------------------------
// The Doom Slayer (22x24): Opus in the praetor suit, Fable crowned a Sentinel
// ---------------------------------------------------------------------------

const SLAYER = [
  '.........KKKKKK.......',
  '.......KKPPPPPPKK.....',
  '......KPPPPPPPPPPK....',
  '......KPPPPMMMMMMMK...',
  '......KPPPKYYYYYYYK...',
  '......KPPPKyyYYYYYK...',
  '......KpPPKKKKKKKKK...',
  '......KppPPPmmmPPK....',
  '...KKKKKKppppppKKKKK..',
  '..KMMMMMMKKKKKKMMMMMK.',
  '.KMMmmmmMMKPPKMMMmmMMK',
  '.KMmmmmmmMKPPKMmmmmMMK',
  '.KMMmmmmMKPPPPKMMMMMK.',
  '..KMMMMMKPPPPPPKKKKK..',
  '...KKKKKPPPPPPPPBBBBK.',
  '....KpPPPPPPPPPKBBBBK.',
  '....KppPPPPPPPpKKKKK..',
  '....KKKKKKKKKKKK......',
  '....KBBBBK..KBBBBK....',
  '....KMMMMK..KMMMMK....',
  '....KBBBBK..KBBBBK....',
  '...KMMMMMK..KMMMMMK...',
  '..KkkkkkkK..KkkkkkkK..',
  '..KKKKKKKK..KKKKKKKK..',
]
const SLAYER_WALK = edit(SLAYER, {
  18: '....KBBBBK...KBBBBK...',
  19: '...KMMMMK.....KMMMMK..',
  20: '...KBBBK.......KBBBK..',
  21: '..KMMMMK.......KMMMMK.',
  22: '.KkkkkkK.......KkkkkkK',
  23: '.KKKKKKK.......KKKKKKK',
})
const SLAYER_RAISE = edit(SLAYER, {
  0: '.........KKKKKK...KMMK',
  1: '.......KKPPPPPPKK.KMMK',
  2: '......KPPPPPPPPPPKKBBK',
  3: '......KPPPPMMMMMMMKBBK',
  4: '......KPPPKYYYYYYYKBBK',
  5: '......KPPPKyyYYYYYKBBK',
  6: '......KpPPKKKKKKKKKBBK',
  7: '......KppPPPmmmPPKKBBK',
  8: '...KKKKKKppppppKKMMMMK',
  9: '..KMMMMMMKKKKKKMMMMMMK',
  14: '...KKKKKPPPPPPPPK.....',
  15: '....KpPPPPPPPPPPK.....',
  16: '....KppPPPPPPPpKK.....',
})
const SLAYER_DIM = { 4: '......KPPPKmmmmmmmK...', 5: '......KPPPKmmmmmmmK...' }
/** The Sentinel crown replaces the helmet's top row. */
const crowned = (rows: string[]) => [
  '.......C...C...C......',
  '.......CC.CgC.CC......',
  '.......CCCCCCCCC......',
  ...rows.slice(1),
]

// ---------------------------------------------------------------------------
// Guns, barrel right
// ---------------------------------------------------------------------------

const PISTOL = [
  '............',
  '...KKKKKKK..',
  '..KMMMMMMMK.',
  '..KmmmmmmmK.',
  '..KmKKKKK...',
  '...KK.......',
]
const SHOTGUN = [
  '....KKKKKKKK',
  'KKKKMMMMMMMM',
  'KWWWKmmmmmmK',
  '.KwwWKWWWWK.',
  '..KKwK.KKK..',
  '....KK......',
]
const SUPER = [
  '...KKKKKKKKK',
  'KKKMMMMMMMMM',
  'WWWKmmmmmmmm',
  'wwwKMMMMMMMM',
  '.KwwKKKKKKKK',
  '..KKwK......',
]
const PLASMA = [
  '..KKKKKKKK..',
  '.KMMMMMMMMKK',
  'KMQqQqQMMMMM',
  'KmmmmmmmmmKK',
  '.KmK..KmK...',
  '..K....K....',
]
const BFG = [
  '.KKKKKKKKK..',
  'KMMMMMMMMMKK',
  'MmEEEEmMMMMM',
  'MEeEEeEmMMMM',
  'MmEEEEmMMMMK',
  'KmmmmmmmmmK.',
  '.KmK..KmK...',
]

// ---------------------------------------------------------------------------
// The status-bar face, healthy to wrecked (11x12)
// ---------------------------------------------------------------------------

const FACE = [
  '..hhhhhhh..',
  '.hhhhhhhhh.',
  'hhShhhhhShh',
  'hKKKSSSKKKh',
  'SOKSSSSSOKS',
  'SSSSSsSSSSS',
  'sSSSSsSSSSs',
  '.SSSssSSSS.',
  '.SSSSSSSSS.',
  '.sSKKKKKSs.',
  '..sSSSSSs..',
  '...sssss...',
]
const FACE3 = edit(FACE, { 2: 'hhShhhhhRhh', 6: 'sSSSSsSSSRs', 7: '.SSSssSSSR.' })
const FACE2 = edit(FACE, {
  2: 'hhRhhhhhRhh',
  4: 'SOKSSSSRRRS',
  5: 'SRSSSsSSRSS',
  6: 'sRSSSsSSSRs',
  7: '.RSSssSSSR.',
  9: '.sSKKKKKRs.',
})
const FACE1 = edit(FACE, {
  1: '.hhRhhhRhh.',
  2: 'hRRhhhhRRhh',
  3: 'hKKKSRSKKKh',
  4: 'SOKSRSSRRRS',
  5: 'RRSSSsRSRRS',
  6: 'sRSRSsSSRRs',
  7: '.RRSssSRSR.',
  8: '.SRSSSSSRS.',
  9: '.sSKOOOKRs.',
  10: '..RSSSSRs..',
})
const FACE0 = edit(FACE1, {
  3: 'hRKKSRSKKKh',
  4: 'SKKSRSSKKRS',
  9: '.sRKOOOKRs.',
})

// ---------------------------------------------------------------------------
// Monsters, props, scenery
// ---------------------------------------------------------------------------

const IMP = [
  '.O......O.',
  '.Oi....iO.',
  '..iiiiii..',
  '..irIIri..',
  '..iiiiii..',
  '...iOOi...',
  '.OiiiiiiO.',
  'OiiIiiIiiO',
  'i.iiiiii.i',
  'i.iIiiIi.i',
  '...iiiii..',
  '...ii.ii..',
  '...ii.ii..',
  '..III.III.',
]
const IMP_THROW = edit(IMP, {
  5: 'f..iOOi...',
  6: 'iOiiiiiiO.',
  7: '.iiIiiIiiO',
  8: '..iiiiii.i',
})

const CYBER = [
  '..H..........H....',
  '..HH........HH....',
  '...HHddddddHH.....',
  '....dddddddd......',
  '....dKrddrKd......',
  '....dddddddd......',
  '.....dDDDDd.......',
  '..ddddddddddddd...',
  '.dddddDDDDdddddd..',
  'mMMMddddddddddddd.',
  'mMMMMdddDDdddddddd',
  'mMMMMddddddddd.ddd',
  '.mMMdddddddddd.ddd',
  '..MMddDDDDdddd.dd.',
  '...ddddddddddd....',
  '....dddddddddd....',
  '....DDDDDDDDDD....',
  '....dddd..MMMM....',
  '....dddd..MmmM....',
  '...ddddd..MMMM....',
  '...dddd...mMMm....',
  '...dddd...MMMM....',
  '..ddddd...MmmM....',
  '..dddd....MMMM....',
  '..ddddd..MMMMMM...',
  '.KKKKKK..KKKKKK...',
]
const CYBER_STEP = edit(CYBER, {
  20: '...dddd....mMMm...',
  21: '..dddd.....MMMM...',
  22: '..dddd.....MmmM...',
  23: '.dddd......MMMM...',
  24: '.ddddd....MMMMMM..',
  25: 'KKKKKK....KKKKKK..',
})

const DOOR = [
  'KKKKKKKKKK',
  'KMMMMMMMMK',
  'KMmmmmmmMK',
  'KMmMMMMmMK',
  'KMmMzzMmMK',
  'KMmMzzMmMK',
  'KMmMMMMmMK',
  'KMmmmmmmMK',
  'KMMMMMMMMK',
  'KMmmmmmmMK',
  'KMmMMMMmMK',
  'KMmMMMMmMK',
  'KMmmmmmmMK',
  'KMMMMMMMMK',
  'KMmmmmmmMK',
  'KMMMMMMMMK',
  'K11KK11KKK',
  'KK11KK11KK',
  'K11KK11KKK',
  'KKKKKKKKKK',
]
const HAZARD = { '1': 'u2' }

const sprites: Theme['sprites'] = {
  // Heroes
  stand: S(MARINE),
  walk: S(MARINE_WALK),
  attack: S(lean(MARINE, 0, 7)),
  itemGet: S(MARINE_FRONT),
  sleep: S(edit(MARINE, { 4: '...KAAKVVVVVK...' })),
  slayerStand: S(SLAYER),
  slayerWalk: S(SLAYER_WALK),
  slayerAttack: S(lean(SLAYER, 0, 9)),
  slayerItemGet: S(SLAYER_RAISE),
  slayerSleep: S(edit(SLAYER, SLAYER_DIM)),
  sentinelStand: S(crowned(SLAYER)),
  sentinelWalk: S(crowned(SLAYER_WALK)),
  sentinelAttack: S(crowned(lean(SLAYER, 0, 9))),
  sentinelItemGet: S(crowned(SLAYER_RAISE)),
  sentinelSleep: S(crowned(edit(SLAYER, SLAYER_DIM))),

  // Guns
  pistol: S(PISTOL),
  shotgun: S(SHOTGUN),
  superShotgun: S(SUPER),
  plasmaRifle: S(PLASMA),
  bfg: S(BFG),
  bfgAura: S(['.e...e..e...e.', 'e............e', '..............', '.............e', 'e.............', '..............', 'e............e', '..............', '.e...e..e...e.'], { e: 'E' }),
  flash1: S(['.F..', 'FfF.', 'fFFF', 'FfF.', '.F..']),
  flash2: S(['F.F.', '.FfF', 'FFFf', '.FfF', 'F.F.']),
  puff: S(['.F.', 'FOF', '.F.']),
  fireball: S(['.fFF.', 'fFOOF', 'fFOOF', '.fFF.']),
  boom: S(['..f..f..', '.fFFof..', 'fFOOFFo.', '.FOOOFf.', 'oFOOFFf.', '.fFFFo..', '..o.f...']),

  // Monsters
  imp: S(IMP),
  impThrow: S(IMP_THROW),
  impDown: rotate(S(IMP), 'cw'),
  cyber: S(CYBER),
  cyberStep: S(CYBER_STEP),

  // Props
  crate: S(['KKKKKKKK', 'KttTTttK', 'KtKttKtK', 'KTtKKtTK', 'KTtKKtTK', 'KtKttKtK', 'KttTTttK', 'KKKKKKKK']),
  crateHit: S(['KKKK.KKK', 'KttT.ttK', 'KtKt.KtK', 'K..KKtTK', 'KTtK..TK', 'KtKttKtK', 'KttT.ttK', 'KKKK.KKK']),
  crateBroken: S(['........', '........', '........', '..t.....', '.tK..T..', 'KtT.tK.t', 'tKtTKtTK', 'KKtKKtKK']),
  terminalA: S([
    'KKKKKKKKKKKK',
    'KMMMMMMMMMMK',
    'KMzzzzzzzzmK',
    'KMzZZZzZzzmK',
    'KMzzzZzZZzmK',
    'KMzZzZzzZzmK',
    'KMzZZZzzzzmK',
    'KMmmmmmmmmmK',
    'KKKKKKKKKKKK',
    '...KMMMMK...',
    '...KMrZMK...',
    '...KMMMMK...',
    '..KMMMMMMK..',
    '.KKKKKKKKKK.',
  ]),
  terminalB: S([
    'KKKKKKKKKKKK',
    'KMMMMMMMMMMK',
    'KMzzzzzzzzmK',
    'KMzzZzzZZZmK',
    'KMzZZzzZzzmK',
    'KMzZzzZZzzmK',
    'KMzZZZZzzzmK',
    'KMmmmmmmmmmK',
    'KKKKKKKKKKKK',
    '...KMMMMK...',
    '...KMZrMK...',
    '...KMMMMK...',
    '..KMMMMMMK..',
    '.KKKKKKKKKK.',
  ]),
  switchOff: S(['KKKKK', 'KMMMK', 'KMrMK', 'KMKMK', 'KMKMK', 'KMMMK', 'KKKKK']),
  switchOn: S(['KKKKK', 'KMMMK', 'KMZMK', 'KMZMK', 'KMKMK', 'KMMMK', 'KKKKK']),
  door0: S(DOOR, HAZARD),
  door1: S(DOOR.slice(5), HAZARD),
  door2: S(DOOR.slice(10), HAZARD),
  door3: S(DOOR.slice(15), HAZARD),
  doorway: S(Array.from({ length: 20 }, () => 'xxxxxxxxxx'), { x: 'darkness' }),
  doorFrame: S([
    'mmmmmmmmmmmmmm',
    'mMMMMMMMMMMMMm',
    'mM..........Mm',
    ...Array.from({ length: 17 }, () => 'mM..........Mm'),
    'mM..........Mm',
    'mM..........Mm',
  ]),
  soulsphere: S(['..UUUUU..', '.UUOUUUU.', 'UUOOUUUUU', 'UUOUUUUuU', 'UUUUUUUuU', 'UUUUUUuuU', '.UUUuuuu.', '..uuuuu..']),
  armorVest: S(['.KK...KK.', 'KAAKKKAAK', 'KAAAAAAaK', 'KAaAAAaaK', 'KAAAAAaaK', '.KKKKKKK.']),
  sweat: S(['.Q.', 'QQQ', '.Q.']),
  lampOn: S(['.KKKKKK.', 'KmllllmK', '.llllll.', 'l.l..l.l']),
  lampOff: S(['.KKKKKK.', 'KmmmmmmK', '........', '........']),
  darkness: S(Array.from({ length: 40 }, () => 'x'.repeat(96)), { x: 'darkness' }),

  // Scenery
  techCeiling: S(['mmmmmmmmmmmmmmmm', 'MMMMMMMMMMMMMMMM', 'mmllllmmmmllllmm', 'KKKKKKKKKKKKKKKK']),
  techFloor: S(['KKKKKKKKKKKKKKKK', 'JJJJJJJjJJJJJJJj', 'JjjjjjjjJjjjjjjj', 'jjjjjjjjjjjjjjjj'], { J: 'floorA', j: 'floorB' }),
  shoresFloor: S(wide(['xxxxxxxxxxxxxxxx', 'XXXxXXLLLLXXXxXX', 'XxXXXLLLLLLXXXXx', 'xxXxxxxxxxxxxXxx']), { x: 'rockB', X: 'rockA', L: 'L' }),
  lavaFloor: S(wide(['xxxXxxxxxXxxxxxx', 'oooffoooooofFooo', 'ofFFfooofFFFfooo', 'oooooooooooooooo']), { x: 'lavaRock', X: 'hellA' }),
  fleshFloor: S(wide(['KKKKKKKKKKKKKKKK', 'xXxxxxXxxXxxxxXx', 'xxxXxxxxxxxXxxxx', 'XXXXXXXXXXXXXXXX']), { x: 'fleshA', X: 'fleshB' }),
  hellCeiling: S(wide(['QQQQQQQQQQQQQQQQ', 'qQqqqQQqqqQqqqQq', '.qq..q..qq...q..', '..q.......q.....']), { q: 'hellA', Q: 'hellB' }),
  uacPanel: S([
    'KKKKKKKKKKKKKK',
    'KmmmmmmmmmmmmK',
    'KmzzzzmmzzzzmK',
    'KmzZzzmmzzZzmK',
    'KmzzZzmmzZzzmK',
    'KmzzzzmmzzzzmK',
    'KmmmmmmmmmmmmK',
    'KmrmZmmmmZmrmK',
    'KmmmmmmmmmmmmK',
    'KKKKKKKKKKKKKK',
  ]),
  barrel: S(['.KKKKKK.', 'KLLLLLLK', 'KNNnNNnK', 'KNnNNNnK', 'KNNNnNnK', 'KmmmmmmK', 'KNNnNNnK', 'KNnNNNnK', 'KNNNNNnK', '.KKKKKK.']),
  firestick: S(['.f..', '.Ff.', 'fFOf', 'fOOf', '.ff.', 'KmmK', '.mm.', '.mm.', '.mm.', '.mm.', '.mm.', '.mm.', '.mm.', '.mm.', '.mm.', '.mm.', 'KmmK', 'mmmm']),
  skullPillar: S([
    '..OOOO..',
    '.OOOOOO.',
    '.OKOOKO.',
    '.OOOOOO.',
    '..OKKO..',
    '..OOOO..',
    '.KmmmmK.',
    '..mmmm..',
    '..mMmm..',
    '..mmmm..',
    '..mMmm..',
    '..mmmm..',
    '..mMmm..',
    '..mmmm..',
    '.KmmmmK.',
    'KmmmmmmK',
  ]),

  // Status bar
  face0: S(FACE0),
  face1: S(FACE1),
  face2: S(FACE2),
  face3: S(FACE3),
  face4: S(FACE),
  miniPistol: S(['MMMMM', 'mmmmm', '.mK..', '.m...']),
  miniShotgun: S(['..MMM', 'WWmmm', 'Ww...', 'w....']),
  miniSuper: S(['MMMMM', 'MMMMM', 'Wwmm.', 'W....']),
  miniPlasma: S(['MMMMM', 'QqQqM', 'mmmmm', '.m.m.']),
  miniBfg: S(['MMMMM', 'EeEMM', 'EEEMm', 'mmmmm']),
  vestIcon: S(['AA.AA', 'AAAAA', 'AaAaA', 'AAAAa', '.aaa.']),
  helmIcon: S(['.PPP.', 'PPMMM', 'PPYYY', 'PPyYY', '.pmm.']),
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

const SMALL: HeroTier[] = ['tier1', 'tier2', 'unknown']
const BIG: HeroTier[] = ['tier3', 'tier4']
/** The Slayer's gun hand against the marine's (`heroForms.hand`). */
const HAND = { x: 2, y: -3 }
const GUN = { x: 9, y: 8 }
const GUN_W = 12

/** The gun in the hero's hands, right side up. */
const gun = (dx = 0, dy = 0) => weapon(GUN.x + dx, GUN.y + dy)
/** The gun when the hero turns to look behind him: mirrored about his own middle. */
const gunBack = () => weapon(16 - GUN.x - GUN_W, GUN.y, { flip: true })
/** A muzzle flash at the barrel's end, for either build. */
const muzzle = (name: string, dx = 0): Actor[] => [
  { ...at(name, GUN.x + GUN_W + dx, GUN.y), tiers: SMALL },
  { ...at(name, GUN.x + GUN_W + HAND.x + dx, GUN.y + HAND.y), tiers: BIG },
]
/** Every outfit key, recolored (pain flashes, the dark). */
const paint = (main: string, shade: string) => ({ A: main, a: shade, P: main, p: shade, M: main, m: shade, B: shade, b: shade, k: shade, S: main, s: shade, C: main, c: shade, g: shade })
const HURT_WHITE = paint('hurtA', 'hurtA')
const HURT_RED = paint('hurtB', 'hurtS')
const SHADOW = paint('shadow', 'shadowS')
const GLOW = { A: 'U', a: 'u', P: 'U', p: 'u', M: 'U', m: 'u' }
const coop = (main: string, shade: string) => ({ A: main, a: shade })

const T = '#f8f8f8'
const think = (text: string, pose = 'stand') => ({ actors: [hero(pose), gun()], texts: [{ text, x: 17, y: -4, color: T }], hold: 2 })

const TERMINAL = { x: 24, y: 2 }
const CRATE = { x: 26, y: 8 }
const SWITCH = { x: 19, y: -2 }
const DOOR_AT = { x: 27, y: -4 }
const door = (n: number): Actor[] => [
  at('doorway', DOOR_AT.x, DOOR_AT.y, { fixed: true }),
  at(`door${n}`, DOOR_AT.x, DOOR_AT.y, { fixed: true }),
  at('doorFrame', DOOR_AT.x - 2, DOOR_AT.y - 2, { fixed: true }),
]
const IMP_AT = { x: 27, y: 2 }
const LAMP = { x: 4, y: -16 }
const dark: Actor = at('darkness', -8, -20, { fixed: true })

const buddies = (x: number, step: boolean): Actor[] => [
  at(step ? 'walk' : 'stand', x, 0, { swap: coop('coopIndigo', 'coopIndigoS') }),
  at('shotgun', x + GUN.x, GUN.y),
  at(step ? 'stand' : 'walk', x + 13, 0, { swap: coop('coopBrown', 'coopBrownS') }),
  at('shotgun', x + 13 + GUN.x, GUN.y),
]

const states: Theme['states'] = {
  idle: loop(
    { actors: [hero('stand'), gun()], hold: 4 },
    { actors: [{ ...hero('stand'), flip: true }, gunBack()], hold: 3 },
    { actors: [hero('stand'), gun()], hold: 3 },
    { actors: [hero('walk'), gun()], hold: 1 },
    { actors: [hero('stand'), gun()], texts: [{ text: '?', x: 17, y: -4, color: T }], hold: 2 },
  ),
  thinking: loop(think('.'), think('..'), think('...'), think('?', 'walk')),
  reading: loop(
    { actors: [hero('stand'), gun(), at('terminalA', TERMINAL.x, TERMINAL.y)], hold: 3 },
    { actors: [hero('stand'), gun(), at('terminalB', TERMINAL.x, TERMINAL.y)], hold: 3 },
    { actors: [hero('walk'), gun(), at('terminalA', TERMINAL.x, TERMINAL.y)], hold: 1 },
    { actors: [hero('stand'), gun(), at('terminalB', TERMINAL.x, TERMINAL.y)], hold: 2 },
  ),
  editing: loop(
    { actors: [hero('stand'), gun(), at('crate', CRATE.x, CRATE.y)], hold: 1 },
    { actors: [hero('attack'), gun(), ...muzzle('flash1'), at('crate', CRATE.x, CRATE.y), at('puff', CRATE.x + 1, CRATE.y + 2)], hold: 1 },
    { actors: [hero('attack'), gun(), ...muzzle('flash2'), at('crateHit', CRATE.x, CRATE.y), at('puff', CRATE.x + 3, CRATE.y + 4)], hold: 1 },
    { actors: [hero('attack'), gun(), ...muzzle('flash1'), at('crateBroken', CRATE.x, CRATE.y)], hold: 2 },
    { actors: [hero('stand'), gun()], hold: 1 },
  ),
  shell: loop(
    { actors: [...door(0), at('switchOff', SWITCH.x, SWITCH.y, { fixed: true }), hero('stand'), gun()], hold: 2 },
    { actors: [...door(0), at('switchOn', SWITCH.x, SWITCH.y, { fixed: true }), hero('attack'), gun()], hold: 1 },
    { actors: [...door(1), at('switchOn', SWITCH.x, SWITCH.y, { fixed: true }), hero('stand'), gun()], hold: 1 },
    { actors: [...door(2), at('switchOn', SWITCH.x, SWITCH.y, { fixed: true }), hero('stand'), gun()], hold: 1 },
    { actors: [...door(3), at('switchOn', SWITCH.x, SWITCH.y, { fixed: true }), hero('stand'), gun()], hold: 3 },
    { actors: [...door(1), at('switchOff', SWITCH.x, SWITCH.y, { fixed: true }), hero('stand'), gun()], hold: 1 },
  ),
  agents: loop(
    { actors: [...buddies(24, false), hero('itemGet')], hold: 2 },
    { actors: [...buddies(28, true), hero('stand'), gun()], hold: 1 },
    { actors: [...buddies(33, false), hero('stand'), gun()], hold: 1 },
    { actors: [...buddies(38, true), hero('stand'), gun()], hold: 1 },
    { actors: [...buddies(44, false), hero('stand'), gun()], hold: 1 },
    { actors: [hero('stand'), gun()], hold: 2 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop(
    { actors: [dark, at('lampOff', LAMP.x, LAMP.y, { fixed: true }), hero('sleep', 0, 0, SHADOW)], hold: 4 },
    { actors: [at('lampOn', LAMP.x, LAMP.y, { fixed: true }), hero('stand'), gun()], hold: 1 },
    { actors: [dark, at('lampOff', LAMP.x, LAMP.y, { fixed: true }), hero('stand', 0, 0, SHADOW)], hold: 1 },
    { actors: [at('lampOn', LAMP.x, LAMP.y, { fixed: true }), hero('stand'), gun()], hold: 1 },
    { actors: [dark, at('lampOff', LAMP.x, LAMP.y, { fixed: true }), { ...hero('stand', 0, 0, SHADOW), flip: true }], hold: 4 },
  ),
}

const over = (caption: string) => ({ caption })
const sweat = at('sweat', 16, -1)
const README = 'Rip and tear... the README.'
const SWITCHES = 'Rip and tear... a light switch.'
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), gun(), at('terminalA', TERMINAL.x, TERMINAL.y), sweat], hold: 3, ...over(README) },
    { actors: [hero('stand'), gun(), at('terminalB', TERMINAL.x, TERMINAL.y), sweat], hold: 3, ...over(README) },
    { actors: [hero('sleep'), gun(), at('terminalA', TERMINAL.x, TERMINAL.y), sweat], texts: [{ text: '...', x: 17, y: -4, color: T }], hold: 3, ...over(README) },
  ),
  shell: loop(
    { actors: [...door(0), at('switchOff', SWITCH.x, SWITCH.y, { fixed: true }), hero('stand'), gun(), sweat], hold: 2, ...over(SWITCHES) },
    { actors: [...door(0), at('switchOn', SWITCH.x, SWITCH.y, { fixed: true }), hero('attack'), gun(), sweat], hold: 1, ...over(SWITCHES) },
    { actors: [...door(2), at('switchOn', SWITCH.x, SWITCH.y, { fixed: true }), hero('stand'), gun(), sweat], hold: 2, ...over(SWITCHES) },
    { actors: [...door(3), at('switchOn', SWITCH.x, SWITCH.y, { fixed: true }), hero('sleep'), gun(), sweat], texts: [{ text: '...', x: 17, y: -4, color: T }], hold: 3, ...over(SWITCHES) },
  ),
}

const tally = (n: number) =>
  ['KILLS  100%', 'ITEMS  100%', 'SECRET 100%'].slice(0, n).map((text, k) => ({ text, x: 18, y: -14 + k * 2, color: 'tally', bg: 'ink' }))

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('attack'), gun(), ...muzzle('flash1'), at('imp', IMP_AT.x, IMP_AT.y)], hold: 1 },
    { actors: [hero('attack'), gun(), ...muzzle('flash2'), at('imp', IMP_AT.x, IMP_AT.y, { swap: { i: 'hurtB', I: 'hurtS' } })], hold: 1 },
    { actors: [hero('stand'), gun(), at('impDown', IMP_AT.x - 2, 6)], hold: 2 },
  ),
  toolError: once(
    { actors: [hero('stand'), gun(), at('impThrow', IMP_AT.x, IMP_AT.y), at('fireball', IMP_AT.x - 5, 6)], hold: 1 },
    { actors: [hero('stand'), gun(), at('imp', IMP_AT.x, IMP_AT.y), at('fireball', 17, 5)], hold: 1 },
    { actors: [hero('stand', 0, 0, HURT_WHITE), gun(), at('imp', IMP_AT.x, IMP_AT.y), at('boom', 8, 3)], hold: 1 },
    { actors: [hero('stand', -2, 0, HURT_RED), gun(-2), at('imp', IMP_AT.x, IMP_AT.y)], hold: 1 },
    { actors: [hero('stand', -3, 0, HURT_WHITE), gun(-3), at('imp', IMP_AT.x, IMP_AT.y)], hold: 1 },
    { actors: [hero('stand', -3, 0, HURT_RED), gun(-3), at('imp', IMP_AT.x, IMP_AT.y)], hold: 1 },
    { actors: [hero('stand', -2, 0), gun(-2), at('imp', IMP_AT.x, IMP_AT.y)], hold: 1 },
  ),
  turnComplete: once(
    { actors: [at('switchOff', SWITCH.x, SWITCH.y, { fixed: true }), hero('stand'), gun()], hold: 1 },
    { actors: [at('switchOn', SWITCH.x, SWITCH.y, { fixed: true }), hero('attack'), gun()], hold: 1 },
    { actors: [at('switchOn', SWITCH.x, SWITCH.y, { fixed: true }), hero('itemGet')], texts: tally(1), hold: 2 },
    { actors: [at('switchOn', SWITCH.x, SWITCH.y, { fixed: true }), hero('itemGet')], texts: tally(2), hold: 2 },
    { actors: [at('switchOn', SWITCH.x, SWITCH.y, { fixed: true }), hero('itemGet')], texts: tally(3), hold: 4 },
  ),
  milestone: once({ actors: [hero('stand'), gun()], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [at('lampOn', LAMP.x, LAMP.y, { fixed: true }), hero('stand'), gun()], hold: 2 },
    { actors: [dark, at('lampOff', LAMP.x, LAMP.y, { fixed: true }), hero('stand', 0, 0, SHADOW)], hold: 1 },
    { actors: [at('lampOn', LAMP.x, LAMP.y, { fixed: true }), hero('stand'), gun()], hold: 1 },
    { actors: [dark, at('lampOff', LAMP.x, LAMP.y, { fixed: true }), hero('stand', 0, 0, SHADOW)], hold: 2 },
    { actors: [dark, at('lampOff', LAMP.x, LAMP.y, { fixed: true }), hero('stand', 0, 0, SHADOW)], message: 'cacheCold', hold: 12 },
  ),
  limitWarning: once(
    { actors: [hero('stand'), gun(), at('cyber', 40, -10, { fixed: true })], hold: 1 },
    { actors: [hero('stand', -1, 0), gun(-1), at('cyberStep', 34, -10, { fixed: true })], hold: 1 },
    { actors: [hero('stand', 1, 0), gun(1), at('cyber', 29, -10, { fixed: true })], hold: 1 },
    { actors: [hero('stand', -1, 0, HURT_RED), gun(-1), at('cyberStep', 25, -10, { fixed: true })], hold: 1 },
    { actors: [hero('stand'), gun(), at('cyber', 25, -10, { fixed: true })], message: 'limitWarning', hold: 15 },
  ),
  compaction: once(
    { actors: [hero('stand'), gun(), at('soulsphere', 26, 2)], hold: 2, caption: 'compaction' },
    { actors: [hero('walk', 4), gun(4), at('soulsphere', 26, 1)], hold: 1, caption: 'compaction' },
    { actors: [hero('stand', 8), gun(8), at('soulsphere', 26, 3)], hold: 1, caption: 'compaction' },
    {
      actors: [hero('itemGet', 10, 0, GLOW)],
      texts: [{ text: '*', x: 9, y: -6, color: '#78c8ff' }, { text: '*', x: 27, y: -2, color: '#78c8ff' }],
      hold: 3,
      caption: 'compaction',
    },
    { actors: [hero('stand', 10), gun(10)], hold: 2, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [{ ...at('armorVest', 24, 10), tier: true }, hero('stand'), gun()], hold: 2 },
    { actors: [{ ...at('armorVest', 24, 10), tier: true }, hero('walk', 5), gun(5)], hold: 1 },
    { actors: [hero('itemGet', 8, 0, HURT_WHITE)], hold: 1 },
    {
      actors: [hero('itemGet', 8)],
      texts: [{ text: '*', x: 6, y: -6, color: '#f0d040' }, { text: '*', x: 26, y: -4, color: '#f0d040' }],
      hold: 5,
      caption: 'modelChange',
    },
  ),
  effortChange: once(
    { actors: [hero('itemGet'), weapon(5, -8)], hold: 3 },
    {
      actors: [hero('itemGet'), weapon(5, -8)],
      texts: [{ text: '*', x: 0, y: -10, color: '#f0d040' }, { text: '*', x: 16, y: -6, color: '#f0d040' }],
      hold: 5,
      caption: 'effortChange',
    },
  ),
}

const SLAYER_POSES = { stand: 'slayerStand', walk: 'slayerWalk', attack: 'slayerAttack', itemGet: 'slayerItemGet', sleep: 'slayerSleep' }
const SENTINEL_POSES = { stand: 'sentinelStand', walk: 'sentinelWalk', attack: 'sentinelAttack', itemGet: 'sentinelItemGet', sleep: 'sentinelSleep' }
const SENTINEL = { A: 'sentP', a: 'sentp', P: 'sentP', p: 'sentp', Y: 'sentY', y: 'senty', M: 'sentM', m: 'sentm' }

export const doom: Theme = {
  id: 'doom',
  name: 'Knee-Deep in the Context',
  description: '1993 demon-shooter homage: the marine\'s face bloodies as context fills, one gun per effort, four episodes deep',
  version: '1.0.0',
  palette: {
    dark: { accent: '#5cc84c', gold: '#f0c040', red: '#ff4030', label: '#e07838', dim: '#8c8c8c', text: '#e8e8e8' },
    light: { accent: '#2c7c1c', gold: '#9c7400', red: '#b81c10', label: '#a84c10', dim: '#6c6c6c', text: '#1c1c1c' },
  },
  pixels,
  labels: {
    context: 'HEALTH',
    spend: 'AMMO SPENT',
    cache: 'ARMOR',
    limits: 'PAR TIME',
    modelItem: 'SUIT',
    effortItem: 'ARMS',
    heroes: 'Marines',
    weapons: 'Arsenal',
  },
  headings: {
    Context: 'Health',
    Cost: 'Ammo',
    'Next message': 'Armor',
    Tokens: 'Tally',
    Limits: 'Par Times',
    'Tool calls': 'Kills',
    Files: 'Automap',
  },
  sprites,
  states,
  cold,
  overkill,
  events,
  scene: {
    height: 40,
    anchor: { x: 8, y: 20 },
    background: {
      ground: '#454c43',
      gradient: ['#30342e', '#454c43', '#575f55', '#4b5249', '#353a33'],
      deep: ['#1a0303', '#3c0806', '#5c1008', '#45090a', '#220404'],
      border: 'techCeiling',
      floor: 'techFloor',
      shade: { color: '#000000', amount: 0.3 },
      decor: [
        // E1: the tech base
        { sprite: 'uacPanel', x: -2, y: 8, maxPercent: 30, minColumns: 52 },
        { sprite: 'barrel', x: -5, y: 26, maxPercent: 50, minColumns: 52 },
        // E2: the Shores of Hell
        { sprite: 'shoresFloor', x: 0, y: 36, minPercent: 30, maxPercent: 50 },
        { sprite: 'firestick', x: -3, y: 18, minPercent: 30, maxPercent: 75, minColumns: 52 },
        // E3: Inferno
        { sprite: 'hellCeiling', x: 0, y: 0, minPercent: 50 },
        { sprite: 'lavaFloor', x: 0, y: 36, minPercent: 50, maxPercent: 75 },
        { sprite: 'firestick', x: -20, y: 18, minPercent: 50, maxPercent: 75, minColumns: 72 },
        // E4: Thy Flesh Consumed
        { sprite: 'fleshFloor', x: 0, y: 36, minPercent: 75 },
        { sprite: 'skullPillar', x: -3, y: 20, minPercent: 75, minColumns: 52 },
      ],
      particles: [
        { colors: ['#8c948c', '#a8b0a8'], count: 6, drift: 'down', speed: 0.3, maxPercent: 30 },
        { colors: ['#60e040', '#a0ff70'], count: 5, drift: 'up', speed: 0.5, minPercent: 30, maxPercent: 50 },
        { colors: ['#ff8020', '#ffc040', '#e03010'], count: 12, drift: 'up', speed: 1, minPercent: 50 },
        { colors: ['#ff4010', '#c01008', '#ffa040'], count: 14, drift: 'up', speed: 1.5, minPercent: 75 },
      ],
    },
    hero: { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'sleep' },
    heroTiers: {
      tier1: {},
      tier2: { A: 'megaA', a: 'megaa' },
      tier3: { A: 'P', a: 'p' },
      tier4: SENTINEL,
      unknown: { A: 'zomA', a: 'zoma', S: 'zomS', V: 'zomV', v: 'zomv' },
    },
    heroForms: {
      tier3: { poses: SLAYER_POSES, dx: -3, dy: -8, lift: 8, hand: HAND },
      tier4: { poses: SENTINEL_POSES, dx: -3, dy: -10, lift: 10, hand: HAND },
    },
    heroNames: {
      tier1: 'Security Marine',
      tier2: 'MegaArmor Marine',
      tier3: 'The Doom Slayer',
      tier4: 'Sentinel Slayer',
      unknown: 'Former Human',
    },
    weapons: {
      low: { sprite: 'pistol', swap: {}, name: 'Pistol' },
      medium: { sprite: 'shotgun', swap: {}, name: 'Shotgun' },
      high: { sprite: 'superShotgun', swap: {}, name: 'Super Shotgun' },
      xhigh: { sprite: 'plasmaRifle', swap: {}, name: 'Plasma Rifle' },
      max: { sprite: 'bfg', swap: {}, aura: 'bfgAura', name: 'BFG 9000' },
    },
    bar: {
      widgets: [
        { kind: 'counter', value: 'spend', label: 'AMMO', digits: 3 },
        { kind: 'counter', value: 'contextLeft', label: 'HEALTH', format: '{v}%' },
        {
          kind: 'box',
          shows: 'effort',
          sprite: 'miniShotgun',
          sprites: { low: 'miniPistol', medium: 'miniShotgun', high: 'miniSuper', xhigh: 'miniPlasma', max: 'miniBfg' },
          label: 'ARMS',
          x: 1,
          y: 5,
        },
        { kind: 'meter', value: 'contextLeft', count: 1, perRow: 1, sprites: ['face0', 'face1', 'face2', 'face3', 'face4', 'face4'] },
        { kind: 'counter', value: 'cache', label: 'ARMOR', format: '{v}%' },
        { kind: 'box', shows: 'model', sprite: 'vestIcon', sprites: { tier3: 'helmIcon', tier4: 'helmIcon' }, label: 'SUIT', x: 1, y: 5, drop: 1 },
        { kind: 'counter', value: 'limitMax', label: 'PAR', format: '{v}%', drop: 2 },
        { kind: 'map', drop: 3 },
      ],
      colors: { bg: 'barBg', box: 'barBox', text: 'barRed', label: 'barLabel', map: 'mapBg', mapDot: 'mapDot' },
    },
    lineup: { ground: 'lineupBg', ink: '#101010', dim: '#3c3c3c', mark: '#a01010' },
    message: { bg: 'ink', ink: 'barRed' },
  },
  text: {
    idle: 'The marine scans the room. Too quiet.',
    thinking: 'The marine studies the automap...',
    reading: 'The marine reads the computer map.',
    editing: 'The marine shoots crates to splinters.',
    shell: 'The marine hits a switch; a door rises.',
    agents: 'Co-op marines head out on their own.',
    toolSuccess: 'An imp goes down!',
    toolError: 'An imp fireball hits! Ouch.',
    turnComplete: 'Level complete: Kills 100%.',
    milestone: 'Deeper into the episode.',
    cacheCold: 'The lights go out: a dark sector.',
    limitWarning: 'The Cyberdemon stomps in.',
    compaction: 'Supercharge! A soulsphere.',
    modelChange: 'Picked up new armor!',
    effortChange: 'You got a new weapon!',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: 'E1: KNEE-DEEP IN THE CONTEXT. {pct}% USED. THE BASE IS QUIET. KEEP MOVING, MARINE.' },
    { level: 'warn', message: 'E2: THE SHORES OF HELL. {pct}% USED. MIND YOUR HEALTH.' },
    { level: 'orange', message: 'E2: THE SHORES OF HELL. {pct}% USED. FIND THE EXIT SWITCH SOON.' },
    { level: 'alert', message: 'E3: INFERNO. {pct}% USED. THIS IS NO PLACE TO LINGER. FINISH THE LEVEL.' },
    { level: 'critical', message: 'E4: THY FLESH CONSUMED. {pct}% USED. THE EPISODE IS ENDING: SAVE YOUR PROGRESS AND /clear.' },
  ],
  messages: {
    cacheCold: 'THE LIGHTS ARE OUT. THIS SECTOR IS DARK: YOUR CACHE IS COLD.',
    limitWarning: 'THE CYBERDEMON APPROACHES! {name} AT {pct}%.',
    compaction: 'Supercharge! Context compacted.',
    modelChange: 'Picked up new armor: {name}!',
    effortChange: 'You got the {weapon}!',
  },
}
