// Render PNGs side by side at N× zoom on a checker background, for eyeballing sprites.
// usage: node tools/preview.mjs out.png scale file1.png [file2.png ...]
import { Sprite } from './lib/pixel.mjs';

const [out, scaleArg, ...files] = process.argv.slice(2);
const S = Number(scaleArg) || 4;
const imgs = files.map((f) => Sprite.load(f));
const pad = 4;
const W = Math.max(...imgs.map((i) => i.w)) * S + pad * 2;
const H = imgs.reduce((a, i) => a + i.h * S + pad, pad);
const o = new Sprite(W, H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) o.set(x, y, ((x >> 3) + (y >> 3)) % 2 ? [222, 214, 196, 255] : [206, 198, 180, 255]);
let y0 = pad;
for (const im of imgs) {
  for (let y = 0; y < im.h * S; y++)
    for (let x = 0; x < im.w * S; x++) {
      const c = im.get(Math.floor(x / S), Math.floor(y / S));
      if (c) o.set(pad + x, y0 + y, c);
    }
  y0 += im.h * S + pad;
}
o.save(out);
