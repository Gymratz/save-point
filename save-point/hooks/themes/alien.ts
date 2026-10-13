// "Close Encounters of the Probed Kind": an original theme. A night shift over
// a dairy farm: the crew probes whatever the tractor beam brings up.
//
// The model is the crew member (an intern in a hi-vis vest up to the Grand High
// Probulator and his brain in a jar), effort is the probe, context is the herd
// not yet probed (and the night: dawn comes as it fills), the cache is the
// cow's sedative, cents are sample jars, rate limits are the Feds.
//
// Sprites are rows of characters; each character is a key of `pixels` below.

import { at, hero, loop, once, oneOf, weapon } from './kit'
import type { Actor, Animation, Frame, HeroTier, SceneText, Sprite, Theme, ThemeAction } from './types'

const pixels = {
  // Crew
  G: '#a4d4a0', // skin
  g: '#6c9c74', // skin shade
  K: '#141420', // eyes
  W: '#fcfcfc',
  U: '#fc9838', // suit: the intern's hi-vis vest
  u: '#c0601c',
  B: '#fcfcfc', // the intern's badge
  blueT: '#5c94fc',
  blueS: '#2c54b8',
  redT: '#e84838',
  redS: '#a01c14',
  royalT: '#a868f8',
  royalS: '#6434b4',
  coatT: '#c8a878',
  coatS: '#8c6c44',
  A: '#d8dcf0', // the officers' silver suit
  a: '#8088b0',
  Y: '#fcd000', // gold
  b: '#b88800',
  D: '#a0f0fc', // glass
  p: '#fc9cb4', // brain, muzzle
  P: '#d05c88',
  h: '#5c3c24', // fedora, mustache
  r: '#181818',
  hurtA: '#fcfcfc',
  hurtB: '#fcf080', // not a suit color, so the flash shows on every tier
  hurtC: '#58d8fc',
  // Specimens
  s: '#fcb87c', // human skin
  d: '#3c64d8', // denim
  y: '#e8c85c', // straw
  x: '#d83828', // red
  n: '#8c5a2c', // wood, boots
  // Saucer and gear
  M: '#c8d0e0', // metal
  m: '#7880a0',
  R: '#fc4838', // red light
  E: '#f0fcb8', // beam, bright
  e: '#a8f080', // beam
  o: '#40fca0', // hologram
  O: '#1c9c68',
  c: '#58d8fc', // signal
  z: '#fcf080', // spark
  k: '#101018', // the Feds' suits
  // Probes
  H: '#5c6480', // handle
  F: '#9ca4c0', // guard
  w: '#d8b888', // swab stick
  C: '#c0c8e0', // cotton shade
  J: '#b88800',
  T: '#fc50d8',
  // Scenery
  v: '#2c7c30',
  V: '#1c5420',
  f: '#48a040',
  L: '#f0f0d0', // moon
  l: '#b8b8a0',
  t: '#b03428', // barn
  q: '#701c18',
  S: '#fcd45c', // sun
  i: '#fc9c3c',
  night: '#141a4a',
  ink: '#f0f0d0',
  gone: '#2c5040',
  N: '#586078', // the herd's patches, on the bar's black
  // Status bar, the sedative dial, the message box
  barBg: '#040c08',
  barBox: '#3cbc5c',
  barLabel: '#7cf08c',
  radar: '#0c3c1c',
  radarDot: '#b8fc8c',
  sedFull: '#c084fc',
  sedEmpty: '#3c2c5c',
  sedCold: '#6c6c7c',
  msgBg: '#061a0c',
  msgInk: '#8cfc9c',
}

/** `base` with the non-blank characters of `over` written onto it, row by row number. */
const overlay = (base: string[], over: Record<number, string>): string[] =>
  base.map((row, y) => {
    const o = over[y]
    return o ? [...row].map((ch, x) => (o[x] && o[x] !== '.' ? o[x]! : ch)).join('') : row
  })

// The small crew (intern, field prober): 16 by 16.
const HEAD = [
  '....GGGGGGGG....',
  '..GGGGGGGGGGGG..',
  '.GGGGGGGGGGGGGG.',
  '.GGGGGGGGGGGGGG.',
  '.GKKKGGGGGGKKKG.',
  '.GKWKKGGGGKKWKG.',
  '.GGKKKGGGGKKKGG.',
  '..GGGGGGGGGGGG..',
]
const STAND = [...HEAD, '...GGGGGGGGGG...', '.....GGggGG.....', '......UUUU......', '...GUUUUUUUUG...', '..G.UUBUUUUU.G..', '..G..UUUUUU..G..', '.....UU..UU.....', '....GGG..GGG....']
const WALK = [...STAND.slice(0, 14), '.....UU...UU....', '....GGG.........']
// Arms out: the crew lifts things with the mind.
const ITEM_GET = [...HEAD, 'G..GGGGGGGGGG..G', 'G....GGggGG....G', '.G....UUUU....G.', '..GUUUUUUUUUUG..', '....UUBUUUUU....', '.....UUUUUU.....', '.....UU..UU.....', '....GGG..GGG....']
const SLEEP = overlay(STAND, { 4: '.GGGGGGGGGGGGGG.', 5: '.GKKKKGGGGKKKKG.', 6: '.GGGGGGGGGGGGGG.' })
// Facing right, the probing arm out: the hand ends on column 13, row 10.
const SIDE = [
  '...GGGGGGGG.....',
  '.GGGGGGGGGGGG...',
  'GGGGGGGGGGGGGG..',
  'GGGGGGGGGGGGGG..',
  'GGGGGGGGGGKKKG..',
  '.GGGGGGGGGKKWKG.',
  '.GGGGGGGGGGKKKG.',
  '..GGGGGGGGGGGG..',
  '....GGGGGGGGG...',
  '......GGGGgg....',
  '......UUUUUGGG..',
  '.....UUUUUU.....',
  '.....UBUUUU.....',
  '.....UUUUUU.....',
  '.....UU.UU......',
  '....GGG.GGG.....',
]

// "Totally Normal Human": the small crew under a fedora and a mustache, two rows taller.
const disguise = (rows: string[], side = false): string[] =>
  side
    ? ['....hhhhhh......', '...hhhhhhhh.....', ...overlay(rows, { 0: '...hrrrrrrh.....', 1: 'hhhhhhhhhhhhhhh.', 8: '.........hhhh...' })]
    : ['.....hhhhhh.....', '....hhhhhhhh....', ...overlay(rows, { 0: '....hrrrrrrh....', 1: '.hhhhhhhhhhhhhh.', 8: '.....hhhhhh.....' })]

// The officers (Opus and above): a great cranium, a silver suit, a high-collared
// cape in the tier's color. 20 by 22, feet level with the small crew's.
const BIG_HEAD = [
  '......GGGGGGGG......',
  '....GGGGGGGGGGGG....',
  '...GGGgGGGGGGgGGG...',
  '..GGGGGGgGGgGGGGGG..',
  '..GGgGGGGGGGGGGgGG..',
  '..GGGGGGGGGGGGGGGG..',
  '..GKKKKGGGGGGKKKKG..',
  '..GKWKKKGGGGKKKWKG..',
  '..GGKKKKGGGGKKKKGG..',
  '...GGGKKGGGGKKGGG...',
  '....GGGGGGGGGGGG....',
  'U.....GGGggGGG.....U',
]
const BIG_BODY = ['UU.....GGGGGG.....UU', 'UUUYYAAAAAAAAAAYYUUU', 'UuUAAAAAAYYAAAAAAUuU', 'UuUGAAAAAYYAAAAAGUuU', 'UuUGAAAAAAAAAAAAGUuU', 'UuU.GbbbbbbbbbbG.UuU']
const BIG_LEGS = ['UuU..AAAAAAAAAA..UuU', 'Uu...AAAA..AAAA...uU', 'u....AAAA..AAAA....u', '....aaaaa..aaaaa....']
const BIG_STRIDE = ['UuU..AAAAAAAAAA..UuU', 'Uu...AAAA...AAAA..uU', 'u....AAAA...aaaaa..u', '....aaaaa...........']
const BIG_STAND = [...BIG_HEAD, ...BIG_BODY, ...BIG_LEGS]
const BIG_WALK = [...BIG_HEAD, ...BIG_BODY, ...BIG_STRIDE]
const BIG_ITEM_GET = [
  ...BIG_HEAD.slice(0, 9),
  '.G.GGGKKGGGGKKGGG.G.',
  '.G..GGGGGGGGGGGG..G.',
  'UA....GGGggGGG....AU',
  'UUA....GGGGGG....AUU',
  'UUUYYAAAAAAAAAAYYUUU',
  'UuUAAAAAAYYAAAAAAUuU',
  'UuU.AAAAAYYAAAAA.UuU',
  'UuU.AAAAAAAAAAAA.UuU',
  'UuU..bbbbbbbbbb..UuU',
  ...BIG_LEGS,
]
const BIG_SLEEP = overlay(BIG_STAND, { 6: '..GGGGGGGGGGGGGGGG..', 7: '..GKKKKKGGGGKKKKKG..', 8: '..GGGGGGGGGGGGGGGG..', 9: '...GGGGGGGGGGGGGG...' })
// Facing right: the hand ends on column 15, so it lands where the small crew's does.
const BIG_SIDE = [
  '....GGGGGGGGG.......',
  '..GGGGGGGGGGGGG.....',
  '.GGGgGGGGgGGGGGG....',
  'GGGGGGgGGGGgGGGG....',
  'GGgGGGGGGGGGGGGG....',
  'GGGGGGGGGGGGGGGG....',
  'GGGGGGGGGGGKKKKG....',
  '.GGGGGGGGGGKKKWKG...',
  '.GGGGGGGGGGGKKKKG...',
  '..GGGGGGGGGGGGKG....',
  '....GGGGGGGGGGG.....',
  '..U....GGGGGgg......',
  '.UUU...GGGGG........',
  '.UUUYYAAAAAA........',
  'UUuUAAAAAAAAAGGG....',
  'UUuUAAAAAAAA........',
  'UUuUAAAAAAAA........',
  'UUuU.bbbbbbb........',
  'UUuU.AAAAAAA........',
  'UuU..AAA.AAA........',
  'Uu...AAA.AAA........',
  '....aaaa.aaaa.......',
]
// The Grand High Probulator keeps his brain where everyone can see it: a glass
// dome in place of the top of the head, two rows taller.
const DOME = [
  '.......DDDDDD.......',
  '.....DDppppppDD.....',
  '...DDppPppppPppDD...',
  '..DppPppPppPppPppD..',
  '..DpPppPppppPppPpD..',
  '..DppPppPPPPppPppD..',
  '..DpppPppppppPpppD..',
  '..DDGGGGGGGGGGGGDD..',
]
const DOME_SIDE = [
  '.....DDDDDDD........',
  '...DDpppppppDD......',
  '.DDppPppPpppPpDD....',
  'DppPppPpppPppPppD...',
  'DpPppPppPPpppPppD...',
  'DppPppppPppPpppPD...',
  'DpppPppPppppPppDD...',
  'DDGGGGGGGGGGGGGG....',
]
const domed = (rows: string[], side = false): string[] => [...(side ? DOME_SIDE : DOME), ...rows.slice(6)]

const COW = ['..........W.W', '.........WWWW', '.WWKKWWWWWKWW', 'KWKKKWWKKWWWW', 'KWWKWWWKKWWpp', '.WWWWWWWKW...', '.WWWWWWWWW...', '.W.Wpp.W.W...', '.W.W...W.W...', '.K.K...K.K...']
const MINI_COW = ['.....W.W', '.WWNWWWW', 'WWNNWWNp', '.WWWWW..', '.W.p.W..', '.N...N..']

/** A cow of the herd with `q` quarters of it still in the field: the rest is on its way up the beam. */
function herd(q: number): Sprite {
  const rows = MINI_COW.map((row, y) =>
    [...row]
      .map((ch, x) => {
        if (ch === '.') return '.'
        if (q >= 4) return ch
        if (q === 3) return ch === 'W' ? 'E' : ch
        if (q === 2) return (x + y) % 2 === 0 ? 'e' : '.'
        if (q === 1) return (x + 2 * y) % 4 === 0 ? 'e' : '.'
        return y === 5 ? 'X' : '.'
      })
      .join(''),
  )
  // Nothing left but trampled grass.
  if (q === 0) rows[5] = '.XXXXX..'
  return { rows, legend: { X: 'gone' } }
}

/** The tractor beam: a cone of light, 14 wide at the ground, shimmering between two phases. */
function beam(height: number, phase: number): Sprite {
  const wide = 14
  const top = 4
  return {
    rows: Array.from({ length: height }, (_, y) => {
      const w = 2 * Math.round((top + ((wide - top) * y) / (height - 1)) / 2)
      const x0 = (wide - w) / 2
      return Array.from({ length: wide }, (_, x) => (x < x0 || x >= x0 + w ? '.' : x === x0 || x === x0 + w - 1 || (y % 2 === phase && (x + (y >> 1)) % 2 === 0) ? 'e' : '.')).join('')
    }),
  }
}

const sprites: Theme['sprites'] = {
  stand: { rows: STAND },
  walk: { rows: WALK },
  itemGet: { rows: ITEM_GET },
  sleep: { rows: SLEEP },
  side: { rows: SIDE },
  hatStand: { rows: disguise(STAND) },
  hatWalk: { rows: disguise(WALK) },
  hatItemGet: { rows: disguise(ITEM_GET) },
  hatSleep: { rows: disguise(SLEEP) },
  hatSide: { rows: disguise(SIDE, true) },
  bigStand: { rows: BIG_STAND },
  bigWalk: { rows: BIG_WALK },
  bigItemGet: { rows: BIG_ITEM_GET },
  bigSleep: { rows: BIG_SLEEP },
  bigSide: { rows: BIG_SIDE },
  domeStand: { rows: domed(BIG_STAND) },
  domeWalk: { rows: domed(BIG_WALK) },
  domeItemGet: { rows: domed(BIG_ITEM_GET) },
  domeSleep: { rows: domed(BIG_SLEEP) },
  domeSide: { rows: domed(BIG_SIDE, true) },
  // Probes, stored handle up.
  swab: { rows: ['..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '.WWW.', '.WCW.', '.WWW.'] },
  probe: { rows: ['.HHH.', '.HHH.', '.FFF.', '..M..', '..M..', '..M..', '..M..', '.RRR.', '.RRR.'] },
  deepProbe: { rows: ['.HHH.', '.HHH.', '.FFF.', '.MmM.', '.MMM.', '.MmM.', '.MMM.', '.DDD.', '..D..'] },
  deeperProbe: { rows: ['.HHH.', '.HHH.', 'FFFFF', '.MmM.', '.MRM.', '.MmM.', 'MMMMM', 'M.M.M', 'M.M.M'] },
  lastProbe: { rows: ['.JYJ.', '.JYJ.', 'YYYYY', '.YJY.', '.YTY.', '.YJY.', 'TYTYT', '.TTT.', 'T.T.T'] },
  probeAura: { rows: ['...z...', '.......', 'z.....z', '.......', '.......', 'z.....z', '.......', '.z...z.', '.......', 'z.....z', '..z.z..'] },
  // Specimens
  cow: { rows: COW },
  cowWheels: { rows: [...COW.slice(0, 7), 'MMM.ppMMM....', 'MKM...MKM....', 'MMM...MMM....'] },
  cowTwoHeads: { rows: ['W.W.......W.W', 'WWWW.....WWWW', 'WWKWWWWWWWKWW', 'WWWWKKWKKWWWW', 'ppWWKKWKKWWpp', '...WWWWWWW...', '...WWWWWWW...', '...W.Wpp.W...', '...W.W...W...', '...K.K...K...'] },
  cowSmall: { rows: ['.....W', 'WWKWWW', 'WKWWWp', 'WWWW..', 'K..K..'] },
  cowTiny: { rows: ['WKW', 'K.K'] },
  holoCow: { rows: COW, legend: { W: 'o', K: 'O', p: 'o' } },
  antenna: { rows: ['RR.RR', 'RR.RR', '.M.M.', '.M.M.'] },
  farmer1: { rows: ['..yyyy..', '..yyyy..', 'yyyyyyyy', '..sKsK..', '..ssss..', 's.sWWs.s', '.sxddxs.', '..xddx..', '..dddd..', '..dddd..', '..d..d..', '..d..d..', '.nn..nn.'] },
  farmer2: { rows: ['..yyyy..', '..yyyy..', 'yyyyyyyy', '..sKsK..', '..ssss..', '..sWWs..', '..xddx..', 'ssxddxss', '..dddd..', '..dddd..', '..d..d..', '..d..d..', '.nn..nn.'] },
  gnome: { rows: ['...x...', '..xxx..', '..xxx..', '.xxxxx.', '.sKsKs.', '.WsssW.', '.WWWWW.', '.dWWWd.', '.ddddd.', '.nn.nn.'] },
  mailbox: { rows: ['.MMMMM.', 'MMMMMMx', 'MmmmMMx', 'MmmmMM.', 'MMMMMM.', '..nn...', '..nn...', '..nn...', '..nn...', '..nn...'] },
  chicken: { rows: ['....xx.', '....WWy', 'W..WWW.', 'WWWWWW.', '.WWWWW.', '..y.y..', '..y.y..'] },
  sticker: { rows: ['.Y.', 'YYY', '.Y.'] },
  // The saucer and what it does
  ufo1: { rows: ['....DDDDDD....', '...DWDDDDDD...', '.MMMMMMMMMMMM.', 'MMMMMMMMMMMMMM', 'mYmRmYmRmYmRmm', '..mmmmmmmmmm..', '.....mEEm.....'] },
  ufo2: { rows: ['....DDDDDD....', '...DWDDDDDD...', '.MMMMMMMMMMMM.', 'MMMMMMMMMMMMMM', 'mRmYmRmYmRmYmm', '..mmmmmmmmmm..', '.....mEEm.....'] },
  beamA: beam(22, 0),
  beamB: beam(22, 1),
  beamTallA: beam(26, 0),
  beamTallB: beam(26, 1),
  projector: { rows: ['..oo..', '.mMMm.', 'mmmmmm'] },
  phone: {
    rows: ['......M.....M', '......MM...MM', '.......MMMMM.', '.........n...', '.........n...', '.........n...', '.........n...', '.........n...', 'xxxxx....n...', 'xYxYx....n...', 'xxxxx....n...', 'xYxYxnnnnn...', 'xxxxx....n...'],
  },
  phoneLit: {
    rows: ['......M.....M', '......MM...MM', '.......MMMMM.', '.........n...', '.........n...', '.........n...', '.........n...', '.........n...', 'xxxxx....n...', 'xWxWx....n...', 'xxxxx....n...', 'xWxWxnnnnn...', 'xxxxx....n...'],
  },
  wave1: { rows: ['.ccc.', 'c...c'] },
  wave2: { rows: ['.ccccc.', 'c.....c'] },
  wave3: { rows: ['..ccccc..', '.c.....c.', 'c.......c'] },
  drone1: { rows: ['.DDD.', 'MMMMM', '.Y.Y.'] },
  drone2: { rows: ['.DDD.', 'MMMMM', 'R.R.R'] },
  scan: { rows: ['.e.', 'e.e', '.e.', 'e.e', '.e.'] },
  spark: { rows: ['..W..', 'W.z.W', '.zWz.', 'W.z.W', '..W..'] },
  zap1: { rows: ['..c..', '.c...', 'ccc..', '..c..', '.c...'] },
  zap2: { rows: ['..z..', '...z.', '..zzz', '..z..', '...z.'] },
  puff1: { rows: ['..MM..', '.MmmM.', 'MmMmmM', '.MmmM.', '..MM..'] },
  puff2: { rows: ['M..M..M', '.M...M.', '...m...', '.M...M.', 'M..M..M'] },
  sweat: { rows: ['.c.', '.c.', 'ccc', 'ccc', '.c.'] },
  // The Feds: a man in black, and his notepad.
  agent1: { rows: ['..kkkk..', '..kkkk..', '..ssss..', '..kkks..', '..ssss..', '.kkWWkk.', 'kkkWxkkk', 'kkkWxkkk', 'kskWWksk', '.kkkkkk.', '..kk.kk.', '..kk.kk.', '..kk.kk.', '.kkk.kkk'] },
  agent2: { rows: ['..kkkk..', '..kkkk..', '..ssss..', '..kkks..', '..ssss..', '.kkWWkk.', 'WWkWxkkk', 'WWsWxkkk', 'kkkWWksk', '.kkkkkk.', '..kk.kk.', '..kk.kk.', '..kk.kk.', '.kkk.kkk'] },
  // Scenery
  grass: { rows: ['.f...f..', 'fvf.fvf.', 'vvvvvvvv', 'vVvvVvvv', 'VVVVVVVV'] },
  moon: { rows: ['..LLLL.', '.LLl...', 'LLL....', 'LLL....', 'LLL....', '.LLl...', '..LLLL.'] },
  sun: { rows: ['...iSSSSi...', '.iSSSSSSSSi.', 'iSSSSSSSSSSi', 'SSSSSSSSSSSS', 'SSSSSSSSSSSS'] },
  barn: { rows: ['....q....', '...qqq...', '..qqqqq..', '.qqqqqqq.', 'qqqqqqqqq', 'tttWWWttt', 'tttWKWttt', 'tttWWWttt', 'ttttttttt', 'ttWWWWWtt', 'ttWtWtWtt', 'ttWWtWWtt'] },
  barnLit: { rows: ['....q....', '...qqq...', '..qqqqq..', '.qqqqqqq.', 'qqqqqqqqq', 'tttWWWttt', 'tttWYWttt', 'tttWWWttt', 'ttttttttt', 'ttWWWWWtt', 'ttWtWtWtt', 'ttWWtWWtt'] },
  cruiser: { rows: ['.....Rc......', '...WWWWWW....', '..WDDWWDDW...', 'aaaaWWWWWaaaa', 'aaaaWWWWWaaYa', 'ammaaaaaammaa', '.mm......mm..'] },
  newsVan: { rows: ['......M...M...', '.......MMM....', '........m.....', '.WWWWWWWWWWW..', '.WxxxxWWDDDW..', '.WWWWWWWDDDWW.', '.WWWWWWWWWWWWW', '.WWWWWWWWWWWWW', '.WmmWWWWWWmmW.', '..mm......mm..'] },
  scarecrow: { rows: ['...yyy...', '..yyyyy..', '...sss...', '...sKs...', 'n.xxxxx.n', 'nnxxxxxnn', '..xxxxx..', '...ddd...', '...ddd...', '....n....', '....n....', '....n....'] },
  windmill: { rows: ['M..M..M', '.M.M.M.', '..MMM..', 'MMMmMMM', '..MMM..', '.M.M.M.', 'M..M..M', '...m...', '..m.m..', '..m.m..', '..mmm..', '.m...m.', '.m...m.', '.mmmmm.', 'm.....m', 'm.....m'] },
  // You: a gloved hand from the top of the scene, a fist around the crew's own probe, or an open palm waving.
  // A pale edge (the night sky swallows a dark one) and a red cuff.
  hand: { rows: ['.xxxxxx.', 'xxxxxxxx', 'aWWWWWWa', 'aWaWaWWa', 'aWWWWWWa', 'aWWWWWWa', '.aWWWWa.', '..aaaa..'] },
  palm: { rows: ['.a.a.a..', 'aWaWaWa.', 'aWaWaWaa', 'aWWWWWWa', 'aWWWWWWa', 'aWWWWWWa', '.aWWWWa.', '.xxxxxx.', 'xxxxxxxx'] },
  palm2: { rows: ['..a.a.a.', '.aWaWaWa', 'aaWaWaWa', 'aWWWWWWa', 'aWWWWWWa', 'aWWWWWWa', '.aWWWWa.', '.xxxxxx.', 'xxxxxxxx'] },
  // What the crew and the cow answer with.
  permit: { rows: ['rrrrrrrrr', 'rYYYYYYYr', 'rYrYYrYYr', 'rYYYYYYYr', 'rrrrrrrrr'] },
  clipboard: { rows: ['..nn..', 'nnnnnn', 'nWWWWn', 'nWKWWn', 'nWWWWn', 'nWKWWn', 'nWWWWn', 'nnnnnn'] },
  cowKick: { rows: ['..........W.W', '.........WWWW', '...WWWWWWWKWW', 'KK.KWWWKKWWWW', '.KKWWWWKKWWpp', '...WWWWWWKW..', '...WWWWWWWW..', '.......W.W...', '.......W.W...', '.......K.K...'] },
  cowBack: { rows: ['....K....', '....K....', '.WWWWWWW.', 'WWWWWWWWW', 'WWKKWWWWW', 'WWWWWKKWW', 'WWWWWWWWW', '.WWWWWWW.', '.WW.W.WW.', '.KK.K.KK.'] },
  cowSit: { rows: ['..........W.W', '.........WWWW', '.WWKKWWWWWKWW', 'KWKKKWWKKWWWW', 'KWWKWWWKKWWpp', '.WWWWWWWKW...', '.WWWWWWWWW...', '.KKWWWWKKW...'] },
  // The Feds, waving back, with a camera, with the flashy thing; and the flash itself (a full-scene backdrop).
  agentWave: { rows: ['..kkkk..', '..kkkk..', '..ssss..', '..kkks.s', '..ssss.k', '.kkWWkkk', 'kkkWxkkk', 'kkkWxkkk', 'kskWWksk', '.kkkkkk.', '..kk.kk.', '..kk.kk.', '..kk.kk.', '.kkk.kkk'] },
  camera: { rows: ['MMMMM', 'MKKMM', 'MKKMM', 'MMMMM'] },
  wiper: { rows: ['.R.', '.M.', '.M.', '.M.', '.M.', '.m.'] },
  flash: { rows: Array.from({ length: 66 }, () => 'E'.repeat(96)) },
  // Status bar
  herd0: herd(0),
  herd1: herd(1),
  herd2: herd(2),
  herd3: herd(3),
  herd4: herd(4),
  miniJar: { rows: ['mmm', 'DoD', 'DoD', 'DDD'] },
  miniHead: { rows: ['.GGG.', 'GGGGG', 'GKGKG', '.GGG.', '.UUU.', 'UUUUU'] },
  miniHat: { rows: ['.hhh.', 'hhhhh', 'GKGKG', '.hhh.', '.UUU.', 'UUUUU'] },
  miniBrain: { rows: ['.DDD.', 'DpPpD', 'GKGKG', '.GGG.', '.UUU.', 'UUUUU'] },
  miniSwab: { rows: ['.w.', '.w.', '.w.', '.w.', 'WWW', 'WCW', 'WWW'] },
  miniProbe: { rows: ['HHH', '.M.', '.M.', '.M.', '.M.', 'RRR', 'RRR'] },
  miniDeep: { rows: ['HHH', 'MmM', 'MMM', 'MmM', 'MMM', 'DDD', '.D.'] },
  miniDeeper: { rows: ['HHH', 'MmM', 'MRM', 'MmM', 'MMM', 'M.M', 'M.M'] },
  miniLast: { rows: ['JYJ', 'YYY', 'YJY', 'YTY', 'YYY', 'TTT', 'T.T'] },
}

// Frames: actors are placed relative to the hero's top-left (see kit.ts). The
// crew stands at columns 12..27 (the officers at 10..29); the saucer hovers over
// the specimen spot at 33..46, its beam coming down to the grass.
const INK = 'ink'
const GOLD = '#fcd000'
const SMALL: HeroTier[] = ['tier1', 'tier2', 'unknown']
const BIG: HeroTier[] = ['tier3', 'tier4']
const SHIP = { x: 21, y: -13 }
const BEAM = { x: 21, y: -6 }
/** A specimen's left edge: where the probe arrives. */
const SPOT = 22

const scenery = (sprite: string, x: number, y: number, opts: Partial<Actor> = {}): Actor => at(sprite, x, y, { fixed: true, ...opts })
// The saucer and its beam go with the crew: not drawn while the crew's rest has taken the ship away.
const ship = (blink = false, x = SHIP.x, y = SHIP.y): Actor => scenery(blink ? 'ufo2' : 'ufo1', x, y, { gone: 'ship' })
const ray = (shimmer = false): Actor => scenery(shimmer ? 'beamB' : 'beamA', BEAM.x, BEAM.y, { gone: 'ship' })
/** A specimen `h` pixels tall held in the beam, `up` pixels above where it floats; `grounded`: standing on the grass. */
const held = (sprite: string, h: number, up = 0, opts: Partial<Actor> = {}): Actor => scenery(sprite, SPOT, 14 - h - up, opts)
const grounded = (sprite: string, h: number, opts: Partial<Actor> = {}): Actor => scenery(sprite, SPOT, 16 - h, opts)
/** The probe in the outstretched hand, slid `reach` pixels forward. The crew member stands still: a body that steps every frame twitches. */
const probing = (reach = 0): Actor[] => [hero('side'), weapon(13 + reach, 8, { turn: 'ccw' })]
const say = (text: string, x: number, y: number, color = INK, lift = false): SceneText => ({ text, x, y, color, lift })

type Specimen = { sprite: string; h: number; yelp: string; caption: string; alt?: string }
const SPECIMENS: Specimen[] = [
  { sprite: 'cow', h: 10, yelp: 'MOO?!', caption: 'Probing a cow. For science.' },
  { sprite: 'farmer1', alt: 'farmer2', h: 13, yelp: 'HEY!', caption: 'Probing a farmer. No one will believe him.' },
  { sprite: 'gnome', h: 10, yelp: '...', caption: 'Probing a garden gnome. No reaction. Suspicious.' },
  { sprite: 'mailbox', h: 10, yelp: 'clang', caption: 'Probing a mailbox. It is mostly bills.' },
  { sprite: 'chicken', h: 7, yelp: 'BAWK!', caption: 'Probing a chicken. It had it coming.' },
]

/** One probing: the specimen hangs in the beam, the probe goes in twice, the specimen objects. */
const probe = (s: Specimen, extra: Actor[] = [], caption = s.caption): Frame[] => {
  const yelpAt = 10 - s.h
  return [
    { actors: [...probing(), ship(), ray(), held(s.sprite, s.h), ...extra], hold: 2 },
    { actors: [...probing(1), ship(), ray(true), held(s.sprite, s.h), ...extra], hold: 1 },
    { actors: [...probing(3), ship(true), ray(), held(s.alt ?? s.sprite, s.h, 1), scenery('spark', 20, 6), ...extra], texts: [say(s.yelp, 23, yelpAt)], hold: 2, caption },
    { actors: [...probing(1), ship(), ray(true), held(s.sprite, s.h), ...extra], hold: 1, caption },
    { actors: [...probing(3), ship(true), ray(), held(s.alt ?? s.sprite, s.h, 1), scenery('spark', 20, 6), ...extra], texts: [say('!', 25, yelpAt)], hold: 2, caption },
    { actors: [hero('stand'), ship(), ray(true), held(s.sprite, s.h), ...extra], hold: 2, caption },
  ]
}

/** A refactoring of the cow: two welds with the probe, then the improvement. */
const refactor = (after: (blink: boolean) => Actor[], caption: string): Frame[] => [
  { actors: [...probing(), ship(), ray(), held('cow', 10)], hold: 2 },
  { actors: [...probing(3), ship(true), ray(true), held('cow', 10), scenery('spark', 20, 6)], hold: 1 },
  { actors: [...probing(1), ship(), ray(), held('cow', 10)], hold: 1 },
  { actors: [...probing(3), ship(true), ray(true), held('cow', 10), scenery('spark', 21, 5)], hold: 1 },
  { actors: [hero('itemGet'), ship(), ray(), ...after(false)], texts: [{ text: '*', x: 20, y: 0, color: GOLD }, { text: '*', x: 34, y: 8, color: GOLD }], hold: 2, caption },
  { actors: [hero('itemGet'), ship(true), ray(true), ...after(true)], texts: [{ text: '*', x: 20, y: 4, color: GOLD }, { text: '*', x: 34, y: 2, color: GOLD }], hold: 2, caption },
]

// The drones leave the saucer, one for the far field and one to scan the grass, and come back.
const drones = (step: 0 | 1 | 2, blink = false): Actor[] => {
  const [a, b] = blink ? ['drone2', 'drone1'] : ['drone1', 'drone2']
  if (step === 0) return [scenery(a!, 22, -5), scenery(b!, 31, -5)]
  if (step === 1) return [scenery(a!, 6, -11), scenery(b!, 28, 3)]
  return [scenery(a!, -11, 4), scenery('scan', -10, 7), scenery(b!, 26, 8), scenery('scan', 27, 11)]
}

const PHONE = scenery('phone', 15, 3)
const PHONE_LIT = scenery('phoneLit', 15, 3)
const waves = (n: number): Actor[] => [scenery('wave1', 22, 0), scenery('wave2', 22, -3), scenery('wave3', 22, -7)].slice(0, n)
const dial = (press: number, n: number, blink = false, extra: Actor[] = []): Actor[] => [hero('side'), press ? PHONE_LIT : PHONE, ship(blink), ...waves(n), ...extra]

const states: Theme['states'] = {
  // The crew dozes on its feet; the cow sleeps off its sedative, legs in the air.
  idle: loop(
    { actors: [hero('sleep'), ship(), grounded('cow', 10, { flipY: true })], texts: [say('z', 13, -2, INK, true), say('z', 29, 2)], hold: 3 },
    { actors: [hero('sleep'), ship(true), grounded('cow', 10, { flipY: true })], texts: [say('z', 14, -4, INK, true), say('Z', 30, 0)], hold: 3 },
    { actors: [hero('sleep'), ship(), grounded('cow', 10, { flipY: true })], texts: [say('Z', 15, -6, INK, true)], hold: 3 },
    { actors: [hero('sleep'), ship(true), grounded('cow', 10, { flipY: true })], hold: 3 },
  ),
  // A hologram of the specimen turns over a projector while the crew thinks.
  thinking: loop(
    { actors: [hero('stand'), ship(), scenery('projector', 25, 13), scenery('holoCow', SPOT, 2)], texts: [say('.', 17, -2, INK, true)], hold: 2 },
    { actors: [hero('stand'), ship(), scenery('projector', 25, 13), scenery('holoCow', SPOT, 2, { flip: true })], texts: [say('..', 17, -2, INK, true)], hold: 2 },
    { actors: [hero('stand'), ship(true), scenery('projector', 25, 13), scenery('holoCow', SPOT, 2)], texts: [say('...', 17, -2, INK, true)], hold: 2 },
    { actors: [hero('walk'), ship(true), scenery('projector', 25, 13), scenery('holoCow', SPOT, 2, { flip: true })], texts: [say('?', 17, -2, INK, true)], hold: 2 },
  ),
  // Something new in the beam every time. Everything gets probed.
  reading: oneOf(loop(...probe(SPECIMENS[0]!)), ...SPECIMENS.slice(1).map(s => loop(...probe(s)))),
  editing: oneOf(
    loop(...refactor(blink => [held('cow', 10), scenery('antenna', SPOT + 8, 0, blink ? { swap: { R: 'Y' } } : {})], 'Refactoring the cow: antenna added.')),
    loop(...refactor(() => [held('cowWheels', 10)], 'Refactoring the cow: now with wheels.')),
    loop(...refactor(() => [held('cowTwoHeads', 10)], 'Refactoring the cow: a second head, for failover.')),
  ),
  // A keypad, an umbrella and some foil: the signal goes up to the saucer.
  shell: loop(
    { actors: dial(0, 0), hold: 2 },
    { actors: dial(2, 1), texts: [say('bip', 15, 8)], hold: 2 },
    { actors: dial(0, 2), hold: 1 },
    { actors: dial(2, 3, true), texts: [say('bip', 15, 8)], hold: 2, caption: 'Phoning home. Roaming charges apply.' },
    { actors: dial(0, 3), hold: 1, caption: 'Phoning home. Roaming charges apply.' },
    { actors: dial(0, 0, true), texts: [say('OK', 13, -12, GOLD)], hold: 2, caption: 'Phoning home. Roaming charges apply.' },
  ),
  agents: loop(
    { actors: [hero('itemGet'), ship(true), ...drones(0)], hold: 2 },
    { actors: [hero('itemGet'), ship(), ...drones(1)], hold: 2 },
    { actors: [hero('stand'), ship(true), ...drones(2)], hold: 2, caption: 'Probe drones away. More things to probe.' },
    { actors: [hero('stand'), ship(), ...drones(2, true)], hold: 3, caption: 'Probe drones away. More things to probe.' },
    { actors: [hero('stand'), ship(true), ...drones(1, true)], hold: 2 },
    { actors: [hero('itemGet'), ship(), ...drones(0, true)], hold: 2 },
  ),
}

const cold: Theme['cold'] = {
  // The sedative wore off: the cow is up, and watching.
  idle: loop(
    { actors: [hero('sleep'), ship(), grounded('cow', 10, { flip: true })], texts: [say('z', 13, -2, INK, true)], hold: 4 },
    { actors: [hero('sleep'), ship(true), grounded('cow', 10, { flip: true })], texts: [say('Z', 14, -4, INK, true), say('moo.', 24, 2)], hold: 4 },
  ),
}

const SIGH_READ = 'Three doctorates in xenobiology. Probing a mailbox.'
const SIGH_SHELL = 'Commands a starfleet. Asked to phone home.'
// A drop beside the brow.
const sweat: Actor[] = [
  { ...scenery('sweat', 16, 1), tiers: SMALL },
  { ...scenery('sweat', 18, -5), tiers: BIG },
]
const overkill: Theme['overkill'] = {
  reading: loop(...probe(SPECIMENS[3]!, sweat, SIGH_READ).map(f => ({ ...f, caption: SIGH_READ }))),
  shell: loop(
    { actors: dial(0, 0, false, sweat), hold: 2, caption: SIGH_SHELL },
    { actors: dial(2, 1, false, sweat), texts: [say('bip', 15, 8)], hold: 2, caption: SIGH_SHELL },
    { actors: dial(0, 3, true, sweat), hold: 2, caption: SIGH_SHELL },
    { actors: dial(0, 0, false, sweat), texts: [say('~sigh~', 13, -2, INK, true)], hold: 3, caption: SIGH_SHELL },
  ),
}

const SUIT = ['G', 'g', 'U', 'u', 'A', 'a', 'B', 'Y', 'b', 'h']
const tint = (color: string) => Object.fromEntries(SUIT.map(k => [k, color]))
const HURT_A = tint('hurtA')
const HURT_B = { ...tint('hurtB'), g: 'hurtC', u: 'hurtC', a: 'hurtC' }
const BEAMED = tint('E')

/** The beam takes a specimen up into the saucer. */
const acquired = (s: Specimen) =>
  once(
    { actors: [hero('stand'), ship(), ray(), held(s.sprite, s.h)], hold: 1 },
    { actors: [hero('stand'), ship(true), ray(true), held(s.alt ?? s.sprite, s.h, 4)], hold: 1 },
    // Half inside already: the saucer is drawn over it.
    { actors: [hero('stand'), ray(), held(s.sprite, s.h, 22 - s.h), ship()], hold: 1 },
    { actors: [hero('itemGet'), ship(true)], texts: [say('+1', 14, -12, GOLD)], hold: 1 },
  )

// The saucer slides over to drop off the new crew member, and back.
const OVER = { x: 1, y: -17 }
const HALF = { x: 11, y: -15 }
const column = (shimmer = false): Actor => scenery(shimmer ? 'beamTallB' : 'beamTallA', OVER.x, OVER.y + 7)
const AGENT = { x: 25, y: 2 }
const worried: SceneText[] = [say('?!', 27, 2)]

const events: Theme['events'] = {
  toolSuccess: oneOf(acquired(SPECIMENS[0]!), acquired(SPECIMENS[1]!), acquired(SPECIMENS[4]!)),
  // The probe shorts out. Knocked back two pixels at most, and back to his place.
  toolError: once(
    { actors: [...probing(), ship(), scenery('zap1', 21, 6)], hold: 1 },
    { actors: [hero('stand', -1, 0, HURT_A), ship(true), scenery('zap2', 17, 2)], hold: 1 },
    { actors: [hero('stand', -2, 0, HURT_B), ship(), scenery('zap1', 16, 6)], hold: 1 },
    { actors: [hero('stand', -1, 0, HURT_A), ship(true), scenery('zap2', 17, 4)], hold: 1 },
    { actors: [hero('stand'), ship(), { ...scenery('puff1', 5, -6), tiers: SMALL }, { ...scenery('puff1', 5, -13), tiers: BIG }], hold: 1 },
  ),
  // Set down gently, and given a sticker for being brave.
  turnComplete: once(
    { actors: [hero('stand'), ship(), ray(), held('cow', 10, 4)], hold: 2 },
    { actors: [hero('stand'), ship(true), ray(true), held('cow', 10)], hold: 1 },
    { actors: [hero('itemGet'), ship(), grounded('cow', 10), scenery('sticker', SPOT + 5, 9)], texts: [{ text: '*', x: 21, y: 4, color: GOLD }, { text: '*', x: 35, y: 2, color: GOLD }], hold: 2 },
    { actors: [hero('itemGet'), ship(true), grounded('cow', 10), scenery('sticker', SPOT + 5, 9)], texts: [{ text: '*', x: 22, y: 2, color: GOLD }, { text: '*', x: 34, y: 4, color: GOLD }], hold: 3 },
  ),
  milestone: once({ actors: [hero('stand'), ship()], message: 'milestone', hold: 9 }, { actors: [hero('stand'), ship(true)], message: 'milestone', hold: 9 }),
  cacheCold: once(
    { actors: [hero('sleep'), ship(), grounded('cow', 10, { flipY: true })], hold: 2 },
    { actors: [hero('sleep'), ship(true), grounded('cow', 10, { flipY: true })], texts: [say('!', 27, 0)], hold: 2 },
    { actors: [hero('sleep'), ship(), grounded('cow', 10, { flip: true })], message: 'cacheCold', hold: 6 },
    { actors: [hero('sleep'), ship(true), grounded('cow', 10, { flip: true })], texts: [say('MOO.', 24, 2)], message: 'cacheCold', hold: 6 },
  ),
  // The saucer is nowhere to be seen. Nothing to see here.
  limitWarning: once(
    { actors: [hero('stand'), scenery('agent1', AGENT.x, AGENT.y)], message: 'limitWarning', hold: 5 },
    { actors: [hero('stand'), scenery('agent2', AGENT.x, AGENT.y)], texts: [{ text: '!', x: 17, y: -2, color: GOLD, lift: true }], message: 'limitWarning', hold: 5 },
    { actors: [hero('stand'), scenery('agent1', AGENT.x, AGENT.y)], message: 'limitWarning', hold: 5 },
  ),
  // The shrink ray: the same cow, a third of the hold.
  compaction: once(
    { actors: [...probing(), ship(), ray(), held('cow', 10)], hold: 2, caption: 'compaction' },
    { actors: [...probing(3), ship(true), ray(true), held('cowSmall', 5, 2), scenery('zap2', 21, 6)], hold: 2, caption: 'compaction' },
    { actors: [...probing(1), ship(), ray(), held('cowTiny', 2, 4), scenery('zap1', 23, 6)], hold: 2, caption: 'compaction' },
    { actors: [hero('itemGet'), ship(true), ray(true), held('cowTiny', 2, 4)], texts: [{ text: '*', x: 23, y: 6, color: GOLD }, { text: '*', x: 31, y: 8, color: GOLD }], hold: 3, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [hero('stand'), ship(false, HALF.x, HALF.y)], hold: 1 },
    { actors: [hero('stand', 0, 0, BEAMED), ship(true, OVER.x, OVER.y), column()], hold: 1 },
    { actors: [ship(false, OVER.x, OVER.y), column(true), scenery('puff2', 4, 4)], hold: 1 },
    { actors: [hero('stand', 0, 0, BEAMED), ship(true, OVER.x, OVER.y), column()], hold: 1 },
    { actors: [hero('itemGet'), ship(false, OVER.x, OVER.y)], hold: 3, caption: 'modelChange' },
    { actors: [hero('itemGet'), ship(true, HALF.x, HALF.y)], hold: 1, caption: 'modelChange' },
    { actors: [hero('stand'), ship()], hold: 3, caption: 'modelChange' },
  ),
  // The new probe hangs over the raised hands. The cow has seen it.
  effortChange: once(
    { actors: [hero('itemGet'), ship(), weapon(6, -11, { flipY: true }), grounded('cow', 10, { flip: true })], hold: 3 },
    {
      actors: [hero('itemGet'), ship(true), weapon(6, -11, { flipY: true }), grounded('cow', 10, { flip: true }), scenery('sweat', SPOT + 5, 3)],
      texts: [{ text: '*', x: 2, y: -8, color: GOLD, lift: true }, { text: '*', x: 13, y: -10, color: GOLD, lift: true }, ...worried],
      hold: 5,
      caption: 'effortChange',
    },
  ),
}

// ---------------------------------------------------------------------------
// Actions: the buttons under the scene. You are a gloved hand from the top of
// the scene. Each press plays one of the tier's takes, picked at random; the
// target's patience wears down with repeated presses (see `pressAction`).
// ---------------------------------------------------------------------------

/** The hand (8 by 8) around the probe of the current effort: the probe hangs from the fist, its tip 13 pixels under the hand's top. */
const you = (x: number, y: number, opts: Partial<Actor> = {}): Actor[] => [weapon(x + 2, y + 5, opts), at('hand', x, y, opts)]
/** The empty hand. */
const fist = (x: number, y: number, opts: Partial<Actor> = {}): Actor => at('hand', x, y, opts)
// Who is who, for the rests: the cow is `cow`, the crew member (and what it does) is `crew`, the saucer `ship`.
const SLEEPING_COW = grounded('cow', 10, { flipY: true, gone: 'cow' })
const COW_UP = grounded('cow', 10, { gone: 'cow' })
const COW_LEFT = grounded('cow', 10, { flip: true, gone: 'cow' })
const crewOf = (actors: Actor[]): Actor[] => actors.map(a => ({ ...a, gone: 'crew' }))
const crewman = (pose: string, x = 0, y = 0, swap?: Record<string, string>): Actor => ({ ...hero(pose, x, y, swap), gone: 'crew' })
/** A take that is only picked while these are present. */
const needing = (needs: string[], anim: Animation): Animation => ({ ...anim, needs })
const SPARK = (x: number, y: number): Actor => scenery('spark', x, y)
const puff = (x: number, y: number): Actor => scenery('puff1', x, y)
/** The flash of a camera or the flashy thing: the whole scene goes pale for a frame. */
const FLASH: Actor = at('flash', -12, -46, { backdrop: true })
/** A reaction: one-shot, every frame held twice as long as written (a line stays about a second at 6 fps). */
const take = (...frames: Frame[]): Animation => once(...frames.map(f => ({ ...f, hold: 2 * Math.max(1, f.hold ?? 1) })))
/** The same caption on every frame from `from` on. */
const captioned = (caption: string, frames: Frame[], from = 2): Frame[] => frames.map((f, k) => (k >= from ? { ...f, caption } : f))

// 1. Probe the crew member. The hand comes down on the head from the top of
// the scene (it rises with the officers' height, as a prop over the head
// does): in from above, a hover, the poke, then the reaction.
const AX = 4
const A_ENTER = -22
const A_HOVER = -16
const A_POKE = -14
/** The crew member and the hand at `y` (null: gone), over the sleeping cow and the saucer. */
const crewScene = (y: number | null, crew: Actor[], more: Actor[] = [], blink = false): Actor[] => [
  ...crew,
  ship(blink),
  SLEEPING_COW,
  ...(y === null ? [] : you(AX, y, y <= A_ENTER ? { offstage: true } : {})),
  ...more,
]
const aStart = (crew: Actor[] = [hero('stand')]): Frame[] => [
  { actors: crewScene(A_ENTER, crew), hold: 1 },
  { actors: crewScene(A_HOVER, crew), hold: 1 },
  { actors: crewScene(A_POKE, crew, [SPARK(5, -3)], true), hold: 1 },
]
/** The crew's line beside the head: right of the officers' capes, under the saucer's rows (a lifted line landed in the saucer). */
const aside = (text: string, y = -2, color = INK): SceneText => ({ ...say(text, 18, y, color), gone: 'crew' })
/** The crew walks into the beam, goes up, and the saucer flies off: what both snapped takes end with. */
const crewLeaves = (texts: SceneText[] = []): Frame[] => [
  { actors: [hero('walk', 6), ship(), ray(), SLEEPING_COW], texts, hold: 1 },
  { actors: [hero('stand', 18, 0, BEAMED), ship(true), ray(true), SLEEPING_COW], texts, hold: 1 },
  { actors: [ship(), ray(), SLEEPING_COW], hold: 1 },
  { actors: [scenery('ufo2', 26, -20, { offstage: true }), SLEEPING_COW], hold: 1 },
  { actors: [scenery('ufo1', 31, -27, { offstage: true }), SLEEPING_COW], hold: 1 },
  { actors: [SLEEPING_COW], texts: [say('...', 24, 2)], hold: 3 },
]
const probeCrew: ThemeAction = {
  id: 'crew',
  label: 'PROBE ALIEN',
  restLabel: '(ALIEN GONE)',
  gone: ['crew', 'ship'],
  needs: ['crew'],
  reactions: {
    calm: [
      take(
        ...captioned('Probed the crew. The crew has notes.', [
          ...aStart(),
          { actors: crewScene(A_HOVER, [hero('stand', 0, -2)]), texts: [aside('!')], hold: 2 },
          { actors: crewScene(A_HOVER, [hero('stand')], [], true), texts: [aside('HEY.')], hold: 3 },
          { actors: crewScene(null, [hero('stand')]), texts: [aside('HEY.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Probing an alien. Oddly, he has a permit.', [
          ...aStart(),
          { actors: crewScene(A_HOVER, [hero('itemGet'), at('permit', 4, -7)]), texts: [aside('I HAVE A PERMIT.', -4)], hold: 3 },
          { actors: crewScene(A_HOVER, [hero('itemGet'), at('permit', 4, -7)], [], true), texts: [aside('I HAVE A PERMIT.', -4)], hold: 3 },
          { actors: crewScene(null, [hero('stand'), at('permit', 4, -7)]), hold: 2 },
        ]),
      ),
      take(
        ...captioned('The crew is ticklish. This is classified.', [
          ...aStart(),
          { actors: crewScene(A_POKE, [hero('itemGet')], [SPARK(5, -3)]), texts: [aside('HEE HEE')], hold: 2 },
          { actors: crewScene(A_HOVER, [hero('stand')], [], true), texts: [aside('HA')], hold: 1 },
          { actors: crewScene(A_POKE, [hero('itemGet')], [SPARK(6, -2)]), texts: [aside('STOP')], hold: 2 },
          { actors: crewScene(null, [hero('stand')], [], true), texts: [aside('...')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('Probed. No reaction. Suspicious.', [
          ...aStart(),
          { actors: crewScene(A_HOVER, [hero('stand')]), hold: 1 },
          { actors: crewScene(A_POKE, [hero('stand')], [SPARK(5, -3)], true), texts: [aside('...')], hold: 1 },
          { actors: crewScene(A_HOVER, [hero('stand')]), texts: [aside('...')], hold: 1 },
          { actors: crewScene(A_POKE, [hero('stand')], [SPARK(6, -2)], true), texts: [aside('...')], hold: 1 },
          { actors: crewScene(A_HOVER, [hero('sleep')]), texts: [aside('z', -4)], hold: 3 },
          { actors: crewScene(null, [hero('sleep')], [], true), texts: [aside('Z', -6)], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The crew makes a note. About you.', [
          ...aStart(),
          { actors: crewScene(A_HOVER, [hero('stand'), at('clipboard', 16, 6)]), texts: [aside('HM.')], hold: 2 },
          { actors: crewScene(A_HOVER, [hero('stand'), at('clipboard', 16, 6)], [], true), texts: [aside('NOTED.')], hold: 3 },
          { actors: crewScene(null, [hero('stand'), at('clipboard', 16, 6)]), texts: [aside('NOTED.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The crew admires your probe. Professionally.', [
          ...aStart(),
          { actors: crewScene(A_HOVER, [hero('stand')]), texts: [aside('OOH.')], hold: 2 },
          { actors: crewScene(A_HOVER, [hero('stand')], [], true), texts: [aside('NICE PROBE.')], hold: 3 },
          { actors: crewScene(A_HOVER, [hero('stand')]), texts: [aside('REGULATION?')], hold: 3 },
          { actors: crewScene(null, [hero('stand')], [], true), hold: 1 },
        ]),
      ),
    ],
    irritated: [
      take(
        ...captioned('The crew probes back. For science.', [
          ...aStart(),
          { actors: crewScene(A_HOVER, [hero('itemGet'), weapon(6, -11, { flipY: true })], [SPARK(5, -12)]), texts: [aside('YOUR TURN.', -4)], hold: 2 },
          { actors: crewScene(A_ENTER, [hero('itemGet'), weapon(6, -11, { flipY: true })], [SPARK(6, -14)], true), texts: [aside('YOUR TURN.', -4)], hold: 2 },
          { actors: crewScene(null, [hero('itemGet'), weapon(6, -11, { flipY: true })]), texts: [aside('HA.', -4)], hold: 3 },
        ]),
      ),
      take(
        ...captioned('A complaint has been filed. In triplicate.', [
          ...aStart(),
          { actors: crewScene(A_HOVER, [hero('stand'), at('clipboard', 16, 6)]), texts: [aside('FORM 27-B.')], hold: 3 },
          { actors: crewScene(A_HOVER, [hero('stand'), at('clipboard', 16, 6)], [], true), texts: [aside('IN TRIPLICATE.')], hold: 3 },
          { actors: crewScene(null, [hero('stand'), at('clipboard', 16, 6)]), texts: [aside('IN TRIPLICATE.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The crew would like you to stop.', [
          ...aStart(),
          { actors: crewScene(A_HOVER, [hero('stand'), ...sweat]), texts: [aside('DO YOU MIND?')], hold: 3 },
          { actors: crewScene(A_HOVER, [hero('stand'), ...sweat], [], true), texts: [aside('DO YOU MIND?')], hold: 2 },
          { actors: crewScene(null, [hero('stand'), ...sweat]), hold: 2 },
        ]),
      ),
      take(
        ...captioned('Personal space. The crew steps aside.', [
          { actors: crewScene(A_ENTER, [hero('stand')]), hold: 1 },
          { actors: crewScene(A_HOVER, [hero('walk', -3)]), hold: 1 },
          { actors: crewScene(A_POKE, [hero('stand', -3)], [], true), hold: 2 },
          { actors: crewScene(A_HOVER, [hero('stand', -3)]), texts: [say('MISSED.', 14, -2)], hold: 3 },
          { actors: crewScene(null, [hero('walk', -1)], [], true), hold: 1 },
          { actors: crewScene(null, [hero('stand')]), hold: 1 },
        ]),
      ),
      take(
        ...captioned('The crew stares. The crew is not amused.', [
          ...aStart(),
          { actors: crewScene(A_HOVER, [hero('stand')]), texts: [aside('...')], hold: 3 },
          { actors: crewScene(A_HOVER, [hero('stand')], [], true), texts: [aside('REALLY.')], hold: 3 },
          { actors: crewScene(null, [hero('stand')]), texts: [aside('REALLY.')], hold: 2 },
        ]),
      ),
    ],
    fedUp: [
      take(
        ...captioned('Mothership notified. Staff are being probed.', [
          ...aStart(),
          { actors: [...dial(2, 1), SLEEPING_COW, ...you(AX, A_HOVER)], texts: [say('bip', 15, 8)], hold: 2 },
          { actors: [...dial(0, 2), SLEEPING_COW, ...you(AX, A_HOVER)], hold: 1 },
          { actors: [...dial(2, 3, true), SLEEPING_COW, ...you(AX, A_HOVER)], texts: [say('bip', 15, 8)], hold: 2 },
          { actors: [...dial(0, 3), SLEEPING_COW, ...you(AX, A_ENTER, { offstage: true })], texts: [say('SEND HELP.', 14, -12, GOLD)], hold: 3 },
          { actors: [...dial(0, 0, true), SLEEPING_COW], texts: [say('SEND HELP.', 14, -12, GOLD)], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Probe confiscated. Visit the gift shop.', [
          ...aStart(),
          { actors: [hero('stand'), ship(false, HALF.x, HALF.y - 8), SLEEPING_COW, ...you(AX, A_HOVER)], hold: 1 },
          { actors: [hero('stand'), ship(true, 1, -23), scenery('beamTallA', 1, -16), SLEEPING_COW, ...you(AX, A_HOVER)], hold: 1 },
          // The probe alone goes up the beam; the fist stays, empty.
          { actors: [hero('stand'), ship(false, 1, -23), scenery('beamTallB', 1, -16), SLEEPING_COW, weapon(AX + 2, A_HOVER + 2), fist(AX, A_HOVER)], hold: 1 },
          { actors: [hero('stand'), ship(true, 1, -23), scenery('beamTallA', 1, -16), SLEEPING_COW, weapon(AX + 2, A_HOVER - 8, { offstage: true }), fist(AX, A_HOVER)], hold: 1 },
          { actors: [hero('itemGet'), ship(false, 1, -23), SLEEPING_COW, fist(AX, A_HOVER)], texts: [aside('CONFISCATED.', -4)], hold: 3 },
          { actors: [hero('itemGet'), ship(true, HALF.x, HALF.y - 8), SLEEPING_COW, fist(AX, A_ENTER, { offstage: true })], texts: [aside('CONFISCATED.', -4)], hold: 2 },
          { actors: [hero('stand'), ship(), SLEEPING_COW], hold: 2 },
        ]),
      ),
      needing(['cow'], take(
        ...captioned('The cow has been deployed. Good luck.', [
          ...aStart(),
          { actors: [hero('stand'), ship(), COW_LEFT, ...you(AX, A_HOVER)], texts: [say('MOO!', 24, 2)], hold: 2 },
          { actors: [hero('stand'), ship(true), grounded('cow', 10, { flip: true }), ...you(AX, A_HOVER)], texts: [say('MOO!', 24, 2)], hold: 1 },
          { actors: [hero('itemGet'), ship(), at('cow', 12, 6, { flip: true, fixed: true }), puff(26, 10), ...you(AX, A_HOVER)], texts: [aside('MOO!')], hold: 1 },
          { actors: [hero('itemGet'), ship(true), at('cow', 2, 6, { flip: true, fixed: true }), puff(16, 10), ...you(AX, A_ENTER, { offstage: true })], hold: 1 },
          { actors: [hero('itemGet'), ship(), at('cow', -6, 6, { flip: true, fixed: true }), puff(8, 10)], hold: 2 },
          { actors: [hero('stand'), ship(true), at('cow', -6, 6, { flip: true, fixed: true })], texts: [aside('GOOD COW.')], hold: 3 },
        ]),
      )),
    ],
    snapped: [
      take(
        ...captioned('The crew has left. Back in a bit.', [
          ...aStart(),
          { actors: crewScene(A_HOVER, [hero('stand')]), texts: [aside('NOPE.')], hold: 2 },
          { actors: crewScene(null, [hero('stand')], [], true), texts: [aside('NOPE.')], hold: 1 },
          ...crewLeaves([say('NOPE.', 18, -2)]),
        ]),
      ),
      take(
        ...captioned('Specimen acquired: you. Welcome aboard.', [
          ...aStart(),
          { actors: [hero('stand'), ship(false, HALF.x, HALF.y - 8), SLEEPING_COW, ...you(AX, A_HOVER)], hold: 1 },
          { actors: [hero('stand'), ship(true, 1, -23), scenery('beamTallA', 1, -16), SLEEPING_COW, ...you(AX, A_HOVER, { swap: { W: 'E', a: 'e', x: 'e' } })], hold: 1 },
          { actors: [hero('stand'), ship(false, 1, -23), scenery('beamTallB', 1, -16), SLEEPING_COW, ...you(AX, A_HOVER - 4, { swap: { W: 'E', a: 'e', x: 'e' }, offstage: true })], hold: 1 },
          { actors: [hero('stand'), ship(true, 1, -23), scenery('beamTallA', 1, -16), SLEEPING_COW, ...you(AX, A_ENTER - 2, { swap: { W: 'E', a: 'e', x: 'e' }, offstage: true })], hold: 1 },
          { actors: [hero('itemGet'), ship(false, 1, -23), SLEEPING_COW], texts: [say('+1', 14, -12, GOLD)], hold: 3 },
          { actors: [hero('itemGet'), ship(true, HALF.x, HALF.y - 8), SLEEPING_COW], texts: [aside('WELCOME ABOARD.', -4)], hold: 3 },
          { actors: [hero('stand'), ship(), SLEEPING_COW], texts: [aside('WELCOME ABOARD.', -4)], hold: 1 },
          ...crewLeaves(),
        ]),
      ),
    ],
  },
  rest: loop(
    { actors: [SLEEPING_COW], texts: [say('z', 29, 2)], hold: 6 },
    { actors: [SLEEPING_COW], texts: [say('Z', 30, 0)], hold: 6 },
    { actors: [SLEEPING_COW], hold: 6 },
    { actors: [COW_LEFT], texts: [say('...', 24, 2)], hold: 6 },
    { actors: [COW_LEFT], texts: [say('moo?', 24, 2)], hold: 6 },
    { actors: [COW_LEFT], hold: 6 },
  ),
}

// 2. Probe the cow. The saucer backs off upward while you reach in; the hand
// is scenery here (it does not rise with the officers).
const CX = 24
const C_ENTER = -24
const C_HOVER = -14
const C_POKE = -6
const SHIP_UP = { x: SHIP.x, y: SHIP.y - 6 }
const shipUp = (blink = false): Actor => ship(blink, SHIP_UP.x, SHIP_UP.y)
/** The crew watching, the saucer up, the cow (awake) or `cow` in its place, the hand at `y` (null: gone). */
const cowScene = (y: number | null, cow: Actor[] = [COW_UP], more: Actor[] = [], crew: Actor[] = [hero('stand')], blink = false): Actor[] => [
  ...crewOf(crew),
  shipUp(blink),
  ...cow,
  ...(y === null ? [] : you(CX, y, { fixed: true, ...(y <= C_ENTER ? { offstage: true } : {}) })),
  ...more,
]
const cStart = (cow: Actor[] = [COW_UP]): Frame[] => [
  { actors: cowScene(C_ENTER, cow), hold: 1 },
  { actors: cowScene(C_HOVER, cow), hold: 1 },
  { actors: cowScene(C_POKE, cow, [SPARK(23, 3)], undefined, true), hold: 1 },
]
/** The cow's line, over its back, under the hand. */
const moo = (text: string, color = INK): SceneText => ({ ...say(text, 26, 2, color), gone: 'cow' })
/** The cow walks off to the right and the crew is left looking at the spot. */
const cowLeaves = (): Frame[] => [
  { actors: cowScene(null, [at('cow', 30, 6, { fixed: true, offstage: true })], [puff(26, 12)], undefined, true), hold: 1 },
  { actors: cowScene(null, [at('cow', 38, 6, { fixed: true, offstage: true })], [puff(30, 12)]), hold: 1 },
  { actors: cowScene(null, [], [], [hero('stand'), ...sweat], true), texts: [aside('...')], hold: 3 },
]
const probeCow: ThemeAction = {
  id: 'cow',
  label: 'PROBE COW',
  restLabel: '(COW GONE)',
  gone: ['cow'],
  needs: ['cow'],
  reactions: {
    calm: [
      take(
        ...captioned('Probed the cow. The cow says moo. Flatly.', [
          ...cStart(),
          { actors: cowScene(C_POKE), texts: [moo('MOO.')], hold: 3 },
          { actors: cowScene(C_HOVER, undefined, [], undefined, true), texts: [moo('MOO.')], hold: 2 },
          { actors: cowScene(null), hold: 2 },
        ]),
      ),
      take(
        ...captioned('The cow has questions.', [
          ...cStart(),
          { actors: cowScene(C_HOVER, [COW_LEFT]), texts: [moo('MOO?')], hold: 3 },
          { actors: cowScene(C_HOVER, [COW_LEFT], [], undefined, true), texts: [moo('MOO??')], hold: 3 },
          { actors: cowScene(null, [COW_LEFT]), hold: 2 },
        ]),
      ),
      take(
        ...captioned('The cow is used to this by now.', [
          ...cStart(),
          { actors: cowScene(C_POKE), texts: [moo('...')], hold: 2 },
          { actors: cowScene(C_POKE, undefined, [SPARK(24, 4)], undefined, true), texts: [moo('munch')], hold: 2 },
          { actors: cowScene(C_POKE), texts: [moo('...')], hold: 2 },
          { actors: cowScene(null, undefined, [], undefined, true), texts: [moo('munch')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('Probed. The cow files this under Tuesday.', [
          ...cStart(),
          { actors: cowScene(C_HOVER), texts: [moo('MOO.')], hold: 2 },
          { actors: cowScene(C_HOVER, undefined, [], undefined, true), texts: [moo('TUESDAY.')], hold: 3 },
          { actors: cowScene(null), texts: [moo('TUESDAY.')], hold: 2 },
        ]),
      ),
      take(
        ...captioned('The cow kind of liked that. Tell no one.', [
          ...cStart(),
          { actors: cowScene(C_HOVER), texts: [moo('<3', 'p')], hold: 2 },
          { actors: cowScene(C_HOVER, undefined, [], undefined, true), texts: [say('<3', 28, 0, 'p')], hold: 2 },
          { actors: cowScene(C_HOVER, undefined, [], [hero('stand'), ...sweat]), texts: [say('<3', 30, -2, 'p'), aside('?')], hold: 3 },
          { actors: cowScene(null, undefined, [], [hero('stand'), ...sweat], true), hold: 1 },
        ]),
      ),
      needing(['crew'], take(
        ...captioned('The crew would like its cow back.', [
          ...cStart(),
          { actors: cowScene(C_POKE, undefined, [], [hero('side')]), texts: [aside('HEY.')], hold: 2 },
          { actors: cowScene(C_POKE, undefined, [], [hero('side')], true), texts: [aside('MINE.')], hold: 3 },
          { actors: cowScene(null, undefined, [], [hero('side')]), texts: [aside('MINE.')], hold: 2 },
        ]),
      )),
    ],
    irritated: [
      take(
        ...captioned('The cow kicks. The hand regrets everything.', [
          ...cStart(),
          { actors: cowScene(C_HOVER, [grounded('cowKick', 10)], [SPARK(24, -1)]), texts: [moo('MOO!')], hold: 2 },
          { actors: cowScene(C_ENTER, [grounded('cowKick', 10)], [SPARK(25, -4)], undefined, true), texts: [moo('MOO!')], hold: 1 },
          { actors: cowScene(null, [COW_UP]), texts: [moo('HMPH.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The cow files an HR complaint. Form MOO-27.', [
          ...cStart(),
          { actors: cowScene(C_HOVER, [COW_LEFT, scenery('clipboard', 17, 7)]), texts: [moo('NOT AGAIN.')], hold: 3 },
          { actors: cowScene(C_HOVER, [COW_LEFT, scenery('clipboard', 17, 7)], [], undefined, true), texts: [say('FORM MOO-27.', 24, 2)], hold: 3 },
          { actors: cowScene(null, [COW_LEFT, scenery('clipboard', 17, 7)]), hold: 2 },
        ]),
      ),
      take(
        ...captioned('The cow turns around. Pointedly.', [
          ...cStart(),
          { actors: cowScene(C_HOVER, [COW_LEFT]), texts: [moo('...')], hold: 1 },
          { actors: cowScene(C_HOVER, [scenery('cowBack', 24, 6)], [], undefined, true), texts: [moo('...')], hold: 3 },
          { actors: cowScene(null, [scenery('cowBack', 24, 6)]), hold: 3 },
        ]),
      ),
      take(
        ...captioned('The cow is staring directly at you.', [
          ...cStart(),
          { actors: cowScene(C_HOVER, [COW_LEFT]), hold: 2 },
          { actors: cowScene(C_HOVER, [COW_LEFT], [], [hero('stand'), ...sweat], true), texts: [aside('!')], hold: 3 },
          { actors: cowScene(C_ENTER, [COW_LEFT], [], [hero('stand'), ...sweat]), hold: 3 },
        ]),
      ),
    ],
    fedUp: [
      take(
        ...captioned('The cow has sat down. Probing is cancelled.', [
          ...cStart(),
          { actors: cowScene(C_POKE, [grounded('cowSit', 8)]), texts: [moo('NO.')], hold: 3 },
          { actors: cowScene(C_POKE, [grounded('cowSit', 8)], [], undefined, true), texts: [moo('NO.')], hold: 1 },
          { actors: cowScene(C_HOVER, [grounded('cowSit', 8)]), hold: 1 },
          { actors: cowScene(null, [grounded('cowSit', 8)], [], undefined, true), texts: [moo('NO.')], hold: 3 },
        ]),
      ),
      take(
        ...captioned('The cow ate the probe. Send another.', [
          ...cStart(),
          { actors: [crewman('stand'), shipUp(), COW_LEFT, fist(CX, C_POKE, { fixed: true })], texts: [moo('CHOMP.')], hold: 2 },
          { actors: [crewman('stand'), shipUp(true), COW_LEFT, fist(CX, C_HOVER, { fixed: true })], texts: [moo('munch')], hold: 2 },
          { actors: [crewman('stand'), shipUp(), COW_LEFT, fist(CX, C_ENTER, { fixed: true, offstage: true })], texts: [moo('munch'), aside('?!')], hold: 2 },
          { actors: [crewman('stand'), shipUp(true), COW_LEFT], texts: [moo('BURP.')], hold: 3 },
        ]),
      ),
      needing(['crew'], take(
        ...captioned('The crew defends the cow. Union rules.', [
          ...cStart(),
          { actors: cowScene(C_HOVER, undefined, [], [hero('walk', 3)]), hold: 1 },
          { actors: cowScene(C_HOVER, undefined, [], [hero('itemGet', 6)], true), texts: [say('UNION RULES.', -4, -4)], hold: 3 },
          { actors: cowScene(C_ENTER, undefined, [], [hero('itemGet', 6)]), texts: [say('UNION RULES.', -4, -4)], hold: 2 },
          { actors: cowScene(null, undefined, [], [hero('walk', 3)], true), hold: 1 },
          { actors: cowScene(null, undefined, [], [hero('stand')]), hold: 1 },
        ]),
      )),
    ],
    snapped: [
      take(
        ...captioned('The cow probes back. Nobody wins.', [
          ...cStart(),
          { actors: cowScene(C_HOVER, [COW_LEFT, weapon(30, -4, { fixed: true, flipY: true })], [SPARK(27, -10)]), texts: [moo('MOO.')], hold: 2 },
          { actors: cowScene(C_ENTER, [COW_LEFT, weapon(30, -8, { fixed: true, flipY: true })], [SPARK(26, -14)], undefined, true), texts: [moo('MOO.')], hold: 2 },
          { actors: cowScene(null, [COW_LEFT, weapon(30, -4, { fixed: true, flipY: true })], [], [hero('stand'), ...sweat]), texts: [aside('...')], hold: 3 },
          { actors: cowScene(null, [COW_UP], [], [hero('stand'), ...sweat]), texts: [moo('MOO.')], hold: 2 },
          ...cowLeaves(),
        ]),
      ),
      take(
        ...captioned('The cow has left the farm. Possibly for good.', [
          ...cStart(),
          { actors: cowScene(C_HOVER, [COW_UP]), texts: [moo('MOO.')], hold: 2 },
          { actors: cowScene(C_ENTER, [COW_UP]), texts: [moo('BYE.')], hold: 2 },
          ...cowLeaves(),
        ]),
      ),
    ],
  },
  // The cow's rest: the beam is on, nothing in it; the crew checks.
  rest: loop(
    { actors: [crewman('stand'), ship(), ray()], hold: 6 },
    { actors: [crewman('stand'), ship(true), ray(true)], texts: [{ ...say('...', 24, 2), gone: 'ship' }], hold: 6 },
    { actors: [...crewOf(probing()), ship(), ray()], hold: 6 },
    { actors: [...crewOf(probing(2)), ship(true), ray(true)], texts: [aside('...')], hold: 6 },
    { actors: [crewman('stand'), ship(), ray()], texts: [aside('HMM.')], hold: 6 },
  ),
}

// 3. Wave at the Feds. A palm waves at the top left; the man in black stands
// where the specimens go (the saucer is nowhere to be seen, as when the Feds
// take notes).
const PX = 0
const P_Y = -22
const AGENT1 = scenery('agent1', AGENT.x, AGENT.y)
const AGENT2 = scenery('agent2', AGENT.x, AGENT.y)
const AGENT_WAVE = scenery('agentWave', AGENT.x, AGENT.y)
/** Two beats of waving (the palm tilts), then the agent's answer. */
const palmAt = (tilt: boolean, y = P_Y): Actor => scenery(tilt ? 'palm2' : 'palm', PX, y, y <= -24 ? { offstage: true } : {})
const fedScene = (tilt: boolean | null, agents: Actor[] = [AGENT1], more: Actor[] = [], crew: Actor[] = [hero('stand')]): Actor[] => [
  ...crewOf(crew),
  ...agents,
  ...(tilt === null ? [] : [palmAt(tilt)]),
  ...more,
]
const fStart = (agents: Actor[] = [AGENT1]): Frame[] => [
  { actors: fedScene(false, agents), hold: 1 },
  { actors: fedScene(true, agents), hold: 1 },
  { actors: fedScene(false, agents), hold: 1 },
  { actors: fedScene(true, agents), hold: 1 },
]
/** Over the agent's head. */
const fed = (text: string, x = 24, color = INK): SceneText => say(text, x, -2, color)
/** Two agents walk the crew off to the right; the field is empty. */
const CREW_TAKEN: Frame[] = [
  { actors: fedScene(null, [scenery('agent1', 20, AGENT.y), scenery('agent1', 28, AGENT.y)], [], [hero('walk', 6)]), hold: 1 },
  { actors: fedScene(null, [scenery('agent1', 28, AGENT.y), scenery('agent1', 36, AGENT.y, { offstage: true })], [], [hero('walk', 14)]), hold: 1 },
  { actors: fedScene(null, [scenery('agent1', 36, AGENT.y, { offstage: true })], [], [{ ...hero('walk', 22), offstage: true }]), hold: 1 },
  { actors: fedScene(null, [], [], []), texts: [say('...', 17, -2)], hold: 3 },
]
const waveFeds: ThemeAction = {
  id: 'feds',
  label: 'WAVE AT FEDS',
  restLabel: '(FEDS BUSY)',
  // The crew is taken in: the saucer stays. Waving needs no one in particular (the agent answers the palm).
  gone: ['crew'],
  reactions: {
    calm: [
      take(
        ...captioned('You waved at the Feds. It went in the file.', [
          ...fStart(),
          { actors: fedScene(false, [AGENT2]), texts: [fed('NOTED.')], hold: 3 },
          { actors: fedScene(true, [AGENT2]), texts: [fed('NOTED.')], hold: 2 },
          { actors: fedScene(null, [AGENT1]), hold: 2 },
        ], 4),
      ),
      take(
        ...captioned('The agent pretends not to see you.', [
          ...fStart(),
          { actors: fedScene(false, [scenery('agent1', AGENT.x, AGENT.y, { flip: true })]), texts: [fed('WHO, ME?', 22)], hold: 3 },
          { actors: fedScene(true, [scenery('agent1', AGENT.x, AGENT.y, { flip: true })]), texts: [fed('...', 24)], hold: 2 },
          { actors: fedScene(null, [AGENT1]), hold: 2 },
        ], 4),
      ),
      take(
        ...captioned('The agent waves back. Awkwardly.', [
          ...fStart(),
          { actors: fedScene(false, [AGENT_WAVE]), texts: [fed('HI.')], hold: 2 },
          { actors: fedScene(true, [AGENT_WAVE]), texts: [fed('HI.')], hold: 2 },
          { actors: fedScene(false, [AGENT1]), texts: [fed('...')], hold: 3 },
          { actors: fedScene(null, [AGENT1]), hold: 1 },
        ], 4),
      ),
      take(
        ...captioned('The agent reminds you: nothing to see here.', [
          ...fStart(),
          { actors: fedScene(false, [AGENT1]), texts: [fed('NOTHING TO SEE.', 20)], hold: 3 },
          { actors: fedScene(true, [AGENT1]), texts: [fed('NOTHING TO SEE.', 20)], hold: 2 },
          { actors: fedScene(null, [AGENT1]), texts: [fed('MOVE ALONG.', 20)], hold: 3 },
        ], 4),
      ),
      take(
        ...captioned('The agent adjusts his sunglasses. Ominously.', [
          ...fStart(),
          { actors: fedScene(false, [AGENT1]), texts: [say('*', 26, 5, GOLD)], hold: 1 },
          { actors: fedScene(true, [AGENT1]), texts: [say('*', 30, 5, GOLD)], hold: 1 },
          { actors: fedScene(false, [AGENT1]), texts: [say('*', 26, 5, GOLD)], hold: 1 },
          { actors: fedScene(true, [AGENT1]), texts: [fed('...')], hold: 3 },
          { actors: fedScene(null, [AGENT1]), hold: 2 },
        ], 4),
      ),
    ],
    irritated: [
      take(
        ...captioned('Suspicious. The pen moves faster.', [
          ...fStart(),
          { actors: fedScene(false, [AGENT2]), texts: [fed('SUSPICIOUS.', 20)], hold: 1 },
          { actors: fedScene(true, [AGENT1]), texts: [fed('SUSPICIOUS.', 20)], hold: 1 },
          { actors: fedScene(false, [AGENT2]), texts: [fed('VERY.', 24)], hold: 1 },
          { actors: fedScene(true, [AGENT1]), texts: [fed('VERY.', 24)], hold: 1 },
          { actors: fedScene(null, [AGENT2]), texts: [fed('!!', 26)], hold: 3 },
        ], 4),
      ),
      take(
        ...captioned('The agent talks into his sleeve. About you.', [
          ...fStart(),
          { actors: fedScene(false, [AGENT1], [scenery('wave1', 26, -4)]), texts: [fed('COPY THAT.', 20, 'c')], hold: 1 },
          { actors: fedScene(true, [AGENT1], [scenery('wave1', 26, -4), scenery('wave2', 25, -7)]), texts: [fed('COPY THAT.', 20, 'c')], hold: 1 },
          { actors: fedScene(false, [AGENT1], [scenery('wave1', 26, -4), scenery('wave2', 25, -7), scenery('wave3', 24, -11)]), texts: [fed('COPY THAT.', 20, 'c')], hold: 3 },
          { actors: fedScene(null, [AGENT1], [scenery('wave3', 24, -11)]), hold: 2 },
        ], 4),
      ),
      take(
        ...captioned('Photographed. For the file.', [
          ...fStart(),
          { actors: fedScene(false, [AGENT1, scenery('camera', 23, 5)]), texts: [fed('SMILE.')], hold: 2 },
          { actors: [FLASH, ...fedScene(true, [AGENT1, scenery('camera', 23, 5)])], hold: 1 },
          { actors: fedScene(false, [AGENT1, scenery('camera', 23, 5)], [], [hero('stand'), ...sweat]), texts: [fed('THANKS.')], hold: 3 },
          { actors: fedScene(null, [AGENT1], [], [hero('stand'), ...sweat]), hold: 2 },
        ], 4),
      ),
      take(
        ...captioned('Please stop waving. That is an order.', [
          ...fStart(),
          { actors: fedScene(false, [AGENT1]), texts: [fed('STOP WAVING.', 20)], hold: 3 },
          { actors: fedScene(true, [AGENT1]), texts: [fed('STOP WAVING.', 20)], hold: 1 },
          { actors: fedScene(false, [AGENT1]), texts: [fed('THAT IS AN ORDER.', 18)], hold: 3 },
          { actors: fedScene(null, [AGENT1]), hold: 1 },
        ], 4),
      ),
    ],
    fedUp: [
      take(
        ...captioned('Backup has arrived. He also has a notepad.', [
          ...fStart(),
          { actors: fedScene(false, [AGENT1], [puff(19, 6)]), texts: [fed('BACKUP.', 16)], hold: 1 },
          { actors: fedScene(true, [AGENT1, scenery('agent2', 18, AGENT.y)], [puff(18, 4)]), texts: [fed('BACKUP.', 16)], hold: 2 },
          { actors: fedScene(false, [AGENT2, scenery('agent2', 18, AGENT.y)]), texts: [fed('NOTED.', 16), fed('NOTED.', 26)], hold: 3 },
          { actors: fedScene(null, [AGENT2, scenery('agent2', 18, AGENT.y)], [], [hero('stand'), ...sweat]), hold: 2 },
        ], 4),
      ),
      take(
        ...captioned('Flashy thing. What were we talking about?', [
          ...fStart(),
          { actors: fedScene(false, [AGENT1, scenery('wiper', 33, -2)]), texts: [fed('LOOK HERE.', 20)], hold: 2 },
          { actors: [FLASH, ...fedScene(true, [AGENT1, scenery('wiper', 33, -2)])], hold: 1 },
          { actors: fedScene(null, [AGENT1]), texts: [aside('?')], hold: 2 },
          { actors: fedScene(null, [AGENT1]), texts: [aside('?'), fed('NOTHING HAPPENED.', 18)], hold: 3 },
        ], 4),
      ),
      take(
        ...captioned('The agent would like a word. Several words.', [
          ...fStart(),
          { actors: fedScene(false, [scenery('agent1', 22, AGENT.y)]), hold: 1 },
          { actors: fedScene(true, [scenery('agent1', 19, AGENT.y)]), texts: [fed('A WORD.', 18)], hold: 3 },
          { actors: fedScene(false, [scenery('agent1', 19, AGENT.y)], [], [hero('stand'), ...sweat]), texts: [fed('SEVERAL.', 18)], hold: 3 },
          { actors: fedScene(null, [scenery('agent1', 19, AGENT.y)], [], [hero('stand'), ...sweat]), hold: 1 },
        ], 4),
      ),
    ],
    snapped: [
      needing(['crew'], take(
        ...captioned('The Feds are here. Nobody waves at anybody.', [
          ...fStart(),
          { actors: fedScene(false, [AGENT1, scenery('agent1', 18, AGENT.y)], [puff(19, 6)]), hold: 1 },
          { actors: fedScene(true, [AGENT1, scenery('agent1', 18, AGENT.y), scenery('agent1', 33, AGENT.y, { offstage: true })], [puff(30, 6)]), hold: 1 },
          { actors: fedScene(null, [AGENT2, scenery('agent2', 18, AGENT.y), scenery('agent2', 33, AGENT.y, { offstage: true })], [], [hero('stand'), ...sweat]), texts: [fed('...', 20), fed('...', 28)], hold: 4 },
          { actors: fedScene(null, [AGENT2, scenery('agent2', 18, AGENT.y), scenery('agent2', 33, AGENT.y, { offstage: true })], [], [hero('stand'), ...sweat]), texts: [aside('UH.')], hold: 3 },
          { actors: fedScene(null, [AGENT1, scenery('agent1', 18, AGENT.y)], [], [hero('stand'), ...sweat]), texts: [fed('COME WITH US.', 18)], hold: 2 },
          ...CREW_TAKEN,
        ], 4),
      )),
      needing(['crew'], take(
        ...captioned('The crew was taken in for questioning.', [
          ...fStart(),
          { actors: fedScene(false, [AGENT1, scenery('agent1', 18, AGENT.y)]), texts: [fed('COME WITH US.', 18)], hold: 3 },
          ...CREW_TAKEN,
        ], 4),
      )),
    ],
  },
  // The Feds' rest: the crew is being questioned somewhere; an agent keeps the field.
  rest: loop(
    { actors: [AGENT1], hold: 8 },
    { actors: [AGENT2], texts: [fed('...')], hold: 6 },
    { actors: [scenery('agent1', AGENT.x, AGENT.y, { flip: true })], hold: 8 },
    { actors: [AGENT1], texts: [fed('NOTHING TO SEE.', 20)], hold: 6 },
  ),
}

const actions: ThemeAction[] = [probeCrew, probeCow, waveFeds]

const SMALL_POSES = { stand: 'stand', walk: 'walk', attack: 'side', itemGet: 'itemGet', sleep: 'sleep', side: 'side' }
const HAT_POSES = { stand: 'hatStand', walk: 'hatWalk', attack: 'hatSide', itemGet: 'hatItemGet', sleep: 'hatSleep', side: 'hatSide' }
const BIG_POSES = { stand: 'bigStand', walk: 'bigWalk', attack: 'bigSide', itemGet: 'bigItemGet', sleep: 'bigSleep', side: 'bigSide' }
const DOME_POSES = { stand: 'domeStand', walk: 'domeWalk', attack: 'domeSide', itemGet: 'domeItemGet', sleep: 'domeSleep', side: 'domeSide' }
// The officers hold the probe two pixels higher than the small crew.
const HAND = { x: 0, y: -2 }

export const alien: Theme = {
  id: 'alien',
  name: 'Close Encounters of the Probed Kind',
  description: 'Abduction night shift: a herd for context, a probe per effort, a crew member per model. Everything gets probed.',
  version: '1.0.0',
  palette: {
    dark: { accent: '#7cf08c', gold: '#fcd000', red: '#fc6450', label: '#c084fc', dim: '#8c8c9c', text: '#f0f0f0' },
    light: { accent: '#1c7c2c', gold: '#856000', red: '#b02010', label: '#6434b4', dim: '#6c6c6c', text: '#1c1c1c' },
  },
  pixels,
  labels: {
    context: 'HERD',
    spend: 'SAMPLES',
    cache: 'SEDATIVE',
    limits: 'FEDS',
    modelItem: 'CREW',
    effortItem: 'PROBE',
    heroes: 'Crew',
    weapons: 'Probes',
  },
  headings: {
    Context: 'The herd',
    Cost: 'Samples',
    'Next message': 'Sedative',
    Tokens: 'Brainwaves',
    Limits: 'The Feds',
    'Tool calls': 'Probe log',
    Files: 'Things probed',
  },
  sprites,
  states,
  cold,
  overkill,
  events,
  actions,
  scene: {
    height: 44,
    anchor: { x: 12, y: 24 },
    background: {
      ground: 'night',
      gradient: ['#0a0e2c', '#101844', '#1c1c58', '#2c2468'],
      // Dawn: the night runs out as the context fills.
      deep: ['#34488c', '#7c5c9c', '#d87c84', '#fcb060'],
      floor: 'grass',
      shade: { color: '#fcb060', amount: 0.3 },
      // Past the action (columns 0..47), from the right edge in: the barn at 58 (a light comes on at 30%), a grazing
      // cow at 80 (the sheriff's cruiser from 40%), a scarecrow and a windmill at 96 (the news van from 50%).
      decor: [
        { sprite: 'moon', x: -3, y: 2, sky: true, lit: true, maxPercent: 75 },
        { sprite: 'sun', x: 0, y: 34, lit: true, minPercent: 75 },
        { sprite: 'barn', x: -1, y: 28, minColumns: 56, maxPercent: 30 },
        { sprite: 'barnLit', x: -1, y: 28, minColumns: 56, minPercent: 30, lit: true },
        { sprite: 'cow', x: -13, y: 31, minColumns: 78, maxPercent: 40 },
        { sprite: 'cruiser', x: -12, y: 33, minColumns: 78, minPercent: 40, lit: true },
        { sprite: 'scarecrow', x: -29, y: 28, minColumns: 94, maxPercent: 50 },
        { sprite: 'newsVan', x: -27, y: 30, minColumns: 94, minPercent: 50, lit: true },
        { sprite: 'windmill', x: -41, y: 24, minColumns: 94 },
      ],
      // Stars that go out as dawn comes, and one satellite.
      particles: [
        { colors: ['#fcfcfc', '#c8d0fc', '#fcf0a0'], count: 18, drift: 'none', maxPercent: 55 },
        { colors: ['#fcfcfc', '#c8d0fc'], count: 9, drift: 'none', maxPercent: 85 },
        { colors: ['#fcfcfc'], count: 1, drift: 'left', speed: 1.5, maxPercent: 85 },
      ],
    },
    hero: SMALL_POSES,
    heroTiers: {
      tier1: {},
      tier2: { U: 'blueT', u: 'blueS', B: 'blueT' },
      tier3: { U: 'redT', u: 'redS' },
      tier4: { U: 'royalT', u: 'royalS' },
      unknown: { U: 'coatT', u: 'coatS', B: 'coatT' },
    },
    heroForms: {
      tier3: { poses: BIG_POSES, dx: -2, dy: -6, lift: 6, hand: HAND },
      tier4: { poses: DOME_POSES, dx: -2, dy: -8, lift: 8, hand: HAND },
      unknown: { poses: HAT_POSES, dx: 0, dy: -2, lift: 2 },
    },
    lineup: { ground: 'night', ink: 'ink', dim: '#9c9cc0', mark: '#fcd000' },
    message: { bg: 'msgBg', ink: 'msgInk' },
    heroNames: {
      tier1: 'Probe Intern',
      tier2: 'Field Prober',
      tier3: 'Chief Probing Officer',
      tier4: 'Grand High Probulator',
      unknown: 'Totally Normal Human',
    },
    weapons: {
      low: { sprite: 'swab', swap: {}, name: 'Cotton Swab' },
      medium: { sprite: 'probe', swap: {}, name: 'Regulation Probe' },
      high: { sprite: 'deepProbe', swap: {}, name: 'Deep Probe' },
      xhigh: { sprite: 'deeperProbe', swap: {}, name: 'Deeper Probe' },
      max: { sprite: 'lastProbe', swap: {}, aura: 'probeAura', name: 'Probe of No Return' },
    },
    bar: {
      // 48 and 58: samples and both boxes on the first row (the radar too at 58), the herd on the second.
      widgets: [
        { kind: 'map', drop: 2 },
        { kind: 'counter', value: 'spend', icon: 'miniJar', format: 'x{v}' },
        { kind: 'box', shows: 'model', sprite: 'miniHead', sprites: { tier4: 'miniBrain', unknown: 'miniHat' }, label: 'CREW', x: 1, y: 4, drop: 1 },
        { kind: 'box', shows: 'effort', sprite: 'miniProbe', sprites: { low: 'miniSwab', high: 'miniDeep', xhigh: 'miniDeeper', max: 'miniLast' }, label: 'PROBE', x: 2, y: 4 },
        { kind: 'meter', value: 'contextLeft', count: 10, perRow: 5, sprites: ['herd0', 'herd1', 'herd2', 'herd3', 'herd4'], label: '-HERD-', pulseBelow: 0.2, wrap: true },
      ],
      colors: { bg: 'barBg', box: 'barBox', text: 'W', label: 'barLabel', map: 'radar', mapDot: 'radarDot' },
    },
    stamina: { x: 1, y: 2, radius: 5, full: 'sedFull', empty: 'sedEmpty', cold: 'sedCold', tagIcon: 'miniJar', tagColor: 'ink', tagColdColor: '#9c9cac' },
  },
  text: {
    idle: 'The crew naps while the cow sleeps off the sedative.',
    thinking: 'The crew consults a hologram of a cow.',
    reading: 'Something gets probed. For science.',
    editing: 'The cow gets refactored.',
    shell: 'The crew phones home.',
    agents: 'Probe drones fan out to find more things to probe.',
    toolSuccess: 'Specimen acquired!',
    toolError: 'The probe shorted out. Zap!',
    turnComplete: 'Specimen returned, with a sticker: I WAS PROBED.',
    milestone: 'Mission control checks in.',
    cacheCold: 'The sedative wore off.',
    limitWarning: 'The Feds are taking notes.',
    compaction: 'The shrink ray makes room in the hold.',
    modelChange: 'A new crew member beams down.',
    effortChange: 'A new probe is issued.',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: 'ALL QUIET. {pct}% OF THE HERD PROBED. THE HUMANS SUSPECT NOTHING.' },
    { level: 'warn', message: '{pct}% OF THE HERD PROBED. A FARMER IS COUNTING HIS COWS.' },
    { level: 'orange', message: '{pct}% PROBED. THE FARMER CALLED THE SHERIFF. WRAP IT UP SOON.' },
    { level: 'alert', message: '{pct}% PROBED. IT IS ON THE NEWS. THIS IS GETTING HARD TO DENY.' },
    { level: 'critical', message: 'THEY KNOW! {pct}% PROBED. SAVE YOUR PROGRESS AND WIPE THEIR MEMORIES (/clear).' },
  ],
  messages: {
    cacheCold: 'THE SEDATIVE WORE OFF. THE COW IS AWAKE AND HAS QUESTIONS. YOUR CACHE IS COLD.',
    limitWarning: 'THE FEDS ARE TAKING NOTES. {name} AT {pct}%.',
    compaction: 'Shrink ray fired: context compacted. There is room in the hold again!',
    modelChange: '{name} beams down!',
    effortChange: 'Probe issued: {weapon}. The cow has concerns.',
  },
}
