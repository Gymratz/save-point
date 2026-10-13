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
import type { Actor, Animation, Frame, HeroTier, SceneText, Theme, ThemeAction } from './types'

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
  // You: a gloved hand from the top of the scene, a fist around the hilt of the hero's own sword.
  // A dark edge (the sand swallows a pale one) and a red cuff.
  hand: { rows: ['.hhhhhh.', 'hhhhhhhh', 'KWWWWWWK', 'KWKWKWWK', 'KWWWWWWK', 'KWWWWWWK', '.KWWWWK.', '..KKKK..'] },
  // The old man from the cave: hands folded, hands out (TAKE THIS), eyes shut.
  oldMan: { rows: ['...oooo...', '..oooooo..', '..SSSSSS..', '..SKSSKS..', '..SSSSSS..', '.WWWWWWWW.', '..WWWWWW..', '...WWWW...', '.oooooooo.', 'oooooooooo', 'oooooooooo', 'oorooooroo', 'oorooooroo', 'oorooooroo', 'rrrrrrrrrr'] },
  oldManArms: { rows: ['...oooo...', '..oooooo..', '..SSSSSS..', '..SKSSKS..', '..SSSSSS..', '.WWWWWWWW.', '..WWWWWW..', '...WWWW...', '.oooooooo.', 'SooooooooS', 'oooooooooo', 'oorooooroo', 'oorooooroo', 'oorooooroo', 'rrrrrrrrrr'] },
  oldManShut: { rows: ['...oooo...', '..oooooo..', '..SSSSSS..', '..KKSSKK..', '..SSSSSS..', '.WWWWWWWW.', '..WWWWWW..', '...WWWW...', '.oooooooo.', 'oooooooooo', 'oooooooooo', 'oorooooroo', 'oorooooroo', 'oorooooroo', 'rrrrrrrrrr'] },
  // What the old man answers an attack with.
  fireball: { rows: ['..o..', '.oyo.', 'oyWyo', '.oyo.', '..o..'] },
  // The whirlwind that carries the hero off (two frames: it turns).
  whirl1: { rows: ['.cccCcccCcc.', 'cCcccCcccCcc', '.ccCcccCccc.', '..cccCcccC..', '..CcccCccc..', '...ccCccc...', '...cccCcc...', '....cCcc....', '....ccCc....', '.....cC.....', '.....Cc.....', '.....cc.....', '.....c......'] },
  whirl2: { rows: ['.ccCcccCccc.', 'ccCcccCcccCc', '.cCcccCcccC.', '..ccCcccCc..', '..cccCcccC..', '...cCcccC...', '...ccCccc...', '....ccCc....', '....cCcc....', '.....Cc.....', '.....cC.....', '.....cc.....', '......c.....'] },
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

// ---------------------------------------------------------------------------
// Actions: the buttons under the scene. You are a gloved hand from the top of
// the scene, holding the hero's own sword. Each press plays one of the tier's
// takes, picked at random; the target's patience wears down with repeated
// presses (see `pressAction`).
// ---------------------------------------------------------------------------

/**
 * The hand (8 by 8) around the hilt of the current effort's sword: the blade
 * hangs under the fist, its tip 15 pixels under the hand's top. Scenery: it
 * comes in from the top edge at the same height whatever the hero's size (the
 * scene has no headroom for a hand lifted over the champion's helm; it pokes
 * him in the eye instead).
 */
const you = (x: number, y: number, opts: Partial<Actor> = {}): Actor[] => [weapon(x + 2, y + 7, { fixed: true, ...opts }), at('hand', x, y, { fixed: true, ...opts })]
/** The empty hand. */
const fist = (x: number, y: number, opts: Partial<Actor> = {}): Actor => at('hand', x, y, { fixed: true, ...opts })
/** The hand's top out of the scene, the blade's tip just inside: where it comes from and goes back to. */
const ENTER = -24
const offstage = (y: number): Partial<Actor> => (y <= ENTER ? { offstage: true } : {})
// Who is who, for the rests: the hero (and what he holds) is `hero`, the fairy `fairy`, the old man `oldman`.
const heroOf = (actors: Actor[]): Actor[] => actors.map(a => ({ ...a, gone: 'hero' }))
/** A take that is only picked while these are present. */
const needing = (needs: string[], anim: Animation): Animation => ({ ...anim, needs })
const SPARK = (x: number, y: number): Actor => at('spark', x, y, { fixed: true })
const puff = (sprite: 'puff1' | 'puff2', x: number, y: number): Actor => at(sprite, x, y, { fixed: true })
const say = (text: string, x: number, y: number, color = INK): SceneText => ({ text, x, y, color })
/** A sparkle over the hero's head, lifted with the champion. */
const star = (x: number, y: number): SceneText => ({ text: '*', x, y, color: GOLD, lift: true })
/** A reaction: one-shot, every frame held twice as long as written (a line stays about a second at 6 fps). */
const take = (...frames: Frame[]): Animation => once(...frames.map(f => ({ ...f, hold: 2 * Math.max(1, f.hold ?? 1) })))
/** The same caption on every frame from `from` on. */
const captioned = (caption: string, frames: Frame[], from = 2): Frame[] => frames.map((f, k) => (k >= from ? { ...f, caption } : f))
/** The hero's line, beside his head: right of the champion's helm, level with the small hero's cap. */
const aside = (text: string, y = 0, color = INK): SceneText => ({ ...say(text, 18, y, color), gone: 'hero' })

// 1. Poke the hero. The hand comes down on his head from the top of the scene
// (the blade's tip reaches the small hero's cap and the champion's eyes): in
// from above, a hover, the poke, then the reaction. The campfire burns beside him.
const HX = 5
const H_HOVER = -17
const H_POKE = -15
const campfire = (blink = false): Actor => at(blink ? 'fire2' : 'fire1', FIRE.x, FIRE.y)
/** The campfire, the hero (whatever he does), the hand at `y` (null: gone). */
const heroScene = (y: number | null, who: Actor[], more: Actor[] = [], blink = false): Actor[] => [
  campfire(blink),
  ...heroOf(who),
  ...(y === null ? [] : you(HX, y, offstage(y))),
  ...more,
]
const hStart = (who: Actor[] = [hero('stand')]): Frame[] => [
  { actors: heroScene(ENTER, who), hold: 1 },
  { actors: heroScene(H_HOVER, who), hold: 1 },
  { actors: heroScene(H_POKE, who, [SPARK(6, -3)], true), hold: 1 },
]
/** The hero in the whirlwind: over him, then without him (he is inside), then away up to the right. */
const WHIRL = { x: 2, y: -1 }
const whirl = (turn: boolean, x = WHIRL.x, y = WHIRL.y, opts: Partial<Actor> = {}): Actor => at(turn ? 'whirl2' : 'whirl1', x, y, { gone: 'hero', ...opts })
const EMPTY_CAMP: SceneText = say('...', 6, 4)
const pokeHero: ThemeAction = {
  id: 'hero',
  label: 'POKE HERO',
  restLabel: '(HERO GONE)',
  gone: ['hero'],
  needs: ['hero'],
  reactions: {
    calm: [
      take(
        ...captioned('Poked the hero. The hero has questions.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('stand', 0, -2)]), texts: [aside('?')], hold: 2 },
          { actors: heroScene(H_HOVER, [hero('stand')], [], true), texts: [aside('HEY!')], hold: 3 },
          { actors: heroScene(null, [hero('stand')]), texts: [aside('HEY!')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Poked. The hero counts his hearts. All there.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('stand'), at('heart4', 19, 0, { gone: 'hero' })]), texts: [aside('!', -2)], hold: 2 },
          { actors: heroScene(H_HOVER, [hero('stand'), at('heart4', 19, 0, { gone: 'hero' })], [], true), texts: [aside('STILL FULL.', -2)], hold: 3 },
          { actors: heroScene(null, [hero('stand')]), texts: [aside('OK.', -2)], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The hero is ticklish. A secret to everybody.', [
          ...hStart(),
          { actors: heroScene(H_POKE, [hero('itemGet')], [SPARK(6, -3)]), texts: [aside('HEE HEE')], hold: 2 },
          { actors: heroScene(H_HOVER, [hero('stand')], [], true), texts: [aside('HA')], hold: 1 },
          { actors: heroScene(H_POKE, [hero('itemGet')], [SPARK(7, -2)]), texts: [aside('STOP')], hold: 2 },
          { actors: heroScene(null, [hero('stand')], [], true), texts: [aside('...')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Poked. The hero takes it as a cue to nap.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('stand')]), hold: 1 },
          { actors: heroScene(H_POKE, [hero('stand')], [SPARK(6, -3)], true), texts: [aside('...')], hold: 1 },
          { actors: heroScene(H_HOVER, [hero('sleep')]), texts: [aside('...')], hold: 2 },
          { actors: heroScene(H_HOVER, [hero('lie')], [], true), texts: [{ ...say('z', 4, -2), gone: 'hero' }], hold: 3 },
          { actors: heroScene(null, [hero('lie')]), texts: [{ ...say('Z', 5, -4), gone: 'hero' }], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Poked the hero. A rupee fell out. He keeps it.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('stand', 0, -2), at('miniRupee', 18, 10, { fixed: true, gone: 'hero' })]), hold: 1 },
          { actors: heroScene(H_HOVER, [hero('stand'), at('miniRupee', 18, 14, { fixed: true, gone: 'hero' })], [], true), texts: [aside('OH.')], hold: 2 },
          { actors: heroScene(H_HOVER, [hero('itemGet'), at('miniRupee', 7, -6, { gone: 'hero' })]), texts: [star(-3, -4), star(19, -6)], hold: 3 },
          { actors: heroScene(null, [hero('itemGet'), at('miniRupee', 7, -6, { gone: 'hero' })], [], true), texts: [star(-4, -7), star(18, -3)], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The hero eyes your sword. It looks familiar.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('stand')]), texts: [aside('NICE SWORD.')], hold: 3 },
          { actors: heroScene(H_HOVER, [hero('stand')], [], true), texts: [aside('WAIT.')], hold: 3 },
          { actors: heroScene(null, [hero('stand'), ...sweat.map(a => ({ ...a, gone: 'hero' }))]), texts: [aside('WAIT.')], hold: 2 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('The hero swings back. Mind the sword.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('itemGet'), weapon(-1, -8, { flipY: true, gone: 'hero' })], [SPARK(5, -13)]), texts: [aside('HYAH!')], hold: 2 },
          { actors: heroScene(ENTER, [hero('itemGet'), weapon(-1, -8, { flipY: true, gone: 'hero' })], [SPARK(6, -15)], true), texts: [aside('HYAH!')], hold: 2 },
          { actors: heroScene(null, [hero('stand')]), texts: [aside('HA.')], hold: 3 },
        ]),
      ),
      needing(['fairy'], take(
        ...captioned('The hero sends a fairy after you. It bites.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('itemGet')], [at('fairy1', 13, -2, { gone: 'fairy' })]), texts: [aside('GET IT.', -2)], hold: 2 },
          { actors: heroScene(H_HOVER, [hero('stand')], [at('fairy2', 8, -10, { fixed: true, gone: 'fairy' }), SPARK(5, -9)], true), hold: 1 },
          { actors: heroScene(ENTER, [hero('stand')], [at('fairy1', 8, -14, { fixed: true, gone: 'fairy' }), SPARK(6, -16)]), hold: 2 },
          { actors: heroScene(null, [hero('stand')], [at('fairy2', 13, -2, { gone: 'fairy' })], true), texts: [aside('GOOD FAIRY.', -2)], hold: 3 },
        ]),
      )),
      take(
        ...captioned('The hero sighs. The trees hear it.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('stand'), ...sweat.map(a => ({ ...a, gone: 'hero' }))]), texts: [{ ...sigh, gone: 'hero' }], hold: 3 },
          { actors: heroScene(H_HOVER, [hero('stand'), ...sweat.map(a => ({ ...a, gone: 'hero' }))], [], true), texts: [aside('DO YOU MIND.')], hold: 3 },
          { actors: heroScene(null, [hero('stand'), ...sweat.map(a => ({ ...a, gone: 'hero' }))]), hold: 2 },
        ]),
      ),
      // He leans away (two pixels: the champion stays off the ring); the hand plunges past his shoulder into the sand.
      take(
        ...captioned('The hero leans away. You stab the sand.', [
          { actors: heroScene(ENTER, [hero('stand')]), hold: 1 },
          { actors: heroScene(H_HOVER, [hero('walk', -2)]), hold: 1 },
          { actors: [campfire(true), ...heroOf([hero('stand', -2)]), ...you(18, -8)], hold: 1 },
          { actors: [campfire(), ...heroOf([hero('stand', -2)]), ...you(18, 1), SPARK(19, 14)], hold: 2 },
          { actors: [campfire(true), ...heroOf([hero('stand', -2)]), ...you(18, 1)], texts: [aside('MISSED.')], hold: 3 },
          { actors: heroScene(null, [hero('walk', -1)]), hold: 1 },
          { actors: heroScene(null, [hero('stand')], [], true), hold: 1 },
        ]),
      ),
      take(
        ...captioned('The hero takes it out on a bush. HYAH.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('stand'), at('bush', BUSH.x, BUSH.y, { gone: 'hero' })]), texts: [aside('...')], hold: 2 },
          { actors: heroScene(H_HOVER, [hero('attack'), { ...sword(), gone: 'hero' }, at('bush', BUSH.x, BUSH.y, { gone: 'hero' })], [], true), texts: [aside('HYAH.')], hold: 1 },
          { actors: heroScene(H_HOVER, [hero('attack'), { ...sword(), gone: 'hero' }, at('leaves1', BUSH.x, BUSH.y, { gone: 'hero' })]), texts: [aside('HYAH.')], hold: 2 },
          { actors: heroScene(null, [hero('stand'), at('leaves2', BUSH.x - 1, BUSH.y, { gone: 'hero' })], [], true), texts: [aside('BETTER.')], hold: 3 },
        ]),
      ),
    ],
    fedUp: [
      take(
        ...captioned('The hero lifts a boulder. Hand, meet boulder.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('stand'), at('rock', ROCK.x, ROCK.y, { fixed: true, gone: 'hero' })]), texts: [aside('RIGHT.')], hold: 2 },
          { actors: heroScene(H_HOVER, [hero('itemGet'), at('rock', 4, -9, { gone: 'hero' })], [], true), hold: 2 },
          { actors: heroScene(H_HOVER, [hero('itemGet'), at('rock', 5, -17, { fixed: true, gone: 'hero' })], [SPARK(3, -12), SPARK(11, -10)]), hold: 1 },
          { actors: heroScene(ENTER, [hero('itemGet'), at('rock', 5, -26, { fixed: true, offstage: true, gone: 'hero' })], [], true), hold: 1 },
          { actors: heroScene(null, [hero('stand')]), texts: [aside('HM.')], hold: 3 },
        ]),
      ),
      needing(['fairy'], take(
        ...captioned('The hero whistles. Fairies swarm the hand.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('itemGet')]), texts: [aside('FAIRIES!', -2)], hold: 2 },
          { actors: heroScene(H_HOVER, [hero('itemGet')], [at('fairy1', 0, -14, { fixed: true, gone: 'fairy' }), at('fairy2', 14, -16, { fixed: true, gone: 'fairy' })], true), hold: 1 },
          { actors: heroScene(H_HOVER, [hero('itemGet')], [at('fairy2', 2, -11, { fixed: true, gone: 'fairy' }), at('fairy1', 13, -9, { fixed: true, gone: 'fairy' }), at('fairy1', 14, -17, { fixed: true, gone: 'fairy' }), SPARK(5, -13)]), hold: 2 },
          { actors: heroScene(ENTER, [hero('itemGet')], [at('fairy1', 3, -12, { fixed: true, gone: 'fairy' }), at('fairy2', 12, -11, { fixed: true, gone: 'fairy' }), at('fairy2', 13, -16, { fixed: true, gone: 'fairy' })], true), hold: 1 },
          { actors: heroScene(null, [hero('stand')], [at('fairy1', -2, -2, { gone: 'fairy' }), at('fairy2', 13, -2, { gone: 'fairy' })]), texts: [aside('THANK YOU.', -2)], hold: 3 },
        ]),
      )),
      take(
        ...captioned('The hero takes his sword back. It was his.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('stand')]), texts: [aside('THAT IS MINE.')], hold: 2 },
          // The sword goes from the fist to the raised hands; the fist stays, empty.
          { actors: [campfire(true), ...heroOf([hero('itemGet'), weapon(-1, -8, { flipY: true })]), fist(HX, H_HOVER)], texts: [star(-4, -5), star(4, -8)], hold: 2 },
          { actors: [campfire(), ...heroOf([hero('itemGet'), weapon(-1, -8, { flipY: true })]), fist(HX, ENTER, { offstage: true })], texts: [aside('MINE.', -2)], hold: 3 },
          { actors: [campfire(true), ...heroOf([hero('stand')])], hold: 2 },
        ]),
      ),
    ],
    snapped: [
      take(
        ...captioned('The hero scrolled to the next screen. Alone.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('stand')]), texts: [aside('NOPE.')], hold: 2 },
          { actors: heroScene(null, [hero('stand')], [], true), texts: [aside('NOPE.')], hold: 1 },
          // He passes behind the campfire.
          { actors: [...heroOf([hero('walk', 4)]), campfire()], hold: 1 },
          { actors: [...heroOf([hero('stand', 9)]), campfire(true)], hold: 1 },
          { actors: [...heroOf([{ ...hero('walk', 18), offstage: true }]), campfire()], hold: 1 },
          { actors: [...heroOf([{ ...hero('stand', 28), offstage: true }]), campfire(true)], hold: 1 },
          { actors: heroScene(null, []), texts: [EMPTY_CAMP], hold: 3 },
        ]),
      ),
      take(
        ...captioned('A whirlwind takes the hero. Classic exit.', [
          ...hStart(),
          { actors: heroScene(H_HOVER, [hero('stand')]), texts: [aside('ENOUGH.')], hold: 2 },
          { actors: heroScene(null, [hero('itemGet')], [whirl(false, 26, -6, { offstage: true })], true), hold: 1 },
          { actors: heroScene(null, [hero('itemGet')], [whirl(true, 14, -3)]), hold: 1 },
          { actors: heroScene(null, [hero('stand')], [whirl(false)], true), hold: 1 },
          { actors: heroScene(null, [], [whirl(true)]), hold: 2 },
          { actors: heroScene(null, [], [whirl(false, 10, -9)], true), hold: 1 },
          { actors: heroScene(null, [], [whirl(true, 20, -18, { offstage: true })]), hold: 1 },
          { actors: heroScene(null, []), texts: [EMPTY_CAMP], hold: 3 },
        ]),
      ),
    ],
  },
  // The hero's rest: the campfire burns on; leaves blow over the empty spot.
  rest: loop(
    { actors: [campfire()], hold: 6 },
    { actors: [campfire(true), at('leaves1', 2, 8, { fixed: true })], hold: 6 },
    { actors: [campfire(), at('leaves2', 5, 10, { fixed: true })], hold: 6 },
    { actors: [campfire(true)], texts: [EMPTY_CAMP], hold: 6 },
  ),
}

// 2. Poke the fairy. It hovers at the hero's right; the hand comes down on it.
const FX = 21
const F_HOVER = -14
const F_POKE = -11
const FAIRY = { x: 22, y: 2 }
/** A fairy, flapping (`flap`), placed as scenery: the path is the same whatever the hero's height. */
const fairyAt = (x: number, y: number, flap = false, opts: Partial<Actor> = {}): Actor => at(flap ? 'fairy2' : 'fairy1', x, y, { fixed: true, gone: 'fairy', ...opts })
const theFairy = (flap = false, swap?: Record<string, string>): Actor => fairyAt(FAIRY.x, FAIRY.y, flap, swap ? { swap } : {})
/** The hero watching, the fairy (or `fairy` in its place), the hand at `y` (null: gone). */
const fairyScene = (y: number | null, fairy: Actor[] = [theFairy()], more: Actor[] = [], who: Actor[] = [hero('stand')]): Actor[] => [
  ...heroOf(who),
  ...fairy,
  ...(y === null ? [] : you(FX, y, offstage(y))),
  ...more,
]
const fStart = (): Frame[] => [
  { actors: fairyScene(ENTER, [theFairy()]), hold: 1 },
  { actors: fairyScene(F_HOVER, [theFairy(true)]), hold: 1 },
  { actors: fairyScene(F_POKE, [theFairy()], [SPARK(20, 0)]), hold: 1 },
]
/** The fairy's line, under it. */
const twinkle = (text: string, color = INK): SceneText => ({ ...say(text, 18, 7, color), gone: 'fairy' })
const RED_FAIRY = { p: 'r', a: 'o' }
const DIM_FAIRY = { p: 'C', a: 'c' }
const GOLD_FAIRY = { p: 'y', a: 'W' }
const pokeFairy: ThemeAction = {
  id: 'fairy',
  label: 'POKE FAIRY',
  restLabel: '(FAIRY GONE)',
  gone: ['fairy'],
  needs: ['fairy'],
  reactions: {
    calm: [
      take(
        ...captioned('Poked the fairy. It jingles. Angrily.', [
          ...fStart(),
          { actors: fairyScene(F_POKE, [fairyAt(23, 3, true)]), texts: [twinkle('HEY!')], hold: 2 },
          { actors: fairyScene(F_HOVER, [fairyAt(21, 2)]), texts: [twinkle('HEY!')], hold: 2 },
          { actors: fairyScene(null, [theFairy(true)]), texts: [twinkle('HMPH.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Poked. The fairy heals you. Out of habit.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [theFairy(true)], [at('heart4', 13, -13, { fixed: true, gone: 'fairy' })]), texts: [say('+1', 10, -10, GOLD)], hold: 3 },
          { actors: fairyScene(F_HOVER, [theFairy()], [at('heart4', 13, -13, { fixed: true, gone: 'fairy' })]), texts: [twinkle('THERE.')], hold: 2 },
          { actors: fairyScene(null, [theFairy(true)]), texts: [twinkle('THERE.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The fairy dodges. The hand pokes the sand.', [
          { actors: fairyScene(ENTER, [theFairy()]), hold: 1 },
          { actors: fairyScene(F_HOVER, [fairyAt(26, -3, true)]), hold: 1 },
          { actors: fairyScene(F_POKE + 10, [fairyAt(26, -3)], [SPARK(20, 10)]), hold: 2 },
          { actors: fairyScene(F_POKE + 10, [fairyAt(26, -3, true)]), texts: [twinkle('MISSED.')], hold: 3 },
          { actors: fairyScene(null, [theFairy()]), hold: 2 },
        ]),
      ),
      take(
        ...captioned('The fairy blushes. Not that kind of poke.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [theFairy(true)]), texts: [say('<3', 27, 1, 'p')], hold: 2 },
          { actors: fairyScene(F_HOVER, [theFairy()]), texts: [say('<3', 28, -1, 'p'), twinkle('OH MY.')], hold: 3 },
          { actors: fairyScene(null, [theFairy(true)]), texts: [twinkle('OH MY.')], hold: 2 },
        ]),
      ),
      needing(['hero'], take(
        ...captioned('The fairy complains to the hero. He shrugs.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [fairyAt(18, -1, true)]), texts: [twinkle('HE POKED ME.')], hold: 3 },
          { actors: fairyScene(F_HOVER, [fairyAt(18, -1)], [], [hero('stand'), ...sweat]), texts: [twinkle('HE POKED ME.'), aside('?', -4)], hold: 3 },
          { actors: fairyScene(null, [theFairy(true)], [], [hero('stand')]), hold: 2 },
        ]),
      )),
      take(
        ...captioned('Poked. The fairy sparkles. That is all.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [theFairy(true)]), texts: [say('*', 20, 6, GOLD), say('*', 28, 0, GOLD)], hold: 1 },
          { actors: fairyScene(F_HOVER, [theFairy()]), texts: [say('*', 19, 0, GOLD), say('*', 28, 6, GOLD)], hold: 1 },
          { actors: fairyScene(F_HOVER, [theFairy(true)]), texts: [say('*', 20, 6, GOLD), say('*', 28, 0, GOLD)], hold: 1 },
          { actors: fairyScene(F_HOVER, [theFairy()]), texts: [twinkle('TING.')], hold: 3 },
          { actors: fairyScene(null, [theFairy(true)]), hold: 2 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('The fairy bites the hand. It has tiny teeth.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [fairyAt(22, -5, true)], [SPARK(21, -8)]), hold: 2 },
          { actors: fairyScene(ENTER, [fairyAt(22, -9)], [SPARK(20, -12)]), hold: 1 },
          { actors: fairyScene(null, [theFairy(true)]), texts: [twinkle('HMPH.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The fairy circles the hand. The hand is dizzy.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [fairyAt(16, -11, true)]), hold: 1 },
          { actors: fairyScene(F_HOVER, [fairyAt(21, -17)]), hold: 1 },
          { actors: fairyScene(F_HOVER, [fairyAt(26, -11, true)]), hold: 1 },
          { actors: fairyScene(F_HOVER, [fairyAt(16, -11)]), hold: 1 },
          { actors: fairyScene(F_HOVER, [fairyAt(21, -17, true)]), hold: 1 },
          { actors: fairyScene(F_HOVER, [fairyAt(26, -11)]), hold: 1 },
          { actors: fairyScene(ENTER, [theFairy(true)]), texts: [twinkle('DIZZY YET?')], hold: 3 },
        ]),
      ),
      needing(['hero'], take(
        ...captioned('The fairy heals the hero instead. Pointedly.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [fairyAt(18, -1, true)]), hold: 1 },
          { actors: fairyScene(F_HOVER, [fairyAt(18, -1)], [at('heart4', 24, -1, { fixed: true, gone: 'hero' })]), texts: [say('+1', 26, -4, GOLD)], hold: 3 },
          { actors: fairyScene(null, [fairyAt(18, -1, true)], [at('heart4', 24, -1, { fixed: true, gone: 'hero' })]), texts: [aside('THANKS.', -4), twinkle('NOT YOU.')], hold: 3 },
        ]),
      )),
      take(
        ...captioned('The fairy glows red. That means stop.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [theFairy(true, RED_FAIRY)]), hold: 1 },
          { actors: fairyScene(F_HOVER, [theFairy(false, RED_FAIRY)]), texts: [twinkle('STOP.')], hold: 3 },
          { actors: fairyScene(ENTER, [theFairy(true, RED_FAIRY)]), texts: [twinkle('STOP.')], hold: 1 },
          { actors: fairyScene(null, [theFairy()]), hold: 2 },
        ]),
      ),
      take(
        ...captioned('The fairy dims. Passive-aggressively.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [theFairy(true, DIM_FAIRY)]), texts: [twinkle('FINE.')], hold: 3 },
          { actors: fairyScene(F_HOVER, [theFairy(false, DIM_FAIRY)]), texts: [twinkle('FINE.')], hold: 2 },
          { actors: fairyScene(null, [theFairy(true, DIM_FAIRY)]), hold: 2 },
        ]),
      ),
    ],
    fedUp: [
      needing(['hero'], take(
        ...captioned('The fairy fetches the hero. He has a sword.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [fairyAt(18, -1, true)]), texts: [twinkle('DO SOMETHING.')], hold: 2 },
          { actors: fairyScene(F_HOVER, [fairyAt(14, -2, false)], [], [hero('itemGet'), weapon(-1, -8, { flipY: true })]), texts: [star(-4, -5), aside('HYAH!', -4)], hold: 2 },
          { actors: fairyScene(ENTER, [fairyAt(14, -2, true)], [], [hero('itemGet'), weapon(-1, -8, { flipY: true })]), texts: [aside('HYAH!', -4)], hold: 2 },
          { actors: fairyScene(null, [theFairy()], [], [hero('stand')]), texts: [twinkle('GOOD HERO.')], hold: 2 },
        ]),
      )),
      take(
        ...captioned('The fairy zaps the hand. Fairies can do that.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [theFairy(true, GOLD_FAIRY)]), texts: [say('*', 20, 0, GOLD), say('*', 28, 2, GOLD)], hold: 1 },
          { actors: fairyScene(F_HOVER, [theFairy(false, GOLD_FAIRY)], [SPARK(20, -6), SPARK(23, -11)]), hold: 1 },
          { actors: fairyScene(ENTER, [theFairy(true, GOLD_FAIRY)], [SPARK(21, -14)]), hold: 1 },
          { actors: fairyScene(null, [theFairy()]), texts: [twinkle('ZAP.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The fairy calls her sisters. All of them.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [theFairy(true)]), texts: [twinkle('SISTERS!')], hold: 2 },
          { actors: fairyScene(F_HOVER, [theFairy(), fairyAt(16, -11, true), fairyAt(26, -11, true)]), hold: 1 },
          { actors: fairyScene(F_HOVER, [theFairy(true), fairyAt(16, -11), fairyAt(26, -11), fairyAt(21, -17)], [SPARK(20, -8)]), hold: 2 },
          { actors: fairyScene(ENTER, [theFairy(), fairyAt(16, -11, true), fairyAt(26, -11, true), fairyAt(21, -17, true)]), hold: 1 },
          { actors: fairyScene(null, [theFairy(true), fairyAt(16, -11), fairyAt(26, -11)]), texts: [twinkle('AND STAY OUT.')], hold: 3 },
        ]),
      ),
    ],
    snapped: [
      take(
        ...captioned("The fairy left. Fairies don't live here now.", [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [theFairy(true)]), texts: [twinkle('THAT IS IT.')], hold: 2 },
          { actors: fairyScene(null, [theFairy()]), texts: [twinkle('BYE.')], hold: 2 },
          { actors: fairyScene(null, [fairyAt(23, -4, true)]), hold: 1 },
          { actors: fairyScene(null, [fairyAt(25, -12)]), hold: 1 },
          { actors: fairyScene(null, [fairyAt(27, -20, true, { offstage: true })]), hold: 1 },
          { actors: fairyScene(null, []), texts: [aside('...')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The fairy stole your sword and left. Fairies.', [
          ...fStart(),
          { actors: fairyScene(F_HOVER, [fairyAt(22, -5, true)]), texts: [twinkle('MINE NOW.')], hold: 2 },
          // The sword leaves the fist with the fairy; the fist stays, empty.
          { actors: [...heroOf([hero('stand')]), fairyAt(25, -7), weapon(26, -4, { fixed: true, gone: 'fairy' }), fist(FX, F_HOVER)], hold: 1 },
          { actors: [...heroOf([hero('stand')]), fairyAt(29, -9, true, { offstage: true }), weapon(30, -6, { fixed: true, offstage: true, gone: 'fairy' }), fist(FX, F_HOVER)], hold: 1 },
          { actors: [...heroOf([hero('stand')]), fist(FX, ENTER, { offstage: true })], texts: [aside('...')], hold: 3 },
          { actors: [...heroOf([hero('stand')])], texts: [aside('...')], hold: 1 },
        ]),
      ),
    ],
  },
  // The fairy's rest: the hero alone, looking about for it.
  rest: loop(
    { actors: heroOf([hero('stand')]), hold: 6 },
    { actors: heroOf([hero('stand')]), texts: [aside('?')], hold: 6 },
    { actors: heroOf([hero('walk')]), hold: 6 },
    { actors: heroOf([hero('stand')]), texts: [aside('...')], hold: 6 },
  ),
}

// 3. Poke the old man. He stands where the cave would be, at the hero's right;
// the hand comes down on his hood. He speaks as the cave does: in a box.
const OX = 22
const O_HOVER = -15
const O_POKE = -12
const OLD = { x: 21, y: 1 }
const oldMan = (sprite = 'oldMan', x = OLD.x, y = OLD.y, opts: Partial<Actor> = {}): Actor => at(sprite, x, y, { fixed: true, gone: 'oldman', ...opts })
const OLD_MAN = oldMan()
const ARMS_OUT = oldMan('oldManArms')
const EYES_SHUT = oldMan('oldManShut')
/** The hero watching, the old man (or `man` in his place), the hand at `y` (null: gone). */
const oldScene = (y: number | null, man: Actor[] = [OLD_MAN], more: Actor[] = [], who: Actor[] = [hero('stand')]): Actor[] => [
  ...heroOf(who),
  ...man,
  ...(y === null ? [] : you(OX, y, offstage(y))),
  ...more,
]
const oStart = (): Frame[] => [
  { actors: oldScene(ENTER), hold: 1 },
  { actors: oldScene(O_HOVER), hold: 1 },
  { actors: oldScene(O_POKE, undefined, [SPARK(23, 1)]), hold: 1 },
]
/** The old man's small line: under the trees, ending at the hand's left. */
const mutter = (text: string, color = INK): SceneText => ({ ...say(text, 21 - text.length, -9, color), gone: 'oldman' })
/** The hero's line while he stands by the old man (his usual spot is taken): under the trees too. */
const shout = (text: string, color = INK): SceneText => ({ ...say(text, 20 - text.length, -9, color), gone: 'hero' })
const fireball = (x: number, y: number): Actor => at('fireball', x, y, { fixed: true, gone: 'oldman' })
const pokeOldMan: ThemeAction = {
  id: 'oldman',
  label: 'POKE OLD MAN',
  restLabel: '(NO OLD MAN)',
  gone: ['oldman'],
  needs: ['oldman'],
  reactions: {
    calm: [
      needing(['hero'], take(
        ...captioned('The old man gave the hero a candle. Again.', [
          ...oStart(),
          { actors: oldScene(null, [ARMS_OUT]), message: "IT'S DANGEROUS TO GO ALONE! TAKE THIS.", hold: 3 },
          { actors: oldScene(null, [ARMS_OUT], [], [hero('itemGet'), at('candle', 6, -6)]), texts: [star(-3, -4), star(19, -6)], hold: 2 },
          { actors: oldScene(null, [OLD_MAN], [], [hero('stand')]), texts: [aside('AGAIN?')], hold: 2 },
        ]),
      )),
      take(
        ...captioned('Poked the old man. He grumbles. Audibly.', [
          ...oStart(),
          { actors: oldScene(O_HOVER), texts: [mutter('GRUMBLE')], hold: 2 },
          { actors: oldScene(O_HOVER, [EYES_SHUT]), texts: [mutter('GRUMBLE...')], hold: 3 },
          { actors: oldScene(null, [EYES_SHUT]), hold: 2 },
        ]),
      ),
      take(
        ...captioned('Poked. The old man offers a hint. Unhelpful.', [
          ...oStart(),
          { actors: oldScene(null), message: 'SECRET IS IN THE TIP OF THE NOSE.', hold: 4 },
          { actors: oldScene(null), texts: [aside('?')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Poked. A rupee fell out of the old man.', [
          ...oStart(),
          { actors: oldScene(O_HOVER, undefined, [at('miniRupee', 18, 8, { fixed: true, gone: 'oldman' })]), hold: 1 },
          { actors: oldScene(O_HOVER, undefined, [at('miniRupee', 18, 12, { fixed: true, gone: 'oldman' })]), texts: [mutter('OOPS.')], hold: 2 },
          { actors: oldScene(null, undefined, [at('miniRupee', 18, 12, { fixed: true, gone: 'oldman' })]), texts: [mutter('MINE.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Poked. The old man is not a signpost.', [
          ...oStart(),
          { actors: oldScene(null), message: 'I AM NOT A SIGNPOST.', hold: 3 },
          { actors: oldScene(null, [EYES_SHUT]), texts: [mutter('HMPH.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The old man eyes the sword. Master using it.', [
          ...oStart(),
          { actors: oldScene(null, [ARMS_OUT]), message: 'MASTER USING IT AND YOU CAN HAVE THIS.', hold: 3 },
          { actors: oldScene(O_HOVER, [ARMS_OUT]), hold: 1 },
          { actors: oldScene(O_HOVER), texts: [mutter('NOT YET.')], hold: 2 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('The old man makes an offer. Life or money.', [
          ...oStart(),
          { actors: oldScene(null, [ARMS_OUT]), message: 'LEAVE YOUR LIFE OR MONEY.', hold: 3 },
          { actors: oldScene(null, [ARMS_OUT]), texts: [aside('!', 0, GOLD)], hold: 2 },
          { actors: oldScene(null), texts: [mutter('I WAIT.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The old man pays you to leave. Ten rupees.', [
          ...oStart(),
          { actors: oldScene(null, [ARMS_OUT], [at('miniRupee', 19, 8, { fixed: true, gone: 'oldman' })]), message: 'TAKE THIS AND GO.', hold: 3 },
          { actors: oldScene(O_HOVER, [ARMS_OUT], [at('miniRupee', 20, 1, { fixed: true, gone: 'oldman' })]), hold: 1 },
          { actors: oldScene(O_HOVER, [ARMS_OUT], [at('miniRupee', 21, -7, { fixed: true, gone: 'oldman' })]), hold: 1 },
          { actors: oldScene(ENTER, [OLD_MAN], [at('miniRupee', 21, -20, { fixed: true, offstage: true, gone: 'oldman' })]), texts: [mutter('GO.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The old man closes his eyes. You do not exist.', [
          ...oStart(),
          { actors: oldScene(O_HOVER, [EYES_SHUT]), texts: [mutter('...')], hold: 3 },
          { actors: oldScene(O_POKE, [EYES_SHUT], [SPARK(23, 1)]), texts: [mutter('...')], hold: 1 },
          { actors: oldScene(O_HOVER, [EYES_SHUT]), texts: [mutter('...'), aside('?')], hold: 2 },
          { actors: oldScene(null, [EYES_SHUT]), hold: 2 },
        ]),
      ),
      needing(['hero'], take(
        ...captioned('The old man has a word with the hero. Several.', [
          ...oStart(),
          { actors: oldScene(null, [ARMS_OUT]), message: 'COME HERE, BOY.', hold: 2 },
          { actors: oldScene(null, [ARMS_OUT], [], [hero('walk', 3)]), hold: 1 },
          { actors: oldScene(null, [ARMS_OUT], [], [hero('stand', 3)]), message: 'TELL YOUR FRIEND TO STOP.', hold: 3 },
          { actors: oldScene(null, [OLD_MAN], [], [hero('stand', 3)]), texts: [shout('?')], hold: 2 },
        ]),
      )),
      take(
        ...captioned('The old man points at the exit. Emphatically.', [
          ...oStart(),
          { actors: oldScene(null, [ARMS_OUT]), message: 'THE EXIT IS THAT WAY.', hold: 3 },
          { actors: oldScene(null, [ARMS_OUT]), texts: [mutter('GO.')], hold: 2 },
        ]),
      ),
    ],
    fedUp: [
      take(
        ...captioned('You struck the old man. He shoots fireballs.', [
          ...oStart(),
          { actors: oldScene(O_HOVER, [ARMS_OUT]), texts: [mutter('!')], hold: 1 },
          { actors: oldScene(O_HOVER, [ARMS_OUT], [fireball(18, 7)]), hold: 1 },
          { actors: oldScene(O_HOVER, [ARMS_OUT], [fireball(19, 0)]), hold: 1 },
          { actors: oldScene(O_HOVER, [ARMS_OUT], [fireball(20, -8)]), hold: 1 },
          { actors: oldScene(ENTER, [ARMS_OUT], [SPARK(20, -12), fireball(18, 6)]), hold: 1 },
          { actors: oldScene(null, [ARMS_OUT], [fireball(19, -2), fireball(21, -16)]), hold: 1 },
          { actors: oldScene(null, [OLD_MAN]), texts: [mutter('HMPH.')], hold: 3 },
        ]),
      ),
      needing(['hero'], take(
        ...captioned('The old man sends the hero after you. HYAH.', [
          ...oStart(),
          { actors: oldScene(null, [ARMS_OUT]), message: 'GO GET HIM, BOY.', hold: 2 },
          { actors: oldScene(O_HOVER, [ARMS_OUT], [], [hero('walk', 3)]), hold: 1 },
          { actors: oldScene(O_HOVER, [ARMS_OUT], [], [hero('itemGet', 3), weapon(2, -8, { flipY: true })]), texts: [shout('HYAH!')], hold: 2 },
          { actors: oldScene(ENTER, [ARMS_OUT], [], [hero('itemGet', 3), weapon(2, -8, { flipY: true })]), texts: [shout('HYAH!')], hold: 2 },
          { actors: oldScene(null, [OLD_MAN], [], [hero('stand')]), texts: [mutter('GOOD BOY.')], hold: 2 },
        ]),
      )),
      take(
        ...captioned('The old man bills you. Door repair charge.', [
          ...oStart(),
          { actors: oldScene(null, [ARMS_OUT]), message: 'PAY ME FOR THE DOOR REPAIR CHARGE.', hold: 3 },
          { actors: oldScene(null, [ARMS_OUT]), texts: [mutter('20 RUPEES.'), aside('?!')], hold: 3 },
        ]),
      ),
    ],
    snapped: [
      take(
        ...captioned('The old man leaves. Dangerous to go alone.', [
          ...oStart(),
          { actors: oldScene(O_HOVER, [ARMS_OUT], [fireball(18, 7)]), hold: 1 },
          { actors: oldScene(O_HOVER, [ARMS_OUT], [fireball(19, -2)]), hold: 1 },
          { actors: oldScene(ENTER, [ARMS_OUT], [SPARK(20, -12)]), hold: 1 },
          { actors: oldScene(null), message: 'GO ALONE, THEN.', hold: 3 },
          { actors: oldScene(null, [oldMan('oldMan', 25, 1, { offstage: true })]), hold: 1 },
          { actors: oldScene(null, [oldMan('oldManArms', 29, 1, { offstage: true })]), hold: 1 },
          { actors: oldScene(null, [oldMan('oldMan', 34, 1, { offstage: true })]), hold: 1 },
          { actors: oldScene(null, []), texts: [aside('...')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The old man vanishes in a puff. Cave closed.', [
          ...oStart(),
          { actors: oldScene(null, [EYES_SHUT]), message: "IT'S A SECRET TO EVERYBODY.", hold: 3 },
          { actors: oldScene(null, [OLD_MAN], [puff('puff1', 21, 4), puff('puff2', 24, 10)]), hold: 1 },
          { actors: oldScene(null, [], [puff('puff2', 20, 5), puff('puff1', 25, 9)]), hold: 1 },
          { actors: oldScene(null, []), texts: [aside('...')], hold: 3 },
        ]),
      ),
    ],
  },
  // The old man's rest: the hero alone, looking at the empty spot.
  rest: loop(
    { actors: heroOf([hero('stand')]), hold: 6 },
    { actors: heroOf([hero('side')]), hold: 6 },
    { actors: heroOf([hero('side')]), texts: [aside('...')], hold: 6 },
    { actors: heroOf([hero('stand')]), hold: 6 },
  ),
}

const actions: ThemeAction[] = [pokeHero, pokeFairy, pokeOldMan]

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
  actions,
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
