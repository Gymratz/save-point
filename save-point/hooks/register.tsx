// Save Point. Reads session data and draws the band above the prompt
// and the /hud pane. Observe-only unless Autopilot is on (off by default):
// then it adds context notices to tool results (and turn starts), can deny new
// Agent calls and skip automatic compaction above the backstop percent, and
// `/hud effort-check` makes one small Haiku call on demand. Nothing else
// rewrites, denies or answers a session event or calls a model or the network.
//
// Every function that receives `$` and every atom must live in this module
// (the engine follows `$` only here); pure logic is in lib.ts, pane.ts,
// autopilot-logic.ts and themes/. In this module the names `on` and `next`
// belong to the hook registrar and each hook's continuation: never name any
// other variable or parameter `on` or `next`.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, On, PluginOptions, Register, RenderChildren, Timer, ToolCallResult } from 'claude-code'

import type { Autopilot, BandMode, Calibration, Snapshot, TokenTotals, Tokens, Ttl, View } from '../types'
import { backstopText, callKey, crossing, effortCheckText, effortHint, effortStats, guardText, noticeText, thresholdAt } from './autopilot-logic'
import {
  bandSegments,
  cacheInfo,
  detectTtl,
  fmtClock,
  fmtReset,
  fmtTokens,
  inputCost,
  level,
  LIMIT_LEVELS,
  prettyModel,
  PRICES,
  priceFor,
  rateLabel,
  SEPARATOR,
  TTL_MS,
} from './lib'
import type { CacheInfo, Run, StepUsage } from './lib'
import { AUTOPILOT_PARTS, linesToText, noticeSummary, paneLines } from './pane'
import { resolveTheme, THEMES, themeId } from './themes'
import {
  aboutLines,
  activityFor,
  BAR_ROWS,
  duration,
  fill,
  hasMessage,
  HERO_TIERS,
  heroTier,
  isOverkill,
  isRoutine,
  liveLog,
  meterLines,
  pushLog,
  renderBar,
  renderLineup,
  renderScene,
  sceneMinRows,
  stepScene,
  TIER_MODELS,
  WEAPON_TIERS,
  weaponTier,
} from './themes/scene'
import type { BarState, LogLine, MeterData, PlayingEvent, PreviewStep, QueuedEvent, SceneState } from './themes/scene'
import { ACTIVITY_STATES, EVENT_NAMES } from './themes/types'
import type { ActivityState, EventName, HeroTier, Theme, WeaponTier } from './themes/types'
import type { PaneInput, TtlSource } from './pane'

const ZERO: TokenTotals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

const snapshot = atom({ plugin: 'save-point', key: 'snapshot' } as const, null)
const activity = atom({ plugin: 'save-point', key: 'activity' } as const, { tools: {}, spawns: 0 })
const cache = atom({ plugin: 'save-point', key: 'cache' } as const, { lastReqAt: null, detected: null })
const turn = atom({ plugin: 'save-point', key: 'turn' } as const, { startUsd: null, lastUsd: null })
const effort = atom({ plugin: 'save-point', key: 'effort' } as const, null)
const tokens = atom({ plugin: 'save-point', key: 'tokens' } as const, { main: ZERO, agents: ZERO, since: null })
const files = atom({ plugin: 'save-point', key: 'files' } as const, { read: [], written: [] })
const history = atom({ plugin: 'save-point', key: 'history' } as const, [])
const calibration = atom({ plugin: 'save-point', key: 'calibration' } as const, { predicted: null, state: null, actual: null })

const view = atom({ plugin: 'save-point', key: 'view' } as const, { band: 'full', pane: false })
const autopilot = atom({ plugin: 'save-point', key: 'autopilot' } as const, {
  override: null,
  highWater: 0,
  pending: null,
  last: null,
  steps: [],
  calls: [],
  check: null,
})

const PANE = 'save-point'

/** `$.store` key: the view (band mode, pane open, theme, tab, Autopilot and its parts) carried into new sessions. */
const VIEW_KEY = 'view'

/** `$.store` key: last main-loop request time per session id, for resume. */
const STORE_KEY = 'lastRequest'
const STORE_KEEP = 50

const FILES_KEEP = 200
const HISTORY_KEEP = 200

// Module state is lost on reload; session start rebuilds what matters from atoms and `$.store`.
let warmUntil = 0
/** The one-second tick; a new session start replaces it rather than adding another. */
let tickTimer: Timer | null = null
let mainSteps: StepUsage[] = []
let agentSteps: StepUsage[] = []
/** The session a /clear or resume just ended; set until the conversation that took its place is read. */
let replacedFrom: string | null = null

async function refresh($: EngineInterface) {
  const u = await $.session.usage()
  const snap: Snapshot = {
    model: await $.session.model(),
    tokens: u.context.tokens ?? null,
    window: u.context.window,
    percent: u.context.percent ?? null,
    costUsd: u.cost?.usd ?? null,
    rateLimits: u.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
  }
  const prev = await read($, snapshot)
  if (JSON.stringify(prev) !== JSON.stringify(snap)) await update($, snapshot, () => snap)
  sceneLimits(snap.rateLimits)
}

async function markRequest($: EngineInterface, at: number, ttl: Ttl) {
  warmUntil = at + TTL_MS[ttl]
  coldSent = false
  await update($, cache, c => ({ ...c, lastReqAt: at }))
  const id = await $.session.id()
  const saved = ((await $.store.get(STORE_KEY)) ?? {}) as Record<string, number>
  const entries = Object.entries({ ...saved, [id]: at })
    .sort((a, b) => b[1] - a[1])
    .slice(0, STORE_KEEP)
  await $.store.set(STORE_KEY, Object.fromEntries(entries))
}

async function restoreClock($: EngineInterface, ttl: Ttl) {
  let { lastReqAt } = await read($, cache)
  if (lastReqAt === null) {
    const saved = ((await $.store.get(STORE_KEY)) ?? {}) as Record<string, number>
    lastReqAt = saved[await $.session.id()] ?? null
    if (lastReqAt !== null) await update($, cache, c => ({ ...c, lastReqAt }))
  }
  warmUntil = lastReqAt === null ? 0 : lastReqAt + TTL_MS[ttl]
}

/**
 * After a /clear or a resume inside this process (no `session.start` fires for
 * either): restores the remembered view (theme, Autopilot) into the new
 * session's state and reads the conversation that took over, as a session
 * start would. `force` does it even under the same session id (a turn is
 * starting, so it is in place).
 */
async function afterReplaced($: EngineInterface, options: PluginOptions, force = false) {
  if (replacedFrom === null) return
  if (!force && (await $.session.id()) === replacedFrom) return
  replacedFrom = null
  await restoreView($)
  await restoreClock($, ttlInUse(options, (await read($, cache)).detected).ttl)
  await backfill($)
  await apSessionStart($, options)
  await refresh($)
}

async function tick($: EngineInterface, options: PluginOptions) {
  await afterReplaced($, options)
  const now = await $.clock.now()
  if (warmUntil && now < warmUntil + 1500) $.ui.invalidate('ui.render')
  if (warmUntil && now >= warmUntil && !coldSent) {
    coldSent = true
    sceneEvent('cacheCold')
  }
}

async function setView($: EngineInterface, change: (v: View) => View): Promise<View> {
  const saved = await update($, view, change)
  // Merged onto what is stored, so a view that never held a choice (a session
  // whose state started over) cannot erase the remembered one.
  const stored = ((await $.store.get(VIEW_KEY)) ?? {}) as Partial<View>
  await $.store.set(VIEW_KEY, { ...stored, ...saved })
  return saved
}

async function restoreView($: EngineInterface) {
  const saved = (await $.store.get(VIEW_KEY)) as View | undefined
  if (saved && (saved.band === 'full' || saved.band === 'compact' || saved.band === 'hidden')) {
    await update($, view, () => ({
      band: saved.band,
      pane: Boolean(saved.pane),
      ...(typeof saved.theme === 'string' ? { theme: saved.theme } : {}),
      ...(typeof saved.tab === 'string' ? { tab: saved.tab } : {}),
      ...(typeof saved.autopilot === 'boolean' ? { autopilot: saved.autopilot } : {}),
      ...(typeof saved.backstop === 'boolean' ? { backstop: saved.backstop } : {}),
      ...(typeof saved.guard === 'boolean' ? { guard: saved.guard } : {}),
      ...(typeof saved.hints === 'boolean' ? { hints: saved.hints } : {}),
    }))
  }
}

async function openPane($: EngineInterface) {
  const opened = await $.ui.open({ id: PANE, title: 'Save Point' })
  await setView($, v => ({ ...v, pane: true }))
  return opened
}

async function closePane($: EngineInterface) {
  stopAnim()
  await $.ui.close({ id: PANE })
  await setView($, v => ({ ...v, pane: false }))
}

async function togglePane($: EngineInterface) {
  const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
  if (isOpen) {
    await closePane($)
    return null
  }
  return openPane($)
}

async function resetCounters($: EngineInterface) {
  await update($, activity, () => ({ tools: {}, spawns: 0 }))
  await update($, files, () => ({ read: [], written: [] }))
  const since = await $.clock.now()
  await update($, tokens, () => ({ main: ZERO, agents: ZERO, since }))
}

/**
 * Rebuilds tool counts and file lists from the transcript when the plugin
 * loads (at launch, on resume, mid-session), so they cover the whole
 * conversation; live hooks count from there.
 */
async function backfill($: EngineInterface) {
  const tools: Record<string, number> = {}
  let spawns = 0
  const read_: string[] = []
  const written: string[] = []
  const remember = (list: string[], path: unknown) => {
    if (typeof path !== 'string' || !path) return
    const i = list.indexOf(path)
    if (i >= 0) list.splice(i, 1)
    list.unshift(path)
  }
  for (const m of await $.session.messages()) {
    for (const use of m.toolUses) {
      tools[use.tool] = (tools[use.tool] ?? 0) + 1
      if (use.tool === 'Agent') spawns += 1
      if (use.tool === 'Read') remember(read_, use.input.file_path)
      else if (use.tool === 'Write' || use.tool === 'Edit') remember(written, use.input.file_path)
      else if (use.tool === 'NotebookEdit') remember(written, use.input.notebook_path)
    }
  }
  await update($, activity, () => ({ tools, spawns }))
  await update($, files, () => ({ read: read_.slice(0, FILES_KEEP), written: written.slice(0, FILES_KEEP) }))
}

async function addTokens($: EngineInterface, isAgent: boolean, u: StepUsage) {
  const add = (t: TokenTotals): TokenTotals => ({
    input: t.input + u.input_tokens,
    output: t.output + u.output_tokens,
    cacheRead: t.cacheRead + u.cache_read_input_tokens,
    cacheWrite: t.cacheWrite + u.cache_creation_input_tokens,
  })
  await update($, tokens, (t: Tokens) => (isAgent ? { ...t, agents: add(t.agents) } : { ...t, main: add(t.main) }))
}

async function addFile($: EngineInterface, kind: 'read' | 'written', path: string) {
  await update($, files, f => ({ ...f, [kind]: [path, ...f[kind].filter(p => p !== path)].slice(0, FILES_KEEP) }))
}

/** The cache clock at this moment: time left, warm or cold, the next message's floors. */
async function cacheNow($: EngineInterface, options: PluginOptions): Promise<CacheInfo> {
  const snap = await read($, snapshot)
  const clock = await read($, cache)
  const { ttl } = ttlInUse(options, clock.detected)
  const price = snap ? priceFor(snap.model, multiplier(options)) : null
  return cacheInfo({ lastReqAt: clock.lastReqAt, ttl, now: await $.clock.now(), price, tokens: snap?.tokens ?? null })
}

/** Everything the pane draws, minus its width. */
async function gather($: EngineInterface, options: PluginOptions): Promise<Omit<PaneInput, 'width'> | null> {
  const snap = await read($, snapshot)
  if (!snap) return null
  const clock = await read($, cache)
  const { ttl, source } = ttlInUse(options, clock.detected)
  return {
    snap,
    act: await read($, activity),
    clock,
    cost: await read($, turn),
    effort: await read($, effort),
    tokens: await read($, tokens),
    files: await read($, files),
    history: await read($, history),
    calib: await read($, calibration),
    now: await $.clock.now(),
    ttl,
    ttlSource: source,
    price: priceFor(snap.model, multiplier(options)),
    cache: await cacheNow($, options),
    thresholds: thresholds(options),
    spendLimit: Number(options.spendLimitUsd) || 0,
    cwd: await $.session.cwd(),
    autopilot: await autopilotInfo($, options),
  }
}

async function autopilotInfo($: EngineInterface, options: PluginOptions): Promise<PaneInput['autopilot']> {
  const a = await read($, autopilot)
  return {
    on: isOn(a),
    delivery: options.noticeDelivery === 'tool+turn' ? 'tool+turn' : 'tool',
    nextAt: a.highWater >= 90 ? null : a.highWater + 10,
    last: a.last,
    at: backstopPercent(options),
    backstop: await partOn($, 'backstop'),
    guard: await partOn($, 'guard'),
    hints: await partOn($, 'hints'),
    hint: await currentHint($, options),
    check: a.check,
  }
}

async function paneText($: EngineInterface, options: PluginOptions): Promise<string> {
  const g = await gather($, options)
  if (!g) return 'Save Point: no data yet (waiting for the first response).'
  return linesToText(paneLines({ ...g, width: 60 }))
}

function ttlInUse(options: PluginOptions, detected: Ttl | null): { ttl: Ttl; source: TtlSource } {
  const set = options.cacheTtl
  if (set === '5m' || set === '1h') return { ttl: set, source: 'configured' }
  return detected ? { ttl: detected, source: 'detected' } : { ttl: '1h', source: 'assumed' }
}

function multiplier(options: PluginOptions): number {
  const m = Number(options.priceMultiplier) || 1
  return options.usOnlyInference ? m * 1.1 : m
}

function thresholds(options: PluginOptions) {
  return {
    warn: Number(options.contextWarnPercent) || 30,
    orange: Number(options.contextOrangePercent) || 40,
    alert: Number(options.contextAlertPercent) || 50,
    critical: Number(options.contextCriticalPercent) || 75,
  }
}

function pricesText(options: PluginOptions, model: string | null): string {
  const mult = multiplier(options)
  const head = `Prices, USD per million tokens (multiplier ${+mult.toFixed(4)}${options.usOnlyInference ? ', incl. 1.1x US-only' : ''}):`
  const cols = ['input', 'output', '5m write', '1h write', 'cache read']
  const lines = [head, '', `${'model'.padEnd(12)}${cols.map(c => c.padStart(11)).join('')}`]
  for (const key of Object.keys(PRICES)) {
    const p = priceFor(key, mult)!
    const vals = [p.input, p.output, p.write5m, p.write1h, p.read].map(v => `$${+v.toFixed(4)}`.padStart(11))
    lines.push(`${prettyModel(key).padEnd(12)}${vals.join('')}`)
  }
  if (model) lines.push('', `Session model: ${model}${priceFor(model, 1) ? '' : ' (not in the table)'}`)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Autopilot: the only part of the plugin that writes to the conversation or
// changes behaviour. Off by default; everything below passes events through
// untouched unless Autopilot is on and its own switch is set.
// ---------------------------------------------------------------------------

const STATS_KEEP = 40

function isOn(a: Autopilot): boolean {
  return a.override === true
}

/** The parts of Autopilot with their own switch in the pane; each is off until switched on there. */
type Part = 'backstop' | 'guard' | 'hints'

async function partOn($: EngineInterface, part: Part): Promise<boolean> {
  return (await read($, view))[part] === true
}

async function setPart($: EngineInterface, part: Part, enabled: boolean) {
  await setView($, v => ({ ...v, [part]: enabled }))
  $.ui.invalidate('ui.render')
}

function backstopPercent(options: PluginOptions): number {
  return Number(options.backstopPercent) || 60
}

async function percentNow($: EngineInterface): Promise<number | null> {
  return (await $.session.usage()).context.percent ?? null
}

/** Starts the high-water mark at the current level, so turning on mid-session does not replay old crossings. */
async function seed($: EngineInterface) {
  const pct = await percentNow($)
  const mark = pct === null ? 0 : thresholdAt(pct)
  await update($, autopilot, a => ({ ...a, highWater: Math.max(a.highWater, mark) }))
}

async function resetConversation($: EngineInterface) {
  await update($, autopilot, a => ({ ...a, highWater: 0, pending: null, last: null, steps: [], calls: [] }))
}

/** `/hud autopilot [on|off]`: the session's switch. Answers with a toast; nothing reaches the transcript. */
async function autopilotCommand($: EngineInterface, sub: string, options: PluginOptions) {
  if (sub === 'on' || sub === 'off') {
    await setAutopilot($, sub === 'on')
  } else if (sub) {
    return { text: 'Usage: /hud autopilot [on | off]' }
  }
  const enabled = isOn(await read($, autopilot))
  $.ui.toast(`Autopilot ${enabled ? 'on' : 'off'}${sub ? ', remembered for new sessions' : ''}`)
  return {}
}

/** Autopilot on or off for this session, remembered as the choice for new ones. */
async function setAutopilot($: EngineInterface, enabled: boolean) {
  if (enabled) {
    await seed($)
    await update($, autopilot, a => ({ ...a, override: true }))
  } else {
    await update($, autopilot, a => ({ ...a, override: false, pending: null }))
  }
  await setView($, v => ({ ...v, autopilot: enabled }))
  $.ui.invalidate('ui.render')
}

/** `/hud effort-check`: one Haiku classification over the stats summary. */
async function effortCheckCommand($: EngineInterface, options: PluginOptions) {
  const a = await read($, autopilot)
  if (!isOn(a) || options.effortCheck !== true) {
    $.ui.toast('Effort check needs Autopilot on and the effortCheck option set')
    return {}
  }
  const level = await read($, effort)
  const stats = effortStats(a.steps, a.calls)
  if (!level || stats.steps < 5) {
    $.ui.toast('Effort check: not enough steps yet')
    return {}
  }
  $.ui.toast('Effort check: asking Haiku…')
  try {
    const verdict = await $.model.classify(effortCheckText(level, stats), ['lower', 'keep', 'raise'], { model: 'haiku' })
    const at = await $.clock.now()
    await update($, autopilot, x => ({ ...x, check: { verdict: verdict ?? 'no answer', at } }))
    $.ui.toast(`Effort check (Haiku): ${verdict ?? 'no clear answer'} (now ${level})`)
  } catch (err) {
    $.ui.toast(`Effort check failed: ${String(err).slice(0, 80)}`)
  }
  return {}
}

/** The pane's Autopilot hint line, when hints are on. */
async function currentHint($: EngineInterface, options: PluginOptions): Promise<string | null> {
  if (!(await partOn($, 'hints'))) return null
  const a = await read($, autopilot)
  if (!isOn(a)) return null
  return effortHint(await read($, effort), effortStats(a.steps, a.calls))
}

// Called from the hooks in `register`: Claude Code takes one unmatched hook per
// event per plugin, so Autopilot's per-event work runs inside them.

async function apSessionStart($: EngineInterface, options: PluginOptions) {
  // The choice made in the pane (or by /hud autopilot) carries to new sessions.
  const remembered = (await read($, view)).autopilot
  if (typeof remembered === 'boolean' && (await read($, autopilot)).override === null) {
    await update($, autopilot, x => ({ ...x, override: remembered }))
  }
  const a = await read($, autopilot)
  if (isOn(a) && a.highWater === 0 && a.last === null) await seed($)
}

async function apSessionEnd($: EngineInterface, reason: string) {
  if (reason === 'clear' || reason === 'resume') await resetConversation($)
}

/** After a main-loop request: step stats (always, for hints) and crossings (when on). */
async function apStep($: EngineInterface, options: PluginOptions, ms: number, out: number) {
  await update($, autopilot, a => ({ ...a, steps: [...a.steps, { ms, out }].slice(-STATS_KEEP) }))
  const a = await read($, autopilot)
  if (!isOn(a)) return
  const u = (await $.session.usage()).context
  if (u.percent === undefined || u.tokens === undefined) return
  const t = crossing(u.percent, a.highWater)
  if (t === null) return
  const text = noticeText(t, u.percent, u.tokens, u.window)
  const percent = u.percent
  await update($, autopilot, x => ({ ...x, highWater: t, pending: text, last: { text, delivered: false, threshold: t, percent } }))
}

/**
 * After a main-loop tool call: call stats for hints, then the pending notice
 * appended to the result when Autopilot is on. Otherwise `r` comes back as is.
 */
async function apToolResult<R extends ToolCallResult>(
  $: EngineInterface,
  options: PluginOptions,
  tool: string,
  input: unknown,
  r: R,
): Promise<R> {
  const isError = r.deny !== undefined || r.isError === true
  const key = callKey(tool, input)
  await update($, autopilot, a => ({ ...a, calls: [...a.calls, { key, isError }].slice(-STATS_KEEP) }))
  if (r.deny !== undefined) return r
  const notice = await takeNotice($, options)
  return notice ? { ...r, context: [...(r.context ?? []), notice] } : r
}

/** The pending notice, marked delivered, when Autopilot is on and one waits; else null. */
async function takeNotice($: EngineInterface, options: PluginOptions): Promise<string | null> {
  const a = await read($, autopilot)
  if (!isOn(a) || !a.pending) return null
  const notice = a.pending
  await update($, autopilot, x => ({ ...x, pending: null, last: x.last && { ...x.last, delivered: true } }))
  return notice
}

/** The hooks only Autopilot has: the spawn backstop, turn-start delivery, the compaction guard. */
function registerAutopilot(on: On, options: PluginOptions) {
  const delivery = options.noticeDelivery === 'tool+turn' ? 'tool+turn' : 'tool'
  const backstopAt = backstopPercent(options)

  // Spawn backstop: deny new Agent calls above the backstop percent.
  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    if (e.agentId || !(await partOn($, 'backstop'))) return next(e)
    if (!isOn(await read($, autopilot))) return next(e)
    const pct = await percentNow($)
    if (pct !== null && pct >= backstopAt) return { deny: backstopText(pct, backstopAt) }
    return next(e)
  })

  // Notice delivery with the next turn's start, in tool+turn mode.
  on('prompt.submit', async ($, e, next) => {
    if (delivery !== 'tool+turn') return next(e)
    const notice = await takeNotice($, options)
    if (!notice) return next(e)
    return next({ ...e, context: [...(e.context ?? []), notice] })
  })

  // Compaction guard: skip automatic compaction above the backstop percent;
  // never a manual /compact. A compaction that happens resets the mark.
  on('session.compact', async ($, e, next) => {
    if (e.agentId) return next(e)
    const a = await read($, autopilot)
    if (isOn(a) && e.trigger === 'auto' && (await partOn($, 'guard'))) {
      const pct = await percentNow($)
      if (pct !== null && pct >= backstopAt) return { skip: guardText(pct, backstopAt) }
    }
    const r = await next(e)
    if (r.messages !== undefined) {
      await update($, autopilot, x => ({ ...x, highWater: 0, pending: null }))
      sceneMark = -1
      sceneEvent('compaction')
    }
    return r
  })
}

// ---------------------------------------------------------------------------
// Themes: how the pane looks. Observe-only: the scene follows the session's
// events and draws; it never changes them.
// ---------------------------------------------------------------------------

/** Pane tabs for a scene theme, and the sections each information tab shows. */
const TABS: { id: string; label: string; only?: string[] }[] = [
  { id: 'quest', label: 'Quest' },
  { id: 'cost', label: 'Cost', only: ['Model', 'Context', 'Cost', 'Next message', 'Tokens'] },
  { id: 'tools', label: 'Tools', only: ['Tool calls', 'Files'] },
  { id: 'limits', label: 'Limits', only: ['Limits', 'Autopilot'] },
  { id: 'about', label: 'About' },
]

const SCENE_MAX_COLUMNS = 96
/** Queued events older than this are dropped, in seconds. */
const EVENT_MAX_AGE_S = 5

let sceneActivity: ActivityState = 'idle'
let sceneTick = 0
let sceneCols = 0
let sceneHasScene = false
let sceneQueue: QueuedEvent[] = []
let scenePlaying: PlayingEvent | null = null
let sceneLog: LogLine[] = []
/** What the log showed at the last draw, to redraw when a line comes or goes. */
let sceneLogShown = ''
let animTimer: Timer | null = null
let animBusy = false
let lastIdentity: { hero: HeroTier; weapon: WeaponTier } | null = null
let sceneMark = -1
let coldSent = false
let limitsOver: Set<string> | null = null
let preview: PreviewStep[] = []
let paletteMode: 'dark' | 'light' = 'dark'
/** Picked on the About tab: the hero and weapon the scene shows instead of the session's own. Display only. */
let tryHero: HeroTier | null = null
let tryWeapon: WeaponTier | null = null
const loggedMissing = new Set<string>()

function fps(options: PluginOptions): number {
  return Math.min(8, Math.max(2, Number(options.themeFps) || 6))
}

/** Queues a one-shot for the scene; nothing queues while no scene is animating. */
function sceneEvent(name: EventName, vars: Record<string, string> = {}) {
  if (!animTimer) return
  sceneQueue.push({ name, at: sceneTick, vars })
  if (sceneQueue.length > 20) sceneQueue.shift()
}

function themeOf(v: View): string {
  return themeId(v.theme ?? 'default') ?? 'default'
}

async function activeTheme($: EngineInterface, options: PluginOptions): Promise<Theme> {
  const id = themeOf(await read($, view))
  const { theme, missing } = resolveTheme(id)
  if (missing.length && !loggedMissing.has(id)) {
    loggedMissing.add(id)
    $.ui.toast(`Theme ${theme.name}: ${missing.length} slot(s) fell back to default (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''})`)
  }
  return theme
}

async function sceneState($: EngineInterface, options: PluginOptions): Promise<SceneState> {
  const snap = await read($, snapshot)
  const a = await read($, autopilot)
  const hero = tryHero ?? heroTier(snap?.model ?? null)
  const weapon = tryWeapon ?? weaponTier(await read($, effort))
  const c = await cacheNow($, options)
  return {
    tick: sceneTick,
    hero,
    weapon,
    activity: sceneActivity,
    percent: snap?.percent ?? 0,
    overkill: options.overkillHint !== false && isOverkill(hero, weapon, isRoutine(a.calls)),
    cacheCold: c.isCold,
    stamina: c.frac,
    staminaSeconds: c.left === null ? null : Math.max(0, c.left / 1000),
    nextWarmUsd: c.floors?.warm ?? null,
    nextColdUsd: c.floors?.cold ?? null,
    event: scenePlaying,
  }
}

async function meterData(
  $: EngineInterface,
  options: PluginOptions,
  theme: Theme,
  log: string[],
  fallback: string | null,
): Promise<MeterData | null> {
  const snap = await read($, snapshot)
  if (!snap) return null
  const cost = await read($, turn)
  const level = await read($, effort)
  const now = await $.clock.now()
  const c = await cacheNow($, options)
  const spec = theme.scene
  return {
    percent: snap.percent ?? 0,
    tokens: snap.tokens,
    window: snap.window,
    spendUsd: snap.costUsd,
    lastUsd: cost.lastUsd,
    cacheLeft: c.left,
    nextWarmUsd: c.floors?.warm ?? null,
    nextColdUsd: c.floors?.cold ?? null,
    limits: snap.rateLimits.map(r => ({ label: rateLabel(r.kind), percent: r.percentUsed, resets: r.resetsAt ? fmtReset(r.resetsAt, now) : null })),
    heroName: spec ? spec.heroNames[tryHero ?? heroTier(snap.model)] : prettyModel(snap.model),
    model: tryHero ? `${TIER_MODELS[tryHero]}, preview` : prettyModel(snap.model),
    weaponName: spec ? spec.weapons[tryWeapon ?? weaponTier(level)].name : (level ?? ''),
    effort: tryWeapon ? `${tryWeapon}, preview` : level,
    log,
    fallback,
  }
}

async function barState($: EngineInterface, options: PluginOptions): Promise<BarState> {
  const snap = await read($, snapshot)
  const s = await sceneState($, options)
  return {
    tick: sceneTick,
    percent: snap?.percent ?? 0,
    spend: Math.round((snap?.costUsd ?? 0) * 100),
    hero: s.hero,
    weapon: s.weapon,
    cacheSeconds: s.staminaSeconds,
    cacheFrac: s.stamina,
    nextWarmUsd: s.nextWarmUsd,
    limitMax: snap?.rateLimits.length ? Math.max(...snap.rateLimits.map(r => r.percentUsed)) : null,
  }
}

function stopAnim() {
  animTimer?.cancel()
  animTimer = null
  sceneQueue = []
  scenePlaying = null
  preview = []
}

function startAnim($: EngineInterface, options: PluginOptions) {
  if (animTimer) return
  animTimer = $.clock.every(Math.round(1000 / fps(options)), () => void animate($, options))
}

/** One animation tick: advance the event queue, draw the frame, blit it. */
async function animate($: EngineInterface, options: PluginOptions) {
  if (animBusy) return
  animBusy = true
  try {
    sceneTick += 1
    const theme = await activeTheme($, options)
    if (!theme.scene || !sceneCols) return

    const playing = scenePlaying
    const stepped = stepScene(
      theme,
      { tick: sceneTick, activity: sceneActivity, playing: scenePlaying, queue: sceneQueue, preview },
      EVENT_MAX_AGE_S * fps(options),
    )
    sceneActivity = stepped.activity
    scenePlaying = stepped.playing
    sceneQueue = stepped.queue
    preview = stepped.preview

    // A moment that just began goes on the log: its message, else its line.
    const now = await $.clock.now()
    if (scenePlaying && scenePlaying !== playing) {
      const ev = scenePlaying
      const template = hasMessage(theme, ev.name) ? ev.name : theme.text[ev.name]
      sceneLog = pushLog(sceneLog, fill(theme, template, ev.vars), now)
    }
    const shown = liveLog(sceneLog, now).join('\n')
    if (shown !== sceneLogShown) {
      sceneLogShown = shown
      $.ui.invalidate('ui.render')
    }

    // Idle runs at a third of the rate.
    if (sceneActivity === 'idle' && !scenePlaying && !preview.length && sceneTick % 3 !== 0) return

    if (sceneHasScene) {
      const scene = renderScene(theme, await sceneState($, options), sceneCols)
      if (scene) {
        const r = await $.ui.blit({ requestId: PANE, key: 'scene', cells: scene.cells })
        if (r.deny) {
          stopAnim()
          return
        }
        if (scene.caption) {
          sceneLog = pushLog(sceneLog, scene.caption, now)
          const shownNow = liveLog(sceneLog, now).join('\n')
          if (shownNow !== sceneLogShown) {
            sceneLogShown = shownNow
            $.ui.invalidate('ui.render')
          }
        }
      }
    }
    const bar = renderBar(theme, await barState($, options), sceneCols)
    if (bar) {
      const r = await $.ui.blit({ requestId: PANE, key: 'bar', cells: bar.cells })
      if (r.deny) stopAnim()
    }
  } finally {
    animBusy = false
  }
}

/** Scene events from the session's own data: identity changes and context milestones. */
async function sceneAfterStep($: EngineInterface, options: PluginOptions, model: string, effortLevel: string | null) {
  const identity = { hero: heroTier(model), weapon: weaponTier(effortLevel) }
  const spec = THEMES[themeOf(await read($, view))]?.scene
  if (lastIdentity) {
    if (identity.hero !== lastIdentity.hero) sceneEvent('modelChange', { name: spec ? spec.heroNames[identity.hero] : prettyModel(model) })
    if (identity.weapon !== lastIdentity.weapon) sceneEvent('effortChange', { weapon: spec ? spec.weapons[identity.weapon].name : String(effortLevel) })
  }
  lastIdentity = identity
  const pct = (await $.session.usage()).context.percent
  if (pct === undefined) return
  if (sceneMark < 0) sceneMark = thresholdAt(pct)
  const t = crossing(pct, sceneMark)
  if (t !== null) {
    sceneMark = t
    const th = thresholds(options)
    sceneEvent('milestone', { pct: String(t), level: level(t, th.warn, th.alert, th.critical, th.orange) })
  }
}

/** Limits crossing the caution level raise the scene's warning once per crossing. */
function sceneLimits(rateLimits: Snapshot['rateLimits']) {
  const over = new Set(rateLimits.filter(r => r.percentUsed >= LIMIT_LEVELS.caution).map(r => r.kind))
  if (limitsOver) {
    for (const r of rateLimits) {
      if (over.has(r.kind) && !limitsOver.has(r.kind)) {
        sceneEvent('limitWarning', { name: rateLabel(r.kind).toUpperCase(), pct: String(Math.round(r.percentUsed)) })
      }
    }
  }
  limitsOver = over
}

async function themeCommand($: EngineInterface, sub: string, options: PluginOptions) {
  if (!sub) {
    const active = (await activeTheme($, options)).id
    $.ui.toast(`Themes: ${Object.values(THEMES).map(t => (t.id === active ? `${t.id} (active)` : t.id)).join(', ')}`)
    return {}
  }
  if (sub === 'preview') {
    const theme = await activeTheme($, options)
    if (!theme.scene) {
      const scenes = Object.values(THEMES).filter(t => t.scene).map(t => t.id)
      $.ui.toast(`${theme.name} has no scene to preview; try /hud theme ${scenes.join(', ')}`)
      return {}
    }
    await setView($, v => ({ ...v, tab: 'quest' }))
    if (!(await $.ui.panes()).some(p => p.id === PANE)) {
      const opened = await openPane($)
      if (!opened.isPlaced) return { text: 'Widen the terminal to preview the theme.' }
    }
    const f = fps(options)
    preview = [
      ...ACTIVITY_STATES.map(name => ({ kind: 'state' as const, name, ticks: f * 3 })),
      ...EVENT_NAMES.map(name => ({ kind: 'event' as const, name, ticks: duration(theme.events[name]) + 2 })),
    ]
    $.ui.toast(`Previewing ${theme.name}: every state, then every event`)
    return {}
  }
  const id = themeId(sub)
  if (!id) {
    $.ui.toast(`No theme "${sub}". Themes: ${Object.keys(THEMES).join(', ')}`)
    return {}
  }
  await setTheme($, id)
  return {}
}

async function setTheme($: EngineInterface, id: string) {
  stopAnim()
  await setView($, v => ({ ...v, theme: id }))
  $.ui.invalidate('ui.render')
  $.ui.toast(`Theme: ${THEMES[id]?.name ?? id}`)
}

export const register: Register = (on, options) => {
  const mult = multiplier(options)
  const spendLimit = Number(options.spendLimitUsd) || 0

  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({
      name: 'hud',
      description: 'Save Point: toggle the pane (or: band, show, hide, theme, reset, prices, text, autopilot, effort-check)',
    })
    const pal = String(options.themePalette ?? 'auto')
    if (pal === 'light' || pal === 'dark') paletteMode = pal
    else {
      try {
        const theme = String((await $.settings.read()).theme ?? '')
        paletteMode = theme.includes('light') ? 'light' : 'dark'
      } catch {
        paletteMode = 'dark'
      }
    }
    await restoreView($)
    await restoreClock($, ttlInUse(options, (await read($, cache)).detected).ttl)
    if ((await read($, tokens)).since === null) {
      const since = await $.clock.now()
      await update($, tokens, t => ({ ...t, since }))
    }
    await backfill($)
    await apSessionStart($, options)
    await refresh($)
    tickTimer?.cancel()
    tickTimer = $.clock.every(1000, () => void tick($, options))
    if ((await read($, view)).pane && (await $.session.surfaces()).length) {
      void $.ui.open({ id: PANE, title: 'Save Point' })
    }
    return r
  })

  on('ui.close', async ($, e, next) => {
    const r = await next(e)
    if (e.id === PANE) stopAnim()
    if (e.id === PANE && e.origin.kind === 'person') await setView($, v => ({ ...v, pane: false }))
    return r
  })

  on('session.measure', async ($, e, next) => {
    const r = await next(e)
    await refresh($)
    return r
  })

  on('session.end', async ($, e, next) => {
    const r = await next(e)
    await apSessionEnd($, e.reason)
    // Neither starts a session again: a /clear leaves an empty conversation,
    // a resume another one, read once it is in place (`afterReplaced`).
    if (e.reason === 'clear' || e.reason === 'resume') {
      replacedFrom = e.sessionId
      sceneMark = -1
      sceneActivity = 'idle'
      warmUntil = 0
      mainSteps = []
      agentSteps = []
      await resetCounters($)
      await update($, cache, c => ({ ...c, lastReqAt: null }))
      await update($, turn, () => ({ startUsd: null, lastUsd: null }))
      await update($, history, () => [])
      await update($, calibration, () => ({ predicted: null, state: null, actual: null }))
      await refresh($)
    }
    return r
  })

  on('turn.start', async ($, e, next) => {
    await afterReplaced($, options, true)
    sceneActivity = 'thinking'
    mainSteps = []
    agentSteps = []
    const u = await $.session.usage()
    await update($, turn, t => ({ ...t, startUsd: u.cost?.usd ?? null }))

    // Predict this turn's floor now, to compare with its first request.
    const c = await cacheNow($, options)
    const f = c.floors
    if (f && c.left !== null) {
      const state: Calibration['state'] = c.isWarm ? 'warm' : 'cold'
      await update($, calibration, () => ({ predicted: c.isWarm ? f.warm : f.cold, state, actual: null }))
    } else {
      await update($, calibration, () => ({ predicted: null, state: null, actual: null }))
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const startedAt = await $.clock.now()
    const result = yield* next(e)
    const usage = result?.usage
    if (usage) {
      ;(e.agentId ? agentSteps : mainSteps).push(usage)
      await addTokens($, Boolean(e.agentId), usage)
    }
    if (!e.agentId) {
      const clock = await read($, cache)
      const { ttl } = ttlInUse(options, clock.detected)
      if (e.index === 0 && usage) {
        const price = priceFor(usage.model, mult)
        if (price) await update($, calibration, c => (c.predicted === null ? c : { ...c, actual: inputCost(price, usage, ttl) }))
      }
      await markRequest($, startedAt, ttl)
      await apStep($, options, (await $.clock.now()) - startedAt, usage?.output_tokens ?? 0)
      if (e.effort !== undefined) {
        const lv = typeof e.effort === 'number' ? String(e.effort) : e.effort
        await update($, effort, () => lv)
      }
      await sceneAfterStep($, options, usage?.model ?? e.model, await read($, effort))
    }
    await refresh($)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId) return r
    sceneActivity = 'idle'
    if (e.reason === 'answer') sceneEvent('turnComplete')
    const u = await $.session.usage()
    const t = await read($, turn)
    const now = u.cost?.usd ?? null
    if (now !== null && t.startUsd !== null) {
      const delta = now - t.startUsd
      await update($, turn, x => ({ ...x, lastUsd: delta }))
      const found = detectTtl(delta, mainSteps, agentSteps, mult)
      if (found) await update($, cache, c => ({ ...c, detected: found }))
    }
    if (u.context.tokens !== undefined) {
      const tokensNow = u.context.tokens
      await update($, history, h => [...h, tokensNow].slice(-HISTORY_KEEP))
    }
    await refresh($)
    return r
  })

  on('tool.call', async ($, e, next) => {
    if (!e.agentId) {
      const name = String(e.tool)
      await update($, activity, a => ({ ...a, tools: { ...a.tools, [name]: (a.tools[name] ?? 0) + 1 } }))
      if (e.tool === 'Read') await addFile($, 'read', e.file_path)
      else if (e.tool === 'Write' || e.tool === 'Edit') await addFile($, 'written', e.file_path)
      else if (e.tool === 'NotebookEdit') await addFile($, 'written', e.notebook_path)
      sceneActivity = activityFor(String(e.tool))
    }
    const r = await next(e)
    await refresh($)
    if (e.agentId) return r
    sceneEvent(r.deny !== undefined || r.isError === true ? 'toolError' : 'toolSuccess')
    sceneActivity = 'thinking'
    const { tool_use_id: _id, agentId: _agent, ...input } = e as Record<string, unknown>
    return apToolResult($, options, String(e.tool), input, r)
  })

  on('agent.spawn', async ($, e, next) => {
    sceneActivity = 'agents'
    await update($, activity, a => ({ ...a, spawns: a.spawns + 1 }))
    return next(e)
  })

  on('command.run', { command: 'hud' }, async ($, e) => {
    const [arg = '', sub = ''] = e.args.trim().toLowerCase().split(/\s+/)
    const hasSurface = (await $.session.surfaces()).length > 0

    if (arg === 'reset') {
      await resetCounters($)
      $.ui.toast('Save Point counters reset')
      return {}
    }
    if (arg === 'autopilot') return autopilotCommand($, sub, options)
    if (arg === 'theme') return themeCommand($, sub, options)
    if (arg === 'effort-check') return effortCheckCommand($, options)
    if (arg === 'prices') return { text: pricesText(options, (await read($, snapshot))?.model ?? null) }
    if (arg === 'text' || !hasSurface) return { text: await paneText($, options) }

    if (arg === 'band') {
      const modes: Record<string, BandMode> = { full: 'full', on: 'full', compact: 'compact', off: 'hidden', hide: 'hidden' }
      const asked = modes[sub]
      if (sub && !asked) return { text: 'Usage: /hud band [full | compact | off]' }
      const { band } = await setView($, v => ({ ...v, band: asked ?? (v.band === 'full' ? 'compact' : 'full') }))
      $.ui.toast(`Save Point band: ${band === 'hidden' ? 'off' : band}`)
      return {}
    }
    if (arg === 'show') {
      await setView($, v => ({ ...v, band: 'full' }))
      const opened = await openPane($)
      return opened.isPlaced ? {} : { text: await paneText($, options) }
    }
    if (arg === 'hide') {
      await setView($, v => ({ ...v, band: 'compact' }))
      await closePane($)
      return {}
    }
    if (arg) return { text: 'Usage: /hud [band [full|compact|off] | show | hide | theme [name|preview] | reset | prices | text | autopilot [on|off] | effort-check]' }

    const opened = await togglePane($)
    if (opened && !opened.isPlaced) return { text: await paneText($, options) }
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const table = $.ui.resolve(e)
    const { Box, Button, Text } = table
    const g = await gather($, options)
    if (!g) return <Text dimColor>Waiting for the first response…</Text>
    const theme = await activeTheme($, options)
    const v = await read($, view)
    const width = e.props.bodyColumns
    const rows = e.props.scroll.bodyRows

    const drawLines = (lines: Run[][], prefix: string) =>
      lines.map((line, i) => (
        <Box key={`${prefix}${i}`} flexDirection="row">
          {line.length ? (
            line.map((r, j) => (
              <Text key={`r${j}`} color={r.color} dimColor={r.dim} bold={r.bold} italic={r.italic} inverse={r.inverse} wrap="truncate">
                {r.text}
              </Text>
            ))
          ) : (
            <Text> </Text>
          )}
        </Box>
      ))

    // The theme picker, on every surface that draws a Select.
    const picker =
      'Select' in table ? (
        <table.Select
          key="theme"
          label="Theme"
          options={Object.values(THEMES).map(t => ({ value: t.id, label: t.name }))}
          value={theme.id}
          onSelect={value => void setTheme($, value)}
        />
      ) : null

    // Autopilot: one button for the whole, one per part beside its name; a press flips it.
    // Every choice is remembered for new sessions.
    const ap = await autopilotInfo($, options)
    const apOn = ap.on
    const lastNotice = ap.last ? `last: ${noticeSummary(ap.last)}, ${ap.last.delivered ? 'delivered' : 'waiting'}` : null
    const toggle = (key: string, active: boolean, flip: () => void) => (
      <Button key={key} label={active ? 'ON ' : 'OFF'} variant={active ? 'primary' : 'secondary'} dimColor={!active} onPress={flip} />
    )
    const partRow = (key: string, partIsOn: boolean, name: string, what: string[], flip?: () => void) => (
      <Box key={key} flexDirection="column">
        <Box flexDirection="row">
          {flip ? toggle(`${key}-btn`, partIsOn, flip) : <Text dimColor={!apOn}>{apOn ? '[ ON  ]' : '[ on* ]'}</Text>}
          <Text bold={partIsOn && apOn} dimColor={!apOn}>{` ${name}`}</Text>
        </Box>
        {what.map((line, i) => (
          <Text key={`${key}-w${i}`} dimColor>{`        ${line}`}</Text>
        ))}
      </Box>
    )
    const apBlock = (
      <Box key="ap" flexDirection="column">
        <Box flexDirection="row">
          <Text bold>{theme.headings.Autopilot ?? 'Autopilot'} </Text>
          {toggle('ap-main', apOn, () => void setAutopilot($, !apOn))}
          <Text dimColor>{apOn ? '' : '  * parts wait for Autopilot to be on'}</Text>
        </Box>
        {AUTOPILOT_PARTS.map(({ id: part, ...p }) =>
          part === 'notices'
            ? partRow('ap-notices', true, p.name(ap.at), [
                ...p.what(ap.at),
                ...(apOn ? [ap.nextAt === null ? 'all sent' : `next at ${ap.nextAt}%`] : []),
                ...(apOn && lastNotice ? [lastNotice] : []),
              ])
            : partRow(`ap-${part}`, ap[part], p.name(ap.at), p.what(ap.at), () => void setPart($, part, !ap[part])),
        )}
        {apOn && ap.hint ? (
          <Box key="ap-hint" flexDirection="column">
            <Text> </Text>
            {/* Green: the effort fits; yellow: a change may help. */}
            <Text color={/nothing suggests a change/.test(ap.hint) ? 'success' : 'warning'}>{`        ${ap.hint}`}</Text>
          </Box>
        ) : null}
      </Box>
    )

    // The plain pane: no scene.
    if (!theme.scene) {
      stopAnim()
      return (
        <Box flexDirection="column">
          {picker}
          {drawLines(paneLines({ ...g, width, rows: picker ? rows - 1 : rows, skip: ['Autopilot'] }), 'l')}
          {apBlock}
        </Box>
      )
    }

    const tab = TABS.find(t => t.id === v.tab) ?? TABS[0]!
    const palette = theme.palette[paletteMode]
    const tabs = (
      <Box key="tabs" flexDirection="column">
        <Box flexDirection="row">
          {TABS.map(t => (
            <Button
              key={`tab-${t.id}`}
              label={t.label}
              variant={t.id === tab.id ? 'primary' : 'secondary'}
              onPress={() => void setView($, x => ({ ...x, tab: t.id }))}
            />
          ))}
        </Box>
        {picker}
      </Box>
    )

    if (tab.id === 'about') {
      stopAnim()
      const snap = await read($, snapshot)
      const current = { hero: heroTier(snap?.model ?? null), weapon: weaponTier(await read($, effort)) }
      const cols = Math.min(width, SCENE_MAX_COLUMNS)
      const lineup = 'Raster' in table && width >= 24 ? renderLineup(theme, cols, current) : null
      const spec = theme.scene
      const tryPickers =
        'Select' in table ? (
          <Box key="try" flexDirection="column">
            <table.Select
              key="try-hero"
              label="Preview hero"
              options={[
                { value: 'live', label: `Your session (${spec.heroNames[current.hero]})` },
                ...HERO_TIERS.map(t => ({ value: t, label: `${spec.heroNames[t]} (${TIER_MODELS[t]})` })),
              ]}
              value={tryHero ?? 'live'}
              onSelect={value => {
                tryHero = value === 'live' ? null : (value as HeroTier)
                $.ui.invalidate('ui.render')
              }}
            />
            <table.Select
              key="try-weapon"
              label="Preview weapon"
              options={[
                { value: 'live', label: `Your session (${spec.weapons[current.weapon].name})` },
                ...WEAPON_TIERS.map(t => ({ value: t, label: `${spec.weapons[t].name} (${t})` })),
              ]}
              value={tryWeapon ?? 'live'}
              onSelect={value => {
                tryWeapon = value === 'live' ? null : (value as WeaponTier)
                $.ui.invalidate('ui.render')
              }}
            />
            <Box flexDirection="row">
              <Button key="try-play" label="Play every scene on Quest" onPress={() => void themeCommand($, 'preview', options)} />
              {tryHero || tryWeapon ? (
                <Button
                  key="try-reset"
                  label="Back to my session"
                  variant="secondary"
                  onPress={() => {
                    tryHero = null
                    tryWeapon = null
                    $.ui.invalidate('ui.render')
                  }}
                />
              ) : null}
            </Box>
          </Box>
        ) : null
      return (
        <Box flexDirection="column">
          {tabs}
          {lineup && 'Raster' in table ? <table.Raster key="lineup" columns={lineup.columns} rows={lineup.rows} cells={lineup.cells} /> : null}
          {tryPickers}
          <Text> </Text>
          {drawLines(aboutLines(theme, palette, current), 'a')}
        </Box>
      )
    }

    if (tab.id !== 'quest') {
      stopAnim()
      const isLimits = tab.id === 'limits'
      const lines = paneLines({ ...g, width, rows: rows - (picker ? 3 : 2), only: tab.only, skip: isLimits ? ['Autopilot'] : undefined, headings: theme.headings })
      return (
        <Box flexDirection="column">
          {tabs}
          <Text> </Text>
          {drawLines(lines, 'l')}
          {isLimits ? apBlock : null}
        </Box>
      )
    }

    // The Quest tab: status bar, scene, themed meters.
    const hasRaster = 'Raster' in table
    const minCols = Number(options.sceneMinColumns) || 40
    const cols = Math.min(width, SCENE_MAX_COLUMNS)
    const canDraw = hasRaster && width >= minCols
    sceneHasScene = canDraw && rows >= sceneMinRows(theme, picker ? 2 : 1)
    sceneCols = canDraw ? cols : 0
    const fallback = canDraw && sceneHasScene ? null : theme.text[scenePlaying?.name ?? sceneActivity]
    const meters = await meterData($, options, theme, liveLog(sceneLog, await $.clock.now()), fallback)
    const lines = meters ? meterLines(theme, palette, meters, fmtClock, fmtTokens) : []

    const parts: RenderChildren[] = [tabs]
    if (canDraw && 'Raster' in table) {
      const Raster = table.Raster
      const bar = renderBar(theme, await barState($, options), cols)
      if (bar) parts.push(<Raster key="bar" columns={bar.columns} rows={BAR_ROWS} cells={bar.cells} />)
      if (sceneHasScene) {
        const scene = renderScene(theme, await sceneState($, options), cols)
        if (scene) parts.push(<Raster key="scene" columns={scene.columns} rows={scene.rows} cells={scene.cells} />)
      }
      startAnim($, options)
    } else {
      stopAnim()
    }
    return (
      <Box flexDirection="column">
        {parts}
        {drawLines(lines, 'm')}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const mode = (await read($, view)).band
    if (mode === 'hidden') return next(e)
    const snap = await read($, snapshot)
    if (!snap) return next(e)
    const act = await read($, activity)
    const toggle = '≡ '
    const shown = bandSegments({
      mode,
      snap,
      effort: await read($, effort),
      autopilot: isOn(await read($, autopilot)),
      tools: act.tools,
      spawns: act.spawns,
      lastUsd: (await read($, turn)).lastUsd,
      cache: await cacheNow($, options),
      now: await $.clock.now(),
      thresholds: thresholds(options),
      spendLimit,
      showRateLimits: options.showRateLimits !== false,
      showBash: options.showBash !== false,
      showSubagents: options.showSubagents !== false,
      priority: String(options.bandSegments ?? ''),
      columns: e.props.bodyColumns - toggle.length,
    })

    const { Box, Button, Text } = $.ui.resolve(e)
    const children: RenderChildren[] = [
      <Button key="pane" label="≡" plain dimColor onPress={() => void togglePane($)} />,
      <Text key="gap"> </Text>,
    ]
    shown.forEach((s, i) => {
      if (i) children.push(<Text key={`sep${i}`} dimColor>{SEPARATOR}</Text>)
      s.runs.forEach((r, j) =>
        children.push(
          <Text key={`${s.id}${j}`} color={r.color} dimColor={r.dim} bold={r.bold} inverse={r.inverse}>
            {r.text}
          </Text>,
        ),
      )
    })
    return <Box flexDirection="row">{children}</Box>
  })

  registerAutopilot(on, options)
}
