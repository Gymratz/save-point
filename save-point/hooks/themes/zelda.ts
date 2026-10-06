// "The Legend of Context": an NES-overworld homage. Every sprite is drawn fresh
// for this theme in that 8-bit style.
//
// The model is the hero's tunic (green, blue, the red and purple champions),
// effort is the sword, context is hearts, the cache is the stamina ring, cents
// are rupees.
//
// Sprites are rows of characters; each character is a key of `pixels` below
// (so 'G' is the tunic). Hero tiers and swords recolor by swapping keys.

import { at, hero, loop, once, oneOf, weapon } from './kit'
import { rotate } from './pixel'
import type { Actor, HeroTier, Theme } from './types'

const pixels = {
  // Hero
  G: '#5cb82c', // tunic
  g: '#2e7a16', // tunic shade
  S: '#fcb87c', // skin
  H: '#a8501c', // hair, boots
  K: '#1c1c1c', // eyes
  W: '#fcfcfc', // white
  b: '#6a360c', // belt
  L: '#3c64d8', // shield
  l: '#c8c8e0', // shield rim
  // Tier tunics
  blueT: '#5c84f8',
  blueS: '#2848b0',
  redT: '#e04030',
  redS: '#9c1c10',
  royalT: '#9050e0',
  royalS: '#5828a0',
  // The champion's armor
  armor: '#d8dcf0',
  armorShade: '#8088b0',
  hoodT: '#8c8c8c',
  hoodS: '#545454',
  hurtA: '#fcfcfc',
  hurtB: '#fc7c00', // not a tunic color, so the flash shows on every tier
  hurtC: '#c84c0c',
  // Scenery
  ground: '#fcd8a8',
  v: '#3c9c28', // leaf
  V: '#1e6414', // leaf shade
  w: '#8c5a2c', // wood
  k: '#a05a2c', // rock
  q: '#5c3010', // rock shade
  r: '#d82800', // flame / potion
  o: '#fc7c00',
  y: '#fcd000',
  m: '#8c8c8c', // smoke
  t: '#6c6c6c', // torch stand
  // Creatures and items
  z: '#3cbc3c', // slime
  Z: '#1c7c1c',
  c: '#e8e8e8', // puff
  C: '#a8a8a8',
  x: '#9c5c1c', // chest
  X: '#5c3010',
  Y: '#f8c800', // gold
  j: '#b88800',
  p: '#fc74b4', // fairy
  a: '#c0e8fc',
  n: '#d8d8f8', // glass
  O: '#8cd0fc', // sweat
  h: '#d82800', // heart
  e: '#5c1c10', // empty heart
  u: '#80d010', // rupee
  U: '#2e8c0c',
  i: '#d0f8a0',
  // Swords
  P: '#704000', // hilt
  F: '#8c8c8c', // guard
  E: '#d8d8d8', // blade
  T: '#fcfcfc', // tip
  wood: '#b07030',
  woodDark: '#704010',
  steel: '#b4bcd4',
  steelDark: '#686890',
  magic: '#38c0fc',
  magicDark: '#1c60c0',
  master: '#7c9cfc',
  masterGuard: '#6030c0',
  aura: '#fcf080',
  // Status bar
  black: '#000000',
  barRed: '#f04830', // the bar's labels: the heart red is too dark for text on black
  boxBlue: '#2038ec',
  mapGrey: '#747474',
  staminaFull: '#5cd82c',
  staminaEmpty: '#28401c',
  staminaCold: '#6c6c6c',
}

const HEART = ['.hh..hh.', 'hhhhhhhh', 'hhhhhhhh', '.hhhhhh.', '..hhhh..', '...hh...']

/** A heart with `q` quarters filled, clockwise from the bottom left (two = the left half). */
function heart(q: number): { rows: string[] } {
  const order = (x: number, y: number) => (x < 4 ? (y >= 3 ? 0 : 1) : y < 3 ? 2 : 3)
  return { rows: HEART.map((row, y) => [...row].map((ch, x) => (ch === '.' ? '.' : order(x, y) < q ? 'h' : 'e')).join('')) }
}

// The champion (Opus and above): a winged helm, a bearded face, gold pauldrons,
// a crested shield and a cape in the tier's color. 20 by 22, feet level with
// the standard hero's, centered on it.
const CHAMPION = { A: 'armor', a: 'armorShade' }
const champ = (rows: string[]) => ({ rows, legend: CHAMPION })
const CH_HEAD = [
  '.W......YjjY......W.',
  'WW.....AAYYAA.....WW',
  'WWC...AAAAAAAA...CWW',
  '.WCC.AaAAAAAAaA.CCW.',
  '..CCaYYYYYYYYYYaCC..',
  '....aSSSSSSSSSSa....',
  '....aSKWSSSSWKSa....',
  '....aSSSSSSSSSSa....',
  '.....SHHSSSSHHS.....',
  '......HHHHHHHH......',
  '..gGYYYAHHHHAYYYGg..',
  '.gGYYjYAAHHAAYjYYGg.',
]
const CH_BODY = [
  'lllllaAAAYYAAAAaSSGg',
  'lYGYlaAAYYYYAAAaSSGg',
  'lGYGlaAAAYYAAAAaGGGg',
  'lGYGlbbbbYYbbbbbGGGg',
  'lGYGlaGGGGGGGGGaGGgg',
  '.lGl.GGGGGGGGGGGGGgg',
]
const CH_LEGS = ['..l.gGGGGg..gGGGGGgg', '...ggGaaa....aaaGgg.', '...g.aAAA....AAAa.g.', '....qqqqq..qqqqq....']
const CH_STRIDE = ['..l.gGGGGg..gGGGGGgg', '...ggGaaa...aaaaGgg.', '...g.aAAA...qqqqq.g.', '....qqqqq...........']

const sprites: Theme['sprites'] = {
  champStand: champ([...CH_HEAD, ...CH_BODY, ...CH_LEGS]),
  champWalk: champ([...CH_HEAD, ...CH_BODY, ...CH_STRIDE]),
  champAttack: champ([
    ...CH_HEAD,
    'lllllaAAAYYAAAAaGGGg',
    'lYGYlaAAYYYYAAAaGGGg',
    'lGYGlaAAAYYAAAAaGGGg',
    'lGYGlbbbbYYbbbbbGGGg',
    'lGYGlaGGGSSGGGGaGGgg',
    '.lGl.GGGGSSGGGGGGGgg',
    ...CH_LEGS,
  ]),
  champItemGet: champ([
    '.SS.....YjjY.....SS.',
    '.SS.W..AAYYAA..W.SS.',
    '.YY.W.AAAAAAAA.W.YY.',
    '.GgWCAaAAAAAAaACWgG.',
    '.GgCaYYYYYYYYYYaCgG.',
    '.Gg.aSSSSSSSSSSa.gG.',
    '.Gg.aSKWSSSSWKSa.gG.',
    '.Gg.aSSSSSSSSSSa.gG.',
    '.Gg..SHHSSSSHHS..gG.',
    '.GGY..HHHHHHHH..YGG.',
    '..gYYYYAHHHHAYYYYg..',
    '.gGYYjYAAHHAAYjYYGg.',
    '.gGGGaAAAYYAAAAaGGg.',
    'gGGGGaAAYYYYAAAaGGGg',
    'gGGGGaAAAYYAAAAaGGGg',
    'gGGGGbbbbYYbbbbbGGGg',
    'gGGGgaGGGGGGGGGaGGgg',
    '.gGg.GGGGGGGGGGGGGgg',
    ...CH_LEGS,
  ]),
  champSleep: champ([...CH_HEAD.slice(0, 6), '....aSKKSSSSKKSa....', ...CH_HEAD.slice(7), ...CH_BODY, ...CH_LEGS]),
  stand: {
    rows: [
      '......GGGG......',
      '....GGGGGGGG....',
      '...GGGGGGGGGG...',
      '..GGGGGGGGGGGGG.',
      '..HHHHHHHHHHHGGG',
      '.SHSSSSSSSSSHSGG',
      'SSSSKWSSWKSSSSSG',
      '.SSSSSSSSSSSSS..',
      '...SSSSSSSSSS...',
      '..GGGGGGGGGGGG..',
      'lLLGGGGGGGGGGSS.',
      'lLLGbbbbbbbbGSS.',
      'lLLGGGGGGGGGG...',
      '.l.GGGGGGGGGG...',
      '...HHHH..HHHH...',
      '..HHHHH..HHHHH..',
    ],
  },
  walk: {
    rows: [
      '......GGGG......',
      '....GGGGGGGG....',
      '...GGGGGGGGGG...',
      '..GGGGGGGGGGGGG.',
      '..HHHHHHHHHHHGGG',
      '.SHSSSSSSSSSHSGG',
      'SSSSKWSSWKSSSSSG',
      '.SSSSSSSSSSSSS..',
      '...SSSSSSSSSS...',
      '..GGGGGGGGGGGG..',
      'lLLGGGGGGGGGGSS.',
      'lLLGbbbbbbbbGSS.',
      'lLLGGGGGGGGGG...',
      '.l.GGGGGGGGGG...',
      '...HHHH...HHH...',
      '..HHHHH.........',
    ],
  },
  attack: {
    rows: [
      '......GGGG......',
      '....GGGGGGGG....',
      '...GGGGGGGGGG...',
      '..GGGGGGGGGGGGG.',
      '..HHHHHHHHHHHGGG',
      '.SHSSSSSSSSSHSGG',
      'SSSSKWSSWKSSSSSG',
      '.SSSSSSSSSSSSS..',
      '...SSSSSSSSSS...',
      '..GGGGGGGGGGGG..',
      'lLLGGGGGGGGGGG..',
      'lLLGbbbSSbbbG...',
      'lLLGGGGSSGGGG...',
      '.l.GGGGGGGGGG...',
      '...HHHH..HHHH...',
      '..HHHHH..HHHHH..',
    ],
  },
  itemGet: {
    rows: [
      '......GGGG......',
      'SS..GGGGGGGG..SS',
      'SS.GGGGGGGGGG.SS',
      '.GGGGGGGGGGGGGG.',
      '.GHHHHHHHHHHHGG.',
      '.GHSSSSSSSSSHGG.',
      '..SSKWSSWKSSSS..',
      '...SSSSSSSSSS...',
      '....SSSSSSSS....',
      '..GGGGGGGGGGGG..',
      '...GGGGGGGGGG...',
      '...GbbbbbbbbG...',
      '...GGGGGGGGGG...',
      '...GGGGGGGGGG...',
      '...HHHH..HHHH...',
      '..HHHHH..HHHHH..',
    ],
  },
  sleep: {
    rows: [
      '......GGGG......',
      '....GGGGGGGG....',
      '...GGGGGGGGGG...',
      '..GGGGGGGGGGGGG.',
      '..HHHHHHHHHHHGGG',
      '.SHSSSSSSSSSHSGG',
      'SSSSKKSSKKSSSSSG',
      '.SSSSSSSSSSSSS..',
      '...SSSSSSSSSS...',
      '..GGGGGGGGGGGG..',
      'lLLGGGGGGGGGGSS.',
      'lLLGbbbbbbbbGSS.',
      'lLLGGGGGGGGGG...',
      '.l.GGGGGGGGGG...',
      '..HHHHHHHHHHHH..',
      '..HHHH....HHHH..',
    ],
  },
  // Facing right, for an enemy at his side: standing, the lunge, and the lunge
  // with the sword arm low (a stab down to the right). The lunges are two pixels
  // wider on the left: the step forward is in the sprite.
  side: {
    rows: [
      '......GGGG......',
      '....GGGGGGGG....',
      '...GGGGGGGGGG...',
      '.GGGGGGGGGGGG...',
      'GGGGHHHHHHHHH...',
      'GGg.HHHSSSSSS...',
      '.g..HSHSSSWKS...',
      '....HSSSSSSSSS..',
      '.....SSSSSSSS...',
      '....GGGGGGGG....',
      '...GGGlLLLlGSS..',
      '...GGblLLLlbSS..',
      '...GGGlLLLlG....',
      '...GGGGlLlGG....',
      '....HHH..HHH....',
      '....HHHH.HHHH...',
    ],
  },
  thrust: {
    rows: [
      '.........GGGG.....',
      '.......GGGGGGGG...',
      '......GGGGGGGGGG..',
      '....GGGGGGGGGGGG..',
      '...GGGGHHHHHHHHH..',
      '..GGg..HHHSSSSSS..',
      '.......HSHSSSWKS..',
      '.......HSSSSSSSSS.',
      '........SSSSSSSS..',
      '.......GGGGGGGG...',
      '......GGGlLLLlGGSS',
      '......GGblLLLlGGSS',
      '......GGGlLLLl....',
      '.....GGGGGlLlGG...',
      '....HHH.....HHH...',
      '...HHHH.....HHHH..',
    ],
  },
  thrustLow: {
    rows: [
      '.........GGGG.....',
      '.......GGGGGGGG...',
      '......GGGGGGGGGG..',
      '....GGGGGGGGGGGG..',
      '...GGGGHHHHHHHHH..',
      '..GGg..HHHSSSSSS..',
      '.......HSHSSSWKS..',
      '.......HSSSSSSSSS.',
      '........SSSSSSSS..',
      '.......GGGGGGGG...',
      '......GGGlLLLlG...',
      '......GGblLLLlGG..',
      '......GGGlLLLlGSS.',
      '.....GGGGGlLlG.SS.',
      '....HHH.....HHH...',
      '...HHHH.....HHHH..',
    ],
  },
  champSide: champ([
    '.WW.....YjjjY.......',
    '.WWW...AAAYYAAA.....',
    '..WWC.AAAAAAAAAA....',
    '..CWWCAaWAAAAAAA....',
    '...CCWWWaYYYYYYYY...',
    '.....CCaaSSSSSSS....',
    '......aAaSSSSWKS....',
    '......aAaSSSSSSSS...',
    '.......aHSSSSHHH....',
    '........HHHHHHH.....',
    '..gGGGYYYYAHHAA.....',
    '.gGGGYYjjYYAAAAa....',
    '.gGGGalllllAAASS....',
    'gGGGGalYGYlAAASS....',
    'gGGGgalGYGlAAAa.....',
    'gGGGgblGYGlbbbb.....',
    'gGGgg.lGYGlGGGG.....',
    '.gGg..GlGlGGGGG.....',
    '.gg...gGlGg.gGGG....',
    '......Gaaa..aaaG....',
    '......aAAA..AAAa....',
    '......qqqqq.qqqqq...',
  ]),
  champThrust: champ([
    '..WW.....YjjjY......',
    '..WWW...AAAYYAAA....',
    '...WWC.AAAAAAAAAA...',
    '...CWWCAaWAAAAAAA...',
    '....CCWWWaYYYYYYYY..',
    '......CCaaSSSSSSS...',
    '.......aAaSSSSWKS...',
    '.......aAaSSSSSSSS..',
    '........aHSSSSHHH...',
    '.........HHHHHHH....',
    '.ggGGGGYYYYAHHAA....',
    'gGGGGGYYjjYYAAAA....',
    'gGGg..alllllAAAa....',
    '.gg...alYGYlAAAa....',
    '......alGYGlAAAAaa..',
    '......alGYGlAAaAAASS',
    '......blGYGlbbaaaaSS',
    '.....GGGlGlGGGGG....',
    '....gGGGGlGg..gGGG..',
    '...gGaaa......aaaG..',
    '..aAAA.........AAAa.',
    '.qqqqq.........qqqqq',
  ]),
  champThrustLow: champ([
    '..WW.....YjjjY......',
    '..WWW...AAAYYAAA....',
    '...WWC.AAAAAAAAAA...',
    '...CWWCAaWAAAAAAA...',
    '....CCWWWaYYYYYYYY..',
    '......CCaaSSSSSSS...',
    '.......aAaSSSSWKS...',
    '.......aAaSSSSSSSS..',
    '........aHSSSSHHH...',
    '.........HHHHHHH....',
    '.ggGGGGYYYYAHHAA....',
    'gGGGGGYYjjYYAAAA....',
    'gGGg..alllllAAAa....',
    '.gg...alYGYlAAAa....',
    '......alGYGlAAAAa...',
    '......alGYGlAAaAAa..',
    '......blGYGlbbbaAAa.',
    '.....GGGlGlGGGGGaSS.',
    '....gGGGGlGg..gGGSS.',
    '...gGaaa......aaaG..',
    '..aAAA.........AAAa.',
    '.qqqqq.........qqqqq',
  ]),
  sword: { rows: ['.P.', 'FFF', '.E.', '.E.', '.E.', '.E.', '.E.', '.E.', '.T.'] },
  aura: {
    rows: ['.....', '.....', '.y.y.', 'y...y', '.y.y.', 'y...y', '.y.y.', 'y...y', '.y.y.', 'y...y', '..y..'],
    legend: { y: 'aura' },
  },
  // The sword pointing down to the right, hilt at the top left, and its aura.
  swordDiag: { rows: ['P.F.....', '.F......', 'F.EE....', '...EE...', '....EE..', '.....EE.', '......ET', '.......T'] },
  auraDiag: {
    rows: ['...........', '...........', '...........', '.....y.....', '.......y...', '...y.......', '.....y..y..', '..........y', '......y....', '.........y.'],
    legend: { y: 'aura' },
  },
  tree: {
    rows: ['..vvvv..', '.vvVvvv.', 'vvvvvVvv', 'vVvvvvvv', '.vvvvvv.', '...ww...'],
  },
  bush: {
    rows: ['..v..v..', '.vVv.vV.', 'vVVVvVVv', 'VVvVVVVV', '.VVVVVV.', '..VVVV..'],
  },
  leaves1: { rows: ['v......v', '..V..v..', '........', '.v....V.', '...vv...', '..V..V..'] },
  leaves2: { rows: ['v........v', '..........', '...V...v..', '..........', 'v.......V.', '....v.....'] },
  rock: {
    rows: ['..kkkk..', '.kkkkkk.', 'kkWkkkkq', 'kkkkkkqq', 'kkkkkqqq', 'kkkkqqqq', '.kqqqqq.', '..qqqq..'],
  },
  spark: { rows: ['..W..', 'W.y.W', '.yWy.', 'W.y.W', '..W..'] },
  fire1: {
    rows: ['...r....', '..ror...', '.royor..', '.ryyyr..', '..ryr...', 'w.www.w.', '.wwwwww.', 'w......w'],
  },
  fire2: {
    rows: ['....r...', '...ror..', '..royor.', '..ryyyr.', '...ryr..', 'w.www.w.', '.wwwwww.', 'w......w'],
  },
  fireOut: {
    rows: ['....m...', '...m....', '....m...', '........', '........', 'w.www.w.', '.wwwwww.', 'w......w'],
  },
  fireOut2: {
    rows: ['...m....', '....m...', '.....m..', '........', '........', 'w.www.w.', '.wwwwww.', 'w......w'],
  },
  candle: { rows: ['.y.', 'yoy', '.L.', '.L.'] },
  torch: { rows: ['...', '...', '.t.', 'ttt', '.t.', '.t.', 'ttt'] },
  torchLit: { rows: ['.y.', 'yoy', 'ror', 'ttt', '.t.', '.t.', 'ttt'] },
  torchLit2: { rows: ['y..', '.oy', 'ror', 'ttt', '.t.', '.t.', 'ttt'] },
  slime1: { rows: ['..zzzz..', '.zzzzzz.', 'zzKzzKzz', 'zzzzzzzz', 'zZZZZZZz', '.ZZZZZZ.'] },
  slime2: { rows: ['........', '.zzzzzz.', 'zzKzzKzz', 'zzzzzzzz', 'zzZZZZzz', 'ZZZZZZZZ'] },
  puff1: { rows: ['..cc..', '.cCCc.', 'cCcCCc', '.cCCc.', '..cc..'] },
  puff2: { rows: ['c..c..c', '.c...c.', '...C...', '.c...c.', 'c..c..c'] },
  chest: {
    rows: ['.YxxxxxxY.', 'YxxxxxxxxY', 'XXXXXXXXXX', 'YxxxYYxxxY', 'xxxxjjxxxx', 'xxxxxxxxxx', 'XXXXXXXXXX'],
  },
  chestOpen: {
    rows: ['YXXXXXXXXY', 'X.y.yy.y.X', 'XXXXXXXXXX', 'YxxxYYxxxY', 'xxxxjjxxxx', 'xxxxxxxxxx', 'XXXXXXXXXX'],
  },
  // One piece of the Triforce: what a finished dungeon gives.
  shard: { rows: ['....Y....', '...YjY...', '..YYYjY..', '.YYYYYjY.', 'YYYYYYYjY'] },
  fairy1: { rows: ['a...a', '.aWa.', '..p..', '.apa.', 'a...a'] },
  fairy2: { rows: ['.....', 'aaWaa', '..p..', 'aapaa', '.....'] },
  potion: { rows: ['.ww.', '.nn.', 'nrrn', 'rrrr', 'rrrr', '.rr.'] },
  sweat: { rows: ['.O.', '.O.', 'OOO', 'OOO', '.O.'] },
  // The hourglass of the limit warning: red sand running out.
  hourglass1: { rows: ['wwwwwww', '.trrrt.', '.trrrt.', '..trt..', '...r...', '..tWt..', '.tWrWt.', '.tWWWt.', 'wwwwwww'] },
  hourglass2: { rows: ['wwwwwww', '.tWWWt.', '.trrrt.', '..trt..', '...r...', '..tWt..', '.tWrWt.', '.trrrt.', 'wwwwwww'] },
  hourglass3: { rows: ['wwwwwww', '.tWWWt.', '.tWWWt.', '..tWt..', '...W...', '..trt..', '.trrrt.', '.trrrt.', 'wwwwwww'] },
  // Scenery past the action, from the right edge in.
  cave: {
    rows: ['...kkk...', '..kkkkkq.', '.kkWkkkqq', '.kkkkkkqq', 'kkkKKKkqq', 'kkKKKKKqq', 'kkKKKKKqq', 'kkKKKKKqq', 'kkKKKKKqq', 'kkKKKKKqq'],
  },
  pond: { rows: ['..LLLLLLLL..', '.LLaLLLLLLL.', 'LLLLLLLaLLLL', 'LLLLLLLLLLLL', '.LLLLaLLLLL.', '..LLLLLLLL..'] },
  // Status bar
  heart0: heart(0),
  heart1: heart(1),
  heart2: heart(2),
  heart3: heart(3),
  heart4: heart(4),
  miniRupee: { rows: ['.u.', 'uiU', 'uuU', '.U.'] },
  ring: { rows: ['.G.', 'G.G', '.G.'] },
  miniSword: { rows: ['T', 'E', 'E', 'E', 'F', 'P'] },
}

// Lying down asleep: the dozing poses turned a quarter, head to the left.
sprites.lie = rotate(sprites.sleep!, 'ccw')
// The champion folds his helm wings to lie down.
const wingless = sprites.champSleep!.rows.map((r, y) => (y > 4 ? r : [...r].map((ch, x) => ((ch === 'W' || ch === 'C') && (x < 5 || x > 14) ? '.' : ch)).join('')))
sprites.champLie = rotate({ ...sprites.champSleep!, rows: wingless }, 'ccw')

// Frames: actors are placed relative to the hero's top-left (see kit.ts). The
// action stays inside columns 0..45 (the hero stands at 16..31, the champion at
// 14..33), so it is whole in the narrowest pane the theme is laid out for.
/** The sword in the hero's hand as he swings: down, level to the right (the stored sword turned), down to the right. */
const sword = () => weapon(6, 13)
const swordLevel = () => weapon(18, 10, { turn: 'ccw' })
const swordDiag = () => weapon(17, 14, { pose: 'diag' })

const INK = '#1c1c1c'
const GOLD = '#f8c800'
const SMALL: HeroTier[] = ['tier1', 'tier2', 'unknown']
const BIG: HeroTier[] = ['tier3', 'tier4']
const FIRE = { x: 22, y: 8 }
const BUSH = { x: 4, y: 18 }
const ROCK = { x: 4, y: 17 }
const CHEST = { x: 20, y: 9 }
// Four torches in a square to the hero's right, lit one by one.
const TORCHES = [
  { x: 21, y: 0 },
  { x: 27, y: 0 },
  { x: 21, y: 10 },
  { x: 27, y: 10 },
]
const CANDLE = at('candle', 16, 6)
const torchesLit = (n: number, flicker = false): Actor[] => TORCHES.map((t, k) => at(k < n ? (flicker && k % 2 ? 'torchLit2' : 'torchLit') : 'torch', t.x, t.y))
// The fairies leave the raised hands for the lower corners and come back. Past the
// first frame they are `fixed`: the path is the same whatever the hero's height.
const fairies = (step: 0 | 1 | 2, flap = false): Actor[] => {
  const [a, b] = flap ? ['fairy2', 'fairy1'] : ['fairy1', 'fairy2']
  if (step === 0) return [at(a!, -2, -2), at(b!, 13, -2)]
  if (step === 1) return [at(b!, -7, 12, { fixed: true }), at(a!, 18, 12, { fixed: true })]
  return [at(a!, -9, 18, { fixed: true }), at(b!, 20, 18, { fixed: true })]
}

const states: Theme['states'] = {
  idle: loop(
    { actors: [hero('lie'), at('fire1', FIRE.x, FIRE.y)], texts: [{ text: 'z', x: 4, y: -2, color: INK }], hold: 3 },
    { actors: [hero('lie'), at('fire2', FIRE.x, FIRE.y)], texts: [{ text: 'z', x: 5, y: -4, color: INK }], hold: 3 },
    { actors: [hero('lie'), at('fire1', FIRE.x, FIRE.y)], texts: [{ text: 'Z', x: 6, y: -6, color: INK }], hold: 3 },
    { actors: [hero('lie'), at('fire2', FIRE.x, FIRE.y)], hold: 3 },
  ),
  thinking: loop(
    { actors: [hero('stand')], texts: [{ text: '.', x: 19, y: 0, color: INK }], hold: 2 },
    { actors: [hero('stand')], texts: [{ text: '..', x: 19, y: 0, color: INK }], hold: 2 },
    { actors: [hero('stand')], texts: [{ text: '...', x: 19, y: 0, color: INK }], hold: 2 },
    { actors: [hero('walk')], texts: [{ text: '?', x: 19, y: 0, color: INK }], hold: 2 },
  ),
  reading: loop(
    { actors: [hero('stand'), at('bush', BUSH.x, BUSH.y)], hold: 2 },
    { actors: [hero('attack'), sword(), at('bush', BUSH.x, BUSH.y)], hold: 1 },
    { actors: [hero('attack'), sword(), at('leaves1', BUSH.x, BUSH.y)], hold: 2 },
    { actors: [hero('stand'), at('leaves2', BUSH.x - 1, BUSH.y)], hold: 2 },
    { actors: [hero('walk')], hold: 1 },
  ),
  editing: loop(
    { actors: [hero('stand'), at('rock', ROCK.x, ROCK.y)], hold: 2 },
    { actors: [hero('attack'), sword(), at('rock', ROCK.x, ROCK.y), at('spark', 5, 15)], hold: 1 },
    { actors: [hero('attack'), sword(), at('rock', ROCK.x, ROCK.y)], hold: 1 },
    { actors: [hero('attack'), sword(), at('rock', ROCK.x, ROCK.y), at('spark', 6, 14)], hold: 1 },
    { actors: [hero('stand'), at('rock', ROCK.x, ROCK.y)], hold: 2 },
  ),
  // He turns to the torches and holds a candle out to them.
  shell: loop(
    { actors: [hero('side'), ...torchesLit(0)], hold: 2 },
    { actors: [hero('thrust'), CANDLE, ...torchesLit(1)], hold: 2 },
    { actors: [hero('thrust'), CANDLE, ...torchesLit(2)], hold: 2 },
    { actors: [hero('thrust'), CANDLE, ...torchesLit(3)], hold: 2 },
    { actors: [hero('thrust'), CANDLE, ...torchesLit(4)], hold: 2 },
    { actors: [hero('itemGet'), ...torchesLit(4, true)], hold: 2 },
  ),
  agents: loop(
    { actors: [hero('itemGet'), ...fairies(0)], hold: 2 },
    { actors: [hero('itemGet'), ...fairies(1)], hold: 2 },
    { actors: [hero('itemGet'), ...fairies(2)], hold: 2 },
    { actors: [hero('stand')], hold: 3 },
    { actors: [hero('itemGet'), ...fairies(2, true)], hold: 2 },
    { actors: [hero('itemGet'), ...fairies(1, true)], hold: 2 },
  ),
}

const cold: Theme['cold'] = {
  // Only the smoke drifts; the logs stay put.
  idle: loop(
    { actors: [hero('lie'), at('fireOut', FIRE.x, FIRE.y)], texts: [{ text: 'z', x: 4, y: -2, color: INK }], hold: 4 },
    { actors: [hero('lie'), at('fireOut2', FIRE.x, FIRE.y)], texts: [{ text: 'Z', x: 5, y: -4, color: INK }], hold: 4 },
  ),
}

const SIGH = 'Overqualified for this.'
// A drop beside the brow: clear of the cap's tail, and of the champion's wing.
const sweat: Actor[] = [
  { ...at('sweat', 17, 2), tiers: SMALL },
  { ...at('sweat', 19, -4, { fixed: true }), tiers: BIG },
]
const sigh = { text: '~sigh~', x: 21, y: 4, color: INK }
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), at('bush', BUSH.x, BUSH.y), ...sweat], hold: 2, caption: SIGH },
    { actors: [hero('attack'), sword(), at('bush', BUSH.x, BUSH.y), ...sweat], hold: 1, caption: SIGH },
    { actors: [hero('attack'), sword(), at('leaves1', BUSH.x, BUSH.y), ...sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), ...sweat], texts: [sigh], hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [hero('stand'), ...torchesLit(0), ...sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), ...torchesLit(2), ...sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), ...torchesLit(4), ...sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), ...torchesLit(4, true), ...sweat], hold: 3, caption: SIGH },
  ),
}

const HURT_A = { G: 'hurtA', g: 'hurtA' }
const HURT_B = { G: 'hurtB', g: 'hurtC' }
const HOURGLASS = { x: 22, y: 7 }
/** A slime appears at `spot`; the hero turns to it (`ready`), runs it through (`lunge`, `blade`) and it bursts. */
const slain = (ready: string, lunge: string, blade: () => Actor, spot: { x: number; y: number }) =>
  once(
    { actors: [hero(ready), at('slime1', spot.x, spot.y)], hold: 1 },
    { actors: [hero(lunge), at('slime2', spot.x, spot.y), blade()], hold: 1 },
    { actors: [hero(lunge), blade(), at('puff1', spot.x + 1, spot.y)], hold: 1 },
    { actors: [hero(ready), at('puff2', spot.x + 1, spot.y - 1)], hold: 1 },
  )
const events: Theme['events'] = {
  // The slime is to the right, down to the right, or below: a different one each time.
  toolSuccess: oneOf(slain('side', 'thrust', swordLevel, { x: 22, y: 8 }), slain('side', 'thrustLow', swordDiag, { x: 21, y: 17 }), slain('stand', 'attack', sword, BUSH)),
  // Knocked back two pixels at most (the champion stays off the ring), and back to his place.
  toolError: once(
    { actors: [hero('stand', -1, 0, HURT_A)], hold: 1 },
    { actors: [hero('stand', -2, 0, HURT_B)], hold: 1 },
    { actors: [hero('stand', -2, 0, HURT_A)], hold: 1 },
    { actors: [hero('stand', -1, 0, HURT_B)], hold: 1 },
    { actors: [hero('stand')], hold: 1 },
  ),
  turnComplete: once(
    { actors: [hero('side'), at('chest', CHEST.x, CHEST.y)], hold: 2 },
    { actors: [hero('side'), at('chestOpen', CHEST.x, CHEST.y)], hold: 1 },
    {
      actors: [hero('itemGet'), at('chestOpen', CHEST.x, CHEST.y), at('shard', 4, -6)],
      texts: [{ text: '*', x: -3, y: -4, color: GOLD, lift: true }, { text: '*', x: 19, y: -6, color: GOLD, lift: true }],
      hold: 2,
    },
    {
      actors: [hero('itemGet'), at('chestOpen', CHEST.x, CHEST.y), at('shard', 4, -6)],
      texts: [{ text: '*', x: -4, y: -7, color: GOLD, lift: true }, { text: '*', x: 18, y: -3, color: GOLD, lift: true }],
      hold: 3,
    },
  ),
  milestone: once({ actors: [hero('stand')], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [hero('lie'), at('fire1', FIRE.x, FIRE.y)], hold: 2 },
    { actors: [hero('lie'), at('fireOut', FIRE.x, FIRE.y)], hold: 2 },
    { actors: [hero('lie'), at('fireOut', FIRE.x, FIRE.y)], message: 'cacheCold', hold: 6 },
    { actors: [hero('lie'), at('fireOut2', FIRE.x, FIRE.y)], message: 'cacheCold', hold: 6 },
  ),
  limitWarning: once(
    { actors: [hero('side'), at('hourglass1', HOURGLASS.x, HOURGLASS.y)], message: 'limitWarning', hold: 5 },
    { actors: [hero('side'), at('hourglass2', HOURGLASS.x, HOURGLASS.y)], message: 'limitWarning', hold: 5 },
    { actors: [hero('side'), at('hourglass3', HOURGLASS.x, HOURGLASS.y)], message: 'limitWarning', hold: 5 },
  ),
  // Held up, drunk (the bottle upended at the mouth), and a heart comes back beside him.
  compaction: once(
    { actors: [hero('itemGet'), at('potion', 6, -7)], hold: 2, caption: 'compaction' },
    {
      actors: [hero('stand'), { ...at('potion', 6, 3, { flipY: true, fixed: true }), tiers: SMALL }, { ...at('potion', 6, -3, { flipY: true, fixed: true }), tiers: BIG }],
      hold: 3,
      caption: 'compaction',
    },
    { actors: [hero('stand'), at('heart4', 20, 3)], hold: 3, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [hero('stand'), at('puff1', 5, 5)], hold: 1 },
    { actors: [at('puff2', 4, 4), at('puff1', 6, 8)], hold: 1 },
    { actors: [hero('itemGet')], hold: 6, caption: 'modelChange' },
  ),
  // The hilt sits on the raised left hand.
  effortChange: once(
    { actors: [hero('itemGet'), weapon(-1, -8, { flipY: true })], hold: 3 },
    {
      actors: [hero('itemGet'), weapon(-1, -8, { flipY: true })],
      texts: [{ text: '*', x: -4, y: -5, color: GOLD, lift: true }, { text: '*', x: 4, y: -8, color: GOLD, lift: true }],
      hold: 5,
      caption: 'effortChange',
    },
  ),
}

const CHAMPION_POSES = { stand: 'champStand', walk: 'champWalk', attack: 'champAttack', itemGet: 'champItemGet', sleep: 'champSleep', lie: 'champLie', side: 'champSide', thrust: 'champThrust', thrustLow: 'champThrustLow' }

// His hands are a pixel higher than the small hero's; a sword held aloft stops a pixel short of the trees.
const CHAMPION_FORM = { poses: CHAMPION_POSES, dx: -2, dy: -6, lift: 6, hand: { x: 0, y: -1 }, aloft: { x: 0, y: 1 } }

export const zelda: Theme = {
  id: 'zelda',
  name: 'The Legend of Context',
  description: 'NES overworld homage: hearts, rupees, a tunic per model and a sword per effort',
  version: '1.1.0',
  palette: {
    dark: { accent: '#5cb82c', gold: '#f8c800', red: '#f06450', label: '#fc9838', dim: '#8c8c8c', text: '#fcfcfc' },
    light: { accent: '#2e7a16', gold: '#856000', red: '#b02010', label: '#a04c00', dim: '#6c6c6c', text: '#1c1c1c' },
  },
  pixels,
  labels: {
    context: 'LIFE',
    spend: 'RUPEES',
    cache: 'STAMINA',
    limits: 'HOURGLASS',
    modelItem: 'B · RING',
    effortItem: 'A · SWORD',
    heroes: 'Heroes',
    weapons: 'Swords',
  },
  headings: {
    Context: 'Life',
    Cost: 'Rupees',
    'Next message': 'Stamina',
    Tokens: 'Runes',
    Limits: 'Hourglasses',
    'Tool calls': 'Inventory',
    Files: 'Map',
  },
  sprites,
  states,
  cold,
  overkill,
  events,
  scene: {
    // Two rows more than the small hero needs: the champion's raised item clears the trees at the design height.
    height: 42,
    anchor: { x: 16, y: 17 },
    background: {
      ground: 'ground',
      border: 'tree',
      // Past the action (columns 0..45), from the right edge in: a cave at 58, a boulder and a bush at 80, a tree and a pond at 96.
      decor: [
        { sprite: 'cave', x: -1, y: 23, minColumns: 56 },
        { sprite: 'rock', x: -13, y: 27, minColumns: 78 },
        { sprite: 'bush', x: -20, y: 21, minColumns: 78 },
        { sprite: 'tree', x: -32, y: 19, minColumns: 94 },
        { sprite: 'pond', x: -34, y: 31, minColumns: 94 },
      ],
    },
    hero: { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'sleep', lie: 'lie', side: 'side', thrust: 'thrust', thrustLow: 'thrustLow' },
    heroTiers: {
      tier1: {},
      tier2: { G: 'blueT', g: 'blueS' },
      tier3: { G: 'redT', g: 'redS' },
      tier4: { G: 'royalT', g: 'royalS' },
      unknown: { G: 'hoodT', g: 'hoodS' },
    },
    heroForms: {
      tier3: CHAMPION_FORM,
      tier4: CHAMPION_FORM,
    },
    lineup: { ground: 'ground', dim: '#5c5040', flipWeapons: true },
    heroNames: {
      tier1: 'Young Hero',
      tier2: 'Blue Ring Hero',
      tier3: 'Red Champion',
      tier4: 'Champion of Legend',
      unknown: 'Hooded Traveler',
    },
    weapons: {
      low: { sprite: 'sword', swap: { E: 'wood', T: 'wood', F: 'woodDark' }, poses: { diag: { sprite: 'swordDiag' } }, name: 'Wooden Sword' },
      medium: { sprite: 'sword', swap: { E: 'steel', T: 'W', F: 'steelDark' }, poses: { diag: { sprite: 'swordDiag' } }, name: 'White Sword' },
      high: { sprite: 'sword', swap: { E: 'magic', T: 'W', F: 'magicDark' }, poses: { diag: { sprite: 'swordDiag' } }, name: 'Magical Sword' },
      xhigh: { sprite: 'sword', swap: { E: 'master', T: 'W', F: 'masterGuard' }, poses: { diag: { sprite: 'swordDiag' } }, name: 'Master Sword' },
      max: { sprite: 'sword', swap: { E: 'master', T: 'aura', F: 'masterGuard' }, aura: 'aura', poses: { diag: { sprite: 'swordDiag', aura: 'auraDiag' } }, name: 'Master Sword, awakened' },
    },
    bar: {
      widgets: [
        { kind: 'map', drop: 2 },
        { kind: 'counter', value: 'spend', icon: 'miniRupee', format: 'x{v}' },
        { kind: 'box', shows: 'model', sprite: 'ring', label: 'B', drop: 1 },
        { kind: 'box', shows: 'effort', sprite: 'miniSword', label: 'A', x: 3, y: 4 },
        { kind: 'meter', value: 'contextLeft', count: 10, perRow: 5, sprites: ['heart0', 'heart1', 'heart2', 'heart3', 'heart4'], label: '-LIFE-', pulseBelow: 0.2, wrap: true },
      ],
      colors: { bg: 'black', box: 'boxBlue', text: 'W', label: 'barRed', map: 'mapGrey', mapDot: 'u' },
    },
    stamina: { x: 1, y: 12, radius: 5, full: 'staminaFull', empty: 'staminaEmpty', cold: 'staminaCold', tagIcon: 'miniRupee' },
  },
  text: {
    idle: 'The hero naps by the campfire.',
    thinking: 'The hero ponders the way ahead...',
    reading: 'The hero cuts through tall grass.',
    editing: 'The hero strikes the stone.',
    shell: 'The hero lights the torches.',
    agents: 'Fairies fly off on errands.',
    toolSuccess: 'A slime is vanquished!',
    toolError: 'Ouch! The hero takes a hit.',
    turnComplete: 'You found a Triforce shard!',
    milestone: 'A milestone passes.',
    cacheCold: 'The campfire went out.',
    limitWarning: 'The hourglass runs low.',
    compaction: 'The hero drinks a red potion.',
    modelChange: 'A new hero appears!',
    effortChange: 'The hero takes up a new sword!',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: 'THE JOURNEY GOES WELL. {pct}% OF YOUR HEARTS ARE SPENT.' },
    { level: 'warn', message: '{pct}% OF YOUR HEARTS ARE SPENT. MIND YOUR LIFE.' },
    { level: 'orange', message: '{pct}% OF YOUR HEARTS ARE SPENT. FIND A SAFE PLACE TO REST SOON.' },
    { level: 'alert', message: "IT'S DANGEROUS TO GO ON. {pct}% OF YOUR HEARTS ARE SPENT." },
    { level: 'critical', message: 'YOUR LIFE IS NEARLY GONE! {pct}% SPENT. SAVE YOUR PROGRESS AND REST (/clear).' },
  ],
  messages: {
    cacheCold: 'THE CAMPFIRE WENT OUT. YOUR CACHE IS COLD.',
    limitWarning: 'THE SANDS RUN LOW. {name} AT {pct}%.',
    compaction: 'You drank a red potion: context compacted, hearts restored!',
    modelChange: '{name} appears!',
    effortChange: 'You got the {weapon}!',
  },
}
