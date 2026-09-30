// Builds layouts/stardew-office.json — importable via Layout → Import in pixel-agents.
// Tile ids: 0 = wall, 1..9 = floor_0..floor_8, 255 = void. (Floors here: 2 planks, 3 parquet, 4 flagstones, 6 kitchen
// tiles, 7 grass, 8 tilled soil, 9 rug.)
//
// The office is 31×30 tiles: the building is x 3–27, y 1–23, with a garden around it.
//   - Open-plan workroom (x 4–18, y 2–14) with four divisions that share one floor and are told apart only by their
//     floor tint and furniture — no walls: the Bullpen (six desks in rows), the Studio (two desks back to back), the
//     Focus corner (single desks behind fabric screens) and the Discussion corner (sofas, easel and the copier).
//   - The meeting room (x 20–26, y 2–9): a long table, Shades at its head, and the boards on the wall.
//   - The lounge (x 20–26, y 12–21) with the fireplace and the front door.
//   - A small toilet (x 4–8, y 17–21) and canteen (x 10–16, y 17–21) along the south wall.
// Walls are drawn two tiles tall (the face rises over the tile above), so the row above a wall is left as void and
// wall décor sits on the row above the wall. Windows only go on the outer walls.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COLS = 31;
const ROWS = 30;
const WALL = 0;
const VOID = 255;
const WOOD = 2; // floor_1 long vertical boards
const PARQUET = 3; // floor_2
const FLAG = 4; // floor_3 flagstones: the garden path
const KITCHEN = 6; // floor_5 checker tiles: canteen and toilet
const GRASS = 7; // floor_6 meadow
const SOIL = 8; // floor_7 tilled soil
const RUG = 9; // floor_8 soft weave

const COLORS = {
  wall: { h: 32, s: 38, b: 4, c: 0 },
  wood: { h: 30, s: 42, b: -10, c: 0 }, // Bullpen
  studio: { h: 205, s: 20, b: -2, c: 0 },
  focus: { h: 24, s: 30, b: -14, c: 4 },
  discuss: { h: 125, s: 30, b: -10, c: 0 },
  rug: { h: 8, s: 42, b: -8, c: 0 },
  director: { h: 18, s: 38, b: -22, c: 6 }, // meeting room
  kitchen: { h: 28, s: 34, b: 4, c: 0 },
  bath: { h: 196, s: 30, b: 6, c: 0 },
  grass: { h: 98, s: 44, b: -6, c: 0 },
  soil: { h: 24, s: 40, b: -14, c: 4 },
  path: { h: 34, s: 10, b: 2, c: 0 },
};

const tiles = new Array(COLS * ROWS).fill(VOID);
const tileColors = new Array(COLS * ROWS).fill(null);
const put = (c, r, t, color) => {
  tiles[r * COLS + c] = t;
  tileColors[r * COLS + c] = color ?? null;
};
const fill = (c0, r0, c1, r1, t, color) => {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) put(c, r, t, color);
};

// ── Ground ──
fill(0, 1, COLS - 1, ROWS - 1, GRASS, COLORS.grass);
fill(4, 2, 26, 21, WOOD, COLORS.wood); // the building's floor; the divisions below re-tint parts of it
fill(15, 2, 18, 9, WOOD, COLORS.studio); // Studio
fill(4, 10, 11, 14, PARQUET, COLORS.focus); // Focus corner
fill(12, 10, 18, 14, RUG, COLORS.discuss); // Discussion corner
fill(20, 2, 26, 9, PARQUET, COLORS.director); // meeting room
fill(20, 12, 26, 21, RUG, COLORS.rug); // lounge
fill(4, 17, 8, 21, KITCHEN, COLORS.bath); // toilet
fill(10, 17, 16, 21, KITCHEN, COLORS.kitchen); // canteen
fill(20, 10, 26, 10, VOID); // under the meeting room's south wall
fill(4, 15, 17, 15, VOID); // under the toilet/canteen's north wall
fill(3, 22, 27, 22, VOID); // under the bottom wall

// ── Walls ──
fill(3, 1, 27, 1, WALL, COLORS.wall); // top
fill(3, 23, 27, 23, WALL, COLORS.wall); // bottom (with the front door)
fill(3, 1, 3, 23, WALL, COLORS.wall); // left
fill(27, 1, 27, 23, WALL, COLORS.wall); // right
fill(19, 1, 19, 11, WALL, COLORS.wall); // meeting room, west
fill(19, 11, 27, 11, WALL, COLORS.wall); // meeting room, south
fill(3, 16, 17, 16, WALL, COLORS.wall); // toilet and canteen, north
fill(9, 16, 9, 21, WALL, COLORS.wall); // toilet | canteen
fill(17, 16, 17, 22, WALL, COLORS.wall); // canteen, east
fill(5, 17, 5, 19, WALL, COLORS.wall); // toilet stalls
fill(7, 17, 7, 19, WALL, COLORS.wall);
// ── Doorways ──
fill(19, 5, 19, 7, PARQUET, COLORS.director); // workroom ↔ meeting room
fill(15, 15, 16, 16, WOOD, COLORS.wood); // workroom ↔ canteen
fill(9, 20, 9, 21, KITCHEN, COLORS.bath); // canteen ↔ toilet
fill(21, 22, 23, 23, FLAG, COLORS.path); // front door
// ── Garden ──
fill(21, 24, 23, 29, FLAG, COLORS.path); // path from the door
fill(12, 27, 20, 28, FLAG, COLORS.path); // branch towards the vegetable beds
fill(5, 25, 7, 26, SOIL, COLORS.soil); // beds
fill(9, 25, 11, 26, SOIL, COLORS.soil);

let n = 0;
const furniture = [];
const add = (type, col, row) => furniture.push({ uid: `f-asaoffice-${String(++n).padStart(3, '0')}`, type, col, row });

// ── Workroom, outer wall: windows go here (never on inner walls) ──
add('COZY_WINDOW', 5, 0);
add('COZY_CLOCK', 8, 0);
add('COZY_WINDOW', 10, 0);
add('COZY_BOOKSHELF', 12, 0);
add('COZY_WINDOW', 15, 0);
add('COZY_PAINTING', 17, 0);

// ── Bullpen: two rows of three desk pods, each with a retro PC and a chair facing it ──
for (const row of [3, 7])
  for (const col of [4, 8, 12]) {
    add('COZY_DESK_FRONT', col, row);
    add('COZY_PC_FRONT_OFF', col + 1, row);
    add('COZY_CHAIR_BACK', col + 1, row + 1);
  }
add('COZY_MUG', 6, 3);
add('COZY_MUG', 10, 7);
add('COZY_BASKET', 14, 3);

// ── Studio: two desks facing each other, the workers back to back ──
add('COZY_DESK_FRONT', 15, 3);
add('COZY_PC_FRONT_OFF', 16, 3);
add('COZY_CHAIR_BACK', 16, 4); // seat at y 5, facing north
add('COZY_CHAIR_FRONT', 16, 6); // seat at y 7, facing south
add('COZY_DESK_FRONT', 15, 8);
add('COZY_PC_BACK', 16, 8);
add('COZY_MUG', 17, 3);
add('COZY_FERN', 18, 3);
add('COZY_SUNFLOWER', 18, 6);

// ── Focus corner: single desks behind fabric screens ──
for (const col of [4, 8]) {
  add('COZY_DESK_FRONT', col, 11);
  add('COZY_PC_FRONT_OFF', col + 1, 11);
  add('COZY_CHAIR_BACK', col + 1, 12);
}
add('COZY_DIVIDER', 7, 11);
add('COZY_DIVIDER', 11, 11);
add('COZY_FERN', 4, 13);
add('COZY_SUNFLOWER', 11, 13);

// ── Discussion corner: sofas round a tea table, the easel and the copier ──
add('COZY_SOFA_FRONT', 14, 10);
add('COZY_SOFA_SIDE', 13, 11);
add('COZY_TEA_TABLE', 14, 11);
add('COZY_SOFA_SIDE:left', 16, 11);
add('COZY_SOFA_BACK', 14, 13);
add('COZY_MUG', 14, 12);
add('COZY_EASEL', 17, 11);
add('COZY_PRINTER', 18, 12);
add('COZY_CRATE', 12, 14);

// ── Meeting room: the boards on the wall, a long table with Shades at the head ──
add('COZY_QUESTBOARD', 20, 0); // click it for today's stats
add('COZY_TASKBOARD', 23, 0); // what each session is working on
add('COZY_MAILBOX', 25, 0); // task chats and the daily report
add('COZY_CALENDAR', 26, 0);
add('COZY_MEETING_TABLE', 22, 5);
for (const col of [22, 23, 24]) {
  add('COZY_CHAIR_FRONT', col, 3); // seats at y 4
  add('COZY_CHAIR_BACK', col, 6); // seats at y 7
}
add('COZY_CHAIR_SIDE', 21, 5); // west head
add('COZY_EXEC_CHAIR_SIDE:left', 25, 5); // Shades' seat, at the east head
add('COZY_EASEL', 20, 3);
add('COZY_FERN', 26, 3);
add('COZY_LANTERN', 20, 8);
add('COZY_SUNFLOWER', 26, 8);

// ── Lounge: fireplace, sofas around a tea table, and the front door ──
add('COZY_PAINTING', 21, 10); // on the meeting room's south wall
add('COZY_BOOKSHELF', 24, 10);
add('COZY_FIREPLACE', 22, 12);
add('COZY_SUNFLOWER', 20, 12);
add('COZY_SUNFLOWER', 25, 12);
add('COZY_SOFA_FRONT', 22, 15);
add('COZY_SOFA_SIDE', 21, 16);
add('COZY_TEA_TABLE', 22, 16);
add('COZY_SOFA_SIDE:left', 24, 16);
add('COZY_SOFA_BACK', 22, 18);
add('COZY_MUG', 22, 17);
add('COZY_LANTERN', 26, 20);
add('COZY_MAT', 21, 22);
add('COZY_BIG_PLANT', 18, 19);

// ── Canteen (kantin): a small kitchen and one table for two ──
add('COZY_CUPBOARD', 11, 15);
add('COZY_SIGN_FOOD', 13, 15);
add('COZY_FRIDGE', 10, 17);
add('COZY_KCOUNTER', 11, 17);
add('COZY_WATER', 13, 17);
add('COZY_VENDING', 14, 17);
add('COZY_DINING', 12, 19);
add('COZY_CHAIR_SIDE', 11, 19); // seat at y 20, facing the table
add('COZY_CHAIR_SIDE:left', 14, 19);
add('COZY_MUG', 12, 19);

// ── Toilet: two stalls and a basin ──
add('COZY_SIGN_WC', 6, 15);
add('COZY_TOILET', 4, 17);
add('COZY_TOILET', 6, 17);
add('COZY_BASIN', 8, 17);

// ── Garden ──
for (const [c, r] of [[0, 2], [0, 8], [1, 14], [0, 20], [29, 2], [29, 8], [28, 14], [29, 20], [1, 25]]) add('COZY_TREE', c, r);
add('COZY_SCARECROW', 8, 25);
add('COZY_POND', 26, 26);
add('COZY_WELL', 17, 25);
add('COZY_BENCH', 13, 24);
for (const [c, r] of [[24, 24], [2, 23], [27, 24], [25, 22]]) add('COZY_BUSH', c, r);
for (const [c, r] of [[5, 24], [6, 24], [10, 24], [20, 25], [24, 26], [20, 29], [24, 28], [9, 27], [4, 27], [12, 25]]) add('COZY_FLOWERS', c, r);
for (let c = 0; c < COLS; c++) if (c < 21 || c > 23) add('COZY_FENCE', c, 29);

const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  layoutRevision: 3,
  tiles,
  tileColors,
  furniture,
  // petType indexes the loaded pet list: bundled Claudio (0), Gitcat (1), then this pack's cat Oyen (2) and hen (3).
  pets: [{ id: 'asaoffice-cat', petType: 2 }, { id: 'asaoffice-hen', petType: 3 }],
};

fs.mkdirSync(path.join(root, 'layouts'), { recursive: true });
fs.writeFileSync(path.join(root, 'layouts', 'stardew-office.json'), JSON.stringify(layout) + '\n');
console.log(`Wrote layouts/stardew-office.json (${COLS}×${ROWS}, ${furniture.length} furniture)`);
