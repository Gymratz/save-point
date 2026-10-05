// The detail pane's content as styled lines: drawn as Text in the pane, or
// joined as plain text where nothing draws. Pure, like lib.ts.

import type { Activity, Calibration, CacheClock, Files, Notice, Snapshot, TokenTotals, Tokens, Ttl, TurnCost } from '../types'
import {
  bar,
  fmtClock,
  fmtReset,
  fmtTokens,
  fmtUsd,
  level,
  LEVEL_COLOR,
  limitLevel,
  prettyModel,
  rateLabel,
  sparkline,
  WARN_MS,
} from './lib'
import type { CacheInfo, Price, Run } from './lib'

export type TtlSource = 'detected' | 'configured' | 'assumed'

export type PaneInput = {
  snap: Snapshot
  act: Activity
  clock: CacheClock
  cost: TurnCost
  effort: string | null
  tokens: Tokens
  files: Files
  history: number[]
  calib: Calibration
  now: number
  ttl: Ttl
  ttlSource: TtlSource
  price: Price | null
  /** The cache clock and next-message floors (`cacheInfo`). */
  cache: CacheInfo
  thresholds: { warn: number; orange: number; alert: number; critical: number }
  spendLimit: number
  width: number
  /** Rows the pane shows at once; the variable lists trim to fit. Absent: no limit. */
  rows?: number
  cwd: string
  /** Show only these sections (headings as written here, plus 'Model'); absent: all. */
  only?: string[]
  /** Leave these sections out (the pane draws them itself, with controls). */
  skip?: string[]
  /** Headings renamed for a theme: `{ Context: 'Life' }`. */
  headings?: Record<string, string>
  autopilot: {
    on: boolean
    delivery: 'tool' | 'tool+turn'
    nextAt: number | null
    last: Notice | null
    /** The backstop percent, shared by the spawn backstop and the compaction guard. */
    at: number
    backstop: boolean
    guard: boolean
    hints: boolean
    hint: string | null
    check: { verdict: string; at: number } | null
  }
}

/**
 * Autopilot's parts as the pane lists them (text here, buttons in the Limits
 * tab): the name and what it does, given the backstop percent.
 */
export const AUTOPILOT_PARTS: readonly { id: 'notices' | 'backstop' | 'guard' | 'hints'; name: (at: number) => string; what: (at: number) => string[] }[] = [
  { id: 'notices', name: () => 'Context notices', what: () => ['tells Claude at every +10% of context'] },
  { id: 'backstop', name: at => `Agent spawn backstop (${at}%)`, what: at => [`blocks new subagents at ${at}%+ context`] },
  { id: 'guard', name: at => `Compaction guard (${at}%)`, what: at => [`turns auto-compact off from ${at}% context:`, 'nothing compacts unless you run /compact,', 'so save your progress and /clear in time'] },
  { id: 'hints', name: () => 'Effort hints', what: () => ['suggests raising or lowering effort;', 'shown here only, never sent to Claude'] },
]

/** A notice in brief: `30% (now 32%)`. */
export function noticeSummary(n: Notice): string {
  return `${n.threshold}% (now ${n.percent}%)`
}

/** Files listed per kind when there is no height to fit (the text fallback). */
const FILES_UNBOUNDED = 8

const LABEL = 15

const dim = (text: string): Run => ({ text, dim: true })
const heading = (text: string): Run[] => [{ text, bold: true, color: 'claude' }]
const row = (label: string, ...value: Run[]): Run[] => [dim(`  ${label.padEnd(LABEL)}`), ...value]

export function paneLines(i: PaneInput): Run[][] {
  const out: Run[][] = []
  const { snap } = i
  const want = (name: string) => (!i.only || i.only.includes(name)) && !i.skip?.includes(name)
  const head = (name: string) => heading(i.headings?.[name] ?? name)

  // Model
  if (want('Model')) {
    out.push([{ text: prettyModel(snap.model), bold: true }, ...(i.effort ? [dim(`  effort ${i.effort}`)] : [])])
    out.push([])
  }

  // Context
  if (want('Context')) {
    const pct = snap.percent ?? 0
    const lv = level(pct, i.thresholds.warn, i.thresholds.alert, i.thresholds.critical, i.thresholds.orange)
    out.push(head('Context'))
    out.push(
      row(
        'used',
        { text: `${snap.tokens === null ? '–' : fmtTokens(snap.tokens)} / ${fmtTokens(snap.window)}  ` },
        { text: `${pct}%`, color: LEVEL_COLOR[lv], bold: lv !== 'ok', inverse: lv === 'critical' },
      ),
    )
    out.push([dim('  '), { text: bar(pct, Math.max(8, Math.min(40, i.width - 4))), color: LEVEL_COLOR[lv] }])
    if (i.history.length > 1) {
      // Context after each turn, drawn against the whole window: flat means slow growth.
      const room = Math.max(8, i.width - LABEL - 4)
      const shown = i.history.slice(-room)
      const first = shown[0] ?? 0
      const last = shown[shown.length - 1] ?? 0
      const turns = shown.length - 1
      const delta = last - first
      const sign = (n: number) => `${n < 0 ? '−' : '+'}${fmtTokens(Math.abs(n))}`
      out.push(row('after each turn', { text: ` ${sparkline(shown, snap.window)}`, color: LEVEL_COLOR[lv] }))
      out.push(row('', { text: ` ${sign(delta)}` }, dim(` over ${turns} turn${turns === 1 ? '' : 's'} · avg ${sign(Math.round(delta / turns))}/turn`)))
    }
    out.push([])
  }

  // Cost
  if (want('Cost')) {
    out.push(head('Cost'))
    if (snap.costUsd !== null) out.push(row('session', { text: fmtUsd(snap.costUsd) }))
    if (i.cost.lastUsd !== null) out.push(row('last turn', { text: fmtUsd(i.cost.lastUsd) }))
    if (i.calib.predicted !== null && i.calib.actual !== null) {
      const off = i.calib.predicted > 0 ? Math.round(((i.calib.actual - i.calib.predicted) / i.calib.predicted) * 100) : 0
      out.push(
        row(
          'calibration',
          dim(`floor ${i.calib.state} `),
          { text: fmtUsd4(i.calib.predicted) },
          dim(' → actual '),
          { text: fmtUsd4(i.calib.actual) },
          dim(` (${off >= 0 ? '+' : ''}${off}%)`),
        ),
      )
    }
    out.push([])
  }

  // Next message
  if (want('Next message')) {
    out.push(head('Next message'))
    const f = i.cache.floors
    if (f) {
      const left = i.cache.left
      if (left !== null && i.cache.isWarm) {
        out.push(row('warm ≥', { text: fmtUsd(f.warm) }, dim(`  cache expires in `), { text: fmtClock(left), color: left < WARN_MS ? 'warning' : undefined }))
        out.push(row('cold ≥', { text: fmtUsd(f.cold) }))
      } else {
        out.push(row('warm ≥', { text: fmtUsd(f.warm) }, dim(left === null ? '  cache state unknown' : '  cache expired')))
        out.push(row('cold ≥', { text: fmtUsd(f.cold), color: left === null ? undefined : 'warning', bold: left !== null }))
      }
      out.push(row('per tool step ≈', { text: fmtUsd(f.warm) }, dim('  (re-reads the context)')))
    } else {
      out.push(row('', dim(i.price ? 'waiting for the first response' : `no prices for ${snap.model}`)))
    }
    out.push(row('cache TTL', { text: i.ttl }, dim(` (${i.ttlSource})`)))
    out.push([])
  }

  // Tokens
  if (want('Tokens')) {
    out.push([...head('Tokens'), ...(i.tokens.since === null ? [] : [dim(`  since ${fmtTime(i.tokens.since)}`)])])
    out.push([dim(`  ${''.padEnd(LABEL)}${'main'.padStart(8)}${'agents'.padStart(9)}`)])
    const tokenRow = (label: string, key: keyof TokenTotals) =>
      row(label, { text: fmtTokens(i.tokens.main[key]).padStart(8) }, { text: fmtTokens(i.tokens.agents[key]).padStart(9) })
    out.push(tokenRow('cache read', 'cacheRead'))
    out.push(tokenRow('cache write', 'cacheWrite'))
    out.push(tokenRow('input', 'input'))
    out.push(tokenRow('output', 'output'))
    out.push([])
  }

  // Limits
  if (want('Limits')) {
    if (snap.rateLimits.length) {
      out.push(head('Limits'))
      for (const r of snap.rateLimits) {
        const rl = limitLevel(r.percentUsed)
        const value: Run[] = [{ text: `${Math.round(r.percentUsed)}%`.padStart(4), color: rl === 'ok' ? undefined : LEVEL_COLOR[rl] }]
        if (r.kind === 'spend_limit' && i.spendLimit > 0) {
          value.push({ text: `  ${fmtUsd((r.percentUsed / 100) * i.spendLimit)} / ${fmtUsd(i.spendLimit)}` })
        }
        if (r.resetsAt) value.push(dim(`  resets ${fmtReset(r.resetsAt, i.now)}`))
        out.push(row(rateLabel(r.kind), ...value))
      }
      out.push([])
    }
  }

  // Autopilot
  if (want('Autopilot')) {
    const ap = i.autopilot
    out.push([...head('Autopilot'), dim('  '), ap.on ? { text: 'on', color: 'claude', bold: true } : { text: 'off', bold: true }])
    // The name on its own line, what it does on short lines under it, so a narrow pane never cuts it off.
    // A part switched on still waits for Autopilot itself (`on*`).
    for (const p of AUTOPILOT_PARTS) {
      const partOn = p.id === 'notices' ? true : ap[p.id]
      out.push([partOn && ap.on ? { text: '  on   ', color: 'claude', bold: true } : dim(partOn ? '  on*  ' : '  off  '), { text: p.name(ap.at), bold: partOn && ap.on }])
      for (const line of p.what(ap.at)) out.push([dim(`       ${line}`)])
      if (p.id === 'notices' && ap.on) {
        out.push([dim(ap.nextAt === null ? '       all sent' : `       next at ${ap.nextAt}%`)])
        if (ap.last) out.push([dim('       last '), { text: noticeSummary(ap.last) }, dim(ap.last.delivered ? ', delivered' : ', waiting')])
      }
    }
    if (ap.on && ap.hint) out.push([dim('       '), { text: ap.hint }])
    if (ap.on && ap.check) out.push(row('effort check', { text: ap.check.verdict }, dim(`  (Haiku, ${fmtTime(ap.check.at)})`)))
    if (!ap.on) out.push([dim('  * waits for Autopilot to be on')])
    out.push([])
  }

  // Tool calls and files fill what is left, so the pane never scrolls:
  // files give way first, then tool names collapse into "+N more".
  const tools: Run[][] = Object.entries(i.act.tools)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => row(name, { text: String(n) }))
  if (i.act.spawns) tools.push(row('agents spawned', { text: String(i.act.spawns) }))
  const roomPath = i.width - 6
  const written = i.files.written.map(f => [dim('  ✎ '), { text: shortPath(f, i.cwd, roomPath) }])
  const readOnly = i.files.read
    .filter(f => !i.files.written.includes(f))
    .map(f => [dim('  · '), { text: shortPath(f, i.cwd, roomPath), dim: true }])

  // Fixed rows below: two headings, the blank between, the two file counts.
  let room = i.rows === undefined ? Infinity : i.rows - out.length - 5
  if (!want('Tool calls')) {
    room = Infinity
  } else {
    out.push(head('Tool calls'))
    if (!tools.length) {
      out.push(row('', dim('none yet')))
      room -= 1
    } else if (tools.length <= room) {
      out.push(...tools)
      room -= tools.length
    } else {
      const shown = Math.max(0, room - 1)
      out.push(...tools.slice(0, shown), row('', dim(`+${tools.length - shown} more`)))
      room = 0
    }
    out.push([])
  }

  if (!want('Files')) return out
  if (room === Infinity && i.rows !== undefined) room = i.rows - out.length - 3
  out.push(head('Files'))
  out.push(row('read', { text: String(i.files.read.length) }))
  out.push(row('written', { text: String(i.files.written.length) }))
  const cap = i.rows === undefined ? FILES_UNBOUNDED : Infinity
  const w = written.slice(0, Math.max(0, Math.min(cap, room)))
  room -= w.length
  const r = readOnly.slice(0, Math.max(0, Math.min(cap, room)))
  out.push(...(w as Run[][]), ...(r as Run[][]))

  return out
}

/** Local time of day: 3:42pm */
export function fmtTime(ms: number): string {
  const d = new Date(ms)
  const h = d.getHours()
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`
}

/** Four decimals under a dollar, so calibration differences show. */
function fmtUsd4(n: number): string {
  return n < 1 ? `$${n.toFixed(4)}` : fmtUsd(n)
}

/** A path relative to cwd, cut from the left to fit. */
export function shortPath(path: string, cwd: string, room: number): string {
  const norm = (p: string) => p.replace(/\\/g, '/')
  const base = norm(cwd).replace(/\/$/, '') + '/'
  let p = norm(path)
  if (p.toLowerCase().startsWith(base.toLowerCase())) p = p.slice(base.length)
  return p.length <= room ? p : `…${p.slice(p.length - room + 1)}`
}

export function linesToText(lines: Run[][]): string {
  return lines.map(l => l.map(r => r.text).join('').trimEnd()).join('\n')
}
