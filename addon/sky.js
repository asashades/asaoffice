// asaoffice sky: a small pixel sky for the HUD's hero card, following the same clock and season as the office
// (daynight.js, garden.js): dawn, day, golden hour, dusk and night, with a square-pixel sun or moon crossing an arc like
// the Stardew clock dial, drifting clouds, twinkling stars and a strip of hills tinted by the season.
//   __asaoffice.sky.draw(canvas, hour, season)   canvas is meant to be small (120×40) and scaled up pixelated
(() => {
  'use strict';
  const ns = window.__asaoffice;
  // [hour, sky top rgb, sky bottom rgb, star strength 0–1, cloud rgb]
  const KEYS = [
    [0, [10, 14, 44], [28, 38, 88], 1, [60, 70, 110]],
    [4.5, [10, 14, 44], [28, 38, 88], 1, [60, 70, 110]],
    [6, [92, 104, 176], [250, 170, 140], 0.3, [255, 214, 200]],
    [7.5, [96, 170, 230], [196, 230, 250], 0, [255, 255, 255]],
    [16, [96, 170, 230], [196, 230, 250], 0, [255, 255, 255]],
    [17.5, [104, 132, 204], [250, 182, 112], 0, [255, 220, 176]],
    [18.6, [70, 60, 122], [214, 112, 122], 0.45, [230, 170, 190]],
    [19.6, [10, 14, 44], [28, 38, 88], 1, [60, 70, 110]],
    [24, [10, 14, 44], [28, 38, 88], 1, [60, 70, 110]],
  ];
  const HILLS = { spring: [96, 168, 80], summer: [72, 150, 64], fall: [196, 120, 52], winter: [226, 236, 244] };
  const mix = (a, b, t) => a + (b - a) * t;
  const mixRgb = (a, b, t) => a.map((v, i) => Math.round(mix(v, b[i], t)));
  const rgb = (c, k = 1) => `rgb(${c.map((v) => Math.round(v * k)).join(',')})`;

  function colors(hour) {
    for (let i = 0; i < KEYS.length - 1; i++) {
      const [h0, t0, b0, s0, c0] = KEYS[i];
      const [h1, t1, b1, s1, c1] = KEYS[i + 1];
      if (hour < h0 || hour > h1) continue;
      const t = (hour - h0) / (h1 - h0 || 1);
      return { top: mixRgb(t0, t1, t), bottom: mixRgb(b0, b1, t), stars: mix(s0, s1, t), cloud: mixRgb(c0, c1, t) };
    }
    return { top: KEYS[0][1], bottom: KEYS[0][2], stars: 1, cloud: KEYS[0][4] };
  }

  // Round-ish pixel discs (kept square-edged on purpose).
  const SUN = ['..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..'];
  const MOON = ['..XXX..', '.XXXX..', 'XXXX...', 'XXXX...', 'XXXX...', '.XXXX..', '..XXX..'];
  const CLOUD = ['..XXX....', '.XXXXXX..', 'XXXXXXXXX', '.XXXXXXX.'];
  const STARS = [[6, 4], [17, 9], [29, 5], [41, 11], [54, 4], [66, 8], [78, 3], [90, 10], [101, 5], [113, 9], [24, 14], [71, 14]];

  function sprite(ctx, rows, x, y, color) {
    ctx.fillStyle = color;
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'X') ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1); });
  }

  function draw(canvas, hour, season = 'spring') {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const c = colors(hour);
    const now = performance.now() / 1000;
    ctx.imageSmoothingEnabled = false;
    // Sky: horizontal bands, like old pixel skies.
    const BAND = 4;
    for (let y = 0; y < H; y += BAND) {
      ctx.fillStyle = rgb(mixRgb(c.top, c.bottom, Math.min(1, y / (H - 8))));
      ctx.fillRect(0, y, W, BAND);
    }
    // Stars
    if (c.stars > 0.05) {
      STARS.forEach(([x, y], i) => {
        const tw = 0.55 + 0.45 * Math.sin(now * 1.6 + i * 1.7);
        ctx.fillStyle = `rgba(255,248,214,${(c.stars * tw).toFixed(2)})`;
        ctx.fillRect(x % W, y, 1, 1);
      });
    }
    // Sun by day, moon by night, along an arc (the clock dial).
    const dayT = (hour - 6) / 12;
    const night = hour < 6 || hour >= 18;
    const nightT = ((hour < 6 ? hour + 24 : hour) - 18) / 12;
    const t = night ? nightT : dayT;
    if (t >= -0.02 && t <= 1.02) {
      const x = 6 + t * (W - 19);
      const y = H - 18 - Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * (H - 26);
      if (night) {
        sprite(ctx, MOON, x, y, 'rgb(244,240,205)');
        ctx.fillStyle = 'rgba(180,176,150,0.9)';
        ctx.fillRect(Math.round(x) + 1, Math.round(y) + 3, 1, 1);
      } else {
        const warm = hour < 7.5 || hour > 16.5;
        const col = warm ? [255, 170, 80] : [255, 224, 90];
        ctx.fillStyle = `rgba(${col.join(',')},0.35)`;
        ctx.fillRect(Math.round(x) - 1, Math.round(y) + 2, 9, 3);
        ctx.fillRect(Math.round(x) + 2, Math.round(y) - 1, 3, 9);
        sprite(ctx, SUN, x, y, rgb(col));
      }
    }
    // Clouds
    const cloudA = night ? 0.22 : 0.85;
    ctx.globalAlpha = cloudA;
    [[0, 8, 0.9], [46, 15, 0.6], [86, 5, 0.75]].forEach(([x0, y, speed]) => {
      const x = ((x0 + now * speed * 1.2) % (W + 20)) - 12;
      sprite(ctx, CLOUD, x, y, rgb(c.cloud));
    });
    ctx.globalAlpha = 1;
    // Hills, tinted by the season and the light.
    const dark = night ? 0.4 : hour < 7 || hour > 17.5 ? 0.75 : 1;
    const hill = HILLS[season] ?? HILLS.spring;
    ctx.fillStyle = rgb(hill, dark);
    for (let x = 0; x < W; x++) {
      const top = H - 6 - Math.round(2 + 2 * Math.sin(x / 9) + Math.sin(x / 4.3));
      ctx.fillRect(x, top, 1, H - top);
    }
    ctx.fillStyle = rgb(hill.map((v) => v * 0.8), dark);
    ctx.fillRect(0, H - 3, W, 3);
  }

  ns.sky = { draw };
})();
