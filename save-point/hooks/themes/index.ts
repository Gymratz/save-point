// The theme registry. To add a theme: write a pack like metroid.ts (a `Theme`
// object; kit.ts has the frame helpers), import it here, add it to THEMES and
// to the `theme` option's list in plugin.json (a test checks). Nothing else changes.

import { LIMIT_LEVELS } from '../lib'
import { ACTIVITY_STATES, EVENT_NAMES, TEXT_COLORS } from './types'
import type { Animation, Theme } from './types'
import { deepsea } from './deepsea'
import { mario } from './mario'
import { metroid } from './metroid'
import { zelda } from './zelda'
import { minecraft } from './minecraft'
import { megaman } from './megaman'
import { castlevania } from './castlevania'
import { doom } from './doom'
import { fantasy } from './fantasy'

const still: Animation = { frames: [{ actors: [] }], loop: true }
const once: Animation = { frames: [{ actors: [] }], loop: false }

/** The clean pane: no scene, the plain information list. Every slot filled. */
export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default',
  description: 'The clean information pane',
  version: '1.0.0',
  palette: {
    dark: { accent: '#5fafd7', gold: '#d7af5f', red: '#ff5f5f', label: '#87afd7', dim: '#8a8a8a', text: '#e4e4e4' },
    light: { accent: '#005f87', gold: '#875f00', red: '#af0000', label: '#005f87', dim: '#6c6c6c', text: '#1c1c1c' },
  },
  pixels: {},
  labels: {
    context: 'Context',
    spend: 'Cost',
    cache: 'Cache',
    limits: 'Limits',
  },
  headings: {},
  sprites: {},
  states: Object.fromEntries(ACTIVITY_STATES.map(s => [s, still])) as Theme['states'],
  overkill: {},
  events: Object.fromEntries(EVENT_NAMES.map(e => [e, once])) as Theme['events'],
  text: {
    idle: 'Idle',
    thinking: 'Thinking',
    reading: 'Reading',
    editing: 'Editing',
    shell: 'Running a command',
    agents: 'Agents at work',
    toolSuccess: 'Tool call succeeded',
    toolError: 'Tool call failed',
    turnComplete: 'Turn complete',
    milestone: 'Context milestone',
    cacheCold: 'Cache went cold',
    limitWarning: `Limit above ${LIMIT_LEVELS.caution}%`,
    compaction: 'Conversation compacted',
    modelChange: 'Model changed',
    effortChange: 'Effort changed',
  },
  messages: {},
}

export const THEMES: Record<string, Theme> = {
  default: defaultTheme,
  zelda,
  metroid,
  mario,
  deepsea,
  minecraft,
  megaman,
  castlevania,
  doom,
  fantasy,
}

/** Names that pick a theme besides its id. */
const ALIASES: Record<string, string> = {
  quest: 'zelda',
  hyrule: 'zelda',
  legend: 'zelda',
  prime: 'metroid',
  samus: 'metroid',
  bros: 'mario',
  mushroom: 'mario',
  sea: 'deepsea',
  ocean: 'deepsea',
  nautilus: 'deepsea',
  craft: 'minecraft',
  tokencraft: 'minecraft',
  steve: 'minecraft',
  mega: 'megaman',
  rockman: 'megaman',
  vania: 'castlevania',
  symphony: 'castlevania',
  belmont: 'castlevania',
  dracula: 'castlevania',
  kneedeep: 'doom',
  doomguy: 'doom',
  slayer: 'doom',
  final: 'fantasy',
  ff: 'fantasy',
  jrpg: 'fantasy',
}

export function themeId(name: string): string | null {
  const key = name.trim().toLowerCase()
  if (THEMES[key]) return key
  return ALIASES[key] ?? null
}

/** Every sprite name a pack's scene, bar and frames refer to. */
export function spritesUsed(pack: Theme): Set<string> {
  const names = new Set<string>()
  const spec = pack.scene
  if (!spec) return names
  for (const anim of [...Object.values(pack.states ?? {}), ...Object.values(pack.events ?? {}), ...Object.values(pack.overkill ?? {}), ...Object.values(pack.cold ?? {})]) {
    for (const f of anim?.frames ?? []) for (const a of f.actors) if (!a.sprite.startsWith('@')) names.add(a.sprite)
  }
  Object.values(spec.hero).forEach(n => names.add(n))
  Object.values(spec.weapons).forEach(w => [w.sprite, w.aura].forEach(n => n && names.add(n)))
  Object.values(spec.heroForms ?? {}).forEach(f => Object.values(f?.poses ?? {}).forEach(n => names.add(n)))
  Object.values(spec.heroExtras ?? {}).forEach(x => x && names.add(x.sprite))
  for (const w of spec.bar?.widgets ?? []) {
    if (w.kind === 'counter' && w.icon) names.add(w.icon)
    if (w.kind === 'box') [w.sprite, ...Object.values(w.sprites ?? {})].forEach(n => n && names.add(n))
    if (w.kind === 'meter') [...w.sprites, ...(w.last ?? [])].forEach(n => names.add(n))
  }
  const bg = spec.background
  for (const n of [bg.border, bg.floor, ...(bg.decor ?? []).map(d => d.sprite)]) if (n) names.add(n)
  if (spec.stamina) names.add(spec.stamina.tagIcon)
  return names
}

export type ResolvedTheme = { theme: Theme; missing: string[] }

/** Resolved packs by id, with the pack each came from (a replaced pack resolves again). */
const resolved = new Map<string, { pack: Theme; result: ResolvedTheme }>()

/**
 * A theme with every slot present: what the pack lacks comes from `default`
 * (and a missing sprite draws nothing). `missing` names what fell back.
 * Resolved once per pack: the animation asks several times a second.
 */
export function resolveTheme(id: string): ResolvedTheme {
  const pack = THEMES[id] ?? defaultTheme
  const hit = resolved.get(id)
  if (hit && hit.pack === pack) return hit.result
  const result = resolvePack(pack)
  resolved.set(id, { pack, result })
  return result
}

function resolvePack(pack: Theme): ResolvedTheme {
  const base = defaultTheme
  const missing: string[] = []
  const states = { ...base.states }
  for (const s of ACTIVITY_STATES) {
    if (pack.states?.[s]?.frames?.length) states[s] = pack.states[s]
    else if (pack.scene) missing.push(`states.${s}`)
  }
  const events = { ...base.events }
  for (const e of EVENT_NAMES) {
    if (pack.events?.[e]?.frames?.length) events[e] = pack.events[e]
    else if (pack.scene) missing.push(`events.${e}`)
  }
  const text = { ...base.text }
  for (const k of Object.keys(base.text) as (keyof Theme['text'])[]) {
    if (pack.text?.[k]) text[k] = pack.text[k]
    else missing.push(`text.${k}`)
  }
  const palette = { dark: { ...base.palette.dark, ...pack.palette?.dark }, light: { ...base.palette.light, ...pack.palette?.light } }
  for (const mode of ['dark', 'light'] as const) {
    for (const k of TEXT_COLORS) if (!pack.palette?.[mode]?.[k]) missing.push(`palette.${mode}.${k}`)
  }
  if (pack.scene) {
    for (const n of spritesUsed({ ...pack, states, events })) if (!pack.sprites?.[n]) missing.push(`sprites.${n}`)
  }
  return {
    theme: {
      ...base,
      ...pack,
      labels: { ...base.labels, ...pack.labels },
      palette,
      states,
      events,
      text,
      overkill: pack.overkill ?? {},
      messages: pack.messages ?? {},
    },
    missing,
  }
}
