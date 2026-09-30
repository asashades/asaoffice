// Builds layouts/stardew-office.json — importable via Layout → Import in pixel-agents.
// Tile ids: 0 = wall, 1..9 = floor_0..floor_8, 255 = void. (Floors here: 2 planks, 3 parquet, 4 flagstones, 6 kitchen
// tiles, 7 grass, 8 tilled soil, 9 rug.)
//
// The office is 33×24 tiles (landscape): the building is x 3–29, y 1–17, with a garden around it.
//   Top band, left to right:   the work area (six desks in three divisions, no walls between them), the meeting room
//                              (only for meetings: the boards on its wall, one long table) and the director's room.
//   Bottom band, left to right: a compact toilet and pantry, the breakout corner (green sofas round the one tea table, a
//                              whiteboard) with the main entrance below it, and the guest lounge with the fireplace.
// Walls are drawn two tiles tall (the face rises over the tile above), so the row above a wall is left as void and
// wall décor sits on the row above the wall. Windows only go on the outer walls.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COLS = 33;
const ROWS = 24;
const WALL = 0;
const VOID = 255;
const WOOD = 2; // floor_1 long vertical boards
const PARQUET = 3; // floor_2
const FLAG = 4; // floor_3 flagstones: the garden path
const KITCHEN = 6; // floor_5 checker tiles: pantry and toilet
const GRASS = 7; // floor_6 meadow
const SOIL = 8; // floor_7 tilled soil
const RUG = 9; // floor_8 soft weave

const COLORS = {
  wall: { h: 32, s: 38, b: 4, c: 0 },
  wood: { h: 30, s: 42, b: -10, c: 0 }, // work area: operations
  tech: { h: 205, s: 22, b: -4, c: 0 }, // work area: engineering
  admin: { h: 12, s: 28, b: -6, c: 0 }, // work area: administration
  discuss: { h: 125, s: 30, b: -10, c: 0 }, // breakout corner
  rug: { h: 8, s: 42, b: -8, c: 0 }, // guest lounge
  meeting: { h: 18, s: 38, b: -22, c: 6 }, // meeting room (brick-like parquet)
  director: { h: 24, s: 30, b: -16, c: 4 }, // the director's room
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
fill(4, 2, 28, 15, WOOD, COLORS.wood); // the building's floor; the zones below re-tint parts of it
fill(4, 2, 10, 4, WOOD, COLORS.tech); // engineering division
fill(11, 2, 15, 8, WOOD, COLORS.admin); // administration division
fill(17, 2, 23, 8, PARQUET, COLORS.meeting); // meeting room
fill(25, 2, 28, 8, PARQUET, COLORS.director); // director's room
fill(4, 11, 8, 15, KITCHEN, COLORS.bath); // toilet
fill(10, 11, 13, 15, KITCHEN, COLORS.kitchen); // pantry
fill(14, 11, 22, 15, RUG, COLORS.discuss); // breakout corner
fill(24, 11, 28, 15, RUG, COLORS.rug); // guest lounge
fill(4, 9, 28, 9, VOID); // under the middle wall
fill(4, 16, 28, 16, VOID); // under the bottom wall

// ── Walls ──
fill(3, 1, 29, 1, WALL, COLORS.wall); // top
fill(3, 17, 29, 17, WALL, COLORS.wall); // bottom (with the front door)
fill(3, 1, 3, 17, WALL, COLORS.wall); // left
fill(29, 1, 29, 17, WALL, COLORS.wall); // right
fill(3, 10, 29, 10, WALL, COLORS.wall); // between the top and bottom bands
fill(16, 1, 16, 10, WALL, COLORS.wall); // work area | meeting room
fill(24, 1, 24, 10, WALL, COLORS.wall); // meeting room | director's room
fill(9, 10, 9, 15, WALL, COLORS.wall); // toilet | pantry
fill(23, 10, 23, 15, WALL, COLORS.wall); // breakout | guest lounge
fill(5, 11, 5, 13, WALL, COLORS.wall); // toilet stalls
fill(7, 11, 7, 13, WALL, COLORS.wall);
// ── Doorways ──
fill(14, 9, 15, 10, WOOD, COLORS.wood); // work area ↔ the bottom band
fill(16, 5, 16, 7, PARQUET, COLORS.meeting); // work area ↔ meeting room
fill(24, 6, 24, 7, PARQUET, COLORS.director); // meeting room ↔ director's room
fill(9, 13, 9, 14, KITCHEN, COLORS.bath); // toilet ↔ pantry
fill(23, 13, 23, 14, RUG, COLORS.rug); // breakout ↔ guest lounge
fill(15, 16, 17, 17, FLAG, COLORS.path); // front door
// ── Garden ──
fill(15, 18, 17, 23, FLAG, COLORS.path); // path from the door
fill(6, 21, 14, 22, FLAG, COLORS.path); // branch towards the vegetable beds
fill(5, 19, 7, 20, SOIL, COLORS.soil); // beds
fill(9, 19, 11, 20, SOIL, COLORS.soil);

let n = 0;
const furniture = [];
const add = (type, col, row) => furniture.push({ uid: `f-asaoffice-${String(++n).padStart(3, '0')}`, type, col, row });

// ── Top wall (outer): windows only ever go on outer walls ──
add('COZY_WINDOW', 5, 0);
add('COZY_CLOCK', 8, 0);
add('COZY_WINDOW', 10, 0);
add('COZY_BOOKSHELF', 12, 0);
add('COZY_WINDOW', 14, 0);
add('COZY_WINDOW', 25, 0); // the director's view
add('COZY_BOOKSHELF', 27, 0);

// ── Work area: six desks, three divisions with their own floor and layout, no walls between them ──
for (const [col, row] of [[4, 2], [8, 2], [4, 5], [8, 5], [12, 2], [12, 5]]) {
  add('COZY_DESK_FRONT', col, row);
  add('COZY_PC_FRONT_OFF', col + 1, row);
  add('COZY_CHAIR_BACK', col + 1, row + 1);
}
add('COZY_MUG', 6, 2);
add('COZY_MUG', 14, 2);
add('COZY_BARREL', 10, 4); // engineering
add('COZY_BASKET', 10, 5); // operations
add('COZY_EASEL', 11, 7);
add('COZY_SUNFLOWER', 4, 8);
add('COZY_PRINTER', 11, 3); // administration
add('COZY_FERN', 15, 3);

// ── Meeting room: only for meetings. The boards on the wall, one long table with a chair at each end ──
add('COZY_QUESTBOARD', 17, 0); // click it for today's stats
add('COZY_TASKBOARD', 20, 0); // what each session is working on
add('COZY_MAILBOX', 22, 0); // task chats and the daily report
add('COZY_CALENDAR', 23, 0);
add('COZY_MEETING_TABLE', 19, 5);
for (const col of [19, 20, 21]) {
  add('COZY_CHAIR_FRONT', col, 3); // seats at y 4
  add('COZY_CHAIR_BACK', col, 6); // seats at y 7
}
add('COZY_CHAIR_SIDE', 18, 5); // west head
add('COZY_CHAIR_SIDE:left', 22, 5); // east head: where Shades sits when he opens a task
add('COZY_EASEL', 17, 3);
add('COZY_FERN', 23, 3);
add('COZY_LANTERN', 23, 7);

// ── Director's room: Shades' desk, and a private corner ──
add('COZY_EXEC_DESK_FRONT', 25, 4); // Shades sits behind it, facing south into the room
add('COZY_PC_BACK', 26, 4);
add('COZY_EXEC_CHAIR_FRONT', 26, 2); // Shades' seat (y 3)
add('COZY_MUG', 27, 4);
add('COZY_SOFA_BACK', 26, 7);
add('COZY_LANTERN', 28, 7);

// ── Toilet (bottom-left corner): two stalls with doors, and a basin ──
add('COZY_SIGN_WC', 6, 9);
add('COZY_TOILET', 4, 11);
add('COZY_TOILET', 6, 11);
add('COZY_BASIN', 8, 11);

// ── Pantry: kitchen line along the wall, a small table for two ──
add('COZY_CUPBOARD', 10, 9);
add('COZY_SIGN_FOOD', 12, 9);
add('COZY_FRIDGE', 10, 11);
add('COZY_KCOUNTER', 11, 11);
add('COZY_WATER', 13, 11);
add('COZY_DINING', 11, 14);
add('COZY_CHAIR_SIDE', 10, 14); // seat at y 15, facing the table
add('COZY_CHAIR_SIDE:left', 13, 14);
add('COZY_MUG', 11, 14);

// ── Breakout corner: the one round table, with green sofas round it, and a whiteboard ──
add('COZY_VENDING', 16, 11);
add('COZY_EASEL', 17, 11);
add('COZY_SOFA_FRONT', 19, 11);
add('COZY_SOFA_SIDE', 18, 12);
add('COZY_TEA_TABLE', 19, 12);
add('COZY_SOFA_SIDE:left', 21, 12);
add('COZY_SOFA_BACK', 19, 14);
add('COZY_MUG', 19, 13);
add('COZY_PAINTING', 19, 9);

// ── Guest lounge with the fireplace ──
add('COZY_FIREPLACE', 25, 11);
add('COZY_SUNFLOWER', 28, 11);
add('COZY_SOFA_BACK', 25, 14);
add('COZY_LANTERN', 28, 14);
add('COZY_FERN', 28, 13);
add('COZY_BOOKSHELF', 26, 9);

// ── Front door ──
add('COZY_MAT', 15, 16);

// ── Garden ──
for (const [c, r] of [[0, 2], [0, 8], [1, 13], [0, 18], [31, 2], [31, 8], [30, 13], [31, 18], [1, 21]]) add('COZY_TREE', c, r);
add('COZY_SCARECROW', 8, 19);
add('COZY_POND', 26, 20);
add('COZY_WELL', 20, 19);
add('COZY_BENCH', 12, 18);
for (const [c, r] of [[22, 18], [2, 17], [29, 18], [25, 18]]) add('COZY_BUSH', c, r);
for (const [c, r] of [[5, 18], [6, 18], [10, 18], [21, 21], [24, 19], [20, 22], [23, 22], [9, 21], [4, 21], [12, 20]]) add('COZY_FLOWERS', c, r);
for (let c = 0; c < COLS; c++) if (c < 15 || c > 17) add('COZY_FENCE', c, 23);

const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  layoutRevision: 5,
  tiles,
  tileColors,
  furniture,
  // petType indexes the loaded pet list: bundled Claudio (0), Gitcat (1), then this pack's cat Oyen (2) and hen (3).
  pets: [{ id: 'asaoffice-cat', petType: 2 }, { id: 'asaoffice-hen', petType: 3 }],
};

fs.mkdirSync(path.join(root, 'layouts'), { recursive: true });
fs.writeFileSync(path.join(root, 'layouts', 'stardew-office.json'), JSON.stringify(layout) + '\n');
console.log(`Wrote layouts/stardew-office.json (${COLS}×${ROWS}, ${furniture.length} furniture)`);
