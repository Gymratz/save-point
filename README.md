# Save Point

Context, cost and cache at a glance, for Claude Code.

- A band above the prompt: model, effort, context used, cost, the prompt-cache timer and the next message's cost floor, rate limits, tool calls.
- A `/hud` pane: context over the session, cost, tokens, limits, tools and files, with animated retro themes.
- Autopilot (off by default): context notices every 10%, an agent spawn backstop, a compaction guard (turns auto-compact off above a threshold) and effort hints, so a long session reaches a good save point instead of running out.

## Install

In Claude Code:

```
/plugin marketplace add Gymratz/gymratz-plugins
/plugin install save-point@gymratz-plugins
```

Start a new session. The band appears after the first response; type `/hud` for the pane.

From a clone instead (to follow the code or change it):

```
git clone https://github.com/Gymratz/save-point.git
claude --plugin-dir /path/to/save-point/save-point
```

To load a clone in every session, add it to the `env` block of `~/.claude/settings.json`: `"CLAUDE_CODE_PLUGIN_DIRS": "/path/to/save-point/save-point"` (several folders separated with `;` on Windows, `:` on macOS/Linux).

On an Enterprise or Team plan, an organization policy that allows only managed mods (`allowManagedModsOnly`) stops it from loading; an admin decides that.

## Use

- `/hud`: toggle the pane.  Tabs: Quest, Cost, Tools, Limits, About; Theme dropdown at the top; Autopilot and each of its parts on/off on the Limits tab, each with what it does.  These choices carry to new sessions.
- `/hud band full|compact|off`, `/hud theme <name>`, `/hud theme preview`, `/hud autopilot on|off`, `/hud effort-check`, `/hud reset`, `/hud prices`, `/hud text`.

## Themes

Pick one from the Theme dropdown in the pane (or `/hud theme <name>`).  Each draws a hero per model (Haiku, Sonnet, Opus, Fable) and a weapon per effort level, and its world changes as the context fills.

| Theme | Id | Context | Cost | Cache |
|---|---|---|---|---|
| The plain information pane | `default` | | | |
| The Legend of Context | `zelda` | hearts | rupees | stamina ring |
| Context Prime | `metroid` | energy tanks | missiles | charge |
| Super Context Bros. | `mario` | WORLD 1-1 to 8-4 | coins | TIME |
| Twenty Thousand Tokens Under the Sea | `deepsea` | the dive, in metres | pearls | air |
| Tokencraft | `minecraft` | hearts, mining toward bedrock | emeralds | hunger |
| Mega Context | `megaman` | life energy | bolts | weapon energy |
| Symphony of the Tokens | `castlevania` | PLAYER bar, deeper into the castle | hearts | candle |
| Knee-Deep in the Context | `doom` | HEALTH % and the face, episode by episode | ammo spent | armor |
| Final Context | `fantasy` | HP | Gil | MP |
| Close Encounters of the Probed Kind | `alien` | the herd not yet probed, with dawn on its way | sample jars | the cow's sedative |

The About tab shows every theme's heroes and weapons; "Play every scene on Quest" runs through all its animations.  Milestone banners follow your context thresholds (`contextWarnPercent` and the rest).

The scene fits the pane.  Themes are laid out for four pane widths: 48 columns (the action alone, the status bar in two rows), 58 (a first piece of scenery, the minimap where a theme has one), 80 (the status bar on one row) and 96 (everything).  Widths in between work; the About tab lists the four with the pane's own size under them.  A taller pane gives the scene more headroom, up to half as much again, and then more lines of the recent log.

The themes are unofficial homages; every sprite is drawn fresh.  The games and their names belong to their owners.

## Develop

```
claude plugin validate save-point
claude plugin test save-point
```

Type-check with `npx -p typescript tsc -p save-point --noEmit` once Claude Code has loaded the plugin from your clone: loading writes the engine's types into `save-point/.claude-plugin/types/`, which `tsconfig.json` extends.

Adding a theme: write a pack in `save-point/hooks/themes/` (`types.ts` is the contract, `kit.ts` has the frame helpers, `zelda.ts` is the pack to read first), register it in `themes/index.ts`; the tests check every pack.  Keep the action (the largest hero and everything it touches) inside columns 0 to 45 and anchor scenery past it to the right edge with `minColumns`: the tests draw every frame for every hero at 48, 58, 80 and 96 columns and fail on anything outside the scene, and on a status bar that does not fit its rows.

## License

MIT; see `LICENSE`.
