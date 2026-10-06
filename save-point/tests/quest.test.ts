// The Quest tab drawn for real: the pane mounted at a size, its rows counted,
// and the animation's blits checked against the Rasters they land in.

import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { resolveTheme, THEMES } from '../hooks/themes'
import { BAR_ROWS, LOG_ROWS, sceneDesignRows, sceneMaxRows, sceneMinRows } from '../hooks/themes/scene'

const SCENES = Object.keys(THEMES).filter(id => THEMES[id]!.scene)

type Node = { type: string; props?: Record<string, unknown>; children?: unknown[] }

/** A session with usage to show, the theme picked, and the pane mounted at `columns` x `rows`. */
async function quest($: Engine, on: On, theme: string, columns: number, rows: number) {
  const clock = mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  const usage = { startedAt: 0, context: { tokens: 107_000, window: 1_000_000, percent: 11 }, rateLimits: [{ kind: 'five_hour', percentUsed: 40, resetsAt: 0 }], cost: { usd: 2.6 } }
  on('session.surfaces', () => ({ value: [] }))
  on('session.cwd', () => ({ value: 'C:/x' }))
  on('session.id', () => ({ value: 's1' }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.usage', () => ({ value: usage as never }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('tool.call', () => ({ result: 'done' }) as never)
  const opens: (number | undefined)[] = []
  on('ui.open', (_$, e) => {
    opens.push(e.columns)
    return { value: { isPlaced: true } as never }
  })
  const blits: { key: string; cells: number }[] = []
  on('ui.blit', (_$, e) => {
    blits.push({ key: e.key, cells: 'cells' in e ? String(e.cells).length : -1 })
    return { value: {} as never }
  })
  await $.command.run({ command: 'hud', args: `theme ${theme}`, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  await $.session.measure({ ...usage, changed: [] } as never)
  const props = (bodyRows: number) => ({ title: 'Save Point', isFocused: false, bodyColumns: columns, placement: 'dock', scroll: { offset: 0, bodyRows }, view: {} }) as never
  const ui = await $.ui.mount({ plugin: 'save-point', surface: 'terminal', component: 'Pane', requestId: 'save-point', props: props(rows) })
  /** The drawing's rows: the tabs and the picker, each Raster's, one per line of words. */
  const measure = async () => {
    const tree = (await ui.drawn()) as unknown as Node
    const parts = (tree.children ?? []) as Node[]
    const rasters = Object.fromEntries(parts.filter(p => p.type === 'Raster').map(p => [String(p.props!.key), { rows: Number(p.props!.rows), cells: String(p.props!.cells).length }]))
    const words = parts.filter(p => p.type === 'Box' && p.props?.key !== 'tabs').length
    const tabs = parts.find(p => p.props?.key === 'tabs')?.children?.length ?? 0
    return { rasters, tabs, words, total: tabs + words + Object.values(rasters).reduce((n, r) => n + r.rows, 0), text: JSON.stringify(parts.filter(p => p.type === 'Box')) }
  }
  return { ui, clock, blits, opens, measure, redraw: (bodyRows: number) => ui.redraw(props(bodyRows)) }
}

describe('quest tab', () => {
  for (const id of SCENES) {
    test(`${id}: the tab fills the pane to its last row, at 48 columns`, { timeoutMs: 30_000 }, async ($, on) => {
      const theme = resolveTheme(id).theme
      const design = sceneDesignRows(theme)
      const q = await quest($, on, id, 48, 80)
      const tall = await q.measure()
      expect(tall.total).toBe(80)
      expect(tall.rasters.scene?.rows).toBe(sceneMaxRows(theme))
      // The words: the log (grown past its three rows by what the scene could not take) and the meter rows.
      const spare = 80 - tall.tabs - tall.rasters.bar!.rows - tall.rasters.scene!.rows - tall.words
      expect(spare).toBe(0)
      // A pane with exactly the room for the design: one row of bar, the scene as designed, three rows of log.
      const m1 = async (rows: number) => {
        await q.redraw(rows)
        return q.measure()
      }
      let rows = sceneMinRows(theme, tall.tabs)
      expect((await m1(rows)).rasters).toMatchObject({ bar: { rows: BAR_ROWS }, scene: { rows: design } })
      const meterRows = (await m1(rows)).words - LOG_ROWS
      expect(Object.keys((await m1(rows - 1)).rasters)).toEqual(['bar'])
      // From the first height that holds every word, the tab ends on the pane's last row.
      const fits = tall.tabs + BAR_ROWS + design + LOG_ROWS + meterRows
      for (rows = fits; rows <= 80; rows += 3) {
        const m = await m1(rows)
        expect(`${rows}:${m.total}`).toBe(`${rows}:${rows}`)
        expect(m.rasters.scene!.rows >= design && m.rasters.scene!.rows <= sceneMaxRows(theme)).toBe(true)
      }
    })
  }
  test('the animation draws into the Rasters as the tab laid them out, and follows a new height', { timeoutMs: 30_000 }, async ($, on) => {
    const q = await quest($, on, 'zelda', 48, 70)
    for (const size of [70, 52, 44, 60]) {
      await q.redraw(size)
      const m = await q.measure()
      q.blits.length = 0
      await q.clock.advance(2000)
      const drawn = Object.fromEntries(q.blits.map(b => [b.key, b.cells]))
      expect(q.blits.length).toBeGreaterThan(3)
      for (const [key, raster] of Object.entries(m.rasters)) expect(`${size} ${key}:${drawn[key]}`).toBe(`${size} ${key}:${raster.cells}`)
      for (const b of q.blits) expect(`${size} ${b.key}:${b.cells}`).toBe(`${size} ${b.key}:${m.rasters[b.key]?.cells}`)
    }
  })
  test("a tool that returns at once still shows its loop, then its result", { timeoutMs: 30_000 }, async ($, on) => {
    const q = await quest($, on, 'zelda', 48, 70)
    const slime = resolveTheme('zelda').theme.text.toolSuccess
    await q.clock.advance(1000)
    await $.tool.call({ tool: 'Read', file_path: 'a.ts', tool_use_id: 't1' } as never)
    // Half a second on (three frames): the grass is still being cut.
    await q.clock.advance(500)
    expect((await q.measure()).text.includes(slime)).toBe(false)
    // Once the loop has gone round, the slime falls.
    await q.clock.advance(1500)
    expect((await q.measure()).text.includes(slime)).toBe(true)
  })
  test('About draws at 48 columns and says where the pane stands', { timeoutMs: 30_000 }, async ($, on) => {
    const q = await quest($, on, 'metroid', 48, 60)
    await q.ui.press({ key: 'tab-about' })
    const text = (await q.measure()).text
    expect(text).toContain('Themes are laid out for 48, 58, 80, and 96')
    expect(text).toContain('Pane: 48 x 60')
  })
})
