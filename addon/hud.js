// asaoffice HUD: an always-on overview around the office, in the same cozy look as the other panels.
//   - Top bar: what the office is doing right now in one sentence, plus live counters (sessions working, helpers
//     working, sub-agents started today) and whether the data feed is alive.
//   - Bottom cards: one per villager (Shades, sessions, helpers, staff acting for Shades) with its state
//     (Bekerja / Santai / Selesai / Nunggu kamu / Butuh izin), its project and what it does. Click one to follow it.
//   - Side panel with three tabs: Aktivitas (a live feed of tool calls, helpers coming and going), Riwayat
//     (sub-agents of the last day, from the data feed) and Tugas (TodoWrite lists of recent sessions).
// The feed comes from the same server messages the office gets (core.js onMessage), so it starts when the page
// opens; history and todos come from the data feed. H (or the 🧭 button under the zoom buttons) hides the HUD for a
// clear view; the panel can be minimised. ?hud=off turns it off (remembered).
(() => {
  'use strict';
  const ns = window.__asaoffice;
  if (ns.setting('hud', ['on', 'off'], 'on') === 'off') return;
  const S = ns.t({
    id: {
      title: 'Asa Office', live: 'Terhubung', dead: 'Data mati', nodata: 'Tanpa data', sessions: 'Sesi kerja', helpers: 'Asisten', today: 'Subagent hari ini',
      feed: 'Aktivitas', history: 'Riwayat', todos: 'Tugas', hide: 'Sembunyikan HUD (H)', show: 'Tampilkan HUD (H)', min: 'Perkecil / buka panel',
      working: 'Bekerja', idle: 'Santai', done: 'Selesai', waiting: 'Nunggu kamu', permission: 'Butuh izin', standby: 'Standby',
      phaseEmpty: 'Kantor lagi sepi ☕ Belum ada sesi Claude Code. Shades standby di mejanya.',
      phaseWork: (names, subs) => `Lagi kerja: ${names}${subs ? ` · ${subs} asisten ikut bantu` : ''}`,
      phaseSubs: (n) => `${n} asisten lagi kerja`, phaseIdle: 'Semua santai ☕ Ngobrol, ngopi, nunggu tugas berikutnya.',
      joined: 'masuk kantor', left: 'pulang', helperDone: 'asisten selesai', waitingYou: 'nunggu balasanmu', helper: 'Asisten',
      emptyFeed: 'Belum ada aktivitas sejak halaman dibuka.', emptyRuns: 'Belum ada subagent dalam 24 jam terakhir.', emptyTodos: 'Belum ada daftar tugas di sesi terbaru.',
      running: 'bekerja', finished: 'selesai', source: 'Sumber: transkrip Claude Code, 24 jam terakhir (terbaru di atas)',
      todoSource: (n) => `Sumber: TodoWrite · ${n} sesi terbaru`, main: 'Sesi utama', director: 'Direktur', actingFor: 'Bantu Shades',
      atDesk: 'Di meja direktur', noProject: 'Sesi Claude Code', chatWith: (n) => `Ngobrol sama ${n}`,
    },
    en: {
      title: 'Asa Office', live: 'Connected', dead: 'Data offline', nodata: 'No data', sessions: 'Sessions working', helpers: 'Helpers', today: 'Sub-agents today',
      feed: 'Activity', history: 'History', todos: 'Tasks', hide: 'Hide HUD (H)', show: 'Show HUD (H)', min: 'Minimise / open panel',
      working: 'Working', idle: 'Idle', done: 'Done', waiting: 'Waiting for you', permission: 'Needs permission', standby: 'Standby',
      phaseEmpty: 'The office is quiet ☕ No Claude Code sessions yet. Shades is standing by at his desk.',
      phaseWork: (names, subs) => `Working: ${names}${subs ? ` · ${subs} helpers pitching in` : ''}`,
      phaseSubs: (n) => `${n} helpers working`, phaseIdle: 'Everyone is relaxing ☕ Chatting, coffee, waiting for the next task.',
      joined: 'came in', left: 'left', helperDone: 'helper finished', waitingYou: 'waiting for your reply', helper: 'Helper',
      emptyFeed: 'No activity since the page was opened.', emptyRuns: 'No sub-agents in the last 24 hours.', emptyTodos: 'No todo list in the latest sessions.',
      running: 'working', finished: 'done', source: 'Source: Claude Code transcripts, last 24 hours (newest first)',
      todoSource: (n) => `Source: TodoWrite · ${n} latest sessions`, main: 'Main session', director: 'Director', actingFor: 'Helping Shades',
      atDesk: "At the director's desk", noProject: 'Claude Code session', chatWith: (n) => `Chatting with ${n}`,
    },
  });

  const COLORS = ['#d8643f', '#6fa65a', '#9a6fbf', '#c8503c', '#8a5aa8', '#3f8f8a', '#4fa3a0', '#e07a9a', '#c98a3a', '#5a8ac8', '#8a6a4a', '#e08a4a', '#2f3a56'];
  const STATE = {
    bekerja: { css: '#3f8a36', label: S.working }, santai: { css: '#8a7a68', label: S.idle }, selesai: { css: '#2a8a96', label: S.done },
    nunggu: { css: '#3f74b8', label: S.waiting }, izin: { css: '#c8801f', label: S.permission }, standby: { css: '#6a6f9a', label: S.standby },
  };
  const DONE_SHOW_MS = 45_000;
  const FEED_MAX = 100;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const locale = ns.lang === 'id' ? 'id-ID' : 'en-US';
  const fmtSec = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const fmtMin = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  const clock = (fmt, t) => fmt.format(t).replace(/\./g, ':');
  const localDay = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  const colorOf = (ch) => COLORS[(ch?.palette ?? 0) % COLORS.length];
  const clip = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));

  const css = `
  #asa-hud { position: fixed; inset: 0; z-index: 20; pointer-events: none; font-family: "FS Pixel Sans", sans-serif; color: #3a2117; }
  #asa-hud.off { display: none; }
  #asa-hud > * { pointer-events: auto; }
  #asa-hud button { font: inherit; color: inherit; }
  .hud-box { background: #f4e6c4; border: 3px solid #744122; box-shadow: inset 0 0 0 2px #dca05f, 0 4px 0 rgba(0,0,0,0.25); }
  .hud-top { position: fixed; top: 8px; left: 64px; right: 12px; display: flex; gap: 8px; align-items: stretch; pointer-events: none; }
  .hud-top > * { pointer-events: auto; }
  .hud-brand { flex: 1; min-width: 0; padding: 6px 12px; display: flex; flex-direction: column; justify-content: center; }
  .hud-brand b { font-weight: normal; font-size: 16px; color: #744122; }
  .hud-brand span { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hud-stats { display: flex; flex: none; }
  .hud-stat { padding: 6px 12px; border-left: 2px dashed #c9a877; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
  .hud-stat:first-child { border-left: 0; }
  .hud-stat small { font-size: 11px; opacity: 0.7; white-space: nowrap; }
  .hud-stat b { font-weight: normal; font-size: 17px; }
  .hud-dot { display: inline-block; width: 8px; height: 8px; margin-right: 5px; background: #4f9a45; }
  .hud-dot.off { background: #c8503c; } .hud-dot.none { background: #9a8a7a; }
  .hud-side { position: fixed; top: 74px; right: 12px; width: 300px; max-height: calc(100vh - 74px - 128px); display: flex; flex-direction: column; overflow: hidden; }
  .hud-tabs { display: flex; align-items: stretch; border-bottom: 2px solid #c9a877; }
  .hud-tabs button { flex: 1; background: none; border: 0; border-bottom: 3px solid transparent; padding: 7px 4px; font-size: 13px; cursor: pointer; opacity: 0.7; white-space: nowrap; }
  .hud-tabs button.on { opacity: 1; border-bottom-color: #973a2f; }
  .hud-tabs .n { display: inline-block; min-width: 16px; margin-left: 3px; padding: 0 4px; background: #e6d3a6; font-size: 11px; line-height: 15px; }
  .hud-tabs .min { flex: none; width: 34px; border-left: 2px solid #c9a877; cursor: pointer; }
  .hud-side.min .hud-scroll { display: none; }
  .hud-side.min .hud-tabs { border-bottom: 0; }
  .hud-side.min .hud-tabs .min { transform: rotate(180deg); }
  .hud-scroll { overflow-y: auto; flex: 0 1 auto; scrollbar-width: thin; scrollbar-color: #b8935c transparent; }
  .hud-pane { display: none; padding: 6px 0 10px; } .hud-pane.on { display: block; }
  .hud-src { padding: 4px 12px 6px; font-size: 11px; opacity: 0.7; }
  .hud-empty { padding: 16px 12px; text-align: center; font-size: 12.5px; opacity: 0.7; }
  .hud-feed { list-style: none; margin: 0; padding: 0; }
  .hud-feed li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 8px; padding: 5px 12px; border-top: 1px dashed #dcc79a; }
  .hud-feed li:first-child { border-top: 0; }
  .hud-feed .av { width: 22px; height: 22px; display: grid; place-items: center; color: #fff; font-size: 12px; border: 2px solid #744122; }
  .hud-feed .meta { display: flex; gap: 6px; align-items: baseline; }
  .hud-feed .who { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hud-feed time { font-size: 11px; opacity: 0.6; margin-left: auto; flex: none; }
  .hud-feed .txt { font-size: 12.5px; overflow-wrap: anywhere; line-height: 1.3; }
  .hud-feed .k-assign .txt { color: #973a2f; } .hud-feed .k-join .txt, .hud-feed .k-leave .txt, .hud-feed .k-done .txt { opacity: 0.7; font-style: italic; }
  .hud-feed .k-wait .txt { color: #3f74b8; }
  .hud-run { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; gap: 1px 8px; padding: 6px 12px; border-top: 1px dashed #dcc79a; align-items: baseline; }
  .hud-run:first-of-type { border-top: 0; }
  .hud-run i { width: 9px; height: 9px; align-self: center; }
  .hud-run .t { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hud-run .w { grid-column: 2 / 4; font-size: 11.5px; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hud-chip { font-size: 11px; padding: 0 6px; border: 2px solid currentColor; white-space: nowrap; background: #fffbe9; }
  .hud-todo-h { padding: 6px 12px 2px; font-size: 12px; color: #973a2f; }
  .hud-todo { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 4px; padding: 3px 12px; font-size: 12.5px; }
  .hud-todo.s-in_progress i { color: #3f8a36; } .hud-todo.s-completed span { opacity: 0.5; text-decoration: line-through; }
  .hud-todo i { font-style: normal; opacity: 0.7; }
  .hud-bottom { position: fixed; left: 230px; right: 12px; bottom: 10px; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
  .hud-bottom > * { pointer-events: auto; }
  .hud-cards { display: flex; gap: 8px; overflow-x: auto; padding: 0 2px 6px; scrollbar-width: thin; scrollbar-color: #b8935c transparent; }
  .hud-card { flex: 1 1 0; min-width: 190px; max-width: 280px; display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 1px 8px; padding: 6px 8px 7px;
    text-align: left; cursor: pointer; position: relative; }
  .hud-card:hover { background: #fbf0d3; }
  .hud-card:focus-visible { outline: 3px solid #3f74b8; outline-offset: 1px; }
  .hud-card.sel { border-color: #973a2f; }
  .hud-face { grid-row: 1 / span 3; width: 34px; height: 56px; image-rendering: pixelated; background-repeat: no-repeat; background-size: 238px 204px;
    background-position: -34px -4px; background-color: #dca05f; border: 2px solid #744122; }
  .hud-card .h { display: flex; gap: 6px; align-items: center; min-width: 0; }
  .hud-card .nm { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hud-card .st { margin-left: auto; flex: none; }
  .hud-card .task { font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hud-card .act { font-size: 12px; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (max-width: 1180px) { .hud-side { width: 270px; } }
  @media (max-width: 820px) {
    .hud-top { flex-wrap: wrap; left: 60px; right: 8px; gap: 6px; }
    .hud-brand { flex: 1 1 100%; } .hud-brand b { display: none; }
    .hud-stats { flex: 1 1 100%; } .hud-stat { flex: 1 1 0; padding: 4px 8px; } .hud-stat b { font-size: 15px; }
    .hud-bottom { left: 8px; right: 8px; bottom: 62px; }
    .hud-side { position: static; width: auto; }
    .hud-side { max-height: none; } .hud-side .hud-scroll { max-height: 30vh; }
    .hud-card { min-width: 168px; }
  }
  @media (max-width: 560px) { .hud-stats { display: none; } .hud-card { min-width: 150px; } }
  `;

  // ── State ──
  const feed = []; // newest first: { t, id, sub: {parent, tool} | null, text, kind }
  const names = new Map(); // id -> { name, color } (remembered so the feed still names villagers who left)
  const doneAt = new Map(); // id -> when it stopped working
  const wasActive = new Map();
  let tab = 'feed';
  let hidden = ns.store.get('hudHidden') === '1';
  let min = ns.store.get('hudMin') === null ? matchMedia('(max-width: 820px)').matches : ns.store.get('hudMin') === '1';

  function push(entry) {
    const last = feed.find((e) => e.id === entry.id && JSON.stringify(e.sub) === JSON.stringify(entry.sub));
    if (last && last.text === entry.text && entry.t - last.t < 4000) return;
    feed.unshift(entry);
    if (feed.length > FEED_MAX) feed.length = FEED_MAX;
  }
  ns.onMessage((msg) => {
    if (typeof msg?.id !== 'number') return;
    const t = Date.now();
    const tr = (s) => ns.translateStatus?.(s) ?? s;
    switch (msg.type) {
      case 'agentCreated': push({ t, id: msg.id, sub: null, text: S.joined, kind: 'join' }); break;
      case 'agentClosed': push({ t, id: msg.id, sub: null, text: S.left, kind: 'leave' }); break;
      case 'agentToolStart':
        if (typeof msg.status === 'string') push({ t, id: msg.id, sub: null, text: tr(msg.status), kind: msg.toolName === 'Agent' || msg.toolName === 'Task' ? 'assign' : 'tool' });
        break;
      case 'subagentToolStart':
        if (typeof msg.status === 'string') push({ t, id: msg.id, sub: { parent: msg.id, tool: msg.parentToolId }, text: tr(msg.status), kind: 'tool' });
        break;
      case 'subagentClear': push({ t, id: msg.id, sub: { parent: msg.id, tool: msg.parentToolId }, text: S.helperDone, kind: 'done' }); break;
      case 'agentStatus': if (msg.status === 'waiting') push({ t, id: msg.id, sub: null, text: S.waitingYou, kind: 'wait' }); break;
      default:
    }
  });

  // ── Building blocks ──
  const root = document.createElement('div');
  root.id = 'asa-hud';
  root.innerHTML = `
    <div class="hud-top">
      <div class="hud-brand hud-box"><b>${esc(S.title)}</b><span id="hud-phase"></span></div>
      <div class="hud-stats hud-box">
        <div class="hud-stat"><small></small><b id="hud-live"></b></div>
        <div class="hud-stat"><small>${esc(S.sessions)}</small><b id="hud-sessions">0</b></div>
        <div class="hud-stat"><small>${esc(S.helpers)}</small><b id="hud-helpers">0</b></div>
        <div class="hud-stat"><small>${esc(S.today)}</small><b id="hud-today">0</b></div>
      </div>
    </div>
    <aside class="hud-side hud-box">
      <div class="hud-tabs" role="tablist">
        <button type="button" role="tab" data-tab="feed">${esc(S.feed)}<span class="n" id="hud-n-feed">0</span></button>
        <button type="button" role="tab" data-tab="runs">${esc(S.history)}<span class="n" id="hud-n-runs">0</span></button>
        <button type="button" role="tab" data-tab="todos">${esc(S.todos)}<span class="n" id="hud-n-todos">0</span></button>
        <button type="button" class="min" title="${esc(S.min)}" aria-label="${esc(S.min)}">▾</button>
      </div>
      <div class="hud-scroll">
        <section class="hud-pane" data-pane="feed"><ul class="hud-feed" id="hud-feed"></ul></section>
        <section class="hud-pane" data-pane="runs" id="hud-runs"></section>
        <section class="hud-pane" data-pane="todos" id="hud-todos"></section>
      </div>
    </aside>
    <div class="hud-bottom"><div class="hud-cards" id="hud-cards"></div></div>`;
  const $ = (id) => root.querySelector(`#${id}`);
  const side = root.querySelector('.hud-side');

  function applyChrome() {
    root.classList.toggle('off', hidden);
    side.classList.toggle('min', min);
    for (const b of root.querySelectorAll('[data-tab]')) { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-selected', String(b.dataset.tab === tab)); }
    for (const p of root.querySelectorAll('[data-pane]')) p.classList.toggle('on', p.dataset.pane === tab);
    if (toggleBtn) toggleBtn.title = hidden ? S.show : S.hide;
    // On narrow screens the panel sits in the bottom stack, above the cards.
    const bottom = root.querySelector('.hud-bottom');
    const narrow = matchMedia('(max-width: 820px)').matches;
    if (narrow && side.parentElement !== bottom) bottom.prepend(side);
    if (!narrow && side.parentElement !== root) root.insertBefore(side, bottom);
  }
  const toggleBtn = ns.toolbarButton({ id: 'hud', title: S.hide, onClick: () => setHidden(!hidden) });
  toggleBtn.textContent = '🧭';
  function setHidden(on) {
    hidden = on;
    ns.store.set('hudHidden', on ? '1' : '0');
    applyChrome();
  }
  root.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { tab = tabBtn.dataset.tab; min = false; ns.store.set('hudMin', '0'); applyChrome(); return; }
    if (e.target.closest('.min')) { min = !min; ns.store.set('hudMin', min ? '1' : '0'); applyChrome(); return; }
    const card = e.target.closest('[data-id]');
    const office = ns.view?.office;
    if (card && office) {
      const id = Number(card.dataset.id);
      if (office.characters.has(id)) {
        office.selectedAgentId = id;
        office.cameraFollowId = id;
      }
    }
  });
  addEventListener('keydown', (e) => {
    if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest?.('input, textarea, select, [contenteditable]') && !ns.panel.isOpen) setHidden(!hidden);
  });
  matchMedia('(max-width: 820px)').addEventListener?.('change', applyChrome);
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  // The add-ons load in <head>, before the body exists.
  const mount = () => { document.body.appendChild(root); applyChrome(); };
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });

  // ── Data → text ──
  const runsData = () => ns.data?.runs ?? [];
  const runForSub = (office, ch) => {
    const toolId = office.subagentMeta?.get?.(ch.id)?.parentToolId;
    return toolId ? runsData().find((r) => r.id === toolId) ?? null : null;
  };
  const isCast = (ch) => ch.asaNpc || ch.asaDirector;
  const isReal = (ch) => !ch.isSubagent && !ch.asaNpc; // a session (the director's session counts)

  function stateOf(ch, now) {
    if (ch.asaShades) return 'standby';
    if (ch.bubbleType === 'permission') return 'izin';
    if (ch.bubbleType === 'waiting' && ch.waitingAwaitingInput) return 'nunggu';
    if (ch.isActive) return 'bekerja';
    return now - (doneAt.get(ch.id) ?? 0) < DONE_SHOW_MS ? 'selesai' : 'santai';
  }
  function roleOf(office, ch) {
    const staff = ns.staffOf?.(ch);
    if (ch.asaShades || ch.asaDirector) return S.director;
    if (staff) return ns.staffRole(staff);
    if (ch.isSubagent) {
      const parent = office.characters.get(ch.parentAgentId);
      return `${S.helper}${parent ? ` · ${ns.villagerName(parent)}` : ''}`;
    }
    return S.main;
  }
  function lines(office, ch, state) {
    let task = '';
    let act = '';
    if (ch.isSubagent) {
      const run = runForSub(office, ch);
      task = run?.description || run?.type || '';
      act = ns.subStatusText?.(ch) ?? '';
    } else if (ch.asaShades) {
      task = S.atDesk;
    } else {
      const project = ch.folderName || ns.data?.tasks?.[0]?.project || '';
      const title = (ns.data?.tasks ?? []).find((x) => x.project === ch.folderName)?.title;
      task = ch.asaActing ? S.actingFor : title || project || S.noProject;
    }
    if (!act || state !== 'bekerja') {
      const cast = ns.castStatus?.(ch)?.[0];
      const partner = ns.idleChat?.partnerOf?.(ch.id);
      const other = partner != null ? office.characters.get(partner) : null;
      if (state === 'bekerja') act = ns.statusText?.(ch.id) || cast || S.working;
      else if (state === 'nunggu') act = S.waiting;
      else if (state === 'izin') act = S.permission;
      else act = ns.activities?.describe?.(ch.id) || (other ? S.chatWith(ns.villagerName(other)) : cast || '');
    }
    if (act === task) act = '';
    return { task, act };
  }

  // ── Rendering (only touches the DOM when the text changed) ──
  const last = { cards: '', feed: '', runs: '', todos: '', phase: '' };
  function setHtml(el, html, key) {
    if (last[key] !== html) { el.innerHTML = html; last[key] = html; }
  }
  function render(office) {
    const now = Date.now();
    const chars = [...office.characters.values()].filter((c) => c.matrixEffect !== 'despawn' && !c.isGreeter);
    for (const c of chars) {
      const name = ns.villagerName(c);
      if (name) names.set(c.id, { name, color: colorOf(c), palette: c.palette });
      const active = !!c.isActive && !c.asaShades;
      if (wasActive.get(c.id) && !active) doneAt.set(c.id, now);
      wasActive.set(c.id, active);
    }
    for (const id of wasActive.keys()) if (!office.characters.has(id)) { wasActive.delete(id); doneAt.delete(id); }

    // Counters + sentence
    const mains = chars.filter(isReal);
    const workingMains = mains.filter((c) => c.isActive);
    const subs = chars.filter((c) => c.isSubagent);
    const workingSubs = subs.filter((c) => c.isActive).length;
    const today = runsData().filter((r) => localDay(Date.parse(r.at)) === localDay(now)).length;
    $('hud-sessions').textContent = String(workingMains.length);
    $('hud-helpers').textContent = String(workingSubs);
    $('hud-today').textContent = String(today);
    const age = ns.data?.generatedAt ? now - Date.parse(ns.data.generatedAt) : null;
    const live = age === null ? 'none' : age < 150_000 ? 'ok' : 'off';
    $('hud-live').innerHTML = `<i class="hud-dot${live === 'ok' ? '' : ` ${live}`}"></i>${esc(live === 'ok' ? S.live : live === 'off' ? S.dead : S.nodata)}`;
    let phase;
    if (!mains.length) phase = S.phaseEmpty;
    else if (workingMains.length) phase = S.phaseWork(workingMains.map((c) => ns.villagerName(c)).join(', '), workingSubs);
    else if (workingSubs) phase = S.phaseSubs(workingSubs);
    else phase = S.phaseIdle;
    if (last.phase !== phase) { $('hud-phase').textContent = phase; $('hud-phase').title = phase; last.phase = phase; }

    // Cards: Shades first, then sessions, staff acting, helpers.
    const order = (c) => (c.asaShades || c.asaDirector ? 0 : isReal(c) ? 1 : c.asaActing ? 2 : 3);
    const cards = chars.slice().sort((a, b) => order(a) - order(b) || a.id - b.id).map((c) => {
      const st = stateOf(c, now);
      const ui = STATE[st];
      const { task, act } = lines(office, c, st);
      const sel = office.selectedAgentId === c.id;
      const face = `background-image:url(${esc(ns.portraitUrl(c))})${c.hueShift ? `;filter:hue-rotate(${c.hueShift}deg)` : ''}`;
      return `<button type="button" class="hud-card hud-box${sel ? ' sel' : ''}" data-id="${c.id}"><span class="hud-face" style="${face}"></span>
        <span class="h"><span class="nm">${esc(ns.villagerName(c))}</span><span class="hud-chip st" style="color:${ui.css}">${esc(ui.label)}</span></span>
        <span class="task" title="${esc(task)}">${esc(clip(task || roleOf(office, c), 60))}</span><span class="act" title="${esc(act)}">${esc(clip(act || roleOf(office, c), 60))}</span></button>`;
    });
    setHtml($('hud-cards'), cards.join(''), 'cards');

    // Feed
    const feedHtml = feed.map((e) => {
      let who = names.get(e.id) ?? { name: S.main, color: '#8a7a68' };
      if (e.sub) {
        const subId = office.getSubagentId?.(e.sub.parent, e.sub.tool);
        const sc = subId != null ? office.characters.get(subId) : null;
        who = sc ? { name: ns.villagerName(sc), color: colorOf(sc) } : { name: `${who.name} · ${S.helper}`, color: who.color };
      }
      return `<li class="k-${esc(e.kind)}"><span class="av" style="background:${esc(who.color)}">${esc(Array.from(who.name)[0] ?? '?')}</span><div><div class="meta"><span class="who" style="color:${esc(who.color)}">${esc(who.name)}</span><time>${esc(clock(fmtSec, e.t))}</time></div><div class="txt">${esc(e.text)}</div></div></li>`;
    }).join('') || `<li style="display:block"><div class="hud-empty">${esc(S.emptyFeed)}</div></li>`;
    setHtml($('hud-feed'), feedHtml, 'feed');
    $('hud-n-feed').textContent = String(feed.length);

    // History (sub-agents of the last day)
    const runs = runsData();
    const running = new Set();
    for (const [subId, meta] of office.subagentMeta ?? []) if (office.characters.has(subId)) running.add(meta.parentToolId);
    const runsHtml = `<div class="hud-src">${esc(S.source)}</div>` + (runs.length ? runs.map((r) => {
      const isRun = running.has(r.id);
      const css2 = isRun ? STATE.bekerja.css : STATE.selesai.css;
      const staff = (ns.data?.staff ?? []).find((m) => m.agent === r.type);
      const who = staff ? staff.name : r.type === 'general-purpose' ? S.helper : r.type;
      return `<div class="hud-run"><i style="background:${css2}"></i><span class="t" title="${esc(r.description)}">${esc(r.description || r.type)}</span><span class="hud-chip" style="color:${css2}">${esc(isRun ? S.running : S.finished)}</span><span class="w">${esc([who, r.project, clock(fmtMin, Date.parse(r.at))].filter(Boolean).join(' · '))}</span></div>`;
    }).join('') : `<div class="hud-empty">${esc(S.emptyRuns)}</div>`);
    setHtml($('hud-runs'), runsHtml, 'runs');
    $('hud-n-runs').textContent = String(runs.length);

    // Todos
    const withTodos = (ns.data?.tasks ?? []).filter((x) => x.todos?.length).slice(0, 3);
    const openCount = withTodos.reduce((n, x) => n + x.todos.filter((t) => t.status !== 'completed').length, 0);
    const todosHtml = withTodos.length
      ? `<div class="hud-src">${esc(S.todoSource(withTodos.length))}</div>` + withTodos.map((x) => `<div class="hud-todo-h">${esc(x.title || x.project || '')}</div>` + x.todos.map((t) =>
        `<div class="hud-todo s-${esc(t.status)}"><i>${t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '▶' : '○'}</i><span>${esc(t.status === 'in_progress' && t.activeForm ? t.activeForm : t.content)}</span></div>`).join('')).join('')
      : `<div class="hud-empty">${esc(S.emptyTodos)}</div>`;
    setHtml($('hud-todos'), todosHtml, 'todos');
    $('hud-n-todos').textContent = String(openCount);
  }

  let lastRender = 0;
  ns.onFrame((canvas, office) => {
    const now = performance.now();
    if (!office?.characters || now - lastRender < 500) return;
    lastRender = now;
    render(office);
  });
  ns.hud = { hide: () => setHidden(true), show: () => setHidden(false), get hidden() { return hidden; } };
})();
