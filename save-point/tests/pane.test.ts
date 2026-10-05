import { describe, expect, test } from 'claude-code/testing'

import { cacheInfo, priceFor, sparkline } from '../hooks/lib'
import { linesToText, paneLines, shortPath } from '../hooks/pane'
import type { PaneInput } from '../hooks/pane'

const NOW = 1_791_152_400_000

function input(over: Partial<PaneInput> = {}): PaneInput {
  const i: Omit<PaneInput, 'cache'> = {
    snap: {
      model: 'claude-opus-5-5',
      tokens: 135_000,
      window: 1_000_000,
      percent: 14,
      costUsd: 2.6,
      rateLimits: [{ kind: 'five_hour', percentUsed: 11, resetsAt: '2026-10-04T23:10:00.000Z' }],
    },
    act: { tools: { Bash: 5, Read: 2, Edit: 1 }, spawns: 1 },
    clock: { lastReqAt: NOW - 10 * 60_000, detected: '1h' },
    cost: { startUsd: 2.5, lastUsd: 0.12 },
    effort: 'medium',
    tokens: {
      main: { input: 12, output: 4100, cacheRead: 1_200_000, cacheWrite: 9200 },
      agents: { input: 30, output: 319, cacheRead: 26_748, cacheWrite: 26_970 },
      since: null,
    },
    files: { read: ['C:\\work\\x\\a.ts', 'C:\\work\\x\\b.ts'], written: ['C:\\work\\x\\b.ts'] },
    history: [100_000, 120_000, 135_000],
    calib: { predicted: 0.027, state: 'warm', actual: 0.0281 },
    now: NOW,
    ttl: '1h',
    ttlSource: 'detected',
    price: priceFor('claude-opus-5-5', 1),
    thresholds: { warn: 30, orange: 40, alert: 50, critical: 75 },
    spendLimit: 0,
    width: 60,
    cwd: 'C:\\work\\x',
    autopilot: { on: false, source: 'config', delivery: 'tool', nextAt: 10, last: null, at: 60, backstop: false, guard: false, hints: false, hint: null, check: null },
    ...over,
  }
  return { ...i, cache: over.cache ?? cacheInfo({ lastReqAt: i.clock.lastReqAt, ttl: i.ttl, now: i.now, price: i.price, tokens: i.snap.tokens }) }
}

describe('pane', () => {
  test('warm cache shows the countdown and both floors', () => {
    const text = linesToText(paneLines(input()))
    expect(text).toContain('Opus 5.5  effort medium')
    expect(text).toContain('135k / 1M  14%')
    expect(text).toContain('warm ≥         $0.03  cache expires in 50:00')
    expect(text).toContain('cold ≥         $1.08')
    expect(text).toContain('cache TTL      1h (detected)')
    expect(text).toContain('calibration    floor warm $0.0270 → actual $0.0281 (+4%)')
    expect(text).toContain('agents spawned 1')
    expect(text).toContain('+35k over 2 turns · avg +18k/turn')
  })

  test('expired cache says so', () => {
    const text = linesToText(paneLines(input({ now: NOW + 60 * 60_000 })))
    expect(text).toContain('cache expired')
  })

  test('files are relative, written first, reads not repeated', () => {
    const text = linesToText(paneLines(input()))
    expect(text).toContain('✎ b.ts')
    expect(text).toContain('· a.ts')
    expect(text).not.toContain('· b.ts')
  })

  test('unknown model has no floors', () => {
    const text = linesToText(paneLines(input({ price: null, snap: { ...input().snap, model: 'mystery' } })))
    expect(text).toContain('no prices for mystery')
  })

  test('short paths', () => {
    expect(shortPath('C:\\work\\x\\hooks\\lib.ts', 'C:\\work\\x', 40)).toBe('hooks/lib.ts')
    expect(shortPath('/very/long/path/to/file.ts', '/other', 10)).toBe('…o/file.ts')
  })

  test('fits the height: files give way first, then tools collapse', () => {
    const many = {
      tools: Object.fromEntries(Array.from({ length: 12 }, (_, k) => [`Tool${k}`, 20 - k])),
      spawns: 0,
    }
    const fileList = Array.from({ length: 30 }, (_, k) => `C:/work/x/f${k}.ts`)
    const base = input({ act: many, files: { read: fileList, written: fileList.slice(0, 10) } })
    const unbounded = paneLines(base).length

    for (const rows of [unbounded - 20, unbounded - 12, unbounded]) {
      expect(paneLines({ ...base, rows }).length).toBeLessThanOrEqual(rows)
    }
    const tight = linesToText(paneLines({ ...base, rows: unbounded - 20 }))
    expect(tight).toContain('more')
    expect(tight).not.toContain('✎')
    const roomy = linesToText(paneLines({ ...base, rows: 200 }))
    expect(roomy).toContain('Tool11')
    expect(roomy).toContain('✎ f9.ts')
    expect(roomy).toContain('· f29.ts')
  })

  test('autopilot section', () => {
    const off = linesToText(paneLines(input()))
    expect(off).toContain('Autopilot  off')
    expect(off).toContain('Agent spawn backstop (60%)')
    expect(off).toContain('       blocks new subagents at 60%+ context')
    expect(off).toContain('* waits for Autopilot to be on')
    const on = linesToText(
      paneLines(
        input({
          autopilot: {
            on: true,
            source: 'session',
            delivery: 'tool',
            nextAt: 40,
            last: { text: '[save-point] Informational: context passed 30% (now 32%, 320k/1M). Act on this only if your instructions say to.', delivered: true, threshold: 30, percent: 32 },
            at: 60,
            backstop: true,
            hints: false,
            guard: false,
            hint: null,
            check: null,
          },
        }),
      ),
    )
    expect(on).toContain('next at 40%')
    expect(on).toContain('last 30% (now 32%), delivered')
    expect(on).toContain('  on   Agent spawn backstop (60%)')
    expect(on).toContain('  off  Compaction guard (60%)')
  })

  test('sparkline', () => {
    expect(sparkline([0, 50, 100])).toBe('▁▄█')
  })
})
