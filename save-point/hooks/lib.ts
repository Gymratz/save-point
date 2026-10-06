// Pure logic for Save Point: prices, cost math, formatting and band layout.
// No `$` here, so every function is testable on its own.

import type { Snapshot, Ttl } from '../types'

/** USD per million tokens. */
export type Price = {
  input: number
  output: number
  write5m: number
  write1h: number
  read: number
}

/** A price row from the input and output prices: writes at 1.25x (5m) and 2x (1h), reads at 0.1x unless given. */
function price(input: number, output: number, read = input * 0.1): Price {
  return { input, output, write5m: input * 1.25, write1h: input * 2, read }
}

/** Anthropic API list prices as of 2026-10-04. */
export const PRICES: Record<string, Price> = {
  'fable-5-1': price(10, 50, 0.25),
  'mythos-5-1': price(10, 50, 0.25),
  'fable-5': price(10, 50),
  'mythos-5': price(10, 50),
  'opus-5-5': price(4, 20, 0.2),
  'opus-5': price(5, 25),
  'opus-4-8': price(5, 25),
  'opus-4-7': price(5, 25),
  'opus-4-6': price(5, 25),
  'opus-4-5': price(5, 25),
  'opus-4-1': price(15, 75),
  'sonnet-5-5': price(2, 10),
  'sonnet-5': price(2, 10),
  'sonnet-4-6': price(3, 15),
  'sonnet-4-5': price(3, 15),
  'haiku-4-5': price(1, 5),
}

export const TTL_MS: Record<Ttl, number> = { '5m': 5 * 60_000, '1h': 60 * 60_000 }

/**
 * `claude-haiku-4-5-20251001` → `haiku-4-5`; `claude-opus-5-5[1m]` → `opus-5-5`;
 * cloud ids too: `us.anthropic.claude-opus-4-6-v1:0`, `claude-opus-4-5@20251101`.
 */
export function modelKey(id: string): string {
  return id
    .toLowerCase()
    .replace(/\[.*\]$/, '')
    .replace(/^([a-z]+\.)?anthropic\./, '')
    .replace(/^claude-/, '')
    .replace(/-v\d+(:\d+)?$/, '')
    .replace(/[-@]\d{8}$/, '')
}

/** `claude-opus-5-5` → `Opus 5.5`; `claude-opus-5` → `Opus 5`; unknown shapes come back as given. */
export function prettyModel(id: string): string {
  const m = /^([a-z]+)-(\d+)(?:-(\d+))?$/.exec(modelKey(id))
  const [, family = '', major, minor] = m ?? []
  if (!family) return id
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}${minor ? `.${minor}` : ''}`
}

export function priceFor(id: string, multiplier: number): Price | null {
  const base = PRICES[modelKey(id)]
  if (!base) return null
  return {
    input: base.input * multiplier,
    output: base.output * multiplier,
    write5m: base.write5m * multiplier,
    write1h: base.write1h * multiplier,
    read: base.read * multiplier,
  }
}

export type StepUsage = {
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

export function stepCost(p: Price, u: StepUsage, ttl: Ttl): number {
  const write = ttl === '1h' ? p.write1h : p.write5m
  return (
    (u.input_tokens * p.input +
      u.output_tokens * p.output +
      u.cache_read_input_tokens * p.read +
      u.cache_creation_input_tokens * write) /
    1e6
  )
}

/** How close a billed delta must come to a candidate's cost to count as that TTL. */
const TTL_TOLERANCE = 0.015

/**
 * Which main-loop TTL explains a billed cost delta: main steps priced at each
 * candidate, subagent steps at 5m (their observed TTL). Null when neither fits
 * within 1.5%, when too little was written to the cache, or when the two
 * candidates' costs are too close for the fit to tell them apart (a large
 * context re-read with a small write: one delta would fit both).
 */
export function detectTtl(
  deltaUsd: number,
  main: StepUsage[],
  agents: StepUsage[],
  multiplier: number,
): Ttl | null {
  const written = main.reduce((n, u) => n + u.cache_creation_input_tokens, 0)
  if (written < 500) return null
  const sum = (steps: StepUsage[], ttl: Ttl) => {
    let total = 0
    for (const u of steps) {
      const p = priceFor(u.model, multiplier)
      if (!p) return null
      total += stepCost(p, u, ttl)
    }
    return total
  }
  const agentCost = sum(agents, '5m')
  const hour = sum(main, '1h')
  const minutes = sum(main, '5m')
  if (agentCost === null || hour === null || minutes === null) return null
  const predicted = { '1h': hour + agentCost, '5m': minutes + agentCost }
  if (predicted['1h'] - predicted['5m'] <= 2 * TTL_TOLERANCE * predicted['1h']) return null
  for (const ttl of ['1h', '5m'] as const) {
    if (predicted[ttl] > 0 && Math.abs(deltaUsd - predicted[ttl]) / predicted[ttl] < TTL_TOLERANCE) return ttl
  }
  return null
}

/**
 * What one turn's verdict does to the TTL in use. A verdict that agrees with
 * it settles it; one that would change it (from the detected value, or from
 * the 1h assumed before any) waits as `pending` for the next verdict to agree,
 * so a single turn whose cost happened to fit the other TTL changes nothing.
 * A turn without a verdict leaves both as they are.
 */
export function confirmTtl(detected: Ttl | null, pending: Ttl | null, found: Ttl | null): { detected: Ttl | null; pending: Ttl | null } {
  if (!found) return { detected, pending }
  if (found === (detected ?? '1h')) return { detected: found, pending: null }
  return pending === found ? { detected: found, pending: null } : { detected, pending: found }
}

/** Minimum cost of the next message: context re-read (warm) or re-written (cold). */
export function floors(p: Price, contextTokens: number, ttl: Ttl) {
  const write = ttl === '1h' ? p.write1h : p.write5m
  return {
    warm: (contextTokens * p.read) / 1e6,
    cold: (contextTokens * write) / 1e6,
  }
}

/** 850 · 9.3k · 117k · 1M · 1.2M */
export function fmtTokens(n: number): string {
  if (n < 1000) return String(Math.round(n))
  if (n < 10_000) return `${trim1(n / 1000)}k`
  if (n < 999_500) return `${Math.round(n / 1000)}k`
  return `${trim1(n / 1e6)}M`
}

function trim1(x: number): string {
  return x.toFixed(1).replace(/\.0$/, '')
}

/** $0.02 · $1.70 · $142 · <$0.01 */
export function fmtUsd(n: number): string {
  if (n > 0 && n < 0.005) return '<$0.01'
  if (n >= 100) return `$${Math.round(n)}`
  return `$${n.toFixed(2)}`
}

/** 52:10, 2:05, 0:00 */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const RATE_LABELS: Record<string, string> = {
  five_hour: '5h',
  seven_day: 'week',
  seven_day_opus: 'week Opus',
  seven_day_sonnet: 'week Sonnet',
  spend_limit: 'spend',
}

export function rateLabel(kind: string): string {
  return RATE_LABELS[kind] ?? kind.replace(/_/g, ' ')
}

/** Reset time in local time: `4:10pm` within a day, `Wed 12am` beyond. */
export function fmtReset(iso: string, now: number): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  const h = at.getHours()
  const m = at.getMinutes()
  const time = `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`
  if (at.getTime() - now < 24 * 3600_000) return time
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][at.getDay()]} ${time}`
}

/** A bar of `width` cells, filled with eighth blocks. */
export function bar(percent: number, width: number): string {
  const eighths = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width * 8)
  const full = Math.floor(eighths / 8)
  const part = eighths % 8
  const partial = part ? ' ▏▎▍▌▋▊▉'[part] : ''
  return '█'.repeat(full) + partial + '░'.repeat(width - full - (part ? 1 : 0))
}

/** What a tool call does, for the band's counters and the scene's activity. */
export type ToolKind = 'read' | 'write' | 'edit' | 'shell' | 'agents'

/** Every tool Save Point sorts; others count nowhere (the scene keeps thinking). */
export const TOOL_KINDS: Readonly<Record<string, ToolKind>> = {
  Read: 'read',
  Glob: 'read',
  Grep: 'read',
  WebFetch: 'read',
  WebSearch: 'read',
  ToolSearch: 'read',
  LSP: 'read',
  Write: 'write',
  Edit: 'edit',
  MultiEdit: 'edit',
  NotebookEdit: 'edit',
  Bash: 'shell',
  PowerShell: 'shell',
  Monitor: 'shell',
  Agent: 'agents',
  SendMessage: 'agents',
  Workflow: 'agents',
}

export function toolKind(tool: string): ToolKind | null {
  return Object.hasOwn(TOOL_KINDS, tool) ? (TOOL_KINDS[tool] ?? null) : null
}

/** Calls of one kind in a tool-name tally. */
export function countKind(tools: Record<string, number>, kind: ToolKind): number {
  return Object.entries(tools).reduce((n, [name, count]) => n + (toolKind(name) === kind ? count : 0), 0)
}

/** Rate limit levels, in percent used: amber from `caution`, red from `danger`. */
export const LIMIT_LEVELS = { caution: 70, danger: 90 } as const

/** A rate limit's level (`ok`, `warn` from caution, `alert` from danger). */
export function limitLevel(percent: number): Level {
  return level(percent, LIMIT_LEVELS.caution, LIMIT_LEVELS.danger)
}

/** One styled run of text inside a segment. */
export type Run = { text: string; color?: string; dim?: boolean; bold?: boolean; inverse?: boolean; italic?: boolean }

export type Segment = { id: string; runs: Run[] }

export const SEPARATOR = ' │ '

export function segmentWidth(s: Segment): number {
  return s.runs.reduce((n, r) => n + [...r.text].length, 0)
}

/**
 * Keeps the segments that fit in `columns`, dropping from the end of
 * `priority` first, and returns them in display order.
 */
export function fitSegments(
  segments: Segment[],
  priority: string[],
  order: string[],
  columns: number,
): Segment[] {
  const byId = new Map(segments.map(s => [s.id, s]))
  const kept = priority.filter(id => byId.has(id))
  const width = (ids: string[]) =>
    ids.reduce((n, id) => n + segmentWidth(byId.get(id)!), 0) +
    Math.max(0, ids.length - 1) * SEPARATOR.length
  while (kept.length > 1 && width(kept) > columns) kept.pop()
  return order.filter(id => kept.includes(id)).map(id => byId.get(id)!)
}

/** Parses the `bandSegments` option; unknown names are ignored. */
export function parseSegments(option: string, known: readonly string[]): string[] {
  const ids = option
    .split(',')
    .map(s => s.trim())
    .filter(s => known.includes(s))
  return ids.length ? [...new Set(ids)] : [...known]
}

export type Level = 'ok' | 'warn' | 'orange' | 'alert' | 'critical'

/**
 * Which band a percent falls in: yellow from `warn`, orange from `orange`,
 * red from `alert`, inverse red from `critical`. Omitted bands never apply.
 */
export function level(percent: number, warn: number, alert: number, critical = Infinity, orange = Infinity): Level {
  if (percent >= critical) return 'critical'
  if (percent >= alert) return 'alert'
  if (percent >= orange) return 'orange'
  if (percent >= warn) return 'warn'
  return 'ok'
}

/** Colors per level; `critical` also draws inverse. */
export const LEVEL_COLOR: Record<Level, string> = {
  ok: 'success',
  warn: 'warning',
  orange: '#ff8700',
  alert: 'error',
  critical: 'error',
}

/** ▁▂▃▅▇ scaled from 0 to `max` (the series' own max when omitted). */
export function sparkline(values: number[], max = Math.max(...values, 1)): string {
  return values.map(v => '▁▂▃▄▅▆▇█'[Math.min(7, Math.max(0, Math.floor((v / Math.max(1, max)) * 7.999)))]).join('')
}

/** What a request's input side cost: uncached input, cache reads and writes; no output. */
export function inputCost(p: Price, u: StepUsage, ttl: Ttl): number {
  return stepCost(p, { ...u, output_tokens: 0 }, ttl)
}

// ---------------------------------------------------------------------------
// The cache clock
// ---------------------------------------------------------------------------

export type CacheInfo = {
  /** Milliseconds of warm cache left: null when unknown, 0 or less once cold. */
  left: number | null
  /** The share of the TTL left (0..1), or null when unknown. */
  frac: number | null
  /** The cache is known warm. */
  isWarm: boolean
  /** The cache is known cold (it was warm and the TTL ran out). */
  isCold: boolean
  /** Next-message floors, USD; null without a price or a token count. */
  floors: { warm: number; cold: number } | null
}

/** Where the main loop's prompt cache stands at `now`, and what the next message costs. */
export function cacheInfo(o: { lastReqAt: number | null; ttl: Ttl; now: number; price: Price | null; tokens: number | null }): CacheInfo {
  const left = o.lastReqAt === null ? null : o.lastReqAt + TTL_MS[o.ttl] - o.now
  return {
    left,
    frac: left === null ? null : Math.max(0, Math.min(1, left / TTL_MS[o.ttl])),
    isWarm: left !== null && left > 0,
    isCold: left !== null && left <= 0,
    floors: o.price && o.tokens !== null ? floors(o.price, o.tokens, o.ttl) : null,
  }
}

// ---------------------------------------------------------------------------
// The band above the prompt
// ---------------------------------------------------------------------------

/** Band segment ids, in display order. */
export const BAND_ORDER = ['model', 'ctx', 'session', 'last', 'next', 'limits', 'tools'] as const

/** The `bandSegments` option when it is left blank: most important first. */
export const BAND_PRIORITY = 'ctx,next,model,session,last,limits,tools'

/** The countdown turns amber inside this window. */
export const WARN_MS = 3 * 60_000

export type BandInput = {
  mode: 'full' | 'compact'
  snap: Snapshot
  effort: string | null
  autopilot: boolean
  /** Main-loop tool calls by name, and subagents spawned. */
  tools: Record<string, number>
  spawns: number
  lastUsd: number | null
  cache: CacheInfo
  now: number
  thresholds: { warn: number; orange: number; alert: number; critical: number }
  spendLimit: number
  showRateLimits: boolean
  showBash: boolean
  showSubagents: boolean
  /** The `bandSegments` option: ids most important first. */
  priority: string
  columns: number
}

/** The band's segments that fit in `columns`, in display order. */
export function bandSegments(b: BandInput): Segment[] {
  const { snap, cache: c } = b
  const segments: Segment[] = []
  const dim = (text: string): Run => ({ text, dim: true })

  // Model and effort
  segments.push({
    id: 'model',
    runs: [
      { text: prettyModel(snap.model), bold: true },
      ...(b.effort ? [dim(` ${b.effort}`)] : []),
      ...(b.autopilot ? [{ text: ' autopilot', color: 'claude' }] : []),
    ],
  })

  // Context
  const pct = snap.percent ?? 0
  const t = b.thresholds
  const ctxLevel = level(pct, t.warn, t.alert, t.critical, t.orange)
  const color = LEVEL_COLOR[ctxLevel]
  const ctxPct: Run = { text: `${pct}%`, color, bold: ctxLevel !== 'ok', inverse: ctxLevel === 'critical' }
  segments.push({
    id: 'ctx',
    runs: [dim('ctx '), { text: `${snap.tokens === null ? '–' : fmtTokens(snap.tokens)}/${fmtTokens(snap.window)} ` }, ctxPct, { text: ' ' }, { text: bar(pct, 8), color }],
  })

  // Spend
  if (snap.costUsd !== null) segments.push({ id: 'session', runs: [dim('session '), { text: fmtUsd(snap.costUsd) }] })
  if (b.lastUsd !== null) segments.push({ id: 'last', runs: [dim('last '), { text: fmtUsd(b.lastUsd) }] })

  // Next-message floor
  let compactNext: Segment | null = null
  const f = c.floors
  if (f) {
    const left = c.left
    const clock = (ms: number): Run => ({ text: fmtClock(ms), color: ms < WARN_MS ? 'warning' : undefined })
    if (left !== null && c.isWarm) {
      compactNext = { id: 'next', runs: [dim('next '), { text: fmtUsd(f.warm) }, dim(' '), clock(left)] }
      segments.push({ id: 'next', runs: [dim('next ≥ '), { text: fmtUsd(f.warm) }, dim(' warm '), clock(left), dim(' · cold '), { text: fmtUsd(f.cold) }] })
    } else {
      compactNext = { id: 'next', runs: [dim('next '), { text: `${fmtUsd(f.cold)} cold`, color: left === null ? undefined : 'warning', bold: left !== null }] }
      if (left !== null) segments.push({ id: 'next', runs: [dim('next ≥ '), { text: `${fmtUsd(f.cold)} cold`, color: 'warning', bold: true }] })
      else segments.push({ id: 'next', runs: [dim('next ≥ '), { text: fmtUsd(f.cold) }, dim(' cold')] })
    }
  }

  // Limits
  let limitsUrgent = false
  if (b.showRateLimits && snap.rateLimits.length) {
    const runs: Run[] = []
    for (const r of snap.rateLimits) {
      if (runs.length) runs.push(dim(' · '))
      const lv = limitLevel(r.percentUsed)
      const lc = lv === 'ok' ? undefined : LEVEL_COLOR[lv]
      if (r.percentUsed >= LIMIT_LEVELS.danger) limitsUrgent = true
      runs.push(dim(`${rateLabel(r.kind)} `), { text: `${Math.round(r.percentUsed)}%`, color: lc })
      if (r.kind === 'spend_limit' && b.spendLimit > 0) {
        runs.push(dim(' '), { text: `${fmtUsd((r.percentUsed / 100) * b.spendLimit)}/${fmtUsd(b.spendLimit)}` })
      }
      if (lc && r.resetsAt) runs.push(dim(` ↻ ${fmtReset(r.resetsAt, b.now)}`))
    }
    segments.push({ id: 'limits', runs })
  }

  // Tool calls
  const counts: Run[] = []
  const addCount = (label: string, n: number) => {
    counts.push(dim(counts.length ? ` · ${label} ` : `tool calls: ${label} `), { text: String(n), dim: n === 0 })
  }
  addCount('read', countKind(b.tools, 'read'))
  addCount('write', countKind(b.tools, 'write'))
  addCount('edit', countKind(b.tools, 'edit'))
  if (b.showBash) addCount('shell', countKind(b.tools, 'shell'))
  if (b.showSubagents) addCount('agents', b.spawns)
  segments.push({ id: 'tools', runs: counts })

  const candidates = b.mode === 'compact' ? [{ id: 'ctx', runs: [dim('ctx '), ctxPct] }, ...(compactNext ? [compactNext] : [])] : segments
  let priority = parseSegments(b.priority.trim() || BAND_PRIORITY, BAND_ORDER)
  if (limitsUrgent && priority.includes('limits')) {
    priority = ['ctx', 'limits', ...priority.filter(id => id !== 'ctx' && id !== 'limits')]
  }
  return fitSegments(candidates, priority, [...BAND_ORDER], b.columns)
}
