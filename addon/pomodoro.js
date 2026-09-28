// asaoffice Pomodoro: click the pendulum clock on the wall to start a focus session (25 min by default).
// The clock shows the time left underneath it. When focus ends you get the notification chime + toast and
// a break starts on its own (5 min, 15 after every 4th round); during the break every villager whose
// session is idle walks to the lounge and hangs around the tea table (or the fireplace). Working villagers
// keep working. When the break is over they wander back and you choose when to start the next round.
// The timer lives in this browser (localStorage), so a refresh keeps it; the phone keeps its own.
//   ?pomodoro=off|on (remembered)   console: __asaoffice.pomodoro.start() / .skip() / .state
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  let enabled = ns.setting('pomodoro', ['on', 'off'], 'on') === 'on';

  const S = ns.t({
    id: {
      title: 'Pomodoro', idle: 'Siap fokus?', focus: 'Fokus', break: 'Istirahat', longBreak: 'Istirahat panjang',
      paused: 'Dijeda', round: (n) => `Ronde ${n}`, today: (n) => `🍅 ${n} hari ini`,
      start: 'Mulai fokus', pause: 'Jeda', resume: 'Lanjut', stop: 'Berhenti', skip: 'Lewati',
      startBreak: 'Istirahat sekarang', preset: 'Durasi',
      hint: 'Pas istirahat, villager yang lagi santai ngumpul di lounge. Villager yang lagi kerja tetap kerja.',
      focusDone: 'Fokus selesai! Waktunya istirahat ☕', breakDone: 'Istirahat selesai. Lanjut fokus?',
      focusDoneBody: 'Villager yang santai ngumpul di lounge.', breakDoneBody: 'Klik jam dinding buat mulai ronde berikutnya.',
    },
    en: {
      title: 'Pomodoro', idle: 'Ready to focus?', focus: 'Focus', break: 'Break', longBreak: 'Long break',
      paused: 'Paused', round: (n) => `Round ${n}`, today: (n) => `🍅 ${n} today`,
      start: 'Start focus', pause: 'Pause', resume: 'Resume', stop: 'Stop', skip: 'Skip',
      startBreak: 'Take a break now', preset: 'Length',
      hint: 'During breaks, villagers whose sessions are idle gather in the lounge. Working villagers keep working.',
      focusDone: 'Focus done! Time for a break ☕', breakDone: 'Break is over. Back to focus?',
      focusDoneBody: 'Idle villagers are gathering in the lounge.', breakDoneBody: 'Click the wall clock to start the next round.',
    },
  });

  const PRESETS = { '25/5': { focus: 25, short: 5, long: 15 }, '50/10': { focus: 50, short: 10, long: 20 } };
  const LONG_EVERY = 4;
  const MIN = 60_000;

  // ── State (persisted per browser) ──
  // mode: 'idle' | 'focus' | 'break'; endsAt (ms) while running, left (ms) while paused.
  const blank = () => ({ mode: 'idle', endsAt: null, left: null, round: 1, long: false, preset: '25/5', day: today(), done: 0 });
  function today() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
  function load() {
    try {
      const s = JSON.parse(ns.store.get('pomodoroState') || 'null');
      if (s && ['idle', 'focus', 'break'].includes(s.mode) && PRESETS[s.preset]) return s;
    } catch { /* corrupt */ }
    return blank();
  }
  let st = load();
  const save = () => ns.store.set('pomodoroState', JSON.stringify(st));
  const preset = () => PRESETS[st.preset];
  const paused = () => st.mode !== 'idle' && st.left != null;
  const remaining = () => (st.mode === 'idle' ? 0 : paused() ? st.left : Math.max(0, st.endsAt - Date.now()));
  const total = () => (st.mode === 'focus' ? preset().focus : st.long ? preset().long : preset().short) * MIN;
  function rollDay() { if (st.day !== today()) { st.day = today(); st.done = 0; } }

  function begin(mode, long = false, from = Date.now()) {
    rollDay();
    st.mode = mode;
    st.long = long;
    st.left = null;
    st.endsAt = from + total();
    save();
    refreshPanel();
  }
  function stop() { st.mode = 'idle'; st.endsAt = null; st.left = null; st.long = false; save(); refreshPanel(); }
  function pause() { if (st.mode === 'idle' || paused()) return; st.left = remaining(); st.endsAt = null; save(); refreshPanel(); }
  function resume() { if (!paused()) return; st.endsAt = Date.now() + st.left; st.left = null; save(); refreshPanel(); }

  /** Time's up (or skipped): focus → break (counts a 🍅), break → idle and the next round. */
  function advance({ silent = false, from } = {}) {
    if (st.mode === 'focus') {
      rollDay();
      st.done++;
      const long = st.round % LONG_EVERY === 0;
      begin('break', long, from);
      if (!silent) ns.notify?.message?.({ icon: '☕', title: S.focusDone, body: S.focusDoneBody, kind: 'done' });
    } else if (st.mode === 'break') {
      st.round = st.long ? 1 : st.round + 1;
      stop();
      if (!silent) ns.notify?.message?.({ icon: '🍅', title: S.breakDone, body: S.breakDoneBody, kind: 'done' });
    }
  }

  // ── Panel ──
  const css = `
  .asa-pomo { text-align: center; }
  .asa-pomo-time { font-size: 56px; letter-spacing: 2px; margin: 4px 0 2px; }
  .asa-pomo-mode { font-size: 16px; }
  .asa-pomo-bar { height: 8px; background: #e8d9b5; margin: 12px 0; } .asa-pomo-bar i { display: block; height: 100%; }
  .asa-pomo-btns { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 12px 0 8px; }
  .asa-pomo-btns button, .asa-pomo-presets button { font: inherit; font-size: 14px; cursor: pointer; padding: 6px 12px;
    background: #fffbe9; color: #3a2117; border: 2px solid #744122; box-shadow: 0 2px 0 #744122; }
  .asa-pomo-btns button.primary { background: #c8503c; color: #fff6dc; border-color: #973a2f; box-shadow: 0 2px 0 #973a2f; }
  .asa-pomo-presets { display: flex; gap: 6px; justify-content: center; align-items: center; font-size: 13px; }
  .asa-pomo-presets button[aria-pressed="true"] { background: #dca05f; }
  .asa-pomo-meta { display: flex; justify-content: center; gap: 14px; font-size: 13px; opacity: 0.75; margin-top: 4px; }
  `;
  const fmt = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const modeLabel = () => (st.mode === 'idle' ? S.idle : st.mode === 'focus' ? S.focus : st.long ? S.longBreak : S.break);
  const modeColor = () => (st.mode === 'break' ? '#6ea84e' : '#c8503c');

  let panel = null;
  let timeEl = null;
  let barEl = null;
  function render(body) {
    rollDay();
    const btn = (label, onclick, primary) => h('button', { type: 'button', class: primary ? 'primary' : '', onclick }, label);
    timeEl = h('div', { class: 'asa-pomo-time' }, fmt(st.mode === 'idle' ? preset().focus * MIN : remaining()));
    barEl = h('i', { style: { width: '0%', background: modeColor() } });
    const buttons = [];
    if (st.mode === 'idle') {
      buttons.push(btn(`▶ ${S.start}`, () => begin('focus'), true));
    } else {
      buttons.push(paused() ? btn(`▶ ${S.resume}`, resume, true) : btn(`⏸ ${S.pause}`, pause, true));
      buttons.push(btn(st.mode === 'focus' ? `☕ ${S.startBreak}` : `⏭ ${S.skip}`, () => advance({ silent: true })));
      buttons.push(btn(`⏹ ${S.stop}`, stop));
    }
    body.append(
      h(
        'div',
        { class: 'asa-pomo' },
        h('div', { class: 'asa-pomo-mode', style: { color: modeColor() } }, paused() ? `${modeLabel()} · ${S.paused}` : modeLabel()),
        timeEl,
        h('div', { class: 'asa-pomo-meta' }, h('span', {}, S.round(st.round)), h('span', {}, S.today(st.done))),
        h('div', { class: 'asa-pomo-bar' }, barEl),
        h('div', { class: 'asa-pomo-btns' }, buttons),
        st.mode === 'idle'
          ? h('div', { class: 'asa-pomo-presets' }, `${S.preset}:`, Object.keys(PRESETS).map((k) =>
            h('button', { type: 'button', 'aria-pressed': String(st.preset === k), onclick: () => { st.preset = k; save(); refreshPanel(); } }, k)))
          : null,
        h('p', { class: 'asa-muted' }, S.hint),
      ),
    );
    tickPanel();
  }
  function tickPanel() {
    if (!panel || !timeEl?.isConnected) return;
    if (st.mode !== 'idle') timeEl.textContent = fmt(remaining());
    barEl.style.width = st.mode === 'idle' ? '0%' : `${Math.min(100, (1 - remaining() / total()) * 100)}%`;
  }
  function refreshPanel() { if (panel && ns.panel.isOpen) panel.rerender(); }
  function open() {
    if (!document.getElementById('asa-pomo-css')) document.head.appendChild(h('style', { id: 'asa-pomo-css' }, css));
    panel = ns.panel.open({ theme: 'cozy', title: `🍅 ${S.title}`, render, onClose: () => { panel = null; } });
  }
  if (enabled) ns.onFurnitureClick('COZY_CLOCK', open);

  // ── Break: idle villagers gather in the lounge ──
  const gather = new Map(); // id -> { col, row, target }
  const key = (c, r) => `${c},${r}`;
  const DIR = { DOWN: 0, LEFT: 1, RIGHT: 2, UP: 3 };
  const facing = (from, to) => {
    const dc = to.col - from.col;
    const dr = to.row - from.row;
    return Math.abs(dc) > Math.abs(dr) ? (dc > 0 ? DIR.RIGHT : DIR.LEFT) : dr > 0 ? DIR.DOWN : DIR.UP;
  };
  const FP = { COZY_TEA_TABLE: [2, 2], COZY_FIREPLACE: [2, 2], COZY_SOFA_FRONT: [2, 1] };
  function loungeCenter(office) {
    const furniture = office.getLayout().furniture;
    for (const type of ['COZY_TEA_TABLE', 'COZY_FIREPLACE', 'COZY_SOFA_FRONT']) {
      const f = furniture.find((x) => x.type === type);
      if (f) return { col: f.col + (FP[type][0] - 1) / 2, row: f.row + (FP[type][1] - 1) / 2 };
    }
    return null;
  }
  const eligible = (ch) => !ch.isActive && !ch.isSubagent && !ch.isGreeter && !ch.isHeadless && !ch.matrixEffect && ch.bubbleType !== 'permission';

  function pickSpot(office, ch, center) {
    const taken = new Set([...gather.values()].map((g) => key(g.col, g.row)));
    for (const other of office.characters.values()) if (other.id !== ch.id && !gather.has(other.id)) taken.add(key(other.tileCol, other.tileRow));
    const spots = office.walkableTiles
      .filter((t) => !taken.has(key(t.col, t.row)))
      .map((t) => ({ col: t.col, row: t.row, d: Math.abs(t.col - center.col) + Math.abs(t.row - center.row) }))
      .filter((t) => t.d >= 1 && t.d <= 5)
      .sort((a, b) => a.d - b.d || Math.random() - 0.5);
    for (const s of spots.slice(0, 8)) {
      if ((ch.tileCol === s.col && ch.tileRow === s.row) || office.walkToTile(ch.id, s.col, s.row)) return s;
    }
    return null;
  }

  function release(office, id) {
    gather.delete(id);
    const ch = office.characters.get(id);
    if (ch && !ch.isActive && ch.state === 'idle') ch.wanderTimer = 1 + Math.random() * 3;
  }

  function tickGather(office) {
    const onBreak = enabled && st.mode === 'break' && !paused();
    if (!onBreak) {
      for (const id of [...gather.keys()]) release(office, id);
      return;
    }
    const center = loungeCenter(office);
    if (!center) return;
    for (const id of [...gather.keys()]) {
      const ch = office.characters.get(id);
      if (!ch || !eligible(ch)) gather.delete(id); // got a task: pixel-agents walks it back to its desk
    }
    for (const ch of office.characters.values()) {
      if (!eligible(ch) || ns.idleChat?.partnerOf?.(ch.id) != null) continue; // a chat in the lounge is welcome
      let g = gather.get(ch.id);
      if (!g) {
        const spot = pickSpot(office, ch, center);
        if (!spot) continue;
        gather.set(ch.id, (g = { col: spot.col, row: spot.row, t: 0 }));
      }
      const there = ch.tileCol === g.col && ch.tileRow === g.row;
      if (there && ch.state === 'idle' && ch.path.length === 0) {
        g.arrived = true;
        ch.dir = facing(g, center);
        ch.wanderTimer = Math.max(ch.wanderTimer, 5);
      } else if (!there && ch.state === 'idle' && ch.path.length === 0 && !office.walkToTile(ch.id, g.col, g.row)) {
        gather.delete(ch.id); // unreachable; try another spot next frame
      }
    }
  }

  // ── Clock label + badges ──
  const CUP = ['.#.#...', '..#.#..', '.......', '#####..', '#####.#', '#####.#', '.###...'];
  function draw(canvas, office, offX, offY, zoom) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (st.mode !== 'idle') {
      const label = paused() ? `⏸ ${fmt(remaining())}` : fmt(remaining());
      ctx.font = `${Math.round(6.5 * zoom)}px "FS Pixel Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const f of ns.findFurniture('COZY_CLOCK')) {
        const x = offX + (f.col * 16 + 8) * zoom;
        const y = offY + (f.row * 16 + 35) * zoom;
        const w = ctx.measureText(label).width + 6 * zoom;
        const hgt = 9 * zoom;
        ctx.fillStyle = '#2b1a10';
        ctx.fillRect(Math.round(x - w / 2 - zoom), Math.round(y - hgt / 2 - zoom), Math.round(w + 2 * zoom), Math.round(hgt + 2 * zoom));
        ctx.fillStyle = paused() ? '#9a8a7a' : modeColor();
        ctx.fillRect(Math.round(x - w / 2), Math.round(y - hgt / 2), Math.round(w), Math.round(hgt));
        ctx.fillStyle = '#fff6dc';
        ctx.fillText(label, x, y + zoom * 0.5);
      }
    }
    if (ns.drawBadge) {
      const t = performance.now() / 1000;
      for (const [id, g] of gather) {
        const ch = office.characters.get(id);
        if (!ch || ch.bubbleType || ch.tileCol !== g.col || ch.tileRow !== g.row || ch.state !== 'idle') continue;
        ns.drawBadge(ctx, offX + ch.x * zoom, offY + (ch.y - 25) * zoom, zoom, CUP, '#6ea84e', t * 0.6 + id);
      }
    }
    ctx.restore();
  }

  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (st.mode !== 'idle' && !paused() && remaining() <= 0) {
      // A tab that was closed for a while settles quietly: the break is timed from when focus really ended,
      // and a break that is already over just ends (the next frame), instead of replaying every chime.
      const late = Date.now() - st.endsAt > 60_000;
      advance({ silent: late, from: late ? st.endsAt : undefined });
    }
    tickPanel();
    if (editMode) {
      for (const id of [...gather.keys()]) release(office, id);
      return;
    }
    tickGather(office);
    if (enabled) draw(canvas, office, offX, offY, zoom);
  });

  ns.pomodoro = {
    /** True while a (running) break is gathering villagers; idle activities stand down meanwhile. */
    get isBreak() { return enabled && st.mode === 'break' && !paused(); },
    isGathering: (id) => gather.has(id),
    /** During a break, idle chat only starts between villagers who already made it to the lounge. */
    mayChat: (id) => !(enabled && st.mode === 'break' && !paused()) || !!gather.get(id)?.arrived,
    get state() { return { ...st, remainingMs: remaining() }; },
    start: () => begin('focus'),
    skip: () => advance(),
    stop,
    open,
    setEnabled(on) { enabled = !!on; ns.store.set('pomodoro', enabled ? 'on' : 'off'); },
  };
})();
