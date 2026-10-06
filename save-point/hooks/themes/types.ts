// The theme contract: what a theme pack provides. Save Point computes every value
// and state; a theme only decides how each looks. Packs are plain data.

/** What the hero is doing, one at a time, looping. */
export type ActivityState = 'idle' | 'thinking' | 'reading' | 'editing' | 'shell' | 'agents'

/** One-shot moments, played once then back to the activity loop. */
export type EventName =
  | 'toolSuccess'
  | 'toolError'
  | 'turnComplete'
  | 'milestone'
  | 'cacheCold'
  | 'limitWarning'
  | 'compaction'
  | 'modelChange'
  | 'effortChange'

export const ACTIVITY_STATES: readonly ActivityState[] = ['idle', 'thinking', 'reading', 'editing', 'shell', 'agents']
export const EVENT_NAMES: readonly EventName[] = [
  'toolSuccess',
  'toolError',
  'turnComplete',
  'milestone',
  'cacheCold',
  'limitWarning',
  'compaction',
  'modelChange',
  'effortChange',
]

/**
 * Hero poses. `lie` (lying down asleep) is optional: without it the hero dozes
 * standing (`sleep`). A pack may add poses of its own (`side`, `thrust`...):
 * frames name them like the others (`@side`), and a hero or form that lacks one
 * stands.
 */
export type BasePose = 'stand' | 'walk' | 'attack' | 'itemGet' | 'sleep'
export type HeroPose = BasePose | 'lie' | (string & {})
export type HeroPoses = Record<BasePose, string> & { lie?: string; [pose: string]: string | undefined }

export type HeroTier = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'unknown'
export type WeaponTier = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** `#rrggbb` per color name. */
export type Palette = Record<string, string>

/** The text colors every scene theme names, for dark or light terminals (`#rrggbb`). */
export const TEXT_COLORS = ['accent', 'gold', 'red', 'label', 'dim', 'text'] as const

/**
 * Text colors for the Quest tab's meters and the About tab: `accent` (good,
 * names), `gold` (newest log line, caution), `red` (danger), `label` (meter
 * names), `dim` (explanations), `text` (values). More names are allowed.
 */
export type TextPalette = Record<(typeof TEXT_COLORS)[number], string> & Palette

/**
 * A sprite drawn as rows of characters; `legend` maps each character to a
 * palette name ('.' and ' ' are transparent unless the legend says otherwise).
 */
export type Sprite = { rows: string[]; legend?: Record<string, string | null> }

/** One sprite placed in a frame, relative to the scene's hero anchor. */
export type Actor = {
  sprite: string
  x: number
  y: number
  /** Pixel color names swapped for this actor only: `{ G: 'hurtA' }`. */
  swap?: Record<string, string>
  /** Draw mirrored left-right. */
  flip?: boolean
  /** Draw upside down (a weapon held aloft). */
  flipY?: boolean
  /** Wear the hero tier's palette swap too (a morph ball, a shrunken hero). */
  tier?: boolean
  /** Draw only for these hero tiers. */
  tiers?: HeroTier[]
  /** Scenery placed in the scene, not over the hero: a taller form does not lift it. */
  fixed?: boolean
  /** Draw turned a quarter (a sword stored upright, held level): `cw` points its top to the right. */
  turn?: 'cw' | 'ccw'
  /** For `@weapon`: one of the weapon's other sprites by name (`weapons.<tier>.poses`), with the same swap and aura. */
  pose?: string
  /** May cross the scene's edge (a fairy flying off, a shot leaving): the bounds check skips it. */
  offstage?: boolean
  /**
   * A full-scene layer behind everything (a night sky, darkness): drawn before
   * the cache ring, which stays on top of it; the bounds check skips it.
   */
  backdrop?: boolean
  /** Draw only while context used is in [minPercent, maxPercent) (100 included): a sky above ground, plain dark below. */
  minPercent?: number
  maxPercent?: number
}

/**
 * Text drawn into the scene at a cell position relative to the anchor. `lift`:
 * text over the hero's head rises with a taller form, as a prop does.
 */
export type SceneText = { text: string; x: number; y: number; color: string; bg?: string; lift?: boolean }

export type Frame = {
  actors: Actor[]
  texts?: SceneText[]
  /** How many ticks the frame lasts (default 1). */
  hold?: number
  /** A caption shown under the scene while the frame plays. */
  caption?: string
  /** A message box across the scene, like an in-game dialogue. */
  message?: string
}

/**
 * `variants`: other takes of the same state or moment (the enemy to the right,
 * below, diagonal). One take is picked each time it starts, and for a loop each
 * time it comes round; never the same take twice running.
 */
export type Animation = { frames: Frame[]; loop: boolean; variants?: Frame[][] }

/** The names of the meter rows under the scene, and of the About tab's lists. */
export type MeterLabels = {
  context: string
  spend: string
  cache: string
  limits: string
  /** The rows naming the model and the effort (default `B` and `A`). */
  modelItem?: string
  effortItem?: string
  /** The About tab's headings over the heroes (models) and weapons (efforts); default `Heroes`, `Weapons`. */
  heroes?: string
  weapons?: string
}

/** The scene layout: a pixel status bar, a scene, and themed meters. */
export type SceneSpec = {
  /**
   * Pixel height the scene is designed for (two pixels per terminal row). A
   * taller pane adds headroom at the top, up to half as much again: the floor,
   * the anchor and ground scenery move down; the border, `sky` scenery, the
   * cache ring and the message box stay at the top.
   */
  height: number
  /** Where the hero stands, in pixels from the scene's left and top. */
  anchor: { x: number; y: number }
  /** The scene behind the actors. Colors are palette names or `#rrggbb`. */
  background: Background
  /**
   * Hero sprite names per pose; frames name them as `@stand`, `@attack`...
   * Every pose stands on the same feet: a shorter sprite (lying down) is drawn
   * level with the bottom of `stand`.
   */
  hero: HeroPoses
  /** Pixel color swaps per hero tier (the outfit's colors for each model). */
  heroTiers: Record<HeroTier, Record<string, string>>
  /** The weapon sprite and its palette swaps per effort tier. */
  weapons: Record<WeaponTier, WeaponSpec>
  /** The hero's display names per tier. */
  heroNames: Record<HeroTier, string>
  /**
   * Sprites drawn over the standard hero per tier (a crown), at the given
   * offset. Not drawn for a tier in `heroForms`: a form's own sprites carry
   * whatever it wears.
   */
  heroExtras?: Partial<Record<HeroTier, { sprite: string; x: number; y: number }>>
  /**
   * A tier drawn with its own, larger sprites: the pose names, where the sprite
   * sits against the standard hero's top-left (`dx`, `dy`), and how far props
   * above the hero (a weapon held aloft, a potion) move up to clear it (`lift`).
   */
  heroForms?: Partial<Record<HeroTier, HeroForm>>
  /** The status bar above the scene: widgets drawn left to right. */
  bar?: {
    widgets: BarWidget[]
    /** `label`: widget labels; `text`: values; `box`: item box frames; `map`/`mapDot`: the minimap. */
    colors: { bg: string; box: string; text: string; label: string; map: string; mapDot: string }
  }
  /** The cache meter drawn as a ring in the scene, and its price tag icon. */
  stamina?: { x: number; y: number; radius: number; full: string; empty: string; cold: string; tagIcon: string; tagColor?: string; tagColdColor?: string }
  /**
   * The About tab's lineup: its backdrop and text colors (default: `background.ground`, dark ink, red for
   * yours). Weapons show as stored; `flipWeapons` draws them upside down (a sword stored pointing down).
   */
  lineup?: { ground: string; ink?: string; dim?: string; mark?: string; flipWeapons?: boolean }
  /** The dialogue box a frame's `message` draws across the scene (default: white on black). */
  message?: { bg: string; ink: string }
}

/**
 * A weapon: its sprite, the palette swap for its tier, an `aura` drawn behind
 * it on alternate ticks, and `poses`: other sprites of the same weapon (a
 * diagonal sword) that an actor asks for with `pose`, each with its own aura.
 */
export type WeaponSpec = { sprite: string; swap: Record<string, string>; aura?: string; name: string; poses?: Record<string, { sprite: string; aura?: string }> }

/**
 * A larger hero. `hand`: where a held weapon (actor `y >= 0`) moves to;
 * `aloft`: the same for a weapon held over the head (actor `y < 0`), on top of
 * `lift`. Both mirror when the weapon is flipped.
 */
export type HeroForm = { poses: HeroPoses; dx: number; dy: number; lift: number; hand?: { x: number; y: number }; aloft?: { x: number; y: number } }

/**
 * The scene's backdrop, drawn in this order: fill (`ground`, or a `gradient`
 * top to bottom that blends toward `deep` as context fills), `particles`, the
 * `border` tile along the top, the `floor` tile along the bottom, `decor`.
 */
export type Background = {
  ground: string
  /** Colors top to bottom, evenly spaced; replaces `ground` as the fill. */
  gradient?: string[]
  /** The gradient at 100% context used, blended in by the percent (the sea darkens as you dive). */
  deep?: string[]
  /** A tile repeated along the top edge (trees, a cave ceiling). */
  border?: string
  /** A tile repeated along the bottom edge (bricks, rock, sand). */
  floor?: string
  /**
   * Fixed scenery: `x` from the left, or from the right when negative; `y` from
   * the top of the scene as designed. Ground scenery moves down with the floor
   * in a taller scene; `sky` scenery (clouds, a moon, a ceiling) stays at the
   * top. Shown while context used is in [minPercent, maxPercent) (100 included)
   * and the scene is at least `minColumns` wide (scenery that would crowd the action).
   * `ring`: the cache ring's own housing (a gauge, a plaque): it goes with the
   * ring while a message box takes that corner. `lit`: it gives its own light
   * (a crystal, a lamp), so `shade` does not darken it.
   */
  decor?: { sprite: string; x: number; y: number; sky?: boolean; ring?: boolean; lit?: boolean; minPercent?: number; maxPercent?: number; minColumns?: number }[]
  /** Darkens `border`, `floor` and `decor` toward `color` as context fills, up to `amount` (0..1) at 100%. */
  shade?: { color: string; amount: number }
  /** Drifting points: bubbles, snow, glowing plankton, stars. Shown while context used is in [minPercent, maxPercent) (100 included). */
  particles?: { colors: string[]; count: number; drift: 'up' | 'down' | 'left' | 'none'; speed?: number; minPercent?: number; maxPercent?: number }[]
}

/**
 * What a meter fills by: context left, cache left, effort, headroom under the
 * highest rate limit (`limitsLeft`), or that limit itself (`limitsUsed`: fills
 * as the limit is used, empty while none is reported).
 */
export type MeterValue = 'contextLeft' | 'cache' | 'effort' | 'limitsLeft' | 'limitsUsed'

/** What a bar widget shows. Counters print it; meters fill by it. */
export type BarValue =
  | 'spend' // cents spent this session (rupees, coins, missiles…)
  | 'contextLeft' // percent of context left
  | 'contextUsed' // percent used
  | 'cacheSeconds' // seconds of warm cache left (Mario's TIME); '---' when unknown
  | 'nextWarm' // cents the next message costs while warm
  | 'limitMax' // the highest rate limit percent
  | 'world' // context as WORLD 1-1 … 8-4 (32 stages of 3.125%)
  | 'effort' // effort, 1 (low) to 5 (max)
  | 'cache' // fraction of the cache TTL left (meters)

/**
 * One part of the status bar. The bar wraps to a second row when one is not
 * enough. The map is decoration and goes first; after it, when two rows (or
 * the one row a short pane allows) cannot hold the rest, the widget with the
 * highest `drop` goes (absent: never dropped). `wrap`: where the second row
 * starts when the bar wraps, if both rows fit that way (else the split that
 * leaves the rows most even).
 */
export type BarWidget = { wrap?: boolean } & BarWidgetKind

export type BarWidgetKind =
  /** A grey minimap; the dot is the share of context used. 19 columns. */
  | { kind: 'map'; drop?: number }
  /**
   * A number: times `scale` if given, `format` with `{v}` (default `{v}`), zero-padded to `digits`;
   * an `icon` sprite before it; a `label` over it. `chars`: the fewest characters the
   * widget keeps for its text, so a growing number does not push the rest of the bar along.
   * A value not yet known shows as dashes, without `format`.
   */
  | { kind: 'counter'; value: BarValue; icon?: string; label?: string; format?: string; digits?: number; scale?: number; chars?: number; drop?: number }
  /**
   * An item box: the hero's tier (`model`) or the weapon (`effort`) drawn with its palette swap. 9 columns.
   * `sprites` picks a sprite per shown tier (a mushroom, a flower...); tiers it lacks draw `sprite`.
   */
  | { kind: 'box'; shows: 'model' | 'effort'; sprite: string; sprites?: Partial<Record<HeroTier | WeaponTier, string>>; label: string; x?: number; y?: number; drop?: number }
  /**
   * `count` icons filled by `value`, each icon in `sprites.length - 1` steps
   * (hearts in quarters: five sprites, empty to full). `last`: different
   * sprites for the final icon (Mario's P). Rows of `perRow`; filled icons
   * blink while the fill is at or under `pulseBelow`, or at or over
   * `pulseAbove` (0..1).
   */
  | { kind: 'meter'; value: MeterValue; count: number; perRow: number; sprites: string[]; last?: string[]; gap?: number; label?: string; pulseBelow?: number; pulseAbove?: number; drop?: number }

export type Theme = {
  id: string
  name: string
  description: string
  version: string
  /** Text colors for the meters and the About tab, for dark and light terminals. */
  palette: { dark: TextPalette; light: TextPalette }
  /** Pixel colors for sprites and scenery: the same on every terminal. */
  pixels: Palette
  labels: MeterLabels
  /** Section headings renamed on the information tabs: `{ Context: 'Life' }`. */
  headings: Record<string, string>
  sprites: Record<string, Sprite>
  states: Record<ActivityState, Animation>
  /** Variants while the cache is cold (the fire is out, the station powered down). */
  cold?: Partial<Record<ActivityState, Animation>>
  /** Variants of routine states while the hero is overqualified. */
  overkill: Partial<Record<ActivityState, Animation>>
  events: Record<EventName, Animation>
  /** Absent: the plain list pane, no scene. */
  scene?: SceneSpec
  /** Text fallback per state and event, for surfaces without Raster. */
  text: Record<ActivityState | EventName, string>
  /**
   * Messages with `{pct}`, `{name}`, `{weapon}` placeholders, for a frame's
   * `message` or `caption` naming the moment. `milestone` comes from `milestones`.
   */
  messages: Partial<Record<EventName, string>>
  /**
   * The milestone message (`{pct}`: the 10% step just passed) by the context
   * level it falls in, as the user's thresholds set them (`contextWarnPercent`
   * and so on; by default warn 30, orange 40, alert 50, critical 75). A level
   * without an entry uses the one below it.
   */
  milestones?: { level: 'ok' | 'warn' | 'orange' | 'alert' | 'critical'; message: string }[]
}
