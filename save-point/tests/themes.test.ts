import { describe, expect, test } from 'claude-code/testing'

import { resolveTheme, spritesUsed, THEMES, themeId } from '../hooks/themes'
import { hex, rotate } from '../hooks/themes/pixel'
import {
  activityFor,
  duration,
  frameAt,
  fill,
  barValue,
  hearts,
  meterFill,
  meterFraction,
  milestoneMessage,
  liveLog,
  pushLog,
  HERO_TIERS,
  heroTier,
  lineupLayout,
  renderLineup,
  stepScene,
  WEAPON_TIERS,
  isOverkill,
  isRoutine,
  renderBar,
  renderScene,
  currency,
  weaponTier,
} from '../hooks/themes/scene'
import type { SceneState } from '../hooks/themes/scene'
import { ACTIVITY_STATES, EVENT_NAMES, TEXT_COLORS } from '../hooks/themes/types'
import type { Actor, Theme } from '../hooks/themes/types'

const base: SceneState = {
  tick: 0,
  percent: 20,
  hero: 'tier3',
  weapon: 'high',
  activity: 'idle',
  overkill: false,
  cacheCold: false,
  stamina: 0.5,
  staminaSeconds: 1800,
  nextWarmUsd: 0.03,
  nextColdUsd: 1.08,
  event: null,
}

describe('registry', () => {
  test('every pack resolves with no fallbacks', () => {
    for (const id of Object.keys(THEMES)) expect(resolveTheme(id).missing).toEqual([])
  })
  test('a pack resolves once', () => {
    expect(resolveTheme('zelda')).toBe(resolveTheme('zelda'))
  })
  test('a palette missing a text color says so', () => {
    const zelda = THEMES.zelda!
    THEMES.pale = { ...zelda, id: 'pale', palette: { ...zelda.palette, light: { ...zelda.palette.light, gold: '' } } }
    expect(resolveTheme('pale').missing).toEqual(['palette.light.gold'])
    delete THEMES.pale
  })
  for (const id of Object.keys(THEMES)) {
    test(`/hud theme ${id} makes it the active theme`, async ($, on) => {
      const toasts: string[] = []
      on('session.surfaces', () => ({ value: [] }))
      on('store.set', () => ({ value: undefined }))
      on('ui.toast', (_$, e) => {
        toasts.push(e.text)
        return { value: undefined }
      })
      const run = (args: string) => $.command.run({ command: 'hud', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
      await run(`theme ${id}`)
      await run('theme')
      expect(toasts.join(' | ')).toContain(`${id} (active)`)
    })
  }
  test('aliases', () => {
    expect(themeId('Quest')).toBe('zelda')
    expect(themeId('nope')).toBe(null)
  })
  test('a pack missing slots falls back per slot and says which', () => {
    const zelda = THEMES.zelda!
    THEMES.broken = { ...zelda, id: 'broken', states: { ...zelda.states, shell: { frames: [], loop: true } } }
    const { theme, missing } = resolveTheme('broken')
    expect(missing).toContain('states.shell')
    expect(theme.states.shell.frames.length).toBeGreaterThan(0)
    delete THEMES.broken
  })
})

/** The scene themes, resolved. */
const PACKS = Object.keys(THEMES)
  .map(id => resolveTheme(id).theme)
  .filter(t => t.scene)

/** A Raster's cells as `[codePoint, fg, bg]` triplets. */
function cellsOf(r: { cells: string }): Uint32Array {
  const bin = atob(r.cells)
  const bytes = new Uint8Array(bin.length)
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k)
  return new Uint32Array(bytes.buffer)
}

const UPPER_HALF = 0x2580

for (const theme of PACKS) {
  const spec = theme.scene!
  const color = (name: string) => hex(theme.pixels[name] ?? name)

  describe(`pack ${theme.id}`, () => {
    test('every sprite is rectangular and uses known colors', () => {
      for (const [name, s] of Object.entries(theme.sprites)) {
        const w = [...(s.rows[0] ?? '')].length
        for (const row of s.rows) {
          expect(`${name}:${[...row].length}`).toBe(`${name}:${w}`)
          for (const ch of row) {
            const named = s.legend && ch in s.legend ? s.legend[ch] : ch === '.' || ch === ' ' ? null : ch
            if (named === null || named === undefined) continue
            expect(`${name}:${ch}:${color(named) !== null}`).toBe(`${name}:${ch}:true`)
          }
        }
      }
    })
    test('every sprite is used', () => {
      const used = spritesUsed(THEMES[theme.id]!)
      expect(Object.keys(theme.sprites).filter(n => !used.has(n))).toEqual([])
    })
    test('colors: pixels, text palette, bar, ring, backdrop', () => {
      for (const [name, c] of Object.entries(theme.pixels)) expect(`${name}:${hex(c) !== null}`).toBe(`${name}:true`)
      for (const mode of ['dark', 'light'] as const) {
        for (const k of TEXT_COLORS) expect(`${mode}.${k}:${hex(theme.palette[mode][k]) !== null}`).toBe(`${mode}.${k}:true`)
      }
      const names = [
        ...Object.values(spec.bar?.colors ?? {}),
        ...(spec.stamina ? [spec.stamina.full, spec.stamina.empty, spec.stamina.cold, spec.stamina.tagColor, spec.stamina.tagColdColor] : []),
        spec.background.ground,
        ...(spec.background.gradient ?? []),
        ...(spec.background.deep ?? []),
        ...(spec.background.shade ? [spec.background.shade.color] : []),
        ...(spec.background.particles ?? []).flatMap(p => p.colors),
        ...(spec.lineup ? [spec.lineup.ground, spec.lineup.ink, spec.lineup.dim, spec.lineup.mark] : []),
        ...(spec.message ? [spec.message.bg, spec.message.ink] : []),
        ...Object.values(spec.heroTiers).flatMap(sw => Object.values(sw)),
        ...Object.values(spec.weapons).flatMap(w => Object.values(w.swap)),
      ].filter((n): n is string => Boolean(n))
      for (const n of names) expect(`${n}:${color(n) !== null}`).toBe(`${n}:true`)
    })
    test('renders every state and event for every hero and weapon', { timeoutMs: 30_000 }, () => {
      const rows = Math.ceil(spec.height / 2)
      const anims = [
        ...ACTIVITY_STATES.map(a => ({ s: { activity: a }, anim: theme.states[a] })),
        ...ACTIVITY_STATES.flatMap(a => (theme.overkill[a] ? [{ s: { activity: a, overkill: true }, anim: theme.overkill[a]! }] : [])),
        ...ACTIVITY_STATES.flatMap(a => (theme.cold?.[a] ? [{ s: { activity: a, cacheCold: true }, anim: theme.cold[a]! }] : [])),
        ...EVENT_NAMES.map(e => ({ s: { event: { name: e, startTick: 0, vars: { pct: '50', level: 'alert', name: 'X', weapon: 'Y' } } }, anim: theme.events[e] })),
      ]
      for (const hero of HERO_TIERS) {
        for (const weapon of WEAPON_TIERS) {
          for (const { s, anim } of anims) {
            // Each frame once: the tick its frame starts.
            let t = 0
            for (const f of anim.frames) {
              expect(renderScene(theme, { ...base, ...s, hero, weapon, tick: t }, 64)?.rows).toBe(rows)
              t += Math.max(1, f.hold ?? 1)
            }
          }
          expect(renderBar(theme, { tick: 0, percent: 40, spend: 260, hero, weapon, cacheSeconds: 100, cacheFrac: 0.5, nextWarmUsd: 0.03, limitMax: 50 }, 72)?.columns ?? 72).toBe(72)
        }
      }
    })
    test('the bar fits narrow and wide panes', () => {
      for (const cols of [44, 58, 72, 96]) expect(renderBar(theme, { tick: 0, percent: 40, spend: 260, hero: 'tier3', weapon: 'high' }, cols)?.columns ?? cols).toBe(cols)
    })
    test('lineup heroes stay inside their slots', () => {
      for (const columns of [48, 72, 96]) {
        const L = lineupLayout(theme, columns)
        const r = renderLineup(theme, columns, { hero: 'tier1', weapon: 'low' })!
        const cells = cellsOf(r)
        const ground = color(spec.lineup?.ground ?? spec.background.ground)
        const isGround = (col: number, row: number) => {
          const k = (row * columns + col) * 3
          return cells[k] === UPPER_HALF && cells[k + 1] === ground && cells[k + 2] === ground
        }
        L.heroes.forEach((tier, k) => {
          const left = (k % L.perRow) * L.slotW
          const top = Math.floor(k / L.perRow) * L.rowsPerBand
          for (let row = top; row < top + L.heroRows; row++) {
            expect(`${tier}@${columns}:${row}:${isGround(left, row) && isGround(left + L.slotW - 1, row)}`).toBe(`${tier}@${columns}:${row}:true`)
          }
          for (let col = left; col < left + L.slotW; col++) expect(`${tier}@${columns} top:${col}:${isGround(col, top)}`).toBe(`${tier}@${columns} top:${col}:true`)
        })
      }
    })
    test('one-shots hold their last frame', () => {
      const anim = theme.events.turnComplete
      expect(frameAt(anim, 999)).toBe(anim.frames[anim.frames.length - 1]!)
    })
  })
}

describe('animation step', () => {
  const theme = resolveTheme('zelda').theme
  const idle = { tick: 0, activity: 'idle' as const, playing: null, queue: [], preview: [] }
  test('a queued moment plays, ends after its duration, and the next starts', () => {
    const vars = {}
    let p = stepScene(theme, { ...idle, tick: 1, queue: [{ name: 'toolSuccess', at: 0, vars }, { name: 'turnComplete', at: 0, vars }] }, 30)
    expect(p.playing?.name).toBe('toolSuccess')
    expect(p.queue.length).toBe(1)
    const end = 1 + duration(theme.events.toolSuccess)
    p = stepScene(theme, { ...p, tick: end - 1 }, 30)
    expect(p.playing?.name).toBe('toolSuccess')
    p = stepScene(theme, { ...p, tick: end }, 30)
    expect(p.playing?.name).toBe('turnComplete')
    expect(p.playing?.startTick).toBe(end)
  })
  test('stale moments are dropped', () => {
    const p = stepScene(theme, { ...idle, tick: 100, queue: [{ name: 'toolError', at: 10, vars: {} }] }, 30)
    expect([p.playing, p.queue]).toEqual([null, []])
  })
  test('a preview walks its states, then its events, then rests', () => {
    let p = stepScene(theme, { ...idle, tick: 1, preview: [{ kind: 'state', name: 'shell', ticks: 2 }, { kind: 'event', name: 'milestone', ticks: 1 }] }, 30)
    expect([p.activity, p.preview[0]?.ticks]).toEqual(['shell', 1])
    p = stepScene(theme, { ...p, tick: 2 }, 30)
    expect(p.preview.map(s => s.name)).toEqual(['milestone'])
    p = stepScene(theme, { ...p, tick: 3 }, 30)
    expect([p.activity, p.playing, p.preview]).toEqual(['idle', null, []])
    const shown = stepScene(theme, { ...idle, tick: 1, preview: [{ kind: 'event', name: 'milestone', ticks: 5 }] }, 30)
    expect(fill(theme, 'milestone', shown.playing!.vars)).toContain('DANGEROUS')
  })
})

/**
 * A bare scene: a 4x4 hero, an 8x8 form for tier3 (lift 4, hand 3 right), and
 * 1x2 red props, so a red cell marks where a prop landed.
 */
function probeTheme(actors: Actor[], decor: NonNullable<Theme['scene']>['background']['decor'] = []): Theme {
  const t = resolveTheme('default').theme
  const poses = { stand: 'h', walk: 'h', attack: 'h', itemGet: 'h', sleep: 'h' }
  const tiers = { tier1: {}, tier2: {}, tier3: {}, tier4: {}, unknown: {} }
  const w = { sprite: 'dot', swap: {}, name: 'dot' }
  return {
    ...t,
    pixels: { R: '#ff0000', B: '#0000ff', K: '#000000' },
    sprites: { h: { rows: Array(4).fill('BBBB') }, big: { rows: Array(8).fill('BBBBBBBB') }, dot: { rows: ['R', 'R'] } },
    states: { ...t.states, idle: { frames: [{ actors: [{ sprite: '@stand', x: 0, y: 0 }, ...actors] }], loop: true } },
    scene: {
      height: 40,
      anchor: { x: 10, y: 20 },
      background: { ground: 'K', decor },
      hero: poses,
      heroTiers: tiers,
      heroNames: { tier1: 'a', tier2: 'b', tier3: 'c', tier4: 'd', unknown: 'e' },
      weapons: { low: w, medium: w, high: w, xhigh: w, max: w },
      heroForms: { tier3: { poses: { ...poses, stand: 'big', walk: 'big', attack: 'big', itemGet: 'big', sleep: 'big' }, dx: -2, dy: -4, lift: 4, hand: { x: 3, y: 0 } } },
    },
  }
}

/** Whether the cell at column x holding pixel row y is red. */
function redAt(theme: Theme, x: number, y: number, columns = 64): boolean {
  const cells = cellsOf(renderScene(theme, base, columns)!)
  return cells[(Math.floor(y / 2) * columns + x) * 3 + 1] === 0xff0000
}

describe('scene placement', () => {
  test('a taller form lifts props over the head, not fixed scenery', () => {
    expect(redAt(probeTheme([{ sprite: 'dot', x: 6, y: -4 }]), 16, 12)).toBe(true)
    expect(redAt(probeTheme([{ sprite: 'dot', x: 6, y: -4, fixed: true }]), 16, 16)).toBe(true)
  })
  test("a form's hand mirrors when the weapon is flipped", () => {
    expect(redAt(probeTheme([{ sprite: '@weapon', x: 6, y: 0 }]), 19, 20)).toBe(true)
    expect(redAt(probeTheme([{ sprite: '@weapon', x: -3, y: 0, flip: true }]), 4, 20)).toBe(true)
  })
  test('decor hides below its minimum width', () => {
    const theme = probeTheme([], [{ sprite: 'dot', x: 0, y: 0, minColumns: 50 }])
    expect(redAt(theme, 0, 0, 64)).toBe(true)
    expect(redAt(theme, 0, 0, 40)).toBe(false)
  })
  test('meters fill by context, cache, effort and limit headroom', () => {
    const b = { tick: 0, percent: 25, spend: 0, hero: 'tier3' as const, weapon: 'high' as const, cacheSeconds: null, cacheFrac: 0.5, limitMax: 80 }
    expect(meterFraction('contextLeft', b)).toBe(0.75)
    expect(meterFraction('cache', b)).toBe(0.5)
    expect(meterFraction('effort', b)).toBe(0.6)
    expect(meterFraction('limitsLeft', b)).toBe(0.2)
    expect(meterFraction('limitsLeft', { ...b, limitMax: null })).toBe(1)
  })
})

describe('mapping', () => {
  test('hero by model family', () => {
    expect(heroTier('claude-haiku-4-5-20251001')).toBe('tier1')
    expect(heroTier('claude-sonnet-5-5')).toBe('tier2')
    expect(heroTier('claude-opus-5-5[1m]')).toBe('tier3')
    expect(heroTier('claude-fable-5-1')).toBe('tier4')
    expect(heroTier('claude-mythos-6-0')).toBe('tier4')
    expect(heroTier('gpt-x')).toBe('unknown')
  })
  test('weapon by effort', () => {
    expect(weaponTier('xhigh')).toBe('xhigh')
    expect(weaponTier(null)).toBe('medium')
  })
  test('activity by tool; unknown tools keep thinking', () => {
    expect(activityFor('Grep')).toBe('reading')
    expect(activityFor('Edit')).toBe('editing')
    expect(activityFor('PowerShell')).toBe('shell')
    expect(activityFor('Agent')).toBe('agents')
    expect(activityFor('mcp__thing__do')).toBe('thinking')
  })
  test('hearts: ten of 10% each, in quarters of 2.5%', () => {
    expect(hearts(0)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4])
    expect(hearts(15)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 2, 0])
    expect(hearts(17.5)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 1, 0])
    expect(hearts(92.5)).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(hearts(100).every(q => q === 0)).toBe(true)
  })
  test('the log stacks newest first, keeps lines 5 s, and refreshes repeats in place', () => {
    let log = pushLog([], 'a', 0)
    log = pushLog(log, 'b', 1000)
    expect(liveLog(log, 1000)).toEqual(['b', 'a'])
    log = pushLog(log, 'a', 2000)
    expect(liveLog(log, 2000)).toEqual(['b', 'a'])
    expect(liveLog(log, 6500)).toEqual(['a'])
    expect(liveLog(log, 7000)).toEqual([])
    for (const t of ['c', 'd', 'e', 'f']) log = pushLog(log, t, 8000)
    expect(liveLog(log, 8000)).toEqual(['f', 'e', 'd'])
  })
  test('milestone messages follow the context level', () => {
    const theme = resolveTheme('zelda').theme
    expect(milestoneMessage(theme, 'ok')).toContain('GOES WELL')
    expect(milestoneMessage(theme, 'orange')).toContain('REST SOON')
    expect(fill(theme, 'milestone', { pct: '50', level: 'alert' })).toBe("IT'S DANGEROUS TO GO ON. 50% OF YOUR HEARTS ARE SPENT.")
    expect(milestoneMessage(theme, 'critical')).toContain('/clear')
    // A level without an entry uses the one below it; no level, the moment's line.
    const sparse = { ...theme, milestones: [{ level: 'ok' as const, message: 'calm' }, { level: 'alert' as const, message: 'danger' }] }
    expect(milestoneMessage(sparse, 'orange')).toBe('calm')
    expect(milestoneMessage(sparse, 'critical')).toBe('danger')
    expect(fill(sparse, 'milestone', { pct: '50' })).toBe(theme.text.milestone)
  })
  test('bar values: world stages, padded counters, meters', () => {
    const b = { tick: 0, percent: 0, spend: 7, hero: 'tier3' as const, weapon: 'high' as const, cacheSeconds: 248.2, cacheFrac: 0.5 }
    expect(barValue('world', b)).toBe('1-1')
    expect(barValue('world', { ...b, percent: 50 })).toBe('5-1')
    expect(barValue('world', { ...b, percent: 100 })).toBe('8-4')
    expect(barValue('cacheSeconds', b)).toBe('249')
    expect(barValue('cacheSeconds', { ...b, cacheSeconds: null })).toBe('---')
    expect(barValue('effort', b)).toBe('3')
    expect(meterFill(0.5, 4, 1)).toEqual([1, 1, 0, 0])
  })
  test('rotate lays a sprite down and trims blank rows', () => {
    const s = { rows: ['.A.', '.B.', '.C.'] }
    expect(rotate(s, 'ccw').rows).toEqual(['ABC'])
    expect(rotate(s, 'cw').rows).toEqual(['CBA'])
    expect(rotate({ rows: ['AB', 'CD'] }, 'ccw').rows).toEqual(['BD', 'AC'])
  })
  test('the champion form covers every pose and stands on the same feet', () => {
    const theme = resolveTheme('zelda').theme
    const form = theme.scene!.heroForms!.tier3!
    for (const name of Object.values(form.poses)) {
      const rows = theme.sprites[name]!.rows
      if (name === form.poses.lie) continue
      expect(rows.length + form.dy).toBe(16)
      expect(new Set(rows.map((r: string) => r.length))).toEqual(new Set([20]))
    }
  })
  test('currency is cents, <1 for a tiny amount', () => {
    expect(currency(2.6)).toBe('260')
    expect(currency(0.001)).toBe('<1')
    expect(currency(0)).toBe('0')
  })
  test('overkill: heavy firepower on routine work only', () => {
    const reads = Array.from({ length: 12 }, () => ({ key: 'Read:{}', isError: false }))
    expect(isRoutine(reads)).toBe(true)
    expect(isOverkill('tier3', 'low', true)).toBe(true)
    expect(isOverkill('tier1', 'medium', true)).toBe(false)
    expect(isRoutine([...reads.slice(0, 11), { key: 'Read:{}', isError: true }])).toBe(false)
    const edits = Array.from({ length: 12 }, () => ({ key: 'Edit:{}', isError: false }))
    expect(isRoutine(edits)).toBe(false)
  })
})
