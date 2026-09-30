// Builds layouts/stardew-office.json — importable via Layout → Import in pixel-agents.
// Tile ids: 0 = wall, 1..9 = floor_0..floor_8, 255 = void. (Floors here: 2 planks, 3 parquet, 4 flagstones, 6 kitchen
// tiles, 7 grass, 8 tilled soil, 9 rug.)
//
// The office is 31×30 tiles: the building is x 3–27, y 1–23, with a garden around it.
//   top band (y 2–11):    workroom (6 desks)  |  command room (Shades, the boards on the wall)
//   lower band (y 14–21): toilet | canteen (kantin) | lounge (fireplace, sofas, the front door)
// Walls are drawn two tiles tall (the face rises over the tile above), so a wall's north neighbour is left as void
// (y 12, y 22) and wall décor sits on the row above the wall.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COLS = 31;
const ROWS = 30;
const WALL = 0;
const VOID = 255;
const WOOD = 2; // floor_1 long vertical boards
const PARQUET = 3; // floor_2, the command room
const FLAG = 4; // floor_3 flagstones: the garden path
const KITCHEN = 6; // floor_5 checker tiles: canteen and toilet
const GRASS = 7; // floor_6 meadow
const SOIL = 8; // floor_7 tilled soil
const RUG = 9; // floor_8 soft weave

const COLORS = {
  wall: { h: 32, s: 38, b: 4, c: 0 },
  wood: { h: 30, s: 42, b: -10, c: 0 },
  rug: { h: 8, s: 42, b: -8, c: 0 },
  director: { h: 18, s: 38, b: -22, c: 6 },
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
// top band
fill(4, 2, 14, 11, WOOD, COLORS.wood); // workroom
fill(16, 2, 26, 11, PARQUET, COLORS.director); // command room
fill(3, 12, 27, 12, VOID); // the wall face rises over these rows
fill(3, 22, 27, 22, VOID);
// lower band
fill(4, 14, 8, 21, KITCHEN, COLORS.bath); // toilet
fill(10, 14, 18, 21, KITCHEN, COLORS.kitchen); // canteen
fill(20, 14, 26, 21, RUG, COLORS.rug); // lounge

// ── Walls ──
fill(3, 1, 27, 1, WALL, COLORS.wall); // top
fill(3, 23, 27, 23, WALL, COLORS.wall); // bottom (with the front door below)
fill(3, 1, 3, 23, WALL, COLORS.wall); // left
fill(27, 1, 27, 23, WALL, COLORS.wall); // right
fill(3, 13, 27, 13, WALL, COLORS.wall); // between the bands
fill(15, 1, 15, 13, WALL, COLORS.wall); // workroom | command room
fill(9, 13, 9, 23, WALL, COLORS.wall); // toilet | canteen
fill(19, 13, 19, 23, WALL, COLORS.wall); // canteen | lounge
fill(5, 14, 5, 16, WALL, COLORS.wall); // toilet stalls
fill(7, 14, 7, 16, WALL, COLORS.wall);
// ── Doorways ──
fill(15, 6, 15, 8, PARQUET, COLORS.director); // workroom ↔ command room
fill(10, 12, 12, 13, KITCHEN, COLORS.kitchen); // workroom ↔ canteen
fill(22, 12, 24, 13, RUG, COLORS.rug); // command room ↔ lounge
fill(9, 17, 9, 19, KITCHEN, COLORS.bath); // toilet ↔ canteen
fill(19, 17, 19, 19, KITCHEN, COLORS.kitchen); // canteen ↔ lounge
fill(21, 22, 23, 23, FLAG, COLORS.path); // front door
// ── Garden ──
fill(21, 24, 23, 29, FLAG, COLORS.path); // path from the door
fill(12, 27, 20, 28, FLAG, COLORS.path); // branch towards the vegetable beds
fill(5, 25, 7, 26, SOIL, COLORS.soil); // beds
fill(9, 25, 11, 26, SOIL, COLORS.soil);

let n = 0;
const furniture = [];
const add = (type, col, row) => furniture.push({ uid: `f-asaoffice-${String(++n).padStart(3, '0')}`, type, col, row });

// ── Workroom: two rows of three desk pods, each with a retro PC and a chair facing it ──
for (const row of [3, 8])
  for (const col of [4, 8, 12]) {
    add('COZY_DESK_FRONT', col, row);
    add('COZY_PC_FRONT_OFF', col + 1, row);
    add('COZY_CHAIR_BACK', col + 1, row + 1);
  }
add('COZY_MUG', 6, 3);
add('COZY_BASKET', 10, 8);
add('COZY_MUG', 14, 8);
add('COZY_WINDOW', 5, 0);
add('COZY_CLOCK', 8, 0);
add('COZY_WINDOW', 10, 0);
add('COZY_BOOKSHELF', 12, 0);
add('COZY_SUNFLOWER', 14, 2);
add('COZY_BARREL', 4, 10);
add('COZY_CRATE', 5, 11);
add('COZY_LANTERN', 14, 10);

// ── Command room: Shades' desk, and a long wall for the boards ──
add('COZY_WINDOW', 16, 0);
add('COZY_QUESTBOARD', 18, 0); // click it for today's stats
add('COZY_TASKBOARD', 21, 0); // what each session is working on
add('COZY_MAILBOX', 23, 0); // task chats and the daily report
add('COZY_CALENDAR', 24, 0);
add('COZY_PAINTING', 25, 0);
add('COZY_EXEC_DESK_FRONT', 19, 5);
add('COZY_PC_FRONT_OFF', 20, 5);
add('COZY_EXEC_CHAIR_BACK', 20, 6); // Shades' seat
add('COZY_MUG', 21, 5);
add('COZY_FERN', 17, 3);
add('COZY_LANTERN', 26, 3);
add('COZY_BIG_PLANT', 25, 8);
add('COZY_SUNFLOWER', 17, 9);

// ── Toilet: two stalls on the north side, two basins on the south side ──
add('COZY_TOILET', 4, 14);
add('COZY_TOILET', 6, 14);
add('COZY_FERN', 8, 14);
add('COZY_BASIN', 5, 19);
add('COZY_BASIN', 7, 19);
add('COZY_SIGN_WC', 6, 12);

// ── Canteen (kantin): kitchen along the north wall, two tables ──
add('COZY_FRIDGE', 13, 14);
add('COZY_KCOUNTER', 14, 14);
add('COZY_WATER', 16, 14);
add('COZY_VENDING', 17, 14);
add('COZY_FERN', 18, 14);
add('COZY_CUPBOARD', 14, 12);
add('COZY_SIGN_FOOD', 16, 12);
add('COZY_WINDOW', 17, 12);
for (const col of [11, 15]) {
  add('COZY_DINING', col, 18);
  for (const dx of [0, 1]) {
    add('COZY_CHAIR_FRONT', col + dx, 16); // seat at y 17, facing the table
    add('COZY_CHAIR_BACK', col + dx, 19); // seat at y 20
  }
}
add('COZY_MUG', 11, 18);
add('COZY_MUG', 16, 19);

// ── Lounge: fireplace, sofas around a tea table, and the front door ──
add('COZY_WINDOW', 20, 12);
add('COZY_BOOKSHELF', 25, 12);
add('COZY_FIREPLACE', 22, 14);
add('COZY_SUNFLOWER', 20, 14);
add('COZY_SUNFLOWER', 25, 14);
add('COZY_SOFA_FRONT', 22, 17);
add('COZY_SOFA_SIDE', 21, 18);
add('COZY_TEA_TABLE', 22, 18);
add('COZY_SOFA_SIDE:left', 24, 18);
add('COZY_SOFA_BACK', 22, 20);
add('COZY_MUG', 22, 19);
add('COZY_LANTERN', 26, 20);
add('COZY_MAT', 21, 22);

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
  layoutRevision: 2,
  tiles,
  tileColors,
  furniture,
  // petType indexes the loaded pet list: bundled Claudio (0), Gitcat (1), then this pack's cat Oyen (2) and hen (3).
  pets: [{ id: 'asaoffice-cat', petType: 2 }, { id: 'asaoffice-hen', petType: 3 }],
};

fs.mkdirSync(path.join(root, 'layouts'), { recursive: true });
fs.writeFileSync(path.join(root, 'layouts', 'stardew-office.json'), JSON.stringify(layout) + '\n');
console.log(`Wrote layouts/stardew-office.json (${COLS}×${ROWS}, ${furniture.length} furniture)`);
