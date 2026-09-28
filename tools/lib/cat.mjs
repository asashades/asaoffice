// Oyen, the office cat: an orange tabby in pixel-agents' pet sheet format (96×96), same layout as the hen:
//   row 0: walkDown ×3 + idleDown ×3 (16×32 each)   row 1: walkUp ×3 + idleUp ×3   row 2: walkRight ×3 (32×32)
import { Sprite } from './pixel.mjs';

const PAL = {
  O: '#e8923a', // fur
  o: '#c0662a', // stripes / shade
  W: '#f8e6c4', // muzzle, chest, paws
  E: '#2f4a2a', // eyes
  n: '#e58a8a', // nose / inner ear
  t: '#b8581f', // tail tip
};

const DOWN_HEAD = ['....o......o....', '....On....nO....', '....OOOOOOOO....', '....OEoOOoEO....', '....OOWnnWOO....', '.....OWWWWO.....'];
const DOWN_BLINK = ['....o......o....', '....On....nO....', '....OOOOOOOO....', '....OooOOooO....', '....OOWnnWOO....', '.....OWWWWO.....'];
const UP_HEAD = ['....o......o....', '....Oo....oO....', '....OOOOOOOO....', '....OoOOOOoO....', '....OOoOOoOO....', '.....OOOOOO.....'];
const DOWN_BODY = ['.....OOOOOO.....', '....OOWWWWOO.tO.', '....OoWWWWoO.O..', '....OOWWWWOOO...', '....OOOOOOOO....', '.....oOOOOo.....'];
const UP_BODY = ['.....OOOOOO.....', '....OOoOOoOO....', '....OoOOOOoO.tO.', '....OOoOOoOO.O..', '....OOOOOOOOO...', '.....oOOOOo.....'];
const FEET = {
  still: ['.....WW..WW.....'],
  a: ['.....WW...WW....'],
  b: ['....WW..WW......'],
};

function vert(head, body, feet, dy = 0, dip = 0) {
  const s = new Sprite(16, 32);
  s.stamp(body, PAL, 0, 23 + dy);
  s.stamp(FEET[feet], PAL, 0, 29);
  s.stamp(head, PAL, 0, 17 + dy + dip);
  return s.outline(0.4);
}

const pad = (rows) => rows.map((r) => r.padEnd(32, '.'));
const SIDE = pad([
  '.....................o....o',
  '.....................On..nO',
  '....................OOOOOOOO',
  '....................OOOOOEOO',
  '....................OOOOOWWnW',
  '.t..................OOOOWWWW',
  '.tO..........OOOOOOOOOOWWW',
  '..OO.......OOOoOOoOOoOOOO',
  '...OOOOOOOOOOOOOOOOOOOOO',
  '..........OOWWWWWWWWWOOO',
  '...........oWWWWWWWWWOo',
]);
const SIDE_FEET = [
  pad(['...........OO...OO...OO..OO', '...........WW...WW...WW..WW']),
  pad(['............OO.OO.....OO.OO', '............WW.WW.....WW.WW']),
  pad(['..........OO.....OO.OO....OO', '.........WW.....WW.WW.....WW']),
];

export function renderCat() {
  const sheet = new Sprite(96, 96);
  const put = (spr, x, y) => sheet.blit(spr, x, y);
  // row 0 — facing down: walk a / still / walk b, then idle: sit, head dip (sniff), blink
  put(vert(DOWN_HEAD, DOWN_BODY, 'a', -1), 0, 0);
  put(vert(DOWN_HEAD, DOWN_BODY, 'still'), 16, 0);
  put(vert(DOWN_HEAD, DOWN_BODY, 'b', -1), 32, 0);
  put(vert(DOWN_HEAD, DOWN_BODY, 'still'), 48, 0);
  put(vert(DOWN_HEAD, DOWN_BODY, 'still', 0, 1), 64, 0);
  put(vert(DOWN_BLINK, DOWN_BODY, 'still'), 80, 0);
  // row 1 — facing up
  put(vert(UP_HEAD, UP_BODY, 'a', -1), 0, 32);
  put(vert(UP_HEAD, UP_BODY, 'still'), 16, 32);
  put(vert(UP_HEAD, UP_BODY, 'b', -1), 32, 32);
  put(vert(UP_HEAD, UP_BODY, 'still'), 48, 32);
  put(vert(UP_HEAD, UP_BODY, 'still', 0, 1), 64, 32);
  put(vert(UP_HEAD, UP_BODY, 'still', 1), 80, 32);
  // row 2 — walking right
  SIDE_FEET.forEach((feet, i) => {
    const s = new Sprite(32, 32);
    s.stamp(SIDE, PAL, 0, 18 + (i === 1 ? 0 : -1));
    s.stamp(feet, PAL, 0, 29);
    s.outline(0.4);
    put(s, i * 32, 64);
  });
  return sheet;
}
