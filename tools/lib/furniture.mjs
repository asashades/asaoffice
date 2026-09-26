// Cozy farmhouse furniture for pixel-agents. Each item returns { manifest, files: {name: Sprite} }.
// Geometry mirrors the bundled pieces (desk surface rows, PC keyboard rows, chair heights) so
// seating, surfaces and z-sorting behave exactly like the defaults.
import { Sprite, shade, rng } from './pixel.mjs';

// Warm Stardew-ish wood ramp + accents
const C = {
  w0: '#f0c283',
  w1: '#dca05f',
  w2: '#c07f43',
  w3: '#9c5d2f',
  w4: '#744122',
  w5: '#522c18',
  cream: '#f4e6c4',
  creamS: '#d9c49a',
  red: '#c8503c',
  redS: '#973a2f',
  green: '#6ea84e',
  greenS: '#467a3a',
  greenD: '#2f5a33',
  leaf: '#8cc45a',
  sky: '#8fd0e8',
  skyS: '#6ab0d8',
  stone: '#a9a19a',
  stoneS: '#7c736e',
  stoneD: '#57504e',
  metal: '#6b6f7a',
  gold: '#e8c04a',
  goldS: '#b88a2e',
  terra: '#c8683f',
  terraS: '#94472d',
  ink: '#3a2117',
};

const OUT = 0.34;

function planks(s, x, y, w, h, { vertical = false, seed = 1 } = {}) {
  const r = rng(seed);
  s.rect(x, y, w, h, C.w1);
  if (!vertical) {
    for (let yy = y + 4; yy < y + h - 1; yy += 5) s.hline(x, yy, w, C.w3);
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) if (r() < 0.05 && s.get(xx, yy)?.[0] === 220) s.set(xx, yy, C.w2);
    // staggered plank joints
    for (let yy = y, k = 0; yy < y + h - 1; yy += 5, k++) {
      const jx = x + ((k * 17 + 9) % Math.max(4, w - 4)) + 2;
      s.vline(jx, yy + 1, Math.min(4, y + h - yy - 1), C.w2);
    }
    s.hline(x, y, w, C.w0);
  } else {
    for (let xx = x + 4; xx < x + w - 1; xx += 5) s.vline(xx, y, h, C.w3);
    for (let xx = x, k = 0; xx < x + w - 1; xx += 5, k++) {
      const jy = y + ((k * 23 + 7) % Math.max(4, h - 4)) + 2;
      s.hline(xx + 1, jy, Math.min(4, x + w - xx - 1), C.w2);
    }
    s.vline(x, y, h, C.w0);
  }
}

// ── Desk ─────────────────────────────────────────────────────────────
function deskFront() {
  const s = new Sprite(48, 32);
  planks(s, 3, 12, 42, 11, { seed: 3 });
  s.hline(3, 23, 42, C.w2);
  s.hline(3, 24, 42, C.w3);
  // apron with two drawers
  s.rect(3, 25, 42, 3, C.w3);
  s.hline(3, 25, 42, C.w4);
  for (const dx of [8, 32]) {
    s.rect(dx, 26, 8, 2, C.w2);
    s.set(dx + 3, 26, C.gold);
    s.set(dx + 4, 26, C.gold);
  }
  // legs
  for (const lx of [3, 42]) {
    s.rect(lx, 28, 3, 3, C.w4);
    s.vline(lx, 28, 3, C.w3);
  }
  return s.outline(OUT);
}

function deskSide() {
  const s = new Sprite(16, 64);
  planks(s, 1, 12, 14, 43, { vertical: true, seed: 5 });
  s.hline(1, 55, 14, C.w2);
  s.hline(1, 56, 14, C.w3);
  s.rect(1, 57, 14, 2, C.w3);
  s.rect(6, 57, 4, 1, C.w2);
  for (const lx of [1, 12]) s.rect(lx, 59, 3, 3, C.w4);
  return s.outline(OUT);
}

// ── Chair (wood with red gingham cushion) ────────────────────────────
function chairFront() {
  const s = new Sprite(16, 32);
  // backrest behind the sitter
  s.rect(3, 13, 10, 2, C.w2).hline(3, 13, 10, C.w1);
  s.rect(3, 15, 2, 7, C.w3).rect(11, 15, 2, 7, C.w3);
  s.rect(6, 15, 1, 6, C.w3).rect(9, 15, 1, 6, C.w3);
  // seat + cushion
  s.rect(2, 21, 12, 4, C.red);
  for (let x = 2; x < 14; x += 2) s.vline(x, 21, 4, C.redS);
  s.hline(2, 21, 12, '#e07a5f');
  s.rect(2, 25, 12, 2, C.w2).hline(2, 26, 12, C.w3);
  s.rect(3, 27, 2, 4, C.w4).rect(11, 27, 2, 4, C.w4);
  return s.outline(OUT);
}

function chairBack() {
  const s = new Sprite(16, 32);
  s.rect(3, 16, 10, 2, C.w1).hline(3, 16, 10, C.w0);
  for (const x of [3, 6, 9, 12]) s.rect(x, 18, 1, 7, x === 3 || x === 12 ? C.w3 : C.w2);
  s.rect(3, 18, 2, 7, C.w3).rect(11, 18, 2, 7, C.w3);
  s.rect(2, 25, 12, 3, C.w2).hline(2, 25, 12, C.w1).hline(2, 27, 12, C.w3);
  s.rect(3, 28, 2, 3, C.w4).rect(11, 28, 2, 3, C.w4);
  return s.outline(OUT);
}

function chairSide() {
  const s = new Sprite(16, 32);
  s.rect(2, 11, 2, 15, C.w3).vline(2, 11, 15, C.w2);
  s.rect(2, 19, 10, 3, C.red).hline(2, 19, 10, '#e07a5f');
  for (let x = 3; x < 12; x += 2) s.vline(x, 20, 2, C.redS);
  s.rect(2, 22, 10, 2, C.w2).hline(2, 23, 10, C.w3);
  s.rect(2, 24, 2, 7, C.w4).rect(10, 24, 2, 7, C.w4);
  s.hline(4, 28, 6, C.w4);
  return s.outline(OUT);
}

// ── Retro computer (beige CRT, green terminal) ───────────────────────
const CRT = { body: '#e9dcc0', bodyS: '#c9b894', bodyD: '#a08f70', scr: '#1f3b2c', txt: '#8fe07a', txtD: '#4fa05a' };
function pcFront(frame) {
  const s = new Sprite(16, 32);
  s.rect(2, 1, 12, 13, CRT.body).hline(2, 1, 12, '#f7efdc');
  s.rect(2, 12, 12, 2, CRT.bodyS);
  s.rect(3, 3, 10, 8, frame === null ? '#2a2f33' : CRT.scr);
  if (frame !== null) {
    const lines = [
      [4, 4, 5],
      [4, 6, 7],
      [4, 8, 3 + frame * 2],
    ];
    lines.forEach(([x, y, w], i) => s.hline(x, y, Math.min(w, 8), i === 2 ? CRT.txt : CRT.txtD));
    if (frame % 2 === 0) s.set(4 + Math.min(3 + frame * 2, 8), 8, '#d8ffd0');
  } else {
    s.set(4, 4, '#4a5258');
    s.set(5, 4, '#4a5258');
  }
  s.set(12, 12, frame === null ? CRT.bodyD : '#7fe07a');
  s.rect(6, 14, 4, 2, CRT.bodyS);
  // keyboard
  s.rect(1, 17, 14, 4, CRT.body).hline(1, 20, 14, CRT.bodyS);
  for (let x = 2; x < 14; x += 2) s.set(x, 18, CRT.bodyD);
  for (let x = 3; x < 13; x += 2) s.set(x, 19, CRT.bodyD);
  return s.outline(OUT);
}

function pcBack() {
  const s = new Sprite(16, 32);
  s.rect(2, 1, 12, 13, CRT.bodyS).hline(2, 1, 12, CRT.body);
  s.rect(4, 3, 8, 8, CRT.bodyD);
  for (let y = 4; y < 10; y += 2) s.hline(5, y, 6, CRT.bodyS);
  s.rect(6, 14, 4, 2, CRT.bodyD);
  s.rect(1, 17, 14, 3, CRT.bodyS);
  return s.outline(OUT);
}

function pcSide() {
  const s = new Sprite(16, 32);
  s.rect(4, 2, 9, 12, CRT.bodyS).rect(4, 2, 3, 12, CRT.body);
  s.vline(4, 3, 10, '#f7efdc');
  s.rect(10, 4, 3, 8, CRT.bodyD);
  s.rect(6, 14, 4, 2, CRT.bodyD);
  s.rect(2, 17, 6, 3, CRT.body).hline(2, 19, 6, CRT.bodyS);
  return s.outline(OUT);
}

// ── Templated small items ───────────────────────────────────────────
const T = {
  sunflower: [
    '................',
    '.....yyyyy......',
    '....yYYYYYy.....',
    '...yYYbbbYYy....',
    '...yYbBBBbYy....',
    '...yYbBBBbYy....',
    '...yYYbbbYYy....',
    '....yYYYYYy.....',
    '.....yyGyy......',
    '.......G..LL....',
    '..LL...G.LLl....',
    '..lLL..G.Ll.....',
    '...lLL.GG.......',
    '.......G........',
    '....TTTTTTTT....',
    '....tTTTTTTt....',
    '.....tTTTTt.....',
    '.....tttttt.....',
  ],
  fern: [
    '................',
    '.......L........',
    '...L...LL...L...',
    '..LL..LLl..LL...',
    '..lLL.LLl.LLl...',
    '...lLLLLLLLl....',
    '.L..lLLLLLl..L..',
    '.LL.LLLLLLLL.L..',
    '.lLLLLlLLlLLLl..',
    '..lLLlLLLLlLl...',
    '...lLLLlLLLl....',
    '....TTTTTTTT....',
    '....tTTTTTTt....',
    '.....tTTTTt.....',
    '.....tttttt.....',
  ],
  crate: [
    '................',
    '..rr.RRR..pP....',
    '.rRRrRRRr.PPp...',
    '.rRRRrRr.PPPp...',
    'WWWWWWWWWWWWWWW.',
    'WwwwwwwwwwwwwwW.',
    'WwWWWWWWWWWWWwW.',
    'WwwwwwwwwwwwwwW.',
    'WwWWWWWWWWWWWwW.',
    'WwwwwwwwwwwwwwW.',
    'WWWWWWWWWWWWWWW.',
    'dddddddddddddd..',
  ],
  barrel: [
    '................',
    '....WWWWWWW.....',
    '...WwwwwwwwW....',
    '...WWWWWWWWW....',
    '..mmmmmmmmmmm...',
    '..WWwWWWwWWWW...',
    '..WWwWWWwWWWW...',
    '..WWwWWWwWWWW...',
    '..mmmmmmmmmmm...',
    '..WWwWWWwWWWW...',
    '..WWwWWWwWWWW...',
    '..WWwWWWwWWWW...',
    '..mmmmmmmmmmm...',
    '...dWWWWWWWd....',
    '....ddddddd.....',
  ],
  lantern: [
    '.......m........',
    '......mmm.......',
    '.....mMMMm......',
    '.....mYYYm......',
    '.....mYyYm......',
    '.....mYYYm......',
    '.....mmmmm......',
    '.......W........',
    '.......W........',
    '.......W........',
    '.......W........',
    '.......W........',
    '.......W........',
    '.......W........',
    '.......W........',
    '......WWW.......',
    '.....dWWWd......',
    '.....ddddd......',
  ],
  mug: [
    '................',
    '................',
    '......s..s......',
    '.......s..s.....',
    '......s..s......',
    '.....CCCCCC.....',
    '.....cBBBBc.....',
    '.....CCCCCCCC...',
    '.....CCCCCC.C...',
    '.....CCCCCCCC...',
    '.....CRRRRC.....',
    '.....cCCCCc.....',
    '......cccc......',
  ],
  basket: [
    '................',
    '....hhhhhhh.....',
    '...h.......h....',
    '..h.OO.PP.GG.h..',
    '..hOOoPPpGGgh...',
    '..WWWWWWWWWWW...',
    '..WwWwWwWwWwW...',
    '..wWwWwWwWwWw...',
    '..WwWwWwWwWwW...',
    '...wwwwwwwww....',
  ],
  clock: [
    '................',
    '.....WWWWWW.....',
    '....WwwwwwwW....',
    '...WwCCCCCCwW...',
    '...WwCCkCCCwW...',
    '...WwCCkCCCwW...',
    '...WwCCkkkCwW...',
    '...WwCCCCCCwW...',
    '...WwCCCCCCwW...',
    '....WwwwwwwW....',
    '.....WWWWWW.....',
    '......W..W......',
    '......WYYW......',
    '......WyYW......',
    '......WYyW......',
    '......WWWW......',
  ],
  calendar: [
    '................',
    '..rrrrrrrrrrrr..',
    '..rRRRRRRRRRRr..',
    '..rrrrrrrrrrrr..',
    '..CCCCCCCCCCCC..',
    '..CkCkCkCkCkCC..',
    '..CCCCCCCCCCCC..',
    '..CkCkCRCkCkCC..',
    '..CCCCCCCCCCCC..',
    '..CkCkCkCkCkCC..',
    '..CCCCCCCCCCCC..',
    '..CkCkCkCCCCCC..',
    '..CCCCCCCCCCCC..',
    '..cccccccccccc..',
  ],
};

function stampItem(key, w, h, pal, oy = 0, ox = 0) {
  return new Sprite(w, h).stamp(T[key], pal, ox, oy).outline(OUT);
}

function window2x2() {
  const s = new Sprite(32, 32);
  s.rect(3, 2, 26, 22, C.w2);
  s.rect(5, 4, 22, 18, C.sky);
  s.rect(5, 4, 22, 5, '#b4e2f0');
  // sun + cloud
  s.rect(21, 6, 3, 3, '#fff0a0');
  s.rect(7, 8, 6, 2, '#ffffff').rect(8, 7, 3, 1, '#ffffff');
  // hills + trees
  for (let x = 5; x < 27; x++) {
    const hgt = Math.round(3 + 2 * Math.sin(x / 3.2));
    s.rect(x, 22 - hgt - 3, 1, hgt + 3, C.green);
    s.set(x, 22 - hgt - 3, C.leaf);
  }
  for (let x = 5; x < 27; x++) s.set(x, 21, C.greenS);
  // mullions
  s.vline(15, 4, 18, C.w3).vline(16, 4, 18, C.w2);
  s.hline(5, 12, 22, C.w3);
  // sill + curtains
  s.rect(2, 24, 28, 2, C.w1).hline(2, 25, 28, C.w3);
  s.rect(3, 2, 4, 21, C.red).rect(25, 2, 4, 21, C.red);
  for (let y = 3; y < 23; y += 2) {
    s.set(4, y, C.redS);
    s.set(27, y, C.redS);
  }
  s.hline(2, 1, 28, C.w4);
  return s.outline(OUT);
}

function bookshelf2x2() {
  const s = new Sprite(32, 32);
  s.rect(2, 1, 28, 30, C.w3);
  s.rect(4, 3, 24, 26, C.w5);
  const r = rng(11);
  const books = ['#c8503c', '#4f79b8', '#6ea84e', '#e8c04a', '#9a6fbf', '#e88a4a', '#3f8f8a', '#f4e6c4'];
  for (const [y0, h] of [
    [3, 8],
    [12, 8],
    [21, 8],
  ]) {
    let x = 4;
    while (x < 27) {
      const bw = 1 + Math.floor(r() * 2);
      const bh = h - Math.floor(r() * 3);
      const col = books[Math.floor(r() * books.length)];
      if (r() < 0.12 && x < 24) {
        // a little potted plant or jar instead of a book
        s.rect(x, y0 + h - 3, 3, 3, C.terra).rect(x, y0 + h - 5, 3, 2, C.leaf);
        x += 4;
        continue;
      }
      s.rect(x, y0 + h - bh, bw, bh, col);
      s.set(x, y0 + h - bh, shade(col, 1.25));
      x += bw;
    }
    s.hline(3, y0 + h, 26, C.w2);
  }
  s.hline(2, 1, 28, C.w1);
  return s.outline(OUT);
}

function painting2x2() {
  const s = new Sprite(32, 32);
  s.rect(4, 5, 24, 18, C.gold);
  s.rect(6, 7, 20, 14, '#a8dcef');
  for (let x = 6; x < 26; x++) {
    const hgt = Math.round(4 + 2 * Math.sin((x + 2) / 2.7));
    s.rect(x, 21 - hgt, 1, hgt, x % 5 === 0 ? C.greenS : C.green);
  }
  // barn
  s.rect(9, 13, 6, 5, C.red).rect(10, 12, 4, 1, C.redS).rect(11, 11, 2, 1, C.redS);
  s.rect(11, 15, 2, 3, C.w5);
  // crops
  for (let x = 17; x < 25; x += 2) s.set(x, 18, C.gold);
  s.rect(21, 9, 2, 2, '#fff0a0');
  s.hline(4, 5, 24, '#f6dc7a');
  s.hline(4, 22, 24, C.goldS);
  return s.outline(OUT);
}

function fireplace() {
  const s = new Sprite(32, 32);
  const r = rng(21);
  s.rect(2, 4, 28, 27, C.stone);
  for (let y = 4; y < 31; y += 4)
    for (let x = 2 + ((y / 4) % 2) * 3; x < 30; x += 6) {
      s.hline(x, y, 5, C.stoneS);
      s.vline(x + 5, y, 4, C.stoneS);
    }
  for (let i = 0; i < 30; i++) s.set(3 + Math.floor(r() * 26), 5 + Math.floor(r() * 25), '#bdb6ae');
  s.rect(1, 3, 30, 3, C.w2).hline(1, 3, 30, C.w1).hline(1, 5, 30, C.w4);
  // hearth opening + fire
  s.rect(8, 14, 16, 17, '#2a1a16');
  s.rect(9, 27, 14, 2, C.w4);
  const flame = ['#f7d154', '#f39a3a', '#d8552f'];
  const shape = [2, 5, 8, 6, 9, 7, 4, 8, 6, 3, 5, 2, 1, 0];
  shape.forEach((h, i) => {
    for (let y = 0; y < h; y++) s.set(9 + i, 27 - y, flame[y < h / 3 ? 2 : y < (2 * h) / 3 ? 1 : 0]);
  });
  // candles on the mantel
  s.rect(5, 0, 1, 3, C.cream).set(5, 0, '#f7d154');
  s.rect(26, 0, 1, 3, C.cream).set(26, 0, '#f7d154');
  s.rect(14, 1, 4, 2, C.green).set(15, 0, C.leaf);
  return s.outline(OUT);
}

function bigPlant() {
  const s = new Sprite(32, 48);
  const r = rng(31);
  // trunk
  s.rect(15, 20, 2, 18, C.w4);
  // leaf clusters
  const blobs = [
    [16, 8, 7],
    [9, 15, 6],
    [23, 15, 6],
    [12, 24, 5],
    [21, 25, 5],
    [16, 17, 6],
  ];
  for (const [cx, cy, rad] of blobs)
    for (let y = -rad; y <= rad; y++)
      for (let x = -rad; x <= rad; x++) {
        if (x * x + y * y > rad * rad) continue;
        const shadeSide = x + y > rad * 0.3;
        s.set(cx + x, cy + y, shadeSide ? C.greenS : r() < 0.15 ? C.leaf : C.green);
      }
  // pot
  s.rect(9, 38, 14, 8, C.terra).hline(8, 37, 16, C.terraS).hline(8, 36, 16, C.terra);
  s.vline(20, 39, 6, C.terraS).vline(21, 39, 6, C.terraS);
  s.hline(10, 45, 12, C.terraS);
  return s.outline(OUT);
}

function sofa(orientation) {
  const quilt = '#6d8fc7';
  const quiltS = '#4d6aa0';
  if (orientation === 'front') {
    const s = new Sprite(32, 16);
    s.rect(2, 1, 28, 6, quiltS).hline(2, 1, 28, quilt);
    s.rect(2, 7, 28, 5, quilt);
    for (let x = 5; x < 29; x += 6) s.vline(x, 7, 5, quiltS);
    s.rect(1, 3, 3, 10, C.w2).rect(28, 3, 3, 10, C.w2);
    s.hline(2, 12, 28, C.w3);
    s.rect(3, 13, 2, 2, C.w4).rect(27, 13, 2, 2, C.w4);
    return s.outline(OUT);
  }
  if (orientation === 'back') {
    const s = new Sprite(32, 16);
    s.rect(2, 2, 28, 10, quiltS).hline(2, 2, 28, quilt);
    for (let x = 6; x < 29; x += 7) s.vline(x, 3, 9, shade(quiltS, 0.85));
    s.rect(1, 4, 3, 9, C.w2).rect(28, 4, 3, 9, C.w2);
    s.hline(2, 12, 28, C.w3);
    s.rect(3, 13, 2, 2, C.w4).rect(27, 13, 2, 2, C.w4);
    return s.outline(OUT);
  }
  const s = new Sprite(16, 32);
  s.rect(2, 2, 4, 26, quiltS).vline(2, 2, 26, quilt);
  s.rect(6, 5, 7, 22, quilt);
  for (let y = 9; y < 27; y += 6) s.hline(6, y, 7, quiltS);
  s.rect(2, 1, 11, 3, C.w2).rect(2, 27, 11, 3, C.w2);
  s.rect(3, 30, 2, 1, C.w4).rect(10, 30, 2, 1, C.w4);
  return s.outline(OUT);
}

function teaTable() {
  const s = new Sprite(32, 32);
  // round-ish tabletop with lace doily
  for (let y = 0; y < 14; y++)
    for (let x = 0; x < 28; x++) {
      const dx = (x - 13.5) / 14;
      const dy = (y - 6.5) / 7;
      if (dx * dx + dy * dy <= 1) s.set(2 + x, 10 + y, dy < -0.6 ? C.w0 : C.w1);
    }
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 14; x++) {
      const dx = (x - 6.5) / 7;
      const dy = (y - 3.5) / 4;
      if (dx * dx + dy * dy <= 1) s.set(9 + x, 13 + y, (x + y) % 3 === 0 ? C.creamS : C.cream);
    }
  s.hline(4, 24, 24, C.w3).hline(6, 25, 20, C.w4);
  s.rect(14, 26, 4, 4, C.w4).rect(10, 29, 12, 2, C.w4);
  return s.outline(OUT);
}

export function buildFurniture() {
  const wood = { W: C.w2, w: C.w3, d: C.w4, m: C.metal, M: '#8d919c', Y: '#f7d154', y: '#f39a3a' };
  const pot = { T: C.terra, t: C.terraS, L: C.green, l: C.greenS, G: C.greenD, y: '#d49a2a', Y: C.gold, b: C.w4, B: C.w5 };
  const items = [];

  items.push({
    dir: 'COZY_DESK',
    manifest: {
      id: 'COZY_DESK',
      name: 'Farmhouse Desk',
      category: 'desks',
      type: 'group',
      groupType: 'rotation',
      rotationScheme: '2-way',
      canPlaceOnWalls: false,
      canPlaceOnSurfaces: false,
      backgroundTiles: 1,
      members: [
        { type: 'asset', id: 'COZY_DESK_FRONT', file: 'COZY_DESK_FRONT.png', width: 48, height: 32, footprintW: 3, footprintH: 2, orientation: 'front' },
        { type: 'asset', id: 'COZY_DESK_SIDE', file: 'COZY_DESK_SIDE.png', width: 16, height: 64, footprintW: 1, footprintH: 4, orientation: 'side' },
      ],
    },
    files: { COZY_DESK_FRONT: deskFront(), COZY_DESK_SIDE: deskSide() },
  });

  items.push({
    dir: 'COZY_CHAIR',
    manifest: {
      id: 'COZY_CHAIR',
      name: 'Gingham Chair',
      category: 'chairs',
      type: 'group',
      groupType: 'rotation',
      rotationScheme: '3-way-mirror',
      canPlaceOnWalls: false,
      canPlaceOnSurfaces: false,
      backgroundTiles: 1,
      members: [
        { type: 'asset', id: 'COZY_CHAIR_FRONT', file: 'COZY_CHAIR_FRONT.png', width: 16, height: 32, footprintW: 1, footprintH: 2, orientation: 'front' },
        { type: 'asset', id: 'COZY_CHAIR_BACK', file: 'COZY_CHAIR_BACK.png', width: 16, height: 32, footprintW: 1, footprintH: 2, orientation: 'back' },
        { type: 'asset', id: 'COZY_CHAIR_SIDE', file: 'COZY_CHAIR_SIDE.png', width: 16, height: 32, footprintW: 1, footprintH: 2, orientation: 'side', mirrorSide: true },
      ],
    },
    files: { COZY_CHAIR_FRONT: chairFront(), COZY_CHAIR_BACK: chairBack(), COZY_CHAIR_SIDE: chairSide() },
  });

  const pcAsset = (id, extra) => ({ type: 'asset', id, file: `${id}.png`, width: 16, height: 32, footprintW: 1, footprintH: 2, ...extra });
  items.push({
    dir: 'COZY_PC',
    manifest: {
      id: 'COZY_PC',
      name: 'Retro Computer',
      category: 'electronics',
      type: 'group',
      groupType: 'rotation',
      rotationScheme: '3-way-mirror',
      canPlaceOnWalls: false,
      canPlaceOnSurfaces: true,
      backgroundTiles: 1,
      members: [
        {
          type: 'group',
          groupType: 'state',
          orientation: 'front',
          members: [
            {
              type: 'group',
              groupType: 'animation',
              state: 'on',
              members: [0, 1, 2].map((f) => pcAsset(`COZY_PC_FRONT_ON_${f + 1}`, { frame: f })),
            },
            pcAsset('COZY_PC_FRONT_OFF', { state: 'off' }),
          ],
        },
        pcAsset('COZY_PC_BACK', { orientation: 'back' }),
        pcAsset('COZY_PC_SIDE', { orientation: 'side', mirrorSide: true }),
      ],
    },
    files: {
      COZY_PC_FRONT_ON_1: pcFront(0),
      COZY_PC_FRONT_ON_2: pcFront(1),
      COZY_PC_FRONT_ON_3: pcFront(2),
      COZY_PC_FRONT_OFF: pcFront(null),
      COZY_PC_BACK: pcBack(),
      COZY_PC_SIDE: pcSide(),
    },
  });

  items.push({
    dir: 'COZY_SOFA',
    manifest: {
      id: 'COZY_SOFA',
      name: 'Quilted Sofa',
      category: 'chairs',
      type: 'group',
      groupType: 'rotation',
      rotationScheme: '3-way-mirror',
      canPlaceOnWalls: false,
      canPlaceOnSurfaces: false,
      backgroundTiles: 0,
      members: [
        { type: 'asset', id: 'COZY_SOFA_FRONT', file: 'COZY_SOFA_FRONT.png', width: 32, height: 16, footprintW: 2, footprintH: 1, orientation: 'front' },
        { type: 'asset', id: 'COZY_SOFA_BACK', file: 'COZY_SOFA_BACK.png', width: 32, height: 16, footprintW: 2, footprintH: 1, orientation: 'back' },
        { type: 'asset', id: 'COZY_SOFA_SIDE', file: 'COZY_SOFA_SIDE.png', width: 16, height: 32, footprintW: 1, footprintH: 2, orientation: 'side', mirrorSide: true },
      ],
    },
    files: { COZY_SOFA_FRONT: sofa('front'), COZY_SOFA_BACK: sofa('back'), COZY_SOFA_SIDE: sofa('side') },
  });

  const single = (id, name, category, sprite, fp, opts = {}) =>
    items.push({
      dir: id,
      manifest: {
        id,
        name,
        category,
        type: 'asset',
        file: `${id}.png`,
        width: sprite.w,
        height: sprite.h,
        footprintW: fp[0],
        footprintH: fp[1],
        canPlaceOnWalls: opts.wall ?? false,
        canPlaceOnSurfaces: opts.surface ?? false,
        backgroundTiles: opts.bg ?? 0,
      },
      files: { [id]: sprite },
    });

  single('COZY_TEA_TABLE', 'Tea Table', 'desks', teaTable(), [2, 2], { bg: 1 });
  single('COZY_BOOKSHELF', 'Farmhouse Bookshelf', 'wall', bookshelf2x2(), [2, 2], { wall: true });
  single('COZY_WINDOW', 'Countryside Window', 'wall', window2x2(), [2, 2], { wall: true });
  single('COZY_PAINTING', 'Farm Painting', 'wall', painting2x2(), [2, 2], { wall: true });
  single('COZY_CLOCK', 'Pendulum Clock', 'wall', stampItem('clock', 16, 32, { W: C.w3, w: C.w4, C: C.cream, k: C.ink, Y: C.gold, y: C.goldS }, 1), [1, 2], { wall: true });
  single('COZY_CALENDAR', 'Wall Calendar', 'wall', stampItem('calendar', 16, 32, { r: C.redS, R: C.red, C: C.cream, c: C.creamS, k: C.w4 }, 3), [1, 2], { wall: true });
  single('COZY_FIREPLACE', 'Stone Fireplace', 'decor', fireplace(), [2, 2], { bg: 1 });
  single('COZY_SUNFLOWER', 'Potted Sunflower', 'decor', stampItem('sunflower', 16, 32, pot, 13), [1, 2], { bg: 1 });
  single('COZY_FERN', 'Potted Fern', 'decor', stampItem('fern', 16, 32, pot, 16), [1, 2], { bg: 1 });
  single('COZY_BIG_PLANT', 'Big Leafy Plant', 'decor', bigPlant(), [2, 3], { bg: 2 });
  single('COZY_LANTERN', 'Floor Lantern', 'decor', stampItem('lantern', 16, 32, wood, 13), [1, 2], { bg: 1 });
  single('COZY_BARREL', 'Oak Barrel', 'storage', stampItem('barrel', 16, 32, { W: C.w2, w: C.w1, m: C.metal, d: C.w4 }, 16), [1, 2], { bg: 1 });
  single(
    'COZY_CRATE',
    'Harvest Crate',
    'storage',
    stampItem('crate', 16, 16, { W: C.w2, w: C.w3, d: C.w4, r: '#b23a3a', R: '#e0584a', p: '#c9a23a', P: '#f0d070' }, 3),
    [1, 1],
  );
  single(
    'COZY_BASKET',
    'Veggie Basket',
    'misc',
    stampItem('basket', 16, 16, { h: C.w3, W: C.w1, w: C.w2, O: '#f08a3a', o: '#c0602a', P: '#b0508a', p: '#803868', G: '#8cc45a', g: '#5a9a3a' }, 5),
    [1, 1],
    { surface: true },
  );
  single(
    'COZY_MUG',
    'Coffee Mug',
    'misc',
    stampItem('mug', 16, 16, { C: C.cream, c: C.creamS, B: C.w5, R: C.red, s: '#ffffff' }, 2),
    [1, 1],
    { surface: true },
  );

  return items;
}
