// Pure logic for Autopilot: milestone crossings, notice wording, effort hints.

import type { CallStat, StepStat } from '../types'
import { fmtTokens } from './lib'

/**
 * The threshold a context percent has crossed past `highWater`, or null.
 * Thresholds are every 10% from 10 to 90; a jump past several names the highest.
 */
export function crossing(percent: number, highWater: number): number | null {
  const t = Math.min(90, Math.floor(percent / 10) * 10)
  return t >= 10 && t > highWater ? t : null
}

/** The threshold a percent sits at (0 below 10%): the mark to start from. */
export function thresholdAt(percent: number): number {
  return Math.min(90, Math.max(0, Math.floor(percent / 10) * 10))
}

export function noticeText(threshold: number, percent: number, tokens: number, window: number): string {
  return (
    `[save-point] Informational: context passed ${threshold}% ` +
    `(now ${percent}%, ${fmtTokens(tokens)}/${fmtTokens(window)}). ` +
    'Act on this only if your instructions say to.'
  )
}

/** What a denied Agent call is told when the spawn backstop stops it. */
export function backstopText(percent: number, at: number): string {
  return (
    `[save-point] Spawn backstop: context is at ${percent}% (backstop ${at}%), so no new subagents start. ` +
    'Continue without one, or follow your instructions for a full context.'
  )
}

/** The line shown when the compaction guard skips an automatic compaction. */
export function guardText(percent: number, at: number): string {
  return `Save Point compaction guard: auto-compact skipped at ${percent}% (guard ${at}%); /compact still works`
}

/**
 * A tool call's shape, so repeats can be counted: the tool and a hash of its
 * input (FNV-1a). The input itself is never kept.
 */
export function callKey(tool: string, input: unknown): string {
  let text: string
  try {
    text = JSON.stringify(input) ?? ''
  } catch {
    text = ''
  }
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${tool}:${(h >>> 0).toString(16).padStart(8, '0')}`
}

const LOWER: Record<string, string> = { max: 'xhigh', xhigh: 'high', high: 'medium', medium: 'low' }
const HIGHER: Record<string, string> = { low: 'medium', medium: 'high', high: 'xhigh', xhigh: 'max' }

export type EffortStats = {
  steps: number
  medianOut: number
  medianMs: number
  calls: number
  errorRate: number
  repeatRate: number
}

function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

export const HINT_WINDOW = 20

export function effortStats(steps: StepStat[], calls: CallStat[]): EffortStats {
  const st = steps.slice(-HINT_WINDOW)
  const cl = calls.slice(-HINT_WINDOW)
  const keys = cl.map(c => c.key)
  const repeats = keys.filter((k, i) => keys.indexOf(k) !== i).length
  return {
    steps: st.length,
    medianOut: median(st.map(s => s.out)),
    medianMs: median(st.map(s => s.ms)),
    calls: cl.length,
    errorRate: cl.length ? cl.filter(c => c.isError).length / cl.length : 0,
    repeatRate: cl.length ? repeats / cl.length : 0,
  }
}

/**
 * A heuristic read of recent steps against the effort level; shown in the
 * pane only, never sent to the model. Null until there are enough steps.
 */
export function effortHint(effort: string | null, s: EffortStats): string | null {
  if (!effort || s.steps < 10) return null
  const failed = Math.round(s.errorRate * s.calls)
  if (HIGHER[effort] && s.calls >= 5 && (s.errorRate >= 0.25 || s.repeatRate >= 0.4)) {
    const why = s.errorRate >= 0.25 ? `${failed} of ${s.calls} tool calls failed` : 'tool calls keep repeating'
    return `Last ${s.steps} steps: ${why} at ${effort} effort; ${HIGHER[effort]} may help.`
  }
  if (LOWER[effort] && effort !== 'medium' && s.medianOut < 400 && s.errorRate < 0.1 && s.medianMs < 10_000) {
    return `Last ${s.steps} steps look routine at ${effort} effort; ${LOWER[effort]} may suffice.`
  }
  return `Last ${s.steps} steps: nothing suggests a change from ${effort}.`
}

/** What `/hud effort-check` sends to Haiku: stats only, never the transcript. */
export function effortCheckText(effort: string, s: EffortStats): string {
  return [
    'A coding agent session runs at a reasoning effort level (low, medium, high, xhigh, max).',
    'Higher effort thinks longer per step and costs more; lower is faster and cheaper but',
    'struggles more on hard, failure-prone work. Judge from these stats over the last',
    `${s.steps} model steps whether the effort should be lowered, kept, or raised.`,
    `Current effort: ${effort}.`,
    `Median output tokens per step: ${s.medianOut}.`,
    `Median step duration: ${Math.round(s.medianMs / 100) / 10}s.`,
    `Tool calls: ${s.calls}; failed: ${Math.round(s.errorRate * 100)}%; repeated identical calls: ${Math.round(s.repeatRate * 100)}%.`,
  ].join('\n')
}
