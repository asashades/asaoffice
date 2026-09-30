// Extra furniture for the bigger office: canteen (kantin), toilet, the Stardew-style quest board, and the garden
// outside. Same conventions as furniture.mjs: every item is { dir, manifest, files }, sprites are footprint × 16 px,
// and `bg` is how many top rows are drawn behind villagers instead of blocking them.
import { Sprite, rng } from './pixel.mjs';

const P = {
  w0: '#f0c283', w1: '#dca05f', w2: '#c07f43', w3: '#9c5d2f', w4: '#744122', w5: '#522c18',
  cream: '#f4e6c4', creamS: '#d9c49a', paper: '#f6ecd0', paperS: '#dccb9e',
  red: '#c8503c', redS: '#973a2f', green: '#6ea84e', greenS: '#467a3a', greenD: '#2f5a33', leaf: '#8cc45a', leafL: '#a9d86a',
  sky: '#8fd0e8', stone: '#a9a19a', stoneL: '#c4bdb5', stoneS: '#7c736e', stoneD: '#57504e', metal: '#6b6f7a', metalL: '#9aa0ac',
  white: '#eef0ec', whiteS: '#c8cec8', gold: '#e8c04a', goldS: '#b88a2e', water: '#5aa8d8', waterL: '#8cc8ea', waterD: '#3f7fb0',
  ink: '#3a2117', straw: '#e6c66a', strawS: '#b8993e',
};
const OUT = 0.34;

const disc = (s, cx, cy, r, c) => {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) s.set(cx + x, cy + y, c);
  return s;
};
const oval = (s, cx, cy, rx, ry, c) => {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.02) s.set(cx + x, cy + y, c);
  return s;
};

// ── Kantin ──────────────────────────────────────────────────────────
function kitchenCounter() {
  const s = new Sprite(32, 32);
  s.rect(1, 1, 30, 9, '#efe4c8').hline(1, 1, 30, P.w3);
  for (let x = 1; x < 31; x += 4) s.vline(x, 2, 8, '#d9c9a4');
  for (let y = 4; y < 10; y += 3) s.hline(1, y, 30, '#d9c9a4');
  s.rect(0, 10, 32, 6, P.cream).hline(0, 10, 32, '#fff8e4').hline(0, 15, 32, P.creamS);
  // sink
  s.rect(3, 11, 12, 4, '#8fa6b8').rect(4, 12, 10, 2, '#6a8298').hline(3, 11, 12, '#b8ccda');
  s.rect(8, 5, 2, 6, P.metal).rect(8, 4, 6, 2, P.metalL).rect(13, 4, 1, 4, P.metal);
  // stove top with a pot
  for (const x of [20, 26]) s.rect(x, 12, 4, 2, '#2a2a2e').hline(x, 12, 4, '#4a4a52');
  s.rect(18, 6, 8, 5, '#8d919c').hline(18, 6, 8, '#b9bec8').rect(18, 6, 1, 5, '#6b6f7a').rect(21, 4, 2, 2, '#4a4a52');
  // cabinet
  s.rect(0, 16, 32, 15, P.w2);
  s.rect(1, 17, 14, 12, P.w1).rect(17, 17, 14, 12, P.w1);
  for (const x of [1, 17]) { s.hline(x, 17, 14, P.w0); s.hline(x, 28, 14, P.w3); s.vline(x, 17, 12, P.w0); s.vline(x + 13, 17, 12, P.w3); }
  s.rect(12, 21, 2, 3, P.gold).rect(18, 21, 2, 3, P.gold);
  s.rect(0, 30, 32, 2, P.w4);
  return s.outline(OUT);
}

function fridge() {
  const s = new Sprite(16, 32);
  s.rect(2, 1, 12, 30, P.white).hline(2, 1, 12, '#ffffff').vline(2, 1, 30, '#ffffff').vline(13, 2, 29, P.whiteS);
  s.hline(2, 10, 12, '#9aa09a').hline(2, 11, 12, P.whiteS);
  s.rect(11, 4, 1, 5, P.metal).rect(11, 13, 1, 8, P.metal);
  s.rect(5, 15, 3, 3, P.red).rect(6, 19, 3, 2, P.gold).rect(4, 22, 2, 3, '#5a8ac8'); // magnets and notes
  s.rect(3, 29, 3, 2, P.stoneD).rect(10, 29, 3, 2, P.stoneD);
  return s.outline(OUT);
}

function waterDispenser() {
  const s = new Sprite(16, 32);
  s.rect(4, 1, 8, 11, '#7fc4e8').rect(5, 2, 2, 8, '#c8ecf8').hline(4, 1, 8, '#a8dcf0').rect(6, 0, 4, 2, P.whiteS);
  s.rect(3, 12, 10, 17, '#dfe6ea').vline(3, 12, 17, '#f4f8fa').vline(12, 13, 16, '#b8c2c8');
  s.rect(5, 15, 2, 2, P.red).rect(9, 15, 2, 2, '#4a86d8');
  s.rect(5, 19, 6, 1, P.stoneS).rect(5, 20, 6, 2, '#9aa4ac');
  s.rect(3, 29, 10, 2, P.stoneD);
  return s.outline(OUT);
}

function vending() {
  const s = new Sprite(16, 32);
  s.rect(1, 1, 14, 30, P.red).hline(1, 1, 14, '#e8705a').vline(1, 1, 30, '#e8705a').vline(14, 2, 29, P.redS);
  s.rect(3, 3, 10, 15, '#26323f');
  const cols = ['#f0c040', '#5ab060', '#e07a9a', '#5a8ac8', '#f08a3a'];
  for (let row = 0; row < 3; row++) {
    s.hline(3, 7 + row * 5, 10, '#6a7a8a');
    for (let i = 0; i < 4; i++) s.rect(4 + i * 2 + (i > 1 ? 0 : 0), 4 + row * 5, 2, 3, cols[(i + row * 2) % cols.length]);
  }
  s.rect(3, 3, 10, 1, '#4a5a6a').rect(3, 3, 2, 15, '#3a4a5a');
  s.rect(4, 20, 3, 2, P.cream).rect(9, 20, 3, 2, P.cream);
  s.rect(4, 24, 8, 4, '#15181d').hline(4, 24, 8, '#3a3f48');
  s.rect(3, 29, 10, 2, P.redS);
  return s.outline(OUT);
}

function diningTable() {
  const s = new Sprite(32, 32);
  // gingham cloth on a round-cornered table, plates and a mug on top
  s.rect(1, 7, 30, 13, P.red);
  for (let y = 7; y < 20; y++) for (let x = 1; x < 31; x++) if (((x >> 2) + (y >> 2)) % 2 === 0) s.set(x, y, P.cream);
  s.hline(1, 7, 30, '#fff8e4');
  s.rect(1, 20, 30, 5, P.red);
  for (let y = 20; y < 25; y++) for (let x = 1; x < 31; x++) if (((x >> 2) + (y >> 2)) % 2 === 0) s.set(x, y, P.cream);
  for (let x = 2; x < 30; x += 4) s.set(x + 1, 25, P.redS);
  s.hline(1, 25, 30, P.redS);
  s.rect(3, 26, 3, 4, P.w4).rect(26, 26, 3, 4, P.w4);
  oval(s, 8, 12, 4, 2, '#ffffff');
  oval(s, 8, 12, 2, 1, P.creamS);
  oval(s, 22, 12, 4, 2, '#ffffff');
  oval(s, 22, 12, 2, 1, P.creamS);
  s.rect(14, 10, 4, 4, P.red).rect(18, 11, 1, 2, P.red).hline(14, 10, 4, '#e8705a');
  return s.outline(OUT);
}

function wallCupboard() {
  const s = new Sprite(32, 32);
  s.rect(2, 3, 28, 20, P.w2).hline(2, 3, 28, P.w0).rect(1, 2, 30, 2, P.w4);
  s.rect(4, 6, 11, 14, '#bfe6f2').rect(4, 6, 11, 2, '#dff4fa');
  // plates and jars behind the glass
  for (let i = 0; i < 3; i++) s.rect(5, 9 + i * 3, 8, 2, i % 2 ? P.cream : '#ffffff').hline(5, 9 + i * 3, 8, P.creamS);
  s.rect(6, 17, 2, 3, P.red).rect(9, 16, 3, 4, P.gold);
  s.rect(17, 6, 11, 14, P.w1).hline(17, 6, 11, P.w0).hline(17, 19, 11, P.w3).vline(17, 6, 14, P.w0).vline(27, 6, 14, P.w3);
  s.rect(15, 11, 2, 4, P.gold);
  s.rect(2, 23, 28, 2, P.w4);
  s.rect(6, 25, 1, 3, P.metal).rect(11, 25, 1, 3, P.metal).rect(16, 25, 1, 3, P.metal); // hooks with mugs
  s.rect(5, 27, 3, 3, P.cream).rect(10, 27, 3, 3, P.red).rect(15, 27, 3, 3, '#5a8ac8');
  return s.outline(OUT);
}

function signPlaque(kind) {
  const s = new Sprite(16, 32);
  s.rect(2, 10, 12, 14, '#3f6f9a').rect(3, 11, 10, 12, '#5a92c2').hline(2, 10, 12, P.w0).rect(2, 24, 12, 1, P.w4);
  s.vline(2, 10, 15, P.w1).vline(13, 10, 15, P.w3);
  const w = '#ffffff';
  if (kind === 'wc') {
    // two little figures, one in trousers, one in a skirt
    disc(s, 6, 14, 1, w).rect(5, 16, 3, 5, w).vline(5, 21, 2, w).vline(7, 21, 2, w);
    disc(s, 11, 14, 1, w).rect(9, 16, 4, 3, w).rect(10, 19, 2, 2, w).vline(10, 21, 2, w).vline(11, 21, 2, w);
    s.vline(8, 12, 11, '#3f6f9a');
  } else {
    // fork and spoon
    s.vline(5, 13, 9, w).set(4, 13, w).set(6, 13, w).set(4, 14, w).set(6, 14, w).hline(4, 15, 3, w);
    oval(s, 10, 15, 2, 2, w);
    s.vline(10, 17, 5, w);
  }
  return s.outline(OUT);
}


// ── Meeting room and the open-plan office ────────────────────────────
function meetingTable() {
  const s = new Sprite(48, 32);
  s.rect(1, 7, 46, 14, P.w3).rect(1, 7, 46, 3, P.w1).hline(1, 7, 46, P.w0);
  for (let x = 6; x < 46; x += 9) s.vline(x, 10, 9, '#b06f38'); // grain
  s.rect(1, 20, 46, 4, P.w4).hline(1, 20, 46, P.w2);
  s.rect(3, 24, 4, 7, P.w4).rect(41, 24, 4, 7, P.w4).rect(3, 24, 1, 7, P.w3).rect(41, 24, 1, 7, P.w3);
  // two laptops, papers, a water jug and cups
  for (const x of [8, 33]) s.rect(x, 9, 8, 5, '#c7ccd4').rect(x + 1, 10, 6, 3, '#26323f').rect(x + 1, 10, 6, 1, '#4a86d8').rect(x - 1, 14, 10, 2, '#a4a9b2');
  s.rect(19, 10, 4, 5, P.paper).rect(20, 9, 4, 5, '#ffffff').hline(20, 11, 3, P.creamS).hline(20, 13, 2, P.creamS);
  s.rect(26, 8, 4, 8, P.waterL).rect(27, 9, 1, 5, '#ffffff').rect(26, 7, 4, 1, P.metalL);
  s.rect(31, 14, 2, 3, P.cream).rect(15, 15, 2, 3, P.cream).rect(4, 13, 2, 3, P.red);
  return s.outline(OUT);
}

function easel() {
  const s = new Sprite(16, 32);
  s.rect(1, 2, 14, 16, P.w3).rect(2, 3, 12, 14, '#ffffff').hline(2, 3, 12, '#dfe4e8');
  s.hline(3, 6, 7, '#4a86d8').hline(3, 8, 5, '#4a86d8').hline(3, 10, 8, '#c8503c');
  s.rect(4, 12, 2, 3, '#6ea84e').rect(7, 13, 2, 2, '#e8c04a').rect(10, 11, 2, 4, '#4a86d8');
  s.rect(2, 18, 12, 2, P.w2).hline(2, 18, 12, P.w0);
  s.rect(3, 6, 1, 1, '#c8503c').rect(9, 5, 1, 1, '#c8503c');
  for (let i = 0; i < 11; i++) {
    s.set(3 - Math.floor(i / 5), 20 + i, P.w4);
    s.set(12 + Math.floor(i / 5), 20 + i, P.w4);
  }
  s.vline(8, 20, 10, P.w4).rect(6, 29, 4, 2, P.w4);
  s.rect(6, 19, 1, 1, '#e8c04a').rect(10, 19, 2, 1, '#c8503c'); // markers on the tray
  return s.outline(OUT);
}

function divider() {
  const s = new Sprite(16, 32);
  s.rect(2, 4, 12, 25, P.w2).rect(3, 5, 10, 23, P.cream);
  for (let y = 5; y < 28; y += 4) for (let x = 3; x < 13; x++) if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) s.set(x, y + 1, '#d9c49a'); // fabric weave
  s.vline(7, 5, 23, P.w3).vline(8, 5, 23, P.w3);
  s.hline(2, 4, 12, P.w0).hline(2, 28, 12, P.w4).rect(1, 29, 14, 2, P.w4);
  for (const [x, y] of [[4, 3], [6, 2], [9, 3], [11, 2], [7, 4], [12, 4]]) s.rect(x, y, 2, 2, P.green).set(x, y, P.leafL); // a plant peeking over
  return s.outline(OUT);
}

function printer() {
  const s = new Sprite(16, 32);
  s.rect(2, 8, 12, 5, '#b8bcc0').hline(2, 8, 12, '#dfe2e4').rect(3, 9, 10, 2, '#8a9096'); // lid
  s.rect(2, 13, 12, 14, '#d8d8d0').vline(2, 13, 14, '#f0f0e8').vline(13, 13, 14, '#a8a8a0').hline(2, 13, 12, '#eeeee6');
  s.rect(9, 15, 4, 2, '#26323f').set(10, 16, '#6ee08a').set(11, 16, '#6ee08a'); // display
  s.rect(3, 15, 4, 1, '#a8a8a0');
  s.rect(3, 21, 10, 4, '#a8a8a0').rect(4, 22, 8, 2, '#c8c8c0');
  s.rect(3, 26, 10, 2, P.paper).rect(4, 27, 8, 1, '#ffffff'); // a sheet coming out
  s.rect(3, 27, 2, 3, P.stoneD).rect(11, 27, 2, 3, P.stoneD);
  return s.outline(OUT);
}

// ── Toilet ───────────────────────────────────────────────────────────
function toilet() {
  const s = new Sprite(16, 32);
  s.rect(4, 3, 8, 7, P.white).hline(4, 3, 8, '#ffffff').rect(3, 2, 10, 2, P.whiteS).rect(7, 1, 2, 2, P.metalL);
  s.rect(3, 12, 10, 8, P.white).hline(3, 12, 10, '#ffffff');
  oval(s, 8, 15, 4, 2, P.whiteS);
  oval(s, 8, 15, 3, 1, '#9db8c8');
  s.rect(5, 20, 6, 8, P.whiteS).rect(5, 20, 6, 1, P.white);
  s.rect(4, 28, 8, 2, P.stone);
  s.vline(3, 12, 8, '#ffffff').vline(12, 13, 7, P.whiteS);
  return s.outline(OUT);
}

function basin() {
  const s = new Sprite(16, 32);
  s.rect(1, 0, 14, 14, P.w3).rect(2, 1, 12, 12, '#bfe6f2');
  for (let i = 0; i < 6; i++) s.set(3 + i, 11 - i, '#ffffff'); // glint
  s.set(9, 4, '#ffffff').set(10, 4, '#ffffff');
  s.rect(1, 15, 14, 6, P.white).hline(1, 15, 14, '#ffffff').rect(3, 16, 10, 3, '#9db8c8').hline(3, 16, 10, '#7f98aa');
  s.rect(7, 13, 2, 3, P.metalL).rect(6, 13, 4, 1, P.metal);
  s.rect(5, 21, 6, 8, P.whiteS).rect(5, 21, 6, 1, P.white).rect(4, 29, 8, 2, P.stone);
  return s.outline(OUT);
}

function doorMat() {
  const s = new Sprite(32, 16);
  s.rect(2, 3, 28, 10, P.w3);
  for (let x = 3; x < 29; x += 2) s.vline(x, 4, 8, x % 4 === 3 ? P.w2 : P.w1);
  s.hline(2, 3, 28, P.w0).hline(2, 12, 28, P.w4);
  s.rect(4, 6, 24, 4, P.red).hline(5, 7, 22, P.cream);
  return s.outline(OUT);
}

// ── Quest board (Stardew-style bulletin) ─────────────────────────────
function questBoard() {
  const s = new Sprite(48, 32);
  s.rect(1, 3, 46, 27, P.w4).rect(2, 4, 44, 25, P.w2).rect(3, 5, 42, 23, '#c9a06a');
  const r = rng(11);
  for (let i = 0; i < 110; i++) s.set(3 + Math.floor(r() * 42), 5 + Math.floor(r() * 23), r() < 0.5 ? '#b58c58' : '#d8b47c'); // cork grain
  s.rect(3, 5, 42, 1, P.w1).rect(3, 27, 42, 1, P.w3);
  // title plank with tiny letters
  s.rect(12, 0, 24, 6, P.w4).rect(13, 1, 22, 4, P.w3);
  for (let x = 15; x < 33; x += 3) s.rect(x, 2, 2, 2, P.cream);
  // pinned notes
  const note = (x, y, w, h, c, lines = 2, pin = P.red) => {
    s.rect(x, y, w, h, c).hline(x, y, w, '#ffffff').hline(x, y + h - 1, w, P.paperS);
    for (let i = 0; i < lines; i++) s.hline(x + 2, y + 3 + i * 3, w - 4, '#8a6a4a');
    s.set(x + Math.floor(w / 2), y + 1, pin).set(x + Math.floor(w / 2), y, pin);
  };
  note(5, 8, 10, 11, P.paper, 3);
  note(17, 9, 12, 14, '#f3e2a8', 4, '#3f74b8');
  note(31, 8, 11, 10, P.paper, 2, P.gold);
  note(6, 21, 9, 6, '#f3c8b0', 1, '#3f74b8');
  note(31, 20, 10, 7, '#d8ecc0', 2);
  s.rect(21, 20, 4, 4, P.red).rect(22, 21, 2, 2, P.goldS); // wax seal
  s.rect(4, 29, 40, 2, P.w4);
  s.rect(6, 30, 2, 2, P.w4).rect(40, 30, 2, 2, P.w4);
  return s.outline(OUT);
}

// ── Outdoors ─────────────────────────────────────────────────────────
function tree() {
  const s = new Sprite(32, 48);
  s.rect(13, 32, 6, 14, P.w4).rect(13, 32, 2, 14, P.w3).rect(11, 44, 10, 3, P.w4).rect(12, 43, 3, 2, P.w3);
  const blobs = [[16, 12, 10], [8, 19, 8], [24, 19, 8], [16, 24, 10], [11, 28, 6], [22, 28, 6], [16, 6, 6]];
  for (const [cx, cy, rr] of blobs) disc(s, cx, cy, rr, P.greenS);
  for (const [cx, cy, rr] of blobs) disc(s, cx - 1, cy - 1, Math.max(3, rr - 2), P.green);
  const r = rng(5);
  for (let i = 0; i < 46; i++) {
    const x = 4 + Math.floor(r() * 24);
    const y = 2 + Math.floor(r() * 30);
    if (s.get(x, y)) s.set(x, y, r() < 0.55 ? P.leaf : r() < 0.5 ? P.leafL : P.greenD);
  }
  for (const [x, y] of [[10, 20], [21, 16], [15, 27], [24, 25]]) s.rect(x, y, 2, 2, P.red); // apples
  return s.outline(OUT);
}

function bush() {
  const s = new Sprite(16, 16);
  for (const [cx, cy, rr] of [[8, 9, 6], [4, 10, 4], [12, 10, 4]]) disc(s, cx, cy, rr, P.greenS);
  for (const [cx, cy, rr] of [[8, 8, 5], [4, 9, 3], [12, 9, 3]]) disc(s, cx, cy, rr, P.green);
  for (const [x, y] of [[5, 6], [10, 7], [8, 11], [12, 11]]) s.rect(x, y, 2, 2, P.red);
  s.rect(6, 5, 3, 1, P.leafL).rect(11, 8, 2, 1, P.leafL);
  return s.outline(OUT);
}

function flowers() {
  const s = new Sprite(16, 16);
  const cols = ['#f08ab0', '#f8e070', '#ffffff', '#b58ae0'];
  const spots = [[3, 5], [8, 3], [12, 6], [5, 10], [10, 11], [2, 12]];
  spots.forEach(([x, y], i) => {
    s.vline(x + 1, y + 1, 4, P.greenS).set(x - 1, y + 3, P.green).set(x + 3, y + 4, P.green);
    s.rect(x, y, 3, 3, cols[i % cols.length]).set(x + 1, y + 1, P.gold);
  });
  return s;
}

function fence() {
  const s = new Sprite(16, 16);
  s.rect(0, 6, 16, 2, P.w2).rect(0, 11, 16, 2, P.w2).hline(0, 6, 16, P.w0).hline(0, 11, 16, P.w0).hline(0, 7, 16, P.w3).hline(0, 12, 16, P.w3);
  s.rect(6, 2, 4, 13, P.w1).rect(6, 2, 4, 1, P.w0).rect(9, 3, 1, 12, P.w3).rect(7, 1, 2, 1, P.w1);
  return s.outline(OUT);
}

function scarecrow() {
  const s = new Sprite(16, 32);
  s.vline(8, 10, 21, P.w4).vline(7, 10, 21, P.w3);
  s.rect(1, 13, 14, 2, P.w3).hline(1, 13, 14, P.w2);
  s.rect(5, 12, 6, 9, '#c8503c');
  for (let y = 12; y < 21; y++) for (let x = 5; x < 11; x++) if (((x >> 1) + (y >> 1)) % 2) s.set(x, y, '#e8705a');
  s.rect(0, 14, 2, 3, P.straw).rect(14, 14, 2, 3, P.straw).rect(6, 21, 4, 3, P.straw);
  disc(s, 8, 7, 3, '#e8c890');
  s.set(7, 7, P.ink).set(9, 7, P.ink).hline(7, 9, 3, P.redS);
  s.rect(3, 4, 10, 2, P.straw).rect(5, 1, 6, 4, P.straw).hline(3, 5, 10, P.strawS).hline(5, 4, 6, P.strawS);
  return s.outline(OUT);
}

function pond() {
  const s = new Sprite(48, 32);
  oval(s, 24, 16, 22, 13, P.stone);
  oval(s, 24, 16, 20, 11, P.waterD);
  oval(s, 24, 15, 19, 10, P.water);
  const r = rng(9);
  for (let i = 0; i < 26; i++) {
    const x = 8 + Math.floor(r() * 32);
    const y = 8 + Math.floor(r() * 16);
    if (s.get(x, y)?.[2] === 216) s.hline(x, y, 2 + Math.floor(r() * 3), P.waterL);
  }
  for (const [x, y] of [[4, 12], [8, 5], [16, 2], [30, 2], [40, 6], [44, 14], [40, 25], [28, 28], [12, 27], [5, 21], [22, 29]]) s.rect(x, y, 3, 2, r() < 0.5 ? P.stoneL : P.stoneS);
  disc(s, 18, 16, 3, P.greenS);
  disc(s, 17, 15, 2, P.green);
  s.rect(19, 13, 2, 2, '#f08ab0');
  disc(s, 31, 20, 2, P.green);
  s.vline(40, 6, 5, P.greenD).rect(39, 4, 3, 3, P.w3); // a cattail
  return s.outline(OUT);
}

function bench() {
  const s = new Sprite(32, 16);
  s.rect(2, 1, 28, 3, P.w2).hline(2, 1, 28, P.w0).hline(2, 3, 28, P.w3);
  s.rect(2, 5, 28, 3, P.w1).hline(2, 5, 28, P.w0).hline(2, 7, 28, P.w3);
  s.rect(4, 8, 3, 7, P.w4).rect(25, 8, 3, 7, P.w4).rect(4, 1, 2, 7, P.w3).rect(26, 1, 2, 7, P.w3);
  return s.outline(OUT);
}

function well() {
  const s = new Sprite(32, 32);
  s.rect(5, 6, 3, 17, P.w3).rect(24, 6, 3, 17, P.w3).rect(5, 6, 1, 17, P.w2);
  // little roof
  for (let i = 0; i < 6; i++) s.hline(3 + i, 2 + i, 26 - i * 2, i % 2 ? P.red : P.redS);
  s.hline(3, 1, 26, P.w4);
  oval(s, 16, 22, 12, 6, P.stoneS);
  oval(s, 16, 21, 11, 5, P.stone);
  oval(s, 16, 21, 8, 3, '#26323f');
  oval(s, 16, 22, 6, 2, P.waterD);
  s.rect(4, 22, 24, 6, P.stone);
  for (let x = 4; x < 28; x += 6) s.vline(x, 22, 6, P.stoneS);
  s.hline(4, 27, 24, P.stoneD);
  s.vline(16, 6, 12, P.w4).rect(14, 18, 5, 4, P.w3).hline(14, 18, 5, P.w1); // rope and bucket
  return s.outline(OUT);
}

/** All the extra items, as { dir, manifest, files } like buildFurniture(). */
export function buildOfficeExtras() {
  const items = [];
  const single = (id, name, category, sprite, fp, opts = {}) =>
    items.push({
      dir: id,
      manifest: {
        id, name, category, type: 'asset', file: `${id}.png`, width: sprite.w, height: sprite.h,
        footprintW: fp[0], footprintH: fp[1], canPlaceOnWalls: opts.wall ?? false, canPlaceOnSurfaces: false, backgroundTiles: opts.bg ?? 0,
      },
      files: { [id]: sprite },
    });
  // kantin
  single('COZY_KCOUNTER', 'Kitchen Counter', 'storage', kitchenCounter(), [2, 2], { bg: 1 });
  single('COZY_FRIDGE', 'Fridge', 'storage', fridge(), [1, 2], { bg: 1 });
  single('COZY_WATER', 'Water Dispenser', 'misc', waterDispenser(), [1, 2], { bg: 1 });
  single('COZY_VENDING', 'Snack Machine', 'misc', vending(), [1, 2], { bg: 1 });
  single('COZY_DINING', 'Gingham Dining Table', 'misc', diningTable(), [2, 2], { bg: 1 });
  single('COZY_CUPBOARD', 'Wall Cupboard', 'wall', wallCupboard(), [2, 2], { wall: true });
  single('COZY_SIGN_FOOD', 'Canteen Sign', 'wall', signPlaque('food'), [1, 2], { wall: true });
  // toilet
  single('COZY_TOILET', 'Toilet', 'misc', toilet(), [1, 2], { bg: 1 });
  single('COZY_BASIN', 'Basin with Mirror', 'misc', basin(), [1, 2], { bg: 1 });
  single('COZY_SIGN_WC', 'Toilet Sign', 'wall', signPlaque('wc'), [1, 2], { wall: true });
  single('COZY_MAT', 'Door Mat', 'misc', doorMat(), [2, 1], { bg: 1 });
  // meeting room and open-plan office
  single('COZY_MEETING_TABLE', 'Meeting Table', 'desks', meetingTable(), [3, 2], { bg: 1 });
  single('COZY_EASEL', 'Whiteboard Easel', 'misc', easel(), [1, 2], { bg: 1 });
  single('COZY_DIVIDER', 'Fabric Screen', 'decor', divider(), [1, 2], { bg: 1 });
  single('COZY_PRINTER', 'Copier', 'misc', printer(), [1, 2], { bg: 1 });
  // quest board
  single('COZY_QUESTBOARD', 'Quest Board', 'wall', questBoard(), [3, 2], { wall: true });
  // garden
  single('COZY_TREE', 'Apple Tree', 'decor', tree(), [2, 3], { bg: 2 });
  single('COZY_BUSH', 'Berry Bush', 'decor', bush(), [1, 1]);
  single('COZY_FLOWERS', 'Flower Patch', 'decor', flowers(), [1, 1], { bg: 1 });
  single('COZY_FENCE', 'Wooden Fence', 'decor', fence(), [1, 1]);
  single('COZY_SCARECROW', 'Scarecrow', 'decor', scarecrow(), [1, 2], { bg: 1 });
  single('COZY_POND', 'Pond', 'decor', pond(), [3, 2]);
  single('COZY_BENCH', 'Garden Bench', 'misc', bench(), [2, 1]);
  single('COZY_WELL', 'Stone Well', 'decor', well(), [2, 2], { bg: 1 });
  return items;
}
