// "Symphony of the Tokens": a gothic vampire-hunter homage. Every sprite is drawn fresh for this theme in that 16-bit castle style.
//
// The model is the hunter (a young hunter, the whip hunter, the dhampir lord for
// Opus, the lord of the night above him, a thief for anything else), effort is
// the whip, context is the PLAYER bar and the descent through the castle (the
// gate, the clock tower, the throne room) as the moon turns to blood, the cache
// is the candlelight, cents are hearts, and rate limits are the ENEMY bar,
// which fills as the highest limit is used.
//
// The hunters share one 16x16 build recolored per tier; the lord is a 24x26
// form of his own. Props and scenery name their colors through a `legend`.
//
// Layout: the action is columns 0..45 at every width. The ring and its price
// tag own the top-left, the hero stands at 12..28 (the lord from 5), props
// stand in 30..45, and every whip ends on the strike spot, columns 40..45.
// Wider panes add scenery from the right edge: one piece at 58, a second at
// 80, the rest at 96.

import { at, hero, loop, once, weapon } from './kit'
import type { Actor, HeroTier, Sprite, Theme } from './types'

const pixels = {
  // The hunter (the heavy whip hunter's colors; tiers swap these)
  H: '#c87830', // hair
  h: '#7c4418', // hair shade
  D: '#e03020', // headband
  S: '#f8c8a0', // skin
  s: '#c88860', // skin shade
  E: '#1c1020', // eyes
  T: '#b06028', // tunic
  t: '#6c3414', // tunic shade
  A: '#e0b070', // leather vest
  L: '#4c2410', // belt
  B: '#7c4418', // boots
  b: '#3c1c08', // boot shade
  // The young hunter (blue coat, white headband)
  youngH: '#8c5428',
  youngh: '#5c3418',
  youngD: '#f8f8f8',
  youngT: '#3c6cd8',
  youngt: '#1c3c98',
  youngA: '#e8e0c0',
  youngB: '#8c5428',
  youngb: '#4c2c14',
  // The wall-climbing thief (green bandana, olive leathers)
  thiefH: '#a8a898',
  thiefh: '#5c5c50',
  thiefD: '#4cac5c',
  thiefT: '#8c8c44',
  thieft: '#545424',
  thiefA: '#c8b888',
  thiefB: '#646430',
  thiefb: '#34341a',
  // The dhampir lord
  P: '#e8ecf8', // silver hair
  p: '#9ca4c8', // hair shade
  O: '#3c3462', // coat
  o: '#241c40', // coat shade
  Y: '#f0c040', // gold trim
  y: '#a87818', // gold shade
  C: '#2e2650', // cape
  c: '#1c1634', // cape shade
  R: '#d02838', // cape lining
  r: '#801424', // lining shade
  W: '#b8a4dc', // cravat (lilac: white under the chin read as a beard)
  // The lord of night (crimson cape)
  nightP: '#5c4c80',
  nightp: '#382c58',
  nightO: '#4c1428',
  nighto: '#2c0818',
  nightC: '#c01830',
  nightc: '#700c1c',
  nightR: '#2c1834',
  nightr: '#180c1c',
  nightE: '#ff3030',
  hurtA: '#fcfcfc',
  hurtB: '#f03850',
  glowA: '#ffd0d8',
  glowB: '#f06878',
  // Whips (G grip, w lash, v lash light, X head, x tip)
  G: '#5c3010',
  w: '#a06830',
  v: '#d8a060',
  X: '#8c8ca0',
  x: '#e8ecf8',
  chainLo: '#70748c',
  chainHi: '#d0d4e8',
  ironBall: '#9ca0b8',
  flameR: '#d83010',
  flameY: '#f8d040',
  flameO: '#f88020',
  flameW: '#fff8c0',
  vkGrip: '#8c1c30',
  vkLo: '#c09020',
  vkHi: '#fff4b0',
  vkBall: '#f8d040',
  vkAura: '#ffc8f0',
  // Props
  flame: '#f87818',
  flameCore: '#f8e050',
  wax: '#f0e8d0',
  iron: '#6c6880',
  ironHi: '#a8a4c0',
  smoke: '#787088',
  heart: '#e82838',
  heartHi: '#ffa0a8',
  stone: '#6c6488',
  stoneHi: '#9088b0',
  stoneLo: '#3c3454',
  crack: '#140c1c',
  meat: '#b85020',
  meatHi: '#e88850',
  plate: '#d8d8e8',
  bone: '#ece4d0',
  boneLo: '#a89c88',
  wood: '#8c5028',
  woodHi: '#b87840',
  woodLo: '#4c2810',
  paper: '#f0e4c0',
  paperLo: '#b8a880',
  ink: '#3c2c50',
  tome: '#6c1c2c',
  brass: '#c89838',
  brassHi: '#f0d070',
  brassLo: '#6c4c18',
  batBody: '#8c5cb8',
  batWing: '#5c3c88',
  batEye: '#ff3040',
  steel: '#c8d0e8',
  steelHi: '#ffffff',
  fairy: '#80f0a0',
  wing: '#c8f8ff',
  snake: '#3c9c48',
  snakeHi: '#80d860',
  medusa: '#a8c890',
  medusaEye: '#f8f040',
  medusaMouth: '#801830',
  orb: '#e070f0',
  orbLo: '#8030a8',
  robe: '#4c3c70',
  robeLo: '#2c2048',
  deathEye: '#ff2030',
  crystal: '#e02848',
  crystalLo: '#801028',
  saveGlow: '#f05068',
  mist: '#c8c0e0',
  mistLo: '#8c84b0',
  coffin: '#5c2c1c',
  coffinHi: '#8c4c30',
  coffinLo: '#30140c',
  sweat: '#8cd0fc',
  // Scenery
  moonA: '#f0ecd0',
  moonB: '#c8c4a4',
  amberA: '#f8c890',
  amberB: '#d89060',
  bloodA: '#e83030',
  bloodB: '#a01418',
  castle: '#0c0816',
  window: '#f0b040',
  throne: '#9c1828',
  throneLo: '#5c0c18',
  clock: '#d8d0b8',
  clockFar: '#b0a480',
  batFar: '#3c3460',
  brassFar: '#8c6c28',
  castleHi: '#2c2450',
  glint: '#fff4b0',
  lineup: '#463c5c',
  // Status bar
  black: '#000000',
  white: '#f8f8f8',
  barLabel: '#f8c8a0',
  barBox: '#c83820',
  mapBlue: '#2848a8',
  mapDot: '#f83838',
  hpFull: '#f05838',
  hpEmpty: '#3c1410',
  bossFull: '#b078f8',
  bossEmpty: '#241838',
  ringFull: '#f8b830',
  ringEmpty: '#3c2410',
  ringCold: '#5c5c6c',
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
// The hunters: one 16x16 build (the young hunter, the heavy whip hunter, the
// thief), facing right, headband tails trailing behind.
// ---------------------------------------------------------------------------

const HUNTER = [
  '.....hHHHHh.....',
  '...hHHHHHHHHh...',
  '..hHHHHHHHHHHH..',
  '.DDDDDDDDDDDDD..',
  'D.hHHHSSSSESS...',
  'D.hHHSSSSSSSSS..',
  '..hhHHSSSSSSs...',
  '...hh..sSSSs....',
  '....tTTAAATTT...',
  '...tTTTAAATTTt..',
  '...tTsTAAATTtS..',
  '...tSsLLLLLLSS..',
  '....tTTTtTTTt...',
  '....tTTt.tTTt...',
  '....BBb..BBBb...',
  '...BBBb..BBBBb..',
]
const STRIDE = {
  12: '....tTTTtTTTt...',
  13: '...tTTt...tTTt..',
  14: '..BBBb.....BBBb.',
  15: '.BBBb.......BBBb',
}
const HUNTER_WALK = edit(HUNTER, STRIDE)
const HUNTER_ATTACK = edit(HUNTER, {
  8: '....tTTAAATTTTSS',
  9: '...tTTTAAATTTTSS',
  10: '...tTsTAAATTt...',
  11: '...tSsLLLLLLt...',
  ...STRIDE,
})
const HUNTER_ITEM = edit(HUNTER, {
  0: '.....hHHHHh..SS.',
  1: '...hHHHHHHHH.SS.',
  2: '..hHHHHHHHHHHTT.',
  3: '.DDDDDDDDDDDDTT.',
  4: 'D.hHHHSSSSESSTT.',
  5: 'D.hHHSSSSSSSTt..',
  10: '...tTsTAAATTt...',
  11: '...tSsLLLLLLt...',
})
const HUNTER_SLEEP = edit(HUNTER, {
  4: 'D.hHHHSSSSssS...',
  10: '...tTsTSSATTt...',
  11: '...tTsLSSLLLt...',
})

// ---------------------------------------------------------------------------
// The dhampir lord (Opus and above): silver hair to the waist, a gold-trimmed
// coat, a cravat, and a great cape lined in red sweeping behind him. 24x26.
// ---------------------------------------------------------------------------

const LORD = [
  '..........pPPPp.........',
  '........pPPPPPPPp.......',
  '.......pPPPPPPPPPp......',
  '.......pPPPPPPPPPPp.....',
  '......pPPPPPPSSSSPp.....',
  '......pPPPPPSSSSESS.....',
  '......pPPPPPSSSSSSs.....',
  '.....pPPPPPPPsSSSs......',
  '.....pPPPPPPPpsss.......',
  '...YYpPPPPPYYWWYYY......',
  '..YCCpPPPPYOOWWOOYY.....',
  '..YCCCpPPYOOOWOOOOYY....',
  '.YCCCCpPPYOOOYOOOOOY....',
  '.YCCCCCpPYOOOYOOOOYSS...',
  '.YCCCCCCCYOOYYYYYYYSS...',
  'YCCCCCCCCYOOOYOOOOY.....',
  'YCCCCCCCcRYOOYOOOOY.....',
  'YCCCCCCcRRYOOOOOOOOY....',
  'YCCCCCccRRYOOOOoOOOY....',
  'YCCCCccRRrYOOOooOOOOY...',
  'YCCCcRRRr.YoooYYoooOY...',
  'YCCcRRRr....OOO..OOO....',
  '.YcRRRr.....OOO..OOO....',
  '..YYYY......YyY..YyY....',
  '...........YOOOY.OOOOY..',
  '...........YYYYY.YYYYY..',
]
const LORD_STRIDE = {
  21: 'YCCcRRRr...OOO....OOO...',
  22: '.YcRRRr....OOO.....OOO..',
  23: '..YYYY.....YyY.....YyY..',
  24: '..........YOOOY.....YOOY',
  25: '..........YYYYY.....YYYY',
}
const LORD_WALK = edit(LORD, LORD_STRIDE)
const LORD_ATTACK = edit(LORD, {
  12: '.YCCCCpPPYOOOYOOOOOYOOSS',
  13: '.YCCCCCpPYOOOYOOOOYYYYSS',
  14: '.YCCCCCCCYOOYYYYYYY.....',
  ...LORD_STRIDE,
})
const LORD_ITEM = edit(LORD, {
  0: '..........pPPPp.....SS..',
  1: '........pPPPPPPPp...SS..',
  2: '.......pPPPPPPPPPp..OO..',
  3: '.......pPPPPPPPPPPpOO...',
  4: '......pPPPPPPSSSSPpOO...',
  5: '......pPPPPPSSSSESSOO...',
  6: '......pPPPPPSSSSSSsOO...',
  7: '.....pPPPPPPPsSSSsOO....',
  8: '.....pPPPPPPPpsss.YO....',
  13: '.YCCCCCpPYOOOYOOOOY.....',
  14: '.YCCCCCCCYOOYYYYYYY.....',
})
// Asleep on his feet: the head bowed a pixel onto the chest, eyes shut, hands folded.
const LORD_SLEEP = edit(LORD, {
  0: '........................',
  1: LORD[0]!,
  2: LORD[1]!,
  3: LORD[2]!,
  4: LORD[3]!,
  5: LORD[4]!,
  6: '......pPPPPPSSSSsSS.....',
  7: LORD[6]!,
  8: LORD[7]!,
  13: '.YCCCCCpPYOOYSSOOOY.....',
  14: '.YCCCCCCCYOOYYYYYYY.....',
})

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

const FLAME = { f: 'flame', F: 'flameCore', w: 'wax', i: 'iron', I: 'ironHi', m: 'smoke' }
const STONE = { s: 'stone', S: 'stoneHi', q: 'stoneLo', k: 'crack' }
const BAT = { k: 'batBody', K: 'batWing', e: 'batEye' }
const BRASS = { b: 'brass', B: 'brassHi', q: 'brassLo' }
const BRASS_FAR = { b: 'brassLo', B: 'brassFar', q: 'crack' }
const BONE = { b: 'bone', B: 'boneLo', k: 'crack' }
const SHARDS = { f: 'boneLo', F: 'bone', w: 'steelHi' }
const CASTLE = { c: 'castle', h: 'castleHi', w: 'window' }
/** A silhouette with its moonward (left) edge lit, so it reads against the dark sky. */
const rim = (rows: string[]) => rows.map(r => r.replace('c', 'h'))
const MOON = (a: string, b: string) => ({ m: a, n: b })
const MOON_ROWS = [
  '....mmmm....',
  '..mmmmmmmm..',
  '.mmmmmmnmmm.',
  '.mmnnmmmmmm.',
  'mmmnnmmmmmmm',
  'mmmmmmmmmnmm',
  'mmmmmmmmmmmm',
  'mmmmmnmmmmmm',
  '.mmmmmmmmmm.',
  '.mmmmmmmmnm.',
  '..mmmmmmmm..',
  '....mmmm....',
]
const candelabraRows = (flames: [string, string]) => [
  flames[0],
  flames[1],
  '.w..w..w.',
  '.w..w..w.',
  '.w..w..w.',
  'iIi.w.iIi',
  '.i.iIi.i.',
  '.iiiIiii.',
  '....i....',
  '....i....',
  '....I....',
  '....i....',
  '....i....',
  '...iIi...',
  '..iiiii..',
  '.iiiIiii.',
]
/** A candle on a floor stand, `pole` rows of it under the dish: the flame at a hunter's whip (2) or the lord's (8). */
const candleRows = (flame: string[], pole: number) => [...flame, '..w..', '.www.', '.www.', 'iIIIi', ...Array.from({ length: pole }, () => '..I..'), '.iIi.']
const FLAME_A = ['..f..', '.fFf.', '.fFf.']
const FLAME_B = ['...f.', '..fF.', '.fFf.']
const BURST_A = ['...f...', '.f.F.f.', '..FFF..', 'fFFwFFf', '..FFF..', '.f.F.f.', '...f...']
const BURST_B = ['f..f..f', '.......', '..f.f..', 'f.....f', '..f.f..', '.......', 'f..f..f']
// Six columns: the whole wall stands on the strike spot. 16 rows, so the hunter's lash and the lord's both land in it.
const WALL = [
  'sqssss',
  'qqqqqq',
  'SSSqSS',
  'sssqss',
  'qqqqqq',
  'SqSSSS',
  'sqssss',
  'qqqqqq',
  'SSSqSS',
  'sssqss',
  'qqqqqq',
  'SqSSSS',
  'sqssss',
  'qqqqqq',
  'SSSqSS',
  'sssqss',
]
const SKELETON = [
  '..bbb...',
  '.bbbbb..',
  '.kbkbb..',
  '.bbbbb..',
  '..b.b...',
  '..bbb...',
  '.bbbbb..',
  'b.bBb.b.',
  'b.bbb.b.',
  '..bBb...',
  '..b.b...',
  '.b...b..',
  '.b...b..',
  'bb...bb.',
]
const DEATH = [
  '.......SSSSSSS..',
  '.....SS......Sh.',
  '...rrrr.......h.',
  '..rRRRRr......h.',
  '.rRbbbRRr.....h.',
  '.rRkbkbRr.....h.',
  '.rRbbbbRr....bh.',
  '..rRbbRRrr..bbh.',
  '.rRRRRRRRRrbb.h.',
  'rRRRRRRRRRRr..h.',
  'rRRRRbRRRRr...h.',
  '.rRRRRRRRRr...h.',
  '.rRRRRRRRRr...h.',
  '..rRRRRRRRr...h.',
  '..rRRRRRRrr...h.',
]
const DEATH_LEGEND = { S: 'steel', h: 'woodLo', r: 'robeLo', R: 'robe', b: 'bone', k: 'deathEye' }
/** A grandfather clock, the pendulum swung left or right from one pivot. */
const clockRows = (rod: string, bob: string) => [
  '..qWWWq..',
  '.qWwwwWq.',
  'qwwcccwwq',
  'qwcckccwq',
  'qwcckkcwq',
  'qwcccccwq',
  'qwwcccwwq',
  'qwwwwwwwq',
  'qwddbddwq',
  'qwddbddwq',
  'qwddbddwq',
  rod,
  rod,
  rod,
  bob,
  bob,
  'qwdddddwq',
  'qwwwwwwwq',
  'qWWWWWWWq',
  'qqqqqqqqq',
]
const CLOCK = { w: 'wood', W: 'woodHi', q: 'woodLo', c: 'clock', k: 'crack', d: 'castle', b: 'brass', B: 'brassHi' }
const GEAR_A = [
  '....bbb....',
  '.b.bbbbb.b.',
  '..bBBBBBb..',
  '.bBBqqqBBb.',
  'bbBq...qBbb',
  'bbBq...qBbb',
  'bbBq...qBbb',
  '.bBBqqqBBb.',
  '..bBBBBBb..',
  '.b.bbbbb.b.',
  '....bbb....',
]
const GEAR_B = [
  '...b...b...',
  '..bbbbbbb..',
  '.bbBBBBBbb.',
  'bbBBqqqBBbb',
  '.bBq...qBb.',
  '.bBq...qBb.',
  '.bBq...qBb.',
  'bbBBqqqBBbb',
  '.bbBBBBBbb.',
  '..bbbbbbb..',
  '...b...b...',
]
// The wheel beside the clock, a tooth further round each tick.
const WHEEL_A = [
  '....b....',
  '...bbb...',
  '..bBBBb..',
  '.bBqqqBb.',
  'bbBq.qBbb',
  '.bBqqqBb.',
  '..bBBBb..',
  '...bbb...',
  '....b....',
]
const WHEEL_B = [
  '.........',
  '.b.bbb.b.',
  '..bBBBb..',
  '.bBqqqBb.',
  '.bBq.qBb.',
  '.bBqqqBb.',
  '..bBBBb..',
  '.b.bbb.b.',
  '.........',
]
const BEAM_A = 'g...g.......g...g'
const BEAM_B = '........g........'

const sprites: Theme['sprites'] = {
  // Hunters
  stand: S(HUNTER),
  walk: S(HUNTER_WALK),
  attack: S(HUNTER_ATTACK),
  itemGet: S(HUNTER_ITEM),
  sleep: S(HUNTER_SLEEP),
  lordStand: S(LORD),
  lordWalk: S(LORD_WALK),
  lordAttack: S(LORD_ATTACK),
  lordItemGet: S(LORD_ITEM),
  lordSleep: S(LORD_SLEEP),

  // Whips, pointing right from the hand (the lash on rows 2 and 3). All 16 long: every one ends on the strike spot.
  whipLeather: S(['', 'GG', 'GGvvvvvvvvvvvvvv', 'GGwwwwwwwwwwwwwv', 'GG', '']),
  whipChain: S(['', 'GG', 'GGvwvwvwvwvwvwvx', 'GGwvwvwvwvwvwvwx', 'GG', '']),
  whipStar: S([
    '............x...',
    'GG.........xXXx.',
    'GGvwvwvwvwvXXXXx',
    'GGwvwvwvwvwXXXXx',
    'GG.........xXXx.',
    '............x...',
  ]),
  whipFlame: S([
    '.....x...x..x.x.',
    'GG..xX..xX.xXXx.',
    'GGvwvXvwvXvXXXXx',
    'GGwvwvwvwvwXXXXx',
    'GG.........xXXx.',
    '............x...',
  ]),
  // Loose sparkles round the whip (a dotted frame read as a selection box).
  vkAura: S([
    '...a.......a...a..',
    '.......a..........',
    'a...a.......a....a',
    '..................',
    '..................',
    '.a.....a.........a',
    '....a.....a.......',
    '..a.........a..a..',
  ], { a: 'vkAura' }),

  // Candles
  candle1: S(candleRows(FLAME_A, 2), FLAME),
  candle2: S(candleRows(FLAME_B, 2), FLAME),
  candleTall1: S(candleRows(FLAME_A, 8), FLAME),
  candleTall2: S(candleRows(FLAME_B, 8), FLAME),
  candelabra1: S(candelabraRows(['.f..f..f.', 'fFf.F.fFf']), FLAME),
  candelabra2: S(candelabraRows(['f...f...f', '.Ff.F.fF.']), FLAME),
  candelabraOut: S(candelabraRows(['.m.....m.', 'm...m...m']), FLAME),
  burst1: S(BURST_A, FLAME),
  burst2: S(BURST_B, FLAME),
  heartDrop: S(['hh.hh', 'hHhhh', '.hhh.', '..h..'], { h: 'heart', H: 'heartHi' }),

  // Breakable wall and what hides inside it
  wall: S(WALL, STONE),
  wallCracked: S(edit(WALL, { 2: 'SSkqSS', 3: 'sskqss', 4: 'qqkqqq', 5: 'Sqkkqk', 6: 'sqskss', 8: 'SSkqSS', 9: 'skkqss', 10: 'qkqkqq', 12: 'sqsksk', 14: 'SSkqSS' }), STONE),
  wallBroken: S(['', '', '', '', '', '', '', '', '', '', '', '', '..S...', '.sq.S.', 'SsqsqS', 'qqqqqq'], STONE),
  potRoast: S(['..MMm...', '.MmmmmBb', 'mmmmmmB.', 'pppppppp', '.pppppp.'], { m: 'meat', M: 'meatHi', B: 'bone', b: 'boneLo', p: 'plate' }),

  // The long library
  lectern: S([
    'qWWWWWWWWWWq',
    '.qwwwwwwwwq.',
    '....qwwq....',
    '.....ww.....',
    '.....ww.....',
    '.....ww.....',
    '.....ww.....',
    '....qwwq....',
    '...qwwwwq...',
    '..qqqqqqqq..',
  ], { w: 'wood', W: 'woodHi', q: 'woodLo' }),
  tome1: S(['.ppppPpppp.', 'pkkpkPpkkpp', 'ppkkpPpkpkp', 'pkpkkPpkkpp', 'ccccccccccc'], { p: 'paper', P: 'paperLo', k: 'ink', c: 'tome' }),
  tome2: S(['......pp...', '.ppppPpPp..', 'pkkpkPpkpp.', 'ppkkpPpPkpp', 'ccccccccccc'], { p: 'paper', P: 'paperLo', k: 'ink', c: 'tome' }),

  // The clock tower
  wheelA: S(WHEEL_A, BRASS),
  wheelB: S(WHEEL_B, BRASS),
  clockL: S(clockRows('qwdbdddwq', 'qwBBdddwq'), CLOCK),
  clockR: S(clockRows('qwdddbdwq', 'qwdddBBwq'), CLOCK),

  // Bats and familiars
  bat1: S(['K.......K', 'KK.....KK', 'KKKk.kKKK', '.KkkekkK.', '....k....'], BAT),
  bat2: S(['...k.k...', '.KkkekkK.', 'KKKkkkKKK', 'K.......K'], BAT),
  famSword: S(['...y.......', 'GGyYsssssss', '...y.......'], { y: 'Y', Y: 'y', s: 'steel' }),
  famFairy1: S(['a...a', '.aWa.', '..p..', '.apa.', 'a...a'], { a: 'wing', W: 'steelHi', p: 'fairy' }),
  famFairy2: S(['.....', 'aaWaa', '..p..', 'aapaa', '.....'], { a: 'wing', W: 'steelHi', p: 'fairy' }),

  // Foes
  skeleton: S(SKELETON, BONE),
  // Climbing out of the floor: the skull, then down to the hips.
  skeletonRise1: S(SKELETON.slice(0, 5), BONE),
  skeletonRise2: S(SKELETON.slice(0, 9), BONE),
  boneBurst1: S(BURST_A, SHARDS),
  boneBurst2: S(BURST_B, SHARDS),
  medusa1: S(['g.g.g.g.', '.gGgGgg.', 'gGsssGg.', '.gEsssg.', 'gGssssG.', '.gsRRs..', '..gssg..'], { g: 'snake', G: 'snakeHi', s: 'medusa', E: 'medusaEye', R: 'medusaMouth' }),
  medusa2: S(['.g.g.g.g', 'g.gGgGg.', '.gsssGgg', 'gGEsssg.', '.gssssGg', '..sRRsg.', '..gssg..'], { g: 'snake', G: 'snakeHi', s: 'medusa', E: 'medusaEye', R: 'medusaMouth' }),
  death1: S(DEATH, DEATH_LEGEND),
  death2: S(edit(DEATH, { 5: '.rRbkbkRr.....h.', 13: '.rRRRRRRRRr...h.', 14: '.r.rRRRr.r....h.' }), DEATH_LEGEND),

  // Rewards and rooms
  orb: S(['.oOOo.', 'oOWOOo', 'OWOOOO', 'OOOOOO', 'oOOOOo', '.oOOo.'], { o: 'orbLo', O: 'orb', W: 'steelHi' }),
  whipOrb: S(['..yyy..', '.yYYYy.', 'yYwwwYy', 'yYw.vYy', 'yYvvwYy', '.yYYYy.', '..yyy..'], { y: 'y', Y: 'Y' }),
  spark: S(['..W..', '..W..', 'WWYWW', '..W..', '..W..'], { W: 'steelHi' }),
  glint: S(['.g.', 'gWg', '.g.'], { g: 'glint', W: 'steelHi' }),
  saveCrystal: S([
    '...cc...',
    '..cCCc..',
    '.cCWCCc.',
    '.cCCCCc.',
    'cCWCCCCc',
    'cCCCCCCc',
    '.cCCCCc.',
    '.cCCCCc.',
    '..cCCc..',
    '...cc...',
    '.qsssSq.',
    'qsssSSsq',
    'qqqqqqqq',
  ], { c: 'crystalLo', C: 'crystal', W: 'steelHi', s: 'stone', S: 'stoneHi', q: 'stoneLo' }),
  // A pillar of light from the top of the scene to the floor, round the hero and clear of the ring.
  saveBeam1: S(Array.from({ length: 36 }, (_, k) => (k % 4 < 2 ? BEAM_A : BEAM_B)), { g: 'saveGlow' }),
  saveBeam2: S(Array.from({ length: 36 }, (_, k) => (k % 4 < 2 ? BEAM_B : BEAM_A)), { g: 'saveGlow' }),
  mist1: S([
    '.....mmm..........',
    '...mmMMMmm..mmm...',
    '..mMMMMMMMmmMMMm..',
    '.mMMMmmmMMMMMMMMm.',
    'mMMMm...mMMMMmMMMm',
    '.mMMMMmmMMMMm.mMm.',
    '..mmMMMMMMMMMmMm..',
    '....mmMMMMMMMMm...',
    '......mmmmmmmm....',
  ], { m: 'mistLo', M: 'mist' }),
  mist2: S([
    '..m.....mm.....m..',
    '.....mm....mm.....',
    'm..mMMm..mMMMm..m.',
    '..mMMMMm.mMMMMm...',
    '.mMMm.mMMMm.mMMm..',
    '..mm...mMm...mm..m',
    'm....m.....m......',
    '...m....mm....m...',
  ], { m: 'mistLo', M: 'mist' }),
  coffinLid: S([
    '...WWWWWWWWWWWWWWWWW..',
    '..WwwwwwwwwyywwwwwwwW.',
    '.WwwwwwwwyyyyyywwwwwwW',
    'Wwwwwwwwwwwyywwwwwwwwq',
  ], { w: 'coffin', W: 'coffinHi', q: 'coffinLo', y: 'Y' }),
  coffinBase: S([
    'qwwwwwwwwwwyywwwwwwwqq',
    '.qwwwwwwwwwwwwwwwwwqq.',
    '..qqqqqqqqqqqqqqqqqq..',
  ], { w: 'coffin', q: 'coffinLo', y: 'Y' }),
  coffinEyes: S(['eE...eE'], { e: 'deathEye', E: 'glowA' }),
  sweat: S(['.d.', '.d.', 'ddd', 'ddd', '.d.'], { d: 'sweat' }),

  // Scenery
  floorBrick: S(['SSSSSSSq', 'sssssssq', 'qqqqqqqq', 'SSSqSSSS'], STONE),
  moonPale: S(MOON_ROWS, MOON('moonA', 'moonB')),
  moonAmber: S(MOON_ROWS, MOON('amberA', 'amberB')),
  moonBlood: S(MOON_ROWS, MOON('bloodA', 'bloodB')),
  batsFar: S(['k...k.........', '.k.k....k...k.', '..k......k.k..', '..........k...'], { k: 'batFar' }),
  // The castle, in pieces from the right edge: its great tower (9 wide, clear of the action at 56 columns), the keep, the graveyard.
  castleTower: S(rim([
    '....c....',
    '...ccc...',
    '...ccc...',
    '..ccccc..',
    '.ccccccc.',
    'c.cc.cc.c',
    'ccccccccc',
    '.ccccccc.',
    '.ccwcccc.',
    '.ccwcccc.',
    '.ccccccc.',
    '.cccccwc.',
    '.cccccwc.',
    '.ccccccc.',
    'c.cc.cc.c',
    'ccccccccc',
    'cccwcwccc',
    'ccccccccc',
    'ccc...ccc',
    'cc.....cc',
  ]), CASTLE),
  castleKeep: S(rim([
    '..........c...........',
    '.........ccc..........',
    '.........ccc..........',
    '..c.....ccccc.........',
    '.ccc....ccwcc.........',
    '.ccc....ccccc......c..',
    'ccccc...ccccc.....ccc.',
    'ccwcc..c.ccc.c....ccc.',
    'ccccc..ccccccc...ccccc',
    'ccccc.cccwcwccc.cccwcc',
    'cccccccccccccccccccccc',
    'ccccwccccccccccwcccccc',
    'cccccccccccccccccccccc',
    'cwccccccc...cccccccwcc',
    'ccccccccc...cccccccccc',
    'cccccccc.....ccccccccc',
    'cccccccc.....cccccwccc',
    'cccccccc.....ccccccccc',
    'cccccccc.....ccccccccc',
    'cccccccc.....ccccccccc',
  ]), CASTLE),
  graves: S(rim([
    '....c.....c...',
    '.c..c....c....',
    '..c.cc..c.....',
    '...ccc.c......',
    '....ccc.......',
    '....cc........',
    '....cc........',
    '....cc.....c..',
    '....cc....ccc.',
    '.c..cc.....c..',
    'ccc.cc.....c..',
    '.c.cccc...ccc.',
  ]), CASTLE),
  // The clock tower: its lit face under the moon, and at wider panes the wheels that drive it. Dim, so they stay scenery.
  clockTower: S(rim([
    '....c....',
    '...ccc...',
    '..ccccc..',
    '.ccccccc.',
    'ccbbbbbcc',
    'cbffKffbc',
    'cbffKffbc',
    'cbffKKfbc',
    'cbfffffbc',
    'cbfffffbc',
    'ccbbbbbcc',
    'ccccccccc',
    '.ccccccc.',
    '.cccwccc.',
    '.cccwccc.',
    '.ccccccc.',
    '.ccccccc.',
    '.cccwccc.',
    '.cccwccc.',
    '.ccccccc.',
    'ccccccccc',
  ]), { ...CASTLE, b: 'brassLo', f: 'clockFar', K: 'crack' }),
  gearFarA: S(GEAR_A, BRASS_FAR),
  gearFarB: S(GEAR_B, BRASS_FAR),
  throne: S([
    '..y...y..',
    '.yRy.yRy.',
    '.yRRyRRy.',
    '.yRRRRRy.',
    '.yRrRrRy.',
    '.yRRRRRy.',
    '.yRRRRRy.',
    '.yRRRRRy.',
    'yyyyyyyyy',
    'yrrrrrrry',
    'yyyyyyyyy',
    '.y.....y.',
    '.y.....y.',
    '.y.....y.',
    'yyy...yyy',
  ], { y: 'y', R: 'throne', r: 'throneLo' }),
  banner: S([
    'iiiiiiii',
    '.RRRRRR.',
    '.RRRRRR.',
    '.RRyyRR.',
    '.RyRRyR.',
    '.RRyyRR.',
    '.RRRRRR.',
    '.RRRRRR.',
    '.RRRRRR.',
    '.RR..RR.',
    '.R....R.',
  ], { i: 'iron', R: 'throneLo', y: 'y' }),

  // Status bar
  hp0: S(['e', 'e', 'e', 'e', 'e', 'e'], { e: 'hpEmpty' }),
  hp1: S(['e', 'e', 'e', 'f', 'f', 'f'], { e: 'hpEmpty', f: 'hpFull' }),
  hp2: S(['f', 'f', 'f', 'f', 'f', 'f'], { f: 'hpFull' }),
  boss0: S(['e', 'e', 'e', 'e', 'e', 'e'], { e: 'bossEmpty' }),
  boss1: S(['e', 'e', 'e', 'f', 'f', 'f'], { e: 'bossEmpty', f: 'bossFull' }),
  boss2: S(['f', 'f', 'f', 'f', 'f', 'f'], { f: 'bossFull' }),
  heartIcon: S(['h.h', 'hhh', 'hhh', '.h.'], { h: 'heart' }),
  miniWhip: S(['.vvv.', 'w...v', 'w.vv.', 'w.w.x', '.ww..', 'GG...', 'GG...']),
  // The coil ending in the ball: the Morning Star and the Vampire Killer.
  miniStar: S(['.vvv.', 'w...v', 'w..XX', 'w..XX', '.ww..', 'GG...', 'GG...']),
  miniHead: S(['.hHH.', 'DDDDD', 'hHSES', 'hSSSS', '.hSS.', 'tTAT.', 'TTATT']),
  miniLord: S(['.pPP.', 'pPPSS', 'pPSES', 'pPSSS', 'pPWW.', 'YCOOY', 'YCOOY']),
}

// ---------------------------------------------------------------------------
// Frames: actors are placed relative to the hero's top-left (see kit.ts), which
// is scene column 12; the floor line is y 16 from it.
// ---------------------------------------------------------------------------

const ink = '#f0e8d8'
const gold = '#f8d040'

const SMALL: HeroTier[] = ['tier1', 'tier2', 'unknown']
const BIG: HeroTier[] = ['tier3', 'tier4']
const small = (a: Actor): Actor => ({ ...a, tiers: SMALL })
const big = (a: Actor): Actor => ({ ...a, tiers: BIG })

/** The whip cracked from the hunter's hand. Its last columns are the strike spot. */
const lash = () => weapon(16, 6)
// Where every whip ends: scene columns 40..45. What is struck stands here. The
// hunter's lash is 8..9 under his top; the lord's is 6 higher (`LORD_FORM.hand`).
const STRIKE = 28
const LORD_UP = -6
const CANDELABRA = { x: 20, y: 0 }
const LECTERN = { x: 20, y: 6 }
const WHEEL = { x: 16, y: 7 }
const CLOCK_AT = { x: 25, y: -4 }
const COFFIN = { x: -2, y: 9 }

const HURT_A = { T: 'hurtA', t: 'hurtB', A: 'hurtA', H: 'hurtB', O: 'hurtA', o: 'hurtB' }
const HURT_B = { T: 'hurtB', t: 'hurtB', A: 'hurtA', H: 'hurtA', O: 'hurtB', o: 'hurtB' }
const GLOW = { T: 'glowA', t: 'glowB', A: 'glowA', O: 'glowA', o: 'glowB', P: 'glowA' }

/** A candle on its stand, the flame at the whip of whoever cracks it. */
const candle = (k: 1 | 2): Actor[] => [small(at(`candle${k}`, STRIKE, 6)), big(at(`candleTall${k}`, STRIKE, 0))]
/** A burst where the lash lands. */
const burst = (sprite: string): Actor[] => [small(at(sprite, STRIKE - 1, 5, { fixed: true })), big(at(sprite, STRIKE - 1, 5 + LORD_UP, { fixed: true }))]
const candelabra = (sprite: string) => at(sprite, CANDELABRA.x, CANDELABRA.y)
const lectern = (page: 1 | 2): Actor[] => [at('lectern', LECTERN.x, LECTERN.y), at(`tome${page}`, LECTERN.x, LECTERN.y - 4)]
/** The clock ticking, a wheel turning beside it. */
const clockwork = (tick: boolean): Actor[] => [at(tick ? 'wheelB' : 'wheelA', WHEEL.x, WHEEL.y), at(tick ? 'clockL' : 'clockR', CLOCK_AT.x, CLOCK_AT.y, { fixed: true })]
const coffinShut = (): Actor[] => [at('coffinLid', COFFIN.x, COFFIN.y), at('coffinBase', COFFIN.x, COFFIN.y + 4)]
const coffinPeek = (): Actor[] => [at('coffinLid', COFFIN.x, COFFIN.y - 2), at('coffinEyes', COFFIN.x + 4, COFFIN.y + 2), at('coffinBase', COFFIN.x, COFFIN.y + 4)]
/** Text over the hero's head, whichever hero it is. */
const above = (text: string, x: number, y: number, color = ink) => ({ text, x, y, color, lift: true })

const states: Theme['states'] = {
  idle: loop(
    { actors: [hero('sleep'), candelabra('candelabra1')], texts: [above('z', 14, -2)], hold: 3 },
    { actors: [hero('sleep'), candelabra('candelabra2')], texts: [above('z', 15, -4)], hold: 3 },
    { actors: [hero('sleep'), candelabra('candelabra1')], texts: [above('Z', 16, -6)], hold: 3 },
    { actors: [hero('sleep'), candelabra('candelabra2')], hold: 3 },
  ),
  // The bat circles over the hero's shoulder, a full turn each loop.
  thinking: loop(
    { actors: [hero('stand'), at('bat1', 20, -6)], texts: [above('.', 15, -2)], hold: 2 },
    { actors: [hero('stand'), at('bat2', 23, -9)], texts: [above('..', 15, -2)], hold: 2 },
    { actors: [hero('stand'), at('bat1', 20, -10)], texts: [above('...', 15, -2)], hold: 2 },
    { actors: [hero('walk'), at('bat2', 17, -8)], texts: [above('?', 16, -2, gold)], hold: 2 },
  ),
  reading: loop(
    { actors: [hero('stand'), ...lectern(1)], hold: 2 },
    { actors: [hero('stand'), ...lectern(2)], texts: [{ text: '~', x: 24, y: -2, color: gold }], hold: 1 },
    { actors: [hero('walk'), ...lectern(1)], texts: [{ text: '~', x: 25, y: -6, color: gold }, { text: '*', x: 22, y: -2, color: ink }], hold: 2 },
    { actors: [hero('stand'), ...lectern(2)], texts: [{ text: '*', x: 23, y: -6, color: ink }], hold: 1 },
  ),
  // A candle cracked for its heart, then a wall broken for the roast inside.
  editing: loop(
    { actors: [hero('stand'), ...candle(1)], hold: 2 },
    { actors: [hero('itemGet'), ...candle(2)], hold: 1 },
    { actors: [hero('attack'), ...candle(1), lash()], hold: 1 },
    { actors: [hero('attack'), lash(), ...burst('burst1')], hold: 1 },
    { actors: [hero('stand'), ...burst('burst2')], hold: 1 },
    { actors: [hero('stand'), at('heartDrop', STRIKE, 8)], hold: 1 },
    { actors: [hero('stand'), at('heartDrop', STRIKE, 12)], hold: 2 },
    { actors: [hero('stand'), at('wall', STRIKE, 0)], hold: 1 },
    { actors: [hero('attack'), at('wall', STRIKE, 0), lash()], hold: 1 },
    { actors: [hero('attack'), at('wallCracked', STRIKE, 0), lash()], hold: 1 },
    { actors: [hero('stand'), at('wallBroken', STRIKE, 0), at('potRoast', STRIKE - 2, 8)], hold: 3 },
  ),
  shell: loop(
    { actors: [hero('stand'), ...clockwork(true)], texts: [{ text: 'TICK', x: 17, y: -6, color: gold }], hold: 2 },
    { actors: [hero('walk'), ...clockwork(false)], texts: [{ text: 'TOCK', x: 21, y: -6, color: gold }], hold: 2 },
  ),
  // The familiars leave the raised hand: the bat climbs to the moon, the sword flies level, the fairy bobs low.
  agents: loop(
    { actors: [hero('itemGet'), at('bat1', 18, -4, { fixed: true }), at('famSword', 18, 2, { fixed: true }), at('famFairy1', 19, 8, { fixed: true })], hold: 2 },
    { actors: [hero('itemGet'), at('bat2', 21, -8, { fixed: true }), at('famSword', 20, 1, { fixed: true }), at('famFairy2', 23, 10, { fixed: true })], hold: 2 },
    { actors: [hero('itemGet'), at('bat1', 24, -12, { fixed: true }), at('famSword', 22, 0, { fixed: true }), at('famFairy1', 26, 7, { fixed: true })], hold: 2 },
    { actors: [hero('stand'), at('bat2', 25, -17, { fixed: true }), at('famSword', 23, -1, { fixed: true }), at('famFairy2', 29, 9, { fixed: true })], hold: 2 },
    { actors: [hero('stand')], texts: [above('...', 15, -2)], hold: 2 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop(
    { actors: [...coffinShut(), candelabra('candelabraOut')], texts: [{ text: 'z', x: 10, y: 4, color: '#8c84a0' }], hold: 4 },
    { actors: [...coffinShut(), candelabra('candelabraOut')], texts: [{ text: 'Z', x: 11, y: 2, color: '#8c84a0' }], hold: 4 },
    { actors: [...coffinPeek(), candelabra('candelabraOut')], hold: 2 },
  ),
}

const SIGH_READS = 'What is this? A miserable little pile of reads.'
const SIGH_COMMANDS = 'What is this? A miserable little pile of commands.'
// A drop beside the brow, clear of the hair.
const sweat: Actor[] = [small(at('sweat', 14, -2, { fixed: true })), big(at('sweat', 12, -10, { fixed: true }))]
const sigh = { text: '~sigh~', x: 18, y: -2, color: ink }
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), ...lectern(1), ...sweat], hold: 2, caption: SIGH_READS },
    { actors: [hero('stand'), ...lectern(2), ...sweat], hold: 1, caption: SIGH_READS },
    { actors: [hero('sleep'), ...lectern(1), ...sweat], texts: [sigh], hold: 3, caption: SIGH_READS },
  ),
  shell: loop(
    { actors: [hero('stand'), ...clockwork(true), ...sweat], hold: 2, caption: SIGH_COMMANDS },
    { actors: [hero('stand'), ...clockwork(false), ...sweat], hold: 2, caption: SIGH_COMMANDS },
    { actors: [hero('sleep'), ...clockwork(true), ...sweat], texts: [sigh], hold: 3, caption: SIGH_COMMANDS },
  ),
}

/** The hero knocked back: two pixels for a hunter, one for the lord (his hair stays off the price tag). */
const knocked = (pose: string, x: number, y: number, swap: Record<string, string>): Actor[] => [small(hero(pose, x, y, swap)), big(hero(pose, Math.max(x, -1), y, swap))]
const medusa = (k: 1 | 2, x: number, y: number) => at(`medusa${k}`, x, y, { fixed: true })
const death = (k: 1 | 2, y: number) => at(`death${k}`, 18, y, { fixed: true })
const beam = (k: 1 | 2) => at(`saveBeam${k}`, 0, -20, { fixed: true })
const crystal = () => at('saveCrystal', 22, 3)
/** Glints off a new whip, over and under the lash. */
const glints = (k: 0 | 1): Actor[] =>
  [
    { x: [22, 25][k]!, y: [1, 2][k]! },
    { x: [29, 20][k]!, y: [13, 12][k]! },
  ].flatMap(g => [small(at('glint', g.x, g.y, { fixed: true })), big(at('glint', g.x + 1, g.y + LORD_UP, { fixed: true }))])

const events: Theme['events'] = {
  // A skeleton climbs out of the floor on the strike spot, and is whipped apart.
  toolSuccess: once(
    { actors: [hero('stand'), at('skeletonRise1', STRIKE - 1, 11)], hold: 1 },
    { actors: [hero('itemGet'), at('skeletonRise2', STRIKE - 1, 7)], hold: 1 },
    { actors: [hero('attack'), at('skeleton', STRIKE - 1, 2), lash()], hold: 1 },
    { actors: [hero('attack'), lash(), ...burst('boneBurst1')], hold: 1 },
    { actors: [hero('stand'), ...burst('boneBurst2')], hold: 1 },
    { actors: [hero('stand'), at('heartDrop', STRIKE, 12)], hold: 2 },
  ),
  // The head weaves in at chest height, strikes, and bounces away; the hero ends where he began.
  toolError: once(
    { actors: [hero('stand'), medusa(1, 26, -2)], hold: 1 },
    { actors: [hero('stand'), medusa(2, 20, 2)], hold: 1 },
    { actors: [...knocked('stand', -1, 0, HURT_A), medusa(1, 14, -1)], hold: 1 },
    { actors: [...knocked('walk', -2, -2, HURT_B), medusa(2, 19, -6)], hold: 1 },
    { actors: [...knocked('walk', -2, -1, HURT_A), medusa(1, 25, -11)], hold: 1 },
    { actors: [...knocked('stand', -1, 0, HURT_B)], hold: 1 },
    { actors: [hero('stand')], hold: 1 },
  ),
  turnComplete: once(
    { actors: [hero('itemGet')], hold: 1 },
    { actors: [hero('attack'), lash(), small(at('spark', STRIKE + 1, 6, { fixed: true })), big(at('spark', STRIKE + 1, 6 + LORD_UP, { fixed: true }))], hold: 2 },
    { actors: [hero('stand'), at('orb', 11, -10)], hold: 1 },
    {
      actors: [hero('itemGet'), at('orb', 11, -6)],
      texts: [above('*', 17, -9, gold), { text: 'CLEAR!', x: 18, y: -6, color: gold }],
      hold: 2,
    },
    {
      actors: [hero('itemGet'), at('orb', 11, -6)],
      texts: [above('*', 19, -7, gold), { text: 'CLEAR!', x: 18, y: -6, color: gold }],
      hold: 3,
    },
  ),
  milestone: once({ actors: [hero('stand')], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [hero('sleep'), candelabra('candelabra1')], hold: 2 },
    { actors: [hero('sleep'), candelabra('candelabraOut')], hold: 2 },
    { actors: [...coffinShut(), candelabra('candelabraOut')], message: 'cacheCold', hold: 12 },
  ),
  // Death comes down over the strike spot, scythe first; the hero flinches, then gives a step.
  limitWarning: once(
    { actors: [hero('stand'), death(1, -9)], message: 'limitWarning', hold: 2 },
    { actors: [hero('stand', 0, 0, { T: 'hurtB', O: 'hurtB' }), death(2, -6)], message: 'limitWarning', hold: 2 },
    { actors: [hero('stand'), death(1, -3)], message: 'limitWarning', hold: 3 },
    { actors: [hero('stand', 0, 0, { T: 'hurtB', O: 'hurtB' }), death(2, -2)], message: 'limitWarning', hold: 3 },
    { actors: [hero('walk', -1), death(1, -3)], message: 'limitWarning', hold: 5 },
  ),
  compaction: once(
    { actors: [crystal(), hero('walk')], hold: 1, caption: 'compaction' },
    { actors: [beam(1), crystal(), hero('itemGet')], hold: 2, caption: 'compaction' },
    { actors: [beam(2), crystal(), hero('itemGet', 0, 0, GLOW)], hold: 2, caption: 'compaction' },
    { actors: [beam(1), crystal(), hero('itemGet')], hold: 2, caption: 'compaction' },
    { actors: [crystal(), hero('stand')], hold: 2, caption: 'compaction' },
  ),
  // The mist takes the old hunter whole (a second bank for the lord's height) and a new one steps out.
  modelChange: once(
    { actors: [hero('stand'), at('mist1', -1, 6), big(at('mist2', -2, -6, { fixed: true }))], hold: 1 },
    { actors: [at('mist1', -1, 4), at('mist2', 2, 0), big(at('mist1', -1, -8, { fixed: true }))], hold: 2 },
    { actors: [at('mist2', -1, 4), at('mist1', 1, 7), big(at('mist2', 0, -5, { fixed: true }))], hold: 1 },
    { actors: [hero('itemGet', 0, 0, GLOW), at('mist2', -1, 8)], hold: 1 },
    { actors: [hero('itemGet')], hold: 6, caption: 'modelChange' },
  ),
  // The whip orb drops to the raised hand; then the new whip, cracked once.
  effortChange: once(
    { actors: [hero('stand'), at('whipOrb', 10, -10)], hold: 1 },
    { actors: [hero('stand'), at('whipOrb', 10, -7)], hold: 1 },
    { actors: [hero('itemGet', 0, 0, GLOW), at('spark', 11, -6)], hold: 2 },
    { actors: [hero('attack'), lash(), ...glints(0)], hold: 2, caption: 'effortChange' },
    { actors: [hero('attack'), lash(), ...glints(1)], hold: 3, caption: 'effortChange' },
  ),
}

const HUNTER_POSES = { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'sleep' }
const LORD_POSES = { stand: 'lordStand', walk: 'lordWalk', attack: 'lordAttack', itemGet: 'lordItemGet', sleep: 'lordSleep' }
/** The lord's whip hand: a pixel further out and six higher than a hunter's, the grip level with his fist. */
const LORD_FORM = { poses: LORD_POSES, dx: -7, dy: -10, lift: 10, hand: { x: 1, y: LORD_UP } }

export const castlevania: Theme = {
  id: 'castlevania',
  name: 'Symphony of the Tokens',
  description: 'Gothic vampire-hunter homage: a whip per effort, a hunter per model, and the moon turns red as the castle closes in',
  version: '1.1.0',
  palette: {
    dark: { accent: '#68b8f8', gold: '#f0c040', red: '#f44c62', label: '#c8a0e8', dim: '#8c84a0', text: '#f0ecf8' },
    light: { accent: '#1c5cb0', gold: '#906400', red: '#b01828', label: '#6c2c9c', dim: '#6c6480', text: '#1c1424' },
  },
  pixels,
  labels: {
    context: 'PLAYER',
    spend: 'HEARTS',
    cache: 'CANDLE',
    limits: 'ENEMY',
    modelItem: 'HUNTER',
    effortItem: 'WHIP',
    heroes: 'Hunters',
    weapons: 'Whips',
  },
  headings: {
    Context: 'Player',
    Cost: 'Hearts',
    'Next message': 'Candle',
    Tokens: 'Relics',
    Limits: 'Enemy',
    'Tool calls': 'Sub-weapons',
    Files: 'Castle map',
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
      ground: '#100c20',
      gradient: ['#06040e', '#0e0a20', '#181232', '#241a3e'],
      deep: ['#140208', '#2a0810', '#3c0e14', '#30101a'],
      floor: 'floorBrick',
      // The moon follows the default context levels: amber from 30, blood from 50 (where the milestone says it turns red).
      // Past the action, from the right edge in, by stage. The gate (under 35%): the great tower at 58, the keep at 80,
      // the graveyard at 96. The clock tower (35 to 70): its lit face, then its wheels. The throne room (from 70): the
      // throne, then a banner and a candelabra, then more banners.
      decor: [
        { sprite: 'moonPale', x: -3, y: 2, sky: true, maxPercent: 30 },
        { sprite: 'moonAmber', x: -3, y: 2, sky: true, minPercent: 30, maxPercent: 50 },
        { sprite: 'moonBlood', x: -3, y: 2, sky: true, minPercent: 50 },
        // Left-anchored, in cells no frame writes text into (the lord's z's and sparkles start two columns on).
        { sprite: 'batsFar', x: 13, y: 1, sky: true, maxPercent: 50 },
        { sprite: 'castleTower', x: -1, y: 16, maxPercent: 35, minColumns: 56 },
        { sprite: 'castleKeep', x: -10, y: 16, maxPercent: 35, minColumns: 78 },
        { sprite: 'graves', x: -33, y: 24, maxPercent: 35, minColumns: 94 },
        { sprite: 'clockTower', x: -1, y: 15, minPercent: 35, maxPercent: 70, minColumns: 56 },
        { sprite: 'gearFarA', x: -11, y: 25, minPercent: 35, maxPercent: 70, minColumns: 78 },
        { sprite: 'gearFarB', x: -21, y: 15, minPercent: 35, maxPercent: 70, minColumns: 78 },
        { sprite: 'gearFarA', x: -32, y: 25, minPercent: 35, maxPercent: 70, minColumns: 94 },
        { sprite: 'throne', x: -1, y: 21, minPercent: 70, minColumns: 56 },
        { sprite: 'banner', x: -17, y: 0, sky: true, minPercent: 70, minColumns: 78 },
        { sprite: 'candelabra1', x: -12, y: 20, minPercent: 70, minColumns: 78 },
        { sprite: 'banner', x: -28, y: 0, sky: true, minPercent: 70, minColumns: 94 },
        { sprite: 'banner', x: -40, y: 0, sky: true, minPercent: 70, minColumns: 94 },
      ],
      particles: [
        { colors: ['#c8c8f0', '#8888c0'], count: 14, drift: 'none', maxPercent: 50 },
        { colors: ['#f86020', '#f8a030', '#c02818'], count: 14, drift: 'up', speed: 1, minPercent: 50 },
      ],
    },
    hero: HUNTER_POSES,
    heroTiers: {
      tier1: { H: 'youngH', h: 'youngh', D: 'youngD', T: 'youngT', t: 'youngt', A: 'youngA', B: 'youngB', b: 'youngb' },
      tier2: {},
      tier3: {},
      tier4: { P: 'nightP', p: 'nightp', O: 'nightO', o: 'nighto', C: 'nightC', c: 'nightc', R: 'nightR', r: 'nightr', E: 'nightE' },
      unknown: { H: 'thiefH', h: 'thiefh', D: 'thiefD', T: 'thiefT', t: 'thieft', A: 'thiefA', B: 'thiefB', b: 'thiefb' },
    },
    heroForms: { tier3: LORD_FORM, tier4: LORD_FORM },
    heroNames: {
      tier1: 'Young Hunter',
      tier2: 'Whip Hunter',
      tier3: 'Dhampir Lord',
      tier4: 'Lord of the Night',
      unknown: 'Wall-climbing Thief',
    },
    weapons: {
      low: { sprite: 'whipLeather', swap: {}, name: 'Leather Whip' },
      medium: { sprite: 'whipChain', swap: { w: 'chainLo', v: 'chainHi', x: 'chainHi' }, name: 'Chain Whip' },
      high: { sprite: 'whipStar', swap: { w: 'chainLo', v: 'chainHi', X: 'ironBall', x: 'chainHi' }, name: 'Morning Star' },
      xhigh: { sprite: 'whipFlame', swap: { w: 'flameR', v: 'flameY', X: 'flameO', x: 'flameW' }, name: 'Flame Whip' },
      max: { sprite: 'whipStar', swap: { G: 'vkGrip', w: 'vkLo', v: 'vkHi', X: 'vkBall', x: 'steelHi' }, aura: 'vkAura', name: 'Vampire Killer' },
    },
    // 96 columns with the map and five digits of hearts; 77 without it. The candle counter has its name and no icon to get there.
    bar: {
      widgets: [
        { kind: 'meter', value: 'contextLeft', count: 10, perRow: 10, sprites: ['hp0', 'hp1', 'hp2'], label: 'PLAYER', pulseBelow: 0.2 },
        { kind: 'counter', value: 'spend', icon: 'heartIcon', format: '-{v}', digits: 2 },
        { kind: 'box', shows: 'effort', sprite: 'miniWhip', sprites: { high: 'miniStar', max: 'miniStar' }, label: 'WHIP', x: 1, y: 4, drop: 2 },
        { kind: 'meter', value: 'limitsUsed', count: 8, perRow: 8, sprites: ['boss0', 'boss1', 'boss2'], label: 'ENEMY', pulseAbove: 0.9, drop: 3, wrap: true },
        { kind: 'box', shows: 'model', sprite: 'miniHead', sprites: { tier3: 'miniLord', tier4: 'miniLord' }, label: 'HUNTER', x: 1, y: 4, drop: 5 },
        { kind: 'counter', value: 'cacheSeconds', label: 'CANDLE', digits: 4, drop: 4 },
        { kind: 'map', drop: 6 },
      ],
      colors: { bg: 'black', box: 'barBox', text: 'white', label: 'barLabel', map: 'mapBlue', mapDot: 'mapDot' },
    },
    stamina: { x: 1, y: 2, radius: 4, full: 'ringFull', empty: 'ringEmpty', cold: 'ringCold', tagIcon: 'heartIcon', tagColor: '#f0e8d8', tagColdColor: '#8c84a0' },
    lineup: { ground: 'lineup', ink: '#f0e8d8', dim: '#b0a8c8', mark: '#ff8c98' },
    message: { bg: '#0c0c30', ink: '#f8f0e0' },
  },
  text: {
    idle: 'The hunter dozes by a flickering candelabra.',
    thinking: 'A bat circles while the hunter plots a route...',
    reading: 'Pages turn in the Long Library.',
    editing: 'The whip cracks candles and breaks the walls.',
    shell: 'The clock ticks and a tower gear grinds on.',
    agents: 'Familiars fly off on errands: bat, sword and fairy.',
    toolSuccess: 'A skeleton rises and crumbles. A heart drops.',
    toolError: 'A Medusa head! Knocked back.',
    turnComplete: 'The whip cracks. The stage is clear.',
    milestone: 'The castle grows darker.',
    cacheCold: 'The candles go out. Back to the coffin.',
    limitWarning: 'Death himself appears.',
    compaction: 'The save room crystal restores you.',
    modelChange: 'A new hunter steps out of the mist.',
    effortChange: 'A new whip in hand.',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75). Two lines at most at 48 columns.
  milestones: [
    { level: 'ok', message: 'THE NIGHT IS YOUNG. {pct}% OF THE CASTLE EXPLORED.' },
    { level: 'warn', message: '{pct}% OF THE CASTLE EXPLORED. THE CANDLES BURN LOWER. MIND YOUR STRENGTH.' },
    { level: 'orange', message: '{pct}% EXPLORED. THE CLOCK TOWER LOOMS. SEEK A SAVE ROOM SOON.' },
    { level: 'alert', message: 'THE MOON TURNS RED. {pct}% EXPLORED. DANGEROUS GROUND: FIND A STOPPING POINT.' },
    { level: 'critical', message: 'A MISERABLE LITTLE PILE OF TOKENS! {pct}% SPENT. SAVE YOUR PROGRESS AND /clear.' },
  ],
  messages: {
    cacheCold: 'THE CANDLES GO OUT. THE CACHE SLEEPS IN ITS COFFIN. NEXT MESSAGE PAYS FULL PRICE.',
    limitWarning: 'DEATH APPROACHES. {name} AT {pct}%.',
    compaction: 'You rest in the save room: context compacted, PLAYER restored.',
    modelChange: '{name} emerges from the mist.',
    effortChange: 'You got the {weapon}!',
  },
}
