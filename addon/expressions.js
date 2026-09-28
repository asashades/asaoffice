// asaoffice expressions: villagers show how their session is doing.
//   zzz      context window 80%+ full (time for /compact)
//   sweat    working for 15+ minutes without a break, or waiting 60+ seconds for your permission
//   hop + ✨  a happy little jump when a turn it worked on for 8+ seconds finishes
//   ?expressions=off|on (remembered)   console: __asaoffice.expressions.preview(id, 'zzz' | 'sweat' | 'hop')
(() => {
  'use strict';
  const ns = window.__asaoffice;
  let enabled = ns.setting('expressions', ['on', 'off'], 'on') === 'on';
  const SLEEPY = 0.8;
  const LONG_WORK_MS = 15 * 60_000;
  const LONG_WAIT_MS = 60_000;
  const MIN_TURN_MS = 8000;
  const HOP_MS = 1300;

  const state = new Map(); // id -> { active, activeSince, permissionSince, hopStart, baseY }
  const previews = new Map(); // id -> { kind, until }

  function track(ch, now) {
    let s = state.get(ch.id);
    if (!s) {
      state.set(ch.id, (s = { active: ch.isActive, activeSince: ch.isActive ? now : null, permissionSince: null, hopStart: null }));
      return s;
    }
    if (ch.isActive && !s.active) s.activeSince = now;
    if (!ch.isActive && s.active && s.activeSince && now - s.activeSince >= MIN_TURN_MS && ch.bubbleType !== 'permission') cheer(ch, s, now);
    if (!ch.isActive) s.activeSince = null;
    s.active = ch.isActive;
    if (ch.bubbleType === 'permission') s.permissionSince ??= now;
    else s.permissionSince = null;
    return s;
  }

  function cheer(ch, s, now) {
    s.hopStart = now;
    s.baseY = ch.tileRow * 16 + 8;
  }

  // Hop by nudging the villager's y for the next frame (pixel-agents draws from ch.y); only when it isn't walking.
  function hop(ch, s, now) {
    if (s.hopStart == null) return 0;
    const t = now - s.hopStart;
    if (t > HOP_MS || ch.state === 'walk' || ch.path.length) {
      if (ch.state !== 'walk' && !ch.path.length) ch.y = s.baseY;
      s.hopStart = null;
      return 0;
    }
    const k = (t / HOP_MS) * 3; // three bounces, each lower
    const lift = Math.abs(Math.sin(k * Math.PI)) * (4 - Math.floor(k)) * 1.2;
    ch.y = s.baseY - lift;
    return t / HOP_MS;
  }

  // Floats up to the right of the head, clear of the status badge (which is centred, ~11px wide).
  function zzz(ctx, x, y, zoom, t) {
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.5 + i / 3) % 1;
      ctx.font = `${Math.round((6 + p * 3) * zoom)}px "FS Pixel Sans", sans-serif`;
      ctx.globalAlpha = Math.sin(p * Math.PI);
      ctx.fillStyle = '#eef4ff';
      ctx.strokeStyle = '#1f2640';
      ctx.lineWidth = Math.max(2, zoom * 1.2);
      const zx = x + (7 + p * 5) * zoom;
      const zy = y + 4 * zoom - p * 12 * zoom;
      const letter = i === 1 ? 'Z' : 'z';
      ctx.strokeText(letter, zx, zy);
      ctx.fillText(letter, zx, zy);
    }
    ctx.globalAlpha = 1;
  }

  // A teardrop that slides down beside the head (O = outline, B = blue, W = shine).
  const DROP = ['..O..', '.OBO.', '.OBO.', 'OBBBO', 'OWBBO', 'OBBBO', '.OOO.'];
  function sweat(ctx, x, y, zoom, t) {
    const u = Math.max(1, Math.round(zoom));
    const p = (t * 0.7) % 1;
    const dx = Math.round(x + 5 * zoom);
    const dy = Math.round(y - 4 * zoom + p * 5 * zoom);
    ctx.globalAlpha = p < 0.8 ? 1 : (1 - p) / 0.2;
    const colors = { O: '#1f2f4a', B: '#7cc6ff', W: '#ffffff' };
    DROP.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const c = colors[row[rx]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(dx + rx * u, dy + ry * u, u, u);
      }
    });
    ctx.globalAlpha = 1;
  }

  function sparkles(ctx, x, y, zoom, progress) {
    const u = Math.max(1, Math.round(zoom));
    ctx.fillStyle = '#ffe27a';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + progress * 2;
      const r = (6 + progress * 8) * zoom;
      const sx = Math.round(x + Math.cos(a) * r);
      const sy = Math.round(y + Math.sin(a) * r * 0.6);
      ctx.globalAlpha = 1 - progress;
      ctx.fillRect(sx - u, sy, 3 * u, u);
      ctx.fillRect(sx, sy - u, u, 3 * u);
    }
    ctx.globalAlpha = 1;
  }

  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    const now = Date.now();
    const t = performance.now() / 1000;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const ch of office.characters.values()) {
      if (ch.isSubagent || ch.matrixEffect) continue;
      const s = track(ch, now);
      if (!enabled || editMode) continue;
      const progress = hop(ch, s, now);
      const lift = ch.state === 'type' ? 6 : 0;
      const headX = offX + ch.x * zoom;
      const headY = offY + (ch.y + lift - 24) * zoom;
      if (progress) sparkles(ctx, headX, headY, zoom, progress);
      const pv = previews.get(ch.id);
      const preview = pv && pv.until > now ? pv.kind : null;
      const ctx80 = ch.maxContextTokens > 0 && ch.contextTokens / ch.maxContextTokens >= SLEEPY;
      if (ctx80 || preview === 'zzz') zzz(ctx, headX, headY, zoom, t + ch.id);
      const longWork = s.activeSince && now - s.activeSince >= LONG_WORK_MS;
      const longWait = s.permissionSince && now - s.permissionSince >= LONG_WAIT_MS;
      if (longWork || longWait || preview === 'sweat') sweat(ctx, headX, headY + 6 * zoom, zoom, t + ch.id);
    }
    ctx.restore();
    for (const id of state.keys()) if (!office.characters.has(id)) state.delete(id);
  });

  ns.expressions = {
    /** Try an expression on villager `id` for a few seconds: 'zzz', 'sweat' or 'hop'. */
    preview(id, kind = 'hop', seconds = 6) {
      const ch = ns.view?.office?.characters.get(id);
      const s = ch && state.get(id);
      if (!s) return false;
      if (kind === 'hop') cheer(ch, s, Date.now());
      else previews.set(id, { kind, until: Date.now() + seconds * 1000 });
      return true;
    },
    setEnabled(on) { enabled = !!on; ns.store.set('expressions', enabled ? 'on' : 'off'); },
  };
})();
