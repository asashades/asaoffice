// asaoffice Holo-board: the holographic wall display (COZY_HOLOBOARD) shows today's Claude Code
// activity live on its screen; click it for the full dashboard — tool calls, edits, commands,
// sessions, busiest hour, the last 14 days and your streak. Stats come from `npm run office`
// (tools/lib/claude-stats.mjs): counts only.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'HOLO-BOARD', toolsToday: 'tool call hari ini', best: (n) => `rekor 14 hari: ${n}`,
      edit: 'Edit', files: (n) => `${n} file`, search: 'Baca & cari', command: 'Command', web: 'Web', agent: 'Sub-agent',
      sessions: 'Sesi hari ini', activeNow: 'Aktif sekarang', of: (a, b) => `${a} dari ${b}`,
      hours: 'Aktivitas per jam', busiest: (a, b) => `jam tersibuk ${a}–${b}`, quiet: 'belum ada aktivitas hari ini',
      days: '14 hari terakhir', streak: (n, capped) => `Streak ${capped ? `${n}+` : n} hari berturut-turut`, noStreak: 'Mulai streak baru hari ini',
      updated: 'Diperbarui', nodata: 'Data belum ada. Jalankan kantor lewat `npm run office`, lalu tunggu sebentar.',
    },
    en: {
      title: 'HOLO-BOARD', toolsToday: 'tool calls today', best: (n) => `14-day best: ${n}`,
      edit: 'Edits', files: (n) => `${n} files`, search: 'Read & search', command: 'Commands', web: 'Web', agent: 'Sub-agents',
      sessions: 'Sessions today', activeNow: 'Active now', of: (a, b) => `${a} of ${b}`,
      hours: 'Activity by hour', busiest: (a, b) => `busiest ${a}–${b}`, quiet: 'no activity yet today',
      days: 'Last 14 days', streak: (n, capped) => `${capped ? `${n}+` : n}-day streak`, noStreak: 'Start a new streak today',
      updated: 'Updated', nodata: 'No data yet. Start the office with `npm run office` and give it a moment.',
    },
  });
  const locale = ns.lang === 'id' ? 'id-ID' : 'en-US';
  const GLOW = '#5ff3ff';

  const css = `
  .asa-holo-big { display: flex; align-items: baseline; gap: 10px; }
  .asa-holo-big b { font-weight: normal; font-size: 44px; color: #fff; text-shadow: 0 0 12px rgba(95,243,255,0.8); }
  .asa-holo-meter { height: 10px; border: 1px solid #5ff3ff; margin: 6px 0 4px; }
  .asa-holo-meter i { display: block; height: 100%; background: linear-gradient(90deg, #2aa7bd, #5ff3ff); box-shadow: 0 0 10px #5ff3ff; }
  .asa-holo-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin: 14px 0; }
  .asa-holo-tile { border: 1px solid rgba(95,243,255,0.45); padding: 8px; background: rgba(95,243,255,0.05); }
  .asa-holo-tile b { display: block; font-weight: normal; font-size: 22px; color: #fff; }
  .asa-holo-tile span { font-size: 12px; opacity: 0.8; }
  .asa-holo-sec { margin-top: 14px; font-size: 13px; color: #5ff3ff; display: flex; justify-content: space-between; gap: 8px; }
  .asa-holo-bars { display: flex; align-items: flex-end; gap: 2px; height: 64px; margin-top: 6px;
    border-bottom: 1px solid rgba(95,243,255,0.5); }
  .asa-holo-bars i { flex: 1; min-height: 1px; background: rgba(95,243,255,0.45); }
  .asa-holo-bars i.hot { background: #5ff3ff; box-shadow: 0 0 8px #5ff3ff; }
  .asa-holo-axis { display: flex; gap: 2px; font-size: 10px; opacity: 0.6; }
  .asa-holo-axis span { flex: 1; text-align: center; }
  .asa-holo-streak { margin-top: 14px; padding: 8px; border: 1px dashed #5ff3ff; text-align: center; }
  `;

  const dayKey = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const lastDays = (n) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (n - 1 - i));
      return d;
    });

  function activeAgents(office) {
    const main = [...(office?.characters?.values() ?? [])].filter((c) => !c.isSubagent);
    return [main.filter((c) => c.isActive).length, main.length];
  }

  function bars(values, hotIndex, labels) {
    const max = Math.max(1, ...values);
    const wrap = h('div', {});
    wrap.append(h('div', { class: 'asa-holo-bars' }, values.map((v, i) => h('i', { class: i === hotIndex ? 'hot' : '', style: { height: `${(v / max) * 100}%` }, title: String(v) }))));
    if (labels) wrap.append(h('div', { class: 'asa-holo-axis' }, labels.map((l) => h('span', {}, l))));
    return wrap;
  }

  function render(body) {
    const stats = ns.data?.stats;
    if (!stats) {
      body.append(h('div', {}, S.nodata));
      return;
    }
    const today = stats.days[stats.today] ?? { tools: 0, edit: 0, files: 0, search: 0, command: 0, web: 0, agent: 0, sessions: 0 };
    const recent = lastDays(14).map((d) => stats.days[dayKey(d)]?.tools ?? 0);
    const best = Math.max(1, ...recent);
    const [active, total] = activeAgents(ns.view?.office);

    body.append(
      h('div', { class: 'asa-holo-big' }, h('b', {}, today.tools), h('span', {}, S.toolsToday)),
      h('div', { class: 'asa-holo-meter' }, h('i', { style: { width: `${Math.min(100, (today.tools / best) * 100)}%` } })),
      h('div', { class: 'asa-muted' }, S.best(best)),
    );

    const tile = (icon, label, value, sub) => h('div', { class: 'asa-holo-tile' }, h('span', {}, `${icon} ${label}`), h('b', {}, value), sub ? h('span', {}, sub) : null);
    body.append(
      h(
        'div',
        { class: 'asa-holo-tiles' },
        tile('✎', S.edit, today.edit, S.files(today.files)),
        tile('⌕', S.search, today.search),
        tile('▶', S.command, today.command),
        tile('◎', S.web, today.web),
        tile('⧉', S.agent, today.agent),
        tile('◉', S.sessions, today.sessions),
        tile('●', S.activeNow, S.of(active, total)),
      ),
    );

    const hours = stats.hours ?? [];
    const peak = hours.some((v) => v > 0) ? hours.indexOf(Math.max(...hours)) : -1;
    const hh = (n) => `${String(n % 24).padStart(2, '0')}:00`;
    body.append(
      h('div', { class: 'asa-holo-sec' }, h('span', {}, S.hours), h('span', {}, peak >= 0 ? S.busiest(hh(peak), hh(peak + 1)) : S.quiet)),
      bars(hours, peak, hours.map((_, i) => (i % 6 === 0 ? String(i).padStart(2, '0') : ''))),
    );

    const days = lastDays(14);
    body.append(
      h('div', { class: 'asa-holo-sec' }, h('span', {}, S.days)),
      bars(recent, 13, days.map((d) => d.toLocaleDateString(locale, { weekday: 'narrow' }))),
    );

    body.append(h('div', { class: 'asa-holo-streak' }, stats.streak > 0 ? `🔥 ${S.streak(stats.streak, stats.streakCapped)}` : S.noStreak));
    body.append(
      h('div', { class: 'asa-muted', style: { marginTop: '8px' } }, `${S.updated} ${new Date(stats.updatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`),
    );
  }

  function open() {
    if (!document.getElementById('asa-holo-css')) document.head.appendChild(h('style', { id: 'asa-holo-css' }, css));
    const title = () => `${S.title} · ${new Date().toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}`;
    let timer = null;
    const panel = ns.panel.open({ theme: 'holo', title: title(), render, onClose: () => clearInterval(timer) });
    const refresh = () => ns.refreshData().then(() => { panel.title.textContent = title(); panel.rerender(); });
    refresh();
    timer = setInterval(refresh, 30_000);
  }

  ns.onFurnitureClick('COZY_HOLOBOARD', open);

  // Live screen: today's tool-call count, the last 12 hours as bars, a sweeping scan line and a soft glow.
  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (editMode) return;
    const boards = ns.findFurniture('COZY_HOLOBOARD');
    if (boards.length === 0) return;
    const stats = ns.data?.stats;
    const tools = stats?.days?.[stats.today]?.tools;
    const hours = stats?.hours ?? [];
    const now = new Date().getHours();
    const recent = Array.from({ length: 12 }, (_, i) => hours[now - 11 + i] ?? 0);
    const max = Math.max(1, ...recent);
    const t = performance.now() / 1000;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const f of boards) {
      // Screen area inside the sprite: x 4..27, y 6..20 (see holoboard2x2 in tools/lib/furniture.mjs).
      const x = offX + (f.col * 16 + 4) * zoom;
      const y = offY + (f.row * 16 + 6) * zoom;
      const w = 24 * zoom;
      const hgt = 15 * zoom;
      ctx.fillStyle = '#081c28';
      ctx.fillRect(x, y, w, hgt);
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 2);
      ctx.fillStyle = GLOW;
      ctx.fillRect(x, y, w, hgt);
      ctx.globalAlpha = 1;
      // Number
      ctx.fillStyle = '#dffcff';
      ctx.shadowColor = GLOW;
      ctx.shadowBlur = 3 * zoom;
      ctx.font = `${Math.round(6 * zoom)}px "FS Pixel Sans", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(tools == null ? '--' : String(tools), x + 1.5 * zoom, y + 0.5 * zoom);
      // Bars for the last 12 hours
      ctx.shadowBlur = 0;
      const bw = (w - 3 * zoom) / 12;
      recent.forEach((v, i) => {
        const bh = Math.max(zoom * 0.5, (v / max) * 6 * zoom);
        ctx.fillStyle = i === 11 ? '#dffcff' : GLOW;
        ctx.fillRect(x + 1.5 * zoom + i * bw, y + hgt - 1.5 * zoom - bh, Math.max(1, bw - zoom * 0.5), bh);
      });
      // Scan line
      const sy = y + ((t * 0.35) % 1) * hgt;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, sy, w, Math.max(1, zoom * 0.5));
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  });
})();
