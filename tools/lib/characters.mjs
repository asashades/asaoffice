// Stardew-inspired chibi farmers, laid out exactly like pixel-agents' char_N.png:
// 112×96 = 7 frames (16×32) × 3 rows (down, up, right).
// Frames per row: 0-2 walk, 3-4 typing (seated), 5-6 reading (seated).
import { Sprite, shade } from './pixel.mjs';

const W = 16;
const H = 32;

function check(name, rows) {
  rows.forEach((r, i) => {
    if (r.length !== W) throw new Error(`${name} row ${i} is ${r.length} wide: "${r}"`);
  });
  return rows;
}

// ── Heads (13 rows; rows 0-1 are headroom for hats/buns) ─────────────
const HEAD = {
  down: check('head.down', [
    '................',
    '................',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '...HH^^HHHHHH...',
    '...HHHHHHHHHH...',
    '...HHHHHHHHhH...',
    '...HSSSHSSSSH...',
    '...SSESSSSESS...',
    '...SSESSSSESS...',
    '...SBSSSSSSBS...',
    '....SSSSSSSS....',
    '.....SSSSSS.....',
  ]),
  up: check('head.up', [
    '................',
    '................',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '...HH^^HHHHHH...',
    '...HHHHHHHHHH...',
    '...HHHHHHHHHH...',
    '...HHHHHHHHHH...',
    '...SHHHHHHHHS...',
    '...SHHHHHHHHS...',
    '...HHhHHHHhHH...',
    '....hHHHHHHh....',
    '.....SSSSSS.....',
  ]),
  right: check('head.right', [
    '................',
    '................',
    '.....HHHHHH.....',
    '....HHHHHHHH....',
    '...HHH^^HHHHH...',
    '...HHHHHHHHHH...',
    '...HHHHHHHHHHH..',
    '...HHHHHSSSSS...',
    '...HHHHSSSSES...',
    '...HhHHSSSSES...',
    '...HHHSSSSSBS...',
    '....HHSSSSSSS...',
    '.....hSSSSS.....',
  ]),
};

// ── Hair / hat overlays (stamped after body + head; may run past row 12) ──
const STYLE = {
  short: { down: [], up: [], right: [] },
  long: {
    down: check('long.down', [
      ...Array(7).fill('................'),
      '...H........H...',
      '..HH........HH..',
      '..HH........HH..',
      '..HH........HH..',
      '..HH........HH..',
      '..HH........HH..',
      '..Hh........hH..',
      '..hh........hh..',
      '...h........h...',
    ]),
    up: check('long.up', [
      ...Array(8).fill('................'),
      '...HHHHHHHHHH...',
      '...HHHHHHHHHH...',
      '..HHHHHHHHHHHH..',
      '..HHHHHhHHHHHH..',
      '..HHHHHHHHHHHH..',
      '..HHhHHHHHHhHH..',
      '..hHHHHHHHHHHh..',
      '...hhHHHHHHhh...',
    ]),
    right: check('long.right', [
      ...Array(6).fill('................'),
      '..HH............',
      '..HHH...........',
      '..HHHH..........',
      '..HHHH..........',
      '..HHHH..........',
      '..HHH...........',
      '..HhH...........',
      '..hHh...........',
      '...hh...........',
    ]),
  },
  ponytail: {
    down: check('pony.down', ['................', '................', '................', '............RR..', '............RH..']),
    up: check('pony.up', [
      ...Array(9).fill('................'),
      '.......RR.......',
      '.......HH.......',
      '......HHHH......',
      '......HHhH......',
      '.......Hh.......',
      '.......h........',
    ]),
    right: check('pony.right', [
      ...Array(5).fill('................'),
      '...R............',
      '..HR............',
      '.HHH............',
      '.HHh............',
      '.Hh.............',
      '.h..............',
    ]),
  },
  bun: {
    down: check('bun.down', ['......HHHH......', '.....HH^HHH.....', '......RRRR......']),
    up: check('bun.up', ['......HHHH......', '.....HHHHHH.....', '......RRRR......']),
    right: check('bun.right', ['...HHHH.........', '..HH^HHH........', '...RRRR.........']),
  },
  strawhat: {
    down: check('hat.down', [
      '.....AAAAAA.....',
      '....AAAYAAAA....',
      '....RRRRRRRR....',
      '.AAAAAAAAAAAAAA.',
      '..aaaaaaaaaaaa..',
    ]),
    up: check('hat.up', [
      '.....AAAAAA.....',
      '....AAAAAAAA....',
      '....RRRRRRRR....',
      '.AAAAAAAAAAAAAA.',
      '..aaaaaaaaaaaa..',
    ]),
    right: check('hat.right', [
      '.....AAAAA......',
      '....AAAYAAA.....',
      '....RRRRRRR.....',
      '.AAAAAAAAAAAAAA.',
      '..aaaaaaaaaaaa..',
    ]),
  },
  beanie: {
    down: check('beanie.down', [
      '................',
      '......RR........',
      '.....AAAAAA.....',
      '....AAAAAAAA....',
      '...AAAAAYAAAA...',
      '...AaAaAaAaAa...',
      '...aaaaaaaaaa...',
    ]),
    up: check('beanie.up', [
      '................',
      '......RR........',
      '.....AAAAAA.....',
      '....AAAAAAAA....',
      '...AAAAAAAAAA...',
      '...AaAaAaAaAa...',
      '...aaaaaaaaaa...',
    ]),
    right: check('beanie.right', [
      '................',
      '.....RR.........',
      '.....AAAAAA.....',
      '....AAAAAAAA....',
      '...AAAAYAAAAA...',
      '...AaAaAaAaAa...',
      '...aaaaaaaaaa...',
    ]),
  },
};

// ── Bodies ────────────────────────────────────────────────────────────
const TORSO_FRONT = [
  '......SSSS......',
  '....TTTTTTTT....',
  '...TTUTTTTUTT...',
  '...TTUTTTTUTT...',
  '...TtUUUUUUtT...',
  '...TtUUUUUUtT...',
];
const TORSO_BACK = [
  '......SSSS......',
  '....TTTTTTTT....',
  '...TTUTTTTUTT...',
  '...TTTUTTUTTT...',
  '...TtTTUUTTtT...',
  '...TtTUUUUTtT...',
];
const TORSO_SIDE = ['......SSS.......', '.....TTTTTT.....', '.....TTTTTT.....'];

const LEGS_STAND = ['....PPPPPPPP....', '....PPPPPPPP....', '....PPP..PPP....', '....PPP..PPP....', '....ppp..ppp....', '....OOO..OOO....'];
const LEGS_STEP = ['....PPPPPPPP....', '....PPPPPPPP....', '....PPP..PPP....', '....PPP..ppp....', '....ppp..OOO....', '....OOO.........'];

const BODY = {
  down: {
    stand: [...TORSO_FRONT, '...TtUUUUUUtT...', '...S.UUUUUU.S...', ...LEGS_STAND],
    step: [...TORSO_FRONT, '...SUUUUUUUtT...', '....UUUUUUU.S...', ...LEGS_STEP],
    type0: [...TORSO_FRONT.slice(0, 5), '...TSUUUUUUtT...', '...TTUUUUUSTT...', '...PPPPPPPPPP...', '...PPPPPPPPPP...', '....ppp..ppp....', '....OOO..OOO....'],
    type1: [...TORSO_FRONT.slice(0, 5), '...TtUUUUUUST...', '...TTSUUUUUTT...', '...PPPPPPPPPP...', '...PPPPPPPPPP...', '....ppp..ppp....', '....OOO..OOO....'],
    read0: [...TORSO_FRONT.slice(0, 4), '...TtKKKKKKtT...', '...TSKWWWWKST...', '...TTKWwWWKTT...', '...PPPPPPPPPP...', '...PPPPPPPPPP...', '....ppp..ppp....', '....OOO..OOO....'],
    read1: [...TORSO_FRONT.slice(0, 4), '...TtKKKKKKtT...', '...TSKWWwWKST...', '...TTKWWWwKTT...', '...PPPPPPPPPP...', '...PPPPPPPPPP...', '....ppp..ppp....', '....OOO..OOO....'],
  },
  up: {
    stand: [...TORSO_BACK, '...TtUUUUUUtT...', '...S.UUUUUU.S...', ...LEGS_STAND],
    step: [...TORSO_BACK, '...SUUUUUUUtT...', '....UUUUUUU.S...', ...LEGS_STEP],
    type0: [...TORSO_BACK.slice(0, 5), '..tTtTUUUUTtT...', '...tUUUUUUUUT...', '....PPPPPPPP....', '....pppppppp....'],
    type1: [...TORSO_BACK.slice(0, 5), '...TtTUUUUTtTt..', '...TUUUUUUUUt...', '....PPPPPPPP....', '....pppppppp....'],
    read0: [...TORSO_BACK.slice(0, 4), '..tTtTUUTTtTt...', '..tTtTUUUUTtTt..', '...tUUUUUUUUt...', '....PPPPPPPP....', '....pppppppp....'],
    read1: [...TORSO_BACK.slice(0, 4), '..tTtTUUTTtTtK..', '..tTtTUUUUTtTt..', '...tUUUUUUUUt...', '....PPPPPPPP....', '....pppppppp....'],
  },
  right: {
    stand: [
      ...TORSO_SIDE,
      '.....TTTtTT.....',
      '.....UUTtUU.....',
      '.....UUTtUU.....',
      '.....UUTtUU.....',
      '.....UUUSUU.....',
      '.....PPPPPP.....',
      '......PPPP......',
      '......PPPP......',
      '......PPPP......',
      '......pppp......',
      '......OOOOO.....',
    ],
    step: [
      ...TORSO_SIDE,
      '.....TTTTtT.....',
      '.....UUUUtTt....',
      '.....UUUUUtS....',
      '.....UUUUUU.....',
      '.....UUUUUU.....',
      '.....PPPPPP.....',
      '.....PPPPPPP....',
      '....PPP..PPP....',
      '....PP....PP....',
      '...ppp....pp....',
      '...OOO....OOO...',
    ],
    stepBack: [
      ...TORSO_SIDE,
      '....tTTTTTT.....',
      '....tUUUUUU.....',
      '...SUUUUUUU.....',
      '.....UUUUUU.....',
      '.....UUUUUU.....',
      '.....PPPPPP.....',
      '.....PPPPPPP....',
      '....PPP..PPP....',
      '....PP....PP....',
      '...ppp....pp....',
      '...OOO....OOO...',
    ],
    type0: [
      ...TORSO_SIDE,
      '.....TTtTTT.....',
      '.....UUtttSS....',
      '.....UUUUUU.....',
      '.....UUUUUU.....',
      '.....PPPPPPPP...',
      '.....pPPPPPPP...',
      '..........PPP...',
      '..........ppp...',
      '..........OOOO..',
    ],
    type1: [
      ...TORSO_SIDE,
      '.....TTtttSS....',
      '.....UUUUUU.....',
      '.....UUUUUU.....',
      '.....UUUUUU.....',
      '.....PPPPPPPP...',
      '.....pPPPPPPP...',
      '..........PPP...',
      '..........ppp...',
      '..........OOOO..',
    ],
    read0: [
      '......SSS.......',
      '.....TTTTTT.K...',
      '.....TTTTTTKK...',
      '.....TTtttSKK...',
      '.....UUUUUUKK...',
      '.....UUUUUU.K...',
      '.....UUUUUU.....',
      '.....PPPPPPPP...',
      '.....pPPPPPPP...',
      '..........PPP...',
      '..........ppp...',
      '..........OOOO..',
    ],
    read1: [
      '......SSS.K.....',
      '.....TTTTTTK....',
      '.....TTTTTTKK...',
      '.....TTtttSKK...',
      '.....UUUUUUKK...',
      '.....UUUUUU.....',
      '.....UUUUUU.....',
      '.....PPPPPPPP...',
      '.....pPPPPPPP...',
      '..........PPP...',
      '..........ppp...',
      '..........OOOO..',
    ],
  },
};
for (const [dir, poses] of Object.entries(BODY)) for (const [p, rows] of Object.entries(poses)) check(`body.${dir}.${p}`, rows);

// Frame recipe: [bodyPose, headY, bodyY, flipBody, headDy]
// Standing: head rows 2..12 start at frame y=2; body directly below.
const FRAMES = {
  down: [
    ['step', 1, 14, false],
    ['stand', 2, 15, false],
    ['step', 1, 14, true],
    ['type0', 4, 17, false],
    ['type1', 4, 17, false],
    ['read0', 5, 17, false],
    ['read1', 5, 17, false],
  ],
  up: [
    ['step', 1, 14, false],
    ['stand', 2, 15, false],
    ['step', 1, 14, true],
    ['type0', 3, 16, false],
    ['type1', 3, 16, false],
    ['read0', 4, 16, false],
    ['read1', 4, 16, false],
  ],
  right: [
    ['step', 1, 14, false],
    ['stand', 2, 15, false],
    ['stepBack', 1, 14, false],
    ['type0', 3, 16, false],
    ['type1', 3, 16, false],
    ['read0', 4, 16, false],
    ['read1', 4, 16, false],
  ],
};

function palette(c) {
  const bib = c.overalls ? c.pants : c.shirt;
  return {
    H: c.hair,
    h: shade(c.hair, 0.72),
    '^': shade(c.hair, 1.35),
    S: c.skin,
    s: shade(c.skin, 0.82),
    E: '#2b1d2a',
    B: shade(c.skin, 0.86).map((v, i) => (i === 0 ? Math.min(255, v + 30) : v)),
    T: c.shirt,
    t: shade(c.shirt, 0.78),
    U: bib,
    u: shade(bib, 0.78),
    P: c.pants,
    p: shade(c.pants, 0.75),
    O: c.shoes,
    A: c.hat ?? '#e8c070',
    a: shade(c.hat ?? '#e8c070', 0.72),
    Y: shade(c.hat ?? '#e8c070', 1.3),
    R: c.accent ?? '#c8504a',
    K: '#8a4b2d',
    W: '#f4ead2',
    w: '#c9b48e',
  };
}

export function renderCharacter(c) {
  const pal = palette(c);
  const sheet = new Sprite(W * 7, H * 3);
  ['down', 'up', 'right'].forEach((dir, row) => {
    FRAMES[dir].forEach(([pose, headY, bodyY, flip], f) => {
      const fr = new Sprite(W, H);
      let body = new Sprite(W, H).stamp(BODY[dir][pose], pal, 0, bodyY);
      if (flip) body = body.flipX();
      fr.blit(body, 0, 0);
      fr.stamp(HEAD[dir], pal, 0, headY);
      fr.stamp(STYLE[c.style][dir], pal, 0, headY);
      fr.outline(0.36);
      sheet.blit(fr, f * W, row * H);
    });
  });
  return sheet;
}

// Six original cozy-farm villagers (not copies of any existing game character).
export const CHARACTERS = [
  { name: 'Farmer Asa', style: 'strawhat', skin: '#f2c29b', hair: '#7a4a2a', shirt: '#d8643f', pants: '#4f79b8', overalls: true, shoes: '#5a3825', hat: '#e9c46a', accent: '#b8453b' },
  { name: 'Rowan', style: 'long', skin: '#f5cfa9', hair: '#b4502e', shirt: '#6fa65a', pants: '#6b4a34', shoes: '#4a2f22', accent: '#e7c85a' },
  { name: 'Clem', style: 'ponytail', skin: '#e9b48a', hair: '#e8c35a', shirt: '#9a6fbf', pants: '#4a4466', shoes: '#3d2d3a', accent: '#e06a8a' },
  { name: 'Theo', style: 'beanie', skin: '#9b6446', hair: '#2b1e1c', shirt: '#e8b93f', pants: '#4f7f5c', overalls: true, shoes: '#3a2620', hat: '#c8503c', accent: '#f2ead6' },
  { name: 'Mabel', style: 'bun', skin: '#f0c7a3', hair: '#b9b2b8', shirt: '#b7a0d8', pants: '#4f6a4a', shoes: '#4a3a3a', accent: '#8a5aa8' },
  { name: 'Juno', style: 'short', skin: '#c68a62', hair: '#3f8f8a', shirt: '#e88a4a', pants: '#3a4a6a', shoes: '#2e2a3a', accent: '#f0d070' },
  // Villagers 7–12 (loaded from stardew-pack as palettes 6–11). They double as the staff roster (staff/roster.json).
  { name: 'Wren', style: 'short', skin: '#8a5a3c', hair: '#1f1a1c', shirt: '#4fa3a0', pants: '#6b4a34', overalls: true, shoes: '#3a2620', accent: '#f2d070' },
  { name: 'Pip', style: 'strawhat', skin: '#f6d2b0', hair: '#e8c35a', shirt: '#e07a9a', pants: '#5a8a4a', overalls: true, shoes: '#4a3a2a', hat: '#e9c46a', accent: '#5a8ac8' },
  { name: 'Sari', style: 'long', skin: '#d9a27a', hair: '#2b1e1c', shirt: '#c8503c', pants: '#34405e', shoes: '#2e2a3a', accent: '#f0c85a' },
  { name: 'Gus', style: 'beanie', skin: '#e8b48f', hair: '#8a8078', shirt: '#6a7fb0', pants: '#5a4a3a', shoes: '#3a2a22', hat: '#8a5a3a', accent: '#e8c04a' },
  { name: 'Iris', style: 'ponytail', skin: '#f0c7a3', hair: '#7a4ab0', shirt: '#f2ead6', pants: '#4f79b8', shoes: '#3d2d3a', accent: '#6ea84e' },
  { name: 'Bayu', style: 'short', skin: '#b87c55', hair: '#c05a2a', shirt: '#3f6fa8', pants: '#7a5a3a', overalls: true, shoes: '#2e2420', accent: '#e8e0c8' },
];
