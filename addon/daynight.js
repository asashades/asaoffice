// asaoffice day & night: the office follows your local clock. Mornings are rosy, afternoons turn golden,
// dusk goes purple and nights are blue-dark, with a starry sky and moon in the windows and warm light
// pooling around the lanterns, the flickering fireplace and the screens of villagers who are working.
// Drawn over pixel-agents' frame but under the add-ons that come after it (bubbles, badges, Holo-board).
//   ?dayNight=off|on (remembered)   console: __asaoffice.dayNight.preview(21.5) / .preview(null)
(() => {
  'use strict';
  const ns = window.__asaoffice;
  let enabled = ns.setting('dayNight', ['on', 'off'], 'on') === 'on';
  let previewHour = null;

  // [hour, tint rgb, tint alpha, light strength, sky rgb for the windows (null = keep the painted day sky)]
  const KEYS = [
    [0, [18, 24, 70], 0.55, 1, [14, 20, 52]],
    [4.5, [18, 24, 70], 0.55, 1, [14, 20, 52]],
    [6, [250, 150, 140], 0.16, 0.3, [242, 170, 150]],
    [7.5, [255, 255, 255], 0, 0, null],
    [16, [255, 255, 255], 0, 0, null],
    [17.5, [255, 150, 60], 0.18, 0.15, [250, 180, 110]],
    [18.6, [120, 70, 150], 0.32, 0.6, [150, 90, 150]],
    [19.6, [18, 24, 70], 0.55, 1, [14, 20, 52]],
    [24, [18, 24, 70], 0.55, 1, [14, 20, 52]],
  ];
  const mix = (a, b, t) => a + (b - a) * t;
  const mixRgb = (a, b, t) => a.map((v, i) => Math.round(mix(v, b[i], t)));

  function phase(hour) {
    for (let i = 0; i < KEYS.length - 1; i++) {
      const [h0, c0, a0, l0, s0] = KEYS[i];
      const [h1, c1, a1, l1, s1] = KEYS[i + 1];
      if (hour < h0 || hour > h1) continue;
      const t = (hour - h0) / (h1 - h0 || 1);
      const sky = s0 && s1 ? mixRgb(s0, s1, t) : s0 && !s1 ? s0 : s1 && !s0 ? s1 : null;
      const skyAlpha = s0 && s1 ? 1 : s0 ? 1 - t : s1 ? t : 0;
      return { tint: mixRgb(c0, c1, t), alpha: mix(a0, a1, t), light: mix(l0, l1, t), sky, skyAlpha };
    }
    return { tint: [255, 255, 255], alpha: 0, light: 0, sky: null, skyAlpha: 0 };
  }

  function glow(ctx, x, y, radius, rgb, strength) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${rgb.join(',')},${0.55 * strength})`);
    g.addColorStop(0.5, `rgba(${rgb.join(',')},${0.2 * strength})`);
    g.addColorStop(1, `rgba(${rgb.join(',')},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Fixed star positions inside a window's glass (sprite pixels), so they don't jump around.
  const STARS = [[8, 5], [11, 9], [13, 6], [18, 5], [20, 10], [23, 7], [10, 12], [22, 13]];

  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (!enabled || editMode) return;
    const now = new Date();
    const hour = previewHour ?? now.getHours() + now.getMinutes() / 60;
    const p = phase(hour);
    if (p.alpha < 0.01 && p.skyAlpha < 0.01) return;

    const layout = office.getLayout();
    const ctx = canvas.getContext('2d');
    const px = (v) => v * zoom;
    const t = performance.now() / 1000;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Window skies (before the tint, which then darkens the hills and frames too).
    if (p.sky) {
      for (const f of layout.furniture) {
        if (f.type !== 'COZY_WINDOW') continue;
        const x = offX + px(f.col * 16);
        const y = offY + px(f.row * 16);
        ctx.globalAlpha = p.skyAlpha;
        ctx.fillStyle = `rgb(${p.sky.join(',')})`;
        // Glass is x 7..24 between the curtains; paint each column down to its hill top (same curve as
        // window2x2 in tools/lib/furniture.mjs), skipping the mullions (x 15–16, y 12).
        for (let gx = 7; gx <= 24; gx++) {
          if (gx === 15 || gx === 16) continue;
          const hillTop = 22 - Math.round(3 + 2 * Math.sin(gx / 3.2)) - 3;
          ctx.fillRect(x + px(gx), y + px(4), px(1), px(8));
          ctx.fillRect(x + px(gx), y + px(13), px(1), px(Math.max(0, hillTop - 13)));
        }
        if (p.light > 0.6) {
          ctx.fillStyle = '#fff6d0';
          for (const [sx, sy] of STARS) {
            if (sx === 15 || sx === 16 || sy === 12) continue; // mullions
            ctx.globalAlpha = p.skyAlpha * (0.5 + 0.5 * Math.sin(t * 1.3 + sx * 7 + sy));
            ctx.fillRect(x + px(sx), y + px(sy), Math.max(1, px(1)), Math.max(1, px(1)));
          }
          ctx.globalAlpha = p.skyAlpha;
          ctx.fillStyle = '#f4f0d8';
          ctx.fillRect(x + px(21), y + px(5), px(3), px(3)); // moon
          ctx.fillStyle = `rgb(${p.sky.join(',')})`;
          ctx.fillRect(x + px(22), y + px(5), px(2), px(2));
        }
      }
      ctx.globalAlpha = 1;
    }

    // Tint everything already drawn (source-atop leaves the empty area around the room alone).
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(${p.tint.join(',')},${p.alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Warm light pools.
    if (p.light > 0.05) {
      const flicker = 0.85 + 0.1 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23);
      for (const f of layout.furniture) {
        const cx = offX + px(f.col * 16);
        const cy = offY + px(f.row * 16);
        if (f.type === 'COZY_LANTERN') glow(ctx, cx + px(8), cy + px(10), px(34), [255, 196, 110], p.light);
        else if (f.type === 'COZY_FIREPLACE') glow(ctx, cx + px(16), cy + px(24), px(56), [255, 150, 70], p.light * flicker);
        else if (f.type === 'COZY_WINDOW' && p.sky) glow(ctx, cx + px(16), cy + px(14), px(26), p.sky.map((v) => Math.min(255, v + 60)), p.light * 0.35);
      }
      // Screens light up the faces of villagers at work.
      for (const c of office.characters.values()) {
        if (!c.isActive || c.state !== 'type') continue;
        glow(ctx, offX + px(c.x), offY + px(c.y - 10), px(22), [170, 230, 255], p.light * 0.8);
      }
    }
    ctx.restore();
  });

  ns.dayNight = {
    /** Preview a time of day (0–24), or null to follow the clock again. */
    preview(hour) { previewHour = hour == null ? null : ((Number(hour) % 24) + 24) % 24; },
    setEnabled(on) { enabled = !!on; ns.store.set('dayNight', enabled ? 'on' : 'off'); },
    phase,
    /** The hour (0–24, fractional) the office is showing: the clock, or the previewed time. */
    hour: () => previewHour ?? (new Date().getHours() + new Date().getMinutes() / 60),
  };
})();
