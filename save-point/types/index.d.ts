export type Ttl = '5m' | '1h'

export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

/** What the band draws from: a copy of `$.session.usage()` and the model, refreshed on events. */
export type Snapshot = {
  model: string
  tokens: number | null
  window: number
  percent: number | null
  costUsd: number | null
  rateLimits: RateLimit[]
}

export type Activity = {
  /** Main-loop tool calls by tool name. */
  tools: Record<string, number>
  /** Subagents spawned. */
  spawns: number
}

export type CacheClock = {
  /** When the main loop last sent a request, `$.clock.now()` ms; null when unknown. */
  lastReqAt: number | null
  /** TTL detected from billed cost; null until detected. */
  detected: Ttl | null
}

export type TurnCost = {
  /** Session cost when the current main turn started. */
  startUsd: number | null
  /** What the last completed main turn cost, subagents included. */
  lastUsd: number | null
}

export type TokenTotals = { input: number; output: number; cacheRead: number; cacheWrite: number }

/**
 * Token totals counted live (the transcript keeps no usage to backfill from):
 * main loop and subagents, since `since` (`$.clock.now()` ms; null until set).
 */
export type Tokens = { main: TokenTotals; agents: TokenTotals; since: number | null }

/** Files touched by main-loop Read / Write / Edit calls, most recent first. */
export type Files = { read: string[]; written: string[] }

/** The floor predicted at a turn's start against what its first request's input cost. */
export type Calibration = {
  predicted: number | null
  state: 'warm' | 'cold' | null
  actual: number | null
}

export type BandMode = 'full' | 'compact' | 'hidden'

/**
 * What is shown and switched on, remembered across sessions in $.store: the
 * band mode, the pane, the pane's theme and tab, and the Autopilot choices
 * made in the pane or by `/hud autopilot` (absent: off).
 * Tracking never depends on it.
 */
export type View = {
  band: BandMode
  pane: boolean
  theme?: string | null
  tab?: string
  /** Autopilot's master switch. */
  autopilot?: boolean
  /** Its parts: the spawn backstop, the compaction guard, effort hints. */
  backstop?: boolean
  guard?: boolean
  hints?: boolean
}

/** One main-loop model request, for effort hints. */
export type StepStat = { ms: number; out: number }

/** One main-loop tool call, for effort hints: a shape key and whether it failed. */
export type CallStat = { key: string; isError: boolean }

/** A context notice: its text, the 10% threshold it reports and the percent then. */
export type Notice = { text: string; delivered: boolean; threshold: number; percent: number }

export type Autopilot = {
  /** Autopilot's switch, from the pane or `/hud autopilot`; null until chosen (off). */
  override: boolean | null
  /** Highest threshold notified this conversation (0 = none). */
  highWater: number
  /** A notice waiting for its channel; replaced by a higher crossing. */
  pending: string | null
  /** The last notice and whether it went out. */
  last: Notice | null
  steps: StepStat[]
  calls: CallStat[]
  check: { verdict: string; at: number } | null
}

declare module 'claude-code' {
  interface PluginState {
    'save-point': {
      snapshot: Snapshot | null
      activity: Activity
      cache: CacheClock
      turn: TurnCost
      effort: string | null
      tokens: Tokens
      files: Files
      /** Context tokens at the end of each main turn, oldest first. */
      history: number[]
      calibration: Calibration
      view: View
      autopilot: Autopilot
    }
  }
}
