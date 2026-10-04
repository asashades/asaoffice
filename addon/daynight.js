// asaoffice day & night: the office follows your local clock. Mornings are rosy, afternoons turn golden,
// dusk goes purple and nights are blue-dark, with a starry sky and moon in the windows and warm light
// pooling around the lanterns, the flickering fireplace and the screens of villagers who are working.
// Room lights: from dusk each room's ceiling light switches on while someone is in it (and goes out a couple of minutes after
// the last one left), the doorways between rooms take the light of the lit room beside them, the walls round a lit room catch a little of it, and a villager
// working at a desk gets a desk-lamp pool on it. ?roomLights=off turns those off.
// Drawn over pixel-agents' frame but under the add-ons that come after it (bubbles, badges, Holo-board).
//   ?dayNight=off|on (remembered)   console: __asaoffice.dayNight.preview(21.5) / .preview(null)
(() => {
  'use strict';
  const ns = window.__asaoffice;
  let enabled = ns.setting('dayNight', ['on', 'off'], 'on') === 'on';
  let previewHour = null;
  const roomLightsOn = ns.setting('roomLights', ['on', 'off'], 'on') === 'on';
  // 'stardew': the dark is multiplied in (colours keep their strength, shadows go indigo-purple), lit rooms glow amber, and light comes from things
  // (lanterns, fireplace, lamps, windows). 'classic': the older blue wash. ?nightStyle=classic|stardew (remembered).
  const stardew = ns.setting('nightStyle', ['stardew', 'classic'], 'stardew') === 'stardew';

  // The rooms of the bundled layout (33×24, tools/gen-layout.mjs): tile rectangles of floor, both ends included.
  const ROOMS = [
    { id: 'work', c0: 4, r0: 2, c1: 15, r1: 8 }, { id: 'meeting', c0: 17, r0: 2, c1: 23, r1: 8 }, { id: 'director', c0: 25, r0: 2, c1: 28, r1: 8 },
    { id: 'toilet', c0: 4, r0: 11, c1: 8, r1: 15 }, { id: 'pantry', c0: 10, r0: 11, c1: 13, r1: 15 },
    { id: 'breakout', c0: 14, r0: 11, c1: 22, r1: 15 }, { id: 'lounge', c0: 24, r0: 11, c1: 28, r1: 15 },
  ];
  // Ceiling-light colour per room (the toilet is a cooler tube, the lounge is cosy amber), and the doorways light spills through
  // (centre in tiles, and which way it points from `a` to `b`). `outside` only receives: the path in front of the front door.
  const LIGHT_RGB = {
    work: [255, 218, 160], meeting: [255, 224, 176], director: [255, 192, 118], toilet: [226, 236, 255],
    pantry: [255, 238, 205], breakout: [255, 208, 134], lounge: [255, 176, 100],
  };
  // Stardew style works like its own lighting: the picture is multiplied by a light map. The map is a deep magenta-purple (what the dark does to every
  // colour: the greens and blues of a floor drop away and wood turns wine-red), a lit room adds a crimson ambience, and lamps add warm yellow on top, so
  // floors near a lamp go from purple to wine to orange-pink. Measured on the Stardew screenshots: lit floors are hue ~340-0, saturation 0.6-0.9.
  const AMBIENT = {
    work: [255, 40, 115], meeting: [255, 55, 95], director: [255, 70, 65], toilet: [70, 150, 255],
    pantry: [255, 85, 70], breakout: [255, 45, 105], lounge: [255, 30, 80],
  };
  const LAMP_WARM = [255, 190, 80];
  const lightRgb = (id) => (stardew ? LAMP_WARM : LIGHT_RGB[id]);
  const OUTSIDE = { id: 'outside', c0: 14, r0: 18, c1: 18, r1: 22 };
  const DOORS = [
    { a: 'work', b: 'meeting', x: 16.5, y: 6.5, dx: 1, dy: 0 }, { a: 'meeting', b: 'director', x: 24.5, y: 7, dx: 1, dy: 0 },
    { a: 'work', b: 'breakout', x: 15, y: 10.5, dx: 0, dy: 1 }, { a: 'toilet', b: 'pantry', x: 9.5, y: 14, dx: 1, dy: 0 },
    { a: 'breakout', b: 'lounge', x: 23.5, y: 14, dx: 1, dy: 0 }, { a: 'breakout', b: 'outside', x: 16.5, y: 17, dx: 0, dy: 1 },
  ];
  // The doorway tiles between rooms (floor tiles that belong to no room): they take the light of whichever room beside them is lit,
  // so a passage is never a dark gap between two bright rooms.
  const DOORWAYS = [
    { a: 'work', b: 'meeting', c0: 16, r0: 5, c1: 16, r1: 7 }, { a: 'meeting', b: 'director', c0: 24, r0: 6, c1: 24, r1: 7 },
    { a: 'work', b: 'breakout', c0: 14, r0: 9, c1: 15, r1: 10 }, { a: 'toilet', b: 'pantry', c0: 9, r0: 13, c1: 9, r1: 14 },
    { a: 'breakout', b: 'lounge', c0: 23, r0: 13, c1: 23, r1: 14 }, { a: 'breakout', b: 'outside', c0: 15, r0: 16, c1: 17, r1: 17 },
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
  // The colour the picture is multiplied by, by hour (white = no change). Night is a deep indigo; dusk and dawn are warm.
  const MULS = [
    [0, [58, 20, 128]], [4.5, [58, 20, 128]], [6, [225, 130, 165]], [7.5, [255, 255, 255]],
    [16, [255, 255, 255]], [17.5, [255, 205, 150]], [18.6, [165, 85, 150]], [19.6, [64, 22, 128]], [24, [58, 20, 128]],
  ];
  function mulAt(hour) {
    for (let i = 0; i < MULS.length - 1; i++) {
      const [h0, c0] = MULS[i];
      const [h1, c1] = MULS[i + 1];
      if (hour >= h0 && hour <= h1) return mixRgb(c0, c1, (hour - h0) / (h1 - h0 || 1));
    }
    return [255, 255, 255];
  }
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

  // A soft pool of light: smooth falloff (no visible ring), optionally stretched into an ellipse (rx, ry) for door spill.
  function lightPool(ctx, x, y, radius, rgb, strength, rx = radius, ry = radius) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx / radius, ry / radius);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    const c = rgb.join(',');
    for (const [stop, k] of [[0, 1], [0.2, 0.74], [0.4, 0.46], [0.6, 0.22], [0.8, 0.07], [1, 0]]) g.addColorStop(stop, `rgba(${c},${(0.3 * strength * k).toFixed(4)})`);
    ctx.fillStyle = g;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
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

  // Stardew style: the picture is multiplied by a light map (an offscreen canvas of the same size: the darkness colour with the lights added to it).
  // The empty area round the room is kept transparent: the canvas is copied first and whatever was transparent is made transparent again.
  let copy = null;
  let lightMap = null;
  function lightMapCtx(canvas, rgb) {
    if (!lightMap || lightMap.width !== canvas.width || lightMap.height !== canvas.height) { lightMap = document.createElement('canvas'); lightMap.width = canvas.width; lightMap.height = canvas.height; }
    const l = lightMap.getContext('2d');
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalAlpha = 1;
    l.globalCompositeOperation = 'source-over';
    l.fillStyle = `rgb(${rgb.join(',')})`;
    l.fillRect(0, 0, lightMap.width, lightMap.height);
    return l;
  }
  function applyLightMap(ctx, canvas, l, vignette) {
    if (vignette > 0.01) { // the corners of the picture are a little darker
      const w = canvas.width, hgt = canvas.height;
      const g = l.createRadialGradient(w / 2, hgt / 2, Math.min(w, hgt) * 0.3, w / 2, hgt / 2, Math.hypot(w, hgt) * 0.55);
      const edge = Math.round(255 - 100 * vignette);
      g.addColorStop(0, 'rgb(255,255,255)');
      g.addColorStop(1, `rgb(${edge},${edge - 12},${Math.min(255, edge + 30)})`);
      l.globalCompositeOperation = 'multiply';
      l.fillStyle = g;
      l.fillRect(0, 0, w, hgt);
      l.globalCompositeOperation = 'source-over';
    }
    if (!copy || copy.width !== canvas.width || copy.height !== canvas.height) { copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height; }
    const c = copy.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'copy';
    c.drawImage(canvas, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lightMap, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(copy, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
  }

  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (!enabled || editMode || !canvas.width || !canvas.height) return; // (a hidden or not yet sized canvas has nothing to draw on)
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
    if (!stardew) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(${p.tint.join(',')},${p.alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // Everything below draws light. Classic paints it onto the picture; stardew draws it into a light map that multiplies the picture afterwards.
    const lctx = stardew ? lightMapCtx(canvas, mulAt(hour)) : ctx;

    // Room lights: the ceiling light of every occupied room (soft pools that add light, clipped to the room), and a desk lamp
    // on each desk where someone is working. Dusk brings them in gradually (p.light is 0 by day and 1 at night).
    const lamps = roomLightsOn && layout.cols === 33 && layout.rows === 24;
    const ceil = Math.min(1, p.light * 1.4);
    if (lamps) {
      const nowMs = performance.now();
      const dt = lastFrame ? Math.min(250, nowMs - lastFrame) : 0;
      lastFrame = nowMs;
      const people = [...office.characters.values()].filter((c) => c.matrixEffect !== 'despawn' && !c.isGreeter && c.tileCol != null);
      const rect = new Map();
      for (const room of ROOMS) {
        rect.set(room.id, room);
        if (people.some((c) => c.tileCol >= room.c0 && c.tileCol <= room.c1 && c.tileRow >= room.r0 && c.tileRow <= room.r1)) seen.set(room.id, nowMs);
        const want = nowMs - (seen.get(room.id) ?? -Infinity) < HOLD_MS ? 1 : 0;
        const cur = levels.get(room.id) ?? (seen.has(room.id) ? want : 0);
        levels.set(room.id, want > cur ? Math.min(want, cur + dt / FADE_IN_MS) : Math.max(want, cur - dt / FADE_OUT_MS));
      }
      rect.set(OUTSIDE.id, OUTSIDE);
      const clipTo = (r) => { lctx.beginPath(); lctx.rect(offX + px(r.c0 * 16), offY + px(r.r0 * 16), px((r.c1 - r.c0 + 1) * 16), px((r.r1 - r.r0 + 1) * 16)); lctx.clip(); };
      // An empty room is darker than a lit one: walls separate them, so the edge reads as a wall, not a seam.
      for (const room of stardew ? [] : ROOMS) {
        const dark = (1 - levels.get(room.id)) * ceil;
        if (dark < 0.02) continue;
        lctx.fillStyle = `rgba(6,10,36,${0.3 * dark})`;
        lctx.fillRect(offX + px(room.c0 * 16), offY + px(room.r0 * 16), px((room.c1 - room.c0 + 1) * 16), px((room.r1 - room.r0 + 1) * 16));
      }
      lctx.globalCompositeOperation = 'lighter';
      // Stardew: a lit room is warm all over (amber from the middle, a little less at the walls), an empty one stays a dark purple.
      if (stardew) {
        for (const room of ROOMS) {
          const lvl = levels.get(room.id) * ceil;
          if (lvl < 0.02) continue;
          const rx = offX + px(room.c0 * 16), ry = offY + px(room.r0 * 16), rw = px((room.c1 - room.c0 + 1) * 16), rh = px((room.r1 - room.r0 + 1) * 16);
          const amb = AMBIENT[room.id] ?? [255, 160, 80];
          const g = lctx.createRadialGradient(rx + rw / 2, ry + rh / 2, 0, rx + rw / 2, ry + rh / 2, Math.hypot(rw, rh) * 0.55);
          g.addColorStop(0, `rgba(${amb.join(',')},${(0.34 * lvl).toFixed(3)})`);
          g.addColorStop(1, `rgba(${amb.join(',')},${(0.22 * lvl).toFixed(3)})`);
          lctx.fillStyle = g;
          lctx.fillRect(rx, ry, rw, rh);
        }
      }
      // Ceiling lights: a few soft pools per room, each with its own switch-on delay, a slight breathing and no hard edge.
      ROOMS.forEach((room, ri) => {
        const lvl = levels.get(room.id) * ceil;
        if (lvl < 0.02) return;
        const cols = Math.max(1, Math.round((room.c1 - room.c0 + 1) / 5));
        const rows = room.r1 - room.r0 + 1 >= 6 ? 2 : 1;
        const sx = ((room.c1 - room.c0 + 1) * 16) / cols;
        const sy = ((room.r1 - room.r0 + 1) * 16) / rows;
        lctx.save();
        clipTo(room);
        for (let k = 0; k < cols * rows; k++) {
          const delay = ((k * 0.37 + ri * 0.21) % 1) * 0.4;
          const on = Math.min(1, Math.max(0, (levels.get(room.id) - delay) / (1 - delay))) * ceil;
          if (on < 0.02) continue;
          const breath = 1 + 0.03 * Math.sin(t * 1.7 + k * 2.1 + ri);
          const lx = room.c0 * 16 + sx * ((k % cols) + 0.5);
          const ly = room.r0 * 16 + sy * (Math.floor(k / cols) + 0.5);
          lightPool(lctx, offX + px(lx), offY + px(ly), px(Math.max(sx, sy) * 0.85), lightRgb(room.id), (stardew ? 1.5 : 1.25) * on * breath);
        }
        lctx.restore();
        // The walls round the room catch some of that light too (the tall wall faces: two rows above and below, one tile at the sides),
        // so a lit room doesn't end in a black outline.
        lctx.save();
        lctx.beginPath();
        lctx.rect(offX + px((room.c0 - 1) * 16), offY + px((room.r0 - 2) * 16), px((room.c1 - room.c0 + 3) * 16), px((room.r1 - room.r0 + 5) * 16));
        lctx.rect(offX + px(room.c0 * 16), offY + px(room.r0 * 16), px((room.c1 - room.c0 + 1) * 16), px((room.r1 - room.r0 + 1) * 16));
        lctx.clip('evenodd');
        for (let k = 0; k < cols * rows; k++) {
          const on = Math.min(1, Math.max(0, (levels.get(room.id) - ((k * 0.37 + ri * 0.21) % 1) * 0.4) / (1 - ((k * 0.37 + ri * 0.21) % 1) * 0.4))) * ceil;
          if (on < 0.02) continue;
          const lx = room.c0 * 16 + sx * ((k % cols) + 0.5);
          const ly = room.r0 * 16 + sy * (Math.floor(k / cols) + 0.5);
          lightPool(lctx, offX + px(lx), offY + px(ly), px(Math.max(sx, sy) * 1.5), lightRgb(room.id), 0.55 * on);
        }
        lctx.restore();
      });
      // Light spilling through the doorways into whatever is next door (the front door lights the path outside).
      for (const d of DOORS) {
        for (const [from, to, sgn] of [[d.a, d.b, 1], [d.b, d.a, -1]]) {
          const lvl = (levels.get(from) ?? 0) * ceil;
          if (lvl < 0.02 || (to === 'outside' && sgn < 0)) continue;
          lctx.save();
          clipTo(rect.get(to));
          const cx = offX + px((d.x + sgn * d.dx * 0.9) * 16);
          const cy = offY + px((d.y + sgn * d.dy * 0.9) * 16);
          const long = px(54), wide = px(26);
          lightPool(lctx, cx, cy, 1, lightRgb(from), 0.7 * lvl, d.dx ? long : wide, d.dx ? wide : long);
          lctx.restore();
        }
      }
      // Doorways: lit by the brighter of the two rooms they join (the front door only by the breakout room), in that room's colour.
      for (const d of DOORWAYS) {
        const la = (levels.get(d.a) ?? 0) * ceil;
        const lb = d.b === 'outside' ? 0 : (levels.get(d.b) ?? 0) * ceil;
        const lvl = Math.max(la, lb);
        if (lvl < 0.02) continue;
        const rgb = lightRgb(la >= lb ? d.a : d.b);
        const w = (d.c1 - d.c0 + 1) * 16, hgt = (d.r1 - d.r0 + 1) * 16;
        lctx.save();
        clipTo(d);
        lightPool(lctx, offX + px(d.c0 * 16 + w / 2), offY + px(d.r0 * 16 + hgt / 2), px(Math.max(w, hgt) * 1.1 + 14), rgb, 0.7 * lvl);
        lctx.restore();
      }
      lctx.globalCompositeOperation = 'source-atop';
    }

    // Warm light pools.
    if (p.light > 0.05) {
      if (stardew) lctx.globalCompositeOperation = 'lighter'; // light adds to the dark picture instead of painting over it
      const flicker = 0.85 + 0.1 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23);
      for (const f of layout.furniture) {
        const cx = offX + px(f.col * 16);
        const cy = offY + px(f.row * 16);
        if (f.type === 'COZY_LANTERN') glow(lctx, cx + px(8), cy + px(10), px(34), [255, 196, 110], p.light);
        else if (f.type === 'COZY_FIREPLACE') glow(lctx, cx + px(16), cy + px(24), px(56), [255, 150, 70], p.light * flicker);
        else if (f.type === 'COZY_WINDOW' && p.sky) glow(lctx, cx + px(16), cy + px(14), px(26), p.sky.map((v) => Math.min(255, v + 60)), p.light * 0.35);
      }
      // Screens light up the faces of villagers at work.
      for (const c of office.characters.values()) {
        if (!c.isActive || c.state !== 'type') continue;
        glow(lctx, offX + px(c.x), offY + px(c.y - 12), px(14), [170, 220, 255], p.light * (stardew ? 0.22 : 0.3)); // a small cool light on the face, not a haze round the whole villager
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
        lctx.globalCompositeOperation = 'lighter';
        for (const d of lit) {
          const dx = offX + px(d.x), dy = offY + px(d.y);
          lightPool(lctx, dx, dy, px(30), [255, 196, 100], 0.55 * sat, px(34), px(24)); // the wider warm pool on the floor around the desk
          lightPool(lctx, dx, dy - px(2), px(11), [255, 238, 176], 0.9 * sat); // the bright spot right under the lamp
        }
      }
    }
    if (stardew) applyLightMap(ctx, canvas, lctx, Math.min(1, p.light));

    // Villagers stay in front of the dark: each one is drawn once more over the night picture, strongly where the room is lit and faintly where
    // it isn't, so they never look like they are standing in fog. (pixel-agents' own sprite drawing is reused, so it matches exactly.)
    const drawObjects = ns.view?.drawObjects;
    if (stardew && lamps && typeof drawObjects === 'function') {
      ctx.globalCompositeOperation = 'source-over';
      const roomOf = (c) => ROOMS.find((r) => c.tileCol >= r.c0 && c.tileCol <= r.c1 && c.tileRow >= r.r0 && c.tileRow <= r.r1);
      for (const c of office.getCharacters()) {
        if (c.matrixEffect || c.tileCol == null) continue;
        const room = roomOf(c);
        const lit = room ? (levels.get(room.id) ?? 0) * ceil : 0;
        ctx.globalAlpha = Math.min(0.72, (0.3 + 0.42 * lit) * Math.min(1, p.light * 1.3));
        try { drawObjects(ctx, [], [c], offX, offY, zoom, null, null, []); } catch { break; }
      }
      ctx.globalAlpha = 1;
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
