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
