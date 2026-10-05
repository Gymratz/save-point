// The frame helpers every pack uses, and color mixing shared with the scene
// renderer. Actors are placed relative to the hero's top-left (the scene's
// anchor). Pure.

import type { Actor, Animation, Frame } from './types'

/** The hero in a pose (`stand`, `attack`...), with palette swaps for this frame only. */
export const hero = (pose: string, x = 0, y = 0, swap?: Record<string, string>): Actor => ({ sprite: `@${pose}`, x, y, swap })

/** The weapon of the current effort tier. */
export const weapon = (x: number, y: number, opts: { flip?: boolean; flipY?: boolean } = {}): Actor => ({ sprite: '@weapon', x, y, ...opts })

/** A plain sprite. */
export const at = (sprite: string, x: number, y: number, opts: { swap?: Record<string, string>; flip?: boolean; flipY?: boolean; fixed?: boolean } = {}): Actor => ({ sprite, x, y, ...opts })

/** An activity loop. */
export const loop = (...frames: Frame[]): Animation => ({ frames, loop: true })

/** A one-shot moment: plays once, holding its last frame. */
export const once = (...frames: Frame[]): Animation => ({ frames, loop: false })

/** `a` blended `t` (0..1) of the way to `b`, colors as 0xrrggbb. */
export function mix(a: number, b: number, t: number): number {
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t)
  return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}

/** `mix` for `#rrggbb` strings. */
export function mixHex(a: string, b: string, t: number): string {
  return `#${mix(parseInt(a.slice(1), 16), parseInt(b.slice(1), 16), t).toString(16).padStart(6, '0')}`
}
