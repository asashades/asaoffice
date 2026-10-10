// asaoffice HUD: an always-on overview around the office, in the same cozy look as the other panels.
//   - Left column: the hero card (live sky, six buttons, time and date, one sentence about the office, today's tokens, the
//     to-do of the session in front) and below it the notices: permission questions and plans (until answered) and finished tasks, failures
//     and a villager asking for permission (they slide in from the left and go away by themselves).
//   - Right: one card with a few numbers (data alive, working now, done today) and two tabs: Sekarang (who is working on what, with the session's
//     to-do) and Selesai (the mailbox tasks finished today; click to open the chat).
//   - Bottom: a small capsule per villager (face, status dot, name); the details open as a popup on hover.
// The data comes from the same server messages the office gets (core.js onMessage) and from the data feed. H (or the 🧭 button under the
// zoom buttons) hides the HUD for a clear view; the right card can be minimised. ?hud=off turns it off (remembered).
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
      todoSource: (n) => `Sumber: TodoWrite · ${n} sesi terbaru`, main: 'Freelance', director: 'Direktur', actingFor: 'Bantu Shades',
      atDesk: 'Di meja direktur', noProject: 'Sesi Claude Code', chatWith: (n) => `Ngobrol sama ${n}`,
      planReady: 'Rencana siap', askReady: 'Claude minta izin', askAllowBtn: '✅ Izinkan', askDenyBtn: '⛔ Tolak', approveBtn: '✅ Setujui', rejectBtn: '❌ Tolak', openBtn: 'Buka', morePlans: (n) => `+${n} rencana lagi di kotak surat`,
      perm: 'Izin', emptyPerm: 'Belum ada langkah yang ditolak otomatis.', permSource: 'Langkah yang ditolak otomatis karena di luar izin tugas. Klik buat buka suratnya.', stOpen: 'menunggu', stTerminal: 'jalankan sendiri', stRo: 'Downloads baca-saja', stAllowed: 'diizinkan sekali', clearPerm: 'Abaikan semua',
      seasons: { spring: '🌱 Semi', summer: '☀️ Panas', fall: '🍂 Gugur', winter: '❄️ Dingin' }, openMail: 'Kotak Surat', tabLog: 'Log', tabPay: 'Gaji', emptyLog: 'Belum ada kejadian hari ini.', logSource: 'Kejadian tugas kotak surat hari ini (klik buat buka obrolannya)', stDone: 'selesai', stError: 'gagal', stStopped: 'dihentikan', stAwaiting: 'rencana siap', payIncome: 'Penghasilan hari ini', payStaff: 'Gaji staf (perkiraan)', payFree: (n) => `Freelance (${n} sesi)`, payNet: 'Perkiraan laba', payNote: 'Dibayar besok pagi di kartu Selamat pagi.', payFreeTitle: 'Freelance hari ini', payNoFree: 'Belum ada freelance yang bekerja hari ini.', payRates: 'Tarif freelance per aktivitas', actKinds: { edit: 'edit', search: 'baca', command: 'perintah', web: 'web', agent: 'subagent' }, freelance: 'Freelance', openReport: 'Tulis laporan harian', tokToday: (a, b) => (b ? `Token ${a} / ${b}` : `Token ${a} hari ini`), tokTip: 'Token yang dipakai hari ini dibanding batas harian (klik buat atur)', popFolder: 'Folder', popTask: 'Tugas', popNow: 'Sekarang', openShelf: 'Rak Buku', openStaff: 'Data karyawan (jiwa dan ingatan staf)', openEnd: 'Pendapatan kemarin', kasTip: 'Kas kantor · klik buat ke Toko', idea: 'Catat ide (N)', ideaPh: '💡 Catat ide, Enter simpan, Esc batal', ideaSaved: '💡 Tersimpan di Ide & TODO', ideaFail: 'Gak bisa nyimpen: buka dari Mac yang jalanin kantor.',
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
      todoSource: (n) => `Source: TodoWrite · ${n} latest sessions`, main: 'Freelance', director: 'Director', actingFor: 'Helping Shades',
      atDesk: "At the director's desk", noProject: 'Claude Code session', chatWith: (n) => `Chatting with ${n}`,
      planReady: 'Plan ready', askReady: 'Claude asks permission', askAllowBtn: '✅ Allow', askDenyBtn: '⛔ Deny', approveBtn: '✅ Approve', rejectBtn: '❌ Reject', openBtn: 'Open', morePlans: (n) => `+${n} more plans in the mailbox`,
      perm: 'Permissions', emptyPerm: 'Nothing has been refused automatically.', permSource: 'Steps refused automatically because they were outside the task’s permissions. Click to open the letter.', stOpen: 'waiting', stTerminal: 'run it yourself', stRo: 'Downloads read-only', stAllowed: 'allowed once', clearPerm: 'Dismiss all',
      seasons: { spring: '🌱 Spring', summer: '☀️ Summer', fall: '🍂 Fall', winter: '❄️ Winter' }, openMail: 'Mailbox', tabLog: 'Log', tabPay: 'Pay', emptyLog: 'Nothing has happened yet today.', logSource: 'Mailbox task events today (click to open the chat)', stDone: 'done', stError: 'failed', stStopped: 'stopped', stAwaiting: 'plan ready', payIncome: 'Earned today', payStaff: 'Staff pay (estimate)', payFree: (n) => `Freelance (${n} session${n === 1 ? '' : 's'})`, payNet: 'Estimated profit', payNote: 'Paid tomorrow morning on the Good morning card.', payFreeTitle: 'Freelancers today', payNoFree: 'No freelancer has worked today.', payRates: 'Freelance rates per activity', actKinds: { edit: 'edits', search: 'reads', command: 'commands', web: 'web', agent: 'sub-agents' }, freelance: 'Freelance', openReport: 'Write the daily report', tokToday: (a, b) => (b ? `Tokens ${a} / ${b}` : `Tokens ${a} today`), tokTip: 'Tokens used today against the daily limit (click to set)', popFolder: 'Folder', popTask: 'Task', popNow: 'Now', openShelf: 'Bookshelf', openStaff: 'Employee records (staff souls and memories)', openEnd: "Yesterday's income", kasTip: 'Office cash · click to open the shop', idea: 'Jot an idea (N)', ideaPh: '💡 Jot an idea, Enter to save, Esc to cancel', ideaSaved: '💡 Saved to Ideas & TODO', ideaFail: 'Could not save: open it from the Mac that runs the office.',
    },
  });

  const COLORS = ['#d8643f', '#6fa65a', '#9a6fbf', '#c8503c', '#8a5aa8', '#3f8f8a', '#4fa3a0', '#e07a9a', '#c98a3a', '#5a8ac8', '#8a6a4a', '#e08a4a', '#2f3a56'];
  const STATE = {
    bekerja: { css: '#3f8a36', label: S.working }, santai: { css: '#8a7a68', label: S.idle }, selesai: { css: '#2a8a96', label: S.done },
    nunggu: { css: '#3f74b8', label: S.waiting }, izin: { css: '#c8801f', label: S.permission }, standby: { css: '#6a6f9a', label: S.standby },
  };
  const DONE_SHOW_MS = 45_000;

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
  /* The full-width rows only lay their cards out: the empty space between the cards must let clicks through to the office
     (the wall's mailbox and boards sit right under the top row). The id selector is needed to beat the rule above. */
  #asa-hud > .hud-left, #asa-hud > .hud-bottom { pointer-events: none; }
  .hud-cards { pointer-events: none; } .hud-card { pointer-events: auto; }
  #asa-hud button { font: inherit; color: inherit; }
  .hud-box { background: #f4e6c4; border: 3px solid #744122; box-shadow: inset 0 0 0 2px #dca05f, 0 4px 0 rgba(0,0,0,0.25); }
  /* Left column: the hero card (clock, to-do, what waits for you, tokens), and below it the notices: permission questions, plans, finished tasks. */
  .hud-left { position: fixed; top: 8px; left: 64px; width: 196px; display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
  .hud-left > * { pointer-events: auto; }
  .hud-hero { position: relative; flex: none; overflow: hidden; padding: 0; }
  .hud-sky { position: absolute; top: 0; left: 0; width: 100%; height: 84px; image-rendering: pixelated; display: block; }
  .hud-quick { position: absolute; top: 5px; left: 5px; display: grid; grid-template-columns: repeat(3, 34px); gap: 3px; }
  .hud-quick button { position: relative; width: 34px; height: 34px; padding: 0; cursor: pointer; font-size: 18px; line-height: 1;
    background: rgba(244,230,196,0.93); border: 2px solid #744122; box-shadow: 0 2px 0 rgba(0,0,0,0.25); }
  .hud-quick button:hover { background: #fbf0d3; }
  .hud-quick button.attn { animation: hud-pulse 1.5s ease-in-out infinite; }
  @keyframes hud-pulse { 0%, 100% { box-shadow: 0 2px 0 rgba(0,0,0,0.25), 0 0 0 0 rgba(242,201,76,0.9); } 50% { box-shadow: 0 2px 0 rgba(0,0,0,0.25), 0 0 0 5px rgba(242,201,76,0); } }
  @media (prefers-reduced-motion: reduce) { .hud-quick button.attn { animation: none; outline: 3px solid #f2c94c; } }
  .hud-kas { flex: none; height: 24px; padding: 0 6px; display: inline-flex; align-items: center; font-size: 12px; background: #fffbe9; border: 2px solid #744122; box-shadow: 0 2px 0 rgba(0,0,0,0.25); white-space: nowrap; }
  .hud-kas[hidden] { display: none; }
  .hud-kas { cursor: pointer; }
  .hud-kas:hover { background: #fff4d0; }
  .hud-badge { position: absolute; top: -7px; right: -7px; min-width: 17px; height: 17px; padding: 0 3px; background: #c8503c; color: #fff6dc;
    font-size: 11px; line-height: 17px; text-align: center; border: 2px solid #973a2f; box-sizing: content-box; }
  .hud-badge:empty { display: none; }
  .hud-plate { position: absolute; top: 5px; right: 5px; padding: 3px 7px 4px; text-align: right; background: rgba(244,230,196,0.93);
    border: 2px solid #744122; box-shadow: 0 2px 0 rgba(0,0,0,0.25); }
  .hud-plate b { display: block; font-weight: normal; font-size: 20px; line-height: 1.05; color: #3a2117; }
  .hud-plate span { display: block; font-size: 11.5px; line-height: 1.25; color: #744122; white-space: nowrap; }
  .hud-status { position: relative; margin-top: 84px; padding: 5px 7px 6px; background: rgba(244,230,196,0.97); border-top: 3px solid #744122; font-size: 12.5px; line-height: 1.3; display: flex; flex-direction: column; gap: 4px; }
  .hud-phase { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 12px; color: #744122; }
  .hud-idea { order: -1; width: 100%; height: 28px; box-sizing: border-box; border: 2px solid #744122; padding: 0 8px; background: #fffbe9; color: #3a2117;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 14px; outline: 0; }
  .hud-idea[hidden] { display: none; }
  .hud-meta { display: flex; gap: 6px; align-items: center; }
  .hud-tok { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 11.5px; }
  .hud-tok[hidden] { display: none; }
  .hud-tokbar { height: 7px; background: #d9c49a; border: 1px solid #744122; }
  .hud-tokbar i { display: block; height: 100%; background: #4a8a52; }
  .hud-tok.warn .hud-tokbar i { background: #c8801f; } .hud-tok.over .hud-tokbar i { background: #c8503c; }
  .hud-tok span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hud-todo1 { display: block; width: 100%; text-align: left; padding: 2px 0 0; border: 0; border-top: 1px dashed #c9a877; background: none; cursor: pointer; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hud-todo1[hidden] { display: none; }
  .hud-livedot { flex: none; align-self: center; width: 9px; height: 9px; margin: 0 6px; background: #4f9a45; border: 1px solid rgba(58,33,23,0.5); }
  .hud-livedot.off { background: #c8503c; } .hud-livedot.none { background: #9a8a7a; }
  .hud-pay-row { display: flex; justify-content: space-between; gap: 8px; padding: 5px 12px; border-top: 1px dashed #dcc79a; font-size: 13px; }
  .hud-pay-row b { font-weight: normal; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .hud-pay-row.net { border-top: 2px solid #c9a877; font-size: 14px; } .hud-pay-row.net b { font-size: 16px; }
  .hud-pay-row.gain b { color: #b86e00; } .hud-pay-row.lose b { color: #c8503c; }
  .hud-free { padding: 5px 12px; border-top: 1px dashed #dcc79a; } .hud-free .h { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
  .hud-free .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .hud-free .c { font-size: 11.5px; opacity: 0.7; }
  .hud-dot { display: inline-block; width: 8px; height: 8px; margin-right: 5px; background: #4f9a45; }
  .hud-dot.off { background: #c8503c; } .hud-dot.none { background: #9a8a7a; }
  .hud-pending, .hud-notes { display: flex; flex-direction: column; gap: 6px; }
  .hud-pending:empty, .hud-notes:empty { display: none; }
  .hud-pending > *, .hud-notes > * { pointer-events: auto; }
  .hud-note { position: relative; padding: 6px 24px 7px 9px; cursor: pointer; border-color: #3f8a36; box-shadow: inset 0 0 0 2px #a9d49b, 0 4px 0 rgba(0,0,0,0.25); animation: hud-note-in 0.22s ease-out; }
  .hud-note.permission { border-color: #c8801f; box-shadow: inset 0 0 0 2px #f0c987, 0 4px 0 rgba(0,0,0,0.25); }
  .hud-note b { display: block; font-weight: normal; font-size: 13.5px; line-height: 1.3; }
  .hud-note small { display: block; font-size: 11.5px; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hud-note .x { position: absolute; top: 2px; right: 3px; width: 20px; height: 20px; padding: 0; line-height: 1; font-size: 15px; cursor: pointer; background: none; border: 0; opacity: 0.6; }
  .hud-note .x:hover { opacity: 1; }
  @keyframes hud-note-in { from { transform: translateX(-28px); opacity: 0; } to { transform: none; opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .hud-note { animation: none; } }
  .hud-plan { padding: 4px 7px 5px; border-color: #3f74b8; box-shadow: inset 0 0 0 2px #9fc2ea, 0 3px 0 rgba(0,0,0,0.25); animation: hud-plan-in 0.2s ease-out; }
  .hud-plan.hud-ask { border-color: #c8801f; box-shadow: inset 0 0 0 2px #f0c987, 0 3px 0 rgba(0,0,0,0.25); }
  .hud-plan.hud-ask small { color: #a8650f; }
  .hud-plan.hud-ask .t { font-family: ui-monospace, Menlo, monospace; font-size: 11px; word-break: break-all; }
  .hud-plan small { display: block; font-size: 11px; line-height: 1.25; color: #3f74b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hud-plan .t { font-size: 12px; line-height: 1.25; margin: 1px 0 4px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
  .hud-plan .b { display: flex; gap: 4px; }
  .hud-plan button { padding: 1px 7px; font-size: 11.5px; cursor: pointer; background: #fffbe9; border: 2px solid #744122; box-shadow: 0 2px 0 #744122; line-height: 1.3; }
  .hud-plan button.go { background: #c8503c; color: #fff6dc; border-color: #973a2f; box-shadow: 0 2px 0 #973a2f; }
  .hud-plan button:disabled { opacity: 0.5; cursor: default; }
  .hud-more { font-size: 12px; opacity: 0.75; padding: 0 4px; }
  @keyframes hud-plan-in { from { transform: translateY(-6px); opacity: 0; } to { transform: none; opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .hud-plan { animation: none; } }
  .hud-side { position: fixed; top: 8px; right: 12px; width: 280px; max-height: calc(100vh - 80px); display: flex; flex-direction: column; overflow: hidden; }
  .hud-tabs { display: flex; align-items: stretch; border-bottom: 2px solid #c9a877; }
  .hud-tabs button { flex: 1 1 auto; min-width: 0; background: none; border: 0; border-bottom: 3px solid transparent; padding: 7px 1px; font-size: 11.5px; cursor: pointer; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hud-tabs button.on { opacity: 1; border-bottom-color: #973a2f; }
  .hud-tabs .n[hidden] { display: none; }
  .hud-tabs .n { display: inline-block; min-width: 14px; margin-left: 2px; padding: 0 2px; background: #e6d3a6; font-size: 11px; line-height: 15px; }
  .hud-tabs .min { flex: none; width: 34px; border-left: 2px solid #c9a877; cursor: pointer; }
  .hud-side.min .hud-scroll { display: none; }
  .hud-side.min .hud-tabs { border-bottom: 0; }
  .hud-side.min .hud-tabs .min { transform: rotate(180deg); }
  .hud-scroll { overflow-y: auto; flex: 0 1 auto; scrollbar-width: thin; scrollbar-color: #b8935c transparent; }
  .hud-pane { display: none; padding: 6px 0 10px; } .hud-pane.on { display: block; }
  .hud-src { padding: 4px 12px 6px; font-size: 11px; opacity: 0.7; }
  .hud-clear { font: inherit; font-size: 11px; margin-left: 8px; padding: 1px 6px; cursor: pointer; color: inherit; background: #fff6dc; border: 1px solid currentColor; }
  .hud-empty { padding: 16px 12px; text-align: center; font-size: 12.5px; opacity: 0.7; }
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
  .hud-bottom { position: fixed; left: 230px; right: 12px; bottom: 8px; display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
  .hud-bottom > * { pointer-events: auto; }
  .hud-cards { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 2px 2px; overflow: visible; }
  /* A small capsule per person: face, status dot, name. The details open as a popup while the pointer is on it. */
  .hud-card { flex: none; position: relative; display: inline-flex; align-items: center; gap: 6px; max-width: 170px; padding: 3px 9px 3px 4px; text-align: left; cursor: pointer;
    border-width: 2px; box-shadow: inset 0 0 0 1px #dca05f, 0 2px 0 rgba(0,0,0,0.25); }
  .hud-card:hover, .hud-card:focus-visible { background: #fbf0d3; }
  .hud-card:focus-visible { outline: 3px solid #3f74b8; outline-offset: 1px; }
  .hud-card.sel { border-color: #973a2f; }
  .hud-card.fl { border-style: dashed; }
  .hud-face { flex: none; width: 22px; height: 36px; image-rendering: pixelated; background-repeat: no-repeat; background-size: 154px 132px;
    background-position: -22px -3px; background-color: #dca05f; border: 2px solid #744122; box-sizing: content-box; }
  .hud-card .nm { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .hud-sdot { flex: none; width: 9px; height: 9px; border: 1px solid rgba(58,33,23,0.55); }
  .hud-card .pop { display: none; position: absolute; left: 0; bottom: calc(100% + 8px); z-index: 6; width: 250px; padding: 8px 10px 9px; pointer-events: none; cursor: default;
    background: #f4e6c4; border: 3px solid #744122; box-shadow: inset 0 0 0 2px #dca05f, 0 4px 0 rgba(0,0,0,0.25); font-size: 12.5px; line-height: 1.35; white-space: normal; }
  .hud-card:nth-last-child(-n+2) .pop { left: auto; right: 0; }
  .hud-card:hover .pop, .hud-card:focus-visible .pop { display: block; }
  .hud-pop-h { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
  .hud-pop-h b { font-weight: normal; font-size: 14px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hud-pop .role { display: block; color: #973a2f; font-size: 12px; }
  .hud-pop .row { display: block; margin-top: 3px; overflow-wrap: anywhere; }
  .hud-pop .row small { opacity: 0.65; margin-right: 4px; }
  /* The rule "#asa-hud button { font: inherit }" above beats the class rules, and the page's own font size is 22px: the buttons that need their own size say it with the id too. */
  #asa-hud .hud-tabs button { font-size: 12px; }
  #asa-hud .hud-quick button { font-size: 17px; }
  #asa-hud .hud-plan button { font-size: 11.5px; display: inline-flex; align-items: center; gap: 3px; }
  #asa-hud .hud-todo1 { font-size: 12px; }
  #asa-hud .hud-note .x { font-size: 15px; }
  #asa-hud .hud-clear { font-size: 11px; }
  #asa-hud .hud-card { font-size: 13px; }
  @media (max-width: 1180px) { .hud-side { width: 280px; } }
  @media (max-width: 820px) {
    .hud-left { left: 60px; right: 8px; width: auto; }
    .hud-hero { width: auto; }
    .hud-bottom { left: 8px; right: 8px; bottom: 62px; }
    .hud-side { position: static; width: auto; height: auto !important; max-height: none; }
    .hud-side .hud-scroll { max-height: 30vh; min-height: 0; }
  }
  `;

  // ── State ──
  const doneAt = new Map(); // id -> when it stopped working
  const wasActive = new Map();
  let tab = 'log';
  let hidden = ns.store.get('hudHidden') === '1';
  let min = ns.store.get('hudMin') === null ? matchMedia('(max-width: 820px)').matches : ns.store.get('hudMin') === '1';

  // ── Building blocks ──
  const root = document.createElement('div');
  root.id = 'asa-hud';
  root.innerHTML = `
    <div class="hud-left">
      <div class="hud-hero hud-box">
        <canvas class="hud-sky" id="hud-sky" width="120" height="40" aria-hidden="true"></canvas>
        <div class="hud-quick">
          <button type="button" data-open="mail" title="${esc(S.openMail)}" aria-label="${esc(S.openMail)}">📮<i class="hud-badge" id="hud-badge"></i></button>
          <button type="button" data-open="shelf" title="${esc(S.openShelf)}" aria-label="${esc(S.openShelf)}">📚</button>
          <button type="button" data-open="staff" title="${esc(S.openStaff)}" aria-label="${esc(S.openStaff)}">👥</button>
          <button type="button" data-open="idea" title="${esc(S.idea)}" aria-label="${esc(S.idea)}">💡</button>
          <button type="button" id="hud-end" data-open="end" title="${esc(S.openEnd)}" aria-label="${esc(S.openEnd)}">🌙</button>
          <button type="button" data-open="report" title="${esc(S.openReport)}" aria-label="${esc(S.openReport)}">📜</button>
        </div>
        <div class="hud-plate"><b id="hud-time"></b><span id="hud-date"></span><span id="hud-season"></span></div>
        <div class="hud-status">
          <span class="hud-phase" id="hud-phase"></span>
          <div class="hud-meta">
            <div class="hud-tok" id="hud-tok" hidden><div class="hud-tokbar"><i id="hud-tokfill"></i></div><span id="hud-toktxt"></span></div>
            <span class="hud-kas" id="hud-kas" hidden title="${esc(S.kasTip)}"></span>
          </div>
          <button type="button" class="hud-todo1" id="hud-todo1" data-opentab="log" hidden></button>
          <input class="hud-idea" id="hud-idea" type="text" maxlength="500" hidden placeholder="${esc(S.ideaPh)}" aria-label="${esc(S.idea)}">
        </div>
      </div>
      <div class="hud-pending" id="hud-pending"></div>
      <div class="hud-notes" id="hud-notes" aria-live="polite"></div>
    </div>
    <aside class="hud-side hud-box">
      <div class="hud-tabs" role="tablist">
        <button type="button" role="tab" data-tab="log">${esc(S.tabLog)}<span class="n" id="hud-n-log">0</span></button>
        <button type="button" role="tab" data-tab="pay">${esc(S.tabPay)}</button>
        <i class="hud-livedot" id="hud-live"></i>
        <button type="button" class="min" title="${esc(S.min)}" aria-label="${esc(S.min)}">▾</button>
      </div>
      <div class="hud-scroll">
        <section class="hud-pane" data-pane="log" id="hud-log"></section>
        <section class="hud-pane" data-pane="pay" id="hud-pay"></section>
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
    const planBtn = e.target.closest('[data-plan]');
    if (planBtn) {
      const l = (ns.data?.mail ?? []).find((x) => x.id === planBtn.dataset.id);
      if (!l) return;
      if (planBtn.dataset.plan.startsWith('ask-')) { planBtn.disabled = true; ns.mailbox?.answerAsk(l.id, planBtn.dataset.ask, planBtn.dataset.plan === 'ask-allow' ? 'allow' : 'deny'); return; }
      if (planBtn.dataset.plan === 'approve') { planBtn.disabled = true; ns.mailbox?.approve(l, planBtn); }
      else if (planBtn.dataset.plan === 'reject') { planBtn.disabled = true; ns.mailbox?.reject(l); }
      else ns.mailbox?.openLetter(l.id);
      return;
    }
    if (e.target.closest('[data-clear-perm]')) {
      ns.mailbox?.clearDenials();
      return;
    }
    const permRow = e.target.closest('[data-letter]');
    if (permRow) { ns.mailbox?.openLetter(permRow.dataset.letter); return; }
    if (e.target.closest('#hud-kas')) { ns.shop?.open(); return; }
    if (e.target.closest('#hud-tok')) { ns.budget?.open(); return; }
    const tabOpen = e.target.closest('[data-opentab]');
    if (tabOpen) { tab = tabOpen.dataset.opentab; min = false; ns.store.set('hudMin', '0'); applyChrome(); return; }
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) {
      if (openBtn.dataset.open === 'idea') toggleIdea(true);
      else if (openBtn.dataset.open === 'end') ns.dayEnd?.open();
      else if (openBtn.dataset.open === 'report') ns.report?.open();
      else if (openBtn.dataset.open === 'staff') ns.souls?.open();
      else (openBtn.dataset.open === 'mail' ? ns.mailbox : ns.shelf)?.open();
      return;
    }
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
  const last = { cards: '', now: '', done: '', phase: '', pending: '', tok: '', todo1: '' };
  function setHtml(el, html, key) {
    if (last[key] !== html) { el.innerHTML = html; last[key] = html; }
  }
  function render(office) {
    const now = Date.now();
    const chars = [...office.characters.values()].filter((c) => c.matrixEffect !== 'despawn' && !c.isGreeter);
    for (const c of chars) {
      const name = ns.villagerName(c);
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
    const age = ns.data?.generatedAt ? now - Date.parse(ns.data.generatedAt) : null;
    const live = age === null ? 'none' : age < 150_000 ? 'ok' : 'off';
    { const el = $('hud-live'); const cls = `hud-livedot${live === 'ok' ? '' : ` ${live}`}`; if (el.className !== cls) el.className = cls; el.title = live === 'ok' ? S.live : live === 'off' ? S.dead : S.nodata; }
    let phase;
    if (!mains.length) phase = S.phaseEmpty;
    else if (workingMains.length) phase = S.phaseWork(workingMains.map((c) => ns.villagerName(c)).join(', '), workingSubs);
    else if (workingSubs) phase = S.phaseSubs(workingSubs);
    else phase = S.phaseIdle;
    if (last.phase !== phase) { $('hud-phase').textContent = phase; $('hud-phase').title = phase; last.phase = phase; }

    // Cards: Shades first, then sessions, staff acting, helpers.
    const order = (c) => (c.asaShades || c.asaDirector ? 0 : isReal(c) ? 1 : c.asaActing ? 2 : 3);
    const cards = chars.filter((c) => !c.asaResident).sort((a, b) => order(a) - order(b) || a.id - b.id).map((c) => {
      const st = stateOf(c, now);
      const ui = STATE[st];
      const { task, act } = lines(office, c, st);
      const sel = office.selectedAgentId === c.id;
      const face = `background-image:url(${esc(ns.portraitUrl(c))})${c.hueShift ? `;filter:hue-rotate(${c.hueShift}deg)` : ''}`;
      const nm = ns.villagerName(c);
      const proj = !c.isSubagent && !c.asaShades ? c.folderName || '' : '';
      const detail = [
        `<span class="hud-pop-h"><b>${esc(nm)}</b><span class="hud-chip" style="color:${ui.css}">${esc(ui.label)}</span></span>`,
        `<span class="role">${esc(roleOf(office, c))}</span>`,
        task ? `<span class="row"><small>${esc(S.popTask)}</small>${esc(clip(task, 140))}</span>` : '',
        act ? `<span class="row"><small>${esc(S.popNow)}</small>${esc(clip(act, 140))}</span>` : '',
        proj && proj !== task ? `<span class="row"><small>${esc(S.popFolder)}</small>${esc(proj)}</span>` : '',
      ].join('');
      const fl = isReal(c) && !c.asaShades && !c.asaDirector && !ns.staffOf?.(c);
      return `<button type="button" class="hud-card hud-box${sel ? ' sel' : ''}${fl ? ' fl' : ''}" data-id="${c.id}" aria-label="${esc(`${nm}: ${ui.label}`)}"><span class="hud-face" style="${face}"></span><span class="nm">${esc(nm)}</span><i class="hud-sdot" style="background:${ui.css}"></i><span class="pop hud-pop">${detail}</span></button>`;
    });
    setHtml($('hud-cards'), cards.join(''), 'cards');

    // Hero card: today's tokens and the to-do of the session in front (what waits for you has its own cards below, and the mailbox button its badge)
    const b = ns.data?.budget;
    const tokEl = $('hud-tok');
    if (!b) { if (!tokEl.hidden) tokEl.hidden = true; last.tok = ''; } else {
      const spent = b.spentToday ?? 0;
      const pct = b.day ? Math.min(100, (spent / b.day) * 100) : 0;
      const key = `${spent}|${b.day}`;
      if (last.tok !== key) {
        last.tok = key;
        tokEl.hidden = false;
        tokEl.title = S.tokTip;
        tokEl.classList.toggle('warn', pct >= 80 && pct < 100);
        tokEl.classList.toggle('over', pct >= 100);
        $('hud-tokfill').style.width = `${b.day ? pct : 0}%`;
        $('hud-toktxt').textContent = S.tokToday(ns.fmtTokens(spent), b.day ? ns.fmtTokens(b.day) : null);
        tokEl.querySelector('.hud-tokbar').hidden = !b.day;
      }
    }
    const withOpen = (ns.data?.tasks ?? []).find((x) => x.todos?.some((t) => t.status !== 'completed'));
    let todoHtml = '';
    if (withOpen) {
      const doneN = withOpen.todos.filter((t) => t.status === 'completed').length;
      const cur = withOpen.todos.find((t) => t.status === 'in_progress') ?? withOpen.todos.find((t) => t.status !== 'completed');
      todoHtml = `▶ ${esc(clip(cur.status === 'in_progress' && cur.activeForm ? cur.activeForm : cur.content, 60))} <small style="opacity:.65">${doneN}/${withOpen.todos.length}</small>`;
    }
    if (last.todo1 !== todoHtml) { last.todo1 = todoHtml; const t1 = $('hud-todo1'); t1.innerHTML = todoHtml; t1.hidden = !todoHtml; }

    // Plans waiting for you: approve or reject without opening the mailbox
    const waiting = (ns.data?.mail ?? []).filter((l) => l.status === 'awaiting' && !l.report && !l.archived).slice(0, 3);
    const moreWaiting = (ns.data?.mail ?? []).filter((l) => l.status === 'awaiting' && !l.report && !l.archived).length - waiting.length;
    // Permission questions of running tasks: answer them from here, with the whole command in view
    const askCards = (ns.data?.mail ?? []).filter((l) => !l.archived && l.status === 'running').flatMap((l) => (l.asks ?? []).filter((a) => a.state === 'open').map((a) => ({ l, a }))).slice(0, 3)
      .map(({ l, a }) => `<div class="hud-plan hud-ask hud-box"><small>🔐 ${esc(S.askReady)} · ${esc([l.name ?? '', l.project ?? ''].filter(Boolean).join(' · '))}</small><div class="t" title="${esc(a.text)}">${esc(`${a.tool}: ${a.text}`)}</div><div class="b"><button type="button" class="go" data-plan="ask-allow" data-id="${esc(l.id)}" data-ask="${esc(a.id)}">${esc(S.askAllowBtn)}</button><button type="button" data-plan="ask-deny" data-id="${esc(l.id)}" data-ask="${esc(a.id)}">${esc(S.askDenyBtn)}</button><button type="button" data-plan="open" data-id="${esc(l.id)}">${esc(S.openBtn)}</button></div></div>`).join('');
    const pendingHtml = askCards + waiting.map((l) => `<div class="hud-plan hud-box"><small>📝 ${esc(S.planReady)} · ${esc([l.name ?? '', l.project ?? ''].filter(Boolean).join(' · '))}</small><div class="t" title="${esc(l.title)}">${esc(l.title)}</div><div class="b"><button type="button" class="go" data-plan="approve" data-id="${esc(l.id)}">${esc(S.approveBtn)}</button><button type="button" data-plan="reject" data-id="${esc(l.id)}">${esc(S.rejectBtn)}</button><button type="button" data-plan="open" data-id="${esc(l.id)}">${esc(S.openBtn)}</button></div></div>`).join('')
      + (moreWaiting > 0 ? `<div class="hud-more">${esc(S.morePlans(moreWaiting))}</div>` : '');
    setHtml($('hud-pending'), pendingHtml, 'pending');

    // "Log": what happened to the mailbox tasks today. "Gaji": what the office earned today, what the staff and the freelancers cost.
    const todayKey = localDay(now);
    const stLabel = { done: S.stDone, error: S.stError, stopped: S.stStopped, awaiting: S.stAwaiting };
    const stColor = { done: STATE.selesai.css, error: '#c8503c', stopped: '#9a8a7a', awaiting: '#3f74b8' };
    const events = (ns.data?.mail ?? []).filter((l) => !l.report && !l.archived && stLabel[l.status] && [l.finishedAt, l.createdAt].some((t) => t && localDay(Date.parse(t)) === todayKey))
      .sort((x, y) => Date.parse(y.finishedAt ?? y.createdAt) - Date.parse(x.finishedAt ?? x.createdAt));
    const logHtml = `<div class="hud-src">${esc(S.logSource)}</div>` + (events.length ? events.slice(0, 40).map((l) => {
      const css2 = stColor[l.status];
      const at = Date.parse(l.finishedAt ?? l.createdAt);
      const meta = [l.name ?? 'Claude', l.project, l.status !== 'done' ? stLabel[l.status] : '', l.tokens ? `${ns.fmtTokens(l.tokens)} token` : ''].filter(Boolean).join(' · ');
      return `<div class="hud-run" data-letter="${esc(l.id)}" style="cursor:pointer"><i style="background:${css2}"></i><span class="t" title="${esc(l.title)}">${esc(l.title)}</span><span class="hud-chip" style="color:${css2}">${esc(clock(fmtMin, at))}</span><span class="w">${esc(meta)}</span></div>`;
    }).join('') : `<div class="hud-empty">${esc(S.emptyLog)}</div>`);
    setHtml($('hud-log'), logHtml, 'now');
    $('hud-n-log').textContent = String(events.length);
    const bd = ns.dayEnd?.board?.();
    if (bd) {
      const g = (n) => `${Math.round(n).toLocaleString(locale)}g`;
      const kinds = (c) => Object.keys(S.actKinds).filter((k) => c[k]).map((k) => `${c[k]} ${S.actKinds[k]}`).join(' · ');
      const payHtml = `<div class="hud-pay-row"><span>${esc(S.payIncome)}</span><b>+${g(bd.income)}</b></div>`
        + `<div class="hud-pay-row"><span>👥 ${esc(S.payStaff)}</span><b>−${g(bd.pay.total)}</b></div>`
        + `<div class="hud-pay-row"><span>🧑‍💻 ${esc(S.payFree(bd.freelance.rows.length))}</span><b>−${g(bd.freelance.total)}</b></div>`
        + `<div class="hud-pay-row net ${bd.net >= 0 ? 'gain' : 'lose'}"><span>${esc(S.payNet)}</span><b>${bd.net >= 0 ? '+' : '−'}${g(Math.abs(bd.net))}</b></div>`
        + `<div class="hud-src">${esc(S.payNote)}</div><div class="hud-src" style="padding-top:8px"><b style="font-weight:normal">${esc(S.payFreeTitle)}</b></div>`
        + (bd.freelance.rows.length ? bd.freelance.rows.map((r) => `<div class="hud-free"><div class="h"><span class="t" title="${esc(r.title)}">${esc(r.title)}</span><b style="font-weight:normal">${g(r.amount)}</b></div><div class="c">${esc([r.project, kinds(r.counts)].filter(Boolean).join(' · '))}</div></div>`).join('') : `<div class="hud-empty">${esc(S.payNoFree)}</div>`)
        + `<div class="hud-src">${esc(S.payRates)}: ${Object.keys(bd.rates).map((k) => `${S.actKinds[k]} ${bd.rates[k]}g`).join(' · ')}</div>`;
      setHtml($('hud-pay'), payHtml, 'done');
    }
    for (const n of root.querySelectorAll('.hud-tabs .n')) n.hidden = n.textContent === '0';
  }

  // ── Quick capture: one line into the bookshelf's Ide-TODO.md without opening anything ──
  const ideaBox = $('hud-idea');
  let ideaTimer = null;
  function toggleIdea(on) {
    if (!on) { ideaBox.hidden = true; return; }
    ideaBox.hidden = false;
    ideaBox.focus();
  }
  ideaBox.addEventListener('keydown', async (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { ideaBox.value = ''; toggleIdea(false); return; }
    if (e.key !== 'Enter' || !ideaBox.value.trim()) return;
    const text = ideaBox.value;
    try {
      await ns.refreshData();
      await ns.shelf?.addIdea(text);
      ideaBox.value = '';
      ideaBox.placeholder = S.ideaSaved;
      ideaBox.blur();
      clearTimeout(ideaTimer);
      ideaTimer = setTimeout(() => { toggleIdea(false); ideaBox.placeholder = S.ideaPh; }, 1600);
    } catch { ideaBox.value = ''; ideaBox.placeholder = S.ideaFail; clearTimeout(ideaTimer); ideaTimer = setTimeout(() => { toggleIdea(false); ideaBox.placeholder = S.ideaPh; }, 2600); }
  });
  ideaBox.addEventListener('blur', () => { if (!ideaBox.value && ideaBox.placeholder === S.ideaPh) toggleIdea(false); });
  addEventListener('keydown', (e) => {
    if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest?.('input, textarea, select, [contenteditable]') && !ns.panel.isOpen && !hidden) {
      e.preventDefault();
      toggleIdea(true);
    }
  });

  // ── Hero card: clock, date, season and the sky (once a second) ──
  const seasonNow = () => ns.garden?.season?.() ?? ['winter', 'spring', 'summer', 'fall'][Math.floor(((new Date().getMonth() + 1) % 12) / 3)];
  let lastSky = 0;
  const lastHero = { time: '', date: '', season: '', badge: '' };
  function tickHero() {
    const d = new Date();
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');
    const date = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    const season = S.seasons[seasonNow()] ?? '';
    if (lastHero.time !== time) { $('hud-time').textContent = time; lastHero.time = time; }
    if (lastHero.date !== date) { $('hud-date').textContent = date; lastHero.date = date; }
    if (lastHero.season !== season) { $('hud-season').textContent = season; lastHero.season = season; }
    const unread = ns.mailbox?.unread?.() ?? 0;
    const badge = unread > 0 ? String(Math.min(unread, 99)) : '';
    if (lastHero.badge !== badge) { $('hud-badge').textContent = badge; lastHero.badge = badge; }
    $('hud-end').classList.toggle('attn', !!ns.dayEnd?.pending?.());
    const kas = ns.dayEnd?.kas?.();
    const kasEl = $('hud-kas');
    kasEl.hidden = kas == null;
    if (kas != null && kasEl.dataset.v !== String(kas)) { kasEl.dataset.v = String(kas); kasEl.textContent = `💰 ${kas.toLocaleString(locale)}g`; }
    ns.sky?.draw($('hud-sky'), ns.dayNight?.hour?.() ?? d.getHours() + d.getMinutes() / 60, seasonNow());
  }

  // Notices in the left column (finished tasks, failures, a villager asking for permission): they slide in under the permission and plan cards and go away by themselves.
  const MAX_NOTES = 3;
  function notice({ kind = 'done', icon = '✅', title = '', body = '', onOpen = null, ms = 10_000 }) {
    if (hidden) return false;
    const box = $('hud-notes');
    if (!box) return false;
    const el = document.createElement('div');
    el.className = `hud-note hud-box ${kind === 'permission' ? 'permission' : ''}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<b>${esc(icon)} ${esc(title)}</b>${body ? `<small>${esc(body)}</small>` : ''}<button type="button" class="x" aria-label="×">×</button>`;
    const close = () => el.remove();
    el.addEventListener('click', (e) => { if (e.target.closest('.x')) return close(); try { onOpen?.(); } catch { /* the target is gone */ } close(); });
    box.prepend(el);
    while (box.children.length > MAX_NOTES) box.lastChild.remove();
    setTimeout(close, ms);
    return true;
  }

  let lastRender = 0;
  ns.onFrame((canvas, office) => {
    if (performance.now() - lastSky > 1000 && !hidden) { lastSky = performance.now(); tickHero(); }
    const now = performance.now();
    if (!office?.characters || now - lastRender < 500) return;
    lastRender = now;
    render(office);
  });
  ns.hud = { hide: () => setHidden(true), show: () => setHidden(false), get hidden() { return hidden; }, notice };
})();
