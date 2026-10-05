import { describe, expect, test } from 'claude-code/testing'

import { backstopText, callKey, crossing, effortHint, effortStats, guardText, noticeText, thresholdAt } from '../hooks/autopilot-logic'

describe('milestone crossings', () => {
  test('28% to 32% is one notice: passed 30%', () => {
    expect(crossing(32, thresholdAt(28))).toBe(30)
  })
  test('28% to 51% is one notice naming the highest: passed 50%', () => {
    expect(crossing(51, thresholdAt(28))).toBe(50)
  })
  test('no repeat for a threshold already notified', () => {
    expect(crossing(35, 30)).toBe(null)
    expect(crossing(39, 30)).toBe(null)
    expect(crossing(40, 30)).toBe(40)
  })
  test('nothing below 10%, nothing past 90%', () => {
    expect(crossing(9, 0)).toBe(null)
    expect(crossing(99, 90)).toBe(null)
    expect(crossing(99, 80)).toBe(90)
  })
  test('after a reset the mark starts over', () => {
    expect(crossing(12, 0)).toBe(10)
  })
  test('a call key names the tool and never holds its input', () => {
    const key = callKey('Bash', { command: 'export TOKEN=secret-value' })
    expect(key).toMatch(/^Bash:[0-9a-f]{8}$/)
    expect(key).toBe(callKey('Bash', { command: 'export TOKEN=secret-value' }))
    expect(key).not.toBe(callKey('Bash', { command: 'export TOKEN=other' }))
  })
  test('backstop and guard wording', () => {
    expect(backstopText(63, 60)).toBe(
      '[save-point] Spawn backstop: context is at 63% (backstop 60%), so no new subagents start. Continue without one, or follow your instructions for a full context.',
    )
    expect(guardText(63, 60)).toBe('Save Point compaction guard: auto-compact skipped at 63% (guard 60%); /compact still works')
  })
  test('exact wording', () => {
    expect(noticeText(50, 51, 512_000, 1_000_000)).toBe(
      '[save-point] Informational: context passed 50% (now 51%, 512k/1M). Act on this only if your instructions say to.',
    )
  })
})

describe('effort hints', () => {
  const steps = (n: number, out: number, ms: number) => Array.from({ length: n }, () => ({ ms, out }))
  const calls = (n: number, failed: number) =>
    Array.from({ length: n }, (_, k) => ({ key: callKey('Read', { file_path: `f${k}` }), isError: k < failed }))

  test('needs ten steps', () => {
    expect(effortHint('high', effortStats(steps(9, 100, 3000), calls(9, 0)))).toBe(null)
  })
  test('routine work at high effort', () => {
    expect(effortHint('high', effortStats(steps(20, 150, 4000), calls(20, 0)))).toBe(
      'Last 20 steps look routine at high effort; medium may suffice.',
    )
  })
  test('failing work at medium effort', () => {
    expect(effortHint('medium', effortStats(steps(20, 900, 20_000), calls(20, 8)))).toBe(
      'Last 20 steps: 8 of 20 tool calls failed at medium effort; high may help.',
    )
  })
  test('repeats count as identical calls', () => {
    const same = Array.from({ length: 10 }, () => ({ key: callKey('Bash', { command: 'npm test' }), isError: false }))
    expect(effortStats([], same).repeatRate).toBe(0.9)
  })
})
