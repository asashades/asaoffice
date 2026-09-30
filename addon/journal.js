// asaoffice Journal (Jurnal Petani): the quest board on the command room's wall (COZY_QUESTBOARD) shows today's harvest
// (tool calls) on its biggest note; click it to open the farmer's journal — Stardew-style skill levels earned from
// what Claude Code does (edits = farming, reading = foraging, commands = mining, web = fishing, sub-agents = combat),
// today's numbers, the day streak, the "special orders" (TodoWrite lists), the last 14 days and a book of achievements.
// Stats come from `npm run office` (tools/lib/claude-stats.mjs): counts only.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Jurnal Petani', seasons: ['Musim Dingin', 'Musim Semi', 'Musim Panas', 'Musim Gugur'], harvest: 'Panen hari ini', best: (n) => `rekor 14 hari: ${n}`,
      streak: 'Hari beruntun', sessions: 'Sesi hari ini', gold: 'Emas hari ini', active: 'Lagi bekerja', of: (a, b) => `${a} dari ${b}`,
      skills: 'Keahlian', level: (n) => `Lv ${n}`, next: (a, b) => `${a} / ${b}`, max: 'Maksimal!',
      farming: 'Bertani', farmingSub: 'nulis & ngedit file', foraging: 'Mencari makan', foragingSub: 'baca & cari kode', mining: 'Menambang', miningSub: 'jalanin command',
      fishing: 'Memancing', fishingSub: 'cari di web', combat: 'Bertarung', combatSub: 'panggil sub-agent',
      orders: 'Pesanan khusus', noOrders: 'Belum ada pesanan. Daftar TodoWrite sesi terbaru muncul di sini.', days: 'Panen 14 hari terakhir',
      hours: 'Jam kerja hari ini', busiest: (a) => `tersibuk jam ${a}`, quiet: 'belum ada kegiatan hari ini',
      book: 'Buku pencapaian', locked: 'Belum terbuka', updated: 'Diperbarui', nodata: 'Data belum ada. Jalankan kantor lewat `npm run office`, lalu tunggu sebentar.',
      ach: {
        first: ['Panen pertama', 'Claude ngerjain tugas pertamanya'], farmer: ['Petani rajin', '1.000 tool call'], tycoon: ['Juragan kebun', '10.000 tool call'],
        flame: ['Api semangat', 'Streak 7 hari'], tireless: ['Tak kenal lelah', 'Streak 14 hari'], post: ['Tukang pos', '5 tugas dari kotak surat selesai'],
        team: ['Tim solid', '3 subagent dalam sehari'], owl: ['Kelelawar malam', 'Kerja di atas jam 10 malam'],
      },
    },
    en: {
      title: "Farmer's Journal", seasons: ['Winter', 'Spring', 'Summer', 'Fall'], harvest: "Today's harvest", best: (n) => `14-day best: ${n}`,
      streak: 'Day streak', sessions: 'Sessions today', gold: 'Gold today', active: 'Working now', of: (a, b) => `${a} of ${b}`,
      skills: 'Skills', level: (n) => `Lv ${n}`, next: (a, b) => `${a} / ${b}`, max: 'Maxed!',
      farming: 'Farming', farmingSub: 'writing & editing files', foraging: 'Foraging', foragingSub: 'reading & searching code', mining: 'Mining', miningSub: 'running commands',
      fishing: 'Fishing', fishingSub: 'searching the web', combat: 'Combat', combatSub: 'calling sub-agents',
      orders: 'Special orders', noOrders: 'No orders yet. The latest session’s TodoWrite list shows up here.', days: 'Harvest, last 14 days',
      hours: "Today's working hours", busiest: (a) => `busiest at ${a}`, quiet: 'nothing yet today',
      book: 'Book of achievements', locked: 'Not yet unlocked', updated: 'Updated', nodata: 'No data yet. Start the office with `npm run office` and give it a moment.',
      ach: {
        first: ['First harvest', 'Claude did its first task'], farmer: ['Busy farmer', '1,000 tool calls'], tycoon: ['Orchard tycoon', '10,000 tool calls'],
        flame: ['Spark of spirit', '7-day streak'], tireless: ['Tireless', '14-day streak'], post: ['Postman', '5 mailbox tasks finished'],
        team: ['Solid team', '3 sub-agents in one day'], owl: ['Night owl', 'Worked after 10 pm'],
      },
    },
  });
  const locale = ns.lang === 'id' ? 'id-ID' : 'en-US';
  const LEVELS = [15, 60, 150, 350, 700, 1400, 2800, 5500, 10000, 20000]; // tool calls needed for level 1…10
  const SKILLS = [
    { key: 'edit', icon: '🌾', name: 'farming', sub: 'farmingSub', color: '#6ea84e' },
    { key: 'search', icon: '🍄', name: 'foraging', sub: 'foragingSub', color: '#c8683f' },
    { key: 'command', icon: '⛏️', name: 'mining', sub: 'miningSub', color: '#7c736e' },
    { key: 'web', icon: '🎣', name: 'fishing', sub: 'fishingSub', color: '#4a86d8' },
    { key: 'agent', icon: '⚔️', name: 'combat', sub: 'combatSub', color: '#c8503c' },
  ];

  const css = `
  .asa-j-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .asa-j-season { font-size: 14px; color: #973a2f; }
  .asa-j-big { display: flex; align-items: baseline; gap: 10px; }
  .asa-j-big b { font-weight: normal; font-size: 44px; color: #973a2f; }
  .asa-j-meter { height: 12px; background: #d9c49a; border: 2px solid #744122; margin: 6px 0 4px; }
  .asa-j-meter i { display: block; height: 100%; background: repeating-linear-gradient(90deg, #6ea84e 0 6px, #8cc45a 6px 8px); }
  .asa-j-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; margin: 12px 0; }
  .asa-j-tile { border: 2px solid #c9a877; padding: 7px 8px; background: #fffbe9; }
  .asa-j-tile span { font-size: 12px; opacity: 0.75; display: block; }
  .asa-j-tile b { display: block; font-weight: normal; font-size: 22px; }
  .asa-j-sec { margin: 16px 0 6px; font-size: 15px; color: #973a2f; border-bottom: 2px dashed #c9a877; padding-bottom: 3px; display: flex; justify-content: space-between; gap: 8px; }
  .asa-j-sec small { font-size: 12px; color: #3a2117; opacity: 0.7; }
  .asa-j-skill { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 2px 10px; align-items: center; padding: 5px 0; border-bottom: 1px dotted #d9c49a; }
  .asa-j-skill .ic { grid-row: 1 / span 2; font-size: 22px; text-align: center; }
  .asa-j-skill .nm { font-size: 14px; } .asa-j-skill .nm small { opacity: 0.65; font-size: 12px; margin-left: 6px; }
  .asa-j-skill .lv { font-size: 13px; text-align: right; }
  .asa-j-pips { display: flex; gap: 3px; grid-column: 2 / 4; align-items: center; }
  .asa-j-pips i { width: 14px; height: 10px; background: #e6d3a6; border: 1px solid #b8935c; }
  .asa-j-pips i.on { background: var(--c); border-color: #744122; }
  .asa-j-pips em { font-style: normal; font-size: 11px; opacity: 0.7; margin-left: 6px; }
  .asa-j-order { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 4px; padding: 3px 0; font-size: 13px; }
  .asa-j-order i { font-style: normal; opacity: 0.7; } .asa-j-order.s-in_progress i { color: #3f8a36; opacity: 1; }
  .asa-j-order.s-completed span { opacity: 0.5; text-decoration: line-through; }
  .asa-j-orders-h { font-size: 12px; opacity: 0.7; margin: 6px 0 2px; }
  .asa-j-bars { display: flex; align-items: flex-end; gap: 3px; height: 60px; margin-top: 6px; border-bottom: 2px solid #744122; }
  .asa-j-bars i { flex: 1; min-height: 1px; background: #a9c878; border: 1px solid #6ea84e; border-bottom: 0; }
  .asa-j-bars i.hot { background: #6ea84e; }
  .asa-j-axis { display: flex; gap: 3px; font-size: 10px; opacity: 0.65; } .asa-j-axis span { flex: 1; text-align: center; }
  .asa-j-book { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .asa-j-ach { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 0 8px; padding: 6px 8px; border: 2px solid #c9a877; background: #fffbe9; align-items: center; }
  .asa-j-ach.locked { opacity: 0.45; filter: grayscale(1); }
  .asa-j-ach .ic { grid-row: 1 / span 2; font-size: 22px; text-align: center; }
  .asa-j-ach b { font-weight: normal; font-size: 13px; } .asa-j-ach span { font-size: 11px; opacity: 0.75; }
  `;

  const dayKey = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const lastDays = (n) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return d; });
  const seasonIndex = () => Math.floor(((new Date().getMonth() + 1) % 12) / 3); // Dec–Feb, Mar–May, Jun–Aug, Sep–Nov
  const season = () => `${['❄️', '🌸', '☀️', '🍂'][seasonIndex()]} ${S.seasons[seasonIndex()]}`;
  const fmt = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));
  const total = (stats, key) => Object.values(stats.days ?? {}).reduce((n, d) => n + (d[key] ?? 0), 0);

  function levelOf(count) {
    const level = LEVELS.filter((t) => count >= t).length;
    const prev = level ? LEVELS[level - 1] : 0;
    const next = LEVELS[level] ?? null;
    return { level, prev, next, progress: next ? (count - prev) / (next - prev) : 1 };
  }

  function activeAgents(office) {
    const main = [...(office?.characters?.values() ?? [])].filter((c) => !c.isSubagent && !c.asaNpc);
    return [main.filter((c) => c.isActive).length, main.length];
  }

  function bars(values, hotIndex, labels) {
    const max = Math.max(1, ...values);
    const wrap = h('div', {});
    wrap.append(h('div', { class: 'asa-j-bars' }, values.map((v, i) => h('i', { class: i === hotIndex ? 'hot' : '', style: { height: `${(v / max) * 100}%` }, title: String(v) }))));
    if (labels) wrap.append(h('div', { class: 'asa-j-axis' }, labels.map((l) => h('span', {}, l))));
    return wrap;
  }

  function achievements(stats) {
    const tools = total(stats, 'tools');
    const hours = stats.hours ?? [];
    const today = stats.days?.[stats.today] ?? {};
    const runsToday = (ns.data?.runs ?? []).filter((r) => dayKey(new Date(r.at)) === stats.today).length;
    const posted = (ns.data?.mail ?? []).filter((l) => l.status === 'done').length;
    const night = (hours[22] ?? 0) + (hours[23] ?? 0) + hours.slice(0, 5).reduce((a, b) => a + b, 0) > 0;
    return [
      ['first', '🌱', tools >= 1], ['farmer', '🥕', tools >= 1000], ['tycoon', '🏆', tools >= 10000], ['flame', '🔥', stats.streak >= 7],
      ['tireless', '💪', stats.streak >= 14], ['post', '📮', posted >= 5], ['team', '🤝', Math.max(runsToday, today.agent ?? 0) >= 3], ['owl', '🦉', night],
    ];
  }

  function render(body) {
    const stats = ns.data?.stats;
    if (!stats) return body.append(h('div', {}, S.nodata));
    const today = stats.days[stats.today] ?? { tools: 0, sessions: 0, tokens: null };
    const recent = lastDays(14).map((d) => stats.days[dayKey(d)]?.tools ?? 0);
    const best = Math.max(1, ...recent);
    const [active, count] = activeAgents(ns.view?.office);
    const tok = today.tokens;
    const gold = tok ? (tok.output ?? 0) + (tok.input ?? 0) + (tok.cacheWrite ?? 0) : 0;

    body.append(
      h('div', { class: 'asa-j-top' }, h('span', { class: 'asa-j-season' }, season()), h('span', { class: 'asa-muted' }, new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }))),
      h('div', { class: 'asa-j-big' }, h('b', {}, today.tools), h('span', {}, S.harvest)),
      h('div', { class: 'asa-j-meter' }, h('i', { style: { width: `${Math.min(100, (today.tools / best) * 100)}%` } })),
      h('div', { class: 'asa-muted' }, S.best(best)),
      h('div', { class: 'asa-j-tiles' },
        h('div', { class: 'asa-j-tile' }, h('span', {}, `🔥 ${S.streak}`), h('b', {}, `${stats.streak}${stats.streakCapped ? '+' : ''}`)),
        h('div', { class: 'asa-j-tile' }, h('span', {}, `📒 ${S.sessions}`), h('b', {}, today.sessions ?? 0)),
        h('div', { class: 'asa-j-tile' }, h('span', {}, `🪙 ${S.gold}`), h('b', {}, `${fmt(gold)}g`)),
        h('div', { class: 'asa-j-tile' }, h('span', {}, `👩‍🌾 ${S.active}`), h('b', {}, S.of(active, count)))),
    );

    body.append(h('div', { class: 'asa-j-sec' }, h('span', {}, `⭐ ${S.skills}`)));
    for (const sk of SKILLS) {
      const n = total(stats, sk.key);
      const { level, prev, next, progress } = levelOf(n);
      body.append(h('div', { class: 'asa-j-skill', style: { '--c': sk.color } },
        h('span', { class: 'ic' }, sk.icon),
        h('span', { class: 'nm' }, S[sk.name], h('small', {}, S[sk.sub])),
        h('span', { class: 'lv' }, S.level(level)),
        h('span', { class: 'asa-j-pips' }, Array.from({ length: 10 }, (_, i) => h('i', { class: i < level ? 'on' : '' })),
          h('em', {}, next ? S.next(n - prev, next - prev) : S.max))));
      void progress;
    }

    body.append(h('div', { class: 'asa-j-sec' }, h('span', {}, `📜 ${S.orders}`)));
    const withTodos = (ns.data?.tasks ?? []).filter((x) => x.todos?.length).slice(0, 2);
    if (!withTodos.length) body.append(h('div', { class: 'asa-muted' }, S.noOrders));
    for (const x of withTodos) {
      body.append(h('div', { class: 'asa-j-orders-h' }, x.title || x.project || ''));
      for (const t of x.todos) {
        body.append(h('div', { class: `asa-j-order s-${t.status}` }, h('i', {}, t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '▶' : '○'),
          h('span', {}, t.status === 'in_progress' && t.activeForm ? t.activeForm : t.content)));
      }
    }

    const days = lastDays(14);
    body.append(h('div', { class: 'asa-j-sec' }, h('span', {}, `🌻 ${S.days}`)), bars(recent, 13, days.map((d) => d.toLocaleDateString(locale, { weekday: 'narrow' }))));
    const hours = stats.hours ?? [];
    const peak = hours.some((v) => v > 0) ? hours.indexOf(Math.max(...hours)) : -1;
    body.append(
      h('div', { class: 'asa-j-sec' }, h('span', {}, `🕰️ ${S.hours}`), h('small', {}, peak >= 0 ? S.busiest(`${String(peak).padStart(2, '0')}:00`) : S.quiet)),
      bars(hours, peak, hours.map((_, i) => (i % 6 === 0 ? String(i).padStart(2, '0') : ''))));

    body.append(h('div', { class: 'asa-j-sec' }, h('span', {}, `🏅 ${S.book}`)),
      h('div', { class: 'asa-j-book' }, achievements(stats).map(([id, icon, ok]) =>
        h('div', { class: `asa-j-ach${ok ? '' : ' locked'}`, title: ok ? '' : S.locked }, h('span', { class: 'ic' }, ok ? icon : '🔒'), h('b', {}, S.ach[id][0]), h('span', {}, S.ach[id][1])))));
    body.append(h('div', { class: 'asa-muted', style: { marginTop: '10px' } }, `${S.updated} ${new Date(stats.updatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`));
  }

  function open() {
    if (!document.getElementById('asa-journal-css')) document.head.appendChild(h('style', { id: 'asa-journal-css' }, css));
    let timer = null;
    const panel = ns.panel.open({ theme: 'cozy', title: `📖 ${S.title}`, render, onClose: () => clearInterval(timer) });
    panel.el.style.maxWidth = 'min(640px, 100%)';
    const refresh = () => ns.refreshData().then(() => panel.rerender());
    refresh();
    timer = setInterval(refresh, 30_000);
  }
  ns.onFurnitureClick('COZY_QUESTBOARD', open);
  ns.onFurnitureClick('COZY_HOLOBOARD', open); // offices still using the old layout

  // The biggest note on the board shows today's harvest, in red ink.
  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (editMode) return;
    const boards = ns.findFurniture('COZY_QUESTBOARD');
    if (!boards.length) return;
    const stats = ns.data?.stats;
    const tools = stats?.days?.[stats.today]?.tools;
    const text = tools == null ? '--' : fmt(tools);
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#973a2f';
    ctx.font = `${Math.round(5.5 * zoom)}px "FS Pixel Sans", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    for (const f of boards) {
      // The centre note is at x 17..28, y 9..22 of the 48×32 sprite (questBoard() in tools/lib/furniture-office.mjs).
      const cx = offX + (f.col * 16 + 22.5) * zoom;
      ctx.fillText(text, cx, offY + (f.row * 16 + 17) * zoom);
    }
    ctx.restore();
  });
})();
