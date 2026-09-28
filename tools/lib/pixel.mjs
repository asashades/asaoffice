// Tiny pixel-art toolkit: RGBA sprites, ASCII templates, auto-outline, PNG I/O.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

export function hex(h) {
  const v = h.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16), 255];
}

export function toHex([r, g, b]) {
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

/** Multiply RGB towards black (f < 1) or white (f > 1), nudging hue warm like hand-shaded pixel art. */
export function shade(c, f) {
  const [r, g, b, a] = typeof c === 'string' ? hex(c) : c;
  if (f <= 1) {
    // darker + slightly redder/purpler shadows (Stardew-style warm shading)
    return [Math.round(r * f + 6 * (1 - f)), Math.round(g * f * 0.97), Math.round(b * f + 18 * (1 - f)), a ?? 255].map(
      (n) => Math.max(0, Math.min(255, n)),
    );
  }
  const t = f - 1;
  return [r + (255 - r) * t, g + (255 - g) * t, b + (230 - b) * t, a ?? 255].map((n) =>
    Math.max(0, Math.min(255, Math.round(n))),
  );
}

export function gray(v) {
  return [v, v, v, 255];
}

export class Sprite {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null);
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x];
  }

  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.px[y * this.w + x] = c === null ? null : typeof c === 'string' ? hex(c) : c;
    return this;
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  hline(x, y, w, c) {
    return this.rect(x, y, w, 1, c);
  }

  vline(x, y, h, c) {
    return this.rect(x, y, 1, h, c);
  }

  /**
   * Stamp an ASCII template. `pal` maps chars → colour (string/array) or null (erase).
   * '.' and ' ' are always "leave as is".
   */
  stamp(rows, pal, ox = 0, oy = 0) {
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch === '.' || ch === ' ') return;
        if (ch === '_') return this.set(ox + x, oy + y, null);
        if (!(ch in pal)) throw new Error(`template char '${ch}' has no palette entry`);
        const c = pal[ch];
        if (c === undefined) return;
        this.set(ox + x, oy + y, c);
      });
    });
    return this;
  }

  blit(src, ox, oy) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y);
        if (c) this.set(ox + x, oy + y, c);
      }
    return this;
  }

  flipX() {
    const s = new Sprite(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) s.px[y * this.w + x] = this.get(this.w - 1 - x, y);
    return s;
  }

  /**
   * Sel-out: every empty pixel touching a filled one (4-neighbour) becomes a dark,
   * hue-tinted version of that neighbour instead of flat black.
   */
  outline(strength = 0.38, fixed = null) {
    const add = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        const n = this.get(x, y + 1) || this.get(x, y - 1) || this.get(x - 1, y) || this.get(x + 1, y);
        if (n) add.push([x, y, fixed ? hex(fixed) : shade(n, strength)]);
      }
    for (const [x, y, c] of add) this.set(x, y, c);
    return this;
  }

  toPNG() {
    const png = new PNG({ width: this.w, height: this.h });
    this.px.forEach((c, i) => {
      const [r, g, b, a] = c ?? [0, 0, 0, 0];
      png.data[i * 4] = r;
      png.data[i * 4 + 1] = g;
      png.data[i * 4 + 2] = b;
      png.data[i * 4 + 3] = c ? a : 0;
    });
    return PNG.sync.write(png);
  }

  save(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, this.toPNG());
    return this;
  }

  static load(file) {
    const png = PNG.sync.read(fs.readFileSync(file));
    const s = new Sprite(png.width, png.height);
    for (let i = 0; i < png.width * png.height; i++) {
      const a = png.data[i * 4 + 3];
      if (a > 2) s.px[i] = [png.data[i * 4], png.data[i * 4 + 1], png.data[i * 4 + 2], a];
    }
    return s;
  }
}

/** Deterministic PRNG so regenerating assets is byte-stable. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
