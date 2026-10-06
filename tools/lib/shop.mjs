// The office shop (~/.pixel-agents/asaoffice-shop.json): the Kas buys décor for the building and looks for the villagers.
//   decor        { <item id>: how many were bought }; each purchase adds one piece of furniture to ~/.pixel-agents/layout.json,
//                for good: it survives every day and is capped at DECOR[id].max.
//   consumables  { day, items: { <item id>: how many were bought today } } — same idea, but SEASONAL instead of DECOR and
//                capped per day (dailyMax). The first shop read on a new day wilts yesterday's: items reset to empty and
//                their furniture pieces (uid "f-season-…") come back out of the layout, same lazy once-a-day check as
//                dayend.js's payout (no separate scheduler).
//   outfits      { <palette>: { owned: [preset ids], worn: preset id | null } }   a villager's outfit colours (hue shift)
//   titles       { <palette>: { owned: [title ids], worn: title id | null } }     a title in front of a villager's name
// Décor is only ever placed in spots that are known to be free (the garden's grass beside the entrance path, bare wall), and a
// purchase is refused, without charging, when there is no such spot left or when it would cut anyone off from the rest of the
// office. Money is taken by ledger.spend(), and a failed placement gives nothing away.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadLedger, spend } from './ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const stateFile = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-shop.json');
const layoutFile = () => path.join(os.homedir(), '.pixel-agents', 'layout.json');

const WALL = 0;
const VOID = 255;
const GRASS = 7;
const GARDEN_ROWS = [18, 22];
const KEEP_CLEAR = [14, 18]; // the entrance path and the tiles beside it stay open

// Footprints (tiles) come from the furniture manifests; `bg` = rows at the top that people may walk behind.
export const DECOR = {
  bench: { type: 'COZY_BENCH', zone: 'garden', price: 200, max: 2, w: 2, h: 1, bg: 0, icon: '🪑' },
  lantern: { type: 'COZY_LANTERN', zone: 'garden', price: 150, max: 3, w: 1, h: 2, bg: 1, icon: '🏮' },
  tree: { type: 'COZY_TREE', zone: 'garden', price: 400, max: 2, w: 2, h: 3, bg: 2, icon: '🌳' },
  bush: { type: 'COZY_BUSH', zone: 'garden', price: 80, max: 4, w: 1, h: 1, bg: 0, icon: '🌿' },
  flowers: { type: 'COZY_FLOWERS', zone: 'garden', price: 60, max: 6, w: 1, h: 1, bg: 1, icon: '🌸' },
  scarecrow: { type: 'COZY_SCARECROW', zone: 'garden', price: 250, max: 1, w: 1, h: 2, bg: 1, icon: '🎃' },
  barrel: { type: 'COZY_BARREL', zone: 'garden', price: 120, max: 2, w: 1, h: 2, bg: 1, icon: '🛢️' },
  crate: { type: 'COZY_CRATE', zone: 'garden', price: 70, max: 3, w: 1, h: 1, bg: 0, icon: '📦' },
  basket: { type: 'COZY_BASKET', zone: 'garden', price: 90, max: 2, w: 1, h: 1, bg: 0, icon: '🧺' },
  well: { type: 'COZY_WELL', zone: 'garden', price: 600, max: 1, w: 2, h: 2, bg: 1, icon: '⛲' },
  pond: { type: 'COZY_POND', zone: 'garden', price: 900, max: 1, w: 3, h: 2, bg: 0, icon: '🦆' },
  painting: { type: 'COZY_PAINTING', zone: 'wall', price: 350, max: 3, w: 2, h: 2, bg: 0, icon: '🖼️' },
  clock: { type: 'COZY_CLOCK', zone: 'wall', price: 200, max: 2, w: 1, h: 2, bg: 0, icon: '🕰️' },
  bookshelf: { type: 'COZY_BOOKSHELF', zone: 'wall', price: 450, max: 3, w: 2, h: 2, bg: 0, icon: '📚' },
};

// Seasonal décor: a sink that never "finishes" — bought and placed exactly like DECOR, but capped per day
// (dailyMax) instead of forever, and wiped (state + layout) the next time the shop is read on a new day.
export const SEASONAL = {
  sunflower: { type: 'COZY_SUNFLOWER', zone: 'garden', price: 25, dailyMax: 3, w: 1, h: 2, bg: 1, icon: '🌻' },
  fern: { type: 'COZY_FERN', zone: 'garden', price: 20, dailyMax: 3, w: 1, h: 2, bg: 1, icon: '🌿' },
};
// Placement (spotsFor/findSpot/footprintOf) treats décor and seasonal pieces the same way, so they share one lookup.
const PLACEABLE = { ...DECOR, ...SEASONAL };
const SEASON_PREFIX = 'f-season-';

// Outfit colours: the villager's clothes, as a hue shift in degrees (0 = the original look).
export const OUTFITS = {
  rose: { hue: 330, price: 200 }, sunset: { hue: 20, price: 200 }, honey: { hue: 50, price: 200 }, moss: { hue: 100, price: 200 },
  mint: { hue: 150, price: 200 }, lagoon: { hue: 190, price: 200 }, dusk: { hue: 250, price: 200 }, plum: { hue: 290, price: 200 },
};
export const TITLES = {
  gardener: { price: 150 }, chef: { price: 150 }, sir: { price: 150 }, dr: { price: 150 }, captain: { price: 150 }, maestro: { price: 150 },
};
const PALETTES = 12; // faces 0–11; Shades (12) isn't dressed up

const readJson = (f, fallback) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; }
};
const writeJson = (f, v) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(`${f}.tmp`, JSON.stringify(v, null, 2));
  fs.renameSync(`${f}.tmp`, f);
};

const pad2 = (n) => String(n).padStart(2, '0');
const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Yesterday's seasonal décor, if any: cleared from the state and taken back out of the layout, once, the first
 * time the shop is read on a new day (same lazy dayKey check dayend.js uses for the payout — no cron). Writes the
 * reset back to stateFile() itself so it only runs once per day even though loadShop() is read very often.
 */
function freshConsumables(raw, restOfState) {
  const today = todayKey();
  if (raw && raw.day === today) {
    const items = {};
    for (const [id, n] of Object.entries(raw.items ?? {})) if (SEASONAL[id] && Number.isInteger(n) && n > 0) items[id] = Math.min(n, SEASONAL[id].dailyMax);
    return { day: today, items };
  }
  if (raw) { // a new day: yesterday's pieces wilt out of the layout
    try {
      const layout = readJson(layoutFile(), null);
      if (layout && Array.isArray(layout.furniture)) {
        const before = layout.furniture.length;
        layout.furniture = layout.furniture.filter((f) => !String(f.uid ?? '').startsWith(SEASON_PREFIX));
        if (layout.furniture.length !== before) writeJson(layoutFile(), layout);
      }
    } catch { /* best effort: the state still resets below even if the layout write fails */ }
  }
  const fresh = { day: today, items: {} };
  writeJson(stateFile(), { ...restOfState, consumables: fresh }); // persist once so this doesn't re-run all day
  return fresh;
}

export function loadShop() {
  const j = readJson(stateFile(), {});
  const decor = {};
  for (const [id, n] of Object.entries(j.decor ?? {})) if (DECOR[id] && Number.isInteger(n) && n > 0) decor[id] = Math.min(n, DECOR[id].max);
  const dressing = (src, catalog) => {
    const out = {};
    for (const [p, v] of Object.entries(src ?? {})) {
      if (!/^\d+$/.test(p) || Number(p) >= PALETTES) continue;
      const owned = [...new Set((v?.owned ?? []).filter((id) => catalog[id]))];
      out[p] = { owned, worn: owned.includes(v?.worn) ? v.worn : null };
    }
    return out;
  };
  const outfits = dressing(j.outfits, OUTFITS);
  const titles = dressing(j.titles, TITLES);
  const consumables = freshConsumables(j.consumables, { decor, outfits, titles });
  return { decor, outfits, titles, consumables };
}

/** What the shop window needs: the catalog, what is owned, and what the layout still has room for. */
export function shopInfo() {
  const state = loadShop();
  const layout = readJson(layoutFile(), null);
  const room = {};
  const seasonRoom = {};
  if (layout) {
    for (const id of Object.keys(DECOR)) room[id] = !!findSpot(layout, id);
    for (const id of Object.keys(SEASONAL)) seasonRoom[id] = !!findSpot(layout, id);
  }
  return {
    ...state, room, seasonRoom, hasLayout: !!layout,
    catalog: Object.fromEntries(Object.entries(DECOR).map(([id, d]) => [id, { price: d.price, max: d.max, zone: d.zone, icon: d.icon, w: d.w, h: d.h }])),
    seasonal_catalog: Object.fromEntries(Object.entries(SEASONAL).map(([id, d]) => [id, { price: d.price, dailyMax: d.dailyMax, zone: d.zone, icon: d.icon, w: d.w, h: d.h }])),
    outfits_catalog: Object.fromEntries(Object.entries(OUTFITS).map(([id, o]) => [id, o])),
    titles_catalog: Object.fromEntries(Object.entries(TITLES).map(([id, o]) => [id, o])),
  };
}

// ── Placement ──
const dims = (l) => ({ cols: l.cols, rows: l.rows });
const tileAt = (l, c, r) => (c < 0 || r < 0 || c >= l.cols || r >= l.rows ? VOID : l.tiles[r * l.cols + c]);

/** The footprint of a piece of furniture in the layout (type may carry a ":left"-style variant). */
const footprintOf = (type) => {
  const base = String(type).split(':')[0];
  const d = Object.values(PLACEABLE).find((x) => x.type === base);
  if (d) return { w: d.w, h: d.h, bg: d.bg };
  try {
    const dir = path.join(root, 'stardew-pack', 'assets', 'furniture');
    // furniture ids may be COZY_X_FRONT / _BACK / _SIDE: their manifests live under the base folder
    for (const name of [base, base.replace(/_(FRONT|BACK|SIDE|LEFT|OFF|ON)(_.*)?$/, '')]) {
      const dirs = fs.readdirSync(dir).filter((n) => n === name);
      if (dirs.length) {
        const m = JSON.parse(fs.readFileSync(path.join(dir, name, 'manifest.json'), 'utf8'));
        const per = m.members?.find((x) => x.id === base) ?? m;
        return { w: per.footprintW ?? 1, h: per.footprintH ?? 1, bg: per.backgroundTiles ?? m.backgroundTiles ?? 0 };
      }
    }
  } catch { /* fall through */ }
  return { w: 1, h: 1, bg: 0 };
};

function occupancy(l) {
  const occ = new Set();
  for (const f of l.furniture ?? []) {
    const fp = footprintOf(f.type);
    for (let r = 0; r < fp.h; r++) for (let c = 0; c < fp.w; c++) occ.add(`${f.col + c},${f.row + r}`);
  }
  return occ;
}

// How many tiles can be reached on foot from the front door, with `extra` tiles blocked (furniture blocks its footprint
// except the top `bg` rows; everything else but walls and void is floor).
function reachable(l, blocked, start) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const [c, r] = queue.pop().split(',').map(Number);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      const key = `${nc},${nr}`;
      if (seen.has(key) || blocked.has(key)) continue;
      const t = tileAt(l, nc, nr);
      if (t === WALL || t === VOID) continue;
      seen.add(key);
      queue.push(key);
    }
  }
  return seen;
}

function blockedBy(l) {
  const blocked = new Set();
  for (const f of l.furniture ?? []) {
    const fp = footprintOf(f.type);
    const wall = f.row === 0 || f.row === 9; // wall décor sits on void/wall tiles that nobody can walk on anyway
    const bg = wall ? fp.h : fp.bg;
    for (let r = bg; r < fp.h; r++) for (let c = 0; c < fp.w; c++) blocked.add(`${f.col + c},${f.row + r}`);
  }
  return blocked;
}

function spotsFor(l, id) {
  const d = PLACEABLE[id];
  const occ = occupancy(l);
  const out = [];
  if (d.zone === 'wall') {
    for (const row of [0, 9]) {
      for (let col = 4; col + d.w <= 29; col++) {
        let ok = true;
        for (let r = 0; r < d.h && ok; r++) {
          for (let c = 0; c < d.w && ok; c++) {
            const t = tileAt(l, col + c, row + r);
            const wallRow = r === d.h - 1;
            if (occ.has(`${col + c},${row + r}`)) ok = false;
            else if (wallRow ? t !== WALL : t !== VOID && t !== WALL) ok = false;
          }
        }
        // keep clear of the doorways, the partition walls and the corner posts
        if (ok && [14, 15, 16, 24, 3, 29].some((x) => x >= col && x < col + d.w)) ok = false;
        // a bit of air between pieces: not directly touching another wall piece on either side
        if (ok && ((occ.has(`${col - 1},${row + d.h - 2}`)) || occ.has(`${col + d.w},${row + d.h - 2}`))) ok = false;
        if (ok) out.push({ col, row });
      }
    }
  } else {
    // The grass around the building: the front garden, and the strips down both sides.
    for (let row = 2; row + d.h - 1 <= GARDEN_ROWS[1]; row++) {
      for (let col = 0; col + d.w - 1 <= l.cols - 1; col++) {
        let ok = true;
        for (let r = 0; r < d.h && ok; r++) {
          for (let c = 0; c < d.w && ok; c++) {
            const cc = col + c;
            if (tileAt(l, cc, row + r) !== GRASS || occ.has(`${cc},${row + r}`)) ok = false;
            if (row + r >= GARDEN_ROWS[0] - 1 && cc >= KEEP_CLEAR[0] && cc <= KEEP_CLEAR[1]) ok = false;
          }
        }
        // small pieces keep a little air around them (the fence row excepted) so they spread out; big ones take what fits
        if (ok && d.w * d.h === 1) {
          for (let r = 0; r < d.h && ok; r++) {
            if (occ.has(`${col - 1},${row + r}`) || occ.has(`${col + d.w},${row + r}`)) ok = false;
          }
          for (let c = 0; c < d.w && ok; c++) {
            if (occ.has(`${col + c},${row - 1}`) || (row + d.h < 23 && occ.has(`${col + c},${row + d.h}`))) ok = false;
          }
        }
        if (ok) out.push({ col, row });
      }
    }
  }
  return out;
}

// The first spot that keeps everyone connected; picks start from a different place each purchase so the pieces scatter.
function findSpot(l, id, salt = 0) {
  const spots = spotsFor(l, id);
  if (!spots.length) return null;
  const blocked = blockedBy(l);
  const door = { c: 16, r: 18 };
  const start = `${door.c},${door.r}`;
  const before = reachable(l, blocked, start);
  const d = PLACEABLE[id];
  const tryOrder = [...spots.keys()].map((i) => (i + salt * 7 + id.length * 3) % spots.length);
  for (const i of tryOrder) {
    const s = spots[i];
    const add = new Set();
    for (let r = d.bg; r < d.h; r++) for (let c = 0; c < d.w; c++) add.add(`${s.col + c},${s.row + r}`);
    const after = reachable(l, new Set([...blocked, ...add]), start);
    let lost = 0;
    for (const k of before) if (!after.has(k) && !add.has(k)) lost++;
    if (lost === 0) return s;
  }
  return null;
}

// ── Buying ──
function nextUid(l) {
  let n = 0;
  for (const f of l.furniture ?? []) {
    const m = /^f-shop-(\d+)$/.exec(f.uid ?? '');
    if (m) n = Math.max(n, Number(m[1]));
  }
  return `f-shop-${String(n + 1).padStart(3, '0')}`;
}
/** Seasonal pieces get their own uid prefix so freshConsumables() can tell them apart from permanent décor. */
function nextSeasonUid(l) {
  let n = 0;
  for (const f of l.furniture ?? []) {
    const m = new RegExp(`^${SEASON_PREFIX}(\\d+)$`).exec(f.uid ?? '');
    if (m) n = Math.max(n, Number(m[1]));
  }
  return `${SEASON_PREFIX}${String(n + 1).padStart(3, '0')}`;
}

/** { item } — places one piece of permanent décor (capped at DECOR[id].max) and returns the new layout + the piece. */
function buyDecor(state, body) {
  const id = String(body.item);
  const d = DECOR[id];
  if (!d) return { error: 'item' };
  if ((state.decor[id] ?? 0) >= d.max) return { error: 'max' };
  if (loadLedger().kas < d.price) return { error: 'kas' };
  const layout = readJson(layoutFile(), null);
  if (!layout || !Array.isArray(layout.furniture)) return { error: 'layout' };
  const spot = findSpot(layout, id, state.decor[id] ?? 0);
  if (!spot) return { error: 'room' };
  const spent = spend(d.price);
  if (!spent) return { error: 'kas' };
  const piece = { uid: nextUid(layout), type: d.type, col: spot.col, row: spot.row };
  layout.furniture.push(piece);
  try {
    writeJson(layoutFile(), layout);
  } catch (err) {
    return { error: 'write', message: err.message };
  }
  state.decor[id] = (state.decor[id] ?? 0) + 1;
  writeJson(stateFile(), state);
  return { ok: true, piece, layout, kas: spent.kas, shop: shopInfo() };
}

/** { item } — same as buyDecor, but from SEASONAL and capped per day; see freshConsumables() for the daily reset. */
function buySeasonal(state, body) {
  const id = String(body.item);
  const d = SEASONAL[id];
  if (!d) return { error: 'item' };
  const have = state.consumables.items[id] ?? 0;
  if (have >= d.dailyMax) return { error: 'max' };
  if (loadLedger().kas < d.price) return { error: 'kas' };
  const layout = readJson(layoutFile(), null);
  if (!layout || !Array.isArray(layout.furniture)) return { error: 'layout' };
  const spot = findSpot(layout, id, have);
  if (!spot) return { error: 'room' };
  const spent = spend(d.price);
  if (!spent) return { error: 'kas' };
  const piece = { uid: nextSeasonUid(layout), type: d.type, col: spot.col, row: spot.row };
  layout.furniture.push(piece);
  try {
    writeJson(layoutFile(), layout);
  } catch (err) {
    return { error: 'write', message: err.message };
  }
  state.consumables.items[id] = have + 1;
  writeJson(stateFile(), state);
  return { ok: true, piece, layout, kas: spent.kas, shop: shopInfo() };
}

/** { item, palette } — buys (or switches to, when owned) an outfit colour or a title for that villager. */
function buyLook(state, kind, body) {
  const catalog = kind === 'outfit' ? OUTFITS : TITLES;
  const book = kind === 'outfit' ? state.outfits : state.titles;
  const p = Number(body.palette);
  if (!Number.isInteger(p) || p < 0 || p >= PALETTES) return { error: 'palette' };
  const id = body.item === null ? null : String(body.item);
  if (id !== null && !catalog[id]) return { error: 'item' };
  const mine = (book[p] ??= { owned: [], worn: null });
  let kas = loadLedger().kas;
  if (id !== null && !mine.owned.includes(id)) {
    const spent = spend(catalog[id].price);
    if (!spent) return { error: 'kas' };
    kas = spent.kas;
    mine.owned.push(id);
  }
  mine.worn = id;
  writeJson(stateFile(), state);
  return { ok: true, kas, shop: shopInfo() };
}

const BUY_HANDLERS = {
  decor: buyDecor,
  seasonal: buySeasonal,
  outfit: (state, body) => buyLook(state, 'outfit', body),
  title: (state, body) => buyLook(state, 'title', body),
};

/**
 * kind: 'decor' | 'seasonal' | 'outfit' | 'title'. Returns { ok, ... } or { error }.
 *   decor:    { item }              permanent décor, capped at DECOR[id].max
 *   seasonal: { item }              same, but from SEASONAL and capped per day (resets the next day)
 *   outfit:   { item, palette }     buys (or switches to, when owned) a colour for that villager
 *   title:    { item, palette }
 *   (item: null for outfit/title switches back to the original look without paying)
 */
export function buy(body) {
  const handler = BUY_HANDLERS[body?.kind];
  if (!handler) return { error: 'kind' };
  return handler(loadShop(), body);
}

/** Puts the décor that was already bought back into a freshly installed layout (npm run layout), at no charge. Returns how many pieces. */
export function restoreDecor() {
  const layout = readJson(layoutFile(), null);
  if (!layout || !Array.isArray(layout.furniture)) return 0;
  let placed = 0;
  const state = loadShop();
  for (const [id, n] of Object.entries(state.decor)) {
    for (let i = 0; i < n; i++) {
      const spot = findSpot(layout, id, i);
      if (!spot) continue;
      layout.furniture.push({ uid: nextUid(layout), type: DECOR[id].type, col: spot.col, row: spot.row });
      placed++;
    }
  }
  if (placed) writeJson(layoutFile(), layout);
  return placed;
}

/** What the feed hands to every view of the office: the look each face currently wears, { <palette>: { hue, title } }. */
export function wornLooks() {
  const state = loadShop();
  const out = {};
  for (let p = 0; p < PALETTES; p++) {
    const hue = OUTFITS[state.outfits[p]?.worn]?.hue ?? 0;
    const title = state.titles[p]?.worn ?? null;
    if (hue || title) out[p] = { hue, title };
  }
  return out;
}
