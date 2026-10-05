import { describe, expect, test } from 'claude-code/testing'

import {
  bandSegments,
  bar,
  cacheInfo,
  countKind,
  detectTtl,
  fitSegments,
  floors,
  fmtClock,
  fmtTokens,
  fmtUsd,
  level,
  modelKey,
  parseSegments,
  prettyModel,
  priceFor,
  rateLabel,
} from '../hooks/lib'
import type { BandInput, Segment } from '../hooks/lib'

describe('models', () => {
  test('keys and names', () => {
    expect(modelKey('claude-haiku-4-5-20251001')).toBe('haiku-4-5')
    expect(modelKey('claude-opus-5-5[1m]')).toBe('opus-5-5')
    expect(prettyModel('claude-opus-5-5')).toBe('Opus 5.5')
    expect(prettyModel('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
    expect(prettyModel('some-custom-model')).toBe('some-custom-model')
    expect(priceFor('claude-unknown-9-9', 1)).toBe(null)
  })
  test('earlier models and cloud ids', () => {
    expect(prettyModel('claude-opus-5')).toBe('Opus 5')
    expect(modelKey('us.anthropic.claude-opus-4-6-v1:0')).toBe('opus-4-6')
    expect(modelKey('anthropic.claude-sonnet-4-5-20250929-v1:0')).toBe('sonnet-4-5')
    expect(modelKey('claude-opus-4-5@20251101')).toBe('opus-4-5')
    expect(priceFor('claude-fable-5', 1)).toEqual({ input: 10, output: 50, write5m: 12.5, write1h: 20, read: 1 })
    expect(priceFor('claude-fable-5-1', 1)?.read).toBe(0.25)
    expect(priceFor('claude-opus-4-8', 1)).toEqual({ input: 5, output: 25, write5m: 6.25, write1h: 10, read: 0.5 })
    expect(priceFor('claude-sonnet-4-6', 2)?.write1h).toBe(12)
    expect(priceFor('claude-sonnet-5-5', 1)?.read).toBe(0.2)
  })
})

describe('formatting', () => {
  test('tokens', () => {
    expect(fmtTokens(850)).toBe('850')
    expect(fmtTokens(9300)).toBe('9.3k')
    expect(fmtTokens(117_434)).toBe('117k')
    expect(fmtTokens(1_000_000)).toBe('1M')
    expect(fmtTokens(999_700)).toBe('1M')
  })
  test('usd', () => {
    expect(fmtUsd(0.021)).toBe('$0.02')
    expect(fmtUsd(1.6983)).toBe('$1.70')
    expect(fmtUsd(142.27)).toBe('$142')
    expect(fmtUsd(0.001)).toBe('<$0.01')
    expect(fmtUsd(0)).toBe('$0.00')
  })
  test('clock', () => {
    expect(fmtClock(3_130_000)).toBe('52:10')
    expect(fmtClock(1)).toBe('0:01')
    expect(fmtClock(-5)).toBe('0:00')
  })
  test('rate labels', () => {
    expect(rateLabel('five_hour')).toBe('5h')
    expect(rateLabel('seven_day')).toBe('week')
    expect(rateLabel('something_new')).toBe('something new')
  })
  test('bar', () => {
    expect(bar(0, 8)).toBe('░░░░░░░░')
    expect(bar(100, 8)).toBe('████████')
    expect(bar(50, 8)).toBe('████░░░░')
    expect([...bar(12, 8)].length).toBe(8)
  })
})

describe('cost', () => {
  test('floors at 117k on Opus 5.5, 1h', () => {
    const f = floors(priceFor('claude-opus-5-5', 1)!, 117_434, '1h')
    expect(Math.abs(f.warm - 0.0234868) < 1e-9).toBe(true)
    expect(Math.abs(f.cold - 0.939472) < 1e-9).toBe(true)
  })

  // A real turn: two Opus steps at 1h plus a Haiku subagent at 5m, billed
  // exactly $0.0951655.
  const main = [
    { model: 'claude-opus-5-5', input_tokens: 2, output_tokens: 163, cache_read_input_tokens: 105816, cache_creation_input_tokens: 824 },
    { model: 'claude-opus-5-5', input_tokens: 2, output_tokens: 149, cache_read_input_tokens: 106640, cache_creation_input_tokens: 228 },
  ]
  const agents = [
    { model: 'claude-haiku-4-5-20251001', input_tokens: 20, output_tokens: 319, cache_read_input_tokens: 26748, cache_creation_input_tokens: 26970 },
  ]
  test('detects 1h from a billed turn', () => {
    expect(detectTtl(0.0951655, main, agents, 1)).toBe('1h')
  })
  test('detects 5m when the delta fits 5m', () => {
    expect(detectTtl(0.054007 + 0.038002, main, agents, 1)).toBe('5m')
  })
  test('no verdict on a delta that fits neither', () => {
    expect(detectTtl(0.5, main, agents, 1)).toBe(null)
  })
  test('no verdict when too little was written', () => {
    const tiny = [{ ...main[1]!, cache_creation_input_tokens: 100 }]
    expect(detectTtl(0.03, tiny, [], 1)).toBe(null)
  })
})

describe('context levels', () => {
  test('green to 30, yellow to 40, orange to 50, red to 75, critical after', () => {
    expect(level(29, 30, 50, 75)).toBe('ok')
    expect(level(30, 30, 50, 75)).toBe('warn')
    expect(level(39, 30, 50, 75, 40)).toBe('warn')
    expect(level(40, 30, 50, 75, 40)).toBe('orange')
    expect(level(49, 30, 50, 75, 40)).toBe('orange')
    expect(level(50, 30, 50, 75)).toBe('alert')
    expect(level(75, 30, 50, 75)).toBe('critical')
    expect(level(95, 70, 90)).toBe('alert')
  })
})

describe('layout', () => {
  const seg = (id: string, width: number): Segment => ({ id, runs: [{ text: 'x'.repeat(width) }] })
  const order = ['a', 'b', 'c', 'd']
  test('keeps everything when it fits', () => {
    const out = fitSegments([seg('a', 5), seg('b', 5), seg('c', 5)], ['a', 'b', 'c'], order, 100)
    expect(out.map(s => s.id)).toEqual(['a', 'b', 'c'])
  })
  test('drops lowest priority first, keeps display order', () => {
    const out = fitSegments([seg('a', 10), seg('b', 10), seg('c', 10)], ['c', 'a', 'b'], order, 25)
    expect(out.map(s => s.id)).toEqual(['a', 'c'])
  })
  test('parses the option', () => {
    expect(parseSegments('ctx, next,bogus,ctx', ['ctx', 'next', 'tools'])).toEqual(['ctx', 'next'])
    expect(parseSegments('', ['ctx', 'next'])).toEqual(['ctx', 'next'])
  })
})

describe('band', () => {
  const NOW = 1_791_152_400_000
  const snap = {
    model: 'claude-opus-5-5',
    tokens: 135_000,
    window: 1_000_000,
    percent: 14,
    costUsd: 2.6,
    rateLimits: [{ kind: 'five_hour', percentUsed: 11, resetsAt: '2026-10-04T23:10:00.000Z' }],
  }
  const price = priceFor('claude-opus-5-5', 1)
  const input = (over: Partial<BandInput> = {}): BandInput => ({
    mode: 'full',
    snap,
    effort: 'high',
    autopilot: false,
    tools: { Read: 2, Glob: 1, Grep: 1, Edit: 3, Bash: 4 },
    spawns: 1,
    lastUsd: 0.12,
    cache: cacheInfo({ lastReqAt: NOW - 10 * 60_000, ttl: '1h', now: NOW, price, tokens: snap.tokens }),
    now: NOW,
    thresholds: { warn: 30, orange: 40, alert: 50, critical: 75 },
    spendLimit: 0,
    showRateLimits: true,
    showBash: true,
    showSubagents: true,
    priority: '',
    columns: 400,
    ...over,
  })
  const text = (segs: Segment[]) => segs.map(s => s.runs.map(r => r.text).join('')).join(' | ')

  test('every segment, in display order, when wide', () => {
    expect(text(bandSegments(input()))).toBe(
      'Opus 5.5 high | ctx 135k/1M 14% █▏░░░░░░ | session $2.60 | last $0.12 | next ≥ $0.03 warm 50:00 · cold $1.08 | 5h 11% | tool calls: read 4 · write 0 · edit 3 · shell 4 · agents 1',
    )
  })
  test('compact: context and the next message only', () => {
    expect(text(bandSegments(input({ mode: 'compact' })))).toBe('ctx 14% | next $0.03 50:00')
  })
  test('a cold cache says so', () => {
    const cold = cacheInfo({ lastReqAt: NOW - 2 * 3600_000, ttl: '1h', now: NOW, price, tokens: snap.tokens })
    expect(text(bandSegments(input({ cache: cold, mode: 'compact' })))).toBe('ctx 14% | next $1.08 cold')
  })
  test('narrow drops the lowest priority first; a limit near its cap moves up', () => {
    expect(bandSegments(input({ columns: 40, priority: 'ctx,next,model' })).map(s => s.id)).toEqual(['ctx'])
    const urgent = { ...snap, rateLimits: [{ kind: 'five_hour', percentUsed: 95 }] }
    expect(bandSegments(input({ snap: urgent, columns: 40 })).map(s => s.id)).toEqual(['ctx', 'limits'])
  })
})

describe('cache clock', () => {
  test('warm, cold, unknown', () => {
    const price = priceFor('claude-opus-5-5', 1)
    const warm = cacheInfo({ lastReqAt: 0, ttl: '5m', now: 60_000, price, tokens: 100_000 })
    expect(warm.isWarm).toBe(true)
    expect(warm.left).toBe(240_000)
    expect(warm.frac).toBe(0.8)
    const cold = cacheInfo({ lastReqAt: 0, ttl: '5m', now: 400_000, price, tokens: 100_000 })
    expect(cold.isCold).toBe(true)
    expect(cold.frac).toBe(0)
    const unknown = cacheInfo({ lastReqAt: null, ttl: '1h', now: 0, price: null, tokens: null })
    expect([unknown.isWarm, unknown.isCold, unknown.left, unknown.floors]).toEqual([false, false, null, null])
  })
  test('tool kinds: Glob and Grep read, Monitor is shell, unknown tools nowhere', () => {
    expect(countKind({ Read: 1, Glob: 2, Grep: 3, Monitor: 1, mcp__x: 5 }, 'read')).toBe(6)
    expect(countKind({ Bash: 1, Monitor: 1 }, 'shell')).toBe(2)
  })
})
