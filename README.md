# asaoffice — a Stardew-style pixel office for Claude Code

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
- `npm run overlay` copies `overlay/` into this repo's installed copy of `pixel-agents` and backs up the originals. Undo it with `npm run overlay:restore`.
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

`npm run office` always uses the `pixel-agents` installed in this repo, pinned to 1.4.1 so the overlay applies.
A bare `npx pixel-agents` would run a separate copy without the Stardew floors, walls, and base characters.
You can pass extra flags through, for example `npm --prefix ~/asaoffice run office -- --no-terminal`.
Set `OFFICE_PORT` to use a port other than 3100.

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

## Acceptance checklist

| Item | Status |
| --- | --- |
| `pixel-agents` runs and prints a local URL with a token | ✅ verified (1.4.1, `npm run office`) |
| A Claude session spawns a character; it types / reads / waits | ✅ verified with simulated hook events (Edit, Grep, PermissionRequest). Confirm once with a real `claude` session on your machine. |
| Office renders with Stardew-style tiles and characters, with no core source edits | ✅ external pack + asset overlay |
| Cozy layout | ✅ `layouts/stardew-office.json` |
| Viewable live from a phone via a tunnel | ✅ WebSocket verified under a foreign hostname on a phone viewport. Run `npm run tunnel` on your machine for the real thing. |
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
