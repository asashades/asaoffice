// A little hen that wanders the office. pixel-agents pet sheet format (96×96):
//   row 0: walkDown ×3 + idleDown ×3 (16×32 each)
//   row 1: walkUp   ×3 + idleUp   ×3 (16×32 each)
//   row 2: walkRight ×3 (32×32 each)
import { Sprite } from './pixel.mjs';

const PAL = { W: '#fbf6ea', w: '#d9ccb4', R: '#e0483a', r: '#b8303a', Y: '#f0a830', E: '#2b1d2a', T: '#eee4cc' };

const DOWN_HEAD = ['.......RR.......', '......RRR.......', '.....WWWWWW.....', '.....WEWWEW.....', '.....WWYYWW.....', '......WrrW......'];
const DOWN_BLINK = ['.......RR.......', '......RRR.......', '.....WWWWWW.....', '.....WwWWwW.....', '.....WWYYWW.....', '......WrrW......'];
const UP_HEAD = ['.......RR.......', '......RRR.......', '.....WWWWWW.....', '.....WWWWWW.....', '.....WWWWWW.....', '......wWWw......'];
const DOWN_BODY = ['....WWWWWWWW....', '...WWWWWWWWWW...', '...wWWWWWWWWw...', '...wWWWWWWWWw...', '....wWWWWWWw....', '.....wwwwww.....'];
const UP_BODY = ['....WWWWWWWW....', '...WWWTTTTWWW...', '...wWWTTTTWWw...', '...wWWWTTWWWw...', '....wWWWWWWw....', '.....wwwwww.....'];
const FEET = {
  still: ['......Y..Y......', '.....YY..YY.....'],
  a: ['......Y...Y.....', '.....YY...YY....'],
  b: ['.....Y..Y.......', '....YY..YY......'],
};

function vert(head, body, feet, dy = 0) {
  const s = new Sprite(16, 32);
  s.stamp(body, PAL, 0, 22 + dy);
  s.stamp(FEET[feet], PAL, 0, 28);
  s.stamp(head, PAL, 0, 16 + dy + (head.dip ?? 0));
  return s.outline(0.4);
}

function dipped(head) {
  const h = [...head];
  h.dip = 2;
  return h;
}

const SIDE = [
  '...................RR...........',
  '..................RRRR..........',
  '.................WWWWW..........',
  '................WWWEWWY.........',
  '................WWWWWYY.........',
  '................rWWWW...........',
  '........TT.....WWWWW............',
  '.......TTWW...WWWWWW............',
  '.......TWWWWWWWWWWWW............',
  '........WWWWWWWWWWWW............',
  '........wWWWWwwwWWWW............',
  '.........wWWWWwwWWW.............',
  '..........wwwwwwww..............',
];
const SIDE_FEET = [
  ['............Y...Y...............', '...........YY..YY...............'],
  ['...........Y.....Y..............', '..........YY....YY..............'],
  ['.............Y.Y................', '............YY.YY...............'],
];

export function renderChicken() {
  const sheet = new Sprite(96, 96);
  const put = (spr, x, y) => sheet.blit(spr, x, y);
  // row 0 — facing down
  put(vert(DOWN_HEAD, DOWN_BODY, 'a', -1), 0, 0);
  put(vert(DOWN_HEAD, DOWN_BODY, 'still'), 16, 0);
  put(vert(DOWN_HEAD, DOWN_BODY, 'b', -1), 32, 0);
  put(vert(DOWN_HEAD, DOWN_BODY, 'still'), 48, 0);
  put(vert(dipped(DOWN_HEAD), DOWN_BODY, 'still'), 64, 0);
  put(vert(DOWN_BLINK, DOWN_BODY, 'still'), 80, 0);
  // row 1 — facing up
  put(vert(UP_HEAD, UP_BODY, 'a', -1), 0, 32);
  put(vert(UP_HEAD, UP_BODY, 'still'), 16, 32);
  put(vert(UP_HEAD, UP_BODY, 'b', -1), 32, 32);
  put(vert(UP_HEAD, UP_BODY, 'still'), 48, 32);
  put(vert(dipped(UP_HEAD), UP_BODY, 'still'), 64, 32);
  put(vert(UP_HEAD, UP_BODY, 'still', 1), 80, 32);
  // row 2 — walking right
  SIDE_FEET.forEach((feet, i) => {
    const s = new Sprite(32, 32);
    s.stamp(SIDE, PAL, 0, 16 + (i === 1 ? 0 : -1));
    s.stamp(feet, PAL, 0, 29);
    s.outline(0.4);
    put(s, i * 32, 64);
  });
  return sheet;
}
