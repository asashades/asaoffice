// asaoffice garden: the outside comes alive.
//   - The vegetable beds grow with your day streak: the first plant is sown on day 1 of a streak, and every plant
//     sprouts, grows and ripens over the following days (carrots, tomatoes and cabbages). A broken streak clears the beds.
//   - The season follows the real date (or ?season=spring|summer|fall|winter): a soft tint over the garden, plus
//     drifting petals (spring), autumn leaves, or snow (winter).
//   ?garden=off turns it off (remembered).
(() => {
  'use strict';
  const ns = window.__asaoffice;
  if (ns.setting('garden', ['on', 'off'], 'on') === 'off') return;
  const SEASONS = ['winter', 'spring', 'summer', 'fall'];
  const seasonSetting = ns.setting('season', ['auto', ...SEASONS], 'auto');
  const season = () => (seasonSetting !== 'auto' ? seasonSetting : SEASONS[Math.floor(((new Date().getMonth() + 1) % 12) / 3)]);
  const TINT = { winter: 'rgba(205,222,245,0.22)', spring: 'rgba(255,190,220,0.07)', summer: 'rgba(255,225,120,0.05)', fall: 'rgba(214,120,30,0.13)' };
  const FLAKE = { winter: ['#ffffff', '#e6f0fa'], spring: ['#f6a6c4', '#ffd0e0', '#ffffff'], fall: ['#d8641c', '#b8481c', '#e8a020', '#8a4a1c'] };
  const SOIL = 8;
  const GRASS = 7;
  const FLAG = 4;
  const PARTICLES = 30;

  // ── Where things are, from the layout's tiles ──
  let cache = { key: '', soil: [], outdoor: [] };
  function scan(office) {
    const layout = office.getLayout();
    const key = `${layout.cols}x${layout.rows}:${layout.layoutRevision ?? 0}`;
    if (cache.key === key) return cache;
    const soil = [];
    const outdoor = [];
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const t = layout.tiles[r * layout.cols + c];
        if (t === SOIL) soil.push({ col: c, row: r });
        if (t === SOIL || t === GRASS || (t === FLAG && r >= 22)) outdoor.push({ col: c, row: r });
      }
    }
    soil.sort((a, b) => a.col - b.col || a.row - b.row); // plants fill the beds column by column, left to right
    cache = { key, soil, outdoor };
    return cache;
  }

  // ── Crops (pixels drawn on the canvas; 16×16 tile) ──
  const KINDS = ['carrot', 'tomato', 'cabbage'];
  function crop(ctx, x, y, u, kind, stage) {
    const px = (cx, cy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + cx * u, y + cy * u, w * u, h * u); };
    const G = '#5a9a3a';
    const L = '#8cc45a';
    px(5, 13, 6, 1, 'rgba(60,35,20,0.35)'); // a little shadow in the furrow
    if (stage === 1) {
      px(7, 11, 2, 2, G);
      px(6, 10, 1, 1, L);
      px(9, 10, 1, 1, L);
    } else if (stage === 2) {
      px(8, 8, 1, 5, G);
      px(5, 8, 3, 2, L);
      px(9, 7, 3, 2, L);
      px(6, 10, 2, 1, G);
    } else if (stage === 3) {
      px(8, 5, 1, 8, G);
      px(4, 7, 4, 2, L);
      px(9, 6, 4, 2, L);
      px(5, 10, 3, 2, G);
      px(9, 9, 3, 2, G);
      if (kind === 'tomato') px(7, 9, 2, 2, '#e8b83a');
      if (kind === 'carrot') px(7, 12, 2, 1, '#e8843a');
      if (kind === 'cabbage') { px(6, 9, 5, 4, L); px(7, 9, 3, 1, '#cfe8a0'); }
    } else {
      if (kind === 'carrot') {
        px(6, 3, 1, 6, G); px(8, 2, 1, 7, G); px(10, 3, 1, 6, G);
        px(5, 4, 2, 2, L); px(9, 3, 2, 2, L); px(11, 5, 1, 2, L);
        px(6, 9, 5, 3, '#e8843a'); px(7, 12, 3, 1, '#c8641a');
      } else if (kind === 'tomato') {
        px(8, 3, 1, 9, G);
        px(4, 5, 4, 3, L); px(9, 4, 4, 3, L); px(5, 9, 3, 2, G);
        for (const [cx, cy] of [[5, 8], [10, 7], [7, 11], [11, 10]]) { px(cx, cy, 3, 3, '#d8382c'); px(cx, cy, 1, 1, '#f08a7c'); }
      } else {
        px(4, 6, 8, 7, G); px(5, 5, 6, 8, L); px(6, 6, 4, 6, '#b8dc84'); px(7, 7, 2, 4, '#dff0b8'); px(4, 12, 8, 1, '#3f7a2a');
      }
    }
  }
  const stageOf = (daysSinceSown) => (daysSinceSown <= 0 ? 1 : daysSinceSown <= 2 ? 2 : daysSinceSown <= 4 ? 3 : 4);

  // ── Falling petals, leaves and snow ──
  const flakes = Array.from({ length: PARTICLES }, () => ({ x: 0, y: 0, vy: 0, sw: 0, ph: 0, c: 0, life: -1 }));
  function respawn(f, outdoor, fresh) {
    const t = outdoor[Math.floor(Math.random() * outdoor.length)];
    f.x = t.col * 16 + Math.random() * 16;
    f.y = t.row * 16 + (fresh ? Math.random() * 16 : -Math.random() * 12);
    f.vy = 6 + Math.random() * 9;
    f.sw = 2 + Math.random() * 4;
    f.ph = Math.random() * 6.28;
    f.c = Math.floor(Math.random() * 4);
    f.life = 16 + Math.random() * 30; // world px it falls before it's gone
  }

  let last = 0;
  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (!office?.getLayout || editMode) return;
    const { soil, outdoor } = scan(office);
    if (!outdoor.length) return;
    const now = performance.now();
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const u = Math.max(1, Math.round(zoom));
    const sea = season();

    // Vegetable beds, by streak
    const stats = ns.data?.stats;
    const streak = stats ? stats.streak : 0;
    const busy = new Set([...office.characters.values()].map((c) => `${c.tileCol},${c.tileRow}`));
    soil.forEach((t, i) => {
      const since = streak - i - 1; // plant i is sown on day i + 1 of the streak
      if (streak <= 0 || since < 0 || busy.has(`${t.col},${t.row}`)) return;
      crop(ctx, Math.round(offX + t.col * 16 * zoom), Math.round(offY + t.row * 16 * zoom), zoom, KINDS[i % KINDS.length], stageOf(since));
    });

    // Season tint over the garden
    if (TINT[sea]) {
      ctx.fillStyle = TINT[sea];
      for (const t of outdoor) ctx.fillRect(Math.floor(offX + t.col * 16 * zoom), Math.floor(offY + t.row * 16 * zoom), Math.ceil(16 * zoom), Math.ceil(16 * zoom));
    }

    // Drifting bits
    const pal = FLAKE[sea];
    if (pal) {
      const size = sea === 'winter' ? u : 2 * u;
      for (const f of flakes) {
        if (f.life < 0) respawn(f, outdoor, true);
        f.y += f.vy * dt;
        f.life -= f.vy * dt;
        if (f.life <= 0) respawn(f, outdoor, false);
        const x = f.x + Math.sin(now / 900 + f.ph) * f.sw;
        ctx.fillStyle = pal[f.c % pal.length];
        ctx.fillRect(Math.round(offX + x * zoom), Math.round(offY + f.y * zoom), size, sea === 'fall' ? u : size);
      }
    }
    ctx.restore();
  });

  ns.garden = { season, streakPlants: () => Math.min(cache.soil.length, ns.data?.stats?.streak ?? 0) };
})();
