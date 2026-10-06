import { describe, expect, test } from 'claude-code/testing'

import { resolveTheme, spritesUsed, THEMES, themeId } from '../hooks/themes'
import { oneOf } from '../hooks/themes/kit'
import { hex, quarter, rotate } from '../hooks/themes/pixel'
import {
  aboutLines,
  activityFor,
  animationsOf,
  barLayout,
  BAR_ROWS,
  counterText,
  duration,
  evenRows,
  frameAt,
  fill,
  barValue,
  hearts,
  inPercent,
  liftStraddles,
  logLines,
  loopAt,
  PANE_WIDTHS,
  WIDTH_GUIDE,
  meterFill,
  meterFraction,
  meterLines,
  milestoneMessage,
  liveLog,
  LOG_MAX,
  LOG_ROWS,
  pickVariant,
  previewVars,
  pushLog,
  questLayout,
  HERO_TIERS,
  heroTier,
  lineupLayout,
  renderLineup,
  sceneClips,
  sceneDesignRows,
  sceneMaxRows,
  sceneMinRows,
  sceneStart,
  stepScene,
  takes,
  WEAPON_TIERS,
  isOverkill,
  isRoutine,
  renderBar,
  renderScene,
  currency,
  weaponTier,
} from '../hooks/themes/scene'
import type { BarState, MeterData, SceneState } from '../hooks/themes/scene'
import { TEXT_COLORS } from '../hooks/themes/types'
import type { Actor, BarWidget, Frame, HeroForm, SceneText, Theme } from '../hooks/themes/types'

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
      on('store.get', () => ({ value: undefined }))
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
  // A /clear gives the session fresh state and fires no session.start: the
  // view as these tests start it (defaults, nothing restored).
  test('a view change in fresh state keeps the remembered theme', async ($, on) => {
    const store: Record<string, unknown> = { view: { band: 'full', pane: false, theme: 'zelda' } }
    on('session.surfaces', () => ({ value: [] }))
    on('store.get', (_$, e) => ({ value: store[e.key] }))
    on('store.set', (_$, e) => {
      store[e.key] = e.value
      return { value: undefined }
    })
    on('ui.toast', () => ({ value: undefined }))
    await $.command.run({ command: 'hud', args: 'autopilot off', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    expect(store.view).toMatchObject({ autopilot: false, theme: 'zelda' })
  })
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

/** Bar states that stretch the counters: a fresh session, a long one, nothing known yet. */
const BAR_CASES: BarState[] = [
  { tick: 0, percent: 14, spend: 260, hero: 'tier2', weapon: 'medium', cacheSeconds: 248, cacheFrac: 0.4, nextWarmUsd: 0.03, limitMax: 40 },
  { tick: 0, percent: 92.5, spend: 9999, hero: 'tier4', weapon: 'max', cacheSeconds: 3600, cacheFrac: 1, nextWarmUsd: 1.5, limitMax: 100 },
  { tick: 0, percent: 0, spend: 0, hero: 'unknown', weapon: 'xhigh', cacheSeconds: null, cacheFrac: null, nextWarmUsd: null, limitMax: null },
]

/** Every frame of every animation and take of a theme, for one hero: the scene state at the frame's first tick. */
function everyFrame(theme: Theme, hero: SceneState['hero'], weapon: SceneState['weapon'], each: (s: SceneState, where: string) => void) {
  for (const { key, anim, state, event } of animationsOf(theme)) {
    takes(anim).forEach((frames, variant) => {
      let t = 0
      frames.forEach((f, k) => {
        const playing = event ? { name: event, startTick: 0, vars: { pct: '50', level: 'alert', name: 'X', weapon: 'Y' }, variant } : null
        each({ ...base, ...state, hero, weapon, tick: t, since: 0, event: playing }, `${key}#${variant} f${k} ${hero}`)
        t += Math.max(1, f.hold ?? 1)
      })
    })
  }
}

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
      for (const hero of HERO_TIERS) {
        for (const weapon of WEAPON_TIERS) {
          everyFrame(theme, hero, weapon, s => expect(renderScene(theme, s, 64)?.rows).toBe(rows))
          expect(renderBar(theme, { tick: 0, percent: 40, spend: 260, hero, weapon, cacheSeconds: 100, cacheFrac: 0.5, nextWarmUsd: 0.03, limitMax: 50 }, 72)?.columns ?? 72).toBe(72)
        }
      }
    })
    test('renders taller than designed, up to half as much again', () => {
      expect(sceneMaxRows(theme)).toBe(Math.ceil(sceneDesignRows(theme) * 1.5))
      for (const rows of [sceneDesignRows(theme) + 1, sceneMaxRows(theme)]) expect(renderScene(theme, base, 48, rows)?.rows).toBe(rows)
      expect(renderScene(theme, base, 48, 3)?.rows).toBe(sceneDesignRows(theme))
    })
    test('the bar fits narrow and wide panes, in one row or two', () => {
      for (const cols of [44, 48, 58, 72, 96]) {
        for (const b of BAR_CASES) {
          const two = renderBar(theme, b, cols)
          const one = renderBar(theme, b, cols, 1)
          if (!two || !one) continue
          expect([two.columns, one.columns, one.rows]).toEqual([cols, cols, BAR_ROWS])
          expect(two.rows === BAR_ROWS || two.rows === 2 * BAR_ROWS).toBe(true)
          expect(one.wanted).toBe(two.rows / BAR_ROWS)
        }
      }
    })
    test('the bar at each laid-out width: two rows at most, one from 80, the map too at 96', () => {
      const all = spec.bar?.widgets ?? []
      const essentials = all.filter(w => w.kind !== 'map')
      const missing = (shown: BarWidget[], list: BarWidget[]) => list.filter(w => !shown.includes(w)).map(w => `${w.kind}:${'label' in w ? w.label : ''}`)
      for (const b of BAR_CASES) {
        for (const columns of PANE_WIDTHS) {
          const rows = barLayout(theme, b, columns)
          expect(`${columns}:${missing(rows.flat(), columns === 96 ? all : essentials)}`).toBe(`${columns}:`)
          if (columns >= 80) expect(`${columns}:${rows.length}`).toBe(`${columns}:1`)
        }
      }
    })
    test('nothing is drawn outside the scene at any laid-out width', { timeoutMs: 30_000 }, () => {
      const found: string[] = []
      // As designed, and at the tallest the scene grows.
      for (const rows of [undefined, sceneMaxRows(theme)]) {
        for (const columns of PANE_WIDTHS) {
          for (const hero of HERO_TIERS) {
            everyFrame(theme, hero, hero === 'tier4' ? 'max' : 'high', (s, where) => {
              for (const c of sceneClips(theme, s, columns, rows)) found.push(`${where}@${columns}x${rows ?? 'design'} ${c.what} ${JSON.stringify(c)}`)
            })
          }
        }
      }
      expect(found).toEqual([])
    })
    test('no prop jumps under a taller form', () => {
      expect(liftStraddles(theme)).toEqual([])
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
  const idle = sceneStart()
  const o = { maxAge: 30, maxDwell: 15 }
  const success = { name: 'toolSuccess' as const, at: 1, vars: {} }
  test('a queued moment plays, ends after its duration, and the next starts', () => {
    const vars = {}
    let p = stepScene(theme, { ...idle, tick: 1, queue: [{ name: 'toolSuccess', at: 0, vars }, { name: 'turnComplete', at: 0, vars }] }, o)
    expect(p.playing?.name).toBe('toolSuccess')
    expect(p.queue.length).toBe(1)
    const end = 1 + duration(theme.events.toolSuccess)
    p = stepScene(theme, { ...p, tick: end - 1 }, o)
    expect(p.playing?.name).toBe('toolSuccess')
    p = stepScene(theme, { ...p, tick: end }, o)
    expect(p.playing?.name).toBe('turnComplete')
    expect(p.playing?.startTick).toBe(end)
  })
  test('stale moments are dropped', () => {
    const p = stepScene(theme, { ...idle, tick: 100, queue: [{ name: 'toolError', at: 10, vars: {} }] }, o)
    expect([p.playing, p.queue]).toEqual([null, []])
  })
  test('a preview walks its states, then its events, then rests', () => {
    let p = stepScene(theme, { ...idle, tick: 1, preview: [{ kind: 'state', name: 'shell', ticks: 2 }, { kind: 'event', name: 'milestone', ticks: 1 }] }, o)
    expect([p.activity, p.since, p.preview[0]?.ticks]).toEqual(['shell', 1, 1])
    p = stepScene(theme, { ...p, tick: 2 }, o)
    expect(p.preview.map(s => s.name)).toEqual(['milestone'])
    p = stepScene(theme, { ...p, tick: 3 }, o)
    expect([p.activity, p.playing, p.preview]).toEqual(['idle', null, []])
    const shown = stepScene(theme, { ...idle, tick: 1, preview: [{ kind: 'event', name: 'milestone', ticks: 5 }] }, o)
    expect(fill(theme, 'milestone', shown.playing!.vars)).toContain('DANGEROUS')
  })
  test('a previewed moment speaks for itself: a limit names a limit, a new hero the hero', () => {
    expect(previewVars(theme, 'limitWarning')).toEqual({ name: '5H', pct: '80' })
    expect(fill(theme, 'limitWarning', previewVars(theme, 'limitWarning'))).toBe('THE SANDS RUN LOW. 5H AT 80%.')
    expect(previewVars(theme, 'modelChange').name).toBe(theme.scene!.heroNames.tier3)
    expect(previewVars(theme, 'effortChange').weapon).toBe(theme.scene!.weapons.high.name)
    const p = stepScene(theme, { ...idle, tick: 1, preview: [{ kind: 'event', name: 'toolSuccess', ticks: 3, variant: 2 }] }, o)
    expect(p.playing?.variant).toBe(2)
  })
  test("a tool's loop plays one full cycle before its result, however fast the tool returned", () => {
    const cycle = duration(theme.states.reading)
    // The read began and ended between two frames: its loop starts now, its result waits.
    let p = stepScene(theme, { ...idle, tick: 1, live: 'thinking', started: 'reading', queue: [success] }, o)
    expect([p.activity, p.since, p.playing, p.started, p.queue.length]).toEqual(['reading', 1, null, null, 1])
    p = stepScene(theme, { ...p, tick: cycle }, o)
    expect([p.activity, p.playing]).toEqual(['reading', null])
    p = stepScene(theme, { ...p, tick: 1 + cycle }, o)
    expect([p.activity, p.since, p.playing?.name]).toEqual(['thinking', 1 + cycle, 'toolSuccess'])
  })
  test('the dwell is capped, and a tool still running keeps its loop', () => {
    let p = stepScene(theme, { ...idle, tick: 1, live: 'thinking', started: 'shell', queue: [success] }, { ...o, maxDwell: 3 })
    p = stepScene(theme, { ...p, tick: 3 }, { ...o, maxDwell: 3 })
    expect(p.playing).toBe(null)
    p = stepScene(theme, { ...p, tick: 4 }, { ...o, maxDwell: 3 })
    expect(p.playing?.name).toBe('toolSuccess')
    let q = stepScene(theme, { ...idle, tick: 1, live: 'shell', started: 'shell' }, o)
    q = stepScene(theme, { ...q, tick: 200 }, o)
    expect([q.activity, q.since]).toEqual(['shell', 1])
  })
  test('in a burst the latest tool kind wins; the same kind again carries on', () => {
    let p = stepScene(theme, { ...idle, tick: 1, live: 'reading', started: 'reading' }, o)
    p = stepScene(theme, { ...p, tick: 3, started: 'reading' }, o)
    expect([p.activity, p.since]).toEqual(['reading', 1])
    p = stepScene(theme, { ...p, tick: 4, live: 'editing', started: 'editing' }, o)
    expect([p.activity, p.since, p.dwellUntil]).toEqual(['editing', 4, 4 + duration(theme.states.editing)])
  })
  test('a loop started while a moment plays begins when the moment ends', () => {
    let p = stepScene(theme, { ...idle, tick: 1, queue: [{ ...success, at: 0 }] }, o)
    p = stepScene(theme, { ...p, tick: 2, live: 'thinking', started: 'editing', queue: [{ ...success, at: 2 }] }, o)
    expect([p.playing?.name, p.pending]).toEqual(['toolSuccess', true])
    const end = 1 + duration(theme.events.toolSuccess)
    p = stepScene(theme, { ...p, tick: end }, o)
    expect([p.activity, p.since, p.playing, p.pending]).toEqual(['editing', end, null, false])
    p = stepScene(theme, { ...p, tick: end + duration(theme.states.editing) }, o)
    expect([p.activity, p.playing?.name]).toEqual(['thinking', 'toolSuccess'])
  })
})

describe('variants', () => {
  const zelda = resolveTheme('zelda').theme
  const take = (n: number): Frame[] => Array.from({ length: n }, () => ({ actors: [] }))
  test('a pick is steady for its seed, covers every take, and never repeats the last', () => {
    expect(pickVariant(1, 5)).toBe(0)
    const seen = new Set<number>()
    let last: number | undefined
    for (let seed = 0; seed < 200; seed++) {
      const v = pickVariant(3, seed, last)
      expect(v).toBe(pickVariant(3, seed, last))
      expect(v === last).toBe(false)
      seen.add(v)
      last = v
    }
    expect([...seen].sort()).toEqual([0, 1, 2])
  })
  test('a moment with takes plays a different one each time', () => {
    const theme = { ...zelda, events: { ...zelda.events, toolSuccess: oneOf({ frames: take(2), loop: false }, { frames: take(3), loop: false }, { frames: take(4), loop: false }) } }
    expect(takes(theme.events.toolSuccess).map(f => f.length)).toEqual([2, 3, 4])
    let p = sceneStart()
    const played: number[] = []
    for (let tick = 1; tick < 80; tick++) {
      const before = p.playing
      p = stepScene(theme, { ...p, tick, queue: p.playing || p.queue.length ? p.queue : [{ name: 'toolSuccess', at: tick, vars: {} }] }, { maxAge: 30, maxDwell: 15 })
      if (p.playing && p.playing !== before) {
        played.push(p.playing.variant!)
        // Each take lasts its own length.
        expect(duration(theme.events.toolSuccess, p.playing.variant)).toBe(p.playing.variant! + 2)
      }
    }
    expect(played.length).toBeGreaterThan(10)
    played.forEach((v, k) => expect(k > 0 && v === played[k - 1]).toBe(false))
  })
  test('a loop with takes changes take each time round', () => {
    const anim = oneOf({ frames: take(2), loop: true }, { frames: take(3), loop: true }, { frames: take(5), loop: true })
    const starts: number[] = []
    for (let t = 0; t < 300; t++) {
      const at = loopAt(anim, 7, t)
      if (at.t === 0) starts.push(at.variant)
      expect(at.t < duration(anim, at.variant)).toBe(true)
    }
    expect(starts.length).toBeGreaterThan(50)
    starts.forEach((v, k) => expect(k > 0 && v === starts[k - 1]).toBe(false))
    expect(loopAt({ frames: take(4), loop: true }, 3, 9)).toEqual({ variant: 0, t: 9 })
  })
})

/**
 * A bare scene: a 4x4 hero, an 8x8 form for tier3 (lift 4, hand 3 right), and
 * 1x2 red props, so a red cell marks where a prop landed.
 */
function probeTheme(
  actors: Actor[],
  decor: NonNullable<Theme['scene']>['background']['decor'] = [],
  more: { form?: Partial<HeroForm>; texts?: SceneText[]; widgets?: BarWidget[]; frames?: Frame[] } = {},
): Theme {
  const t = resolveTheme('default').theme
  const poses = { stand: 'h', walk: 'h', attack: 'h', itemGet: 'h', sleep: 'h' }
  const tiers = { tier1: {}, tier2: {}, tier3: {}, tier4: {}, unknown: {} }
  const w = { sprite: 'dot', swap: {}, name: 'dot', poses: { level: { sprite: 'wide' } } }
  return {
    ...t,
    pixels: { R: '#ff0000', B: '#0000ff', K: '#000000' },
    sprites: { h: { rows: Array(4).fill('BBBB') }, big: { rows: Array(8).fill('BBBBBBBB') }, dot: { rows: ['R', 'R'] }, wide: { rows: ['RRRR'] } },
    states: { ...t.states, idle: { frames: [{ actors: [{ sprite: '@stand', x: 0, y: 0 }, ...actors], texts: more.texts }, ...(more.frames ?? [])], loop: true } },
    scene: {
      height: 40,
      anchor: { x: 10, y: 20 },
      background: { ground: 'K', decor },
      hero: poses,
      heroTiers: tiers,
      heroNames: { tier1: 'a', tier2: 'b', tier3: 'c', tier4: 'd', unknown: 'e' },
      weapons: { low: w, medium: w, high: w, xhigh: w, max: w },
      heroForms: { tier3: { poses: { ...poses, stand: 'big', walk: 'big', attack: 'big', itemGet: 'big', sleep: 'big' }, dx: -2, dy: -4, lift: 4, hand: { x: 3, y: 0 }, ...more.form } },
      ...(more.widgets ? { bar: { widgets: more.widgets, colors: { bg: 'K', box: 'B', text: '#ffffff', label: 'R', map: 'B', mapDot: 'R' } } } : {}),
    },
  }
}

/** Whether the cell at column x holding pixel row y is red; `rows`: a scene taller than designed. */
function redAt(theme: Theme, x: number, y: number, columns = 64, rows?: number, s: Partial<SceneState> = {}): boolean {
  const cells = cellsOf(renderScene(theme, { ...base, ...s }, columns, rows)!)
  return cells[(Math.floor(y / 2) * columns + x) * 3 + 1] === 0xff0000
}

/** The character written at a cell of a Raster, or '' for a pixel cell. */
function charAt(r: { cells: string; columns: number }, col: number, row: number): string {
  const ch = cellsOf(r)[(row * r.columns + col) * 3]!
  return ch === UPPER_HALF || ch === 0x2584 || ch === 0x20 ? '' : String.fromCodePoint(ch)
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
  test('meters fill by context, cache, effort, limit headroom and the limit itself', () => {
    const b = { tick: 0, percent: 25, spend: 0, hero: 'tier3' as const, weapon: 'high' as const, cacheSeconds: null, cacheFrac: 0.5, limitMax: 80 }
    expect(meterFraction('contextLeft', b)).toBe(0.75)
    expect(meterFraction('cache', b)).toBe(0.5)
    expect(meterFraction('effort', b)).toBe(0.6)
    expect(meterFraction('limitsLeft', b)).toBe(0.2)
    expect(meterFraction('limitsLeft', { ...b, limitMax: null })).toBe(1)
    // A boss bar: fills as the limit is used, empty while none is reported.
    expect(meterFraction('limitsUsed', b)).toBe(0.8)
    expect(meterFraction('limitsUsed', { ...b, limitMax: null })).toBe(0)
    for (const id of ['megaman', 'castlevania']) {
      const meters = (resolveTheme(id).theme.scene!.bar?.widgets ?? []).flatMap(w => (w.kind === 'meter' ? [w.value] : []))
      expect(`${id}:${meters.includes('limitsUsed')}:${meters.includes('limitsLeft')}`).toBe(`${id}:true:false`)
    }
  })
  test('a taller scene is headroom: the floor, the hero and ground scenery move down, the sky stays', () => {
    const theme = probeTheme([{ sprite: 'dot', x: 6, y: 0 }], [{ sprite: 'dot', x: 0, y: 10 }, { sprite: 'dot', x: 2, y: 10, sky: true }])
    expect([redAt(theme, 16, 20), redAt(theme, 0, 10), redAt(theme, 2, 10)]).toEqual([true, true, true])
    // Five rows more: ten pixels of headroom.
    expect([redAt(theme, 16, 30, 64, 25), redAt(theme, 16, 20, 64, 25)]).toEqual([true, false])
    expect([redAt(theme, 0, 20, 64, 25), redAt(theme, 0, 10, 64, 25), redAt(theme, 2, 10, 64, 25)]).toEqual([true, false, true])
  })
  test('texts lift with a taller form only when they ask', () => {
    const star = (lift: boolean): SceneText => ({ text: '*', x: 0, y: -4, color: '#ffffff', lift })
    expect(charAt(renderScene(probeTheme([], [], { texts: [star(false)] }), base, 64)!, 10, 8)).toBe('*')
    expect(charAt(renderScene(probeTheme([], [], { texts: [star(true)] }), base, 64)!, 10, 6)).toBe('*')
    expect(charAt(renderScene(probeTheme([], [], { texts: [star(true)] }), { ...base, hero: 'tier1' }, 64)!, 10, 8)).toBe('*')
  })
  test("a weapon held aloft moves to the form's raised hand, mirrored when flipped", () => {
    const form = { aloft: { x: 2, y: -2 } }
    expect(redAt(probeTheme([{ sprite: '@weapon', x: 6, y: -4 }], [], { form }), 18, 10)).toBe(true)
    expect(redAt(probeTheme([{ sprite: '@weapon', x: 6, y: -4, flip: true }], [], { form }), 14, 10)).toBe(true)
    // Scenery stays where the pack put it.
    expect(redAt(probeTheme([{ sprite: '@weapon', x: 6, y: -4, fixed: true }], [], { form }), 16, 16)).toBe(true)
  })
  test("a quarter turn lays a sprite level; a pose picks the weapon's other sprite", () => {
    expect(quarter({ rows: ['AB', 'CD', 'EF'] }, 'cw').rows).toEqual(['ECA', 'FDB'])
    expect(quarter({ rows: ['AB', 'CD', 'EF'] }, 'ccw').rows).toEqual(['BDF', 'ACE'])
    const tier1 = { hero: 'tier1' as const }
    expect(redAt(probeTheme([{ sprite: 'dot', x: 6, y: 0 }]), 17, 20, 64, undefined, tier1)).toBe(false)
    expect(redAt(probeTheme([{ sprite: 'dot', x: 6, y: 0, turn: 'cw' }]), 17, 20, 64, undefined, tier1)).toBe(true)
    expect(redAt(probeTheme([{ sprite: '@weapon', x: 6, y: 0 }]), 19, 20, 64, undefined, tier1)).toBe(false)
    expect(redAt(probeTheme([{ sprite: '@weapon', x: 6, y: 0, pose: 'level' }]), 19, 20, 64, undefined, tier1)).toBe(true)
    // A pose the weapon lacks draws the weapon as it is.
    expect(redAt(probeTheme([{ sprite: '@weapon', x: 6, y: 0, pose: 'nope' }]), 16, 20, 64, undefined, tier1)).toBe(true)
  })
  test('the bounds check names what leaves the scene, by side, unless it is meant to', () => {
    const clips = (actors: Actor[], texts: SceneText[] = [], columns = 64) => sceneClips(probeTheme(actors, [], { texts }), base, columns)
    expect(clips([{ sprite: 'dot', x: 6, y: 0 }])).toEqual([])
    expect(clips([{ sprite: 'dot', x: -12, y: 0 }])).toEqual([{ what: 'dot', left: 2, right: 0, top: 0, bottom: 0 }])
    expect(clips([{ sprite: 'dot', x: -12, y: 0, offstage: true }])).toEqual([])
    expect(clips([{ sprite: 'wide', x: 28, y: 19 }], [], 40)).toEqual([{ what: 'wide', left: 0, right: 2, top: 0, bottom: 0 }])
    // The lift counts: over a taller form this prop leaves the top.
    expect(clips([{ sprite: 'dot', x: 6, y: -18 }])).toEqual([{ what: 'dot', left: 0, right: 0, top: 2, bottom: 0 }])
    expect(sceneClips(probeTheme([{ sprite: 'dot', x: 6, y: -18 }]), base, 64, 25)).toEqual([])
    expect(clips([{ sprite: 'dot', x: 6, y: 20 }])[0]).toMatchObject({ bottom: 2 })
    expect(clips([], [{ text: 'hi', x: -11, y: 0, color: '#ffffff' }])[0]).toMatchObject({ what: 'text "hi"', left: 1 })
  })
  test('a prop that crosses the head line between frames is flagged unless it is fixed', () => {
    const next = (fixed: boolean): Frame[] => [{ actors: [{ sprite: 'dot', x: 6, y: 2, fixed }] }]
    expect(liftStraddles(probeTheme([{ sprite: 'dot', x: 6, y: -4 }], [], { frames: next(false) }))).toEqual(['states.idle f0>f1 dot y -4>2', 'states.idle f1>f0 dot y 2>-4'])
    expect(liftStraddles(probeTheme([{ sprite: 'dot', x: 6, y: -4, fixed: true }], [], { frames: next(true) }))).toEqual([])
    expect(liftStraddles(probeTheme([{ sprite: 'dot', x: 6, y: -4 }], [], { frames: [{ actors: [{ sprite: 'dot', x: 6, y: -6 }] }] }))).toEqual([])
  })
  test('percent ranges are half-open, 100 included: neighbours never both show', () => {
    expect([inPercent(24.9, 0, 25), inPercent(25, 0, 25), inPercent(25, 25, 50)]).toEqual([true, false, true])
    expect([inPercent(100, 75, 100), inPercent(100, 75), inPercent(0)]).toEqual([true, true, true])
    const theme = probeTheme([], [{ sprite: 'dot', x: 0, y: 0, maxPercent: 25 }, { sprite: 'dot', x: 2, y: 0, minPercent: 25 }])
    expect([redAt(theme, 0, 0, 64, undefined, { percent: 25 }), redAt(theme, 2, 0, 64, undefined, { percent: 25 })]).toEqual([false, true])
    // Actors take the same ranges (a sky above ground, plain dark below).
    const acted = probeTheme([{ sprite: 'dot', x: 6, y: 0, maxPercent: 25 }, { sprite: 'dot', x: 8, y: 0, minPercent: 25 }])
    const small = { hero: 'tier1' as const }
    expect([redAt(acted, 16, 20, 64, undefined, { ...small, percent: 10 }), redAt(acted, 18, 20, 64, undefined, { ...small, percent: 10 })]).toEqual([true, false])
    expect([redAt(acted, 16, 20, 64, undefined, { ...small, percent: 25 }), redAt(acted, 18, 20, 64, undefined, { ...small, percent: 25 })]).toEqual([false, true])
  })
  test("a pack's own pose draws its sprite; a hero or form without it stands", () => {
    const theme = probeTheme([{ sprite: '@lunge', x: 10, y: 1 }])
    theme.scene!.hero = { ...theme.scene!.hero, lunge: 'wide' }
    // 'wide' is one row: it rests on the standing sprite's feet (its fourth row).
    expect(redAt(theme, 20, 24, 64, undefined, { hero: 'tier1' })).toBe(true)
    expect(redAt(probeTheme([{ sprite: '@lunge', x: 10, y: 1 }]), 20, 24, 64, undefined, { hero: 'tier1' })).toBe(false)
    // The big form has no such pose: it stands (blue), nothing red.
    expect(redAt(theme, 20, 24)).toBe(false)
    expect(spritesUsed(theme).has('wide')).toBe(true)
  })
  test("decor that houses the ring goes with it under a message; lit decor is not shaded", () => {
    const housed = probeTheme([], [{ sprite: 'dot', x: 0, y: 0, ring: true }], { frames: [{ actors: [], message: 'hi' }] })
    expect([redAt(housed, 0, 0, 64, undefined, { tick: 0 }), redAt(housed, 0, 0, 64, undefined, { tick: 1 })]).toEqual([true, false])
    const dark = probeTheme([], [{ sprite: 'dot', x: 0, y: 0 }, { sprite: 'dot', x: 2, y: 0, lit: true }])
    dark.scene!.background.shade = { color: 'K', amount: 1 }
    expect([redAt(dark, 0, 0, 64, undefined, { percent: 100 }), redAt(dark, 2, 0, 64, undefined, { percent: 100 })]).toEqual([false, true])
  })
  test('a backdrop actor is drawn under the cache ring and may fill the scene', () => {
    const ringed = (backdrop: boolean) => {
      const theme = probeTheme([{ sprite: 'wide', x: -8, y: -20, backdrop }])
      theme.scene!.stamina = { x: 0, y: 0, radius: 3, full: 'B', empty: 'B', cold: 'B', tagIcon: 'dot' }
      return theme
    }
    const small = { hero: 'tier1' as const, stamina: 0.5 }
    // The ring's top pixel is (3, 0); the actor covers columns 2..5 of that row.
    expect(redAt(ringed(false), 3, 0, 64, undefined, small)).toBe(true)
    expect(redAt(ringed(true), 3, 0, 64, undefined, small)).toBe(false)
    expect(redAt(ringed(true), 5, 0, 64, undefined, small)).toBe(true)
    expect(sceneClips(probeTheme([{ sprite: 'wide', x: -12, y: 0, backdrop: true }]), base, 64)).toEqual([])
  })
})

describe('status bar', () => {
  const zelda = resolveTheme('zelda').theme
  const b: BarState = { tick: 0, percent: 40, spend: 260, hero: 'tier3', weapon: 'high' }
  const kinds = (rows: BarWidget[][]) => rows.map(r => r.map(w => (w.kind === 'box' ? w.label : w.kind)).join(' '))
  test('one row when it fits; two when it does not, the map where there is room', () => {
    expect(kinds(barLayout(zelda, b, 96))).toEqual(['map counter B A meter'])
    expect(kinds(barLayout(zelda, b, 48))).toEqual(['counter B A map', 'meter'])
    expect([renderBar(zelda, b, 96)!.rows, renderBar(zelda, b, 48)!.rows]).toEqual([BAR_ROWS, 2 * BAR_ROWS])
  })
  test('the map goes before a second row is taken for it, and before anything else', () => {
    const widgets: BarWidget[] = [{ kind: 'map', drop: 1 }, { kind: 'box', shows: 'model', sprite: 'h', label: 'A', drop: 9 }, { kind: 'box', shows: 'effort', sprite: 'dot', label: 'B' }]
    const theme = probeTheme([], [], { widgets })
    expect(kinds(barLayout(theme, b, 38))).toEqual(['map A B'])
    expect(kinds(barLayout(theme, b, 30))).toEqual(['A B'])
    expect(kinds(barLayout(theme, b, 12))).toEqual(['A', 'B'])
    // A short pane allows one row: then the highest `drop` goes.
    expect(kinds(barLayout(theme, b, 12, 1))).toEqual(['B'])
    expect(renderBar(theme, b, 12, 1)).toMatchObject({ rows: BAR_ROWS, wanted: 2 })
  })
  test('a theme can say where the second row starts', () => {
    const box = (label: string, wrap = false): BarWidget => ({ kind: 'box', shows: 'model', sprite: 'h', label, wrap })
    expect(kinds(barLayout(probeTheme([], [], { widgets: [box('A'), box('B'), box('C'), box('D')] }), b, 30))).toEqual(['A B', 'C D'])
    expect(kinds(barLayout(probeTheme([], [], { widgets: [box('A'), box('B'), box('C'), box('D', true)] }), b, 30))).toEqual(['A B C', 'D'])
    // Asked for, but the first row would not fit: the even split.
    expect(kinds(barLayout(probeTheme([], [], { widgets: [box('A'), box('B'), box('C'), box('D', true)] }), b, 20))).toEqual(['A B', 'C D'])
  })
  test('a value not yet known shows as dashes, without the format; a counter keeps its width', () => {
    const tide: Extract<BarWidget, { kind: 'counter' }> = { kind: 'counter', value: 'limitMax', format: '{v}%' }
    expect([counterText(tide, { ...b, limitMax: null }), counterText(tide, { ...b, limitMax: 80 })]).toEqual(['--', '80%'])
    expect(counterText({ kind: 'counter', value: 'cache', format: '{v}%' }, { ...b, cacheFrac: null })).toBe('-')
    const after: BarWidget = { kind: 'box', shows: 'model', sprite: 'h', label: 'Z' }
    const at = (spend: number, chars?: number) => {
      const r = renderBar(probeTheme([], [], { widgets: [{ kind: 'counter', value: 'spend', chars }, after] }), { ...b, spend }, 40)!
      return Array.from({ length: 40 }, (_, col) => charAt(r, col, 0)).indexOf('Z')
    }
    expect(at(5) === at(5000)).toBe(false)
    expect(at(5, 4)).toBe(at(5000, 4))
  })
  test('a box label sits centered over its box, in the label color', () => {
    const r = renderBar(probeTheme([], [], { widgets: [{ kind: 'box', shows: 'model', sprite: 'h', label: 'ARM' }] }), b, 40)!
    expect([3, 4, 5].map(col => charAt(r, col, 0)).join('')).toBe('ARM')
    expect(cellsOf(r)[3 * 3 + 1]).toBe(0xff0000)
  })
  test('a meter blinks when nearly full if it asks', () => {
    const meter = (pulseAbove?: number): BarWidget[] => [{ kind: 'meter', value: 'limitsUsed', count: 4, perRow: 4, sprites: ['h', 'dot'], pulseAbove }]
    const cells = (widgets: BarWidget[], tick: number) => renderBar(probeTheme([], [], { widgets }), { ...b, limitMax: 95, tick }, 40)!.cells
    expect(cells(meter(0.9), 0) === cells(meter(0.9), 1)).toBe(false)
    expect(cells(meter(), 0)).toBe(cells(meter(), 1))
  })
})

describe('quest tab rows', () => {
  const zelda = resolveTheme('zelda').theme
  const design = sceneDesignRows(zelda)
  const max = sceneMaxRows(zelda)
  const room = (rows: number, barWanted = 1) => questLayout(zelda, { rows, tabRows: 2, meterRows: 11, barWanted })
  test('the words keep their rows; the scene takes the rest up to half again; past that the log grows', () => {
    const words = 2 + 11 + LOG_ROWS
    expect(room(words + BAR_ROWS + design)).toEqual({ scene: design, bar: 1, log: LOG_ROWS })
    expect(room(words + BAR_ROWS + design + 4)).toEqual({ scene: design + 4, bar: 1, log: LOG_ROWS })
    expect(room(words + BAR_ROWS + max + 6)).toEqual({ scene: max, bar: 1, log: LOG_ROWS + 6 })
    // Every row is used: the words end on the pane's last row.
    for (let rows = words + BAR_ROWS + design; rows < 120; rows++) {
      for (const wanted of [1, 2]) {
        const l = room(rows, wanted)
        expect(2 + l.bar * BAR_ROWS + l.scene + l.log + 11).toBe(rows)
      }
    }
  })
  test('the second bar row comes before extra scene height, and only when the words fit too', () => {
    const words = 2 + 11 + LOG_ROWS
    expect(room(words + 2 * BAR_ROWS + design, 2)).toEqual({ scene: design, bar: 2, log: LOG_ROWS })
    expect(room(words + 2 * BAR_ROWS + design - 1, 2)).toEqual({ scene: design + BAR_ROWS - 1, bar: 1, log: LOG_ROWS })
    expect(room(words + 2 * BAR_ROWS + design + 3, 2)).toEqual({ scene: design + 3, bar: 2, log: LOG_ROWS })
  })
  test('a short pane keeps the scene as designed down to its minimum, then hides it', () => {
    const min = sceneMinRows(zelda, 2)
    expect(room(min, 2)).toEqual({ scene: design, bar: 1, log: LOG_ROWS })
    expect(room(min - 1, 2)).toEqual({ scene: 0, bar: 1, log: LOG_ROWS })
  })
})

describe('meter rows', () => {
  const data: MeterData = {
    percent: 20,
    level: 'ok',
    tokens: 107_000,
    window: 1_000_000,
    spendUsd: 2.6,
    lastUsd: 0.4,
    cacheLeft: 1_800_000,
    nextWarmUsd: 0.03,
    nextColdUsd: 1.08,
    limits: [{ label: '5h', percent: 40, resets: null }],
    heroName: 'Hero',
    model: 'Opus',
    weaponName: 'Sword',
    effort: 'high',
  }
  const lines = (id: string, m: Partial<MeterData> = {}) => {
    const theme = resolveTheme(id).theme
    return meterLines(theme, theme.palette.dark, { ...data, ...m }, ms => `${Math.round(ms / 60000)}m`, n => `${Math.round(n / 1000)}k`)
  }
  for (const theme of PACKS) {
    test(`${theme.id}: one label column, a space before every value`, () => {
      const labelled = lines(theme.id).filter(l => l[0]?.bold && l.length > 1)
      expect(labelled.length).toBe(6)
      expect(new Set(labelled.map(l => l[0]!.text.length + l[1]!.text.length)).size).toBe(1)
      for (const l of labelled) expect(`${l[0]!.text}:${l[1]!.text.endsWith(' ')}`).toBe(`${l[0]!.text}:true`)
    })
  }
  test('the block keeps its height: warm or cold cache, a first turn or a later one', () => {
    const n = lines('zelda').length
    expect(lines('zelda', { cacheLeft: 0 }).length).toBe(n)
    expect(lines('zelda', { cacheLeft: null }).length).toBe(n)
    expect(lines('zelda', { lastUsd: null }).length).toBe(n)
  })
  test("the context row's color follows the user's levels", () => {
    const p = resolveTheme('zelda').theme.palette.dark
    const run = (level: MeterData['level']) => lines('zelda', { level })[0]![2]!
    expect([run('ok').color, run('warn').color, run('orange').color, run('alert').color]).toEqual([p.accent, p.gold, p.gold, p.red])
    expect(run('critical')).toMatchObject({ color: p.red, inverse: true })
  })
  test('the log keeps its rows while empty, newest on top; the fallback goes above', () => {
    const p = resolveTheme('zelda').theme.palette.dark
    const log = logLines(p, ['new', 'old'], 5, null)
    expect(log.map(l => l[0]?.text ?? '')).toEqual(['  new', '  old', '', '', ''])
    expect([log[0]![0]!.color, log[1]![0]!.color]).toEqual([p.gold, p.dim])
    expect(logLines(p, [], LOG_ROWS, 'The hero naps.').map(l => l[0]?.text ?? '')).toEqual(['  The hero naps.', '', '', ''])
  })
  test('About names the laid-out widths and the pane size under them, in the accent color at one of them', () => {
    const theme = resolveTheme('zelda').theme
    const p = theme.palette.dark
    const lines = (columns: number) => aboutLines(theme, p, { hero: 'tier3', weapon: 'high' }, { columns, rows: 79 })
    const found = (columns: number) => {
      const all = lines(columns)
      const k = all.findIndex(l => l[0]?.text === WIDTH_GUIDE)
      return { guide: all[k]?.[0], pane: all[k + 1]?.[0] }
    }
    expect(PANE_WIDTHS).toEqual([48, 58, 80, 96])
    expect(WIDTH_GUIDE).toBe('Themes are laid out for 48, 58, 80, and 96')
    expect(found(77)).toEqual({ guide: { text: WIDTH_GUIDE, color: p.dim }, pane: { text: 'Pane: 77 x 79', color: p.dim } })
    expect(found(58)).toEqual({ guide: { text: WIDTH_GUIDE, color: p.accent }, pane: { text: 'Pane: 58 x 79', color: p.accent } })
  })
  for (const theme of PACKS) {
    test(`${theme.id}: About wraps to the pane, nothing cut off`, () => {
      const words = (text: string) => text.split(/\s+/).filter(Boolean)
      for (const columns of [40, 48, 58, 80]) {
        const text = aboutLines(theme, theme.palette.dark, { hero: 'tier3', weapon: 'high' }, { columns, rows: 50 }).map(l => l.map(r => r.text).join(''))
        for (const line of text) expect(`${columns}:${line.length <= columns}:${line}`).toBe(`${columns}:true:${line}`)
        // Every word of the description and of each scene line is still there, in order.
        const all = words(text.join(' ')).join(' ')
        for (const said of [theme.description, ...Object.values(theme.text)]) expect(`${columns}:${all.includes(words(said).join(' '))}:${said}`).toBe(`${columns}:true:${said}`)
      }
    })
  }
  test('a log line longer than the pane wraps onto the next rows; older lines give way', () => {
    const p = resolveTheme('zelda').theme.palette.dark
    const long = "IT'S DANGEROUS TO GO ON. 50% OF YOUR HEARTS ARE SPENT."
    const log = logLines(p, [long, 'older', 'oldest'], 3, null, 48).map(l => l[0]?.text ?? '')
    expect(log).toEqual(["  IT'S DANGEROUS TO GO ON. 50% OF YOUR HEARTS", '  ARE SPENT.', '  older'])
    expect(logLines(p, [long], 3, 'The hero naps by the campfire, and the night is long.', 30).map(l => l[0]?.text ?? '').slice(0, 2)).toEqual(['  The hero naps by the', '  campfire, and the night is'])
  })
  test('lineup rows are even: four heroes as two and two, never three and one', () => {
    expect(evenRows(4, 22, 70)).toEqual({ perRow: 2, bands: 2 })
    expect(evenRows(4, 22, 96)).toEqual({ perRow: 4, bands: 1 })
    expect(evenRows(5, 12, 48)).toEqual({ perRow: 3, bands: 2 })
    expect(evenRows(4, 30, 20)).toEqual({ perRow: 1, bands: 4 })
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
    expect(liveLog(log, 8000)).toEqual(['f', 'e', 'd', 'c'])
    for (let k = 0; k < 20; k++) log = pushLog(log, `line ${k}`, 8000)
    expect(liveLog(log, 8000).length).toBe(LOG_MAX)
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
      if (!name || name === form.poses.lie) continue
      const rows = theme.sprites[name]!.rows
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
