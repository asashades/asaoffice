# asaoffice — a Stardew-style pixel office for Claude Code

> 🇮🇩 **Pemula?** Baca [PANDUAN.md](PANDUAN.md): panduan langkah demi langkah dalam bahasa Indonesia.

A cozy farmhouse reskin of [`pixel-agents`](https://github.com/pixel-agents-hq/pixel-agents): every Claude Code
session turns into a little villager who walks to a wooden desk, types on a retro computer while the agent edits
files, reads while it searches, and pops a bubble when it's waiting on you. It runs locally and you can watch it
from your phone through a tunnel.

![The office running pixel-agents 1.4.1 with this pack](docs/office.png)

The pack is **original pixel art**, drawn by `tools/` in a Stardew Valley–*inspired* style (warm wood, gingham,
sunflowers, a hen). No sprites are taken from Stardew Valley or any other game.

| Villagers (walk · type · read, 3 directions) | Furniture |
| --- | --- |
| ![characters](docs/characters.png) | ![furniture](docs/furniture.png) |

## What's in here

| Path | What it is |
| --- | --- |
| `stardew-pack/` | External asset directory for **Settings → Add Asset Directory**: 6 characters, 19 furniture items (desk, chair, retro PC with on/off animation, sofa, fireplace, window, bookshelf, plants…), and a hen pet. |
| `overlay/` | Stardew floors (9 textures), wallpaper/wainscot walls, and the same 6 characters, for the parts `pixel-agents` only loads from its own bundle. |
| `addon/` | Browser add-ons for the office: [idle chat](#idle-chat), a [villager card, clickable calendar and Holo-board](#villager-card-calendar-and-holo-board), and a [camera lock, notifications, task board and day & night](#camera-lock-notifications-task-board-and-day--night). |
| `layouts/stardew-office.json` | A ready-made office: a 6-desk workroom, fireplace lounge, and kitchenette. Import it via **Layout → Import**, or `npm run layout`. |
| `tools/` | The sprite generator (`npm run generate`), plus setup, launcher, and tunnel scripts. |

## Quick start

You need Node.js 20+ and the Claude Code CLI, on the machine where you run Claude.

```bash
git clone <this repo> ~/asaoffice
cd ~/asaoffice
npm install
npm run setup      # register the pack, apply the overlay, install the layout (run with the office stopped)
```

`npm run setup` runs three steps you can also run on their own:

- `npm run register` adds `stardew-pack/` to `~/.pixel-agents/config.json`. That's the same as **Settings → Add Asset Directory**.
- `npm run overlay` copies `overlay/` into this repo's installed copy of `pixel-agents`, installs the idle-chat addon, and backs up the originals. Undo it with `npm run overlay:restore`.
- `npm run layout` backs up `~/.pixel-agents/layout.json`, then installs the Stardew layout.

### Phase 1: run it and watch a real session

```bash
cd ~/code/my-project                 # the workspace whose Claude sessions you want to see
npm --prefix ~/asaoffice run office  # starts pixel-agents on http://127.0.0.1:3100
```

1. Open the printed `http://127.0.0.1:3100/?token=…` URL. The token is a secret, so don't share it.
2. When the onboarding asks, approve **Install Hooks** (or later, turn on **Settings → Instant Detection (Hooks)**).
3. In another terminal, from the same folder, start `claude`. A villager spawns. It sits and types while Claude edits
   files, reads while it searches, and shows a bubble when it needs permission.
4. If no villager appears, check that hooks are on. If the session was started in another folder, turn on
   **Settings → Watch All Sessions**.

**Claude Code in the Claude Desktop app** works too, as long as the session runs locally on your Mac (not in cloud
or remote mode). Desktop sessions often run in a different folder, or in a worktree the app creates, so turn on
**Settings → Watch All Sessions** in the office. Then give the session a task that reads or edits files. Plain Claude chats
and cloud sessions can't show up, because they don't run Claude Code on your machine.

`npm run office` always uses the `pixel-agents` installed in this repo, pinned to 1.4.1 so the overlay applies.
A bare `npx pixel-agents` would run a separate copy without the Stardew floors, walls, and base characters.
You can pass extra flags through, for example `npm --prefix ~/asaoffice run office -- --no-terminal`.
Set `OFFICE_PORT` to use a port other than 3100.

### Open it without Terminal (macOS)

```bash
npm run app        # builds ~/Applications/Asa Office.app (re-run after moving the repo or upgrading Node)
```

Open **Asa Office** from Spotlight or Finder, then right-click its Dock icon → **Options → Keep in Dock**. Clicking
it starts the office in the background if it isn't running (log: `~/Library/Logs/asaoffice/office.log`) and opens
it with the current token in its own window: an app-mode window of Chrome, Edge, or Brave if one is installed,
otherwise your default browser. Click the Dock icon again to reopen the window. Quit the app (⌘Q) to stop the
office it started; an office you started from Terminal is left alone. The first time, macOS asks whether
**Asa Office** may access your calendars. `npm run app -- --remove` deletes the app.

### Phase 2: the reskin

**Settings → Add Asset Directory** only covers characters, pets, and furniture. Floors, walls, and the six base
characters come from `pixel-agents`' own bundle, so the external directory alone gives you Stardew furniture on the
default grey floors, and a mix of old and new characters. The overlay fills that gap without touching
`pixel-agents`' source: it swaps PNGs inside `node_modules/pixel-agents/dist`. Re-run `npm run overlay` after every
`npm install`.

- **Only the pure external-directory route:** skip `npm run overlay`. Everything still works, and the Stardew
  furniture shows up in the Layout palette.
- **Colours:** floors and walls are grayscale textures. The layout tints them (warm boards, a rose rug, a cream
  checkerboard, beige wallpaper). You can re-tint any tile with the Layout editor's colour controls.
- **Editing the art:** change `tools/lib/*.mjs` and run `npm run generate` (the output is deterministic). You can
  also open the PNGs in Aseprite, or use `pixel-agents`' `scripts/asset-manager.html` for manifests.

### Phase 3: watch from your phone

The server stays on `127.0.0.1`. `npm run office` refuses `--host`. A tunnel carries it to your phone instead.
Vercel can't host this, because the office is a live Node server with a persistent WebSocket, not a static site.

```bash
# with the office running, in another terminal:
npm --prefix ~/asaoffice run tunnel            # uses cloudflared if installed, otherwise ngrok
npm --prefix ~/asaoffice run tunnel -- --ngrok # force ngrok (e.g. a fixed ngrok domain you've configured)
```

The script reads the running server's token from `~/.pixel-agents/servers/`. It prints
`https://<random>.trycloudflare.com/?token=…` and a QR code: scan the QR with your phone and bookmark the page.

- Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
  (a quick tunnel needs no account) or [ngrok](https://ngrok.com/download).
- **The tunnel URL is as sensitive as the local one.** Anyone holding it can approve hook installs. Keep it out of
  shared chats. It also ends up in browser history and the server's request log.
- The URL changes every time the tunnel restarts, unless you use a reserved ngrok domain. Restart the tunnel
  whenever you restart the office.
- If you run your own tunnel command, **don't rewrite the Host header** (no `--http-host-header` or
  `--host-header=rewrite`). `pixel-agents` only accepts WebSocket connections whose `Origin` matches `Host`.

## Idle chat

When a session is idle, its villager doesn't only sit at the desk or wander alone. Every few seconds, two
villagers that have been idle for 10 seconds or more may walk to a free spot, face each other, and chat in pixel
speech bubbles. If either one gets a task, it breaks off mid-sentence ("Waduh, ada tugas. Duluan ya!") and
`pixel-agents` walks it back to its desk as usual. Each villager then waits 45–120 seconds before chatting again,
and no chats happen while the Layout editor is open.

The lines are scripted, so they cost no tokens and work the same through the tunnel. They pick up real context
from each session: the last tool it used (edits, searches, Bash, web, sub-agents, to-dos), its project folder
(including whether both work on the same one), how full its context window is, and the time of day and weekday.

- **Language:** Indonesian by default. Add `&chatLang=en` to the office URL for English (it's remembered).
- **Turn it off:** add `&idleChat=off` to the URL (remembered; `&idleChat=on` turns it back on). To install
  the art overlay without any add-ons: `node tools/apply-overlay.mjs --no-addon`.
- **Edit the dialogue:** change `addon/idle-chat-lines.js`, run `npm run overlay`, and reload the page.
  Timing and frequency are in `CFG` at the top of `addon/idle-chat.js`.
- **Console:** `__asaoffice.idleChat.start()` starts a chat right away between any two idle villagers, and
  `__asaoffice.idleChat.conversations` lists the chats in progress.

## Villager card, calendar, and Holo-board

- **Villager card:** click a villager. Next to the usual camera follow, a card shows its name, what it's doing
  (working with which tool, needs permission, waiting for you, chatting with whom, or relaxing), its project,
  last tool, context-window fill, sub-agents, and when it appeared. Click the villager again, or ×, to close it.
- **Calendar:** click the wall calendar for a month view (Monday first, with the Stardew season) of your macOS
  Calendar events, from last month to two months ahead. Click a day for its agenda. A red badge on the calendar
  shows how many events are on today.
- **Holo-board:** the holographic screen above the fireplace shows today's tool-call count and the last 12
  hours. Click it for the dashboard: tool calls against your 14-day best, edits and files touched, reads and
  searches, commands, web, sub-agents, sessions, agents active right now, activity by hour, the last 14 days,
  and your daily streak.

Existing offices need the Holo-board placed once: run `npm run layout` (it backs up your current layout first),
or open **Layout**, find **Holo-board** among the wall items, and put it anywhere on a wall.

**Where the data comes from.** `npm run office` now also runs a small feed next to the server. Every minute it
counts tool calls in your Claude Code transcripts (`~/.claude/projects`, last 45 days, read incrementally), and
every 5 minutes it reads macOS Calendar through EventKit (`tools/lib/mac-calendar.js`). It writes one JSON file
into the webview folder, named after a SHA-256 hash of the office token, and deletes it when the office stops.
`pixel-agents` serves static files without checking the token, so the hashed name is what keeps it private:
only someone who already has the office URL (and could see the office anyway) can find it. Event titles and
calendar names are in that file; the stats are counts only, with no paths, prompts, or project names.

- **Calendar permission:** the first time the office starts, macOS asks whether Terminal (or the Asa Office app,
  or whichever app runs `npm run office`) may access your calendars. Click **Allow**. If you dismissed it, turn it on under
  **System Settings → Privacy & Security → Calendars** and restart the office. The calendar panel says which
  step is missing.
- **Skip the calendar:** `OFFICE_CALENDAR=off npm run office` never touches Calendar; the Holo-board still works.
- **A bare `npx pixel-agents`** doesn't run the feed, so the calendar and Holo-board panels stay empty.

## Camera lock, notifications, task board, and day & night

- **Camera lock (🔒 under the zoom buttons, on by default):** the view stays centred. Clicking a villager selects it
  and shows its card without the camera chasing it, and trackpad scrolling or middle-drag doesn't pan. Zoom still
  works with +/− and pinch. Click 🔓 for pixel-agents' free camera; the Layout editor is always free.
- **Notifications (🔔):** when a villager needs your permission, or finishes a turn it worked on for 8 seconds or
  more, you get a toast in the office (click it to select the villager), a short retro chime, a system notification
  if the office window isn't in front, and a vibration on phones that support it. Turning 🔔 on asks the browser for
  notification permission; 🔕 mutes everything. Browsers only play sound after you've clicked the page once.
- **Task board:** click the cork board next to the calendar for a pinned "quest" per Claude session from the last
  24 hours: its title, your last prompt, the project, today's tool calls and edited files, which villagers are on
  that project right now, and its to-do list if the session keeps one (`TodoWrite`). A green badge counts the
  villagers working right now.
- **Day & night:** the office follows your clock: rosy mornings, golden late afternoons, purple dusk, and blue nights
  with stars and a moon in the windows and warm light around the lanterns, the flickering fireplace and the screens
  of working villagers. `&dayNight=off` in the URL turns it off (remembered); `__asaoffice.dayNight.preview(21)` in
  the console previews a time, `preview(null)` goes back to the clock.

Existing offices need the task board placed once, like the Holo-board: `npm run layout`, or **Layout → Task Board**.
The task board reads the same feed as the Holo-board, which now also carries each recent session's title, last
prompt, project folder name and to-dos (same token-hashed file, so the same privacy as the calendar).

## How the add-ons hook in

`npm run overlay` copies `addon/` to `dist/webview/asaoffice/`, adds `<script>` tags for it to `index.html`
(rebuilt from the original each time), and patches one spot in the minified bundle so that it calls
`window.__asaoffice.afterRender(canvas, office, offsetX, offsetY, zoom, editMode, panRef)` after each frame.
`addon/core.js` fans that out to the add-ons, turns canvas clicks into furniture clicks, and draws the panels.
Villagers move with pixel-agents' own `walkToTile`, and everything else is drawn on the same canvas or as DOM
panels on top. The patch looks for an exact anchor in the 1.4.1 bundle. If a future release changes it,
`npm run overlay` skips the add-ons with a warning and the rest of the overlay still applies. After changing
anything in `addon/`, run `npm run overlay` and reload the page.

## Acceptance checklist

| Item | Status |
| --- | --- |
| `pixel-agents` runs and prints a local URL with a token | ✅ verified (1.4.1, `npm run office`) |
| A Claude session spawns a character; it types / reads / waits | ✅ verified with simulated hook events, then with real sessions on macOS (terminal `claude` and the Claude Desktop Code tab) |
| Office renders with Stardew-style tiles and characters, with no core source edits | ✅ external pack + asset overlay |
| Cozy layout | ✅ `layouts/stardew-office.json` |
| Viewable live from a phone via a tunnel | ✅ verified on a real phone through `npm run tunnel` (cloudflared) |
| Token URL not exposed | Bound to `127.0.0.1`; tunnel URL printed only to your terminal |

## Gotchas

- **Layout resets:** if a future `pixel-agents` release ships a default layout with a higher `layoutRevision`, it
  replaces `~/.pixel-agents/layout.json`. Keep an export, or just run `npm run layout` again.
- **Hen pet index:** the layout's pet uses `petType: 2`, which is right after the two bundled pets in 1.4.1. If a
  release adds bundled pets, re-add the hen from the Layout editor's pet tool.
- **Duplicate faces:** with the overlay on, the six villagers exist twice: once as bundled, once from the pack.
  Agents 7–12 reuse faces before any hue-shifting kicks in. It's harmless.
- **Out of scope:** Google Antigravity support (it would need a new `HookProvider`), commanding agents from the
  office, and multi-machine sync.
