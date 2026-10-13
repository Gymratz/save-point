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
import type { Actor, Animation, Frame, HeroTier, SceneText, Sprite, Theme, ThemeAction } from './types'

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
  barBg: '#262626',
  barBox: '#8c8c8c',
  barRed: '#ff5444',
  barLabel: '#e0e0e0',
  mapBg: '#141414',
  mapDot: '#f0d040',
  lineupBg: '#b4b4b4',
  txt: '#f8f8f8',
  tally: '#ff5444',
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
/** One hand up to a wall switch; the gun stays in the other. */
const MARINE_USE = edit(MARINE, {
  3: '...KAAAKKKKKKKK.',
  4: '...KAAKVvVVVKSSK',
  5: '...KaAKVVVVVKSSK',
  6: '...KaaAKSSSKKBK.',
  7: '..KKKKKaKKKKBBK.',
  8: '.KAAAAAKAAAABK..',
  9: '.KAaaAAAAAAAK...',
  10: '.KAaaAAAAAAK....',
  11: '..KAAaaaaaK.....',
})
/** Bored: the head sinks a pixel and the visor goes dull. */
const MARINE_BORED = ['................', ...MARINE.slice(0, 4), '...KAAKVVVVVK...', MARINE[5]!, ...MARINE.slice(7)]
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
/** A gauntlet punched forward into a wall switch (the sprite is wider by the reach). */
const SLAYER_USE = edit(SLAYER, {
  8: '...KKKKKKppppppKKKKKKKKK.',
  9: '..KMMMMMMKKKKKKMMMMMBBMMK',
  10: '.KMMmmmmMMKPPKMMMmmMBBMMK',
  11: '.KMmmmmmmMKPPKMmmmmMKKKK.',
  14: '...KKKKKPPPPPPPPK.....',
  15: '....KpPPPPPPPPPPK.....',
  16: '....KppPPPPPPPpKK.....',
})
const SLAYER_DIM = { 4: '......KPPPKmmmmmmmK...', 5: '......KPPPKmmmmmmmK...' }
/** The Sentinel crown replaces the helmet's top row, as wide as the helmet; whatever is beside the helmet (a raised fist) stays. */
const crowned = (rows: string[]) => [
  '.......C...CC...C.....',
  '.......CC.CggC.CC.....',
  `.......cCCCCCCCCc${rows[0]!.slice(17)}`,
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
  '..iiiiii..',
  '..ii..ii..',
  '..ii..ii..',
  '.III..III.',
]
/** The near arm thrown up over the head, a fireball leaving the claw. */
const IMP_THROW = edit(IMP, {
  0: 'iO......O.',
  1: 'ii.....iO.',
  2: 'i.iiiiii..',
  3: 'i.irIIri..',
  4: 'i.iiiiii..',
  5: 'i..iOOi...',
  6: 'iiiiiiiiO.',
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
/** The cannon arm raised straight up at the ceiling. */
const CYBER_AIM = edit(CYBER, {
  3: 'MMMMdddddddd......',
  4: 'mMMMdKrddrKd......',
  5: 'mMMMdddddddd......',
  6: 'mMMM.dDDDDd.......',
  7: 'mMMMddddddddddd...',
  8: 'mMMMddDDDDdddddd..',
  10: '.mMMMdddDDdddddddd',
  11: '....dddddddddd.ddd',
  12: '....dddddddddd.ddd',
  13: '....ddDDDDdddd.dd.',
})

const DOOR = [
  'KKKKKKKK',
  'KMMMMMMK',
  'KMmmmmMK',
  'KMmzzmMK',
  'KMmzzmMK',
  'KMmmmmMK',
  'KMMMMMMK',
  'KMmmmmMK',
  'KMmMMmMK',
  'KMmMMmMK',
  'KMmmmmMK',
  'KMMMMMMK',
  'KMmmmmMK',
  'KMmmmmMK',
  'KMMMMMMK',
  'KMMMMMMK',
  'K11K11KK',
  'KK11K11K',
  'K11K11KK',
  'KKKKKKKK',
]
const HAZARD = { '1': 'u2' }

const sprites: Theme['sprites'] = {
  // Heroes
  stand: S(MARINE),
  walk: S(MARINE_WALK),
  attack: S(lean(MARINE, 0, 7)),
  itemGet: S(MARINE_FRONT),
  sleep: S(MARINE_BORED),
  use: S(MARINE_USE),
  slayerStand: S(SLAYER),
  slayerWalk: S(SLAYER_WALK),
  slayerAttack: S(lean(SLAYER, 0, 9)),
  slayerItemGet: S(SLAYER_RAISE),
  slayerSleep: S(edit(SLAYER, SLAYER_DIM)),
  slayerUse: S(SLAYER_USE),
  sentinelStand: S(crowned(SLAYER)),
  sentinelWalk: S(crowned(SLAYER_WALK)),
  // The crown leans with the head.
  sentinelAttack: S(lean(crowned(SLAYER), 0, 11)),
  sentinelItemGet: S(crowned(SLAYER_RAISE)),
  sentinelSleep: S(crowned(edit(SLAYER, SLAYER_DIM))),
  sentinelUse: S(crowned(SLAYER_USE)),

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
  // Flying left: the bright core leads, the orange trails.
  fireball: S(['.FFf.', 'FOOFf', 'FOOFf', '.FFf.']),
  // Teleport fog: something arrives or leaves.
  fog1: S([
    '.....E......',
    '..E.EeE..E..',
    '...EEEEE....',
    '.E.EEOEEE.e.',
    '..EEOOEOEE..',
    'e.EOEOOEEE..',
    '.EEEOOOOEE.E',
    '..EEOEOEEE..',
    '.eEEEOOEE...',
    '...EEEOEE.E.',
    '.E..EEEE....',
    '...e.EE..e..',
    '..E.....E...',
    '.....e......',
  ]),
  fog2: S([
    '..e......E..',
    '......e.....',
    '.E..E.E..e..',
    '...e.E.E....',
    'e..E.O.E.E..',
    '..E.O.E.e...',
    '.e..EOE..E.e',
    '...E.O.E....',
    '.E..E.E..e..',
    '..e..E.e....',
    '....e...E...',
    '.E.....e....',
    '....E.....e.',
    '..e.....E...',
  ]),
  boom: S(['..f..f..', '.fFFof..', 'fFOOFFo.', '.FOOOFf.', 'oFOOFFf.', '.fFFFo..', '..o.f...']),

  // Monsters
  imp: S(IMP),
  impThrow: S(IMP_THROW),
  impDown: rotate(S(IMP), 'cw'),
  cyber: S(CYBER),
  cyberStep: S(CYBER_STEP),
  cyberAim: S(CYBER_AIM),
  // Its rocket, nose up.
  rocket: S(['.r.', 'MMM', 'MmM', 'MmM', 'MMM', 'FfF', '.f.']),
  // You: a fist in a hazard-striped cuff, reaching down through the ceiling (see the actions).
  fist: S(['11KK11KK', 'K11KK11K', '.KSSSSK.', 'KSSSSSSK', 'KSSSSSSK', 'KsssSSSK', 'KsSSSSsK', '.KKKKKK.'], HAZARD),

  // Props
  crate: S(['KKKKKKKKKK', 'KTttttttTK', 'KtTttttTtK', 'KttTttTttK', 'KtttTTtttK', 'KtttTTtttK', 'KttTttTttK', 'KtTttttTtK', 'KTttttttTK', 'KKKKKKKKKK', 'KttttttttK', 'KKKKKKKKKK']),
  crateHit: S(['KKKK.KKKKK', 'KTtt.tttTK', 'KtTt..tTtK', 'K..TttTttK', 'Ktt.TT..tK', 'Kttt.TtttK', 'KttTt.TttK', 'KtTtt.tTtK', 'KTtt.tttTK', 'KKKK.KKKKK', 'KttttttttK', 'KKKKKKKKKK']),
  crateBroken: S(['..........', '..........', '..........', '..........', '..........', '..........', '...t......', '.tK...T...', 'KtT..tK.t.', 'tKtT.KtTKt', 'KttKttKttK', 'KKKKKKKKKK']),
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
  doorway: S(Array.from({ length: 20 }, () => 'xxxxxxxx'), { x: 'darkness' }),
  doorFrame: S(['MMMMMMMMMM', ...Array.from({ length: 20 }, () => 'M........M')]),
  // A teleporter pad set in the floor, and its glow.
  pad: S(['KrrorrrrorrorK', 'KKRRRRRRRRRRKK']),
  padLit: S(['KfFfFffFffFffK', 'KKooooooooooKK']),
  // The helmet of a new suit, in its wearer's colors.
  helmet: S([...MARINE.slice(0, 6).map(r => r.slice(3, 13)), 'KKKKKKKKKK']),
  soulsphere: S(['..UUUUU..', '.UUOUUUU.', 'UUOOUUUUU', 'UUOUUUUuU', 'UUUUUUUuU', 'UUUUUUuuU', '.UUUuuuu.', '..uuuuu..']),
  sweat: S(['.Q.', '.Q.', 'QQQ', 'OQQ', '.Q.']),
  // A floor lamp: it stands on the floor at any scene height.
  lampOn: S(['.llll.', 'lKKKKl', 'KlOOlK', 'KlOOlK', 'KlOOlK', 'KllllK', 'lKKKKl', '..mm..', ...Array.from({ length: 10 }, () => '..mm..'), '.KmmK.', 'KmmmmK']),
  lampOff: S(['......', '.KKKK.', 'KmmmmK', 'KmmmmK', 'KmmmmK', 'KmmmmK', '.KKKK.', '..mm..', ...Array.from({ length: 10 }, () => '..mm..'), '.KmmK.', 'KmmmmK']),
  // Covers the scene at its tallest (half as high again as designed).
  darkness: S(Array.from({ length: 60 }, () => 'x'.repeat(96)), { x: 'darkness' }),

  // Scenery
  techCeiling: S(['mmmmmmmmmmmmmmmm', 'MMMMMMMMMMMMMMMM', 'mmllllmmmmllllmm', 'KKKKKKKKKKKKKKKK']),
  techFloor: S(['KKKKKKKKKKKKKKKK', 'JJJJJJJjJJJJJJJj', 'JjjjjjjjJjjjjjjj', 'jjjjjjjjjjjjjjjj'], { J: 'floorA', j: 'floorB' }),
  shoresFloor: S(wide(['xxxxxxxxxxxxxxxx', 'XXXxXXLLLLXXXxXX', 'XxXXXLLLLLLXXXXx', 'xxXxxxxxxxxxxXxx']), { x: 'rockB', X: 'rockA', L: 'L' }),
  lavaFloor: S(wide(['xxxXxxxxxXxxxxxx', 'oooffoooooofFooo', 'ofFFfooofFFFfooo', 'oooooooooooooooo']), { x: 'lavaRock', X: 'hellA' }),
  fleshFloor: S(wide(['KKKKKKKKKKKKKKKK', 'xXxxxxXxxXxxxxXx', 'xxxXxxxxxxxXxxxx', 'XXXXXXXXXXXXXXXX']), { x: 'fleshA', X: 'fleshB' }),
  // Four solid rows over the tech ceiling, then the drips.
  hellCeiling: S(wide(['QQQQQQQQQQQQQQQQ', 'qQqqqQQqqqQqqqQq', 'qqqqQqqqqqqqQqqq', 'QqqQQqQQqqQQQqQQ', '.qq..q..qq...q..', '..q.......q.....']), { q: 'hellA', Q: 'hellB' }),
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
  // Eleven rows: a pixel of bar under the chin.
  face0: S(FACE0.slice(0, 11)),
  face1: S(FACE1.slice(0, 11)),
  face2: S(FACE2.slice(0, 11)),
  face3: S(FACE3.slice(0, 11)),
  face4: S(FACE.slice(0, 11)),
  miniPistol: S(['MMMMM', 'mmmmm', '.mK..', '.m...']),
  miniShotgun: S(['..MMM', 'WWmmm', 'Ww...', 'w....']),
  miniSuper: S(['MMMMM', 'MMMMM', 'Wwmm.', 'W....']),
  miniPlasma: S(['MMMMM', 'QqQqM', 'mmmmm', '.m.m.']),
  miniBfg: S(['MMMMM', 'EeEMM', 'EEEMm', 'mmmmm']),
  marineIcon: S(['.AAA.', 'AAAAA', 'AAVvV', 'AaVVV', '.aSS.']),
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

// The action stays inside columns 0..45. The hero stands at 8 (the Slayer's
// pauldrons span 6..26, his gun ends at 30; turned to look behind him, the
// BFG's aura starts at 0), so what he works on has columns 32..45, or 27..45
// while he faces us with no gun out.

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
// Plasma blue with white metal: it shows on the blue MegaArmor too.
const GLOW = { A: 'Q', a: 'q', P: 'Q', p: 'q', M: 'O', m: 'Q', B: 'q' }
const coop = (main: string, shade: string) => ({ A: main, a: shade })

const think = (text: string, pose = 'stand') => ({ actors: [hero(pose), gun()], texts: [{ text, x: 17, y: -4, color: 'txt' }], hold: 2 })

const TERMINAL = { x: 25, y: 2 }
const CRATE = { x: 27, y: 4 }
/** Where a shot lands on the crate: at the barrel's height for either build. */
const hit = (dx = 0, dy = 0): Actor[] => [
  { ...at('puff', CRATE.x - 1 + dx, GUN.y + 1 + dy), tiers: SMALL },
  { ...at('puff', CRATE.x - 1 + dx, GUN.y + HAND.y + 1 + dy), tiers: BIG },
]
/** The wall switch, beside the hand that reaches for it: the marine's, or the Slayer's fist. */
const wallSwitch = (lit: boolean): Actor[] => [
  { ...at(lit ? 'switchOn' : 'switchOff', 16, 1, { fixed: true }), tiers: SMALL },
  { ...at(lit ? 'switchOn' : 'switchOff', 22, -3, { fixed: true }), tiers: BIG },
]
const DOOR_AT = { x: 29, y: -4 }
const door = (n: number): Actor[] => [
  at('doorway', DOOR_AT.x, DOOR_AT.y, { fixed: true }),
  at(`door${n}`, DOOR_AT.x, DOOR_AT.y, { fixed: true }),
  at('doorFrame', DOOR_AT.x - 1, DOOR_AT.y - 1, { fixed: true }),
]
const IMP_AT = { x: 27, y: 2 }
const LAMP = at('lampOn', 30, -4, { fixed: true })
const LAMP_OFF = at('lampOff', 30, -4, { fixed: true })
// The dark covers the whole scene, at every width and height: meant to cross its edges.
const dark: Actor = at('darkness', -8, -40, { fixed: true, offstage: true })

// Co-op marines step onto a teleporter pad and are gone, one after another.
const PAD = { x: 19, y: 16 }
const BUDDY = 17
const INDIGO = coop('coopIndigo', 'coopIndigoS')
const BROWN = coop('coopBrown', 'coopBrownS')
const pad = (lit = false) => at(lit ? 'padLit' : 'pad', PAD.x, PAD.y)
// The hero stands four pixels left for the loop (the Slayer then ends at column 22), so a buddy
// and his shotgun (columns 25..45) are whole beside him with ground between them.
const ASIDE = -4
const waving = () => hero('itemGet', ASIDE)
/** A buddy taking his last step onto the pad, then standing on it with his shotgun. */
const stepping = (swap: Record<string, string>): Actor[] => [at('walk', BUDDY - 1, 0, { swap }), at('shotgun', BUDDY - 1 + GUN.x, GUN.y)]
const onPad = (swap: Record<string, string>): Actor[] => [at('stand', BUDDY, 0, { swap }), at('shotgun', BUDDY + GUN.x, GUN.y)]
const fog = (n: 1 | 2) => at(`fog${n}`, BUDDY + 2, 1)

const states: Theme['states'] = {
  idle: loop(
    { actors: [hero('stand'), gun()], hold: 4 },
    { actors: [{ ...hero('stand'), flip: true }, gunBack()], hold: 3 },
    { actors: [hero('stand'), gun()], hold: 3 },
    { actors: [hero('walk'), gun()], hold: 1 },
    { actors: [hero('stand'), gun()], texts: [{ text: '?', x: 17, y: -4, color: 'txt' }], hold: 2 },
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
    { actors: [hero('attack'), gun(), ...muzzle('flash1'), at('crate', CRATE.x, CRATE.y), ...hit()], hold: 1 },
    { actors: [hero('attack'), gun(), ...muzzle('flash2'), at('crateHit', CRATE.x, CRATE.y), ...hit(2, 1)], hold: 1 },
    { actors: [hero('attack'), gun(), ...muzzle('flash1'), at('crateBroken', CRATE.x, CRATE.y)], hold: 2 },
    { actors: [hero('stand'), gun()], hold: 1 },
  ),
  shell: loop(
    { actors: [...door(0), ...wallSwitch(false), hero('stand'), gun()], hold: 2 },
    { actors: [...door(0), ...wallSwitch(true), hero('use'), gun()], hold: 1 },
    { actors: [...door(1), ...wallSwitch(true), hero('use'), gun()], hold: 1 },
    { actors: [...door(2), ...wallSwitch(true), hero('stand'), gun()], hold: 1 },
    { actors: [...door(3), ...wallSwitch(true), hero('stand'), gun()], hold: 3 },
    { actors: [...door(1), ...wallSwitch(false), hero('stand'), gun()], hold: 1 },
  ),
  agents: loop(
    // He steps aside, waves two buddies off, and steps back: the loop starts and ends half way to his place.
    { actors: [pad(), hero('walk', ASIDE / 2), gun(ASIDE / 2)], hold: 1 },
    { actors: [pad(), waving(), ...stepping(INDIGO)], hold: 1 },
    { actors: [pad(), waving(), ...onPad(INDIGO)], hold: 2 },
    { actors: [pad(true), waving(), fog(1)], hold: 1 },
    { actors: [pad(), waving(), fog(2)], hold: 1 },
    { actors: [pad(), waving(), ...stepping(BROWN)], hold: 1 },
    { actors: [pad(), waving(), ...onPad(BROWN)], hold: 2 },
    { actors: [pad(true), waving(), fog(1)], hold: 1 },
    { actors: [pad(), waving(), fog(2)], hold: 1 },
    { actors: [pad(), hero('stand', ASIDE / 2), gun(ASIDE / 2)], hold: 1 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop(
    { actors: [dark, LAMP_OFF, hero('sleep', 0, 0, SHADOW)], hold: 4 },
    { actors: [LAMP, hero('stand'), gun()], hold: 1 },
    { actors: [dark, LAMP_OFF, hero('stand', 0, 0, SHADOW)], hold: 1 },
    { actors: [LAMP, hero('stand'), gun()], hold: 1 },
    { actors: [dark, LAMP_OFF, { ...hero('stand', 0, 0, SHADOW), flip: true }], hold: 4 },
  ),
}

const over = (caption: string) => ({ caption })
// A drop behind the helmet, clear of whatever he is working on.
const sweat: Actor[] = [
  { ...at('sweat', -1, -1, { fixed: true }), tiers: SMALL },
  { ...at('sweat', -1, -9, { fixed: true }), tiers: BIG },
]
const bored = { text: '...', x: 17, y: -4, color: 'txt' }
const README = 'Rip and tear... the README.'
const SWITCHES = 'Rip and tear... a light switch.'
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), gun(), at('terminalA', TERMINAL.x, TERMINAL.y), ...sweat], hold: 3, ...over(README) },
    { actors: [hero('stand'), gun(), at('terminalB', TERMINAL.x, TERMINAL.y), ...sweat], hold: 3, ...over(README) },
    { actors: [hero('sleep'), gun(), at('terminalA', TERMINAL.x, TERMINAL.y), ...sweat], texts: [bored], hold: 3, ...over(README) },
  ),
  shell: loop(
    { actors: [...door(0), ...wallSwitch(false), hero('stand'), gun(), ...sweat], hold: 2, ...over(SWITCHES) },
    { actors: [...door(0), ...wallSwitch(true), hero('use'), gun(), ...sweat], hold: 1, ...over(SWITCHES) },
    { actors: [...door(2), ...wallSwitch(true), hero('stand'), gun(), ...sweat], hold: 2, ...over(SWITCHES) },
    { actors: [...door(3), ...wallSwitch(true), hero('sleep'), gun(), ...sweat], texts: [bored], hold: 3, ...over(SWITCHES) },
  ),
}

const tally = (n: number) =>
  ['KILLS  100%', 'ITEMS  100%', 'SECRET 100%'].slice(0, n).map((text, k) => ({ text, x: 20, y: -14 + k * 2, color: 'tally', bg: 'ink' }))

const CYBER_AT = { x: 20, y: -10 }
const cyberFog = (n: 1 | 2): Actor[] => [at(`fog${n}`, CYBER_AT.x + 3, -8, { fixed: true }), at(`fog${n}`, CYBER_AT.x + 3, 2, { fixed: true, flip: true })]
const SOUL = { x: 26, y: 2 }
const HELMET = { x: 25, y: 8 }

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('attack'), gun(), ...muzzle('flash1'), at('imp', IMP_AT.x, IMP_AT.y)], hold: 1 },
    { actors: [hero('attack'), gun(), ...muzzle('flash2'), at('imp', IMP_AT.x, IMP_AT.y, { swap: { i: 'hurtB', I: 'hurtS' } })], hold: 1 },
    { actors: [hero('stand'), gun(), at('impDown', IMP_AT.x - 3, 6)], hold: 2 },
  ),
  // The fireball leaves the imp's raised claw, over the gun, and bursts on his chest; knocked back, he steps up again.
  toolError: once(
    { actors: [hero('stand'), gun(), at('impThrow', IMP_AT.x, IMP_AT.y), at('fireball', IMP_AT.x - 4, -1, { fixed: true })], hold: 1 },
    { actors: [hero('stand'), gun(), at('imp', IMP_AT.x, IMP_AT.y), at('fireball', 17, 1)], hold: 1 },
    { actors: [hero('stand', 0, 0, HURT_WHITE), gun(), at('imp', IMP_AT.x, IMP_AT.y), at('boom', 8, 3)], hold: 1 },
    { actors: [hero('stand', -2, 0, HURT_RED), gun(-2), at('imp', IMP_AT.x, IMP_AT.y)], hold: 1 },
    { actors: [hero('stand', -3, 0, HURT_WHITE), gun(-3), at('imp', IMP_AT.x, IMP_AT.y)], hold: 1 },
    { actors: [hero('stand', -2, 0, HURT_RED), gun(-2), at('imp', IMP_AT.x, IMP_AT.y)], hold: 1 },
    { actors: [hero('walk', -1, 0), gun(-1), at('imp', IMP_AT.x, IMP_AT.y)], hold: 1 },
    { actors: [hero('stand'), gun(), at('imp', IMP_AT.x, IMP_AT.y)], hold: 1 },
  ),
  turnComplete: once(
    { actors: [...wallSwitch(false), hero('stand'), gun()], hold: 1 },
    { actors: [...wallSwitch(true), hero('use'), gun()], hold: 1 },
    { actors: [...wallSwitch(true), hero('itemGet')], texts: tally(1), hold: 2 },
    { actors: [...wallSwitch(true), hero('itemGet')], texts: tally(2), hold: 2 },
    { actors: [...wallSwitch(true), hero('itemGet')], texts: tally(3), hold: 4 },
  ),
  milestone: once({ actors: [hero('stand'), gun()], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [LAMP, hero('stand'), gun()], hold: 2 },
    { actors: [dark, LAMP_OFF, hero('stand', 0, 0, SHADOW)], hold: 1 },
    { actors: [LAMP, hero('stand'), gun()], hold: 1 },
    { actors: [dark, LAMP_OFF, hero('stand', 0, 0, SHADOW)], hold: 2 },
    { actors: [dark, LAMP_OFF, hero('stand', 0, 0, SHADOW)], message: 'cacheCold', hold: 12 },
  ),
  // The Cyberdemon teleports in; the hero gives ground, and takes his place again when it is gone.
  limitWarning: once(
    { actors: [hero('stand'), gun(), ...cyberFog(1)], hold: 1 },
    { actors: [hero('walk', -2, 0), gun(-2), at('cyber', CYBER_AT.x, CYBER_AT.y, { fixed: true }), ...cyberFog(2)], hold: 1 },
    { actors: [hero('stand', -4, 0), gun(-4), at('cyberStep', CYBER_AT.x, CYBER_AT.y, { fixed: true })], hold: 1 },
    { actors: [hero('stand', -4, 0), gun(-4), at('cyber', CYBER_AT.x, CYBER_AT.y, { fixed: true })], message: 'limitWarning', hold: 14 },
    { actors: [hero('walk', -2, 0), gun(-2), ...cyberFog(1)], hold: 1 },
    { actors: [hero('stand'), gun(), ...cyberFog(2)], hold: 1 },
  ),
  // He walks into the soulsphere, glows, and walks back to his place.
  compaction: once(
    { actors: [hero('stand'), gun(), at('soulsphere', SOUL.x, SOUL.y)], hold: 2, caption: 'compaction' },
    { actors: [hero('walk', 4), gun(4), at('soulsphere', SOUL.x, SOUL.y - 1)], hold: 1, caption: 'compaction' },
    { actors: [hero('stand', 8), gun(8), at('soulsphere', SOUL.x, SOUL.y + 1)], hold: 1, caption: 'compaction' },
    {
      actors: [hero('itemGet', 8, 0, GLOW)],
      texts: [{ text: '*', x: 4, y: -8, color: '#78c8ff', lift: true }, { text: '*', x: 30, y: -4, color: '#78c8ff', lift: true }],
      hold: 3,
      caption: 'compaction',
    },
    { actors: [hero('walk', 4), gun(4)], hold: 1, caption: 'compaction' },
    { actors: [hero('stand'), gun()], hold: 1, caption: 'compaction' },
  ),
  // He walks to the new suit's helmet, flashes into it, and walks back.
  modelChange: once(
    { actors: [{ ...at('helmet', HELMET.x, HELMET.y), tier: true }, hero('stand'), gun()], hold: 2 },
    { actors: [{ ...at('helmet', HELMET.x, HELMET.y), tier: true }, hero('walk', 4), gun(4)], hold: 1 },
    { actors: [hero('itemGet', 7, 0, HURT_WHITE)], hold: 1 },
    {
      actors: [hero('itemGet', 7)],
      texts: [{ text: '*', x: 3, y: -8, color: '#f0d040', lift: true }, { text: '*', x: 29, y: -4, color: '#f0d040', lift: true }],
      hold: 4,
      caption: 'modelChange',
    },
    { actors: [hero('walk', 3), gun(3)], hold: 1, caption: 'modelChange' },
    { actors: [hero('stand'), gun()], hold: 1, caption: 'modelChange' },
  ),
  // The new gun held up, its grip in the raised right hand.
  effortChange: once(
    { actors: [hero('itemGet'), weapon(11, -5)], hold: 3 },
    {
      actors: [hero('itemGet'), weapon(11, -5)],
      texts: [{ text: '*', x: 4, y: -8, color: '#f0d040', lift: true }, { text: '*', x: 27, y: -4, color: '#f0d040', lift: true }],
      hold: 5,
      caption: 'effortChange',
    },
  ),
}

// ---------------------------------------------------------------------------
// Actions: the buttons under the scene. You are the player: a fist in a
// hazard-striped cuff reaching down through the ceiling, gripping the marine's
// own gun barrel down to poke with, or shaken bare at the Cyberdemon. Each
// press plays one of the tier's takes, picked at random; the target's patience
// wears down with repeated presses (see `pressAction`).
// ---------------------------------------------------------------------------

/** A reaction: one-shot, every frame held twice as long as written (a line stays about a second at 6 fps). */
const take = (...frames: Frame[]): Animation => once(...frames.map(f => ({ ...f, hold: 2 * Math.max(1, f.hold ?? 1) })))
/** The same caption on every frame from `from` on. */
const captioned = (caption: string, frames: Frame[], from = 2): Frame[] => frames.map((f, k) => (k >= from ? { ...f, caption } : f))
/** A take that is only picked while these are present. */
const needing = (needs: string[], anim: Animation): Animation => ({ ...anim, needs })
/** Actors for the small marines, and others for the Slayers (whose heads are eight pixels higher). */
const perBuild = (small: Actor[], big: Actor[]): Actor[] => [...small.map(a => ({ ...a, tiers: SMALL })), ...big.map(a => ({ ...a, tiers: BIG }))]

// Who is who, for the rests: the marine (his gun, his lines) is `marine`, the imp `imp`, the Cyberdemon `cyber`.
const mine = (actors: Actor[]): Actor[] => actors.map(a => ({ ...a, gone: 'marine' }))
/** The marine with his gun out, `dx` from his place. */
const armed = (pose = 'stand', dx = 0, swap?: Record<string, string>): Actor[] => mine([hero(pose, dx, 0, swap), gun(dx)])
/** The marine turned to look behind him. */
const turned = (): Actor[] => mine([{ ...hero('stand'), flip: true }, gunBack()])
/** The marine's line: beside the Slayer's visor, over the small marine's head (where his thinking dots go). */
const aside = (text: string, y = -4, x = 17): SceneText => ({ text, x, y, color: 'txt', gone: 'marine' })
const sweatAt = (dx: number): Actor[] => mine(sweat.map(a => ({ ...a, x: a.x + dx })))
/**
 * The gun raised in the right hand (as when a new one arrives), and the marine
 * with no gun out: a frame of the latter goes between the gun raised and the
 * gun held level, or the Slayer's would jump (`liftStraddles`).
 */
const raised = (dx = 0): Actor[] => mine([hero('itemGet', dx), weapon(11 + dx, -5)])
const unarmed = (dx = 0): Actor[] => mine([hero('itemGet', dx)])
/** The muzzle flash of the raised gun, for either build. */
const flashUp = (name: 'flash1' | 'flash2', dx = 0): Actor[] => perBuild([at(name, 23 + dx, -5, { fixed: true })], [at(name, 25 + dx, -13, { fixed: true })])
const GLINT = { V: 'v', Y: 'y' }
/** The imp where imps stand, in front of the gun; its line, left of it over the marine's gun; its teleport fog. */
const impAt = (sprite = 'imp', dx = 0, dy = 0, opts: Partial<Actor> = {}): Actor => at(sprite, IMP_AT.x + dx, IMP_AT.y + dy, { fixed: true, gone: 'imp', ...opts })
const IMP_HERE = impAt()
const hiss = (text: string, x = 19, y = 0): SceneText => ({ text, x, y, color: 'txt', gone: 'imp' })
const impFog = (n: 1 | 2): Actor => at(`fog${n}`, IMP_AT.x - 1, IMP_AT.y, { fixed: true, gone: 'imp' })
/** The Cyberdemon where it teleports in; its line, under the fist and over its horns; its fog; the marine backed off from it, and his line in the gap. */
const cyberAt = (sprite = 'cyber', dx = 0, dy = 0): Actor => at(sprite, CYBER_AT.x + dx, CYBER_AT.y + dy, { fixed: true, gone: 'cyber' })
const CYBER_HERE = cyberAt()
const cyberFogOf = (n: 1 | 2): Actor[] => cyberFog(n).map(a => ({ ...a, gone: 'cyber' }))
const roar = (text: string, x = 20, y = -12): SceneText => ({ text, x, y, color: 'txt', gone: 'cyber' })
const backed = (pose = 'stand', dx = 0): Actor[] => armed(pose, -4 + dx)
const nervous = (): Actor[] => [...backed(), ...sweatAt(-4)]
const gulp = (text: string): SceneText => aside(text, -4, 13)

/** The fist (8 by 8) gripping the gun of the current effort, turned barrel down: the barrel's tip is 13 pixels under the fist's top. Scenery: it does not rise with the Slayer. */
const grip = (x: number, y: number, opts: Partial<Actor> = {}): Actor[] => [weapon(x + 1, y + 2, { turn: 'cw', fixed: true, ...opts }), at('fist', x, y, { fixed: true, ...opts })]
/** The bare fist. */
const fist = (x: number, y: number, opts: Partial<Actor> = {}): Actor => at('fist', x, y, { fixed: true, ...opts })
/** The hand scorched (a fireball, a rocket, a muzzle flash), or spat on. */
const SCORCHED = { swap: { S: 'I', s: 'K', u2: 'D' } }
const SLIMED = { swap: { S: 'L', s: 'e' } }

// 1. Poke the marine. The fist comes down through the ceiling onto his helmet:
// in from above, a hover, the poke, then the reaction. It crosses the top of
// the scene on purpose (the Slayer's helmet is eight pixels higher, so a copy
// of the hand per build; the Sentinel gets it in the crown).
const AX = 3
const A_ENTER = -24
const A_HOVER = -16
const A_POKE = -14
const youAbove = (y: number, hand: Partial<Actor> = {}): Actor[] => perBuild(grip(AX, y, { offstage: true, ...hand }), grip(AX, y - 8, { offstage: true, ...hand }))
const fistAbove = (y: number): Actor[] => perBuild([fist(AX, y, { offstage: true })], [fist(AX, y - 8, { offstage: true })])
/** Something at the hovering hand: a fireball arriving, its burst. The Slayer's hand is mostly off the top, so his burst sits lower, on the gun. */
const atHand = (sprite: string, dx = 0, dy = 0): Actor[] => perBuild([at(sprite, AX + dx, A_HOVER + dy, { fixed: true })], [at(sprite, AX + dx, A_HOVER - 4 + dy, { fixed: true })])
const fireAt = (x: number): Actor[] => perBuild([at('fireball', x, A_HOVER + 2, { fixed: true })], [at('fireball', x, A_HOVER, { fixed: true })])
const SPARK = perBuild([at('puff', AX + 2, -3, { fixed: true })], [at('puff', AX + 2, -11, { fixed: true })])
const aScene = (y: number | null, crew: Actor[] = armed(), more: Actor[] = [], hand: Partial<Actor> = {}): Actor[] => [...crew, ...(y === null ? [] : youAbove(y, hand)), ...more]
const aStart = (crew: Actor[] = armed(), more: Actor[] = []): Frame[] => [
  { actors: aScene(A_ENTER, crew, more), hold: 1 },
  { actors: aScene(A_HOVER, crew, more), hold: 1 },
  { actors: aScene(A_POKE, crew, [...SPARK, ...more]), hold: 1 },
]
const TONK: SceneText = { text: 'TONK', x: 10, y: -6, color: 'txt', lift: true }
const EXIT: SceneText = { text: 'EXIT', x: DOOR_AT.x, y: -8, color: 'tally', bg: 'ink' }
/** Teleport fog over the marine standing on the pad. */
const fogAt = (n: 1 | 2): Actor[] => [at(`fog${n}`, 18, 1, { fixed: true }), { ...at(`fog${n}`, 18, -7, { fixed: true }), tiers: BIG }]

const pokeMarine: ThemeAction = {
  id: 'marine',
  label: 'POKE MARINE',
  restLabel: '(MARINE OUT)',
  gone: ['marine'],
  needs: ['marine'],
  reactions: {
    calm: [
      take(
        ...captioned('Poked the marine. He has seen worse.', [
          ...aStart(),
          { actors: aScene(A_HOVER), texts: [aside('?')], hold: 2 },
          { actors: aScene(A_HOVER), texts: [aside('...')], hold: 3 },
          { actors: aScene(null), texts: [aside('...')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The marine ducks. Reflexes of a pro.', [
          { actors: aScene(A_ENTER), hold: 1 },
          { actors: aScene(A_HOVER), hold: 1 },
          { actors: aScene(A_POKE, armed('sleep')), hold: 2 },
          { actors: aScene(A_HOVER, armed('sleep')), texts: [aside('NOPE.')], hold: 3 },
          { actors: aScene(null), hold: 2 },
        ]),
      ),
      take(
        ...captioned('Poked from above. He checks behind him.', [
          ...aStart(),
          { actors: aScene(A_HOVER, turned()), texts: [aside('?')], hold: 2 },
          { actors: aScene(A_POKE, turned(), SPARK), hold: 1 },
          { actors: aScene(A_HOVER, turned()), texts: [aside('HM.')], hold: 2 },
          { actors: aScene(null), hold: 2 },
        ]),
      ),
      take(
        ...captioned('He aims at the ceiling. Nothing there.', [
          ...aStart(),
          { actors: aScene(A_ENTER, unarmed()), hold: 1 },
          { actors: aScene(null, raised()), texts: [aside('...', -4, 25)], hold: 3 },
          { actors: aScene(null, unarmed()), hold: 1 },
          { actors: aScene(null), texts: [aside('HM.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('He grunts. That is the whole review.', [
          ...aStart(),
          { actors: aScene(A_POKE, armed('attack'), SPARK), texts: [aside('HNGH.')], hold: 2 },
          { actors: aScene(A_HOVER, armed('attack')), texts: [aside('HNGH.')], hold: 2 },
          { actors: aScene(null), hold: 2 },
        ]),
      ),
      take(
        ...captioned('Knock knock. Not hollow. Probably.', [
          ...aStart(),
          { actors: aScene(A_HOVER), texts: [TONK], hold: 2 },
          { actors: aScene(A_POKE, armed(), SPARK), texts: [TONK, aside('?')], hold: 2 },
          { actors: aScene(A_HOVER), texts: [aside('STOP THAT.')], hold: 3 },
          { actors: aScene(null), hold: 1 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('The marine fires at the ceiling. Warning shot.', [
          ...aStart(),
          { actors: aScene(A_HOVER, unarmed()), hold: 1 },
          { actors: aScene(A_HOVER, raised(), flashUp('flash1')), hold: 1 },
          { actors: aScene(A_ENTER, raised(), flashUp('flash2')), hold: 1 },
          { actors: aScene(null, raised()), texts: [aside('...', -4, 25)], hold: 2 },
          { actors: aScene(null, unarmed()), hold: 1 },
          { actors: aScene(null), texts: [aside('NEXT TIME.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Missed. The marine sidesteps. Smug.', [
          { actors: aScene(A_ENTER), hold: 1 },
          { actors: aScene(A_HOVER, armed('walk', 6)), hold: 1 },
          { actors: aScene(A_POKE, armed('stand', 6)), hold: 2 },
          { actors: aScene(A_HOVER, armed('stand', 6)), texts: [aside('MISSED.', -4, 23)], hold: 2 },
          { actors: aScene(null, armed('stand', 6)), texts: [aside('SMUG.', -4, 23)], hold: 1 },
          { actors: aScene(null, armed('walk', 3)), hold: 1 },
          { actors: aScene(null), hold: 1 },
        ]),
      ),
      take(
        ...captioned('The marine glares. The visor glints.', [
          ...aStart(),
          { actors: aScene(A_HOVER, armed('stand', 0, GLINT)), texts: [aside('...')], hold: 2 },
          { actors: aScene(A_HOVER), texts: [aside('...')], hold: 1 },
          { actors: aScene(A_HOVER, armed('stand', 0, GLINT)), texts: [aside('...')], hold: 2 },
          { actors: aScene(null, armed('stand', 0, GLINT)), hold: 2 },
        ]),
      ),
      take(
        ...captioned('The marine mutters. Something about tearing.', [
          ...aStart(),
          { actors: aScene(A_HOVER), texts: [aside('RIP.')], hold: 2 },
          { actors: aScene(A_HOVER), texts: [aside('AND TEAR.')], hold: 3 },
          { actors: aScene(null), texts: [aside('...')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The marine flinches. Health: 100%. Rude.', [
          ...aStart(),
          { actors: aScene(A_POKE, armed('stand', 0, HURT_WHITE), SPARK), hold: 1 },
          { actors: aScene(A_HOVER, armed('stand', -1, HURT_RED)), hold: 1 },
          { actors: aScene(A_HOVER), texts: [aside('HEALTH 100%.')], hold: 3 },
          { actors: aScene(null), texts: [aside('RUDE.')], hold: 2 },
        ]),
      ),
    ],
    fedUp: [
      take(
        ...captioned('That was not a warning shot. The hand flees.', [
          ...aStart(),
          { actors: aScene(A_HOVER, unarmed()), hold: 1 },
          { actors: aScene(A_HOVER, raised(), flashUp('flash1')), hold: 1 },
          { actors: aScene(A_HOVER, raised(), flashUp('flash2'), SCORCHED), hold: 1 },
          { actors: aScene(A_ENTER, raised(), flashUp('flash1'), SCORCHED), hold: 1 },
          { actors: aScene(null, raised()), texts: [aside('...', -4, 25)], hold: 1 },
          { actors: aScene(null, unarmed()), hold: 1 },
          { actors: aScene(null), texts: [aside('NEXT.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The marine takes your gun. Finders keepers.', [
          ...aStart(),
          { actors: aScene(A_HOVER, unarmed()), hold: 1 },
          { actors: [...raised(), ...fistAbove(A_HOVER)], texts: [aside('MINE NOW.', -4, 25)], hold: 2 },
          { actors: [...raised(), ...fistAbove(A_ENTER)], texts: [aside('MINE NOW.', -4, 25)], hold: 2 },
          { actors: unarmed(), hold: 1 },
          { actors: armed(), texts: [aside('THANKS.')], hold: 2 },
        ]),
      ),
      needing(
        ['imp'],
        take(
          ...captioned('The marine sics the imp on the hand. Teamwork.', [
            ...aStart(armed(), [IMP_HERE]),
            { actors: aScene(A_HOVER, armed(), [IMP_HERE]), texts: [aside('GET HIM.')], hold: 2 },
            { actors: aScene(A_HOVER, armed(), [impAt('impThrow'), ...fireAt(24)]), hold: 1 },
            { actors: aScene(A_HOVER, armed(), [impAt('impThrow'), ...fireAt(13)]), hold: 1 },
            { actors: aScene(A_HOVER, armed(), [IMP_HERE, ...atHand('boom')], SCORCHED), hold: 1 },
            { actors: aScene(A_ENTER, armed(), [IMP_HERE], SCORCHED), texts: [aside('GOOD IMP.')], hold: 2 },
            { actors: aScene(null, armed(), [IMP_HERE]), texts: [hiss('HSS.')], hold: 2 },
          ]),
        ),
      ),
    ],
    snapped: [
      // The door is drawn after him: he walks into the dark of the doorway.
      take(
        ...captioned('The marine takes the exit. Level over.', [
          ...aStart(),
          { actors: aScene(A_HOVER), texts: [aside('NOPE.')], hold: 2 },
          { actors: [...armed('use'), ...door(0)], texts: [aside('BYE.')], hold: 2 },
          { actors: [...armed(), ...door(1)], hold: 1 },
          { actors: [...armed('walk', 8), ...door(2)], hold: 1 },
          { actors: [...perBuild(armed('walk', 16), armed('walk', 13)), ...door(3)], texts: [EXIT], hold: 1 },
          { actors: [...perBuild(mine([hero('walk', 21)]), mine([hero('walk', 18)])), ...door(3)], texts: [EXIT], hold: 1 },
          { actors: door(3), texts: [EXIT], hold: 1 },
          { actors: door(2), texts: [EXIT], hold: 1 },
          { actors: door(0), texts: [EXIT], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The marine teleports out. Single player.', [
          ...aStart(),
          { actors: aScene(A_HOVER), texts: [aside('DONE.')], hold: 2 },
          { actors: [pad(), ...armed('walk', 8)], hold: 1 },
          { actors: [pad(), ...armed('stand', 16)], hold: 1 },
          { actors: [pad(true), ...fogAt(1)], hold: 1 },
          { actors: [pad(), ...fogAt(2)], hold: 1 },
          { actors: [pad()], hold: 3 },
        ]),
      ),
    ],
  },
  // The marine's rest: an empty room, until the imp comes to see where he went.
  rest: loop(
    { actors: [], hold: 8 },
    { actors: [IMP_HERE], hold: 6 },
    { actors: [IMP_HERE], texts: [hiss('?')], hold: 6 },
    { actors: [impAt('imp', 0, 0, { flip: true })], hold: 4 },
    { actors: [IMP_HERE], texts: [hiss('...')], hold: 6 },
    { actors: [], hold: 8 },
  ),
}

// 2. Poke the imp. It stands where the imps always stand, in front of the
// marine's gun; the hand is scenery here (the imp is the same height for everyone).
const IX = 28
const I_ENTER = -24
const I_HOVER = -15
const I_POKE = -12
const youAtImp = (y: number, hand: Partial<Actor> = {}): Actor[] => grip(IX, y, y <= I_ENTER ? { offstage: true, ...hand } : hand)
const I_SPARK = at('puff', IX + 2, 0, { fixed: true })
/** A fireball thrown straight up at the hand, `dy` from the hero's top (the imp's claw is at 0); its burst on the fist. */
const fireUp = (dy: number): Actor => at('fireball', IX + 2, dy, { turn: 'cw', fixed: true })
const I_BOOM = at('boom', IX, I_HOVER - 1, { fixed: true })
const spit = (dy: number): Actor => at('puff', IX + 3, dy, { fixed: true, swap: { F: 'L', O: 'E' } })
/** The imp peeking out from behind the marine (drawn before him). */
const HIDING = impAt('imp', -35)
const iScene = (y: number | null, imp: Actor[] = [IMP_HERE], more: Actor[] = [], crew: Actor[] = armed(), hand: Partial<Actor> = {}): Actor[] => [
  ...crew,
  ...imp,
  ...(y === null ? [] : youAtImp(y, hand)),
  ...more,
]
const iStart = (): Frame[] => [
  { actors: iScene(I_ENTER), hold: 1 },
  { actors: iScene(I_HOVER), hold: 1 },
  { actors: iScene(I_POKE, [IMP_HERE], [I_SPARK]), hold: 1 },
]
/** The imp throws at the hand: the arm goes up, the fireball climbs, the fist burns. */
const impThrows = (hand: Partial<Actor> = {}): Frame[] => [
  { actors: iScene(I_HOVER, [impAt('impThrow')], [fireUp(-4)], armed(), hand), hold: 1 },
  { actors: iScene(I_HOVER, [impAt('impThrow')], [fireUp(-11)], armed(), hand), hold: 1 },
  { actors: iScene(I_HOVER, [IMP_HERE], [I_BOOM], armed(), SCORCHED), hold: 1 },
]

const pokeImp: ThemeAction = {
  id: 'imp',
  label: 'POKE IMP',
  restLabel: '(IMP GONE)',
  gone: ['imp'],
  needs: ['imp'],
  reactions: {
    calm: [
      take(
        ...captioned('Poked the imp. It hisses. Standard imp.', [
          ...iStart(),
          { actors: iScene(I_POKE, [IMP_HERE], [I_SPARK]), texts: [hiss('HSSSS')], hold: 2 },
          { actors: iScene(I_HOVER), texts: [hiss('HSSSS')], hold: 2 },
          { actors: iScene(null), texts: [hiss('HSS.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The imp looks up. It has questions.', [
          ...iStart(),
          { actors: iScene(I_HOVER), texts: [hiss('?')], hold: 2 },
          { actors: iScene(I_HOVER), texts: [hiss('??')], hold: 3 },
          { actors: iScene(null, [impAt('imp', 0, 0, { flip: true })]), texts: [hiss('?')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The imp purrs. Imps do not purr. Noted.', [
          ...iStart(),
          { actors: iScene(I_POKE, [IMP_HERE], [I_SPARK]), texts: [hiss('prrr')], hold: 2 },
          { actors: iScene(I_POKE), texts: [hiss('prrrrr')], hold: 2 },
          { actors: iScene(I_HOVER, [IMP_HERE], [], [...armed(), ...sweatAt(0)]), texts: [hiss('prrr'), aside('?')], hold: 2 },
          { actors: iScene(null, [IMP_HERE], [], [...armed(), ...sweatAt(0)]), texts: [hiss('...')], hold: 1 },
        ]),
      ),
      take(
        ...captioned('Poked the imp. It files a complaint with Hell.', [
          ...iStart(),
          { actors: iScene(I_HOVER), texts: [hiss('FORM 666.')], hold: 3 },
          { actors: iScene(I_HOVER), texts: [hiss('IN BLOOD.')], hold: 3 },
          { actors: iScene(null), texts: [hiss('...')], hold: 1 },
        ]),
      ),
      take(
        ...captioned('The imp sidesteps. It knows this game.', [
          { actors: iScene(I_ENTER), hold: 1 },
          { actors: iScene(I_HOVER, [impAt('imp', 3)]), hold: 1 },
          { actors: iScene(I_POKE, [impAt('imp', 3)]), hold: 2 },
          { actors: iScene(I_HOVER, [impAt('imp', 3)]), texts: [hiss('HSS HSS.')], hold: 3 },
          { actors: iScene(null, [impAt('imp', 3)]), hold: 1 },
          { actors: iScene(null), hold: 1 },
        ]),
      ),
      needing(
        ['marine'],
        take(
          ...captioned('The imp and the marine share a look.', [
            ...iStart(),
            { actors: iScene(I_HOVER), texts: [hiss('...'), aside('...')], hold: 3 },
            { actors: iScene(I_HOVER), texts: [hiss('HSS.'), aside('YEAH.')], hold: 2 },
            { actors: iScene(null), hold: 2 },
          ]),
        ),
      ),
    ],
    irritated: [
      take(
        ...captioned('The imp throws a fireball. At the hand.', [
          ...iStart(),
          ...impThrows(),
          { actors: iScene(I_ENTER, [IMP_HERE], [], armed(), SCORCHED), texts: [hiss('HSS!')], hold: 2 },
          { actors: iScene(null), texts: [hiss('HA.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The imp scratches. Claws, as advertised.', [
          ...iStart(),
          { actors: iScene(I_POKE, [impAt('impThrow')], [at('flash1', IX + 1, -3, { fixed: true })]), texts: [hiss('SKRITCH')], hold: 2 },
          { actors: iScene(I_HOVER, [impAt('impThrow')], [at('flash2', IX + 1, -6, { fixed: true })]), texts: [hiss('SKRITCH')], hold: 1 },
          { actors: iScene(I_HOVER), texts: [hiss('HSS.')], hold: 2 },
          { actors: iScene(null), hold: 2 },
        ]),
      ),
      take(
        ...captioned('The imp hisses louder. The marine backs up.', [
          ...iStart(),
          { actors: iScene(I_HOVER, [IMP_HERE], [], armed('walk', -2)), texts: [hiss('HSSSSSS!')], hold: 2 },
          { actors: iScene(I_HOVER, [IMP_HERE], [], [...armed('stand', -4), ...sweatAt(-4)]), texts: [hiss('HSSSSSS!')], hold: 2 },
          { actors: iScene(null, [IMP_HERE], [], [...armed('stand', -4), ...sweatAt(-4)]), texts: [hiss('HSS.')], hold: 2 },
          { actors: iScene(null, [IMP_HERE], [], armed('walk', -2)), hold: 1 },
          { actors: iScene(null), hold: 1 },
        ]),
      ),
      needing(
        ['marine'],
        take(
          ...captioned('The imp appeals to the marine. He shrugs.', [
            ...iStart(),
            { actors: iScene(I_HOVER), texts: [hiss('HSS?')], hold: 2 },
            { actors: iScene(I_HOVER, [IMP_HERE], [], unarmed()), texts: [aside('NOT MY IMP.')], hold: 3 },
            { actors: iScene(null), texts: [hiss('...')], hold: 2 },
          ]),
        ),
      ),
      take(
        ...captioned('The imp spits. Hell etiquette.', [
          ...iStart(),
          { actors: iScene(I_HOVER, [IMP_HERE], [spit(-5)]), hold: 1 },
          { actors: iScene(I_HOVER, [IMP_HERE], [spit(-9)]), hold: 1 },
          { actors: iScene(I_HOVER, [IMP_HERE], [], armed(), SLIMED), texts: [hiss('PTOO.')], hold: 2 },
          { actors: iScene(I_ENTER, [IMP_HERE], [], armed(), SLIMED), hold: 1 },
          { actors: iScene(null), texts: [hiss('HSS HSS.')], hold: 2 },
        ]),
      ),
    ],
    fedUp: [
      take(
        ...captioned('The imp fireballs the hand. Twice. Direct hit.', [
          ...iStart(),
          ...impThrows(),
          ...impThrows(SCORCHED).slice(0, 2),
          { actors: iScene(I_ENTER, [IMP_HERE], [I_BOOM], armed(), SCORCHED), hold: 1 },
          { actors: iScene(null), texts: [hiss('GRAAAH.')], hold: 3 },
        ]),
      ),
      needing(
        ['marine'],
        take(
          ...captioned('The imp hides behind the marine. Great.', [
            ...iStart(),
            { actors: [HIDING, ...armed(), ...youAtImp(I_HOVER)], texts: [hiss('HSS.', -8), aside('REALLY.')], hold: 2 },
            { actors: [HIDING, ...armed(), ...youAtImp(I_HOVER)], texts: [aside('GET OFF.')], hold: 2 },
            { actors: [HIDING, ...armed(), ...youAtImp(I_ENTER)], hold: 1 },
            { actors: [HIDING, ...armed()], texts: [aside('...')], hold: 2 },
            { actors: iScene(null), texts: [hiss('HSS.')], hold: 1 },
          ]),
        ),
      ),
      needing(
        ['cyber'],
        take(
          ...captioned('The imp calls the Cyberdemon. Overkill.', [
            ...iStart(),
            { actors: iScene(I_HOVER), texts: [hiss('GRAAAH!')], hold: 2 },
            { actors: iScene(I_HOVER, [IMP_HERE], cyberFogOf(1), armed('walk', -2)), hold: 1 },
            { actors: iScene(I_ENTER, [IMP_HERE, CYBER_HERE], cyberFogOf(2), backed()), hold: 1 },
            { actors: iScene(null, [IMP_HERE, CYBER_HERE], [], nervous()), texts: [roar('...')], hold: 2 },
            { actors: iScene(null, [IMP_HERE, CYBER_HERE], [], nervous()), texts: [roar('WHO.')], hold: 2 },
            { actors: iScene(null, [IMP_HERE], cyberFogOf(2), armed('walk', -2)), hold: 1 },
            { actors: iScene(null), texts: [hiss('HSS HSS.')], hold: 2 },
          ]),
        ),
      ),
    ],
    snapped: [
      take(
        ...captioned('The imp has left. Through the floor, somehow.', [
          ...iStart(),
          { actors: iScene(I_HOVER), texts: [hiss('ENOUGH.')], hold: 2 },
          { actors: iScene(I_HOVER), texts: [hiss('BYE.')], hold: 1 },
          { actors: iScene(null, [impFog(1)]), hold: 1 },
          { actors: iScene(null, [impFog(2)]), hold: 1 },
          { actors: iScene(null, []), texts: [aside('?')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('One last fireball. Then the imp walks off.', [
          ...iStart(),
          ...impThrows(),
          { actors: iScene(I_ENTER, [IMP_HERE], [], armed(), SCORCHED), texts: [hiss('HSS.')], hold: 1 },
          { actors: iScene(null, [impAt('imp', 4, 0, { offstage: true })]), hold: 1 },
          { actors: iScene(null, [impAt('imp', 9, 0, { offstage: true })]), hold: 1 },
          { actors: iScene(null, []), texts: [aside('...')], hold: 3 },
        ]),
      ),
    ],
  },
  // The imp's rest: the marine keeps an eye on the spot. And on the other spot.
  rest: loop(
    { actors: armed(), hold: 8 },
    { actors: armed(), texts: [aside('...')], hold: 6 },
    { actors: turned(), hold: 6 },
    { actors: armed(), texts: [aside('?')], hold: 6 },
  ),
}

// 3. Taunt the Cyberdemon. The bare fist shakes at it from the ceiling; it
// stands where it teleports in for a par time, the marine backed off from it.
const TX = 22
const T_Y = -20
const AIM = cyberAt('cyberAim')
const shake = (shift: 0 | 2, hand: Partial<Actor> = {}): Actor => fist(TX + shift, T_Y, hand)
/** A rocket out of the raised cannon, `dy` from the hero's top; the burst at the fist. */
const rocket = (dy: number): Actor => at('rocket', 20, dy, { fixed: true })
const T_BOOM = at('boom', TX - 2, T_Y, { fixed: true })
const steam = (x: number, y: number): Actor => at('puff', x, y, { fixed: true, swap: { F: 'M', O: 'O' } })
const rubble = (x: number, y: number): Actor => at('puff', x, y, { fixed: true, swap: { F: 'm', O: 'M' } })
const tScene = (shift: 0 | 2 | null, cyber: Actor[] = [CYBER_HERE], more: Actor[] = [], crew: Actor[] = backed(), hand: Partial<Actor> = {}): Actor[] => [
  ...crew,
  ...cyber,
  ...(shift === null ? [] : [shake(shift, hand)]),
  ...more,
]
const tStart = (): Frame[] => [
  { actors: tScene(0), hold: 1 },
  { actors: tScene(2), hold: 1 },
  { actors: tScene(0), hold: 1 },
  { actors: tScene(2), hold: 1 },
]
/** The cannon comes up, a rocket goes up, the fist burns. */
const firesUp = (hand: Partial<Actor> = {}): Frame[] => [
  { actors: tScene(0, [AIM], [], backed(), hand), hold: 1 },
  { actors: tScene(0, [AIM], [rocket(-12)], backed(), hand), hold: 1 },
  { actors: tScene(0, [AIM], [T_BOOM], backed(), SCORCHED), hold: 1 },
]

const tauntCyber: ThemeAction = {
  id: 'cyber',
  label: 'TAUNT BOSS',
  restLabel: '(BOSS GONE)',
  gone: ['cyber'],
  needs: ['cyber'],
  reactions: {
    calm: [
      take(
        ...captioned('Taunted the Cyberdemon. It did not notice.', [
          ...tStart(),
          { actors: tScene(0), texts: [roar('...')], hold: 3 },
          { actors: tScene(2), texts: [gulp('...')], hold: 2 },
          { actors: tScene(null), hold: 2 },
        ], 4),
      ),
      take(
        ...captioned('The Cyberdemon looks down. Way down.', [
          ...tStart(),
          { actors: tScene(0), texts: [roar('?')], hold: 2 },
          { actors: tScene(2, [CYBER_HERE], [], nervous()), texts: [roar('HM.')], hold: 3 },
          { actors: tScene(null, [CYBER_HERE], [], nervous()), hold: 2 },
        ], 4),
      ),
      take(
        ...captioned('The Cyberdemon snorts. Steam, probably.', [
          ...tStart(),
          { actors: tScene(0, [CYBER_HERE], [steam(23, -4), steam(31, -4)]), hold: 1 },
          { actors: tScene(2, [CYBER_HERE], [steam(21, -6), steam(33, -6)]), hold: 1 },
          { actors: tScene(0), texts: [roar('HMPH.')], hold: 3 },
          { actors: tScene(null), hold: 2 },
        ], 4),
      ),
      take(
        ...captioned('Taunted. The Cyberdemon takes a step. One.', [
          ...tStart(),
          { actors: tScene(0, [cyberAt('cyberStep')]), texts: [roar('THUD.')], hold: 1 },
          { actors: tScene(2), texts: [roar('THUD.')], hold: 1 },
          { actors: tScene(0, [CYBER_HERE], [], nervous()), texts: [gulp('UH.')], hold: 3 },
          { actors: tScene(null, [CYBER_HERE], [], nervous()), hold: 2 },
        ], 4),
      ),
      take(
        ...captioned('The Cyberdemon counts to ten. Slowly.', [
          ...tStart(),
          { actors: tScene(0), texts: [roar('ONE.')], hold: 2 },
          { actors: tScene(2), texts: [roar('TWO.')], hold: 2 },
          { actors: tScene(0), texts: [roar('THREE.')], hold: 2 },
          { actors: tScene(null), texts: [roar('...')], hold: 2 },
        ], 4),
      ),
      take(
        ...captioned('The Cyberdemon is not paid enough for this.', [
          ...tStart(),
          { actors: tScene(0), texts: [roar('...')], hold: 2 },
          { actors: tScene(2, [CYBER_HERE], [steam(23, -4), steam(31, -4)]), texts: [roar('SIGH.')], hold: 3 },
          { actors: tScene(null), texts: [gulp('SAME.')], hold: 2 },
        ], 4),
      ),
    ],
    irritated: [
      take(
        ...captioned('The Cyberdemon roars. The marine steps back.', [
          ...tStart(),
          { actors: tScene(0, [CYBER_HERE], [], backed('walk', -1)), texts: [roar('RAAAGH!')], hold: 2 },
          { actors: tScene(2, [CYBER_HERE], [], [...backed('stand', -1), ...sweatAt(-5)]), texts: [roar('RAAAGH!')], hold: 2 },
          { actors: tScene(null, [CYBER_HERE], [], [...backed('stand', -1), ...sweatAt(-5)]), texts: [gulp('...')], hold: 2 },
          { actors: tScene(null), hold: 1 },
        ], 4),
      ),
      take(
        ...captioned('A rocket. At the ceiling. The hand retreats.', [
          ...tStart(),
          ...firesUp(),
          { actors: tScene(null, [AIM]), texts: [roar('NEXT.')], hold: 2 },
          { actors: tScene(null), texts: [gulp('...')], hold: 2 },
        ], 4),
      ),
      take(
        ...captioned('The Cyberdemon stomps. Everything jumps.', [
          ...tStart(),
          { actors: tScene(0, [cyberAt('cyberStep', 0, -1)]), hold: 1 },
          { actors: tScene(2, [CYBER_HERE], [], mine([hero('walk', -4), gun(-4, -1)])), texts: [roar('THUD.')], hold: 1 },
          { actors: tScene(0), texts: [roar('THUD.')], hold: 1 },
          { actors: tScene(null, [CYBER_HERE], [], nervous()), texts: [gulp('!')], hold: 3 },
        ], 4),
      ),
      take(
        ...captioned('The Cyberdemon points. At you. Specifically.', [
          ...tStart(),
          { actors: tScene(0, [AIM]), hold: 1 },
          { actors: tScene(2, [AIM]), texts: [roar('YOU.')], hold: 3 },
          { actors: tScene(null, [AIM]), texts: [roar('YOU.')], hold: 1 },
          { actors: tScene(null), texts: [gulp('...')], hold: 2 },
        ], 4),
      ),
    ],
    fedUp: [
      take(
        ...captioned('Rockets. Plural. The hand is leaving.', [
          ...tStart(),
          ...firesUp(),
          { actors: tScene(0, [AIM], [rocket(-12)], backed(), SCORCHED), hold: 1 },
          { actors: tScene(null, [AIM], [T_BOOM]), hold: 1 },
          { actors: tScene(null, [AIM]), texts: [roar('BEGONE.')], hold: 3 },
          { actors: tScene(null), hold: 1 },
        ], 4),
      ),
      take(
        ...captioned('Stomp. The ceiling comes down on the hand.', [
          ...tStart(),
          { actors: tScene(0, [cyberAt('cyberStep', 0, -1)]), texts: [roar('THUD.')], hold: 1 },
          { actors: tScene(2, [CYBER_HERE], [rubble(19, -17), rubble(31, -15), rubble(25, -14)]), hold: 1 },
          { actors: tScene(null, [CYBER_HERE], [rubble(19, -12), rubble(31, -11), rubble(25, -10)]), hold: 1 },
          { actors: tScene(null), texts: [roar('HA.')], hold: 2 },
          { actors: tScene(null, [CYBER_HERE], [], nervous()), texts: [gulp('...')], hold: 2 },
        ], 4),
      ),
      needing(
        ['marine'],
        take(
          ...captioned('Ceasefire. Everyone fires at the ceiling.', [
            ...tStart(),
            { actors: tScene(0, [AIM], [], unarmed(-6)), hold: 1 },
            { actors: tScene(0, [AIM], [...flashUp('flash1', -6), rocket(-12)], raised(-6)), hold: 1 },
            { actors: tScene(0, [AIM], [...flashUp('flash2', -6), T_BOOM], raised(-6), SCORCHED), hold: 1 },
            { actors: tScene(null, [AIM], [], raised(-6)), texts: [roar('TRUCE.')], hold: 2 },
            { actors: tScene(null, [CYBER_HERE], [], unarmed(-6)), hold: 1 },
            { actors: tScene(null), texts: [gulp('TRUCE.')], hold: 2 },
          ], 4),
        ),
      ),
    ],
    snapped: [
      take(
        ...captioned('The Cyberdemon leaves. Rocket first, then fog.', [
          ...tStart(),
          ...firesUp(),
          { actors: tScene(null, [AIM]), texts: [roar('ENOUGH.')], hold: 2 },
          { actors: tScene(null, [CYBER_HERE], cyberFogOf(1)), hold: 1 },
          { actors: tScene(null, [], cyberFogOf(2), backed('walk', 2)), hold: 1 },
          { actors: tScene(null, [], [], armed()), texts: [aside('...')], hold: 3 },
        ], 4),
      ),
      take(
        ...captioned('The Cyberdemon has had enough. Fog. Gone.', [
          ...tStart(),
          { actors: tScene(0), texts: [roar('NO.')], hold: 2 },
          { actors: tScene(2), texts: [roar('JUST NO.')], hold: 2 },
          { actors: tScene(null, [CYBER_HERE], cyberFogOf(1)), hold: 1 },
          { actors: tScene(null, [], cyberFogOf(2), backed('walk', 2)), hold: 1 },
          { actors: tScene(null, [], [], armed()), texts: [aside('PHEW.')], hold: 3 },
        ], 4),
      ),
    ],
  },
  // The Cyberdemon's rest: the marine watches the spot. Was that fog?
  rest: loop(
    { actors: armed(), hold: 8 },
    { actors: [...armed(), ...cyberFog(2)], texts: [aside('!')], hold: 3 },
    { actors: armed(), hold: 6 },
    { actors: [...armed(), ...sweatAt(0)], texts: [aside('...')], hold: 6 },
  ),
}

const actions: ThemeAction[] = [pokeMarine, pokeImp, tauntCyber]

const SLAYER_POSES = { stand: 'slayerStand', walk: 'slayerWalk', attack: 'slayerAttack', itemGet: 'slayerItemGet', sleep: 'slayerSleep', use: 'slayerUse' }
const SENTINEL_POSES = { stand: 'sentinelStand', walk: 'sentinelWalk', attack: 'sentinelAttack', itemGet: 'sentinelItemGet', sleep: 'sentinelSleep', use: 'sentinelUse' }
// A gun held up rests on the raised fist, which is at one height for both: the crown adds nothing to it.
const ALOFT = { x: 2, y: 0 }
const SENTINEL = { A: 'sentP', a: 'sentp', P: 'sentP', p: 'sentp', Y: 'sentY', y: 'senty', M: 'sentM', m: 'sentm' }

export const doom: Theme = {
  id: 'doom',
  name: 'Knee-Deep in the Context',
  description: '1993 demon-shooter homage: the marine\'s face bloodies as context fills, one gun per effort, four episodes deep',
  version: '1.1.0',
  palette: {
    dark: { accent: '#5cc84c', gold: '#f0c040', red: '#ff4030', label: '#e07838', dim: '#8c8c8c', text: '#e8e8e8' },
    light: { accent: '#2c7c1c', gold: '#856000', red: '#b81c10', label: '#a84c10', dim: '#6c6c6c', text: '#1c1c1c' },
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
    Cost: 'Ammo Spent',
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
  actions,
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
      // Past the action (columns 0..45), from the right edge in: one piece at 58 columns, a second at 80, a third at 96.
      decor: [
        // E1: the tech base
        { sprite: 'barrel', x: -1, y: 26, maxPercent: 30, minColumns: 56 },
        { sprite: 'uacPanel', x: -14, y: 10, maxPercent: 30, minColumns: 78 },
        { sprite: 'crate', x: -32, y: 24, maxPercent: 30, minColumns: 94 },
        { sprite: 'crate', x: -34, y: 12, maxPercent: 30, minColumns: 94 },
        // E2: the Shores of Hell
        { sprite: 'shoresFloor', x: 0, y: 36, minPercent: 30, maxPercent: 50 },
        { sprite: 'firestick', x: -3, y: 18, minPercent: 30, maxPercent: 50, minColumns: 56 },
        { sprite: 'barrel', x: -17, y: 26, minPercent: 30, maxPercent: 50, minColumns: 78 },
        { sprite: 'uacPanel', x: -30, y: 10, minPercent: 30, maxPercent: 50, minColumns: 94 },
        // E3: Inferno
        { sprite: 'hellCeiling', x: 0, y: 0, sky: true, minPercent: 50 },
        { sprite: 'lavaFloor', x: 0, y: 36, minPercent: 50, maxPercent: 75 },
        { sprite: 'firestick', x: -3, y: 18, minPercent: 50, maxPercent: 75, minColumns: 56 },
        { sprite: 'firestick', x: -19, y: 18, minPercent: 50, maxPercent: 75, minColumns: 78 },
        { sprite: 'skullPillar', x: -36, y: 20, minPercent: 50, maxPercent: 75, minColumns: 94 },
        // E4: Thy Flesh Consumed
        { sprite: 'fleshFloor', x: 0, y: 36, minPercent: 75 },
        { sprite: 'skullPillar', x: -1, y: 20, minPercent: 75, minColumns: 56 },
        { sprite: 'firestick', x: -19, y: 18, minPercent: 75, minColumns: 78 },
        { sprite: 'skullPillar', x: -36, y: 20, minPercent: 75, minColumns: 94 },
      ],
      particles: [
        { colors: ['#8c948c', '#a8b0a8'], count: 6, drift: 'down', speed: 0.3, maxPercent: 30 },
        { colors: ['#60e040', '#a0ff70'], count: 5, drift: 'up', speed: 0.5, minPercent: 30, maxPercent: 50 },
        { colors: ['#ff8020', '#ffc040', '#e03010'], count: 12, drift: 'up', speed: 1, minPercent: 50 },
        { colors: ['#ff4010', '#c01008', '#ffa040'], count: 14, drift: 'up', speed: 1.5, minPercent: 75 },
      ],
    },
    hero: { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'sleep', use: 'use' },
    heroTiers: {
      tier1: {},
      tier2: { A: 'megaA', a: 'megaa' },
      tier3: { A: 'P', a: 'p' },
      tier4: SENTINEL,
      unknown: { A: 'zomA', a: 'zoma', S: 'zomS', V: 'zomV', v: 'zomv' },
    },
    heroForms: {
      tier3: { poses: SLAYER_POSES, dx: -3, dy: -8, lift: 8, hand: HAND, aloft: ALOFT },
      tier4: { poses: SENTINEL_POSES, dx: -3, dy: -10, lift: 8, hand: HAND, aloft: ALOFT },
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
      // Fixed widths (`chars`), so the layout does not change as numbers grow: two rows up to 59 columns (the old bar over SUIT, PAR and the map), one from 60, the map on it from 79.
      widgets: [
        { kind: 'counter', value: 'spend', label: 'SPENT', digits: 3, chars: 5 },
        { kind: 'counter', value: 'contextLeft', label: 'HEALTH', format: '{v}%' },
        {
          kind: 'box',
          shows: 'effort',
          sprite: 'miniShotgun',
          sprites: { low: 'miniPistol', medium: 'miniShotgun', high: 'miniSuper', xhigh: 'miniPlasma', max: 'miniBfg' },
          label: 'ARMS',
          x: 1,
          y: 5,
          drop: 1,
        },
        { kind: 'meter', value: 'contextLeft', count: 1, perRow: 1, sprites: ['face0', 'face1', 'face2', 'face3', 'face4', 'face4'] },
        { kind: 'counter', value: 'cache', label: 'ARMOR', format: '{v}%' },
        { kind: 'box', shows: 'model', sprite: 'marineIcon', sprites: { tier3: 'helmIcon', tier4: 'helmIcon' }, label: 'SUIT', x: 1, y: 5, drop: 2, wrap: true },
        { kind: 'counter', value: 'limitMax', label: 'PAR', format: '{v}%', chars: 4, drop: 3 },
        { kind: 'map', drop: 4 },
      ],
      colors: { bg: 'barBg', box: 'barBox', text: 'barRed', label: 'barLabel', map: 'mapBg', mapDot: 'mapDot' },
    },
    lineup: { ground: 'lineupBg', ink: '#101010', dim: '#3c3c3c', mark: '#900000' },
    message: { bg: 'ink', ink: 'barRed' },
  },
  text: {
    idle: 'The marine scans the room. Too quiet.',
    thinking: 'The marine weighs his next move...',
    reading: 'The marine reads the computer map.',
    editing: 'The marine shoots crates to splinters.',
    shell: 'The marine hits a switch; a door rises.',
    agents: 'Co-op marines teleport out on their own.',
    toolSuccess: 'An imp goes down!',
    toolError: 'An imp fireball hits! Ouch.',
    turnComplete: 'Level complete: Kills 100%.',
    milestone: 'Deeper into the episode.',
    cacheCold: 'The lights go out: a dark sector.',
    limitWarning: 'The Cyberdemon teleports in.',
    compaction: 'Supercharge! A soulsphere.',
    modelChange: 'Picked up a new suit!',
    effortChange: 'You got a new weapon!',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: 'E1: KNEE-DEEP IN THE CONTEXT. {pct}% USED. THE BASE IS QUIET. KEEP MOVING.' },
    { level: 'warn', message: 'E2: THE SHORES OF HELL. {pct}% USED. MIND YOUR HEALTH.' },
    { level: 'orange', message: 'E2: THE SHORES OF HELL. {pct}% USED. FIND THE EXIT SWITCH SOON.' },
    { level: 'alert', message: 'E3: INFERNO. {pct}% USED. THIS IS NO PLACE TO LINGER. FINISH THE LEVEL.' },
    { level: 'critical', message: 'E4: THY FLESH CONSUMED. {pct}% USED. SAVE YOUR PROGRESS AND /clear.' },
  ],
  messages: {
    cacheCold: 'THE LIGHTS ARE OUT. THIS SECTOR IS DARK: YOUR CACHE IS COLD.',
    limitWarning: 'A CYBERDEMON! PAR TIME {name} AT {pct}%.',
    compaction: 'Supercharge! Context compacted.',
    modelChange: 'Suit up: {name}!',
    effortChange: 'You got the {weapon}!',
  },
}
