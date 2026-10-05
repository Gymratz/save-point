// "Symphony of the Tokens": a gothic vampire-hunter homage. Every sprite is drawn fresh for this theme in that 16-bit castle style.
//
// The model is the hunter (a young hunter, the whip hunter, the dhampir lord for
// Opus, the lord of the night above him, a thief for anything else), effort is
// the whip, context is the PLAYER bar and the descent through the castle (the
// gate, the clock tower, the throne room) as the moon turns to blood, the cache
// is the candlelight, cents are hearts, and rate limits are the ENEMY bar.
//
// The hunters share one 16x16 build recolored per tier; the lord is a 24x26
// form of his own. Props and scenery name their colors through a `legend`.

import { at, hero, loop, once, weapon } from './kit'
import type { Actor, Sprite, Theme } from './types'

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
  W: '#f8f8f8', // cravat
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
  clockLo: '#8c8470',
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
  '.....pPPPPPPPWWss.......',
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
  8: '.....pPPPPPPPWWssYO.....',
  13: '.YCCCCCpPYOOOYOOOOY.....',
  14: '.YCCCCCCCYOOYYYYYYY.....',
})
const LORD_SLEEP = edit(LORD, { 5: '......pPPPPPSSSSsSS.....' })

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

const FLAME = { f: 'flame', F: 'flameCore', w: 'wax', i: 'iron', I: 'ironHi', m: 'smoke' }
const STONE = { s: 'stone', S: 'stoneHi', q: 'stoneLo', k: 'crack' }
const BAT = { k: 'batBody', K: 'batWing', e: 'batEye' }
const BRASS = { b: 'brass', B: 'brassHi', q: 'brassLo' }
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
const CANDELABRA = (flames: [string, string]) => [
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
const WALL = [
  'SSSSqSSSSq',
  'ssssqssssq',
  'ssssqssssq',
  'qqqqqqqqqq',
  'SSqSSSSqSS',
  'ssqssssqss',
  'ssqssssqss',
  'qqqqqqqqqq',
  'SSSSqSSSSq',
  'ssssqssssq',
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

  // Whips, pointing right from the hand (the lash on rows 2 and 3)
  whipLeather: S(['', 'GG', 'GGvvvvvvvvvvvvv', 'GGwwwwwwwwwwwwwx', 'GG', '']),
  whipChain: S(['', 'GG', 'GGvwvwvwvwvwvwvwvwvw', 'GGwvwvwvwvwvwvwvwvwvx', 'GG', '']),
  whipStar: S([
    '.....................x...',
    'GG..................xXXx.',
    'GGvwvwvwvwvwvwvwvwvwXXXXx',
    'GGwvwvwvwvwvwvwvwvwvXXXXx',
    'GG..................xXXx.',
    '.....................x...',
  ]),
  whipFlame: S([
    '......x.....x.....x..x...',
    'GG...xX....xX....xXXxXx..',
    'GGvwvXvwvwvXvwvwvXXXXXXx.',
    'GGwvwvwvwvwvwvwvwvXXXXXXx',
    'GG................xXXXx..',
    '...................x.x...',
  ]),
  vkAura: S([
    '..a.a.a.a.a.a.a.a.a.a.a.a..',
    '.a.......................a.',
    'a.........................a',
    '...........................',
    '...........................',
    'a.........................a',
    '.a.......................a.',
    '..a.a.a.a.a.a.a.a.a.a.a.a..',
  ], { a: 'vkAura' }),

  // Candles
  candle1: S(['..f..', '.fFf.', '.fFf.', '..w..', '.www.', '.www.', '.www.', 'iIIIi', '.iIi.', '..i..'], FLAME),
  candle2: S(['...f.', '..fF.', '.fFf.', '..w..', '.www.', '.www.', '.www.', 'iIIIi', '.iIi.', '..i..'], FLAME),
  candelabra1: S(CANDELABRA(['.f..f..f.', 'fFf.F.fFf']), FLAME),
  candelabra2: S(CANDELABRA(['f...f...f', '.Ff.F.fF.']), FLAME),
  candelabraOut: S(CANDELABRA(['.m.....m.', 'm...m...m']), FLAME),
  burst1: S(['...f...', '.f.F.f.', '..FFF..', 'fFFwFFf', '..FFF..', '.f.F.f.', '...f...'], FLAME),
  burst2: S(['f..f..f', '.......', '..f.f..', 'f.....f', '..f.f..', '.......', 'f..f..f'], FLAME),
  heartDrop: S(['hh.hh', 'hHhhh', '.hhh.', '..h..'], { h: 'heart', H: 'heartHi' }),

  // Breakable wall and what hides inside it
  wall: S(WALL, STONE),
  wallCracked: S(edit(WALL, { 1: 'sssskqssss', 2: 'ssskkqksss', 5: 'ssqskkkqss', 6: 'ssqkssskss', 9: 'sskssqsssq' }), STONE),
  wallBroken: S(['', '', '', '', '', 'S...q.....', 'sq.....S..', 'qq.s..qSq.', 'SSqsq.sqqS', 'qqqqqqqqqq'], STONE),
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
  gearA: S([
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
  ], BRASS),
  gearB: S([
    '.bb.....bb.',
    '.bbbbbbbbb.',
    '..bBBBBBb..',
    '.bBBqqqBBb.',
    '.bBq...qBb.',
    '.bBq...qBb.',
    '.bBq...qBb.',
    '.bBBqqqBBb.',
    '..bBBBBBb..',
    '.bbbbbbbbb.',
    '.bb.....bb.',
  ], BRASS),
  pendulumL: S(['...b', '..b.', '..b.', '.b..', '.b..', 'BBb.', 'BBb.'], BRASS),
  pendulumR: S(['b...', '.b..', '.b..', '..b.', '..b.', '.bBB', '.bBB'], BRASS),

  // Bats and familiars
  bat1: S(['K.......K', 'KK.....KK', 'KKKk.kKKK', '.KkkekkK.', '....k....'], BAT),
  bat2: S(['...k.k...', '.KkkekkK.', 'KKKkkkKKK', 'K.......K'], BAT),
  famSword: S(['...y.......', 'GGyYsssssss', '...y.......'], { y: 'Y', Y: 'y', s: 'steel' }),
  famFairy1: S(['a...a', '.aWa.', '..p..', '.apa.', 'a...a'], { a: 'wing', W: 'steelHi', p: 'fairy' }),
  famFairy2: S(['.....', 'aaWaa', '..p..', 'aapaa', '.....'], { a: 'wing', W: 'steelHi', p: 'fairy' }),

  // Foes
  skeleton: S([
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
  ], { b: 'bone', B: 'boneLo', k: 'crack' }),
  medusa1: S(['g.g.g.g.', '.gGgGgg.', 'gGsssGg.', '.gEsssg.', 'gGssssG.', '.gsRRs..', '..gssg..'], { g: 'snake', G: 'snakeHi', s: 'medusa', E: 'medusaEye', R: 'medusaMouth' }),
  medusa2: S(['.g.g.g.g', 'g.gGgGg.', '.gsssGgg', 'gGEsssg.', '.gssssGg', '..sRRsg.', '..gssg..'], { g: 'snake', G: 'snakeHi', s: 'medusa', E: 'medusaEye', R: 'medusaMouth' }),
  death1: S(DEATH, { S: 'steel', h: 'woodLo', r: 'robeLo', R: 'robe', b: 'bone', k: 'deathEye' }),
  death2: S(edit(DEATH, { 5: '.rRbkbkRr.....h.', 13: '.rRRRRRRRRr...h.', 14: '.r.rRRRr.r....h.' }), { S: 'steel', h: 'woodLo', r: 'robeLo', R: 'robe', b: 'bone', k: 'deathEye' }),

  // Rewards and rooms
  orb: S(['.oOOo.', 'oOWOOo', 'OWOOOO', 'OOOOOO', 'oOOOOo', '.oOOo.'], { o: 'orbLo', O: 'orb', W: 'steelHi' }),
  whipOrb: S(['..yyy..', '.yYYYy.', 'yYwwwYy', 'yYw.vYy', 'yYvvwYy', '.yYYYy.', '..yyy..'], { y: 'y', Y: 'Y' }),
  spark: S(['..W..', '..W..', 'WWYWW', '..W..', '..W..'], { W: 'steelHi' }),
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
  saveBeam1: S(Array.from({ length: 26 }, (_, k) => (k % 4 < 2 ? 'g....g.........g....g' : '..........g..........')), { g: 'saveGlow' }),
  saveBeam2: S(Array.from({ length: 26 }, (_, k) => (k % 4 < 2 ? '..........g..........' : 'g....g.........g....g')), { g: 'saveGlow' }),
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
  sweat: S(['.d.', 'ddd', '.d.'], { d: 'sweat' }),

  // Scenery
  floorBrick: S(['SSSSSSSq', 'sssssssq', 'qqqqqqqq', 'SSSqSSSS'], STONE),
  moonPale: S(MOON_ROWS, MOON('moonA', 'moonB')),
  moonAmber: S(MOON_ROWS, MOON('amberA', 'amberB')),
  moonBlood: S(MOON_ROWS, MOON('bloodA', 'bloodB')),
  batsFar: S(['k.k.......', '.k........', '......k.k.', '.......k..', '...k.k....', '....k.....'], { k: 'castle' }),
  castle: S([
    '.............c..............',
    '............ccc.............',
    '............ccc.............',
    '...c.......ccccc.......c....',
    '..ccc......ccwcc......ccc...',
    '..ccc......ccccc......ccc...',
    '.ccccc.....ccccc.....ccccc..',
    '.ccwcc....c.ccc.c....ccwcc..',
    '.ccccc....ccccccc....ccccc..',
    '.ccccc.c.cccwcwccc.c.ccccc..',
    '.ccccccccccccccccccccccccc..',
    '.ccccccwcccccccccccwcccccc.c',
    'cccccccccccccccccccccccccccc',
    'ccwccccccccc...ccccccccwcccc',
    'cccccccccccc...ccccccccccccc',
    'ccccccccccc.....ccccccccccwc',
    'cwcccccccccc...ccccccccccccc',
    'cccccccccccc...ccccccccccccc',
    'ccccccccccc.....cccccccccccc',
    'cccccccccc.......ccccccccccc',
    'cccccccccc.......ccccccccccc',
    'cccccccccc.......ccccccccccc',
  ], { c: 'castle', w: 'window' }),
  clockFace: S([
    '.....bbbbbb.....',
    '...bbccccccbb...',
    '..bcccckccccb...',
    '.bccccckcccccb..',
    '.bccqccckcccqcb.',
    'bcccccccKccccccb',
    'bcccccccKccccccb',
    'bcqcccccKkkkkqcb',
    'bcccccccccccccb.',
    'bccccccccccccccb',
    '.bccqcccccccqcb.',
    '.bcccccccccccccb',
    '..bccccqcccccb..',
    '...bbccccccbb...',
    '.....bbbbbb.....',
  ], { b: 'brassLo', c: 'clock', q: 'clockLo', k: 'crack', K: 'crack' }),
  throne: S([
    '...y....y...',
    '..yRy..yRy..',
    '..yRRyyRRy..',
    '..yRRRRRRy..',
    '..yRrRRrRy..',
    '..yRRRRRRy..',
    '..yRRRRRRy..',
    '..yRRRRRRy..',
    '.yyyyyyyyyy.',
    '.yrrrrrrrry.',
    'yyyyyyyyyyyy',
    '.y........y.',
    '.y........y.',
    '.y........y.',
    'yyy......yyy',
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
  candleIcon: S(['.f.', '.F.', 'www', 'www', 'www', 'iIi'], FLAME),
  miniWhip: S(['.vvv.', 'w...v', 'w.vv.', 'w.w.x', '.ww..', 'GG...', 'GG...']),
  miniHead: S(['.hHH.', 'DDDDD', 'hHSES', 'hSSSS', '.hSS.', 'tTAT.', 'TTATT']),
  miniLord: S(['.pPP.', 'pPPSS', 'pPSES', 'pPSSS', 'pPWW.', 'YCOOY', 'YCOOY']),
}

// ---------------------------------------------------------------------------
// Frames: actors are placed relative to the hero's top-left (see kit.ts).
// ---------------------------------------------------------------------------

const ink = '#f0e8d8'
const gold = '#f8d040'
const blood = '#f03850'

/** The whip cracked from the hunter's hand. */
const lash = () => weapon(16, 6)

const HURT_A = { T: 'hurtA', t: 'hurtB', A: 'hurtA', H: 'hurtB', O: 'hurtA', o: 'hurtB' }
const HURT_B = { T: 'hurtB', t: 'hurtB', A: 'hurtA', H: 'hurtA', O: 'hurtB', o: 'hurtB' }
const GLOW = { T: 'glowA', t: 'glowB', A: 'glowA', O: 'glowA', o: 'glowB', P: 'glowA' }

const TARGET = { x: 20, y: 2 }
const CANDELABRA_AT = { x: 20, y: 0 }
const COFFIN = { x: -2, y: 9 }
const coffinShut = (): Actor[] => [at('coffinLid', COFFIN.x, COFFIN.y), at('coffinBase', COFFIN.x, COFFIN.y + 4)]
const coffinPeek = (): Actor[] => [at('coffinLid', COFFIN.x, COFFIN.y - 2), at('coffinEyes', COFFIN.x + 4, COFFIN.y + 2), at('coffinBase', COFFIN.x, COFFIN.y + 4)]

const states: Theme['states'] = {
  idle: loop(
    { actors: [hero('sleep'), at('candelabra1', CANDELABRA_AT.x, CANDELABRA_AT.y)], texts: [{ text: 'z', x: 14, y: -2, color: ink }], hold: 3 },
    { actors: [hero('sleep'), at('candelabra2', CANDELABRA_AT.x, CANDELABRA_AT.y)], texts: [{ text: 'z', x: 15, y: -4, color: ink }], hold: 3 },
    { actors: [hero('sleep'), at('candelabra1', CANDELABRA_AT.x, CANDELABRA_AT.y)], texts: [{ text: 'Z', x: 16, y: -6, color: ink }], hold: 3 },
    { actors: [hero('sleep'), at('candelabra2', CANDELABRA_AT.x, CANDELABRA_AT.y)], hold: 3 },
  ),
  thinking: loop(
    { actors: [hero('stand'), at('bat1', 20, -6)], texts: [{ text: '.', x: 15, y: -2, color: ink }], hold: 2 },
    { actors: [hero('stand'), at('bat2', 24, -9)], texts: [{ text: '..', x: 15, y: -2, color: ink }], hold: 2 },
    { actors: [hero('stand'), at('bat1', 20, -12)], texts: [{ text: '...', x: 15, y: -2, color: ink }], hold: 2 },
    { actors: [hero('walk'), at('bat2', 15, -9)], texts: [{ text: '?', x: 16, y: -2, color: gold }], hold: 2 },
  ),
  reading: loop(
    { actors: [hero('stand'), at('lectern', 20, 6), at('tome1', 20, 2)], hold: 2 },
    { actors: [hero('stand'), at('lectern', 20, 6), at('tome2', 20, 2)], texts: [{ text: '~', x: 24, y: -2, color: gold }], hold: 1 },
    { actors: [hero('walk'), at('lectern', 20, 6), at('tome1', 20, 2)], texts: [{ text: '~', x: 25, y: -6, color: gold }, { text: '*', x: 22, y: -2, color: ink }], hold: 2 },
    { actors: [hero('stand'), at('lectern', 20, 6), at('tome2', 20, 2)], texts: [{ text: '*', x: 23, y: -6, color: ink }], hold: 1 },
  ),
  editing: loop(
    { actors: [hero('stand'), at('candle1', TARGET.x, TARGET.y)], hold: 2 },
    { actors: [hero('itemGet'), at('candle2', TARGET.x, TARGET.y)], hold: 1 },
    { actors: [hero('attack'), at('candle1', TARGET.x, TARGET.y), lash()], hold: 1 },
    { actors: [hero('attack'), at('burst1', TARGET.x - 1, TARGET.y + 1)], hold: 1 },
    { actors: [hero('stand'), at('burst2', TARGET.x - 1, TARGET.y + 1)], hold: 1 },
    { actors: [hero('stand'), at('heartDrop', TARGET.x, TARGET.y + 8)], hold: 1 },
    { actors: [hero('stand'), at('heartDrop', TARGET.x, TARGET.y + 12)], hold: 2 },
    { actors: [hero('stand'), at('wall', TARGET.x, 6)], hold: 1 },
    { actors: [hero('attack'), at('wall', TARGET.x, 6), lash()], hold: 1 },
    { actors: [hero('attack'), at('wallCracked', TARGET.x, 6), lash()], hold: 1 },
    { actors: [hero('stand'), at('wallBroken', TARGET.x, 6), at('potRoast', TARGET.x + 1, 11)], hold: 3 },
  ),
  shell: loop(
    { actors: [hero('stand'), at('pendulumL', 24, -12, { fixed: true }), at('gearA', 20, 5), at('gearB', 28, -6, { fixed: true })], texts: [{ text: 'TICK', x: 18, y: -14, color: gold }], hold: 2 },
    { actors: [hero('walk'), at('pendulumR', 26, -12, { fixed: true }), at('gearB', 20, 5), at('gearA', 28, -6, { fixed: true })], texts: [{ text: 'TOCK', x: 30, y: -14, color: gold }], hold: 2 },
  ),
  agents: loop(
    { actors: [hero('itemGet'), at('bat1', 8, -6), at('famSword', 14, 2), at('famFairy1', 12, 6)], hold: 2 },
    { actors: [hero('itemGet'), at('bat2', 16, -10), at('famSword', 20, 0), at('famFairy2', 18, 10)], hold: 2 },
    { actors: [hero('itemGet'), at('bat1', 24, -14), at('famSword', 28, -2), at('famFairy1', 24, 8)], hold: 2 },
    { actors: [hero('stand'), at('bat2', 32, -16), at('famSword', 36, -4), at('famFairy2', 30, 6)], hold: 2 },
    { actors: [hero('stand')], texts: [{ text: '...', x: 16, y: -2, color: ink }], hold: 2 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop(
    { actors: [...coffinShut(), at('candelabraOut', CANDELABRA_AT.x, CANDELABRA_AT.y)], texts: [{ text: 'z', x: 10, y: 4, color: '#8c84a0' }], hold: 4 },
    { actors: [...coffinShut(), at('candelabraOut', CANDELABRA_AT.x, CANDELABRA_AT.y)], texts: [{ text: 'Z', x: 11, y: 2, color: '#8c84a0' }], hold: 4 },
    { actors: [...coffinPeek(), at('candelabraOut', CANDELABRA_AT.x, CANDELABRA_AT.y)], hold: 2 },
  ),
}

const SIGH = 'What is this? A miserable little pile of reads.'
const sweat = at('sweat', 12, -1)
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), at('lectern', 20, 6), at('tome1', 20, 2), sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), at('lectern', 20, 6), at('tome2', 20, 2), sweat], hold: 1, caption: SIGH },
    { actors: [hero('sleep'), at('lectern', 20, 6), at('tome1', 20, 2), sweat], texts: [{ text: '~sigh~', x: 16, y: -2, color: ink }], hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [hero('stand'), at('pendulumL', 25, 0), at('gearA', 20, 5), sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), at('pendulumR', 27, 0), at('gearB', 20, 5), sweat], hold: 2, caption: SIGH },
    { actors: [hero('sleep'), at('pendulumL', 25, 0), at('gearA', 20, 5), sweat], texts: [{ text: '~sigh~', x: 16, y: -2, color: ink }], hold: 3, caption: SIGH },
  ),
}

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('stand'), at('skeleton', TARGET.x + 6, 2)], hold: 1 },
    { actors: [hero('itemGet'), at('skeleton', TARGET.x + 4, 2)], hold: 1 },
    { actors: [hero('attack'), at('skeleton', TARGET.x + 2, 2), lash()], hold: 1 },
    { actors: [hero('attack'), at('burst1', TARGET.x + 2, 5), lash()], hold: 1 },
    { actors: [hero('stand'), at('burst2', TARGET.x + 2, 5)], hold: 1 },
    { actors: [hero('stand'), at('heartDrop', TARGET.x + 3, 12)], hold: 2 },
  ),
  toolError: once(
    { actors: [hero('stand'), at('medusa1', 30, -4)], hold: 1 },
    { actors: [hero('stand'), at('medusa2', 24, 2)], hold: 1 },
    { actors: [hero('stand'), at('medusa1', 16, -2)], hold: 1 },
    { actors: [hero('walk', -2, -3, HURT_A), at('medusa2', 10, -8)], hold: 1 },
    { actors: [hero('walk', -4, -4, HURT_B), at('medusa1', 4, -4)], hold: 1 },
    { actors: [hero('stand', -5, -2, HURT_A)], hold: 1 },
    { actors: [hero('stand', -5, 0, HURT_B)], hold: 1 },
    { actors: [hero('stand', -4, 0)], hold: 1 },
  ),
  turnComplete: once(
    { actors: [hero('itemGet')], hold: 1 },
    { actors: [hero('attack'), lash(), at('spark', 38, 4)], hold: 2 },
    { actors: [hero('stand'), at('orb', 5, -14)], hold: 1 },
    {
      actors: [hero('itemGet'), at('orb', 11, -8)],
      texts: [{ text: '*', x: 8, y: -10, color: gold }, { text: 'CLEAR!', x: 19, y: -6, color: gold }],
      hold: 2,
    },
    {
      actors: [hero('itemGet'), at('orb', 11, -8)],
      texts: [{ text: '*', x: 17, y: -12, color: gold }, { text: 'CLEAR!', x: 19, y: -6, color: gold }],
      hold: 3,
    },
  ),
  milestone: once({ actors: [hero('stand')], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [hero('sleep'), at('candelabra1', CANDELABRA_AT.x, CANDELABRA_AT.y)], hold: 2 },
    { actors: [hero('sleep'), at('candelabraOut', CANDELABRA_AT.x, CANDELABRA_AT.y)], hold: 2 },
    { actors: [...coffinShut(), at('candelabraOut', CANDELABRA_AT.x, CANDELABRA_AT.y)], message: 'cacheCold', hold: 12 },
  ),
  limitWarning: once(
    { actors: [hero('stand', 0, 0, { T: 'hurtB', O: 'hurtB' }), at('death1', 22, -2, { fixed: true })], message: 'limitWarning', hold: 3 },
    { actors: [hero('stand'), at('death2', 21, -3, { fixed: true })], message: 'limitWarning', hold: 3 },
    { actors: [hero('stand', 0, 0, { T: 'hurtB', O: 'hurtB' }), at('death1', 20, -2, { fixed: true })], message: 'limitWarning', hold: 3 },
    { actors: [hero('walk', -1), at('death2', 19, -3, { fixed: true })], message: 'limitWarning', hold: 6 },
  ),
  compaction: once(
    { actors: [at('saveCrystal', 22, 3), hero('walk')], hold: 1, caption: 'compaction' },
    { actors: [at('saveBeam1', -3, -10), at('saveCrystal', 22, 3), hero('itemGet')], hold: 2, caption: 'compaction' },
    { actors: [at('saveBeam2', -3, -10), at('saveCrystal', 22, 3), hero('itemGet', 0, 0, GLOW)], hold: 2, caption: 'compaction' },
    { actors: [at('saveBeam1', -3, -10), at('saveCrystal', 22, 3), hero('itemGet')], hold: 2, caption: 'compaction' },
    { actors: [at('saveCrystal', 22, 3), hero('stand')], hold: 2, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [hero('stand'), at('mist1', -1, 6)], hold: 1 },
    { actors: [at('mist1', -1, 4), at('mist2', 2, 0)], hold: 2 },
    { actors: [at('mist2', -1, 4), at('mist1', 1, 8)], hold: 1 },
    { actors: [hero('itemGet', 0, 0, GLOW), at('mist2', -1, 8)], hold: 1 },
    { actors: [hero('itemGet')], hold: 6, caption: 'modelChange' },
  ),
  effortChange: once(
    { actors: [hero('stand'), at('whipOrb', 14, -12)], hold: 1 },
    { actors: [hero('stand'), at('whipOrb', 14, -6)], hold: 1 },
    { actors: [hero('itemGet', 0, 0, GLOW), at('spark', 13, -6)], hold: 2 },
    {
      actors: [hero('attack'), lash()],
      texts: [{ text: '*', x: 22, y: 2, color: gold }, { text: '*', x: 34, y: 4, color: gold }],
      hold: 5,
      caption: 'effortChange',
    },
  ),
}

const HUNTER_POSES = { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'sleep' }
const LORD_POSES = { stand: 'lordStand', walk: 'lordWalk', attack: 'lordAttack', itemGet: 'lordItemGet', sleep: 'lordSleep' }
/** The lord's whip hand: further out and higher than a hunter's. */
const LORD_FORM = { poses: LORD_POSES, dx: -7, dy: -10, lift: 10, hand: { x: 1, y: -5 } }

export const castlevania: Theme = {
  id: 'castlevania',
  name: 'Symphony of the Tokens',
  description: 'Gothic vampire-hunter homage: a whip per effort, a hunter per model, and the moon turns red as the castle closes in',
  version: '1.0.0',
  palette: {
    dark: { accent: '#68b8f8', gold: '#f0c040', red: '#f03850', label: '#c8a0e8', dim: '#8c84a0', text: '#f0ecf8' },
    light: { accent: '#1c5cb0', gold: '#9c6c00', red: '#b01828', label: '#6c2c9c', dim: '#6c6480', text: '#1c1424' },
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
    'Next message': 'Candlelight',
    Tokens: 'Bestiary',
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
      decor: [
        { sprite: 'moonPale', x: -3, y: 2, maxPercent: 44 },
        { sprite: 'moonAmber', x: -3, y: 2, minPercent: 45, maxPercent: 69 },
        { sprite: 'moonBlood', x: -3, y: 2, minPercent: 70 },
        { sprite: 'batsFar', x: -17, y: 3, maxPercent: 69 },
        { sprite: 'castle', x: -1, y: 14, maxPercent: 34 },
        { sprite: 'clockFace', x: -18, y: 4, minPercent: 35, maxPercent: 69, minColumns: 56 },
        { sprite: 'gearA', x: -2, y: 22, minPercent: 35, maxPercent: 69, minColumns: 56 },
        { sprite: 'banner', x: -17, y: 0, minPercent: 70, minColumns: 56 },
        { sprite: 'throne', x: -2, y: 21, minPercent: 70, minColumns: 56 },
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
    bar: {
      widgets: [
        { kind: 'meter', value: 'contextLeft', count: 10, perRow: 10, sprites: ['hp0', 'hp1', 'hp2'], label: 'PLAYER', pulseBelow: 0.2 },
        { kind: 'counter', value: 'spend', icon: 'heartIcon', format: '-{v}', digits: 2 },
        { kind: 'box', shows: 'effort', sprite: 'miniWhip', label: 'WHIP', x: 1, y: 4, drop: 2 },
        { kind: 'meter', value: 'limitsLeft', count: 8, perRow: 8, sprites: ['boss0', 'boss1', 'boss2'], label: 'ENEMY', pulseBelow: 0.2, drop: 3 },
        { kind: 'counter', value: 'cacheSeconds', icon: 'candleIcon', label: 'TIME', digits: 4, drop: 4 },
        { kind: 'box', shows: 'model', sprite: 'miniHead', sprites: { tier3: 'miniLord', tier4: 'miniLord' }, label: 'HERO', x: 1, y: 4, drop: 5 },
        { kind: 'map', drop: 6 },
      ],
      colors: { bg: 'black', box: 'barBox', text: 'white', label: 'barLabel', map: 'mapBlue', mapDot: 'mapDot' },
    },
    stamina: { x: 1, y: 2, radius: 4, full: 'ringFull', empty: 'ringEmpty', cold: 'ringCold', tagIcon: 'heartIcon', tagColor: '#f0e8d8', tagColdColor: '#8c84a0' },
    lineup: { ground: 'lineup', ink: '#f0e8d8', dim: '#b0a8c8', mark: '#ff6070' },
    message: { bg: '#0c0c30', ink: '#f8f0e0' },
  },
  text: {
    idle: 'The hunter dozes by a flickering candelabra.',
    thinking: 'A bat circles while the hunter plots a route...',
    reading: 'Pages turn in the Long Library.',
    editing: 'The whip cracks candles and breaks the walls.',
    shell: 'The clock tower gears grind on.',
    agents: 'Familiars fly off on errands: bat, sword and fairy.',
    toolSuccess: 'A skeleton crumbles. A heart drops.',
    toolError: 'A Medusa head! Knocked back.',
    turnComplete: 'The whip cracks. The stage is clear.',
    milestone: 'The castle grows darker.',
    cacheCold: 'The candles go out. Back to the coffin.',
    limitWarning: 'Death himself appears.',
    compaction: 'The save room crystal restores you.',
    modelChange: 'A new hunter steps out of the mist.',
    effortChange: 'A whip upgrade! The lash grows stronger.',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: 'THE NIGHT IS YOUNG. {pct}% OF THE CASTLE EXPLORED.' },
    { level: 'warn', message: '{pct}% OF THE CASTLE EXPLORED. THE CANDLES BURN LOWER. MIND YOUR STRENGTH.' },
    { level: 'orange', message: '{pct}% EXPLORED. THE CLOCK TOWER LOOMS. SEEK A SAVE ROOM SOON.' },
    { level: 'alert', message: 'THE MOON TURNS RED. {pct}% EXPLORED. DANGEROUS GROUND: FIND A STOPPING POINT.' },
    { level: 'critical', message: 'WHAT IS A CONTEXT? A MISERABLE LITTLE PILE OF TOKENS! {pct}% SPENT. SAVE YOUR PROGRESS AND /clear.' },
  ],
  messages: {
    cacheCold: 'THE CANDLES GO OUT. THE CACHE SLEEPS IN ITS COFFIN. THE NEXT MESSAGE PAYS FULL PRICE.',
    limitWarning: 'DEATH APPROACHES. {name} AT {pct}%.',
    compaction: 'You rest at the save room. PLAYER restored.',
    modelChange: '{name} emerges from the mist.',
    effortChange: 'You got the {weapon}!',
  },
}
