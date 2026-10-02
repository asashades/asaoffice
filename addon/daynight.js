// asaoffice day & night: the office follows your local clock. Mornings are rosy, afternoons turn golden,
// dusk goes purple and nights are blue-dark, with a starry sky and moon in the windows and warm light
// pooling around the lanterns, the flickering fireplace and the screens of villagers who are working.
// Room lights: from dusk each room's ceiling light switches on while someone is in it (and goes out a couple of minutes after
// the last one left), and a villager working at a desk gets a desk-lamp pool on it. ?roomLights=off turns those off.
// Drawn over pixel-agents' frame but under the add-ons that come after it (bubbles, badges, Holo-board).
//   ?dayNight=off|on (remembered)   console: __asaoffice.dayNight.preview(21.5) / .preview(null)
(() => {
  'use strict';
  const ns = window.__asaoffice;
  let enabled = ns.setting('dayNight', ['on', 'off'], 'on') === 'on';
  let previewHour = null;
  const roomLightsOn = ns.setting('roomLights', ['on', 'off'], 'on') === 'on';

  // The rooms of the bundled layout (33×24, tools/gen-layout.mjs): tile rectangles of floor, both ends included.
  const ROOMS = [
    { id: 'work', c0: 4, r0: 2, c1: 15, r1: 8 }, { id: 'meeting', c0: 17, r0: 2, c1: 23, r1: 8 }, { id: 'director', c0: 25, r0: 2, c1: 28, r1: 8 },
    { id: 'toilet', c0: 4, r0: 11, c1: 8, r1: 15 }, { id: 'pantry', c0: 10, r0: 11, c1: 13, r1: 15 },
    { id: 'breakout', c0: 14, r0: 11, c1: 22, r1: 15 }, { id: 'lounge', c0: 24, r0: 11, c1: 28, r1: 15 },
  ];
  const HOLD_MS = 120_000; // a room stays lit this long after the last person left
  const FADE_IN_MS = 1200;
  const FADE_OUT_MS = 6000;
  const DESKS = { COZY_DESK_FRONT: [3, 2], COZY_DESK_SIDE: [1, 4], COZY_EXEC_DESK_FRONT: [3, 2], COZY_EXEC_DESK_SIDE: [1, 4] };
  const levels = new Map(); // room id -> 0..1
  const seen = new Map(); // room id -> when someone was last in it
  let lastFrame = 0;

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

    // Room lights: the ceiling light of every occupied room (soft pools that add light, clipped to the room), and a desk lamp
    // on each desk where someone is working. Dusk brings them in gradually (p.light is 0 by day and 1 at night).
    const lamps = roomLightsOn && layout.cols === 33 && layout.rows === 24;
    const ceil = Math.min(1, p.light * 1.4);
    if (lamps) {
      const nowMs = performance.now();
      const dt = lastFrame ? Math.min(250, nowMs - lastFrame) : 0;
      lastFrame = nowMs;
      const people = [...office.characters.values()].filter((c) => c.matrixEffect !== 'despawn' && !c.isGreeter && c.tileCol != null);
      for (const room of ROOMS) {
        if (people.some((c) => c.tileCol >= room.c0 && c.tileCol <= room.c1 && c.tileRow >= room.r0 && c.tileRow <= room.r1)) seen.set(room.id, nowMs);
        const want = nowMs - (seen.get(room.id) ?? -Infinity) < HOLD_MS ? 1 : 0;
        const cur = levels.get(room.id) ?? (seen.has(room.id) ? want : 0);
        levels.set(room.id, want > cur ? Math.min(want, cur + dt / FADE_IN_MS) : Math.max(want, cur - dt / FADE_OUT_MS));
        const a = levels.get(room.id) * ceil;
        if (a < 0.02) continue;
        const x0 = offX + px(room.c0 * 16);
        const y0 = offY + px(room.r0 * 16);
        const w = px((room.c1 - room.c0 + 1) * 16);
        const hh = px((room.r1 - room.r0 + 1) * 16);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, w, hh);
        ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,206,130,${0.07 * a})`;
        ctx.fillRect(x0, y0, w, hh);
        const lights = Math.max(1, Math.round((room.c1 - room.c0 + 1) / 5)); // one pool per ~5 tiles of width
        for (let k = 0; k < lights; k++) glow(ctx, x0 + (w * (k + 0.5)) / lights, y0 + hh * 0.5, Math.max(hh * 0.62, w / lights * 0.7), [255, 206, 130], 0.5 * a);
        ctx.restore();
      }
    }

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
      // Desk lamps: the desk each working villager sits at.
      if (lamps) {
        const desks = layout.furniture.filter((f) => DESKS[f.type]).map((f) => ({ x: (f.col + DESKS[f.type][0] / 2) * 16, y: (f.row + DESKS[f.type][1] / 2) * 16 }));
        const lit = new Set();
        for (const c of office.characters.values()) {
          if (!c.isActive || c.state !== 'type' || c.isSubagent) continue;
          let best = null;
          for (const d of desks) { const dist = Math.hypot(d.x - c.x, d.y - c.y); if (dist < 40 && (!best || dist < best.dist)) best = { d, dist }; }
          if (best) lit.add(best.d);
        }
        const sat = Math.min(1, p.light * 1.6);
        ctx.globalCompositeOperation = 'lighter';
        for (const d of lit) glow(ctx, offX + px(d.x), offY + px(d.y), px(24), [255, 214, 140], 0.55 * sat);
      }
    }
    ctx.restore();
  });

  ns.dayNight = {
    /** Preview a time of day (0–24), or null to follow the clock again. */
    preview(hour) { previewHour = hour == null ? null : ((Number(hour) % 24) + 24) % 24; },
    setEnabled(on) { enabled = !!on; ns.store.set('dayNight', enabled ? 'on' : 'off'); },
    phase,
    /** Light level (0–1) of each room right now, for tests and curiosity. */
    rooms: () => Object.fromEntries([...levels].map(([k, v]) => [k, Math.round(v * 100) / 100])),
    /** The hour (0–24, fractional) the office is showing: the clock, or the previewed time. */
    hour: () => previewHour ?? (new Date().getHours() + new Date().getMinutes() / 60),
  };
})();
