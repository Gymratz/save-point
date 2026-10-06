// Draws a theme's scene and status bar from the session's live state. Pure: the
// hooks module supplies the state and blits what comes back.

import { LIMIT_LEVELS, modelKey, toolKind } from '../lib'
import type { Level, Run } from '../lib'
import { mix } from './kit'
import { Canvas, hex, inkBox, quarter, size } from './pixel'
import { ACTIVITY_STATES, EVENT_NAMES } from './types'
import type { ActivityState, Actor, Animation, BarValue, BarWidget, EventName, Frame, HeroPose, HeroTier, MeterValue, Sprite, TextPalette, Theme, WeaponTier } from './types'

// ---------------------------------------------------------------------------
// Identity and activity
// ---------------------------------------------------------------------------

/** The hero tier by model family, so future versions land on the right tier. */
export function heroTier(model: string | null): HeroTier {
  const key = modelKey(model ?? '')
  if (key.startsWith('haiku')) return 'tier1'
  if (key.startsWith('sonnet')) return 'tier2'
  if (key.startsWith('opus')) return 'tier3'
  if (key.startsWith('fable') || key.startsWith('mythos')) return 'tier4'
  return 'unknown'
}

export function weaponTier(effort: string | null): WeaponTier {
  switch (effort) {
    case 'low':
    case 'medium':
    case 'high':
    case 'xhigh':
    case 'max':
      return effort
    default:
      return 'medium'
  }
}

/** The activity a running tool puts the hero in (by `TOOL_KINDS`); unknown tools keep `thinking`. */
export function activityFor(tool: string): ActivityState {
  switch (toolKind(tool)) {
    case 'read':
      return 'reading'
    case 'write':
    case 'edit':
      return 'editing'
    case 'shell':
      return 'shell'
    case 'agents':
      return 'agents'
    default:
      return 'thinking'
  }
}

/**
 * Routine work: at least 10 recent calls, 80%+ of them reading or shell, none
 * failed. `keys` are Autopilot's call keys (`Tool:input`).
 */
export function isRoutine(calls: { key: string; isError: boolean }[]): boolean {
  const recent = calls.slice(-20)
  if (recent.length < 10 || recent.some(c => c.isError)) return false
  const routine = recent.filter(c => {
    const kind = toolKind(c.key.slice(0, c.key.indexOf(':')))
    return kind === 'read' || kind === 'shell'
  }).length
  return routine / recent.length >= 0.8
}

export function isOverkill(hero: HeroTier, weapon: WeaponTier, routine: boolean): boolean {
  const heavy = hero === 'tier3' || hero === 'tier4' || weapon === 'high' || weapon === 'xhigh' || weapon === 'max'
  return heavy && routine
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

function ticksOf(frames: Frame[]): number {
  return frames.reduce((n, f) => n + Math.max(1, f.hold ?? 1), 0)
}

/** An animation's takes: its frames, then each of its `variants`. */
export function takes(anim: Animation): Frame[][] {
  return anim.variants?.length ? [anim.frames, ...anim.variants] : [anim.frames]
}

/** Ticks one take of an animation lasts. */
export function duration(anim: Animation, variant = 0): number {
  return ticksOf(takes(anim)[variant] ?? anim.frames)
}

/** The frame `t` ticks into one take of an animation; a finished one-shot holds its last frame. */
export function frameAt(anim: Animation, t: number, variant = 0): Frame {
  const frames = takes(anim)[variant] ?? anim.frames
  const total = ticksOf(frames)
  let at = anim.loop ? ((t % total) + total) % total : Math.min(t, total - 1)
  for (const f of frames) {
    at -= Math.max(1, f.hold ?? 1)
    if (at < 0) return f
  }
  return frames[frames.length - 1] ?? { actors: [] }
}

/**
 * Which of `count` takes plays, from a seed (the tick it starts): steady for a
 * seed, spread evenly, and never `previous`.
 */
export function pickVariant(count: number, seed: number, previous?: number): number {
  if (count <= 1) return 0
  const r = noise(seed, 7)
  if (previous === undefined || previous < 0 || previous >= count) return Math.floor(r * count)
  const k = Math.floor(r * (count - 1))
  return k >= previous ? k + 1 : k
}

/**
 * Where a loop that began at tick `since` is `t` ticks later: the take and the
 * tick within it. A loop with variants picks a new take each time it comes round.
 */
export function loopAt(anim: Animation, since: number, t: number): { variant: number; t: number } {
  const all = takes(anim)
  if (all.length <= 1) return { variant: 0, t }
  let variant = pickVariant(all.length, since)
  let start = since
  let at = Math.max(0, t)
  for (;;) {
    const d = Math.max(1, ticksOf(all[variant]!))
    if (at < d) return { variant, t: at }
    at -= d
    start += d
    variant = pickVariant(all.length, start, variant)
  }
}

/** The loop a state shows: its overkill or cold-cache variant first. */
export function loopFor(theme: Theme, activity: ActivityState, overkill = false, cold = false): Animation {
  return (overkill ? theme.overkill[activity] : undefined) ?? (cold ? theme.cold?.[activity] : undefined) ?? theme.states[activity] ?? theme.states.idle
}

export type PlayingEvent = { name: EventName; startTick: number; vars: Record<string, string>; /** The take playing (default 0). */ variant?: number }

/** A moment waiting to play, queued at tick `at`. */
export type QueuedEvent = { name: EventName; at: number; vars: Record<string, string> }

/** One step of `/hud theme preview`: a state, or one take of an event, for `ticks` more ticks. */
export type PreviewStep = { kind: 'state' | 'event'; name: string; ticks: number; variant?: number; begun?: boolean }

/** What the scene is doing between frames. */
export type SceneProgress = {
  /** The tick being drawn. */
  tick: number
  /** The loop on screen and the tick it began. */
  activity: ActivityState
  since: number
  /** What the session is doing now; the scene follows it once a dwell is over. */
  live: ActivityState
  /** A tool loop that began since the last step (the latest wins); taken by the step. */
  started: ActivityState | null
  /** A started loop waiting for the moment on screen to end. */
  pending: boolean
  /** The loop on screen stays, and no moment starts, before this tick. */
  dwellUntil: number
  playing: PlayingEvent | null
  queue: QueuedEvent[]
  preview: PreviewStep[]
  /** The take each moment played last, so the next one differs. */
  picks: Partial<Record<EventName, number>>
}

export function sceneStart(): SceneProgress {
  return { tick: 0, activity: 'idle', since: 0, live: 'idle', started: null, pending: false, dwellUntil: 0, playing: null, queue: [], preview: [], picks: {} }
}

export type StepOptions = {
  /** Queued moments older than this many ticks are dropped. */
  maxAge: number
  /** The longest a started loop holds the scene, in ticks. */
  maxDwell: number
  /** Which loop a state shows (see `loopFor`), for the length of its cycle. */
  overkill?: boolean
  cold?: boolean
}

/** What a previewed moment says: a milestone at 50%, a limit at 80%, the Opus hero, the high weapon. */
export function previewVars(theme: Theme, name: EventName): Record<string, string> {
  const spec = theme.scene
  switch (name) {
    case 'milestone':
      return { pct: '50', level: 'alert' }
    case 'limitWarning':
      return { name: '5H', pct: '80' }
    case 'modelChange':
      return { name: spec?.heroNames.tier3 ?? '' }
    case 'effortChange':
      return { weapon: spec?.weapons.high.name ?? '' }
    default:
      return {}
  }
}

/**
 * Advances the scene to `p.tick`. A preview walks its steps. Otherwise: a
 * finished moment ends; a tool that started puts its loop on screen for one
 * full cycle (at most `maxDwell`) before anything else, so the loop is seen
 * even when the call returns at once; after that the scene follows the live
 * activity and the next queued moment (no older than `maxAge`) starts.
 * Returns the new progress; `p` is untouched.
 */
export function stepScene(theme: Theme, p: SceneProgress, o: StepOptions): SceneProgress {
  let { activity, since, pending, dwellUntil, playing, queue, preview } = p
  const tick = p.tick
  const step = preview[0]
  if (step) {
    if (!step.begun || (step.kind === 'event' && !playing)) {
      if (step.kind === 'state') {
        activity = step.name as ActivityState
        since = tick
      } else {
        const name = step.name as EventName
        playing = { name, startTick: tick, vars: previewVars(theme, name), variant: step.variant ?? 0 }
      }
    }
    const left = step.ticks - 1
    if (left > 0) preview = [{ ...step, ticks: left, begun: true }, ...preview.slice(1)]
    else {
      preview = preview.slice(1)
      if (step.kind === 'event') playing = null
      if (!preview.length) {
        activity = 'idle'
        since = tick
      }
    }
    return { ...p, activity, since, started: null, pending: false, dwellUntil: 0, playing, preview }
  }

  const picks = { ...p.picks }
  if (playing && tick - playing.startTick >= duration(theme.events[playing.name], playing.variant)) playing = null
  // The same loop already on screen (or about to be) carries on; another tool takes over.
  if (p.started && !(activity === p.started && (pending || tick < dwellUntil))) {
    activity = p.started
    pending = true
  }
  if (!playing) {
    if (pending) {
      const anim = loopFor(theme, activity, o.overkill, o.cold)
      since = tick
      dwellUntil = tick + Math.min(o.maxDwell, duration(anim, loopAt(anim, tick, 0).variant))
      pending = false
    }
    if (tick >= dwellUntil) {
      if (activity !== p.live) {
        activity = p.live
        since = tick
      }
      queue = queue.filter(q => tick - q.at <= o.maxAge)
      const first = queue[0]
      if (first) {
        const variant = pickVariant(takes(theme.events[first.name]).length, tick, picks[first.name])
        picks[first.name] = variant
        playing = { name: first.name, startTick: tick, vars: first.vars, variant }
        queue = queue.slice(1)
      }
    }
  }
  return { ...p, activity, since, started: null, pending, dwellUntil, playing, queue, preview, picks }
}

export type SceneState = {
  tick: number
  hero: HeroTier
  weapon: WeaponTier
  activity: ActivityState
  /** The tick the activity's loop began (default 0). */
  since?: number
  overkill: boolean
  cacheCold: boolean
  /** Context used, percent (the backdrop can darken with it). */
  percent: number
  /** Fraction of the cache TTL left (0..1), or null when unknown. */
  stamina: number | null
  /** Seconds of cache left, for the flash in the last minute. */
  staminaSeconds: number | null
  /** Next-message floors in USD (the price tag shows them with `currency`). */
  nextWarmUsd: number | null
  nextColdUsd: number | null
  event: PlayingEvent | null
}

/** The frame on screen: the playing event's, else the activity loop's. */
export function currentFrame(theme: Theme, s: SceneState): Frame {
  if (s.event) {
    const anim = theme.events[s.event.name]
    if (anim) return frameAt(anim, s.tick - s.event.startTick, s.event.variant ?? 0)
  }
  const anim = loopFor(theme, s.activity, s.overkill, s.cacheCold)
  const since = s.since ?? 0
  const at = loopAt(anim, since, s.tick - since)
  return frameAt(anim, at.t, at.variant)
}

/** Every animation of a theme with the scene state that shows it, and a name for reports. */
export function animationsOf(theme: Theme): { key: string; anim: Animation; state: Partial<SceneState>; event?: EventName }[] {
  return [
    ...ACTIVITY_STATES.map(a => ({ key: `states.${a}`, anim: theme.states[a], state: { activity: a } })),
    ...ACTIVITY_STATES.flatMap(a => (theme.overkill[a] ? [{ key: `overkill.${a}`, anim: theme.overkill[a]!, state: { activity: a, overkill: true } }] : [])),
    ...ACTIVITY_STATES.flatMap(a => (theme.cold?.[a] ? [{ key: `cold.${a}`, anim: theme.cold[a]!, state: { activity: a, cacheCold: true } }] : [])),
    ...EVENT_NAMES.map(e => ({ key: `events.${e}`, anim: theme.events[e], state: {}, event: e })),
  ]
}

/** Context levels, lowest first, as the user's thresholds set them (see `level` in lib.ts). */
export const LEVELS: readonly Level[] = ['ok', 'warn', 'orange', 'alert', 'critical']

/**
 * The theme's milestone message at a context level: its entry for that level,
 * else the one for the highest level under it. Undefined when it has none.
 */
export function milestoneMessage(theme: Theme, at: string | undefined): string | undefined {
  const rank = LEVELS.indexOf(at as Level)
  if (!theme.milestones || rank < 0) return undefined
  let best: { rank: number; message: string } | undefined
  for (const m of theme.milestones) {
    const r = LEVELS.indexOf(m.level)
    if (r <= rank && (!best || r > best.rank)) best = { rank: r, message: m.message }
  }
  return best?.message
}

/** Whether a moment has a message of its own (else the log shows its `text` line). */
export function hasMessage(theme: Theme, name: EventName): boolean {
  return Boolean(theme.messages[name] || (name === 'milestone' && theme.milestones?.length))
}

/**
 * Fills `{pct}`-style placeholders; a key of `theme.messages` resolves to its
 * template first, and `milestone` to the message for `vars.level`.
 */
export function fill(theme: Theme, keyOrText: string, vars: Record<string, string>): string {
  const messages = theme.messages as Record<string, string | undefined>
  const template =
    keyOrText === 'milestone'
      ? (milestoneMessage(theme, vars.level) ?? messages.milestone ?? theme.text.milestone)
      : (messages[keyOrText] ?? keyOrText)
  return template.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m)
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export type SceneRender = { cells: string; columns: number; rows: number; caption: string | null }

/** Terminal rows of the scene as designed, and the most a tall pane gives it (half as much again). */
export function sceneDesignRows(theme: Theme): number {
  return theme.scene ? Math.ceil(theme.scene.height / 2) : 0
}

export function sceneMaxRows(theme: Theme): number {
  return Math.ceil(sceneDesignRows(theme) * 1.5)
}

/**
 * The scene, `rows` terminal rows tall (the design height when absent or
 * less). Rows past the design height are headroom at the top.
 */
export function renderScene(theme: Theme, s: SceneState, columns: number, rows?: number): SceneRender | null {
  const spec = theme.scene
  if (!spec) return null
  const { height, extra } = sceneSize(theme, rows)
  const cv = new Canvas(columns, height)
  const px = theme.pixels
  const frame = currentFrame(theme, s)

  drawBackground(cv, theme, s, extra, Boolean(frame.message))

  const placed = placeFrame(theme, s, frame, extra)
  const draw = (backdrop: boolean) => {
    for (const p of placed) {
      if (Boolean(p.backdrop) !== backdrop || (p.blink && s.tick % 2 !== 0)) continue
      cv.sprite(p.sprite, p.x, p.y, px, p.swap, p.flip, p.flipY)
    }
  }
  // A frame's backdrop layers, then the stamina ring and price tag over them (a
  // message box takes their corner while it shows), then the actors.
  draw(true)
  if (spec.stamina && s.stamina !== null && !frame.message) drawStamina(cv, theme, s)
  const vars = s.event?.vars ?? {}
  draw(false)
  const ink = messageColors(theme).ink
  for (const t of placeTexts(theme, s, frame, extra)) cv.write(t.col, t.row, t.text, colorOf(theme, t.color) ?? ink, t.bg ? colorOf(theme, t.bg) : null)
  if (frame.message) drawMessage(cv, theme, fill(theme, frame.message, vars))

  return { cells: cv.encode(), columns, rows: height, caption: frame.caption ? fill(theme, frame.caption, vars) : null }
}

/** The scene's rows for a pane that offers `rows`, and the headroom in pixels this adds over the design. */
function sceneSize(theme: Theme, rows?: number): { height: number; extra: number } {
  const design = sceneDesignRows(theme)
  const height = Math.max(design, Math.floor(rows ?? design))
  return { height, extra: (height - design) * 2 }
}

/** A palette name or `#rrggbb` as a color number. */
function colorOf(theme: Theme, name: string): number | null {
  return hex(theme.pixels[name] ?? name)
}

/** The dialogue box's colors: the theme's `scene.message`, else white on black. */
function messageColors(theme: Theme): { bg: number; ink: number } {
  const m = theme.scene?.message
  return { bg: (m && colorOf(theme, m.bg)) ?? 0x000000, ink: (m && colorOf(theme, m.ink)) ?? 0xfcfcfc }
}

/** The color `t` (0..1) of the way down an evenly spaced gradient. */
function gradientAt(stops: number[], t: number): number {
  if (stops.length === 1) return stops[0]!
  const at = Math.max(0, Math.min(1, t)) * (stops.length - 1)
  const k = Math.min(stops.length - 2, Math.floor(at))
  return mix(stops[k]!, stops[k + 1]!, at - k)
}

/** A steady pseudo-random number in [0, 1) for particle `i`'s trait `salt`. */
function noise(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Whether `percent` is in [min, max): ranges that share a boundary never both show. 100 is included. */
export function inPercent(percent: number, min = 0, max = 100): boolean {
  return percent >= min && (percent < max || max >= 100)
}

function drawBackground(cv: Canvas, theme: Theme, s: SceneState, extra: number, message = false) {
  const bg = theme.scene!.background
  const px = theme.pixels
  const stops = (list: string[]) => list.map(c => colorOf(theme, c) ?? 0)
  if (bg.gradient?.length) {
    const top = stops(bg.gradient)
    const deep = bg.deep?.length ? stops(bg.deep) : null
    const depth = Math.max(0, Math.min(1, s.percent / 100))
    for (let y = 0; y < cv.height; y++) {
      const t = cv.height > 1 ? y / (cv.height - 1) : 0
      const c = deep ? mix(gradientAt(top, t), gradientAt(deep, t), depth) : gradientAt(top, t)
      cv.rect(0, y, cv.width, 1, c)
    }
  } else {
    cv.rect(0, 0, cv.width, cv.height, colorOf(theme, bg.ground))
  }
  for (const [k, p] of (bg.particles ?? []).entries()) {
    if (!inPercent(s.percent, p.minPercent, p.maxPercent)) continue
    const speed = p.speed ?? 1
    for (let i = 0; i < p.count; i++) {
      const seed = i + k * 1000
      const step = Math.floor(s.tick * speed * (0.5 + noise(seed, 3)))
      let x = Math.floor(noise(seed, 1) * cv.width)
      let y = Math.floor(noise(seed, 2) * cv.height)
      if (p.drift === 'up') y = (((y - step) % cv.height) + cv.height) % cv.height
      if (p.drift === 'down') y = (y + step) % cv.height
      if (p.drift === 'left') x = (((x - step) % cv.width) + cv.width) % cv.width
      cv.set(x, y, colorOf(theme, p.colors[i % p.colors.length] ?? '#ffffff'))
    }
  }
  // Scenery darkens with depth when the theme asks.
  const shadeTo = bg.shade ? colorOf(theme, bg.shade.color) : null
  const amount = bg.shade ? Math.max(0, Math.min(1, bg.shade.amount * (s.percent / 100))) : 0
  const tint = shadeTo !== null && amount > 0 ? (c: number) => mix(c, shadeTo, amount) : undefined
  const tile = (name: string | undefined, y: (h: number) => number) => {
    const t = name ? theme.sprites[name] : undefined
    if (!t) return
    const { w, h } = size(t)
    for (let x = 0; x < cv.width; x += Math.max(1, w)) cv.sprite(t, x, y(h), px, {}, false, false, tint)
  }
  tile(bg.border, () => 0)
  tile(bg.floor, h => cv.height - h)
  for (const d of bg.decor ?? []) {
    if (!inPercent(s.percent, d.minPercent, d.maxPercent) || cv.width < (d.minColumns ?? 0) || (d.ring && message)) continue
    const sprite = theme.sprites[d.sprite]
    const x = d.x < 0 ? cv.width + d.x - size(sprite).w : d.x
    // Ground scenery rides down with the floor; the sky stays up.
    cv.sprite(sprite, x, d.y + (d.sky ? 0 : extra), px, {}, false, false, d.lit ? undefined : tint)
  }
}

/** One sprite of a frame, placed in scene pixels. `blink`: drawn on even ticks only (an aura). */
type Placed = { what: string; sprite: Sprite | undefined; x: number; y: number; swap: Record<string, string>; flip: boolean; flipY: boolean; blink?: boolean; offstage?: boolean; backdrop?: boolean }

/**
 * Where a frame's actors draw. An actor above the hero (`y < 0`, not `fixed`)
 * rises by a taller form's `lift`; the weapon also moves to the form's `hand`
 * (held, `y >= 0`) or `aloft` offset, mirrored when it is flipped.
 */
function placeFrame(theme: Theme, s: SceneState, frame: Frame, extra: number): Placed[] {
  const spec = theme.scene!
  const out: Placed[] = []
  const form = spec.heroForms?.[s.hero]
  for (const actor of frame.actors) {
    if (actor.tiers && !actor.tiers.includes(s.hero)) continue
    if (!inPercent(s.percent, actor.minPercent, actor.maxPercent)) continue
    const x = spec.anchor.x + actor.x
    const y = spec.anchor.y + extra + actor.y
    const lifted = form && actor.y < 0 && !actor.fixed ? y - form.lift : y
    const turned = (name: string | undefined) => {
      const sprite = name ? theme.sprites[name] : undefined
      return sprite && actor.turn ? quarter(sprite, actor.turn) : sprite
    }
    const flip = actor.flip ?? false
    const flipY = actor.flipY ?? false
    if (actor.sprite === '@weapon') {
      const w = spec.weapons[s.weapon] ?? spec.weapons.medium
      const pose = (actor.pose ? w.poses?.[actor.pose] : undefined) ?? w
      // A big form holds its weapon where its own hand is, mirrored when it faces left.
      const off = form ? (actor.y >= 0 ? form.hand : actor.fixed ? undefined : form.aloft) : undefined
      const mirror = form && off && flip ? 2 * form.dx + size(theme.sprites[form.poses.stand]).w - size(theme.sprites[spec.hero.stand]).w : 0
      const hx = x + (off ? (flip ? mirror - off.x : off.x) : 0)
      const hy = lifted + (off?.y ?? 0)
      if (pose.aura) out.push({ what: pose.aura, sprite: turned(pose.aura), x: hx - 1, y: hy - 1, swap: {}, flip, flipY, blink: true, offstage: actor.offstage })
      out.push({ what: `@weapon ${pose.sprite}`, sprite: turned(pose.sprite), x: hx, y: hy, swap: w.swap, flip, flipY, offstage: actor.offstage })
    } else if (actor.sprite.startsWith('@')) {
      for (const p of placeHero(theme, s.hero, actor.sprite.slice(1) as HeroPose, x, y, actor.swap, flip, flipY)) out.push({ ...p, offstage: actor.offstage })
    } else {
      const swap = actor.tier ? { ...spec.heroTiers[s.hero], ...actor.swap } : (actor.swap ?? {})
      out.push({ what: actor.sprite, sprite: turned(actor.sprite), x, y: lifted, swap, flip, flipY, offstage: actor.offstage || actor.backdrop, backdrop: actor.backdrop })
    }
  }
  return out
}

/** The hero of a tier in a pose, its top-left at (x, y) as the standard hero's. */
function placeHero(theme: Theme, tier: HeroTier, pose: HeroPose, x: number, y: number, swapExtra: Record<string, string> = {}, flip = false, flipY = false): Placed[] {
  const spec = theme.scene!
  const swap = { ...spec.heroTiers[tier], ...swapExtra }
  const form = spec.heroForms?.[tier]
  const poses = form?.poses ?? spec.hero
  // No lying pose: doze standing.
  const name = (pose === 'lie' ? (poses.lie ?? poses.sleep) : poses[pose]) ?? poses.stand
  const sprite = theme.sprites[name]
  // Every pose rests on the standing pose's feet.
  const drop = size(theme.sprites[poses.stand]).h - size(sprite).h
  if (form) return [{ what: `@${pose}`, sprite, x: x + form.dx, y: y + form.dy + drop, swap, flip, flipY }]
  const out: Placed[] = [{ what: `@${pose}`, sprite, x, y: y + drop, swap, flip, flipY }]
  const extra = spec.heroExtras?.[tier]
  if (extra) out.push({ what: extra.sprite, sprite: theme.sprites[extra.sprite], x: x + extra.x, y: y + extra.y, swap: {}, flip: false, flipY: false })
  return out
}

function drawHero(cv: Canvas, theme: Theme, tier: HeroTier, pose: HeroPose, x: number, y: number) {
  for (const p of placeHero(theme, tier, pose, x, y)) cv.sprite(p.sprite, p.x, p.y, theme.pixels, p.swap, p.flip, p.flipY)
}

/** Where a frame's texts are written, in cells. */
function placeTexts(theme: Theme, s: SceneState, frame: Frame, extra: number): { text: string; col: number; row: number; color: string; bg?: string }[] {
  const spec = theme.scene!
  const form = spec.heroForms?.[s.hero]
  return (frame.texts ?? []).map(t => {
    const lift = form && t.lift && t.y < 0 ? form.lift : 0
    return { text: t.text, col: spec.anchor.x + t.x, row: Math.floor((spec.anchor.y + extra + t.y - lift) / 2), color: t.color, bg: t.bg }
  })
}

/** How far something of the frame on screen falls outside the scene, in pixels per side. */
export type Clip = { what: string; left: number; right: number; top: number; bottom: number }

/**
 * What the frame on screen draws outside a scene of `columns` x `rows`:
 * actors by their drawn pixels (not their transparent margins) and texts by
 * their cells. Actors marked `offstage` are meant to cross the edge.
 */
export function sceneClips(theme: Theme, s: SceneState, columns: number, rows?: number): Clip[] {
  if (!theme.scene) return []
  const { height, extra } = sceneSize(theme, rows)
  const frame = currentFrame(theme, s)
  const out: Clip[] = []
  const check = (what: string, x0: number, y0: number, x1: number, y1: number) => {
    const c = { what, left: Math.max(0, -x0), right: Math.max(0, x1 - columns), top: Math.max(0, -y0), bottom: Math.max(0, y1 - height * 2) }
    if (c.left || c.right || c.top || c.bottom) out.push(c)
  }
  for (const p of placeFrame(theme, s, frame, extra)) {
    const ink = p.sprite && !p.offstage ? inkBox(p.sprite) : null
    if (!ink || !p.sprite) continue
    const { w, h } = size(p.sprite)
    const x0 = p.x + (p.flip ? w - ink.x1 : ink.x0)
    const y0 = p.y + (p.flipY ? h - ink.y1 : ink.y0)
    check(p.what, x0, y0, x0 + (ink.x1 - ink.x0), y0 + (ink.y1 - ink.y0))
  }
  for (const t of placeTexts(theme, s, frame, extra)) check(`text "${t.text}"`, t.col, t.row * 2, t.col + [...t.text].length, t.row * 2 + 2)
  return out
}

/**
 * Props a taller form would jerk: the same sprite above the hero (`y < 0`) in
 * one frame and level with it in the next, not `fixed`. Above, it rises by the
 * form's `lift`; level, it does not, so it jumps. Empty for a theme whose forms lift nothing.
 */
export function liftStraddles(theme: Theme): string[] {
  const forms = Object.values(theme.scene?.heroForms ?? {})
  if (!forms.some(f => f && (f.lift !== 0 || f.hand || f.aloft))) return []
  const out: string[] = []
  const byName = (f: Frame) => {
    const m = new Map<string, Actor[]>()
    for (const a of f.actors) {
      if (a.fixed || (a.sprite.startsWith('@') && a.sprite !== '@weapon')) continue
      m.set(a.sprite, [...(m.get(a.sprite) ?? []), a])
    }
    return m
  }
  for (const { key, anim } of animationsOf(theme)) {
    takes(anim).forEach((frames, v) => {
      const last = anim.loop ? frames.length : frames.length - 1
      for (let k = 0; k < last; k++) {
        const a = byName(frames[k]!)
        const b = byName(frames[(k + 1) % frames.length]!)
        for (const [name, list] of a) {
          const others = b.get(name) ?? []
          list.forEach((actor, i) => {
            const other = others[i]
            if (other && actor.y < 0 !== other.y < 0) out.push(`${key}${v ? `#${v}` : ''} f${k}>f${(k + 1) % frames.length} ${name} y ${actor.y}>${other.y}`)
          })
        }
      }
    })
  }
  return out
}

function drawStamina(cv: Canvas, theme: Theme, s: SceneState) {
  const st = theme.scene!.stamina!
  const px = theme.pixels
  const r = st.radius
  const cx = st.x + r
  const cy = st.y + r
  const flash = !s.cacheCold && s.staminaSeconds !== null && s.staminaSeconds < 60 && s.tick % 2 === 0
  const frac = s.cacheCold ? 0 : (s.stamina ?? 0)
  for (let j = -r - 1; j <= r + 1; j++) {
    for (let i = -r - 1; i <= r + 1; i++) {
      const d = Math.sqrt(i * i + j * j)
      if (d < r - 1.5 || d > r + 0.5) continue
      // Clockwise from the top.
      const angle = (Math.atan2(i, -j) + 2 * Math.PI) % (2 * Math.PI)
      const filled = angle / (2 * Math.PI) < frac
      const name = s.cacheCold ? st.cold : filled && !flash ? st.full : st.empty
      cv.set(cx + i, cy + j, colorOf(theme, name))
    }
  }
  // Price tag under the ring: the currency icon and the next message's floor.
  const price = s.cacheCold || s.nextWarmUsd === null ? s.nextColdUsd : s.nextWarmUsd
  if (price === null) return
  const tagY = st.y + 2 * r + 3
  const row = Math.floor(tagY / 2) + 1
  cv.sprite(theme.sprites[st.tagIcon], st.x + 1, row * 2 - 1, px)
  const ink = s.cacheCold ? (colorOf(theme, st.tagColdColor ?? '#6c6c6c') ?? 0x6c6c6c) : (colorOf(theme, st.tagColor ?? '#1c1c1c') ?? 0x1c1c1c)
  cv.write(st.x + 5, row, `x${currency(price)}`, ink)
}

function drawMessage(cv: Canvas, theme: Theme, text: string) {
  const { bg, ink } = messageColors(theme)
  const width = Math.max(10, cv.cols - 4)
  const lines = wrap(text, width - 2).slice(0, Math.max(1, cv.rows - 4))
  const top = 1
  cv.rect(1, top * 2, cv.width - 2, (lines.length + 2) * 2, bg)
  lines.forEach((line, k) => {
    const col = Math.max(2, Math.floor((cv.cols - [...line].length) / 2))
    cv.write(col, top + 1 + k, line, ink, bg)
  })
}

export function wrap(text: string, width: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if (!word) continue
    if (line && line.length + 1 + word.length > width) {
      out.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) out.push(line)
  return out
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

export type BarState = {
  tick: number
  /** Context percent used. */
  percent: number
  /** Spend in the theme's currency units (cents). */
  spend: number
  hero: HeroTier
  weapon: WeaponTier
  /** Seconds and fraction of warm cache left; null when unknown. */
  cacheSeconds?: number | null
  cacheFrac?: number | null
  /** The next message's floor while warm, in USD. */
  nextWarmUsd?: number | null
  /** The highest rate limit percent, if any are reported. */
  limitMax?: number | null
}

/** Terminal rows one row of bar widgets takes. */
export const BAR_ROWS = 7

/** `count` icons of `levels` steps each, filled by `fraction` (0..1), rounded to the nearest step. */
export function meterFill(fraction: number, count: number, levels: number): number[] {
  const steps = Math.max(0, Math.min(count * levels, Math.round(fraction * count * levels)))
  return Array.from({ length: count }, (_, k) => Math.max(0, Math.min(levels, steps - k * levels)))
}

/** Ten icons, each 10% of the context left, filled in quarters (2.5% each): a `meter` widget of five sprites. */
export function hearts(percent: number): number[] {
  return meterFill((100 - percent) / 100, 10, 4)
}

const EFFORT_INDEX: Record<WeaponTier, number> = { low: 1, medium: 2, high: 3, xhigh: 4, max: 5 }

/** A counter's text for `value`; dashes while it is not known. */
export function barValue(value: BarValue, b: BarState): string {
  switch (value) {
    case 'spend':
      return String(b.spend)
    case 'contextLeft':
      return String(Math.max(0, Math.round(100 - b.percent)))
    case 'contextUsed':
      return String(Math.max(0, Math.round(b.percent)))
    case 'cacheSeconds':
      return b.cacheSeconds === null || b.cacheSeconds === undefined ? '---' : String(Math.max(0, Math.ceil(b.cacheSeconds)))
    case 'nextWarm':
      return b.nextWarmUsd === null || b.nextWarmUsd === undefined ? '-' : currency(b.nextWarmUsd)
    case 'limitMax':
      return b.limitMax === null || b.limitMax === undefined ? '--' : String(Math.round(b.limitMax))
    case 'world': {
      const stage = Math.max(0, Math.min(31, Math.floor(b.percent / 3.125)))
      return `${Math.floor(stage / 4) + 1}-${(stage % 4) + 1}`
    }
    case 'effort':
      return String(EFFORT_INDEX[b.weapon] ?? 2)
    case 'cache':
      return b.cacheFrac === null || b.cacheFrac === undefined ? '-' : String(Math.round(b.cacheFrac * 100))
  }
}

export function meterFraction(value: MeterValue, b: BarState): number {
  if (value === 'contextLeft') return (100 - b.percent) / 100
  if (value === 'cache') return b.cacheFrac ?? 0
  if (value === 'limitsLeft') return Math.max(0, 100 - (b.limitMax ?? 0)) / 100
  if (value === 'limitsUsed') return Math.max(0, Math.min(100, b.limitMax ?? 0)) / 100
  return (EFFORT_INDEX[b.weapon] ?? 2) / 5
}

/** A counter widget's text: scaled, zero-padded and formatted; a value not yet known stays as its dashes. */
export function counterText(w: Extract<BarWidget, { kind: 'counter' }>, b: BarState): string {
  const raw = barValue(w.value, b)
  if (/^-+$/.test(raw)) return raw
  const v = w.scale !== undefined && /^\d+$/.test(raw) ? String(Number(raw) * w.scale) : raw
  const padded = w.digits && /^\d+$/.test(v) ? v.padStart(w.digits, '0') : v
  return (w.format ?? '{v}').replace('{v}', padded)
}

/** A box widget's frame, in columns. */
const BOX_W = 7

function widgetWidth(theme: Theme, w: BarWidget, b: BarState): number {
  switch (w.kind) {
    case 'map':
      return 19
    case 'box':
      return Math.max(BOX_W, w.label.length) + 2
    case 'counter':
      return (w.icon ? 4 : 0) + Math.max(w.label?.length ?? 0, counterText(w, b).length, w.chars ?? 0) + 2
    case 'meter': {
      const sw = size(theme.sprites[w.sprites[0] ?? '']).w
      return Math.max(w.label?.length ?? 0, Math.min(w.count, w.perRow) * (sw + (w.gap ?? 1))) + 1
    }
  }
}

/**
 * The bar's widgets by row, for a pane `columns` wide that allows `maxRows`
 * rows of them (1 or 2). One row when everything but the map fits in one (the
 * map joins when it fits too). Else two rows, split at the widget marked
 * `wrap` or where the rows come out most even, the map at the end of a row
 * with room for it. A widget is
 * dropped (highest `drop` first) only when the allowed rows cannot hold all.
 */
export function barLayout(theme: Theme, b: BarState, columns: number, maxRows = 2): BarWidget[][] {
  const all = theme.scene?.bar?.widgets ?? []
  const used = (list: BarWidget[]) => 1 + list.reduce((n, w) => n + widgetWidth(theme, w, b), 0)
  const fits = (list: BarWidget[]) => used(list) <= columns
  if (fits(all)) return [all]
  const maps = all.filter(w => w.kind === 'map')
  let rest: BarWidget[] = all.filter(w => w.kind !== 'map')
  for (;;) {
    if (fits(rest)) return [rest]
    if (maxRows >= 2) {
      // Where the theme asks, if that fits; else the split that leaves the wider row narrowest.
      let best: { k: number; wide: number } | null = null
      const asked = rest.findIndex(w => w.wrap)
      for (let k = 1; k < rest.length; k++) {
        const wide = Math.max(used(rest.slice(0, k)), used(rest.slice(k)))
        if (wide <= columns && (!best || wide < best.wide || k === asked) && best?.k !== asked) best = { k, wide }
      }
      if (best) {
        const rows = [rest.slice(0, best.k), rest.slice(best.k)]
        for (const m of maps) rows.find(r => fits([...r, m]))?.push(m)
        return rows
      }
    }
    const droppable = rest.filter(w => w.drop !== undefined)
    if (!droppable.length) break
    const worst = droppable.reduce((a, c) => ((c.drop ?? 0) > (a.drop ?? 0) ? c : a))
    rest = rest.filter(w => w !== worst)
  }
  // Nothing more may go: the last widgets clip.
  if (maxRows < 2) return [rest]
  let k = 1
  while (k < rest.length && fits(rest.slice(0, k + 1))) k++
  return [rest.slice(0, k), rest.slice(k)]
}

/**
 * The status bar as a Raster of `BAR_ROWS` per row of widgets. `wanted`: the
 * rows of widgets it takes when two are allowed (the Quest tab grants the
 * second when the pane has the height).
 */
export function renderBar(theme: Theme, b: BarState, columns: number, maxRows = 2): { cells: string; columns: number; rows: number; wanted: number } | null {
  const bar = theme.scene?.bar
  if (!bar) return null
  const layout = barLayout(theme, b, columns, maxRows)
  const wanted = maxRows >= 2 ? layout.length : barLayout(theme, b, columns, 2).length
  const cv = new Canvas(columns, BAR_ROWS * layout.length)
  const px = theme.pixels
  const color = (name: string) => colorOf(theme, name) ?? 0xffffff
  const textColor = color(bar.colors.text)
  const labelColor = color(bar.colors.label)
  cv.rect(0, 0, cv.width, cv.height, color(bar.colors.bg))

  const spec = theme.scene!
  layout.forEach((shown, line) => {
    const row = line * BAR_ROWS
    const y = row * 2
    let x = 1
    for (const w of shown) {
      const width = widgetWidth(theme, w, b)
      if (w.kind === 'map') {
        cv.rect(x, y + 2, 16, 10, color(bar.colors.map))
        const dot = x + Math.round((Math.min(100, b.percent) / 100) * 14)
        cv.rect(dot, y + 6, 2, 2, color(bar.colors.mapDot))
      } else if (w.kind === 'counter') {
        if (w.label) cv.write(x, row, w.label, labelColor)
        if (w.icon) cv.sprite(theme.sprites[w.icon], x, y + 5, px)
        cv.write(x + (w.icon ? 4 : 0), row + 3, counterText(w, b), textColor)
      } else if (w.kind === 'box') {
        const left = x + Math.floor((width - 2 - BOX_W) / 2)
        cv.write(x + Math.floor((width - 2 - w.label.length) / 2), row, w.label, labelColor)
        const c = color(bar.colors.box)
        cv.rect(left, y + 2, BOX_W, 1, c)
        cv.rect(left, y + 11, BOX_W, 1, c)
        cv.rect(left, y + 2, 1, 10, c)
        cv.rect(left + BOX_W - 1, y + 2, 1, 10, c)
        const swap = w.shows === 'model' ? spec.heroTiers[b.hero] : (spec.weapons[b.weapon] ?? spec.weapons.medium).swap
        const name = w.sprites?.[w.shows === 'model' ? b.hero : b.weapon] ?? w.sprite
        cv.sprite(theme.sprites[name], left + (w.x ?? 2), y + (w.y ?? 5), px, swap)
      } else {
        const first = theme.sprites[w.sprites[0] ?? '']
        const { w: sw, h: sh } = size(first)
        const step = sw + (w.gap ?? 1)
        const levels = Math.max(1, w.sprites.length - 1)
        const fraction = meterFraction(w.value, b)
        const fills = meterFill(fraction, w.count, levels)
        const pulsing = (w.pulseBelow !== undefined && fraction <= w.pulseBelow) || (w.pulseAbove !== undefined && fraction >= w.pulseAbove)
        const blink = pulsing && b.tick % 2 === 0
        if (w.label) cv.write(x + Math.floor((width - 1 - w.label.length) / 2), row, w.label, labelColor)
        const rows = Math.ceil(w.count / w.perRow)
        const top = rows > 1 ? 2 : Math.max(2, Math.floor((14 - sh) / 2) + 1)
        fills.forEach((q, k) => {
          if (blink && q > 0) return
          const set = k === w.count - 1 && w.last ? w.last : w.sprites
          cv.sprite(theme.sprites[set[q] ?? set[0] ?? ''], x + (k % w.perRow) * step, y + top + Math.floor(k / w.perRow) * sh, px)
        })
      }
      x += width
    }
  })

  return { cells: cv.encode(), columns, rows: BAR_ROWS * layout.length, wanted }
}

// ---------------------------------------------------------------------------
// The Quest tab's rows
// ---------------------------------------------------------------------------

/** Rows the recent log always keeps, and the most lines it holds when a tall pane gives it more. */
export const LOG_ROWS = 3
export const LOG_MAX = 8

/** Meter rows the Quest tab keeps under the scene at the least. */
const MIN_METER_ROWS = 4

/**
 * Pane rows the Quest tab needs before the scene shows: the tabs, one row of
 * status bar, the scene as designed, the recent log and a few meter rows.
 */
export function sceneMinRows(theme: Theme, tabRows: number): number {
  const spec = theme.scene
  if (!spec) return Infinity
  return tabRows + (spec.bar ? BAR_ROWS : 0) + sceneDesignRows(theme) + LOG_ROWS + MIN_METER_ROWS
}

/** The Quest tab's rows: `scene` 0 when it hides; `bar` rows of widgets (1 or 2); `log` rows. */
export type QuestLayout = { scene: number; bar: number; log: number }

/**
 * Shares a pane's `rows` out. The words (`meterRows` and the log) keep their
 * space first; then the status bar gets its second row of widgets when it
 * wants one (`barWanted`); what is left is scene, from its design height up to
 * half as much again, and past that the log grows, so the words end on the
 * pane's last row. A pane too short for all its words still shows the scene at
 * its design height under a one-row bar, down to `sceneMinRows`.
 */
export function questLayout(theme: Theme, room: { rows: number; tabRows: number; meterRows: number; barWanted: number }): QuestLayout {
  const spec = theme.scene
  if (!spec || room.rows < sceneMinRows(theme, room.tabRows)) return { scene: 0, bar: 1, log: LOG_ROWS }
  const design = sceneDesignRows(theme)
  const unit = spec.bar ? BAR_ROWS : 0
  const left = room.rows - room.tabRows - room.meterRows - LOG_ROWS
  const bar = room.barWanted >= 2 && left >= 2 * unit + design ? 2 : 1
  const scene = Math.max(design, Math.min(sceneMaxRows(theme), left - bar * unit))
  return { scene, bar, log: LOG_ROWS + Math.max(0, left - bar * unit - scene) }
}

// ---------------------------------------------------------------------------
// The recent log and the meter lines under the scene
// ---------------------------------------------------------------------------

/** How long a line stays in the recent log. */
export const LOG_MS = 5000

export type LogLine = { text: string; until: number }

/**
 * Adds `text` to the top of the log for `LOG_MS`. The same text still showing
 * keeps its place and its time starts over, so a caption repeated every frame
 * never pushes newer lines down. Returns the new log.
 */
export function pushLog(log: LogLine[], text: string, now: number): LogLine[] {
  const live = log.filter(l => l.until > now)
  if (live.some(l => l.text === text)) return live.map(l => (l.text === text ? { text, until: now + LOG_MS } : l))
  return [{ text, until: now + LOG_MS }, ...live].slice(0, LOG_MAX)
}

/** The lines still showing at `now`, newest first. */
export function liveLog(log: LogLine[], now: number): string[] {
  return log.filter(l => l.until > now).map(l => l.text)
}

/**
 * The recent log as `rows` rows, newest on top; it keeps its rows while empty,
 * so the meters below stay put. A line longer than `width` wraps onto the next
 * rows (older lines give way). `fallback` (the scene in words, when it is
 * hidden or cannot draw) goes above.
 */
export function logLines(palette: TextPalette, log: string[], rows: number, fallback: string | null, width = Infinity): Run[][] {
  const fit = (text: string) => wrap(text, Math.max(10, width - 2))
  const out: Run[][] = []
  if (fallback) for (const part of fit(fallback)) out.push([{ text: `  ${part}`, color: palette.accent }])
  const body: Run[][] = []
  log.forEach((line, k) => {
    for (const part of fit(line)) body.push([{ text: `  ${part}`, color: k === 0 ? palette.gold : palette.dim, italic: true }])
  })
  for (let k = 0; k < rows; k++) out.push(body[k] ?? [])
  return out
}

export type MeterData = {
  percent: number
  /** The context level by the user's thresholds: the color of the context row. */
  level: Level
  tokens: number | null
  window: number
  spendUsd: number | null
  lastUsd: number | null
  /** Milliseconds of cache left; null when unknown, 0 or less when cold. */
  cacheLeft: number | null
  nextWarmUsd: number | null
  nextColdUsd: number | null
  limits: { label: string; percent: number; resets: string | null }[]
  heroName: string
  model: string
  weaponName: string
  effort: string | null
}

/** Dollars in the theme's currency (rupees, coins, pearls): one per cent, `<1` for a tiny amount. */
export function currency(usd: number): string {
  const n = usd * 100
  if (n > 0 && n < 0.5) return '<1'
  return String(Math.round(n))
}

/**
 * The meter rows under the log. The block keeps its height as values change:
 * the cost rows and the three cache rows are there from the first response,
 * whether a turn has finished or the cache is warm.
 */
export function meterLines(theme: Theme, palette: TextPalette, m: MeterData, clock: (ms: number) => string, tokens: (n: number) => string): Run[][] {
  const L = theme.labels
  const c = (name: string) => palette[name]
  const names: [string, string][] = [
    [L.context, 'context'],
    [L.spend, 'cost'],
    [L.cache, 'cache'],
    [L.limits, 'limits'],
    [L.modelItem ?? 'B', 'model'],
    [L.effortItem ?? 'A', 'effort'],
  ]
  // One column for every label: the longest, and a space.
  const column = Math.max(20, ...names.map(([name, real]) => name.length + real.length + 4))
  // Each row: the theme's name, what it really is, then the value.
  const label = (name: string, real: string): Run[] => [
    { text: name, color: c('label'), bold: true },
    { text: ` (${real})`.padEnd(column - name.length), color: c('dim') },
  ]
  const sub = (text: string): Run[] => [{ text: `  ${text}`.padEnd(column), color: c('dim') }]
  const dim = (text: string): Run => ({ text, color: c('dim') })
  const val = (text: string, color?: string): Run => ({ text, color: color ?? c('text') })
  const money = (usd: number | null, color?: string): Run[] => (usd === null ? [dim('–')] : [val(currency(usd), color), dim(` ($${usd.toFixed(2)})`)])
  const out: Run[][] = []

  const left = 100 - m.percent
  const leftText = `${left}% left`
  const contextRun: Run =
    m.level === 'critical'
      ? { text: leftText, color: c('red'), bold: true, inverse: true }
      : val(leftText, m.level === 'alert' ? c('red') : m.level === 'ok' ? c('accent') : c('gold'))
  out.push([...label(L.context, 'context'), contextRun, dim(`  ${m.tokens === null ? '–' : tokens(m.tokens)} / ${tokens(m.window)} used`)])
  if (m.spendUsd !== null) {
    out.push([...label(L.spend, 'cost'), ...money(m.spendUsd)])
    out.push([...sub('last turn'), ...money(m.lastUsd)])
  }
  if (m.nextColdUsd !== null) {
    const warm = m.cacheLeft !== null && m.cacheLeft > 0
    if (warm) {
      const low = (m.cacheLeft ?? 0) < 180_000
      out.push([...label(L.cache, 'cache'), val(`${clock(m.cacheLeft ?? 0)} left`, low ? c('red') : c('accent'))])
      out.push([...sub('next message'), ...money(m.nextWarmUsd ?? 0, c('accent')), dim(' while warm')])
      out.push([...sub('if it goes cold'), ...money(m.nextColdUsd, c('red'))])
    } else {
      out.push([...label(L.cache, 'cache'), val(m.cacheLeft === null ? 'unknown' : 'spent: cache is cold', m.cacheLeft === null ? undefined : c('red'))])
      out.push([...sub('next message'), ...money(m.nextColdUsd, c('red'))])
      out.push([])
    }
  }
  m.limits.forEach((l, k) => {
    const runs: Run[] = k === 0 ? label(L.limits, 'limits') : sub('')
    runs.push(dim(`${l.label} `), val(`${Math.round(l.percent)}%`, l.percent >= LIMIT_LEVELS.danger ? c('red') : l.percent >= LIMIT_LEVELS.caution ? c('gold') : undefined))
    if (l.resets) runs.push(dim(`  resets ${l.resets}`))
    out.push(runs)
  })
  out.push([])
  out.push([...label(L.modelItem ?? 'B', 'model'), { text: m.heroName, color: c('accent'), bold: true }, dim(` (${m.model})`)])
  out.push([...label(L.effortItem ?? 'A', 'effort'), val(m.weaponName), ...(m.effort ? [dim(` (${m.effort})`)] : [])])
  return out
}

// ---------------------------------------------------------------------------
// About: the lineup of heroes (models) and weapons (effort levels)
// ---------------------------------------------------------------------------

export const HERO_TIERS: readonly HeroTier[] = ['tier1', 'tier2', 'tier3', 'tier4', 'unknown']
export const WEAPON_TIERS: readonly WeaponTier[] = ['low', 'medium', 'high', 'xhigh', 'max']
/** The model families behind each hero tier (see `heroTier`). */
export const TIER_MODELS: Record<HeroTier, string> = {
  tier1: 'Haiku',
  tier2: 'Sonnet',
  tier3: 'Opus',
  tier4: 'Fable / Mythos',
  unknown: 'any other model',
}

/** A lineup hero slot is at least this wide, so names fit. */
const HERO_SLOT_MIN = 22
const WEAPON_ROWS = 8

/** Where the standing hero of a tier draws, against the standard hero's top-left (`drawHero`'s x, y). */
export function heroBox(theme: Theme, tier: HeroTier): { x0: number; y0: number; x1: number; y1: number } {
  const spec = theme.scene!
  const form = spec.heroForms?.[tier]
  const { w, h } = size(theme.sprites[(form?.poses ?? spec.hero).stand])
  const box = { x0: form?.dx ?? 0, y0: form?.dy ?? 0, x1: (form?.dx ?? 0) + w, y1: (form?.dy ?? 0) + h }
  const extra = form ? undefined : spec.heroExtras?.[tier]
  if (extra) {
    const e = size(theme.sprites[extra.sprite])
    box.x0 = Math.min(box.x0, extra.x)
    box.y0 = Math.min(box.y0, extra.y)
    box.x1 = Math.max(box.x1, extra.x + e.w)
    box.y1 = Math.max(box.y1, extra.y + e.h)
  }
  return box
}

/** `count` slots of `slot` columns in rows as even as the width allows (four as 2 + 2, not 3 + 1). */
export function evenRows(count: number, slot: number, columns: number): { perRow: number; bands: number } {
  const most = Math.max(1, Math.min(count, Math.floor(columns / slot)))
  const bands = Math.ceil(count / most)
  return { perRow: Math.ceil(count / bands), bands }
}

/**
 * The lineup's hero slots: each fits the largest standing hero (forms
 * included) with a margin; `heroRows` terminal rows of hero over two of names
 * and a blank. Pure layout, shared with the tests.
 */
export function lineupLayout(theme: Theme, columns: number) {
  const heroes = HERO_TIERS.filter(t => t !== 'unknown')
  const boxes = heroes.map(t => heroBox(theme, t))
  const maxW = Math.max(...boxes.map(b => b.x1 - b.x0))
  const maxH = Math.max(...boxes.map(b => b.y1 - b.y0))
  const slotW = Math.max(HERO_SLOT_MIN, maxW + 4)
  const heroRows = Math.ceil((maxH + 2) / 2)
  const { perRow, bands } = evenRows(heroes.length, slotW, columns)
  return { heroes, boxes, slotW, heroRows, rowsPerBand: heroRows + 3, perRow, bands }
}

/**
 * The lineup as one Raster: the four model heroes standing on the ground, each
 * named with its model; under them the five weapons, each named with its effort.
 * `current` marks the session's own hero and weapon.
 */
export function renderLineup(theme: Theme, columns: number, current: { hero: HeroTier; weapon: WeaponTier }): SceneRender | null {
  const spec = theme.scene
  if (!spec) return null
  const L = lineupLayout(theme, columns)
  // Weapons are drawn upright: a slot fits the widest one (and its aura) plus a margin.
  const weaponW = Math.max(...WEAPON_TIERS.map(t => {
    const w = spec.weapons[t]
    return Math.max(size(theme.sprites[w.sprite]).w, w.aura ? size(theme.sprites[w.aura]).w : 0)
  }))
  const weaponSlot = Math.max(12, weaponW + 4)
  const { perRow: weaponPerRow, bands: weaponBands } = evenRows(WEAPON_TIERS.length, weaponSlot, columns)
  const rows = L.bands * L.rowsPerBand + weaponBands * WEAPON_ROWS
  const cv = new Canvas(columns, rows)
  const px = theme.pixels
  const lu = spec.lineup
  cv.rect(0, 0, cv.width, cv.height, colorOf(theme, lu?.ground ?? spec.background.ground))
  const ink = colorOf(theme, lu?.ink ?? '#1c1c1c') ?? 0x1c1c1c
  const faint = colorOf(theme, lu?.dim ?? '#6c6c6c') ?? 0x6c6c6c
  const mark = colorOf(theme, lu?.mark ?? '#b02010') ?? 0xb02010
  const flipWeapons = lu?.flipWeapons ?? false
  const center = (text: string, left: number, width: number, row: number, color: number) => {
    const t = text.length > width - 1 ? text.slice(0, width - 1) : text
    cv.write(left + Math.floor((width - t.length) / 2), row, t, color)
  }

  // Each hero centered in its slot by its own width, all feet on one line.
  L.heroes.forEach((tier, k) => {
    const left = (k % L.perRow) * L.slotW
    const top = Math.floor(k / L.perRow) * L.rowsPerBand
    const box = L.boxes[k]!
    const feet = (top + L.heroRows) * 2
    drawHero(cv, theme, tier, 'stand', left + Math.floor((L.slotW - (box.x1 - box.x0)) / 2) - box.x0, feet - box.y1)
    const isMe = tier === current.hero
    center(spec.heroNames[tier], left, L.slotW, top + L.heroRows, isMe ? mark : ink)
    center(isMe ? `> ${TIER_MODELS[tier]} <` : TIER_MODELS[tier], left, L.slotW, top + L.heroRows + 1, isMe ? mark : faint)
  })

  const weaponTop = L.bands * L.rowsPerBand
  WEAPON_TIERS.forEach((tier, k) => {
    const left = (k % weaponPerRow) * weaponSlot
    const top = weaponTop + Math.floor(k / weaponPerRow) * WEAPON_ROWS
    const w = spec.weapons[tier]
    const x = left + Math.floor((weaponSlot - size(theme.sprites[w.sprite]).w) / 2)
    if (w.aura) cv.sprite(theme.sprites[w.aura], x - 1, top * 2 + 1, px, {}, false, flipWeapons)
    cv.sprite(theme.sprites[w.sprite], x, top * 2 + 2, px, w.swap, false, flipWeapons)
    const isMe = tier === current.weapon
    center(isMe ? `>${tier}<` : tier, left, weaponSlot, top + 6, isMe ? mark : ink)
  })

  return { cells: cv.encode(), columns, rows, caption: null }
}

/** What each moment means, for the About tab. */
const MOMENTS: Record<EventName, string> = {
  toolSuccess: 'tool succeeded',
  toolError: 'tool failed',
  turnComplete: 'turn done',
  milestone: 'context +10%',
  cacheCold: 'cache expired',
  limitWarning: `limit over ${LIMIT_LEVELS.caution}%`,
  compaction: 'compacted',
  modelChange: 'model changed',
  effortChange: 'effort changed',
}

/**
 * The pane widths every scene theme is laid out for and checked at: slim (a
 * two-row bar, the action alone), comfortable (the minimap and a first piece
 * of scenery), the bar on one row, and everything (the map too, all scenery).
 * Widths in between work; these are where a theme looks as intended.
 */
export const PANE_WIDTHS = [48, 58, 80, 96] as const

/**
 * The About tab's line naming `PANE_WIDTHS`; the pane's own size goes under
 * it. (A plugin cannot set the dock's width once the person has dragged it; it
 * can say where a theme looks as intended.)
 */
export const WIDTH_GUIDE = `Themes are laid out for ${PANE_WIDTHS.slice(0, -1).join(', ')}, and ${PANE_WIDTHS[PANE_WIDTHS.length - 1]}`

/** Left column of the About tab's rows. */
const ABOUT_COLUMN = 22

/**
 * The About tab's text: the theme, its heroes and weapons by name, and what
 * the scene shows. `pane`: the pane body's size, printed under the widths
 * themes are laid out for; every line wraps to its columns,
 * a row's right side under itself.
 */
export function aboutLines(theme: Theme, palette: TextPalette, current: { hero: HeroTier; weapon: WeaponTier }, pane?: { columns: number; rows: number }): Run[][] {
  const spec = theme.scene
  const c = (name: string) => palette[name]
  const head = (text: string): Run[] => [{ text, color: c('label'), bold: true }]
  const dim = (text: string): Run => ({ text, color: c('dim') })
  const width = pane?.columns ?? Infinity
  const out: Run[][] = []
  const row = (left: string, right: string, isMe = false) => {
    const parts = wrap(right, Math.max(12, width - ABOUT_COLUMN))
    parts.forEach((part, k) =>
      out.push([
        { text: (k === 0 ? `  ${isMe ? '>' : ' '} ${left}` : '').padEnd(ABOUT_COLUMN), color: isMe ? c('accent') : c('dim'), bold: isMe },
        { text: part, color: isMe ? c('accent') : c('text'), bold: isMe },
      ]),
    )
  }
  const title = `${theme.name}  v${theme.version}`
  if (title.length <= width) out.push([{ text: theme.name, color: c('gold'), bold: true }, dim(`  v${theme.version}`)])
  else out.push(...wrap(theme.name, width).map((part): Run[] => [{ text: part, color: c('gold'), bold: true }]), [dim(`v${theme.version}`)])
  for (const part of wrap(theme.description, width)) out.push([dim(part)])
  if (pane) {
    out.push([])
    // Both lines turn to the accent color when the pane is at one of the widths.
    const color = (PANE_WIDTHS as readonly number[]).includes(pane.columns) ? c('accent') : c('dim')
    for (const part of wrap(WIDTH_GUIDE, width)) out.push([{ text: part, color }])
    out.push([{ text: `Pane: ${pane.columns} x ${pane.rows}`, color }])
  }
  out.push([])
  if (spec) {
    out.push(head(`${theme.labels.heroes ?? 'Heroes'} (model)`))
    for (const t of HERO_TIERS) row(TIER_MODELS[t], spec.heroNames[t], t === current.hero)
    out.push([])
    out.push(head(`${theme.labels.weapons ?? 'Weapons'} (effort)`))
    for (const t of WEAPON_TIERS) row(t, spec.weapons[t].name, t === current.weapon)
    out.push([])
  }
  out.push(head('What the scene shows'))
  for (const k of ACTIVITY_STATES) row(k, theme.text[k])
  out.push([])
  out.push(head('Moments'))
  for (const k of EVENT_NAMES) row(MOMENTS[k], theme.text[k])
  return out
}
