// "The Legend of Context": an NES-overworld homage. Every sprite is drawn fresh
// for this theme in that 8-bit style.
//
// The model is the hero's tunic (green, blue, the red and purple champions),
// effort is the sword, context is hearts, the cache is the stamina ring, cents
// are rupees.
//
// Sprites are rows of characters; each character is a key of `pixels` below
// (so 'G' is the tunic). Hero tiers and swords recolor by swapping keys.

import { at, hero, loop, once, weapon } from './kit'
import { rotate } from './pixel'
import type { Actor, Theme } from './types'

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
  hurtB: '#e04030',
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
  N: '#3050f8', // bomb
  d: '#1830a0',
  // Swords
  P: '#704000', // hilt
  F: '#8c8c8c', // guard
  E: '#d8d8d8', // blade
  T: '#fcfcfc', // tip
  wood: '#b07030',
  woodDark: '#704010',
  steel: '#e8e8f0',
  steelDark: '#7878a0',
  magic: '#5cd4fc',
  magicDark: '#2070c8',
  master: '#c8e8ff',
  masterGuard: '#6840c8',
  aura: '#fcf080',
  // Status bar
  black: '#000000',
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
    '.SS....AAYYAA....SS.',
    '.YY...AAAAAAAA...YY.',
    '.Gg..AaAAAAAAaA..gG.',
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
      '.GHSSSSSSSSSHSG.',
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
  sword: { rows: ['.P.', 'FFF', '.E.', '.E.', '.E.', '.E.', '.E.', '.E.', '.T.'] },
  aura: {
    rows: ['.....', '.....', '.y.y.', 'y...y', '.y.y.', 'y...y', '.y.y.', 'y...y', '.y.y.', 'y...y', '..y..'],
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
    rows: ['YXXXXXXXXY', 'X.y.y.y..X', 'XXXXXXXXXX', 'YxxxYYxxxY', 'xxxxjjxxxx', 'xxxxxxxxxx', 'XXXXXXXXXX'],
  },
  triforce: {
    rows: ['.....Y.....', '....YjY....', '...YYYjY...', '..Y.....Y..', '.YjY...YjY.', 'YYYjY.YYYjY'],
  },
  fairy1: { rows: ['a...a', '.aWa.', '..p..', '.apa.', 'a...a'] },
  fairy2: { rows: ['.....', 'aaWaa', '..p..', 'aapaa', '.....'] },
  potion: { rows: ['.ww.', '.nn.', 'nrrn', 'rrrr', 'rrrr', '.rr.'] },
  sweat: { rows: ['.O.', 'OOO', '.O.'] },
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

// Frames: actors are placed relative to the hero's top-left (see kit.ts).
/** The sword in the hero's hand as he swings. */
const sword = () => weapon(6, 13)

const FIRE = { x: 22, y: 8 }
const BUSH = { x: 4, y: 18 }
const torchesLit = (n: number, flicker = false): Actor[] =>
  [0, 1, 2, 3].map(k => at(k < n ? (flicker && k % 2 ? 'torchLit2' : 'torchLit') : 'torch', 22 + k * 6, 6))

const states: Theme['states'] = {
  idle: loop(
    { actors: [hero('lie'), at('fire1', FIRE.x, FIRE.y)], texts: [{ text: 'z', x: 4, y: -2, color: '#1c1c1c' }], hold: 3 },
    { actors: [hero('lie'), at('fire2', FIRE.x, FIRE.y)], texts: [{ text: 'z', x: 5, y: -4, color: '#1c1c1c' }], hold: 3 },
    { actors: [hero('lie'), at('fire1', FIRE.x, FIRE.y)], texts: [{ text: 'Z', x: 6, y: -6, color: '#1c1c1c' }], hold: 3 },
    { actors: [hero('lie'), at('fire2', FIRE.x, FIRE.y)], hold: 3 },
  ),
  thinking: loop(
    { actors: [hero('stand')], texts: [{ text: '.', x: 17, y: 0, color: '#1c1c1c' }], hold: 2 },
    { actors: [hero('stand')], texts: [{ text: '..', x: 17, y: 0, color: '#1c1c1c' }], hold: 2 },
    { actors: [hero('stand')], texts: [{ text: '...', x: 17, y: 0, color: '#1c1c1c' }], hold: 2 },
    { actors: [hero('walk')], texts: [{ text: '?', x: 17, y: 0, color: '#1c1c1c' }], hold: 2 },
  ),
  reading: loop(
    { actors: [hero('stand'), at('bush', BUSH.x, BUSH.y)], hold: 2 },
    { actors: [hero('attack'), sword(), at('bush', BUSH.x, BUSH.y)], hold: 1 },
    { actors: [hero('attack'), sword(), at('leaves1', BUSH.x, BUSH.y)], hold: 2 },
    { actors: [hero('stand'), at('leaves2', BUSH.x - 1, BUSH.y)], hold: 2 },
    { actors: [hero('walk')], hold: 1 },
  ),
  editing: loop(
    { actors: [hero('stand'), at('rock', BUSH.x, BUSH.y)], hold: 2 },
    { actors: [hero('attack'), sword(), at('rock', BUSH.x, BUSH.y), at('spark', 5, 16)], hold: 1 },
    { actors: [hero('attack'), sword(), at('rock', BUSH.x, BUSH.y)], hold: 1 },
    { actors: [hero('attack'), sword(), at('rock', BUSH.x, BUSH.y), at('spark', 6, 15)], hold: 1 },
    { actors: [hero('stand'), at('rock', BUSH.x, BUSH.y)], hold: 2 },
  ),
  shell: loop(
    { actors: [hero('stand'), ...torchesLit(0)], hold: 2 },
    { actors: [hero('stand'), ...torchesLit(1)], hold: 2 },
    { actors: [hero('stand'), ...torchesLit(2)], hold: 2 },
    { actors: [hero('stand'), ...torchesLit(3)], hold: 2 },
    { actors: [hero('itemGet'), ...torchesLit(4)], hold: 2 },
    { actors: [hero('itemGet'), ...torchesLit(4, true)], hold: 2 },
  ),
  agents: loop(
    { actors: [hero('itemGet'), at('fairy1', -2, 2), at('fairy2', 14, 2)], hold: 2 },
    { actors: [hero('itemGet'), at('fairy2', -7, 4), at('fairy1', 20, 4)], hold: 2 },
    { actors: [hero('itemGet'), at('fairy1', -13, 7), at('fairy2', 28, 7)], hold: 2 },
    { actors: [hero('stand')], hold: 3 },
    { actors: [hero('itemGet'), at('fairy2', -13, 7), at('fairy1', 28, 7)], hold: 2 },
    { actors: [hero('itemGet'), at('fairy1', -7, 4), at('fairy2', 20, 4)], hold: 2 },
  ),
}

const cold: Theme['cold'] = {
  idle: loop(
    { actors: [hero('lie'), at('fireOut', FIRE.x, FIRE.y)], texts: [{ text: 'z', x: 4, y: -2, color: '#1c1c1c' }], hold: 4 },
    { actors: [hero('lie'), at('fireOut', FIRE.x + 1, FIRE.y)], texts: [{ text: 'Z', x: 5, y: -4, color: '#1c1c1c' }], hold: 4 },
  ),
}

const SIGH = 'Overqualified for this.'
const sweat = at('sweat', 13, -1)
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('stand'), at('bush', BUSH.x, BUSH.y), sweat], hold: 2, caption: SIGH },
    { actors: [hero('attack'), sword(), at('bush', BUSH.x, BUSH.y), sweat], hold: 1, caption: SIGH },
    { actors: [hero('attack'), sword(), at('leaves1', BUSH.x, BUSH.y), sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), sweat], texts: [{ text: '~sigh~', x: 17, y: 0, color: '#1c1c1c' }], hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [hero('stand'), ...torchesLit(0), sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), ...torchesLit(2), sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), ...torchesLit(4), sweat], hold: 2, caption: SIGH },
    { actors: [hero('stand'), ...torchesLit(4, true), sweat], texts: [{ text: '~sigh~', x: 17, y: 0, color: '#1c1c1c' }], hold: 3, caption: SIGH },
  ),
}

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('attack'), sword(), at('slime1', 20, 8)], hold: 1 },
    { actors: [hero('attack'), sword(), at('slime2', 20, 8)], hold: 1 },
    { actors: [hero('stand'), at('puff1', 21, 8)], hold: 1 },
    { actors: [hero('stand'), at('puff2', 21, 7)], hold: 1 },
  ),
  toolError: once(
    { actors: [hero('stand', -1, 0, { G: 'hurtA', g: 'hurtA' })], hold: 1 },
    { actors: [hero('stand', -3, 0, { G: 'hurtB', g: 'hurtB' })], hold: 1 },
    { actors: [hero('stand', -4, 0, { G: 'hurtA', g: 'hurtA' })], hold: 1 },
    { actors: [hero('stand', -4, 0, { G: 'hurtB', g: 'hurtB' })], hold: 1 },
    { actors: [hero('stand', -3, 0)], hold: 1 },
  ),
  turnComplete: once(
    { actors: [hero('stand'), at('chest', 20, 9)], hold: 2 },
    { actors: [hero('stand'), at('chestOpen', 20, 9)], hold: 1 },
    {
      actors: [hero('itemGet'), at('chestOpen', 20, 9), at('triforce', 3, -7)],
      texts: [{ text: '*', x: 1, y: -8, color: '#f8c800' }, { text: '*', x: 15, y: -6, color: '#f8c800' }],
      hold: 2,
    },
    {
      actors: [hero('itemGet'), at('chestOpen', 20, 9), at('triforce', 3, -7)],
      texts: [{ text: '*', x: 0, y: -4, color: '#f8c800' }, { text: '*', x: 16, y: -10, color: '#f8c800' }],
      hold: 3,
    },
  ),
  milestone: once({ actors: [hero('stand')], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [hero('lie'), at('fire1', FIRE.x, FIRE.y)], hold: 2 },
    { actors: [hero('lie'), at('fireOut', FIRE.x, FIRE.y)], hold: 2 },
    { actors: [hero('lie'), at('fireOut', FIRE.x, FIRE.y)], message: 'cacheCold', hold: 12 },
  ),
  limitWarning: once({ actors: [hero('stand', 0, 0, { G: 'hurtB' })], message: 'limitWarning', hold: 15 }),
  compaction: once(
    { actors: [hero('itemGet'), at('potion', 6, -7)], hold: 3, caption: 'compaction' },
    { actors: [hero('itemGet'), at('potion', 6, -8)], hold: 3, caption: 'compaction' },
    { actors: [hero('stand')], hold: 2, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [hero('stand'), at('puff1', 5, 5)], hold: 1 },
    { actors: [at('puff2', 4, 4), at('puff1', 6, 8)], hold: 1 },
    { actors: [hero('itemGet')], hold: 6, caption: 'modelChange' },
  ),
  effortChange: once(
    { actors: [hero('itemGet'), weapon(6, -9, { flipY: true })], hold: 3 },
    {
      actors: [hero('itemGet'), weapon(6, -9, { flipY: true })],
      texts: [{ text: '*', x: 4, y: -10, color: '#fcfcfc' }],
      hold: 5,
      caption: 'effortChange',
    },
  ),
}

const CHAMPION_POSES = { stand: 'champStand', walk: 'champWalk', attack: 'champAttack', itemGet: 'champItemGet', sleep: 'champSleep', lie: 'champLie' }

export const zelda: Theme = {
  id: 'zelda',
  name: 'The Legend of Context',
  description: 'NES overworld homage: hearts, rupees, a tunic per model and a sword per effort',
  version: '1.0.0',
  palette: {
    dark: { accent: '#5cb82c', gold: '#f8c800', red: '#e04030', label: '#fc9838', dim: '#8c8c8c', text: '#fcfcfc' },
    light: { accent: '#2e7a16', gold: '#a87800', red: '#b02010', label: '#b85c00', dim: '#6c6c6c', text: '#1c1c1c' },
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
    Tokens: 'Bestiary',
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
    height: 38,
    anchor: { x: 16, y: 13 },
    background: { ground: 'ground', border: 'tree' },
    hero: { stand: 'stand', walk: 'walk', attack: 'attack', itemGet: 'itemGet', sleep: 'sleep', lie: 'lie' },
    heroTiers: {
      tier1: {},
      tier2: { G: 'blueT', g: 'blueS' },
      tier3: { G: 'redT', g: 'redS' },
      tier4: { G: 'royalT', g: 'royalS' },
      unknown: { G: 'hoodT', g: 'hoodS' },
    },
    heroForms: {
      tier3: { poses: CHAMPION_POSES, dx: -2, dy: -6, lift: 6 },
      tier4: { poses: CHAMPION_POSES, dx: -2, dy: -6, lift: 6 },
    },
    lineup: { ground: 'ground', flipWeapons: true },
    heroNames: {
      tier1: 'Young Hero',
      tier2: 'Blue Ring Hero',
      tier3: 'Red Champion',
      tier4: 'Champion of Legend',
      unknown: 'Hooded Traveler',
    },
    weapons: {
      low: { sprite: 'sword', swap: { E: 'wood', T: 'wood', F: 'woodDark' }, name: 'Wooden Sword' },
      medium: { sprite: 'sword', swap: { E: 'steel', T: 'W', F: 'steelDark' }, name: 'White Sword' },
      high: { sprite: 'sword', swap: { E: 'magic', T: 'W', F: 'magicDark' }, name: 'Magical Sword' },
      xhigh: { sprite: 'sword', swap: { E: 'master', T: 'W', F: 'masterGuard' }, name: 'Master Sword' },
      max: { sprite: 'sword', swap: { E: 'master', T: 'aura', F: 'masterGuard' }, aura: 'aura', name: 'Master Sword, awakened' },
    },
    bar: {
      widgets: [
        { kind: 'map', drop: 2 },
        { kind: 'counter', value: 'spend', icon: 'miniRupee', format: 'X{v}' },
        { kind: 'box', shows: 'model', sprite: 'ring', label: 'B', drop: 1 },
        { kind: 'box', shows: 'effort', sprite: 'miniSword', label: 'A', x: 3, y: 4 },
        { kind: 'meter', value: 'contextLeft', count: 10, perRow: 5, sprites: ['heart0', 'heart1', 'heart2', 'heart3', 'heart4'], label: '-LIFE-', pulseBelow: 0.2 },
      ],
      colors: { bg: 'black', box: 'boxBlue', text: 'W', label: 'r', map: 'mapGrey', mapDot: 'u' },
    },
    stamina: { x: 1, y: 12, radius: 5, full: 'staminaFull', empty: 'staminaEmpty', cold: 'staminaCold', tagIcon: 'miniRupee' },
  },
  text: {
    idle: 'The hero naps by the campfire.',
    thinking: 'The hero ponders the map...',
    reading: 'The hero cuts through tall grass.',
    editing: 'The hero strikes the stone.',
    shell: 'The hero lights the torches.',
    agents: 'Fairies fly off on errands.',
    toolSuccess: 'A slime is vanquished!',
    toolError: 'Ouch! The hero takes a hit.',
    turnComplete: 'You found a Triforce shard!',
    milestone: 'A milestone passes.',
    cacheCold: 'The campfire went out.',
    limitWarning: 'The sands of time run low.',
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
    compaction: 'You drank a red potion. Hearts restored!',
    modelChange: '{name} appears!',
    effortChange: 'You got the {weapon}!',
  },
}
