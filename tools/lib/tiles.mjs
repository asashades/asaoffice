// Grayscale floor + wall textures. pixel-agents colorizes these at runtime from the
// Layout editor's HSL/contrast controls, so they only carry luminance.
import { Sprite, gray, rng } from './pixel.mjs';

const N = 16;

function tile(fn) {
  const s = new Sprite(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) s.set(x, y, gray(Math.max(0, Math.min(255, Math.round(fn(x, y))))));
  return s;
}

function noise(seed) {
  const r = rng(seed);
  const t = Array.from({ length: N * N }, () => r());
  return (x, y) => t[((y + N) % N) * N + ((x + N) % N)];
}

export const FLOORS = [
  // 0 — wide farmhouse planks (horizontal), staggered joints
  () => {
    const n = noise(1);
    return tile((x, y) => {
      const row = Math.floor(y / 4);
      if (y % 4 === 3) return 112;
      const joint = (row * 7 + 3) % N;
      if (x === joint) return 128;
      const grain = Math.sin((x + row * 5) * 0.9) > 0.85 ? -14 : 0;
      return 170 + (y % 4 === 0 ? 14 : 0) + grain + (n(x, y) - 0.5) * 10;
    });
  },
  // 1 — narrow planks (vertical)
  () => {
    const n = noise(2);
    return tile((x, y) => {
      const col = Math.floor(x / 4);
      if (x % 4 === 3) return 112;
      if (y === (col * 11 + 5) % N) return 128;
      return 166 + (x % 4 === 0 ? 14 : 0) + (n(x, y) - 0.5) * 12;
    });
  },
  // 2 — parquet basket-weave
  () =>
    tile((x, y) => {
      const q = (Math.floor(x / 8) + Math.floor(y / 8)) % 2;
      const a = q ? x % 8 : y % 8;
      if (a === 3 || a === 7) return 116;
      return (q ? 176 : 156) + (a === 0 || a === 4 ? 12 : 0);
    }),
  // 3 — flagstones
  () => {
    const n = noise(4);
    return tile((x, y) => {
      const grout =
        y === 0 || x === 0 || y === 9 || (x === 6 && y < 9) || (x === 11 && y > 9) || (x === 3 && y > 9) || (x === 13 && y < 9);
      if (grout) return 100;
      return 160 + (n(x, y) - 0.5) * 26 + ((x + y) % 7 === 0 ? 10 : 0);
    });
  },
  // 4 — cobbles
  () => {
    const n = noise(5);
    const centers = [
      [3, 3],
      [11, 2],
      [7, 8],
      [1, 11],
      [14, 10],
      [5, 14],
      [12, 15],
    ];
    return tile((x, y) => {
      let best = 99;
      let second = 99;
      for (const [cx, cy] of centers)
        for (const ox of [-16, 0, 16])
          for (const oy of [-16, 0, 16]) {
            const d = Math.hypot(x - cx - ox, y - cy - oy);
            if (d < best) {
              second = best;
              best = d;
            } else if (d < second) second = d;
          }
      if (second - best < 1.2) return 96;
      return 150 + (n(x, y) - 0.5) * 20 - best * 3 + 18;
    });
  },
  // 5 — kitchen checker tiles
  () => tile((x, y) => ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? 196 : 140) + (x % 8 === 0 || y % 8 === 0 ? -18 : 0)),
  // 6 — meadow grass (outside): tufts and short blades
  () => {
    const n = noise(21);
    const blade = (x, y) => {
      const h = (x * 73 + y * 151 + 13) % 29;
      return h === 0 ? 26 : h === 7 ? -22 : h === 14 && y % 2 === 0 ? 14 : 0;
    };
    return tile((x, y) => 150 + (n(x, y) - 0.5) * 20 + blade(x, y) + (((x >> 2) + (y >> 2)) % 3 === 0 ? -6 : 0));
  },
  // 7 — tilled soil (the vegetable patch): ridges and clods
  () => {
    const n = noise(33);
    return tile((x, y) => {
      const ridge = y % 5;
      const base = ridge === 0 ? 146 : ridge === 1 ? 128 : ridge === 4 ? 96 : 116;
      return base + (n(x, y) - 0.5) * 22 + ((x * 5 + y * 3) % 13 === 0 ? 12 : 0);
    });
  },
  // 8 — soft rug weave (for lounge corners)
  () => {
    const n = noise(9);
    return tile((x, y) => 172 + ((x + y) % 4 === 0 ? -16 : 0) + ((x - y + 16) % 8 === 0 ? 12 : 0) + (n(x, y) - 0.5) * 8);
  },
];

/**
 * Re-texture the bundled wall sheet (64×128, 16 auto-tile pieces of 16×32) while keeping its
 * exact silhouette: top faces become a wooden trim, front faces become wallpaper over wainscoting.
 */
export function reskinWall(src) {
  const out = new Sprite(src.w, src.h);
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (!c) continue;
      const lx = x % 16;
      const ly = y % 32;
      const v = c[0];
      let g;
      if (v < 100) g = 64; // border/outline
      else if (v < 230) {
        // top face → wooden beam/trim with plank lines
        g = 150 + (lx % 5 === 0 ? -22 : 0) + (ly % 8 === 0 ? 10 : 0);
      } else if (ly < 22) {
        // wallpaper: soft vertical stripes with tiny flower dots
        const stripe = lx % 4 < 2 ? 214 : 200;
        const dot = (lx % 8 === 5 && ly % 6 === 2) || (lx % 8 === 1 && ly % 6 === 5);
        g = ly === 21 ? 150 : ly === 20 ? 176 : dot ? 170 : stripe;
      } else {
        // wainscoting panels
        g = ly === 22 ? 190 : lx % 8 === 0 ? 132 : ly === 30 ? 130 : 168;
      }
      out.set(x, y, gray(g));
    }
  return out;
}
