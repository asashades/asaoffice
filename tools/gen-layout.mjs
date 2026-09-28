// Builds layouts/stardew-office.json — importable via Layout → Import in pixel-agents.
// Tile ids: 0 = wall, 1..9 = floor_0..floor_8, 255 = void.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COLS = 22;
const ROWS = 15; // no bottom wall: like the bundled office, the room just ends (a front wall would hide row 13)
const WALL = 0;
const VOID = 255;
const WOOD = 2; // floor_1 long vertical boards
const CHECKER = 6; // floor_5 kitchen checker
const RUG = 9; // floor_8 soft weave

const COLORS = {
  wall: { h: 32, s: 38, b: 4, c: 0 },
  wood: { h: 30, s: 42, b: -10, c: 0 },
  rug: { h: 8, s: 42, b: -8, c: 0 },
  checker: { h: 45, s: 30, b: 8, c: 10 },
};

const tiles = new Array(COLS * ROWS).fill(VOID);
const tileColors = new Array(COLS * ROWS).fill(null);
const put = (c, r, t, color) => {
  tiles[r * COLS + c] = t;
  tileColors[r * COLS + c] = color ?? null;
};

for (let r = 1; r < ROWS; r++)
  for (let c = 0; c < COLS; c++) {
    const edge = r === 1 || c === 0 || c === COLS - 1;
    const divider = c === 13 && !(r >= 7 && r <= 9);
    if (edge || divider) put(c, r, WALL, COLORS.wall);
    else if (c <= 13) put(c, r, WOOD, COLORS.wood);
    else if (r <= 10) put(c, r, RUG, COLORS.rug);
    else put(c, r, CHECKER, COLORS.checker);
  }

let n = 0;
const furniture = [];
const add = (type, col, row) => furniture.push({ uid: `f-asaoffice-${String(++n).padStart(3, '0')}`, type, col, row });

// Workroom: two rows of three desk pods, each with a retro PC and a chair facing it.
for (const row of [4, 9])
  for (const col of [1, 5, 9]) {
    add('COZY_DESK_FRONT', col, row);
    add('COZY_PC_FRONT_OFF', col + 1, row);
    add('COZY_CHAIR_BACK', col + 1, row + 1);
  }
add('COZY_MUG', 3, 4);
add('COZY_BASKET', 7, 9);
add('COZY_MUG', 11, 9);

// Wall décor (wall items sit on the row above the wall so their base lands on it)
add('COZY_WINDOW', 2, 0);
add('COZY_CLOCK', 5, 0);
add('COZY_WINDOW', 7, 0);
add('COZY_CALENDAR', 10, 0);
add('COZY_BOOKSHELF', 14, 0);
add('COZY_PAINTING', 19, 0);

// Workroom corners
add('COZY_SUNFLOWER', 12, 2);
add('COZY_BIG_PLANT', 11, 11);
add('COZY_BARREL', 1, 12);
add('COZY_CRATE', 2, 13);
add('COZY_LANTERN', 4, 12);

// Lounge: fireplace, sofas around a tea table
add('COZY_FIREPLACE', 17, 2);
add('COZY_SUNFLOWER', 20, 2);
add('COZY_SOFA_FRONT', 16, 6);
add('COZY_SOFA_SIDE', 15, 7);
add('COZY_TEA_TABLE', 16, 7);
add('COZY_SOFA_SIDE:left', 18, 7);
add('COZY_SOFA_BACK', 16, 9);
add('COZY_MUG', 16, 8);

// Kitchenette
add('COZY_BARREL', 20, 11);
add('COZY_CRATE', 20, 13);
add('COZY_FERN', 14, 12);
add('COZY_LANTERN', 16, 12);

// Added later, so earlier uids stay stable: Holo-board above the fireplace (click it for today's stats)
add('COZY_HOLOBOARD', 17, 0);
add('COZY_TASKBOARD', 11, 0); // next to the calendar; click it for what each session is working on
add('COZY_MAILBOX', 9, 0); // task results and the daily report

const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  layoutRevision: 1,
  tiles,
  tileColors,
  furniture,
  // petType indexes the loaded pet list: bundled Claudio (0), Gitcat (1), then this pack's cat Oyen (2) and hen (3).
  pets: [{ id: 'asaoffice-cat', petType: 2 }],
};

fs.mkdirSync(path.join(root, 'layouts'), { recursive: true });
fs.writeFileSync(path.join(root, 'layouts', 'stardew-office.json'), JSON.stringify(layout) + '\n');
console.log(`Wrote layouts/stardew-office.json (${COLS}×${ROWS}, ${furniture.length} furniture)`);
