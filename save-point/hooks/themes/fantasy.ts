// "Final Context": a 16-bit turn-based JRPG homage. Every sprite is drawn fresh for this theme in that side-view battle-screen style.
//
// The model is the job (Black Mage, Warrior of Light, Holy Paladin, Sage of
// Ages, Onion Knight), effort is the spell (Fire up to Ultima; the LV pips
// count its level), context is HP, the cache is MP, cents are Gil. The party
// stands on the right facing left, a monster waits on the left, and the
// battlefield sinks from grassland through forest and cave into the final
// dungeon's void as context fills (at 25, 50 and 75%).
//
// Each job but the Warrior (the standard hero) is its own form; poses are
// painted over a base pose with `paint`.
//
// The battle fits columns 0..45: the monster at 2..14, the hero at 22..37 (the
// Paladin, the widest, at 18..39). Past that only scenery, from the right edge in.

import { at, hero, loop, once, weapon } from './kit'
import type { Actor, HeroTier, SceneText, Sprite, Theme } from './types'

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const pixels: Record<string, string> = {
  ink: '#181020',
  white: '#f8f8f8',
  skin: '#f8c898',
  skinS: '#c88860',
  eye: '#202038',
  // Black Mage
  bmHat: '#e0b868',
  bmHatS: '#a07430',
  bmFace: '#120c1c',
  bmEye: '#f8e838',
  bmEyeS: '#7c6c28',
  bmRobe: '#3c60d8',
  bmRobeS: '#22348c',
  bmTrim: '#f0e0b0',
  bmGlove: '#a86c38',
  boot: '#5c3418',
  // Warrior
  wrHair: '#e85028',
  wrHairS: '#a02818',
  wrArm: '#d0d8e8',
  wrArmS: '#7c88a8',
  wrCape: '#c82838',
  wrCapeS: '#741828',
  gold: '#f8d048',
  goldS: '#b88820',
  grip: '#704010',
  // Paladin
  palW: '#fcfcff',
  palP: '#c8d0ec',
  palQ: '#8088b0',
  palCape: '#3454d0',
  palCapeS: '#1c2a7c',
  palHair: '#e4e4f4',
  blade: '#e8fcff',
  bladeS: '#90b4e0',
  // Sage
  sgRobe: '#f4f0fc',
  sgRobeS: '#b8b0d0',
  sgHood: '#8a4cd0',
  sgHoodS: '#4e2890',
  sgBeard: '#e0e0ec',
  staff: '#9c6430',
  staffS: '#5c3418',
  crys: '#7cf0f8',
  crysS: '#2ca0c8',
  // Onion Knight
  okHelm: '#c8d0d8',
  okHelmS: '#788090',
  okSlit: '#202030',
  okTunic: '#d88838',
  okTunicS: '#985018',
  // Goblin
  gbHood: '#8c5c2c',
  gbHoodS: '#5a3414',
  gbSkin: '#70b048',
  gbSkinS: '#3c7424',
  gbEye: '#f83020',
  knife: '#d8d8e0',
  fade: '#b060d0',
  fadeS: '#602890',
  // Behemoth
  bhBody: '#7840a8',
  bhBodyS: '#40206c',
  bhHorn: '#f0e8c8',
  bhEye: '#ff3030',
  // Chocobo
  chY: '#f8d830',
  chYS: '#c09010',
  chBeak: '#f08828',
  // Spells
  fireO: '#f88820',
  fireY: '#f8e050',
  fireR: '#d83018',
  flareM: '#e040a0',
  flareR: '#f83838',
  flareP: '#ffb8c8',
  ultG: '#20a060',
  ultL: '#68f0a0',
  ultC: '#c0fff0',
  rune: '#80f0ff',
  runeB: '#e8f0ff',
  scan: '#80f8ff',
  heal: '#78f878',
  sweat: '#c4e8ff',
  sweatS: '#6cb0f0',
  // Tent
  tent: '#d8c890',
  tentS: '#a08c58',
  tentIn: '#30241c',
  // Scenery
  cloud: '#f8f8ff',
  cloudS: '#c8d8f0',
  mtn: '#7088c8',
  mtnS: '#50649c',
  snow: '#e8f0ff',
  pine: '#2c6830',
  pineS: '#1c4820',
  pineL: '#3c8848',
  trunk: '#5c3c20',
  rock: '#6c5c50',
  rockS: '#463830',
  rockL: '#8c7c6c',
  shard: '#c080ff',
  shardS: '#6038c0',
  shardL: '#f0d8ff',
  stone: '#c4c8d8',
  stoneS: '#8088a4',
  gate: '#3c3c58',
  mogPom: '#f83838',
  mogNose: '#f8a0b0',
  mogWing: '#8a4cd0',
  grassL: '#70b850',
  grass: '#4c9038',
  dirt: '#8c6838',
  dirtS: '#6c4c24',
  // The blue window
  winBlue: '#2438a0',
  winDeep: '#101a58',
  winEdge: '#e0e4f8',
  winLabel: '#a8c4ff',
  lvFill: '#f8e048',
  lvFillS: '#d8a020',
  lvEmpty: '#141c50',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const spr = (rows: string[], legend: Record<string, string>): Sprite => ({ rows, legend })

/** `base` with `patch` laid over it at (x, y); '_' in the patch keeps what is under it. */
function paint(base: string[], x: number, y: number, patch: string[]): string[] {
  const out = base.map(r => [...r])
  patch.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      const line = out[y + j]
      if (ch !== '_' && line && x + i < line.length) line[x + i] = ch
    }),
  )
  return out.map(r => r.join(''))
}

/** `rows` with `n` blank rows on top: a pose that reaches above the standing one (the feet stay put). */
const raise = (rows: string[], n: number) => [...Array.from({ length: n }, () => '.'.repeat(rows[0]!.length)), ...rows]

/** Every `from` character in rows `y0..y1` turned to `to` (eyes closing). */
const recolor = (rows: string[], from: string, to: string, y0 = 0, y1 = rows.length) =>
  rows.map((r, y) => (y >= y0 && y < y1 ? r.split(from).join(to) : r))

/** A blank grid for sprites drawn in code. */
const grid = (w: number, h: number) => Array.from({ length: h }, () => new Array<string>(w).fill('.'))
const rowsOf = (g: string[][]) => g.map(r => r.join(''))

// ---------------------------------------------------------------------------
// The Warrior (Sonnet): red hair, steel armor, a crimson cape, a broadsword
// slung across the back. 16 by 16, the standard hero, facing left.
// ---------------------------------------------------------------------------

const WR = { R: 'wrHair', r: 'wrHairS', S: 'skin', s: 'skinS', E: 'eye', A: 'wrArm', a: 'wrArmS', c: 'wrCape', C: 'wrCapeS', Y: 'gold', y: 'goldS', g: 'grip', k: 'boot' }
const WR_STAND = [
  '....rRRRR.......',
  '..RRRRRRRRr.....',
  '.RRRRRRRRRRr..Y.',
  'RRRRSSRRRRRr.yg.',
  '..RSSSSSRRRr.g..',
  '..SESSSSsRRRg...',
  '..SSSSSSsRRg....',
  '...sSSSSRRr.....',
  '....aAAAAAcc....',
  '..aAAAAAAAacc...',
  '..SAAAYAAAacCc..',
  '..SaAAYAAAAcCc..',
  '...aYYYYYYacCc..',
  '....aAA.aAA.CC..',
  '...kkkk.kkkk....',
  '..kkkkk.kkkkk...',
]
const WR_WALK = paint(WR_STAND, 0, 13, ['....aAA..aAA.C..', '..kkkk...kkkk...', '.kkkkk...kkkkk..'])
const WR_ATTACK = paint(WR_STAND, 0, 9, ['SSaAAAAAAAacc...', '..aAAAYAAAacCc..', '...aAAYAAAAcCc..'])
const WR_ITEM = paint(WR_STAND, 0, 0, ['SS', 'SS', '.a', '.a', '.a', '.a', '.a', '.a', '.aaa', '__a', '__.', '__.'])
const WR_SLEEP = [...recolor(WR_STAND, 'E', 's').slice(0, 12), '...kaaaaaacCc...', '..kkkkkkk.kkk...']

// ---------------------------------------------------------------------------
// The Black Mage (Haiku): a tall straw hat, a face of shadow with two glowing
// eyes, a blue robe. Small and fast. 16 by 16.
// ---------------------------------------------------------------------------

const BM = { H: 'bmHat', h: 'bmHatS', D: 'bmFace', Y: 'bmEye', y: 'bmEyeS', B: 'bmRobe', b: 'bmRobeS', T: 'bmTrim', G: 'bmGlove', k: 'boot' }
const BM_STAND = [
  '..........hH....',
  '.........hHH....',
  '........hHHh....',
  '.......hHHHh....',
  '......hHHHHHh...',
  '.....hHHHHHHHh..',
  '.hhHHHHHHHHHHHHh',
  '...hhhhhhhhhhhh.',
  '....DDDDDDDDD...',
  '...DYDDYDDDDD...',
  '...DDDDDDDDDB...',
  '..GBBTBBBBBBbB..',
  '...BBTBBBBBBbb..',
  '...BBTBBBBBbbb..',
  '...bbbbbbbbbbb..',
  '....kkk..kkk....',
]
const BM_WALK = paint(BM_STAND, 0, 0, ['...........hH...', '..........hHH...', '_', '_', '_', '_', '_', '_', '_', '_', '_', '_', '_', '_', '_', '...kkk....kkk...'])
const BM_ATTACK = paint(BM_STAND, 0, 11, ['GGBBBTBBBBBBbB..'])
const BM_ITEM = paint(BM_STAND, 0, 3, ['.G', '.G', '.B', '.B', '.B', '.BB', '..B', '..B', '..B'])
const BM_SLEEP = [...recolor(BM_STAND, 'Y', 'y').slice(0, 13), '..bbbbbbbbbbbb..']

// ---------------------------------------------------------------------------
// The Paladin (Opus): gleaming white plate with gold trim and a gold cross,
// a crested helm, silver hair, a royal blue cape and a holy sword held in
// salute. 22 by 24, feet level with the standard hero's.
// ---------------------------------------------------------------------------

const PAL = { P: 'palW', p: 'palP', q: 'palQ', Y: 'gold', y: 'goldS', U: 'palCape', u: 'palCapeS', S: 'skin', s: 'skinS', E: 'eye', H: 'palHair', L: 'blade', l: 'bladeS' }
const PAL_BASE = [
  '...........YY.........',
  '..........YyyY........',
  '.........PPPPPP.......',
  '........PPPPPPPp......',
  '.......PPPPPPPPpp.Y...',
  '......YYYYYYYYYyyYy...',
  '......PSSSSSPPPpYy....',
  '......SESSSSHPPpy.....',
  '......SSSSSSHHPp......',
  '.......SsSSHHHpU......',
  '........SSHHHUUUu.....',
  '......YPPPPPPYUUUu....',
  '.....YPPPPPPPPYUUUu...',
  '....YPPPYPPPPPpUUUuu..',
  '....PPPYYYPPPPpUUUuu..',
  '....PPPPYPPPPpqUUUUuu.',
  '....PPPPPPPPPpqUUUUuu.',
  '....YYYYYYYYYYyUUUUUuu',
  '....PPPPpPPPPpqUUUUUuu',
  '....PPPq...PPpqUUUUuuu',
  '....PPPq...PPpq.UUUuuu',
  '....PPPq...PPPq...Uuu.',
  '...YYPPq..YYPPq.......',
  '..YYYYYq.YYYYYq.......',
]
const PAL_STRIDE = paint(PAL_BASE, 0, 19, ['...PPPq....PPpqUUUUuuu', '...PPPq....PPpqUUUUuuu', '...PPPq.....PPPq.Uuuu.', '..YYPPq.....YYPPq.....', '.YYYYYq.....YYYYYq....'])
const BLADE = (n: number) => Array.from({ length: n }, () => '.Ll.')
const PAL_SWORD = ['.L..', ...BLADE(13), 'YYYY', '.yy.', '.SSp', '..y.']
const PAL_STAND = paint(PAL_BASE, 0, 0, PAL_SWORD)
const PAL_WALK = paint(PAL_STRIDE, 0, 0, PAL_SWORD)
// The sword is as long in every pose: held up, it rises past the helm (the sprite grows upward).
const PAL_ATTACK = paint(paint(raise(PAL_BASE, 4), 0, 17, ['SSpp']), 17, 0, ['__L_', ...Array.from({ length: 13 }, () => '__Ll'), 'YYYY', '_Syy', '_SS_'])
const PAL_ITEM = paint(raise(PAL_BASE, 5), 0, 0, ['.L..', ...BLADE(13), 'YYYY', '.yy.', '.SSp', '..ypp'])
const PAL_KNEEL = [
  ...recolor(PAL_BASE, 'E', 's').slice(0, 18),
  '....PPPPpPPPPpqUUUUUuu',
  '...PPPPPPPqq.UUUUUUuuu',
  '..YYYYYYq.YYq..UUUuuu.',
]
// Kneeling over the planted sword, a hand on the grip.
const PAL_SLEEP = paint(PAL_KNEEL, 0, 6, ['..y.', '.SSp', '.yy.p', 'YYYY.p', '.Ll..p', ...BLADE(8), '_Ll_', '_Ll_'])

// ---------------------------------------------------------------------------
// The Sage (Fable / Mythos): a deep purple hood and mantle over white robes
// trimmed in gold, a long white beard, a staff crowned with a crystal.
// 18 by 20.
// ---------------------------------------------------------------------------

const SG = { V: 'sgHood', v: 'sgHoodS', W: 'sgRobe', w: 'sgRobeS', O: 'gold', S: 'skin', s: 'skinS', E: 'eye', B: 'sgBeard', t: 'staff', T: 'staffS', C: 'crys', c: 'crysS', X: 'white' }
const SG_BASE = [
  '..................',
  '..................',
  '........VVVV......',
  '.......VVVVVVv....',
  '......VVVVVVVVv...',
  '.....VVVvvvVVVVv..',
  '.....VvSSSSvVVVv..',
  '.....vSESSSSvVVVv.',
  '.....SSSSSSSvVVVv.',
  '.....BBBSSSBvVVvv.',
  '....OBBBBBBBOVVvv.',
  '....OWBBBBBWOVvvv.',
  '....OWWBBBWWOVvv..',
  '....OWWWBWWWOVvv..',
  '....OWWWWWWWOvvv..',
  '....OWWWWWWwOvv...',
  '....OWWWWWWwwOv...',
  '...OWWWWWWWwwwO...',
  '...OOOOOOOOOOOO...',
  '....TT.....TT.....',
]
/** The staff, 20 long whatever the pose, with the hand on it at row `hand` ('_' keeps the robe beside it). */
const staff = (hand = -1) => ['_cC_', 'cXCc', '_cC_', ...Array.from({ length: 16 }, () => '__t_'), '__T_'].map((r, y) => (y === hand ? '_SSW' : r))
const SG_STAND = paint(SG_BASE, 0, 0, staff(10))
// A step lifts the staff a pixel.
const SG_STEP = paint(SG_BASE, 0, 17, ['...OWWWWWWWwwwO...', '....OOOOOOOOOOOO..', '...TT......TT.....'])
const SG_WALK = paint(raise(SG_STEP, 1), 0, 0, staff(11))
// Casting: the staff up two with a glint on the crystal, the free hand out.
const SG_ATTACK = paint(paint(paint(raise(SG_BASE, 3), 0, 1, staff()), 0, 0, ['X___', '____', '____', '____', '_X__']), 0, 12, ['_WW_', 'SSWW'])
// Held high: the staff up four.
const SG_ITEM = paint(paint(raise(SG_BASE, 4), 0, 0, staff()), 0, 10, ['_SS_', '_WW_', '__WW', '__tW'])
// Sitting, the staff still planted.
const SG_SIT = [...recolor(SG_BASE, 'E', 's').slice(0, 16), '...OWWWWWWWwwwO...', '..OOOOOOOOOOOOO...']
const SG_SLEEP = paint(raise(SG_SIT, 2), 0, 0, staff(12))

// ---------------------------------------------------------------------------
// The Onion Knight (any other model): the base job, a little knight in a
// bulbous silver helm. 14 by 14.
// ---------------------------------------------------------------------------

const OK = { O: 'okHelm', o: 'okHelmS', K: 'okSlit', B: 'okTunic', b: 'okTunicS', S: 'skin', k: 'boot' }
const OK_STAND = [
  '......o.......',
  '.....oOo......',
  '....oOOOo.....',
  '...oOOOOOo....',
  '..oOOOOOOOo...',
  '..OOOOOOOOOo..',
  '..KKKKOOOOOo..',
  '..oOOOOOOOoo..',
  '...ooOOOooo...',
  '..SBBBBBBBb...',
  '..SBBBBBBBb...',
  '...bBBBBBb....',
  '...oo...oo....',
  '..kkk..kkk....',
]
const OK_WALK = paint(OK_STAND, 0, 12, ['..oo....oo....', '.kkk....kkk...'])
const OK_ATTACK = paint(OK_STAND, 0, 9, ['SSoBBBBBBBb...', '...BBBBBBBb...'])
const OK_ITEM = paint(OK_STAND, 0, 3, ['.S', '.S', '.o', '.o', '.o', '.o', '.oSBBBBBBBb...', '...BBBBBBBb...'])
const OK_SLEEP = [...OK_STAND.slice(0, 11), '..bbbbbbbbb...', '.kkkkk.kkk....']

// ---------------------------------------------------------------------------
// Monsters and summons
// ---------------------------------------------------------------------------

const GB = { N: 'gbHood', n: 'gbHoodS', g: 'gbSkin', G: 'gbSkinS', R: 'gbEye', x: 'knife' }
const GOBLIN = [
  '....nnnnn.....',
  '...nNNNNNn....',
  '..nNNNNNNNn...',
  '..nNNNggggg...',
  '..nNNgRggRg...',
  '..nNNggggggg..',
  '...nNNgGGgg...',
  '..nnNNNNNNn...',
  '.nNNNNNNNNNgg.',
  '.nNNNNNNNNNgxx',
  '.nNNNNNNNNn.x.',
  '..nNNNNNNNn...',
  '...gg...gg....',
  '...ggg..ggg...',
]
const GOBLIN2 = paint(GOBLIN, 0, 7, ['..nnNNNNNNn.x.', '.nNNNNNNNNNgx.', '.nNNNNNNNNNgg.', '.nNNNNNNNNn...'])
// The goblin dissolving, as defeated monsters do.
const GOBLIN_FADE = GOBLIN.map((r, y) => [...r].map((ch, x) => (ch === '.' || (x + y) % 2 ? '.' : y % 3 ? 'f' : 'F')).join(''))

const BH = { M: 'bhBody', m: 'bhBodyS', h: 'bhHorn', R: 'bhEye', W: 'white', k: 'ink' }
const BEHEMOTH = [
  '..........hh....hh....',
  '...........hh..hh.....',
  '........MMMMhhhhM.....',
  '......MMMMMMMMMMMM....',
  '....MMMMMMMMMMMRMMM...',
  '...MMMMMMMMMMMMMMMMMM.',
  '..MMMMMMMMMMMMMMMWMWMM',
  '.MMmMMMMMMMMMmmMMMMMM.',
  '.MmmMMMMMMMMMmmmW.W...',
  'MmmMMMMMMMMMMMmm......',
  'MmMMMMMMMMMMMMMm......',
  'MmMMMMMMMMMMMMMm......',
  'm.MMMMMMMMMMMMMm......',
  '..MMMmmMMMMmmMMM......',
  '..MMm.mMM.MMm.mMM.....',
  '..MMm..MM.MMm..MM.....',
  '.MMm..MMm.MMm..MMm....',
  '.kkk..kkk.kkk..kkk....',
]

const CH = { Y: 'chY', y: 'chYS', o: 'chBeak', K: 'ink', W: 'white' }
const CHOCO = [
  '...YY.........',
  '..YYYY........',
  '.YYYYYY.......',
  'oYKWYYY.......',
  'ooYYYYY.......',
  '..YYYYY.......',
  '...YYYY.......',
  '...YYYYYY..yy.',
  '..YYYYYYYYYyyy',
  '..YYYYYYYYYYyY',
  '...yYYYYYYYyy.',
  '....yYYYYyy...',
  '.....o...o....',
  '.....o..o.....',
  '....oo.o......',
  '...o..oo......',
]
const CHOCO2 = paint(CHOCO, 0, 12, ['......o.o.....', '......oo......', '.....o..o.....', '....oo...oo...'])

// ---------------------------------------------------------------------------
// Spells (the weapons): each 9 by 9, centered, so a bigger spell grows from
// the same hand.
// ---------------------------------------------------------------------------

const FIRE = { o: 'fireO', y: 'fireY', r: 'fireR', W: 'white' }
const FLARE = { m: 'flareM', R: 'flareR', p: 'flareP', W: 'white' }
const ULT = { g: 'ultG', G: 'ultL', c: 'ultC', W: 'white' }

// ---------------------------------------------------------------------------
// Scenery drawn in code
// ---------------------------------------------------------------------------

// The backdrop strips are as wide as the widest pane (96): a narrower one shows their left part.
const STRIP = 96

function mountains(): Sprite {
  const W = STRIP
  const H = 10
  const g = grid(W, H)
  const peaks = [
    [5, 8],
    [15, 6],
    [26, 10],
    [36, 7],
    [45, 9],
    [55, 6],
    [64, 9],
    [74, 7],
    [84, 10],
    [93, 7],
  ] as const
  for (let x = 0; x < W; x++) {
    let best = 0
    let side = 'm'
    for (const [px, ph] of peaks) {
      const h = ph - Math.abs(x - px) * 0.9
      if (h > best) {
        best = h
        side = x < px ? 'm' : 's'
      }
    }
    const top = H - Math.round(best)
    for (let y = Math.max(0, top); y < H; y++) g[y]![x] = y === top && best >= 7.5 ? 'w' : y <= top + 1 && best >= 9 ? 'w' : side
  }
  return spr(rowsOf(g), { m: 'mtn', s: 'mtnS', w: 'snow' })
}

function forest(): Sprite {
  const W = STRIP
  const H = 15
  const g = grid(W, H)
  const heights = [12, 14, 11, 15, 12, 14, 11, 13, 15, 11, 14, 12, 15, 11]
  for (const [k, th] of heights.entries()) {
    const cx = 3 + k * 7
    const top = H - th
    for (let y = top; y < H - 2; y++) {
      const half = Math.floor(((y - top) % 4) + (y - top) / 3)
      for (let dx = -half; dx <= half; dx++) {
        const x = cx + dx
        if (x < 0 || x >= W) continue
        g[y]![x] = dx < 0 ? 'L' : dx === 0 ? 'p' : 'P'
      }
    }
    g[H - 2]![cx] = 't'
    g[H - 1]![cx] = 't'
  }
  return spr(rowsOf(g), { p: 'pine', P: 'pineS', L: 'pineL', t: 'trunk' })
}

function stalactites(): Sprite {
  const W = STRIP
  const H = 9
  const g = grid(W, H)
  const len = [3, 5, 2, 8, 4, 2, 6, 3, 9, 2, 4, 7, 3, 5, 2, 6]
  for (let x = 0; x < W; x++) {
    const k = Math.floor(x / 3)
    const l = len[k % len.length]!
    const inSpike = x % 3
    const depth = inSpike === 1 ? l : Math.max(1, l - 3)
    for (let y = 0; y < Math.min(H, depth); y++) g[y]![x] = y === 0 ? 'S' : inSpike === 0 ? 'L' : inSpike === 1 ? 'r' : 'S'
  }
  return spr(rowsOf(g), { r: 'rock', S: 'rockS', L: 'rockL' })
}

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

/** A casting circle on the ground, its runes turning. */
function circle(phase: number): Sprite {
  const W = 22
  const H = 5
  const g = grid(W, H)
  const n = 26
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    const x = Math.round(10.5 + Math.cos(a) * 10.4)
    const y = Math.round(2 + Math.sin(a) * 2.1)
    if (x >= 0 && x < W && y >= 0 && y < H) g[y]![x] = (k + phase) % 3 === 0 ? 'W' : 'c'
  }
  return spr(rowsOf(g), { c: 'rune', W: 'runeB' })
}

/** Libra's reticle: four corners around the monster. */
function reticle(w: number, h: number): Sprite {
  const g = grid(w, h)
  for (let i = 0; i < 3; i++) {
    for (const [x, y] of [
      [i, 0],
      [w - 1 - i, 0],
      [i, h - 1],
      [w - 1 - i, h - 1],
      [0, i],
      [w - 1, i],
      [0, h - 1 - i],
      [w - 1, h - 1 - i],
    ] as const)
      g[y]![x] = 'a'
  }
  return spr(rowsOf(g), { a: 'scan' })
}

const sprites: Theme['sprites'] = {
  // Heroes
  wrStand: spr(WR_STAND, WR),
  wrWalk: spr(WR_WALK, WR),
  wrAttack: spr(WR_ATTACK, WR),
  wrItemGet: spr(WR_ITEM, WR),
  wrSleep: spr(WR_SLEEP, WR),
  bmStand: spr(BM_STAND, BM),
  bmWalk: spr(BM_WALK, BM),
  bmAttack: spr(BM_ATTACK, BM),
  bmItemGet: spr(BM_ITEM, BM),
  bmSleep: spr(BM_SLEEP, BM),
  palStand: spr(PAL_STAND, PAL),
  palWalk: spr(PAL_WALK, PAL),
  palAttack: spr(PAL_ATTACK, PAL),
  palItemGet: spr(PAL_ITEM, PAL),
  palSleep: spr(PAL_SLEEP, PAL),
  sgStand: spr(SG_STAND, SG),
  sgWalk: spr(SG_WALK, SG),
  sgAttack: spr(SG_ATTACK, SG),
  sgItemGet: spr(SG_ITEM, SG),
  sgSleep: spr(SG_SLEEP, SG),
  okStand: spr(OK_STAND, OK),
  okWalk: spr(OK_WALK, OK),
  okAttack: spr(OK_ATTACK, OK),
  okItemGet: spr(OK_ITEM, OK),
  okSleep: spr(OK_SLEEP, OK),

  // Monsters and summons
  goblin: spr(GOBLIN, GB),
  goblin2: spr(GOBLIN2, GB),
  goblinFade: spr(GOBLIN_FADE, { f: 'fade', F: 'fadeS' }),
  behemoth: spr(BEHEMOTH, BH),
  choco1: spr(CHOCO, CH),
  choco2: spr(CHOCO2, CH),

  // Spells
  fire: spr(['.........', '.........', '....o....', '...oyo...', '..oyWyo..', '...oyo...', '....r....', '.........', '.........'], FIRE),
  fira: spr(['.........', '....o....', '...oyo...', '..oyWyo..', '.oyWWWyo.', '..oyWyo..', '...ror...', '....r....', '.........'], FIRE),
  firaga: spr(['....o....', '.o.oyo.o.', '..oyyyo..', '.oyWWWyo.', 'oyWWWWWyo', '.oyWWWyo.', '..oyyyo..', '.r.ror.r.', '....r....'], FIRE),
  flare: spr(['...m.m...', '..mRRRm..', '.mRpWpRm.', 'mRpWWWpRm', '.RWWWWWR.', 'mRpWWWpRm', '.mRpWpRm.', '..mRRRm..', '...m.m...'], FLARE),
  ultima: spr(['...gGg...', '.gGcccGg.', '.GcWWWcG.', 'gcWWWWWcg', 'GcWWWWWcG', 'gcWWWWWcg', '.GcWWWcG.', '.gGcccGg.', '...gGg...'], ULT),
  ultAura: spr(
    ['.....c.....', '..c.....c..', '...........', '.c.......c.', '...........', 'c.........c', '...........', '.c.......c.', '...........', '..c.....c..', '.....c.....'],
    { c: 'ultC' },
  ),
  boom1: spr(['...........', '....y.y....', '..r.yoy.r..', '...yoWoy...', '.yyoWWWoyy.', '...yoWoy...', '..r.yoy.r..', '....y.y....', '...........'], FIRE),
  boom2: spr(['r....y....r', '..r.yoy.r..', '.y.yoWoy.y.', '..yoW.Woy..', 'yyoW...Woyy', '..yoW.Woy..', '.y.yoWoy.y.', '..r.yoy.r..', 'r....y....r'], FIRE),

  // Battle effects
  circle1: circle(0),
  circle2: circle(1),
  scanWide: reticle(16, 15),
  scanTight: reticle(14, 14),
  sweat: spr(['.O.', '.O.', 'OWO', 'OOs', '.s.'], { O: 'sweat', W: 'white', s: 'sweatS' }),
  heal: spr(['..g..', '.gWg.', 'gWWWg', '.gWg.', '..g..'], { g: 'heal', W: 'white' }),
  sparkle: spr(['..W..', '..c..', 'WcWcW', '..c..', '..W..'], { c: 'crys', W: 'white' }),
  crystal: spr(['...X...', '..XCc..', '.XCCcc.', 'XCCCccc', 'XCCCccc', '.CCCcc.', '..Ccc..', '...c...'], { X: 'white', C: 'crys', c: 'crysS' }),
  tent: spr(
    ['......kk......', '.....TTTt.....', '....TTTTtt....', '...TTTKKttt...', '..TTTKKKKttt..', '.TTTKKKKKKttt.', 'TTTTKKKKKKtttt', 'k............k'],
    { T: 'tent', t: 'tentS', K: 'tentIn', k: 'boot' },
  ),
  gil: spr(['.Y.', 'YyY', 'YyY', '.Y.'], { Y: 'gold', y: 'goldS' }),

  // Scenery
  field: spr(['g.Gg..gG', 'GgGGgGGg', 'dDdddDdd', 'DdDDdDDd'], { g: 'grassL', G: 'grass', d: 'dirt', D: 'dirtS' }),
  cloud: spr(['...WWWW.....', '.WWWWWWWW...', 'WWWWWWWWWWw.', '.wwwwwwwww..'], { W: 'cloud', w: 'cloudS' }),
  mountains: mountains(),
  forest: forest(),
  stalactites: stalactites(),
  boulder: spr(['...rrrr.....', '..rLLrrrS...', '.rLrrrrrSS..', 'rrrrrrrrSSr.', 'rrrrrSSSSSSr', '.SSSSSSSSSS.'], { r: 'rock', S: 'rockS', L: 'rockL' }),
  voidShard: spr(
    ['...L...', '..LCs..', '..CCs..', '.LCCss.', '.CCCss.', 'LCCCsss', '.CCCss.', '.CCCss.', '..CCs..', '..CCs..', '...s...'],
    { L: 'shardL', C: 'shard', s: 'shardS' },
  ),

  // Scenery past the battle, from the right edge in
  shrine: spr(
    ['....X....', '...XCc...', '..XCCcc..', '.XCCCccc.', '.XCCCccc.', '..CCCcc..', '...Ccc...', '....c....', '.........', '..rLrrS..', '.rrrrrSS.', 'rrLrrrSSS'],
    { X: 'white', C: 'crys', c: 'crysS', r: 'rock', S: 'rockS', L: 'rockL' },
  ),
  moogle: spr(
    ['.....rr...', '.....rr...', '.....k....', '.WW..k.WW.', '.WWWWWWWW.', '.WkWWkWWW.', '.WWnWWWWW.', '..WWWWWW..', '...WWWWpp.', '...WWWW.pp', '...WWWW...', '...oo.oo..'],
    { r: 'mogPom', k: 'ink', W: 'cloud', n: 'mogNose', p: 'mogWing', o: 'skinS' },
  ),
  savePoint: spr(['....W.....', '...WXW....', '....W.....', '..sWWWWs..', 'sWs.ss.sWs', '..sWWWWs..'], { s: 'rune', W: 'runeB', X: 'white' }),
  castle: spr(
    ['.r.........r.', '.T....r....T.', 'TTT...T...TTT', 'TtT..TTT..TtT', 'TTTTTTtTTTTTT', 'TTtTTTTTTTtTT', 'TTTTTkkkTTTTT', 'TTtTTkkkTTtTT', 'TTTTTkkkTTTTT'],
    { T: 'stone', t: 'stoneS', r: 'wrCape', k: 'gate' },
  ),

  // Status bar
  lv0: spr(['kk.', 'kk.', 'kk.', 'kk.'], { k: 'lvEmpty' }),
  lv1: spr(['yy.', 'yy.', 'YY.', 'YY.'], { y: 'lvFill', Y: 'lvFillS' }),
  jobBm: spr(['...hH', '..hHh', '.hHHh', 'hhhhh', '.DYDY', '.DDDD'], { H: 'bmHat', h: 'bmHatS', D: 'bmFace', Y: 'bmEye' }),
  jobWr: spr(['.rRRr', 'RRRRR', 'RSSRR', 'SESRR', '.SSR.', '.aa..'], { R: 'wrHair', r: 'wrHairS', S: 'skin', E: 'eye', a: 'wrArm' }),
  jobPal: spr(['..Y..', '.PPPp', 'YYYYY', 'PSSPp', 'SESHp', '.SHH.'], { Y: 'gold', P: 'palW', p: 'palP', S: 'skin', E: 'eye', H: 'palHair' }),
  jobSage: spr(['.VVV.', 'VVVVv', 'VSSVv', 'SESVv', 'BBBVv', '.BB..'], { V: 'sgHood', v: 'sgHoodS', S: 'skin', E: 'eye', B: 'sgBeard' }),
  jobOk: spr(['..o..', '.oOo.', 'oOOOo', 'KKOOo', 'oOOOo', '.ooo.'], { O: 'okHelm', o: 'okHelmS', K: 'okSlit' }),
  mFire: spr(['..o..', '.oyo.', '.oWo.', '..r..', '.....'], FIRE),
  mFira: spr(['..o..', '.oyo.', 'oyWyo', '.oyo.', '..r..'], FIRE),
  mFiraga: spr(['o.o.o', '.oyo.', 'oyWyo', 'oyWyo', '.rrr.'], FIRE),
  mFlare: spr(['.mRm.', 'mRWRm', 'RWWWR', 'mRWRm', '.mRm.'], FLARE),
  mUltima: spr(['.gGg.', 'gGcGg', 'GcWcG', 'gGcGg', '.gGg.'], ULT),
}

// ---------------------------------------------------------------------------
// Flashes: every hero color washed white (a job change, an ally arriving), the
// goblin hit, the chocobo as it is summoned
// ---------------------------------------------------------------------------

const toWhite = (...legends: Record<string, string>[]) => Object.fromEntries(legends.flatMap(l => Object.values(l)).filter(c => c !== 'white').map(c => [c, 'white']))
const HERO_WHITE = toWhite(WR, BM, PAL, SG, OK)
const GOBLIN_HIT = toWhite(GB)
const CHOCO_WHITE = toWhite(CH)
const BOSS_RED = Object.fromEntries(Object.values(BH).filter(c => c !== 'bhEye').map(c => [c, c === 'bhBodyS' ? 'wrCapeS' : 'wrCape']))

// ---------------------------------------------------------------------------
// Animations. Positions are relative to the hero's top-left (16 by 16, feet on
// the field). The monster stands to the left; the party faces it.
// ---------------------------------------------------------------------------

const GOB = { x: -21, y: 2 }
const gob = (sprite = 'goblin', swap?: Record<string, string>, dx = 0): Actor => at(sprite, GOB.x + dx, GOB.y, swap ? { swap } : {})
/** The spell at the hand, in flight, at the monster. Listed after the monster, so it shows on it. */
const inHand = () => weapon(-8, 6)
const inFlight = () => weapon(-13, 6)
const atFoe = () => weapon(-18, 5)
/** A miss veers up and sails over the monster's head: the same path whatever the job's height. */
const veering = () => weapon(-12, -3, { fixed: true })
const missed = () => weapon(-21, -10, { fixed: true })
const boom = (n: 1 | 2) => at(n === 1 ? 'boom1' : 'boom2', -19, 4)
/** Libra's reticle around the monster, closing in. */
const scan = (wide: boolean) => (wide ? at('scanWide', GOB.x - 1, GOB.y - 1) : at('scanTight', GOB.x, GOB.y))
/** A blue battle window with white text: at the left edge (`LEFT`) or over the party (`MID`), on the top rows. */
const win = (text: string, x: number, y: number): SceneText => ({ text, x, y, color: 'white', bg: 'winBlue' })
const dmg = (text: string, y: number): SceneText => ({ text, x: -17, y, color: 'white' })
const TOP = -18
const LEFT = -21
const MID = -6
const circleAt = (n: 1 | 2) => at(n === 1 ? 'circle1' : 'circle2', -3, 14)
const glint = (x: number, y: number) => at('sparkle', x, y, { fixed: true })

/**
 * Party members joining, ahead of the hero where the monster stood: a Warrior in the front row, a Black
 * Mage in the back row (an Onion Knight stands in for your own job). They appear in a flash, so the
 * moment is the same at every pane width. The back row stands half a step behind the front; beside the
 * Paladin's sword there is no room for the stagger, so his stands straight above it.
 */
const ALL: HeroTier[] = ['tier1', 'tier2', 'tier3', 'tier4', 'unknown']
const but = (...not: HeroTier[]) => ALL.filter(t => !not.includes(t))
const FRONT = { x: -21, y: 0 }
const BACK = { x: -16, y: -16, paladinX: -22, paladinY: -17 }
function party(pose: 'Stand' | 'ItemGet', swap?: Record<string, string>): Actor[] {
  const opts = { fixed: true, ...(swap ? { swap } : {}) }
  return [
    { ...at(`bm${pose}`, BACK.x, BACK.y, opts), tiers: but('tier1', 'tier3') },
    { ...at(`bm${pose}`, BACK.paladinX, BACK.paladinY, opts), tiers: ['tier3'] },
    { ...at(`ok${pose}`, BACK.x + 1, BACK.y + 2, opts), tiers: ['tier1'] },
    { ...at(`wr${pose}`, FRONT.x, FRONT.y, opts), tiers: but('tier2') },
    { ...at(`ok${pose}`, FRONT.x + 1, FRONT.y + 2, opts), tiers: ['tier2'] },
  ]
}
const partyGlints = (): Actor[] => [
  glint(FRONT.x + 5, FRONT.y + 5),
  { ...glint(BACK.x + 6, BACK.y + 6), tiers: but('tier3') },
  { ...glint(BACK.paladinX + 6, BACK.paladinY + 6), tiers: ['tier3'] },
]

/** The summoned chocobo: it appears behind the hero in a flash, runs past him and pecks the monster. */
const choco = (step: 1 | 2, x: number, swap?: Record<string, string>) => at(step === 1 ? 'choco1' : 'choco2', x, 0, swap ? { swap } : {})
const CHOCO_IN = 10
const CHOCO_HIT = -12

const states: Theme['states'] = {
  idle: loop({ actors: [hero('stand'), gob()], hold: 3 }, { actors: [hero('walk'), gob('goblin2')], hold: 3 }),
  thinking: loop(
    { actors: [circleAt(1), hero('itemGet'), gob()], texts: [win(' Chanting   ', MID, TOP)], hold: 2 },
    { actors: [circleAt(2), hero('itemGet'), gob()], texts: [win(' Chanting.  ', MID, TOP)], hold: 2 },
    { actors: [circleAt(1), hero('itemGet'), gob('goblin2')], texts: [win(' Chanting.. ', MID, TOP)], hold: 2 },
    { actors: [circleAt(2), hero('itemGet'), gob('goblin2')], texts: [win(' Chanting...', MID, TOP)], hold: 2 },
  ),
  reading: loop(
    { actors: [hero('attack'), gob(), scan(true)], texts: [win(' Libra ', LEFT, TOP)], hold: 2 },
    { actors: [hero('attack'), gob(), scan(false)], texts: [win(' Libra ', LEFT, TOP)], hold: 2 },
    { actors: [hero('stand'), gob(), scan(false)], texts: [win(' Goblin  Lv 3 ', LEFT, TOP), win(' Weak vs Fire ', LEFT, TOP + 2)], hold: 4 },
    { actors: [hero('walk'), gob('goblin2')], hold: 1 },
  ),
  editing: loop(
    { actors: [hero('stand'), gob()], hold: 1 },
    { actors: [hero('attack'), gob(), inHand()], hold: 1 },
    { actors: [hero('attack'), gob(), inFlight()], hold: 1 },
    { actors: [hero('stand'), gob('goblin', GOBLIN_HIT), boom(1)], hold: 1 },
    { actors: [hero('stand'), gob(), boom(2)], texts: [dmg('128', 0)], hold: 1 },
    { actors: [hero('stand'), gob()], texts: [dmg('128', -2)], hold: 2 },
    { actors: [hero('attack'), gob('goblin2'), inHand()], hold: 1 },
    { actors: [hero('attack'), gob('goblin2'), inFlight()], hold: 1 },
    { actors: [hero('stand'), gob('goblin2', GOBLIN_HIT), boom(1)], hold: 1 },
    { actors: [hero('stand'), gob('goblin2'), boom(2)], texts: [dmg('256', 0)], hold: 1 },
    { actors: [hero('stand'), gob('goblin2')], texts: [dmg('256', -2)], hold: 2 },
  ),
  shell: loop(
    { actors: [circleAt(1), hero('itemGet'), gob()], texts: [win(' Summon ', MID, TOP)], hold: 2 },
    { actors: [circleAt(2), hero('itemGet'), gob()], texts: [win(' Summon ', MID, TOP)], hold: 1 },
    { actors: [hero('stand'), gob(), choco(1, CHOCO_IN, CHOCO_WHITE)], texts: [win(' Chocobo! ', MID, TOP)], hold: 1 },
    { actors: [hero('stand'), gob(), choco(2, CHOCO_IN)], texts: [win(' Chocobo! ', MID, TOP)], hold: 1 },
    { actors: [hero('stand'), gob(), choco(1, -1)], texts: [win(' Chocobo! ', MID, TOP)], hold: 1 },
    { actors: [hero('stand'), gob('goblin', GOBLIN_HIT), choco(2, CHOCO_HIT), boom(1)], hold: 1 },
    { actors: [hero('stand'), gob(), choco(1, CHOCO_HIT, CHOCO_WHITE), boom(2)], texts: [dmg('777', 0)], hold: 1 },
    { actors: [hero('stand'), gob()], texts: [dmg('777', -2)], hold: 2 },
  ),
  agents: loop(
    { actors: [hero('stand'), ...party('Stand', HERO_WHITE)], hold: 1 },
    { actors: [hero('stand'), ...party('Stand'), ...partyGlints()], hold: 1 },
    { actors: [hero('stand'), ...party('Stand')], texts: [win(' The party joins! ', MID, TOP)], hold: 3 },
    { actors: [hero('itemGet'), ...party('ItemGet')], texts: [win(' The party joins! ', MID, TOP)], hold: 2 },
    { actors: [hero('stand'), ...party('Stand')], hold: 3 },
    { actors: [hero('stand'), ...party('Stand', HERO_WHITE)], hold: 1 },
    { actors: [hero('stand'), ...partyGlints()], hold: 1 },
  ),
}

const zzz = (k: number): SceneText[] =>
  [
    { text: 'z', x: 15, y: -2, color: 'white' },
    { text: 'z', x: 17, y: -4, color: 'white' },
    { text: 'Z', x: 19, y: -6, color: 'white' },
  ].slice(0, k)

// Sleep status: the cache is cold.
const cold: Theme['cold'] = {
  idle: loop(
    { actors: [hero('sleep'), gob()], texts: [win(' Sleep ', MID, TOP), ...zzz(1)], hold: 3 },
    { actors: [hero('sleep'), gob()], texts: [win(' Sleep ', MID, TOP), ...zzz(2)], hold: 3 },
    { actors: [hero('sleep'), gob('goblin2')], texts: [win(' Sleep ', MID, TOP), ...zzz(3)], hold: 3 },
  ),
}

const SIGH = 'Overleveled for this.'
// A drop over the back of the head; the Black Mage's hides behind his hat there, so his hangs beside the cone.
const sweat: Actor[] = [
  { ...at('sweat', 9, -6), tiers: but('tier1') },
  { ...at('sweat', 13, 0, { fixed: true }), tiers: ['tier1'] },
]
const overkill: Theme['overkill'] = {
  reading: loop(
    { actors: [hero('attack'), gob(), scan(true), ...sweat], texts: [win(' Libra ', LEFT, TOP)], hold: 2, caption: SIGH },
    { actors: [hero('stand'), gob(), scan(false), ...sweat], texts: [win(' Goblin  Lv 1 ', LEFT, TOP), win(' Exp 2        ', LEFT, TOP + 2)], hold: 3, caption: SIGH },
    { actors: [hero('stand'), gob('goblin2'), ...sweat], texts: [win(' ...sigh. ', MID, TOP)], hold: 3, caption: SIGH },
  ),
  shell: loop(
    { actors: [circleAt(1), hero('itemGet'), gob(), ...sweat], texts: [win(' Summon ', MID, TOP)], hold: 2, caption: SIGH },
    { actors: [hero('stand'), gob(), choco(1, CHOCO_IN), ...sweat], hold: 1, caption: SIGH },
    { actors: [hero('stand'), gob('goblin', GOBLIN_HIT), choco(2, CHOCO_HIT), boom(1), ...sweat], hold: 1, caption: SIGH },
    { actors: [hero('stand'), gob(), ...sweat], texts: [dmg('9999', -2), win(' ...sigh. ', MID, TOP)], hold: 3, caption: SIGH },
  ),
}

// A back attack, as the games stage it: the field mirrored. The party is caught at the left with its
// back to the boss, which looms at the right; then it turns to face it.
const AMBUSHED = -18
const turned = (pose: string): Actor => ({ ...hero(pose, AMBUSHED), flip: true })
const boss = (dx = 0, swap?: Record<string, string>) => at('behemoth', 2 + dx, -2, { flip: true, fixed: true, ...(swap ? { swap } : {}) })

const COINS = [-8, -16, -12]
const TENT = at('tent', -19, 8)

const events: Theme['events'] = {
  toolSuccess: once(
    { actors: [hero('attack'), gob(), inHand()], hold: 1 },
    { actors: [hero('attack'), gob(), inFlight()], hold: 1 },
    { actors: [hero('attack'), gob(), atFoe()], hold: 1 },
    { actors: [hero('stand'), gob('goblin', GOBLIN_HIT), boom(1)], hold: 1 },
    { actors: [hero('stand'), gob(), boom(2)], texts: [dmg('256', 0)], hold: 1 },
    { actors: [hero('stand'), gob('goblinFade')], texts: [dmg('256', -2)], hold: 2 },
    { actors: [hero('stand')], texts: [dmg('256', -2)], hold: 1 },
  ),
  toolError: once(
    { actors: [hero('attack'), gob(), inHand()], hold: 1 },
    { actors: [hero('attack'), gob(), veering()], hold: 1 },
    { actors: [hero('stand'), gob('goblin2', undefined, -2), missed()], hold: 1 },
    { actors: [hero('stand'), gob('goblin2', undefined, -2)], texts: [{ text: 'Miss!', x: -19, y: -2, color: 'white' }], hold: 2 },
    { actors: [hero('stand'), gob()], texts: [{ text: 'Miss!', x: -19, y: -4, color: 'white' }], hold: 2 },
  ),
  turnComplete: once(
    { actors: [hero('itemGet')], texts: [win(' Victory! ', MID, TOP)], hold: 2 },
    { actors: [hero('stand')], texts: [win(' Victory! ', MID, TOP)], hold: 1 },
    { actors: [hero('itemGet'), at('gil', COINS[0]!, 2), at('gil', COINS[1]!, 6)], texts: [win(' Victory! ', MID, TOP)], hold: 1 },
    {
      actors: [hero('itemGet'), at('gil', COINS[0]!, 8), at('gil', COINS[1]!, 12), at('gil', COINS[2]!, 2)],
      texts: [win(' Victory! ', MID, TOP), win(' Got Gil! ', MID, TOP + 2)],
      hold: 1,
    },
    { actors: [hero('itemGet'), ...COINS.map(x => at('gil', x, 12))], texts: [win(' Victory! ', MID, TOP), win(' Got Gil! ', MID, TOP + 2)], hold: 4 },
  ),
  milestone: once({ actors: [hero('stand'), gob()], message: 'milestone', hold: 18 }),
  cacheCold: once(
    { actors: [hero('stand'), gob()], texts: [win(' Sleep ', MID, TOP)], hold: 2 },
    { actors: [hero('sleep'), gob()], texts: [win(' Sleep ', MID, TOP), ...zzz(2)], hold: 2 },
    { actors: [hero('sleep'), gob('goblin2')], texts: zzz(3), message: 'cacheCold', hold: 12 },
  ),
  limitWarning: once(
    { actors: [hero('stand', AMBUSHED), boss(0, BOSS_RED)], texts: [win(' Back attack! ', MID, TOP)], hold: 1 },
    { actors: [hero('stand', AMBUSHED), boss()], texts: [win(' Back attack! ', MID, TOP)], hold: 1 },
    { actors: [turned('walk'), boss(-1, BOSS_RED)], texts: [win(' Back attack! ', MID, TOP)], hold: 1 },
    { actors: [turned('stand'), boss()], message: 'limitWarning', hold: 12 },
  ),
  compaction: once(
    { actors: [hero('walk'), TENT], texts: [win(' Used Tent ', MID, TOP)], hold: 2, caption: 'compaction' },
    { actors: [hero('sleep'), TENT], texts: [win(' Used Tent ', MID, TOP), ...zzz(3)], hold: 3, caption: 'compaction' },
    { actors: [hero('itemGet'), TENT, at('heal', 0, 2), at('heal', 11, 6)], texts: [win(' HP restored! ', MID, TOP)], hold: 1, caption: 'compaction' },
    { actors: [hero('itemGet'), TENT, at('heal', 4, 8), at('heal', 9, 0)], texts: [win(' HP restored! ', MID, TOP)], hold: 3, caption: 'compaction' },
  ),
  modelChange: once(
    { actors: [hero('stand'), at('crystal', 4, -12)], hold: 2 },
    { actors: [hero('stand', 0, 0, HERO_WHITE), at('crystal', 4, -12), at('sparkle', -2, 4), at('sparkle', 13, 8)], hold: 1 },
    { actors: [at('sparkle', 0, 2), at('sparkle', 11, 4), at('sparkle', 5, 10), at('crystal', 4, -12)], hold: 1 },
    { actors: [hero('itemGet', 0, 0, HERO_WHITE), at('sparkle', 2, 6)], hold: 1 },
    { actors: [hero('itemGet')], texts: [win(' Job change! ', MID, TOP)], hold: 5, caption: 'modelChange' },
  ),
  // The new spell burns over the raised hand (each form's `aloft` puts it on its own: the sword's tip, the staff's crystal).
  effortChange: once(
    { actors: [hero('itemGet'), weapon(-4, -9)], hold: 2 },
    { actors: [hero('itemGet'), weapon(-4, -9), at('sparkle', -11, -9), at('sparkle', 6, -12)], texts: [win(' Learned! ', LEFT, TOP)], hold: 5, caption: 'effortChange' },
  ),
}

const poses = (p: string) => ({ stand: `${p}Stand`, walk: `${p}Walk`, attack: `${p}Attack`, itemGet: `${p}ItemGet`, sleep: `${p}Sleep` })

export const fantasy: Theme = {
  id: 'fantasy',
  name: 'Final Context',
  description: 'A 16-bit JRPG battle: jobs by model, spells by effort, HP for context, MP for cache, Gil for cost',
  version: '1.1.0',
  palette: {
    dark: { accent: '#6ab0ff', gold: '#f8d048', red: '#ff5a5a', label: '#a8c4ff', dim: '#8088a8', text: '#f0f0f8' },
    light: { accent: '#2048b0', gold: '#8a6000', red: '#c02828', label: '#3050a0', dim: '#606880', text: '#141828' },
  },
  pixels,
  labels: {
    context: 'HP',
    spend: 'GIL',
    cache: 'MP',
    limits: 'LIMIT',
    modelItem: 'JOB',
    effortItem: 'MAGIC',
    heroes: 'Jobs',
    weapons: 'Magic',
  },
  headings: {
    Context: 'HP',
    Cost: 'Gil',
    'Next message': 'MP',
    Tokens: 'Bestiary',
    Limits: 'Limit gauge',
    'Tool calls': 'Battle log',
    Files: 'World map',
  },
  sprites,
  states,
  cold,
  overkill,
  events,
  scene: {
    height: 40,
    anchor: { x: 22, y: 20 },
    background: {
      ground: 'grass',
      gradient: ['#4878d8', '#5888e0', '#6898e8', '#78a8f0', '#90bcf4', '#b0d4f8', '#5ca048', '#549840', '#4c8c38', '#448030', '#3c742c', '#346828', '#2c5c24', '#285020'],
      deep: ['#000000', '#04020c', '#080418', '#0c0620', '#100828', '#140a30', '#180c38', '#1c0e40', '#200f48', '#241050', '#281258', '#2c1460', '#301668', '#341870'],
      floor: 'field',
      shade: { color: '#0c0618', amount: 0.7 },
      // Grassland to 25%, forest to 50%, cave to 75%, then the void: each range ends where the next begins.
      // Past the battle (columns 0..45), from the right edge in: the Crystal at 58, a moogle at 80, the rest at 96.
      decor: [
        { sprite: 'cloud', x: 2, y: 6, sky: true, maxPercent: 25 },
        { sprite: 'cloud', x: 35, y: 2, sky: true, maxPercent: 25 },
        { sprite: 'cloud', x: -6, y: 4, sky: true, maxPercent: 25, minColumns: 78 },
        { sprite: 'cloud', x: -30, y: 2, sky: true, maxPercent: 25, minColumns: 94 },
        { sprite: 'mountains', x: 0, y: 8, maxPercent: 25 },
        { sprite: 'castle', x: -32, y: 9, maxPercent: 25, minColumns: 94 },
        { sprite: 'forest', x: 0, y: 4, minPercent: 25, maxPercent: 50 },
        { sprite: 'stalactites', x: 0, y: 0, sky: true, minPercent: 50, maxPercent: 75 },
        { sprite: 'boulder', x: -22, y: 30, minPercent: 50, maxPercent: 75, minColumns: 94 },
        { sprite: 'voidShard', x: 5, y: 7, sky: true, minPercent: 75 },
        { sprite: 'voidShard', x: -3, y: 5, sky: true, minPercent: 75, minColumns: 56 },
        { sprite: 'voidShard', x: -16, y: 3, sky: true, minPercent: 75, minColumns: 78 },
        { sprite: 'voidShard', x: -36, y: 11, sky: true, minPercent: 75, minColumns: 94 },
        { sprite: 'shrine', x: -1, y: 24, minColumns: 56, lit: true },
        { sprite: 'moogle', x: -12, y: 24, minColumns: 78 },
        { sprite: 'savePoint', x: -38, y: 30, minColumns: 94, lit: true },
      ],
      particles: [
        { colors: ['#f8f080', '#c8f870'], count: 10, drift: 'up', speed: 0.3, minPercent: 25, maxPercent: 50 },
        { colors: ['#a89880', '#786858'], count: 12, drift: 'down', speed: 0.5, minPercent: 50, maxPercent: 75 },
        { colors: ['#ffffff', '#c8b8ff', '#ffe8a0'], count: 20, drift: 'none', minPercent: 75 },
        { colors: ['#b070ff', '#6040e0', '#ff70d0'], count: 14, drift: 'up', speed: 0.6, minPercent: 75 },
      ],
    },
    hero: poses('wr'),
    heroTiers: { tier1: {}, tier2: {}, tier3: {}, tier4: {}, unknown: {} },
    // `hand`: the spell sits on each job's casting hand; `aloft`: the learned spell on its raised hand, sword tip or crystal.
    heroForms: {
      tier1: { poses: poses('bm'), dx: 0, dy: 0, lift: 0, hand: { x: 0, y: 0 }, aloft: { x: 1, y: 3 } },
      tier3: { poses: poses('pal'), dx: -4, dy: -8, lift: 8, hand: { x: -1, y: -4 }, aloft: { x: -3, y: 1 } },
      tier4: { poses: poses('sg'), dx: -1, dy: -4, lift: 4, hand: { x: -1, y: -2 }, aloft: { x: 0, y: 2 } },
      unknown: { poses: poses('ok'), dx: 1, dy: 2, lift: -2, hand: { x: 1, y: 0 }, aloft: { x: 2, y: 2 } },
    },
    heroNames: {
      tier1: 'Black Mage',
      tier2: 'Warrior of Light',
      tier3: 'Holy Paladin',
      tier4: 'Sage of Ages',
      unknown: 'Onion Knight',
    },
    weapons: {
      low: { sprite: 'fire', swap: {}, name: 'Fire' },
      medium: { sprite: 'fira', swap: {}, name: 'Fira' },
      high: { sprite: 'firaga', swap: {}, name: 'Firaga' },
      xhigh: { sprite: 'flare', swap: {}, name: 'Flare' },
      max: { sprite: 'ultima', swap: {}, aura: 'ultAura', name: 'Ultima' },
    },
    bar: {
      // HP and MP read as the games print them, current over maximum (context left of 9900, cache left of 900).
      // Two rows from JOB on at 48 and 58; `chars` keeps a shrinking number from reflowing the row.
      widgets: [
        { kind: 'counter', value: 'contextLeft', label: 'HP', scale: 99, format: '{v}/9900', chars: 9 },
        { kind: 'counter', value: 'cache', label: 'MP', scale: 9, format: '{v}/900', chars: 7 },
        { kind: 'counter', value: 'spend', icon: 'gil', label: 'GIL', chars: 5 },
        { kind: 'box', shows: 'model', sprite: 'jobWr', sprites: { tier1: 'jobBm', tier3: 'jobPal', tier4: 'jobSage', unknown: 'jobOk' }, label: 'JOB', x: 1, y: 4, drop: 2, wrap: true },
        {
          kind: 'box',
          shows: 'effort',
          sprite: 'mFira',
          sprites: { low: 'mFire', high: 'mFiraga', xhigh: 'mFlare', max: 'mUltima' },
          label: 'MAGIC',
          x: 1,
          y: 5,
          drop: 3,
        },
        { kind: 'meter', value: 'effort', count: 5, perRow: 5, sprites: ['lv0', 'lv1'], gap: 0, label: 'LV', drop: 5 },
        { kind: 'counter', value: 'limitMax', label: 'LIMIT', format: '{v}%', drop: 4 },
        { kind: 'map', drop: 6 },
      ],
      colors: { bg: 'winBlue', box: 'winEdge', text: 'white', label: 'winLabel', map: 'winDeep', mapDot: 'gold' },
    },
    lineup: { ground: 'winDeep', ink: 'white', dim: 'winLabel', mark: 'gold' },
    message: { bg: 'winBlue', ink: 'white' },
  },
  text: {
    idle: 'The party holds its battle stance.',
    thinking: 'Chanting... a spell gathers.',
    reading: 'Libra! The foe is studied.',
    editing: 'The spell strikes! Damage numbers fly.',
    shell: 'Summon! A chocobo charges in.',
    agents: 'Party members join the line-up.',
    toolSuccess: 'A hit! The goblin is defeated.',
    toolError: 'Miss!',
    turnComplete: 'Victory! Gil acquired.',
    milestone: 'The battlefield shifts.',
    cacheCold: 'Sleep! The MP (cache) has run dry.',
    limitWarning: 'Back attack! A boss looms behind the party.',
    compaction: 'The party pitches a Tent and rests.',
    modelChange: 'Job change!',
    effortChange: 'A new spell is learned!',
  },
  // One per context level, as the user's thresholds set them (by default 30, 40, 50, 75).
  milestones: [
    { level: 'ok', message: 'THE PARTY PRESSES ON. {pct}% OF HP SPENT. THE GRASSLANDS ARE CALM.' },
    { level: 'warn', message: '{pct}% OF HP SPENT. THE FOREST DARKENS. MIND YOUR HP.' },
    { level: 'orange', message: '{pct}% OF HP SPENT. A CAVE LIES AHEAD. LOOK FOR A SAVE POINT.' },
    { level: 'alert', message: 'DANGER! {pct}% OF HP SPENT. THE MONSTERS GROW STRONG. REST WHILE YOU CAN.' },
    { level: 'critical', message: 'A STRONG ENEMY APPROACHES... {pct}% OF HP SPENT. SAVE YOUR GAME AND /clear.' },
  ],
  messages: {
    cacheCold: 'THE PARTY FELL ASLEEP. MP IS GONE: YOUR CACHE HAS GONE COLD.',
    limitWarning: 'BACK ATTACK! A BOSS LOOMS BEHIND THE PARTY: {name} AT {pct}%.',
    compaction: 'Used a Tent: context compacted, HP restored!',
    modelChange: 'Job change! {name} steps forward.',
    effortChange: 'Learned {weapon}!',
  },
}
