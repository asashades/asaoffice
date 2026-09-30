// asaoffice mailbox: click the mailbox on the wall to send work to Claude Code and read the results as letters.
//   - "Tugas baru": pick who (plain Claude or an installed staff member), which project, and what to do. The office
//     runs it headless on this Mac (tools/lib/task-server.mjs); the villager shows up and works like any session.
//   - Every task becomes a letter: your request, the answer, and a Reply box to keep the conversation going.
//   - A daily report letter sums up yesterday (sessions, tool calls, files, tokens, streak).
//   - A red badge on the mailbox counts unread letters; a chime + toast when a task finishes.
// Sending needs the office's local task API, so it works from the Mac only; on the phone the letters are read-only.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Kotak Surat', compose: '✉️ Tugas baru', back: '← Kembali', empty: 'Belum ada surat. Kirim tugas pertama lewat tombol di atas!',
      who: 'Siapa yang ngerjain?', general: 'Claude (umum)', project: 'Proyek', task: 'Tugasnya apa?',
      placeholder: 'Tulis tugasnya… (Enter kirim, Shift+Enter baris baru)', send: 'Kirim', sending: 'Ngirim…',
      access: { read: 'baca file', web: 'cari di web', edit: 'ngedit file', git: 'lihat git', test: 'jalanin test' },
      canDo: (list) => `Boleh: ${list}. Selain itu ditolak otomatis.`,
      running: '⏳ Lagi dikerjain', done: '✅ Selesai', error: '⚠️ Gagal', stopped: '⏹ Dihentikan',
      reply: 'Balas', replyPh: 'Tulis balasan atau tugas lanjutan…', stop: 'Hentikan', archive: 'Arsipkan', you: 'Kamu',
      noApi: 'Kirim tugas cuma bisa dari Mac yang lagi nyalain kantor (bukan dari HP / tunnel), dan kantornya harus dinyalain lewat app Asa Office atau `npm run office`.',
      noClaude: 'Perintah `claude` gak ketemu di Mac ini, jadi tugas belum bisa dikirim.',
      noProject: 'Belum ada proyek. Pakai Claude Code sekali di folder proyekmu, terus coba lagi.',
      busy: 'Lagi ada 3 tugas jalan. Tunggu salah satunya selesai dulu ya.',
      failed: 'Gagal ngirim', finished: (n, p) => `${n} selesai: ${p}`, failedTask: (n) => `Tugas ${n} gagal`,
      openBox: 'Buka kotak surat buat baca hasilnya.', report: 'Laporan harian', reportFrom: 'Kantor',
      reportBody: (d) => `Kemarin (${d.day}) ada ${d.sessions} sesi Claude, ${d.tools} tool call, dan ${d.files} file diedit.`,
      reportMix: (d) => `Rinciannya: ${d.edit} edit, ${d.search} baca/cari, ${d.command} command, ${d.web} web, ${d.agent} sub-agent.`,
      reportTokens: (i, o) => `Token: ${i} masuk, ${o} keluar.`, reportModel: (m) => `Model paling sering: ${m}.`,
      reportTasks: (n) => `Tugas dari kotak surat: ${n} selesai.`, reportStreak: (n) => `Streak kerja: ${n} hari 🔥`,
      reportNone: 'Kemarin kantor sepi, gak ada sesi Claude. Selamat istirahat! 🌻', cost: (c) => `biaya ±$${c.toFixed(2)}`,
      awaiting: '📝 Nunggu persetujuan', rejected: '❌ Ditolak', mode: 'Cara kerja',
      modes: { plan: '📝 Rencana dulu — kamu setujui dulu', auto: '⚡ Langsung jalan', report: '👀 Cuma laporan — gak ngubah apa-apa' },
      modeShort: { plan: 'rencana dulu', auto: 'langsung jalan', report: 'cuma laporan' },
      style: 'Gaya kerja Shades',
      styles: { solo: '💰 Hemat — Shades kerja sendiri, timnya akting', delegate: '👥 Delegasi beneran — manggil staf satu-satu (lebih boros kuota)' },
      approve: '✅ Setujui', revise: '✏️ Revisi', reject: '❌ Tolak', revisePh: 'Apa yang perlu diubah dari rencananya?',
      planReady: (n) => `${n}: rencananya siap, nunggu persetujuanmu`, planLabel: '📝 Rencana', reportLabel: '📜 Laporan untuk Komisaris',
      directorBusy: 'Shades lagi ngerjain tugas lain. Tunggu selesai dulu ya.',
      progress: (t) => `⏳ ${t}`, starting: '⏳ Lagi mulai…', writing: 'Nulis jawaban',
      copyCmd: '📋 Salin perintah Terminal', copied: '✅ Tersalin! Tempel di Terminal',
      copyNote: 'Buat lanjut ngobrol di sesi yang sama dari Terminal.',
      tabLetters: '📮 Surat', tabSessions: '🗂 Semua sesi', search: 'Cari judul, proyek, atau isi…',
      fAll: 'Semua', fRunning: '⏳ Jalan', fAwaiting: '📝 Nunggu', fDone: '✅ Selesai', allProjects: 'Semua proyek', allWho: 'Semua orang',
      noMatch: 'Gak ada yang cocok.', noSessions: 'Belum ada sesi Claude Code di Mac ini.', live: '● lagi jalan', ago: (m) => (m < 1 ? 'barusan' : m < 60 ? `${m} mnt lalu` : m < 1440 ? `${Math.round(m / 60)} jam lalu` : `${Math.round(m / 1440)} hari lalu`),
      fromMailbox: '📮 dari kotak surat', sessionsNote: 'Semua sesi Claude Code di Mac ini (Terminal, Desktop, dan kotak surat), 30 hari terakhir.',
      rename: 'Judul surat', copySmall: '📋 Salin', copiedSmall: '✅',
      queued: '📮 Diantar', queuedShort: '📮 Nunggu diambil Shades…', queuedNote: (n) => (n ? `📮 Suratmu lagi diantar Shades ke ${n}…` : '📮 Suratmu lagi diambil Shades…'),
      newChat: '＋ Chat baru', newChatSub: 'Tulis tugasnya, pilih cara kerjanya di bawah', tabChats: '💬 Chat', tabSessions: '🗂 Sesi',
      pickChat: 'Pilih chat di kiri, atau mulai yang baru.',
      greeting: (n) => `Halo Komisaris! Mau dikerjain apa hari ini${n ? `, biar ${n} yang pegang` : ''}?`,
      suggestions: ['Cek status proyek ini', 'Jalanin semua test terus laporin yang gagal', 'Review perubahan terakhir'],
      chipModes: { plan: '📝 Rencana dulu', auto: '⚡ Langsung jalan', report: '👀 Cuma laporan' },
      chipStyles: { solo: '💰 Hemat', delegate: '👥 Delegasi' },
      approvedNote: '✅ Rencana disetujui', rejectedNote: '❌ Rencana ditolak', revisedNote: '✏️ Minta revisi', reviseHint: 'atau tulis revisinya di bawah',
      busyPh: (n) => `${n} lagi kerja… tunggu jawabannya ya`,
    },
    en: {
      title: 'Mailbox', compose: '✉️ New task', back: '← Back', empty: 'No letters yet. Send your first task with the button above!',
      who: 'Who should do it?', general: 'Claude (general)', project: 'Project', task: 'What should they do?',
      placeholder: 'Write the task… (Enter to send, Shift+Enter for a new line)', send: 'Send', sending: 'Sending…',
      access: { read: 'read files', web: 'search the web', edit: 'edit files', git: 'look at git', test: 'run tests' },
      canDo: (list) => `Allowed: ${list}. Anything else is refused automatically.`,
      running: '⏳ In progress', done: '✅ Done', error: '⚠️ Failed', stopped: '⏹ Stopped',
      reply: 'Reply', replyPh: 'Write a reply or a follow-up task…', stop: 'Stop', archive: 'Archive', you: 'You',
      noApi: 'Tasks can only be sent from the Mac running the office (not from the phone / tunnel), with the office started by the Asa Office app or `npm run office`.',
      noClaude: 'The `claude` command wasn’t found on this Mac, so tasks can’t be sent yet.',
      noProject: 'No projects yet. Use Claude Code once in your project folder, then try again.',
      busy: '3 tasks are already running. Wait for one to finish.',
      failed: 'Couldn’t send', finished: (n, p) => `${n} finished: ${p}`, failedTask: (n) => `${n}'s task failed`,
      openBox: 'Open the mailbox to read the result.', report: 'Daily report', reportFrom: 'The office',
      reportBody: (d) => `Yesterday (${d.day}) there were ${d.sessions} Claude sessions, ${d.tools} tool calls and ${d.files} files edited.`,
      reportMix: (d) => `Breakdown: ${d.edit} edits, ${d.search} reads/searches, ${d.command} commands, ${d.web} web, ${d.agent} sub-agents.`,
      reportTokens: (i, o) => `Tokens: ${i} in, ${o} out.`, reportModel: (m) => `Most used model: ${m}.`,
      reportTasks: (n) => `Tasks from the mailbox: ${n} done.`, reportStreak: (n) => `Work streak: ${n} days 🔥`,
      reportNone: 'The office was quiet yesterday, no Claude sessions. Enjoy the rest! 🌻', cost: (c) => `cost ≈ $${c.toFixed(2)}`,
      awaiting: '📝 Waiting for approval', rejected: '❌ Rejected', mode: 'How to work',
      modes: { plan: '📝 Plan first — you approve it', auto: '⚡ Just do it', report: "👀 Report only — doesn't change anything" },
      modeShort: { plan: 'plan first', auto: 'just do it', report: 'report only' },
      style: "Shades' way of working",
      styles: { solo: '💰 Thrifty — Shades works alone, the team acts it out', delegate: '👥 Real delegation — calls staff one at a time (uses more quota)' },
      approve: '✅ Approve', revise: '✏️ Revise', reject: '❌ Reject', revisePh: 'What should change in the plan?',
      planReady: (n) => `${n}: the plan is ready for your approval`, planLabel: '📝 Plan', reportLabel: '📜 Report for the Commissioner',
      directorBusy: 'Shades is on another task. Wait for it to finish.',
      progress: (t) => `⏳ ${t}`, starting: '⏳ Starting…', writing: 'Writing the answer',
      copyCmd: '📋 Copy Terminal command', copied: '✅ Copied! Paste it in Terminal',
      copyNote: 'To keep talking in the same session from Terminal.',
      tabLetters: '📮 Letters', tabSessions: '🗂 All sessions', search: 'Search title, project or text…',
      fAll: 'All', fRunning: '⏳ Running', fAwaiting: '📝 Waiting', fDone: '✅ Finished', allProjects: 'All projects', allWho: 'Everyone',
      noMatch: 'Nothing matches.', noSessions: 'No Claude Code sessions on this Mac yet.', live: '● running now', ago: (m) => (m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`),
      fromMailbox: '📮 from the mailbox', sessionsNote: 'Every Claude Code session on this Mac (Terminal, Desktop and the mailbox), last 30 days.',
      rename: 'Letter title', copySmall: '📋 Copy', copiedSmall: '✅',
      queued: '📮 Delivering', queuedShort: '📮 Waiting for Shades…', queuedNote: (n) => (n ? `📮 Shades is delivering your letter to ${n}…` : '📮 Shades is picking up your letter…'),
      newChat: '＋ New chat', newChatSub: 'Write the task, pick how to work below', tabChats: '💬 Chats', tabSessions: '🗂 Sessions',
      pickChat: 'Pick a chat on the left, or start a new one.',
      greeting: (n) => `Hello Commissioner! What should we get done today${n ? `, with ${n} on it` : ''}?`,
      suggestions: ['Check this project’s status', 'Run all the tests and report what fails', 'Review the latest changes'],
      chipModes: { plan: '📝 Plan first', auto: '⚡ Just do it', report: '👀 Report only' },
      chipStyles: { solo: '💰 Thrifty', delegate: '👥 Delegate' },
      approvedNote: '✅ Plan approved', rejectedNote: '❌ Plan rejected', revisedNote: '✏️ Asked for a revision', reviseHint: 'or write the revision below',
      busyPh: (n) => `${n} is working… wait for the answer`,
    },
  });

  const css = `
  .asa-mail-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px; }
  .asa-letters { display: flex; flex-direction: column; gap: 8px; }
  .asa-letter { display: flex; gap: 10px; align-items: center; background: #fffbe9; border: 1px solid #d9c49a; padding: 8px 10px;
    cursor: pointer; text-align: left; font: inherit; color: inherit; width: 100%; box-shadow: 0 2px 0 rgba(116,65,34,0.2); }
  .asa-letter.unread { border-color: #c8503c; box-shadow: inset 3px 0 0 #c8503c, 0 2px 0 rgba(116,65,34,0.2); }
  .asa-letter-body { flex: 1; min-width: 0; }
  .asa-letter-body b { font-weight: normal; font-size: 15px; }
  .asa-letter-body div { font-size: 12px; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .asa-letter-status { font-size: 12px; white-space: nowrap; }
  .asa-face { width: 32px; height: 52px; flex: none; image-rendering: pixelated; background-repeat: no-repeat;
    background-size: 224px 192px; background-position: -32px -4px; background-color: #dca05f; border: 2px solid #744122; }
  .asa-face.envelope { background: #f4e6c4; display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .asa-form label { display: block; font-size: 13px; margin: 10px 0 4px; }
  .asa-form select, .asa-form textarea { width: 100%; font: inherit; font-size: 14px; padding: 6px; background: #fffbe9;
    color: #3a2117; border: 2px solid #744122; box-sizing: border-box; }
  .asa-form textarea { min-height: 90px; resize: vertical; }
  .asa-note { font-size: 12px; opacity: 0.75; margin-top: 6px; }
  .asa-warn { font-size: 13px; background: #ffe0d0; border: 1px solid #c8503c; padding: 8px; margin: 8px 0; }
  .asa-thread { display: flex; flex-direction: column; gap: 8px; margin: 10px 0; }
  .asa-msg { padding: 8px 10px; border: 1px solid #d9c49a; background: #fffbe9; white-space: pre-wrap; overflow-wrap: anywhere;
    font-size: 13px; line-height: 1.4; max-height: 50vh; overflow: auto; }
  .asa-msg.you { background: #e6f0d8; border-color: #9ab87a; align-self: flex-end; max-width: 85%; }
  .asa-msg small { display: block; opacity: 0.6; font-size: 11px; margin-bottom: 3px; }
  .asa-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .asa-panel.asa-wide { max-width: min(960px, 100%); }
  .asa-chat { display: grid; grid-template-columns: 270px minmax(0, 1fr); gap: 12px; height: min(74vh, 640px); }
  .asa-side { display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow: hidden; border-right: 2px dashed #c9a877; padding-right: 12px; }
  .asa-side .asa-letters { overflow-y: auto; flex: 1; min-height: 0; }
  .asa-side .asa-letter { padding: 6px 8px; gap: 8px; }
  .asa-side .asa-letter.on { border-color: #744122; background: #f4e6c4; box-shadow: inset 3px 0 0 #744122; }
  .asa-side .asa-face { width: 26px; height: 42px; background-size: 182px 156px; background-position: -26px -3px; }
  .asa-side .asa-letter-status { display: none; }
  .asa-side .asa-filters { margin: 0; }
  .asa-side input[type="search"] { font: inherit; font-size: 13px; padding: 5px 8px; background: #fffbe9; color: #3a2117; border: 2px solid #744122; min-width: 0; }
  .asa-newchat.on { box-shadow: 0 2px 0 #973a2f, 0 0 0 3px #f2c94c; }
  .asa-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .asa-chat-head { display: flex; align-items: center; gap: 10px; padding-bottom: 8px; border-bottom: 2px dashed #c9a877; }
  .asa-chat-head .asa-face { width: 26px; height: 42px; background-size: 182px 156px; background-position: -26px -3px; flex: none; }
  .asa-chat-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .asa-chat-title b { font-weight: normal; font-size: 16px; }
  .asa-chat-title .asa-muted { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
  .asa-chat-head .asa-title-input { margin: 0; padding: 2px 6px; font-size: 15px; border-color: transparent; background: transparent; }
  .asa-chat-head .asa-title-input:hover, .asa-chat-head .asa-title-input:focus { border-color: #d9c49a; background: #fffbe9; }
  .asa-head-actions { display: flex; gap: 6px; flex: none; }
  .asa-head-actions .asa-btn { padding: 3px 8px; }
  .asa-back { display: none; padding: 3px 9px; }
  .asa-thread-box { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 2px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: thin; scrollbar-color: #b8935c transparent; }
  .asa-brow { display: flex; gap: 8px; align-items: flex-end; max-width: 92%; }
  .asa-face.sm { width: 24px; height: 38px; background-size: 168px 144px; background-position: -24px -3px; flex: none; }
  .asa-b { padding: 8px 10px; border: 1px solid #d9c49a; background: #fffbe9; font-size: 13.5px; line-height: 1.4; min-width: 0; }
  .asa-b.you { align-self: flex-end; max-width: 85%; background: #e6f0d8; border-color: #9ab87a; }
  .asa-b.plan { border-color: #4a8ac8; box-shadow: inset 3px 0 0 #4a8ac8; }
  .asa-b .asa-b-text { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 46vh; overflow: auto; }
  .asa-b small { display: block; opacity: 0.6; font-size: 11px; margin-top: 4px; }
  .asa-b em { display: block; font-style: normal; margin-bottom: 4px; }
  .asa-b.typing { display: flex; gap: 8px; align-items: center; }
  .asa-dots { display: inline-flex; gap: 3px; } .asa-dots i { width: 5px; height: 5px; background: #744122; animation: asa-dot 1.2s infinite; }
  .asa-dots i:nth-child(2) { animation-delay: 0.2s; } .asa-dots i:nth-child(3) { animation-delay: 0.4s; }
  @keyframes asa-dot { 0%, 60%, 100% { opacity: 0.25; transform: none; } 30% { opacity: 1; transform: translateY(-3px); } }
  .asa-sys { align-self: center; font-size: 12px; padding: 2px 10px; background: #e6d3a6; border: 1px solid #c9a877; }
  .asa-plan-actions { align-items: center; margin: -2px 0 0 32px; }
  .asa-suggest { display: flex; flex-wrap: wrap; gap: 6px; margin-left: 32px; }
  .asa-comp { border-top: 2px dashed #c9a877; padding-top: 8px; display: flex; flex-direction: column; gap: 6px; }
  .asa-comp-box { display: flex; gap: 8px; align-items: flex-end; }
  .asa-comp textarea { flex: 1; min-width: 0; font: inherit; font-size: 14px; padding: 6px 8px; background: #fffbe9; color: #3a2117; border: 2px solid #744122;
    resize: none; max-height: 150px; }
  .asa-send { flex: none; width: 40px; height: 40px; font: inherit; font-size: 18px; cursor: pointer; background: #c8503c; color: #fff6dc; border: 2px solid #973a2f; box-shadow: 0 2px 0 #973a2f; }
  .asa-send:disabled { opacity: 0.45; cursor: default; }
  .asa-send.stop { background: #fffbe9; color: #3a2117; border-color: #744122; box-shadow: 0 2px 0 #744122; }
  .asa-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .asa-chipsel { font: inherit; font-size: 12.5px; padding: 3px 6px; background: #fffbe9; color: #3a2117; border: 2px solid #d9c49a; max-width: 48%; cursor: pointer; }
  .asa-chipsel:hover, .asa-chipsel:focus { border-color: #744122; }
  .asa-pill { font-size: 12px; padding: 2px 8px; background: #e6d3a6; border: 1px solid #c9a877; }
  .asa-plane { position: fixed; left: 0; top: 0; z-index: 1200; width: 28px; height: 28px; pointer-events: none; will-change: transform; }
  .asa-spark { position: fixed; z-index: 1199; width: 5px; height: 5px; background: #f2c94c; pointer-events: none; animation: asa-spark 0.6s ease-out forwards; }
  @keyframes asa-spark { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(10px) scale(0.3); } }
  @media (max-width: 720px) {
    .asa-chat { grid-template-columns: 1fr; height: min(78vh, 640px); }
    .asa-side { border-right: 0; padding-right: 0; }
    .asa-chat[data-show="list"] .asa-main, .asa-chat[data-show="chat"] .asa-side { display: none; }
    .asa-back { display: block; }
    .asa-side .asa-letter-status { display: block; }
    .asa-chipsel { max-width: 46%; }
  }
  @media (prefers-reduced-motion: reduce) { .asa-dots i, .asa-spark { animation: none; } }
  .asa-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
  .asa-tabs .asa-btn.on { background: #744122; color: #fff6dc; }
  .asa-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .asa-filters input, .asa-filters select { font: inherit; font-size: 13px; padding: 4px 6px; background: #fffbe9; color: #3a2117;
    border: 2px solid #744122; box-sizing: border-box; min-width: 0; }
  .asa-filters input { flex: 1 1 100%; }
  .asa-filters select { flex: 1 1 120px; }
  .asa-chip { font: inherit; font-size: 12px; padding: 3px 8px; background: #fffbe9; color: #3a2117; border: 2px solid #d9c49a; cursor: pointer; }
  .asa-chip.on { border-color: #744122; background: #f4e6c4; }
  .asa-live { color: #3f8a36; }
  .asa-title-input { width: 100%; font: inherit; font-size: 14px; padding: 4px 6px; margin-top: 8px; background: #fffbe9; color: #3a2117;
    border: 2px solid #d9c49a; box-sizing: border-box; }
  .asa-msg.plan { border-color: #4a8ac8; box-shadow: inset 3px 0 0 #4a8ac8; }
  .asa-msg em { display: block; font-style: normal; font-weight: bold; margin-bottom: 4px; }
  `;

  // ── Task API (local only) ──
  const token = new URLSearchParams(location.search).get('token');
  async function api(method, route, body) {
    const port = ns.data?.taskServer?.port;
    if (!port || !token) throw new Error('noApi');
    const res = await fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || String(res.status));
    return json;
  }

  // ── Letters ──
  const readReports = new Set(JSON.parse(ns.store.get('readReports') || '[]'));
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtK = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

  function dailyReport() {
    const stats = ns.data?.stats;
    if (!stats) return null;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const key = dayKey(y);
    const d = stats.days?.[key];
    const lines = [];
    if (!d || !d.tools) lines.push(S.reportNone);
    else {
      lines.push(S.reportBody({ day: key, ...d }), S.reportMix(d));
      if (d.tokens) lines.push(S.reportTokens(fmtK(d.tokens.input + d.tokens.cacheRead + d.tokens.cacheWrite), fmtK(d.tokens.output)));
      const model = Object.keys(d.models ?? {})[0];
      if (model) lines.push(S.reportModel(model));
    }
    const doneTasks = (ns.data?.mail ?? []).filter((l) => l.status === 'done' && l.finishedAt?.startsWith(key)).length;
    if (doneTasks) lines.push(S.reportTasks(doneTasks));
    if (stats.streak) lines.push(S.reportStreak(stats.streak));
    return { id: `report-${key}`, report: true, day: key, read: readReports.has(key), text: lines.join('\n\n') };
  }

  const letters = () => {
    const list = [...(ns.data?.mail ?? [])];
    const report = dailyReport();
    return report ? [report, ...list] : list;
  };
  const unread = () => letters().filter((l) => !l.read && l.status !== 'running').length;
  const staffFor = (l) => (l.agent ? (ns.data?.staff ?? []).find((m) => m.agent === l.agent) : null);
  const who = (l) => (l.report ? S.reportFrom : l.name ?? S.general);
  const face = (l) => {
    const m = staffFor(l);
    if (!m) return h('div', { class: 'asa-face envelope' }, l.report ? '📰' : '✉️');
    const el = h('div', { class: 'asa-face' });
    el.style.backgroundImage = `url(${ns.portraitUrl({ palette: m.palette })})`;
    return el;
  };
  const timeOf = (iso) => new Date(iso).toLocaleString(ns.lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  // ── Panel state ──
  let panel = null;
  let sel = null; // 'new' (the composer), a letter id, or null (narrow screens: showing the list)
  let tab = 'chats';
  let options = null; // the task API's options (who / projects), fetched when the mailbox opens
  let notice = '';
  let sending = false;
  const prefs = (() => { try { return JSON.parse(ns.store.get('chatPrefs') || '{}'); } catch { return {}; } })();
  const savePrefs = () => ns.store.set('chatPrefs', JSON.stringify(prefs));
  const draft = { prompt: '' };
  const ui = {}; // root, side, main, head, thread, comp, refill, keys
  const fx = { drop: 0 };
  const narrow = () => matchMedia('(max-width: 720px)').matches;

  const progressText = (l) => (l.progress ? S.progress(l.progress === 'Writing the answer' ? S.writing : ns.translateStatus?.(l.progress) ?? l.progress) : S.starting);
  /** Shell command that continues this letter's session in Terminal. */
  const terminalCommand = (l) => `cd '${String(l.cwd).replace(/'/g, `'\\''`)}' && claude --resume ${l.sessionId}`;
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand?.('copy');
    ta.remove();
    return !!ok;
  }

  // ── Helpers ──
  const filter = { status: 'all', project: '', who: '', q: '' };
  const home = (p) => String(p ?? '').replace(/^\/(Users|home)\/[^/]+/, '~');
  const letterTitle = (l) => l.title || (l.thread?.[0]?.text ?? '').split('\n')[0].slice(0, 50) || who(l);
  const statusGroup = (l) => (l.status === 'running' || l.status === 'queued' ? 'running' : l.status === 'awaiting' ? 'awaiting' : 'done');
  const has = (text, q) => String(text ?? '').toLowerCase().includes(q);
  const pickLang = (v) => (v && typeof v === 'object' ? v[ns.lang] ?? v.en : v);
  const errorText = (err) => ({ busy: S.busy, noApi: S.noApi, 'director busy': S.directorBusy })[err.message] ?? `${S.failed} (${err.message})`;
  const memberOf = (agent) => (agent ? (options?.staff ?? ns.data?.staff ?? []).find((m) => m.agent === agent) ?? null : null);
  const isDirector = (agent) => !!memberOf(agent)?.director;
  const current = () => (sel && sel !== 'new' ? letters().find((l) => l.id === sel) ?? null : null);
  const busy = (l) => l?.status === 'running' || l?.status === 'queued';
  const smallFace = (l) => { const el = face(l); el.classList.add('sm'); return el; };

  async function ensureOptions() {
    if (options) return options;
    try { options = await api('GET', '/api/options'); } catch { options = { error: true }; }
    return options;
  }

  // ── Paper plane and the letter landing in the mailbox ──
  function mailboxPoint() {
    const v = ns.view;
    const f = ns.findFurniture('COZY_MAILBOX')[0];
    if (!v || !f) return null;
    const r = v.canvas.getBoundingClientRect();
    const k = r.width / v.canvas.width;
    return { x: r.left + (v.offX + (f.col * 16 + 8) * v.zoom) * k, y: r.top + (v.offY + (f.row * 16 + 8) * v.zoom) * k };
  }
  const PLANE = '<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><path d="M2 5 L26 14 L2 23 L8 14 Z" fill="#fff6dc" stroke="#744122" stroke-width="2" stroke-linejoin="round"/><path d="M8 14 L26 14" stroke="#744122" stroke-width="2"/></svg>';
  function spark(x, y) {
    const el = h('i', { class: 'asa-spark', style: { left: `${x}px`, top: `${y}px` } });
    document.body.append(el);
    setTimeout(() => el.remove(), 600);
  }
  /** A paper plane from `fromEl` to the mailbox on the wall; resolves when it lands (never rejects). */
  function flyPlane(fromEl) {
    return new Promise((resolve) => {
      const end = mailboxPoint();
      const r = fromEl?.getBoundingClientRect();
      if (!end || !r || matchMedia('(prefers-reduced-motion: reduce)').matches) return void setTimeout(resolve, 250);
      const a = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const c = { x: (a.x + end.x) / 2 - 60, y: Math.min(a.y, end.y) - 170 };
      const plane = h('div', { class: 'asa-plane' });
      plane.innerHTML = PLANE;
      document.body.append(plane);
      const t0 = performance.now();
      const DUR = 1000;
      let lastSpark = 0;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / DUR);
        const e = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
        const x = (1 - e) ** 2 * a.x + 2 * (1 - e) * e * c.x + e * e * end.x;
        const y = (1 - e) ** 2 * a.y + 2 * (1 - e) * e * c.y + e * e * end.y;
        const dx = 2 * (1 - e) * (c.x - a.x) + 2 * e * (end.x - c.x);
        const dy = 2 * (1 - e) * (c.y - a.y) + 2 * e * (end.y - c.y);
        plane.style.transform = `translate(${x - 14}px, ${y - 14}px) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg) scale(${1.35 - 0.7 * e})`;
        if (now - lastSpark > 45) { lastSpark = now; spark(x, y); }
        if (t < 1) requestAnimationFrame(step);
        else { plane.remove(); resolve(); }
      };
      requestAnimationFrame(step);
    });
  }
  const dropLetter = () => { fx.drop = performance.now(); ns.notify?.sfx?.('drop'); };

  // ── Sidebar: chats and sessions ──
  function pickLetter(id) { select(id); }

  function letterRows(container) {
    const q = filter.q.trim().toLowerCase();
    const all = letters().filter((l) => {
      if (l.report) return filter.status === 'all' && !filter.project && !filter.who && !q;
      if (filter.status !== 'all' && statusGroup(l) !== filter.status) return false;
      if (filter.project && l.cwd !== filter.project) return false;
      if (filter.who && (l.agent ?? '') !== filter.who) return false;
      return !q || [letterTitle(l), l.project, who(l), ...(l.thread ?? []).map((m) => m.text)].some((t) => has(t, q));
    });
    container.replaceChildren(...(all.length ? all.map((l) => {
      const status = l.report ? '' : S[l.status] ?? '';
      return h('button', { type: 'button', class: `asa-letter${l.read || busy(l) ? '' : ' unread'}${sel === l.id ? ' on' : ''}`, onclick: () => pickLetter(l.id) },
        face(l),
        h('div', { class: 'asa-letter-body' },
          h('b', {}, l.report ? S.report : letterTitle(l)),
          h('div', {}, l.report ? l.day : [who(l), l.project, l.createdAt ? timeOf(l.createdAt) : null].filter(Boolean).join(' · ')),
          busy(l) ? h('div', {}, l.status === 'queued' ? S.queuedShort : progressText(l)) : null),
        h('div', { class: 'asa-letter-status' }, status));
    }) : [h('p', { class: 'asa-muted' }, letters().length ? S.noMatch : S.empty)]));
  }

  function sessionRows(container) {
    const q = filter.q.trim().toLowerCase();
    const byId = new Map((ns.data?.mail ?? []).map((l) => [l.sessionId, l]));
    const rows = (ns.data?.sessions ?? []).filter((x) => (!filter.project || x.cwd === filter.project) &&
      (!q || [x.title, x.prompt, x.project, x.cwd].some((t) => has(t, q))));
    const now = Date.now();
    container.replaceChildren(...(rows.length ? rows.map((x) => {
      const letter = byId.get(x.id);
      const mins = Math.max(0, Math.round((now - Date.parse(x.at)) / 60_000));
      const live = now - Date.parse(x.at) < 90_000;
      const btn = h('button', { type: 'button', class: 'asa-chip', title: terminalCommand({ cwd: x.cwd, sessionId: x.id }) }, S.copySmall);
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (await copyText(terminalCommand({ cwd: x.cwd, sessionId: x.id }))) {
          btn.textContent = S.copiedSmall;
          setTimeout(() => { btn.textContent = S.copySmall; }, 2000);
        }
      };
      const row = h('div', { class: 'asa-letter', style: { cursor: letter ? 'pointer' : 'default' } },
        h('div', { class: 'asa-face envelope' }, letter ? '📮' : '💬'),
        h('div', { class: 'asa-letter-body' },
          h('b', {}, (letter ? letterTitle(letter) : x.title) || x.project || x.id.slice(0, 8)),
          h('div', { title: x.cwd ?? '' }, [x.project, x.cwd ? home(x.cwd) : null].filter(Boolean).join(' · ')),
          h('div', {}, x.prompt && x.prompt !== x.title ? x.prompt : (letter ? S.fromMailbox : ''))),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' } },
          h('span', { class: `asa-letter-status${live ? ' asa-live' : ''}` }, live ? S.live : S.ago(mins)), x.cwd ? btn : null));
      if (letter) row.onclick = () => pickLetter(letter.id);
      return row;
    }) : [h('p', { class: 'asa-muted' }, ns.data?.sessions?.length ? S.noMatch : S.noSessions)]));
  }

  function fillSide() {
    const side = ui.side;
    const rows = h('div', { class: 'asa-letters' });
    ui.refill = () => (tab === 'chats' ? letterRows(rows) : sessionRows(rows));
    const search = h('input', { type: 'search', placeholder: S.search, value: filter.q, 'aria-label': S.search });
    search.oninput = () => { filter.q = search.value; ui.refill(); };
    const select2 = (label, key, opts) => {
      const el = h('select', {}, h('option', { value: '' }, label), opts.map(([v, t]) => h('option', { value: v }, t)));
      el.value = filter[key];
      el.onchange = () => { filter[key] = el.value; ui.refill(); };
      return el;
    };
    const projects = tab === 'chats'
      ? [...new Map(letters().filter((l) => l.cwd).map((l) => [l.cwd, l.project])).entries()]
      : [...new Map((ns.data?.sessions ?? []).filter((x) => x.cwd).map((x) => [x.cwd, `${x.project} — ${home(x.cwd)}`])).entries()];
    const filters = h('div', { class: 'asa-filters' });
    if (tab === 'chats') {
      const chips = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', flex: '1 1 100%' } },
        [['all', S.fAll], ['running', S.fRunning], ['awaiting', S.fAwaiting], ['done', S.fDone]].map(([v, t]) => {
          const c = h('button', { type: 'button', class: `asa-chip${filter.status === v ? ' on' : ''}` }, t);
          c.onclick = () => { filter.status = v; chips.querySelectorAll('.asa-chip').forEach((el) => el.classList.toggle('on', el === c)); ui.refill(); };
          return c;
        }));
      const people = [...new Map(letters().filter((l) => !l.report).map((l) => [l.agent ?? '', who(l)])).entries()];
      filters.append(chips, select2(S.allProjects, 'project', projects), select2(S.allWho, 'who', people));
    } else {
      filters.append(select2(S.allProjects, 'project', projects));
    }
    side.replaceChildren(...[
      h('button', { type: 'button', class: `asa-btn primary asa-newchat${sel === 'new' ? ' on' : ''}`, onclick: () => select('new') }, S.newChat),
      h('div', { class: 'asa-tabs' }, ['chats', 'sessions'].map((t) => h('button', { type: 'button', class: `asa-btn${tab === t ? ' on' : ''}`,
        onclick: () => { tab = t; filter.project = ''; filter.who = ''; fillSide(); } }, t === 'chats' ? S.tabChats : S.tabSessions))),
      search, filters, tab === 'sessions' ? h('div', { class: 'asa-note' }, S.sessionsNote) : null, rows,
    ].filter(Boolean));
    ui.refill();
  }

  // ── Main: header, thread, composer ──
  function select(id) {
    sel = id;
    notice = '';
    const l = current();
    if (l) markRead(l);
    syncLayout();
    ui.refill?.();
    ui.side?.querySelector('.asa-newchat')?.classList.toggle('on', sel === 'new');
    buildMain();
  }
  function syncLayout() { if (ui.root) ui.root.dataset.show = narrow() ? (sel ? 'chat' : 'list') : 'both'; }

  function buildMain() {
    ui.head = h('div', { class: 'asa-chat-head' });
    ui.thread = h('div', { class: 'asa-thread-box' });
    ui.comp = h('div', { class: 'asa-comp' });
    ui.keys = {};
    ui.main.replaceChildren(ui.head, ui.thread, ui.comp);
    if (!sel) return ui.main.append(h('p', { class: 'asa-muted', style: { padding: '16px' } }, S.pickChat));
    refreshMain(true);
    if (sel === 'new') ensureOptions().then(() => { if (sel === 'new') refreshMain(); });
    else if (!narrow()) ui.comp.querySelector('textarea')?.focus();
  }

  function refreshMain(force = false) {
    if (!ui.head || !sel) return;
    const l = current();
    if (sel !== 'new' && !l) { sel = null; syncLayout(); return buildMain(); }
    // Header
    const headKey = JSON.stringify([sel, l?.status, l?.title, l?.cwd]);
    if (force || (ui.keys.head !== headKey && document.activeElement?.className !== 'asa-title-input')) {
      ui.keys.head = headKey;
      fillHead(l);
    }
    // Thread
    const threadKey = JSON.stringify([sel, l?.status, l?.thread?.length, l?.progress, l?.error, l?.cost, notice, options ? 1 : 0, l?.text?.length]);
    if (force || ui.keys.thread !== threadKey) {
      ui.keys.thread = threadKey;
      const box = ui.thread;
      const stick = force || box.scrollHeight - box.scrollTop - box.clientHeight < 60;
      fillThread(l);
      if (stick) box.scrollTop = box.scrollHeight;
    }
    // Composer (rebuilt only when what you can do changes, so typing is never interrupted)
    const compKey = JSON.stringify([sel, l ? (busy(l) ? 'busy' : l.status === 'awaiting' ? 'awaiting' : 'idle') : '', options ? (options.error ? 'err' : 'ok') : 'wait']);
    if (force || ui.keys.comp !== compKey) {
      ui.keys.comp = compKey;
      fillComposer(l);
    }
  }

  function fillHead(l) {
    const head = ui.head;
    const back = h('button', { type: 'button', class: 'asa-btn asa-back', onclick: () => { sel = null; syncLayout(); ui.refill?.(); }, 'aria-label': S.back }, '←');
    if (sel === 'new') return head.replaceChildren(back, h('div', { class: 'asa-chat-title' }, h('b', {}, S.newChat.replace(/^＋\s*/, '')), h('span', { class: 'asa-muted' }, S.newChatSub)));
    if (l.report) return head.replaceChildren(back, face(l), h('div', { class: 'asa-chat-title' }, h('b', {}, S.report), h('span', { class: 'asa-muted' }, l.day)));
    const m = staffFor(l);
    const titleBox = h('input', { class: 'asa-title-input', value: letterTitle(l), maxlength: '80', title: S.rename, 'aria-label': S.rename });
    titleBox.onchange = () => { if (titleBox.value.trim()) act(() => api('POST', `/api/tasks/${l.id}/rename`, { title: titleBox.value.trim() })); };
    const actions = h('div', { class: 'asa-head-actions' });
    if (busy(l)) actions.append(h('button', { type: 'button', class: 'asa-btn', title: S.stop, 'aria-label': S.stop, onclick: () => act(() => api('POST', `/api/tasks/${l.id}/stop`)) }, '⏹'));
    const copy = h('button', { type: 'button', class: 'asa-btn', title: S.copyCmd, 'aria-label': S.copyCmd }, '📋');
    copy.onclick = async () => { if (await copyText(terminalCommand(l))) { copy.textContent = '✅'; setTimeout(() => { copy.textContent = '📋'; }, 2000); } };
    actions.append(copy);
    if (!busy(l)) actions.append(h('button', { type: 'button', class: 'asa-btn', title: S.archive, 'aria-label': S.archive, onclick: () => act(() => api('DELETE', `/api/tasks/${l.id}`), () => { sel = null; syncLayout(); buildMain(); }) }, '🗄'));
    head.replaceChildren(back, face(l), h('div', { class: 'asa-chat-title' }, titleBox,
      h('span', { class: 'asa-muted' }, [who(l), m ? ns.staffRole(m) : null, l.project, l.mode ? S.modeShort[l.mode] : null, S[l.status]].filter(Boolean).join(' · '))), actions);
  }

  function fillThread(l) {
    const box = ui.thread;
    const out = [];
    if (sel === 'new') {
      const first = memberOf(prefs.agent ?? '')?.name ?? '';
      out.push(h('div', { class: 'asa-brow' }, smallFace({ agent: options?.staff?.find((x) => x.director)?.agent ?? null }), h('div', { class: 'asa-b agent' }, h('div', { class: 'asa-b-text' }, S.greeting(first)))));
      out.push(h('div', { class: 'asa-suggest' }, S.suggestions.map((t) => h('button', { type: 'button', class: 'asa-chip', onclick: () => { draft.prompt = t; ui.comp.querySelector('textarea')?.focus(); fillComposer(null); } }, t))));
    } else if (l.report) {
      out.push(h('div', { class: 'asa-b agent' }, h('div', { class: 'asa-b-text' }, l.text)));
    } else {
      const thread = l.thread ?? [];
      const lastAgent = thread.map((m, i) => (m.from === 'agent' ? i : -1)).filter((i) => i >= 0).pop();
      thread.forEach((m, i) => {
        if (m.from === 'you' && ['approve', 'reject', 'revise'].includes(m.kind)) {
          return out.push(h('div', { class: 'asa-sys' }, m.kind === 'approve' ? S.approvedNote : m.kind === 'reject' ? S.rejectedNote : `${S.revisedNote}: ${m.text}`));
        }
        if (m.from === 'you') return out.push(h('div', { class: 'asa-b you' }, h('div', { class: 'asa-b-text' }, m.text), h('small', {}, timeOf(m.at))));
        const plan = m.kind === 'plan';
        const label = plan ? S.planLabel : isDirector(l.agent) && m.kind ? S.reportLabel : null;
        out.push(h('div', { class: 'asa-brow' }, smallFace(l),
          h('div', { class: `asa-b agent${plan ? ' plan' : ''}` }, label ? h('em', {}, label) : null, h('div', { class: 'asa-b-text' }, m.text), h('small', {}, `${who(l)} · ${timeOf(m.at)}`))));
        if (plan && l.status === 'awaiting' && i === lastAgent) {
          const yes = h('button', { type: 'button', class: 'asa-btn primary' }, S.approve);
          yes.onclick = () => approve(l, yes);
          out.push(h('div', { class: 'asa-actions asa-plan-actions' }, yes,
            h('button', { type: 'button', class: 'asa-btn', onclick: () => act(() => api('POST', `/api/tasks/${l.id}/reject`)) }, S.reject),
            h('span', { class: 'asa-muted' }, S.reviseHint)));
        }
      });
      if (l.status === 'queued') out.push(h('div', { class: 'asa-sys' }, S.queuedNote(isDirector(l.agent) ? '' : l.name ?? '')));
      if (l.status === 'running') out.push(h('div', { class: 'asa-brow' }, smallFace(l), h('div', { class: 'asa-b agent typing' }, h('span', { class: 'asa-dots' }, h('i'), h('i'), h('i')), h('span', {}, progressText(l).replace(/^⏳\s*/, '')))));
      if (l.error) out.push(h('div', { class: 'asa-warn' }, l.error));
      if (l.cost) out.push(h('div', { class: 'asa-note' }, S.cost(l.cost)));
    }
    if (notice) out.push(h('div', { class: 'asa-warn' }, notice));
    box.replaceChildren(...out);
  }

  function fillComposer(l) {
    const comp = ui.comp;
    comp.replaceChildren();
    if (sel !== 'new' && l?.report) return;
    if (sel === 'new') {
      if (!options) return comp.append(h('p', { class: 'asa-muted' }, '…'));
      if (options.error) return comp.append(h('div', { class: 'asa-warn' }, S.noApi));
      if (!options.claude) return comp.append(h('div', { class: 'asa-warn' }, S.noClaude));
      if (!options.projects.length) return comp.append(h('div', { class: 'asa-warn' }, S.noProject));
    }
    const existing = sel !== 'new';
    const locked = existing && busy(l);
    const ta = h('textarea', { rows: '2', 'aria-label': S.task,
      placeholder: locked ? S.busyPh(l.name ?? S.general) : existing ? (l.status === 'awaiting' ? S.revisePh : S.replyPh) : S.placeholder });
    ta.value = locked ? '' : draft.prompt;
    ta.disabled = locked;
    const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight + 2, 150)}px`; };
    const send = h('button', { type: 'button', class: 'asa-send', title: S.send, 'aria-label': S.send }, '➤');
    const sync = () => { send.disabled = locked || !ta.value.trim() || sending; };
    ta.oninput = () => { draft.prompt = ta.value; grow(); sync(); };
    const controls = {};
    const submit = () => (existing ? sendReply(l, ta, send) : sendNew(ta, send, controls));
    ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!send.disabled) submit(); } };
    send.onclick = submit;
    const chips = h('div', { class: 'asa-chips' });
    if (!existing) {
      const staff = options.staff;
      const whoSel = h('select', { class: 'asa-chipsel', title: S.who, 'aria-label': S.who }, h('option', { value: '' }, `👤 ${S.general}`),
        staff.map((m) => h('option', { value: m.agent }, `👤 ${m.name}`)));
      whoSel.value = staff.some((m) => m.agent === prefs.agent) || prefs.agent === '' ? prefs.agent : staff.find((m) => m.director)?.agent ?? '';
      const projSel = h('select', { class: 'asa-chipsel', title: S.project, 'aria-label': S.project }, options.projects.map((p) => h('option', { value: p.cwd, title: p.cwd }, `📁 ${p.name}`)));
      projSel.value = options.projects.some((p) => p.cwd === prefs.cwd) ? prefs.cwd : options.projects[0].cwd;
      const modeSel = h('select', { class: 'asa-chipsel', title: S.mode, 'aria-label': S.mode }, Object.entries(S.chipModes).map(([v, t]) => h('option', { value: v }, t)));
      const styleSel = h('select', { class: 'asa-chipsel', title: S.style, 'aria-label': S.style }, Object.entries(S.chipStyles).map(([v, t]) => h('option', { value: v }, t)));
      styleSel.value = prefs.style ?? 'solo';
      const member = () => staff.find((m) => m.agent === whoSel.value) ?? null;
      const defaultMode = () => prefs.modes?.[whoSel.value] ?? (member()?.director ? 'plan' : 'auto');
      const update = () => {
        modeSel.value = defaultMode();
        styleSel.style.display = member()?.director ? '' : 'none';
        const access = member()?.access ?? options.general?.access ?? ['read'];
        whoSel.title = `${S.who} — ${S.canDo(access.map((a) => S.access[a] ?? a).join(', '))}`;
      };
      whoSel.onchange = () => { prefs.agent = whoSel.value; savePrefs(); update(); };
      projSel.onchange = () => { prefs.cwd = projSel.value; savePrefs(); };
      modeSel.onchange = () => { prefs.modes = { ...prefs.modes, [whoSel.value]: modeSel.value }; savePrefs(); };
      styleSel.onchange = () => { prefs.style = styleSel.value; savePrefs(); };
      update();
      Object.assign(controls, { whoSel, projSel, modeSel, styleSel, member });
      chips.append(whoSel, projSel, modeSel, styleSel);
    } else {
      chips.append(h('span', { class: 'asa-pill' }, `👤 ${who(l)}`), h('span', { class: 'asa-pill', title: l.cwd }, `📁 ${l.project}`), l.mode ? h('span', { class: 'asa-pill' }, S.chipModes[l.mode]) : null);
    }
    const sendBtn = locked
      ? h('button', { type: 'button', class: 'asa-send stop', title: S.stop, 'aria-label': S.stop, onclick: () => act(() => api('POST', `/api/tasks/${l.id}/stop`)) }, '⏹')
      : send;
    comp.append(h('div', { class: 'asa-comp-box' }, ta, sendBtn), chips);
    grow();
    sync();
  }

  // ── Sending ──
  async function sendNew(ta, sendBtn, c) {
    const text = ta.value.trim();
    if (!text || sending) return;
    sending = true;
    sendBtn.disabled = true;
    notice = '';
    const agent = c.whoSel.value;
    const member = c.member();
    const director = !!member?.director;
    const cwd = c.projSel.value;
    ns.notify?.sfx?.('send');
    const landed = flyPlane(sendBtn);
    try {
      const { letter } = await api('POST', '/api/tasks', {
        agent: agent || null, cwd, prompt: text, mode: c.modeSel.value, style: director ? c.styleSel.value : undefined, hold: true,
      });
      draft.prompt = '';
      await landed;
      dropLetter();
      // Shades takes the letter from the mailbox and hands it over; the task starts when he does (or right away).
      const deliver = async () => {
        if (director) ns.director?.expect({ cwd, prompt: text, meeting: true });
        try { await api('POST', `/api/tasks/${letter.id}/deliver`); } catch { /* the server starts it by itself after 20 s */ }
        // The office learns who runs the new session from the data feed: look a few times so the face is right early.
        for (const ms of [0, 2500, 5000]) setTimeout(() => ns.refreshData(), ms);
      };
      const walking = ns.director?.courier?.({ agent: agent || null, name: member?.name ?? '', deliver });
      if (!walking) await deliver();
      await ns.refreshData();
      sel = letter.id;
      if (walking && panel) setTimeout(() => ns.panel.close(), 500); // leave the office in view to watch him go
      else select(letter.id);
    } catch (err) {
      await landed;
      notice = errorText(err);
    } finally {
      sending = false;
      if (panel) refreshMain();
    }
  }
  async function sendReply(l, ta, sendBtn) {
    const text = ta.value.trim();
    if (!text || sending) return;
    sending = true;
    sendBtn.disabled = true;
    notice = '';
    ns.notify?.sfx?.('send');
    const landed = flyPlane(sendBtn);
    try {
      await api('POST', `/api/tasks/${l.id}/reply`, { text });
      draft.prompt = '';
      if (isDirector(l.agent)) ns.director?.expect({ cwd: l.cwd });
      await landed;
      dropLetter();
    } catch (err) {
      await landed;
      notice = errorText(err);
    }
    await ns.refreshData();
    sending = false;
    if (panel) { ui.keys.comp = null; refreshMain(); }
  }
  async function approve(l, btn) {
    btn.disabled = true;
    ns.notify?.sfx?.('send');
    const landed = flyPlane(btn);
    try {
      await api('POST', `/api/tasks/${l.id}/approve`);
      if (isDirector(l.agent)) ns.director?.expect({ cwd: l.cwd });
      await landed;
      dropLetter();
    } catch (err) {
      await landed;
      notice = errorText(err);
    }
    await ns.refreshData();
    if (panel) refreshMain();
  }

  async function act(fn, after) {
    notice = '';
    try {
      await fn();
    } catch (err) {
      notice = errorText(err);
    }
    await ns.refreshData();
    if (after) after();
    ui.refill?.();
    if (panel) refreshMain(true);
  }

  function markRead(l) {
    if (l.read) return;
    l.read = true;
    if (l.report) {
      readReports.add(l.day);
      ns.store.set('readReports', JSON.stringify([...readReports].slice(-30)));
    } else {
      api('POST', `/api/tasks/${l.id}/read`).catch(() => {});
    }
  }

  // ── The panel ──
  function render(body) {
    ui.root = h('div', { class: 'asa-chat' });
    ui.side = h('aside', { class: 'asa-side' });
    ui.main = h('section', { class: 'asa-main' });
    ui.root.append(ui.side, ui.main);
    body.append(ui.root);
    fillSide();
    syncLayout();
    buildMain();
  }
  function refreshAll() {
    if (!panel || !ns.panel.isOpen) return;
    ui.refill?.();
    refreshMain();
  }
  function open(next = {}) {
    if (!document.getElementById('asa-mail-css')) document.head.appendChild(h('style', { id: 'asa-mail-css' }, css));
    notice = '';
    options = null;
    sending = false;
    if (next.name === 'compose' || next === 'new') sel = 'new';
    else if (next.name === 'letter') sel = next.id;
    else sel = narrow() ? null : (letters().find((l) => l.status === 'awaiting') ?? letters().find((l) => !l.read && !l.report && !busy(l)))?.id ?? 'new';
    let timer = null;
    panel = ns.panel.open({ theme: 'cozy', title: `📮 ${S.title}`, render, onClose: () => { clearInterval(timer); panel = null; } });
    panel.el.classList.add('asa-wide');
    ns.refreshData().then(refreshAll);
    // While open, keep running tasks' chats fresh (the composer is never rebuilt while you type).
    timer = setInterval(() => ns.refreshData().then(refreshAll), 4000);
  }
  ns.onFurnitureClick('COZY_MAILBOX', () => open());
  ns.mailbox = { open, compose: () => open({ name: 'compose' }) };

  // ── A letter drops into the mailbox ──
  function drawDrop(ctx, offX, offY, zoom) {
    const age = performance.now() - fx.drop;
    if (!fx.drop || age > 900) return;
    const k = age / 900;
    const u = Math.max(1, Math.round(zoom));
    for (const f of ns.findFurniture('COZY_MAILBOX')) {
      const cx = offX + (f.col * 16 + 8) * zoom;
      const top = offY + f.row * 16 * zoom;
      const y = Math.round(top - 12 * zoom + Math.min(1, k * 2) * 12 * zoom); // the envelope falls in during the first half
      ctx.globalAlpha = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
      ctx.fillStyle = '#2b1a10';
      ctx.fillRect(Math.round(cx - 6 * u), y - u, 12 * u, 9 * u);
      ctx.fillStyle = '#fff6dc';
      ctx.fillRect(Math.round(cx - 5 * u), y, 10 * u, 7 * u);
      ctx.fillStyle = '#c8503c';
      for (let i = 0; i < 5; i++) { ctx.fillRect(Math.round(cx - 5 * u) + i * u, y + i * u, u, u); ctx.fillRect(Math.round(cx + 4 * u) - i * u, y + i * u, u, u); }
      ctx.fillStyle = '#f2c94c';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        const r = (5 + 12 * k) * zoom;
        ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(top + 8 * zoom + Math.sin(a) * r), 2 * u, 2 * u);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Badge + notifications ──
  const lastStatus = new Map();
  let lastPoll = 0;
  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    // Poll faster while a task is running, so the chime comes soon after it finishes.
    const mail = ns.data?.mail ?? [];
    if (mail.some((l) => l.status === 'running') && performance.now() - lastPoll > 5000) {
      lastPoll = performance.now();
      ns.refreshData();
    }
    for (const l of mail) {
      const prev = lastStatus.get(l.id);
      if ((prev === 'running' || prev === 'queued') && l.status !== 'running' && l.status !== 'queued') {
        const name = l.name ?? S.general;
        const first = (l.thread?.[0]?.text ?? '').slice(0, 40);
        const ok = l.status === 'done' || l.status === 'awaiting';
        ns.notify?.message?.({
          icon: l.status === 'awaiting' ? '📝' : ok ? '📬' : '⚠️',
          title: l.status === 'awaiting' ? S.planReady(name) : ok ? S.finished(name, first) : S.failedTask(name),
          body: S.openBox, kind: ok ? 'done' : 'permission',
        });
      }
      lastStatus.set(l.id, l.status);
    }
    if (editMode) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawDrop(ctx, offX, offY, zoom);
    const n = unread();
    if (!n) return void ctx.restore();
    for (const f of ns.findFurniture('COZY_MAILBOX')) {
      const x = offX + (f.col * 16 + 14) * zoom;
      const y = offY + (f.row * 16 + 3) * zoom;
      ctx.fillStyle = '#c8503c';
      ctx.strokeStyle = '#fff6dc';
      ctx.lineWidth = Math.max(1, zoom * 0.8);
      ctx.beginPath();
      ctx.arc(x, y, 4.5 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff6dc';
      ctx.font = `${Math.round(6.5 * zoom)}px "FS Pixel Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n > 9 ? '9+' : String(n), x, y + zoom * 0.5);
    }
    ctx.restore();
  });
})();
