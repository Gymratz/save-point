// Draws a theme's scene and status bar from the session's live state. Pure: the
// hooks module supplies the state and blits what comes back.

import { LIMIT_LEVELS, modelKey, toolKind } from '../lib'
import type { Level, Run } from '../lib'
import { mix } from './kit'
import { Canvas, hex, size } from './pixel'
import { ACTIVITY_STATES, EVENT_NAMES } from './types'
import type { ActivityState, Actor, Animation, BarValue, BarWidget, EventName, Frame, HeroPose, HeroTier, MeterValue, TextPalette, Theme, WeaponTier } from './types'

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

export function duration(anim: Animation): number {
  return anim.frames.reduce((n, f) => n + Math.max(1, f.hold ?? 1), 0)
}

/** The frame `t` ticks into an animation; a finished one-shot holds its last frame. */
export function frameAt(anim: Animation, t: number): Frame {
  const total = duration(anim)
  let at = anim.loop ? ((t % total) + total) % total : Math.min(t, total - 1)
  for (const f of anim.frames) {
    at -= Math.max(1, f.hold ?? 1)
    if (at < 0) return f
  }
  return anim.frames[anim.frames.length - 1] ?? { actors: [] }
}

export type PlayingEvent = { name: EventName; startTick: number; vars: Record<string, string> }

/** A moment waiting to play, queued at tick `at`. */
export type QueuedEvent = { name: EventName; at: number; vars: Record<string, string> }

/** One step of `/hud theme preview`: a state or an event, for `ticks` more ticks. */
export type PreviewStep = { kind: 'state' | 'event'; name: string; ticks: number }

/** What the scene is doing between frames. */
export type SceneProgress = {
  /** The tick being drawn. */
  tick: number
  activity: ActivityState
  playing: PlayingEvent | null
  queue: QueuedEvent[]
  preview: PreviewStep[]
}

/**
 * Advances the scene to `p.tick`: a preview walks every state, then every
 * event; otherwise a finished moment ends and the next queued one (no older
 * than `maxAge` ticks) starts. Returns the new progress; `p` is untouched.
 */
export function stepScene(theme: Theme, p: SceneProgress, maxAge: number): SceneProgress {
  let { activity, playing, queue, preview } = p
  const step = preview[0]
  if (step) {
    if (step.kind === 'state') activity = step.name as ActivityState
    else if (!playing || playing.name !== step.name) {
      const spec = theme.scene
      playing = {
        name: step.name as EventName,
        startTick: p.tick,
        vars: { pct: '50', level: 'alert', name: spec?.heroNames.tier3 ?? '', weapon: spec?.weapons.high.name ?? '' },
      }
    }
    const left = step.ticks - 1
    if (left > 0) preview = [{ ...step, ticks: left }, ...preview.slice(1)]
    else {
      preview = preview.slice(1)
      if (step.kind === 'event') playing = null
      if (!preview.length) activity = 'idle'
    }
  } else {
    if (playing && p.tick - playing.startTick >= duration(theme.events[playing.name])) playing = null
    if (!playing) {
      queue = queue.filter(q => p.tick - q.at <= maxAge)
      const first = queue[0]
      if (first) {
        playing = { name: first.name, startTick: p.tick, vars: first.vars }
        queue = queue.slice(1)
      }
    }
  }
  return { tick: p.tick, activity, playing, queue, preview }
}

export type SceneState = {
  tick: number
  hero: HeroTier
  weapon: WeaponTier
  activity: ActivityState
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

/** The animation on screen: the playing event, else the activity loop (overkill or cold variants first). */
export function currentAnimation(theme: Theme, s: SceneState): { anim: Animation; t: number } {
  if (s.event) {
    const anim = theme.events[s.event.name]
    if (anim) return { anim, t: s.tick - s.event.startTick }
  }
  const anim =
    (s.overkill ? theme.overkill[s.activity] : undefined) ??
    (s.cacheCold ? theme.cold?.[s.activity] : undefined) ??
    theme.states[s.activity] ??
    theme.states.idle
  return { anim, t: s.tick }
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

export function renderScene(theme: Theme, s: SceneState, columns: number): SceneRender | null {
  const spec = theme.scene
  if (!spec) return null
  const rows = Math.ceil(spec.height / 2)
  const cv = new Canvas(columns, rows)

  drawBackground(cv, theme, s)

  // Stamina ring and price tag
  if (spec.stamina && s.stamina !== null) drawStamina(cv, theme, s)

  const { anim, t } = currentAnimation(theme, s)
  const frame = frameAt(anim, t)
  const vars = s.event?.vars ?? {}
  for (const actor of frame.actors) drawActor(cv, theme, s, actor)
  const ink = messageColors(theme).ink
  for (const text of frame.texts ?? []) {
    const col = spec.anchor.x + text.x
    const row = Math.floor((spec.anchor.y + text.y) / 2)
    cv.write(col, row, text.text, colorOf(theme, text.color) ?? ink, text.bg ? colorOf(theme, text.bg) : null)
  }
  if (frame.message) drawMessage(cv, theme, fill(theme, frame.message, vars))

  return { cells: cv.encode(), columns, rows, caption: frame.caption ? fill(theme, frame.caption, vars) : null }
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

function drawBackground(cv: Canvas, theme: Theme, s: SceneState) {
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
    if (s.percent < (p.minPercent ?? 0) || s.percent > (p.maxPercent ?? 100)) continue
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
    if (s.percent < (d.minPercent ?? 0) || s.percent > (d.maxPercent ?? 100) || cv.width < (d.minColumns ?? 0)) continue
    const sprite = theme.sprites[d.sprite]
    const x = d.x < 0 ? cv.width + d.x - size(sprite).w : d.x
    cv.sprite(sprite, x, d.y, px, {}, false, false, tint)
  }
}

function drawActor(cv: Canvas, theme: Theme, s: SceneState, actor: Actor) {
  const spec = theme.scene!
  const x = spec.anchor.x + actor.x
  const y = spec.anchor.y + actor.y
  const px = theme.pixels
  if (actor.tiers && !actor.tiers.includes(s.hero)) return
  const form = spec.heroForms?.[s.hero]
  // Props above the hero's head clear a taller form; scenery stays put.
  const lifted = form && actor.y < 0 && !actor.fixed ? y - form.lift : y
  if (actor.sprite === '@weapon') {
    const w = spec.weapons[s.weapon] ?? spec.weapons.medium
    // A big form holds its weapon where its own hand is, mirrored when it faces left.
    const held = !!form && actor.y >= 0
    const mirror = form && held && actor.flip ? 2 * form.dx + size(theme.sprites[form.poses.stand]).w - size(theme.sprites[spec.hero.stand]).w : 0
    const hand = held ? (form?.hand ?? { x: 0, y: 0 }) : { x: 0, y: 0 }
    const hx = x + (actor.flip ? mirror - hand.x : hand.x)
    const hy = lifted + hand.y
    if (w.aura && s.tick % 2 === 0) cv.sprite(theme.sprites[w.aura], hx - 1, hy - 1, px, {}, false, actor.flipY)
    cv.sprite(theme.sprites[w.sprite], hx, hy, px, w.swap, actor.flip, actor.flipY)
    return
  }
  if (actor.sprite.startsWith('@')) {
    drawHero(cv, theme, s.hero, actor.sprite.slice(1) as HeroPose, x, y, actor.swap, actor.flip, actor.flipY)
    return
  }
  const swap = actor.tier ? { ...spec.heroTiers[s.hero], ...actor.swap } : actor.swap
  cv.sprite(theme.sprites[actor.sprite], x, lifted, px, swap, actor.flip, actor.flipY)
}

/** The hero of a tier in a pose, its top-left at (x, y) as the standard hero's. */
function drawHero(cv: Canvas, theme: Theme, tier: HeroTier, pose: HeroPose, x: number, y: number, swapExtra: Record<string, string> = {}, flip = false, flipY = false) {
  const spec = theme.scene!
  const px = theme.pixels
  const swap = { ...spec.heroTiers[tier], ...swapExtra }
  const form = spec.heroForms?.[tier]
  const poses = form?.poses ?? spec.hero
  // No lying pose: doze standing.
  const name = (pose === 'lie' ? (poses.lie ?? poses.sleep) : poses[pose]) ?? poses.stand
  const sprite = theme.sprites[name]
  // Every pose rests on the standing pose's feet.
  const drop = size(theme.sprites[poses.stand]).h - size(sprite).h
  if (form) {
    cv.sprite(sprite, x + form.dx, y + form.dy + drop, px, swap, flip, flipY)
    return
  }
  cv.sprite(sprite, x, y + drop, px, swap, flip, flipY)
  const extra = spec.heroExtras?.[tier]
  if (extra) cv.sprite(theme.sprites[extra.sprite], x + extra.x, y + extra.y, px)
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

export const BAR_ROWS = 7

/** Meter rows the Quest tab keeps under the scene at the least. */
const MIN_METER_ROWS = 4

/**
 * Pane rows the Quest tab needs before the scene shows: the tabs, the status
 * bar, the scene, the recent log and a few meter rows.
 */
export function sceneMinRows(theme: Theme, tabRows: number): number {
  const spec = theme.scene
  if (!spec) return Infinity
  return tabRows + (spec.bar ? BAR_ROWS : 0) + Math.ceil(spec.height / 2) + LOG_MAX + MIN_METER_ROWS
}

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

/** A counter's text for `value`. */
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
  return (EFFORT_INDEX[b.weapon] ?? 2) / 5
}

function counterText(w: Extract<BarWidget, { kind: 'counter' }>, b: BarState): string {
  const raw = barValue(w.value, b)
  const v = w.scale !== undefined && /^\d+$/.test(raw) ? String(Number(raw) * w.scale) : raw
  const padded = w.digits && /^\d+$/.test(v) ? v.padStart(w.digits, '0') : v
  return (w.format ?? '{v}').replace('{v}', padded)
}

function widgetWidth(theme: Theme, w: BarWidget, b: BarState): number {
  switch (w.kind) {
    case 'map':
      return 19
    case 'box':
      return 9
    case 'counter':
      return (w.icon ? 4 : 0) + Math.max(w.label?.length ?? 0, counterText(w, b).length) + 2
    case 'meter': {
      const sw = size(theme.sprites[w.sprites[0] ?? '']).w
      return Math.max(w.label?.length ?? 0, Math.min(w.count, w.perRow) * (sw + (w.gap ?? 1))) + 1
    }
  }
}

export function renderBar(theme: Theme, b: BarState, columns: number): { cells: string; columns: number; rows: number } | null {
  const bar = theme.scene?.bar
  if (!bar) return null
  const cv = new Canvas(columns, BAR_ROWS)
  const px = theme.pixels
  const color = (name: string) => colorOf(theme, name) ?? 0xffffff
  const textColor = color(bar.colors.text)
  const labelColor = color(bar.colors.label)
  cv.rect(0, 0, cv.width, cv.height, color(bar.colors.bg))

  // What fits: drop the highest `drop` first.
  const shown = [...bar.widgets]
  const total = () => 1 + shown.reduce((n, w) => n + widgetWidth(theme, w, b), 0)
  while (total() > columns) {
    const droppable = shown.filter(w => w.drop !== undefined)
    if (!droppable.length) break
    const worst = droppable.reduce((a, c) => ((c.drop ?? 0) > (a.drop ?? 0) ? c : a))
    shown.splice(shown.indexOf(worst), 1)
  }

  const spec = theme.scene!
  let x = 1
  for (const w of shown) {
    const width = widgetWidth(theme, w, b)
    if (w.kind === 'map') {
      cv.rect(x, 2, 16, 10, color(bar.colors.map))
      const dot = x + Math.round((Math.min(100, b.percent) / 100) * 14)
      cv.rect(dot, 6, 2, 2, color(bar.colors.mapDot))
    } else if (w.kind === 'counter') {
      if (w.label) cv.write(x, 0, w.label, labelColor)
      if (w.icon) cv.sprite(theme.sprites[w.icon], x, 5, px)
      cv.write(x + (w.icon ? 4 : 0), 3, counterText(w, b), textColor)
    } else if (w.kind === 'box') {
      cv.write(x + 3, 0, w.label, textColor)
      const c = color(bar.colors.box)
      cv.rect(x, 2, 7, 1, c)
      cv.rect(x, 11, 7, 1, c)
      cv.rect(x, 2, 1, 10, c)
      cv.rect(x + 6, 2, 1, 10, c)
      const swap = w.shows === 'model' ? spec.heroTiers[b.hero] : (spec.weapons[b.weapon] ?? spec.weapons.medium).swap
      const name = w.sprites?.[w.shows === 'model' ? b.hero : b.weapon] ?? w.sprite
      cv.sprite(theme.sprites[name], x + (w.x ?? 2), w.y ?? 5, px, swap)
    } else {
      const first = theme.sprites[w.sprites[0] ?? '']
      const { w: sw, h: sh } = size(first)
      const step = sw + (w.gap ?? 1)
      const levels = Math.max(1, w.sprites.length - 1)
      const fraction = meterFraction(w.value, b)
      const fills = meterFill(fraction, w.count, levels)
      const blink = w.pulseBelow !== undefined && fraction <= w.pulseBelow && b.tick % 2 === 0
      if (w.label) cv.write(x + Math.floor((width - 1 - w.label.length) / 2), 0, w.label, labelColor)
      const rows = Math.ceil(w.count / w.perRow)
      const top = rows > 1 ? 2 : Math.max(2, Math.floor((14 - sh) / 2) + 1)
      fills.forEach((q, k) => {
        if (blink && q > 0) return
        const set = k === w.count - 1 && w.last ? w.last : w.sprites
        cv.sprite(theme.sprites[set[q] ?? set[0] ?? ''], x + (k % w.perRow) * step, top + Math.floor(k / w.perRow) * sh, px)
      })
    }
    x += width
  }

  return { cells: cv.encode(), columns, rows: BAR_ROWS }
}

// ---------------------------------------------------------------------------
// Meter lines under the scene
// ---------------------------------------------------------------------------

/** How long a line stays in the recent log, and how many show at once. */
export const LOG_MS = 5000
export const LOG_MAX = 3

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

export type MeterData = {
  percent: number
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
  /** Recent moments and captions, newest first (see `pushLog`). */
  log: string[]
  /** Shown when the scene is hidden or cannot draw. */
  fallback: string | null
}

/** Dollars in the theme's currency (rupees, coins, pearls): one per cent, `<1` for a tiny nonzero amount. */
export function currency(usd: number): string {
  const n = usd * 100
  if (n > 0 && n < 0.5) return '<1'
  return String(Math.round(n))
}

export function meterLines(theme: Theme, palette: TextPalette, m: MeterData, clock: (ms: number) => string, tokens: (n: number) => string): Run[][] {
  const L = theme.labels
  const c = (name: string) => palette[name]
  // Each row: the theme's name, what it really is, then the value.
  const label = (name: string, real: string): Run[] => [
    { text: name, color: c('label'), bold: true },
    { text: ` (${real})`.padEnd(Math.max(1, 20 - name.length)), color: c('dim') },
  ]
  const sub = (text: string): Run[] => [{ text: `  ${text}`.padEnd(20), color: c('dim') }]
  const dim = (text: string): Run => ({ text, color: c('dim') })
  const val = (text: string, color?: string): Run => ({ text, color: color ?? c('text') })
  const money = (usd: number, color?: string): Run[] => [val(currency(usd), color), dim(` ($${usd.toFixed(2)})`)]
  const out: Run[][] = []

  if (m.fallback) out.push([{ text: `  ${m.fallback}`, color: c('accent') }])
  // The recent log keeps its rows while empty, so the meters below stay put.
  for (let k = 0; k < LOG_MAX; k++) {
    const line = m.log[k]
    out.push(line ? [{ text: `  ${line}`, color: k === 0 ? c('gold') : c('dim'), italic: true }] : [])
  }

  const left = 100 - m.percent
  out.push([
    ...label(L.context, 'context'),
    val(`${left}% left`, left <= 20 ? c('red') : left <= 50 ? c('gold') : c('accent')),
    dim(`  ${m.tokens === null ? '–' : tokens(m.tokens)} / ${tokens(m.window)} used`),
  ])
  if (m.spendUsd !== null) {
    out.push([...label(L.spend, 'cost'), ...money(m.spendUsd)])
    if (m.lastUsd !== null) out.push([...sub('last turn'), ...money(m.lastUsd)])
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
  const perRow = Math.max(1, Math.min(heroes.length, Math.floor(columns / slotW)))
  return { heroes, boxes, slotW, heroRows, rowsPerBand: heroRows + 3, perRow, bands: Math.ceil(heroes.length / perRow) }
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
  const weaponPerRow = Math.max(1, Math.min(WEAPON_TIERS.length, Math.floor(columns / weaponSlot)))
  const weaponBands = Math.ceil(WEAPON_TIERS.length / weaponPerRow)
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

/** The About tab's text: the theme, its heroes and weapons by name, and what the scene shows. */
export function aboutLines(theme: Theme, palette: TextPalette, current: { hero: HeroTier; weapon: WeaponTier }): Run[][] {
  const spec = theme.scene
  const c = (name: string) => palette[name]
  const head = (text: string): Run[] => [{ text, color: c('label'), bold: true }]
  const dim = (text: string): Run => ({ text, color: c('dim') })
  const row = (left: string, right: string, isMe = false): Run[] => [
    { text: `  ${isMe ? '>' : ' '} ${left}`.padEnd(22), color: isMe ? c('accent') : c('dim'), bold: isMe },
    { text: right, color: isMe ? c('accent') : c('text'), bold: isMe },
  ]
  const out: Run[][] = [[{ text: theme.name, color: c('gold'), bold: true }, dim(`  v${theme.version}`)], [dim(theme.description)], []]
  if (spec) {
    out.push(head(`${theme.labels.heroes ?? 'Heroes'} (model)`))
    for (const t of HERO_TIERS) out.push(row(TIER_MODELS[t], spec.heroNames[t], t === current.hero))
    out.push([])
    out.push(head(`${theme.labels.weapons ?? 'Weapons'} (effort)`))
    for (const t of WEAPON_TIERS) out.push(row(t, spec.weapons[t].name, t === current.weapon))
    out.push([])
  }
  out.push(head('What the scene shows'))
  for (const k of ACTIVITY_STATES) out.push(row(k, theme.text[k]))
  out.push([])
  out.push(head('Moments'))
  for (const k of EVENT_NAMES) out.push(row(MOMENTS[k], theme.text[k]))
  return out
}
