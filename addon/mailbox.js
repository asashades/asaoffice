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
      placeholder: 'Misal: jalanin semua test terus ceritain yang gagal', send: 'Kirim tugas', sending: 'Ngirim…',
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
    },
    en: {
      title: 'Mailbox', compose: '✉️ New task', back: '← Back', empty: 'No letters yet. Send your first task with the button above!',
      who: 'Who should do it?', general: 'Claude (general)', project: 'Project', task: 'What should they do?',
      placeholder: 'E.g. run all the tests and tell me what fails', send: 'Send task', sending: 'Sending…',
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

  // ── Panel ──
  let view = { name: 'list' };
  let panel = null;
  let draft = { agent: null, cwd: '', prompt: '' }; // agent null: not picked yet (the director if he's on staff)
  let options = null;
  let notice = '';

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

  // ── Letters and sessions lists ──
  let tab = 'letters';
  const filter = { status: 'all', project: '', who: '', q: '' };
  const home = (p) => String(p ?? '').replace(/^\/(Users|home)\/[^/]+/, '~');
  const letterTitle = (l) => l.title || (l.thread?.[0]?.text ?? '').split('\n')[0].slice(0, 50) || who(l);
  const statusGroup = (l) => (l.status === 'running' ? 'running' : l.status === 'awaiting' ? 'awaiting' : 'done');
  const has = (text, q) => String(text ?? '').toLowerCase().includes(q);

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
      return h('button', { type: 'button', class: `asa-letter${l.read || l.status === 'running' ? '' : ' unread'}`, onclick: () => go({ name: 'letter', id: l.id }) },
        face(l),
        h('div', { class: 'asa-letter-body' },
          h('b', {}, l.report ? S.report : letterTitle(l)),
          h('div', {}, l.report ? l.day : [who(l), l.project, l.createdAt ? timeOf(l.createdAt) : null].filter(Boolean).join(' · ')),
          l.status === 'running' ? h('div', {}, progressText(l)) : null),
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
      if (letter) row.onclick = () => go({ name: 'letter', id: letter.id });
      return row;
    }) : [h('p', { class: 'asa-muted' }, ns.data?.sessions?.length ? S.noMatch : S.noSessions)]));
  }

  function listView(body) {
    body.append(h('div', { class: 'asa-mail-top' },
      h('div', { class: 'asa-tabs' },
        ['letters', 'sessions'].map((t) => h('button', { type: 'button', class: `asa-btn${tab === t ? ' on' : ''}`, onclick: () => { tab = t; filter.project = ''; filter.who = ''; rerender(); } },
          t === 'letters' ? S.tabLetters : S.tabSessions))),
      h('button', { type: 'button', class: 'asa-btn primary', onclick: () => go({ name: 'compose' }) }, S.compose)));
    const rows = h('div', { class: 'asa-letters' });
    const refill = () => (tab === 'letters' ? letterRows(rows) : sessionRows(rows));
    const search = h('input', { type: 'search', placeholder: S.search, value: filter.q });
    search.oninput = () => { filter.q = search.value; refill(); };
    const filters = h('div', { class: 'asa-filters' }, search);
    const select = (label, key, options) => {
      const el = h('select', {}, h('option', { value: '' }, label), options.map(([v, t]) => h('option', { value: v }, t)));
      el.value = filter[key];
      el.onchange = () => { filter[key] = el.value; refill(); };
      return el;
    };
    const projects = tab === 'letters'
      ? [...new Map(letters().filter((l) => l.cwd).map((l) => [l.cwd, l.project])).entries()]
      : [...new Map((ns.data?.sessions ?? []).filter((x) => x.cwd).map((x) => [x.cwd, `${x.project} — ${home(x.cwd)}`])).entries()];
    if (tab === 'letters') {
      const chips = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', flex: '1 1 100%' } },
        [['all', S.fAll], ['running', S.fRunning], ['awaiting', S.fAwaiting], ['done', S.fDone]].map(([v, t]) => {
          const c = h('button', { type: 'button', class: `asa-chip${filter.status === v ? ' on' : ''}` }, t);
          c.onclick = () => { filter.status = v; chips.querySelectorAll('.asa-chip').forEach((el) => el.classList.toggle('on', el === c)); refill(); };
          return c;
        }));
      const people = [...new Map(letters().filter((l) => !l.report).map((l) => [l.agent ?? '', who(l)])).entries()];
      filters.append(chips, select(S.allProjects, 'project', projects), select(S.allWho, 'who', people));
    } else {
      filters.append(select(S.allProjects, 'project', projects));
      body.append(h('div', { class: 'asa-note' }, S.sessionsNote));
    }
    body.append(filters, rows);
    refill();
  }

  function letterView(body, id) {
    const l = letters().find((x) => x.id === id);
    if (!l) return go({ name: 'list' });
    markRead(l);
    body.append(h('div', { class: 'asa-mail-top' },
      h('button', { type: 'button', class: 'asa-btn', onclick: () => go({ name: 'list' }) }, S.back),
      l.report ? null : h('span', { class: 'asa-letter-status' }, S[l.status] ?? '')));
    const m = staffFor(l);
    body.append(h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, face(l),
      h('div', {}, h('div', { style: { fontSize: '17px' } }, who(l)),
        h('div', { class: 'asa-muted' }, [m ? ns.staffRole(m) : null, l.project, l.mode ? S.modeShort[l.mode] : null, l.createdAt ? timeOf(l.createdAt) : l.day].filter(Boolean).join(' · ')))));
    if (l.report) return body.append(h('div', { class: 'asa-thread' }, h('div', { class: 'asa-msg' }, l.text)));
    const titleBox = h('input', { class: 'asa-title-input', value: letterTitle(l), maxlength: '80', title: S.rename, 'aria-label': S.rename });
    titleBox.onchange = () => { if (titleBox.value.trim()) act(() => api('POST', `/api/tasks/${l.id}/rename`, { title: titleBox.value.trim() })); };
    body.append(titleBox);
    const director = isDirector(l.agent);
    const label = (msg) => (msg.from === 'you' ? null : msg.kind === 'plan' ? S.planLabel : director && msg.kind ? S.reportLabel : null);
    body.append(h('div', { class: 'asa-thread' }, (l.thread ?? []).map((msg) =>
      h('div', { class: `asa-msg ${msg.from === 'you' ? 'you' : ''} ${msg.kind === 'plan' ? 'plan' : ''}` },
        h('small', {}, `${msg.from === 'you' ? S.you : who(l)} · ${timeOf(msg.at)}`), label(msg) ? h('em', {}, label(msg)) : null, msg.text))));
    if (l.error) body.append(h('div', { class: 'asa-warn' }, l.error));
    if (l.cost) body.append(h('div', { class: 'asa-note' }, S.cost(l.cost)));
    if (notice) body.append(h('div', { class: 'asa-warn' }, notice));
    if (l.status === 'running') {
      body.append(h('div', { class: 'asa-note' }, progressText(l)));
      body.append(h('div', { class: 'asa-actions' }, h('button', { type: 'button', class: 'asa-btn', onclick: () => act(() => api('POST', `/api/tasks/${l.id}/stop`)) }, `⏹ ${S.stop}`)));
      return;
    }
    const awaiting = l.status === 'awaiting';
    const box = h('textarea', { placeholder: awaiting ? S.revisePh : S.replyPh, rows: '3' });
    const form = h('div', { class: 'asa-form' }, box);
    // The next run is a new session for the office: tell the director add-on so Shades takes it over at once.
    const resumed = () => { if (director) ns.director?.expect({ cwd: l.cwd }); };
    const send = h('button', { type: 'button', class: `asa-btn${awaiting ? '' : ' primary'}` }, awaiting ? S.revise : S.reply);
    send.onclick = () => {
      const text = box.value.trim();
      if (!text) return box.focus();
      send.disabled = true;
      act(async () => { await api('POST', `/api/tasks/${l.id}/reply`, { text }); resumed(); });
    };
    const archive = h('button', { type: 'button', class: 'asa-btn', onclick: () => act(() => api('DELETE', `/api/tasks/${l.id}`), { name: 'list' }) }, S.archive);
    if (awaiting) {
      const approve = h('button', { type: 'button', class: 'asa-btn primary' }, S.approve);
      approve.onclick = () => { approve.disabled = true; act(async () => { await api('POST', `/api/tasks/${l.id}/approve`); resumed(); }); };
      const reject = h('button', { type: 'button', class: 'asa-btn', onclick: () => act(() => api('POST', `/api/tasks/${l.id}/reject`)) }, S.reject);
      body.append(h('div', { class: 'asa-actions' }, approve, reject), form, h('div', { class: 'asa-actions' }, send, archive), copyButton(l));
      return;
    }
    body.append(form, h('div', { class: 'asa-actions' }, send, archive), copyButton(l));
  }

  function composeView(body) {
    body.append(h('div', { class: 'asa-mail-top' }, h('button', { type: 'button', class: 'asa-btn', onclick: () => go({ name: 'list' }) }, S.back)));
    if (!options) {
      body.append(h('p', { class: 'asa-muted' }, '…'));
      api('GET', '/api/options').then((o) => { options = o; rerender(); }).catch(() => { options = { error: true }; rerender(); });
      return;
    }
    if (options.error) return body.append(h('div', { class: 'asa-warn' }, S.noApi));
    if (!options.claude) return body.append(h('div', { class: 'asa-warn' }, S.noClaude));
    if (!options.projects.length) return body.append(h('div', { class: 'asa-warn' }, S.noProject));
    if (!draft.cwd || !options.projects.some((p) => p.cwd === draft.cwd)) draft.cwd = options.projects[0].cwd;
    const pick = (v) => (v && typeof v === 'object' ? v[ns.lang] ?? v.en : v);
    const whoSel = h('select', {}, h('option', { value: '' }, S.general),
      options.staff.map((m) => h('option', { value: m.agent }, `${m.name} — ${pick(m.role)}`)));
    if (draft.agent === null) draft.agent = options.staff.find((m) => m.director)?.agent ?? '';
    whoSel.value = draft.agent;
    const projSel = h('select', {}, options.projects.map((p) => h('option', { value: p.cwd, title: p.cwd }, `${p.name} — ${home(p.cwd)}`)));
    projSel.value = draft.cwd;
    const text = h('textarea', { placeholder: S.placeholder, rows: '5' });
    text.value = draft.prompt;
    const note = h('div', { class: 'asa-note' });
    const modeSel = h('select', {}, Object.entries(S.modes).map(([v, label]) => h('option', { value: v }, label)));
    const styleSel = h('select', {}, Object.entries(S.styles).map(([v, label]) => h('option', { value: v }, label)));
    styleSel.value = draft.style ?? 'solo';
    const styleRow = h('div', {}, h('label', {}, S.style), styleSel);
    const member = () => options.staff.find((x) => x.agent === whoSel.value);
    const updateNote = () => {
      const m = member();
      const access = m?.access ?? options.general?.access ?? ['read'];
      note.textContent = S.canDo(access.map((a) => S.access[a] ?? a).join(', '));
      styleRow.style.display = m?.director ? '' : 'none';
    };
    // The director plans first by default; everyone else just does it (as before). Your pick sticks per person.
    const defaultMode = () => draft.modes?.[whoSel.value] ?? (member()?.director ? 'plan' : 'auto');
    modeSel.value = defaultMode();
    modeSel.onchange = () => { draft.modes = { ...draft.modes, [whoSel.value]: modeSel.value }; };
    styleSel.onchange = () => { draft.style = styleSel.value; };
    whoSel.onchange = () => { draft.agent = whoSel.value; modeSel.value = defaultMode(); updateNote(); };
    projSel.onchange = () => { draft.cwd = projSel.value; };
    text.oninput = () => { draft.prompt = text.value; };
    updateNote();
    const send = h('button', { type: 'button', class: 'asa-btn primary' }, S.send);
    send.onclick = async () => {
      if (!text.value.trim()) return text.focus();
      send.disabled = true;
      send.textContent = S.sending;
      try {
        const director = !!member()?.director;
        const { letter } = await api('POST', '/api/tasks', {
          agent: whoSel.value || null, cwd: projSel.value, prompt: text.value.trim(), mode: modeSel.value,
          style: director ? styleSel.value : undefined,
        });
        if (director) ns.director?.expect({ cwd: letter.cwd, prompt: text.value.trim(), meeting: true });
        draft.prompt = '';
        await ns.refreshData();
        go({ name: 'letter', id: letter.id });
      } catch (err) {
        notice = errorText(err);
        send.disabled = false;
        send.textContent = S.send;
        rerender();
      }
    };
    body.append(h('div', { class: 'asa-form' },
      h('label', {}, S.who), whoSel, note,
      h('label', {}, S.mode), modeSel, styleRow,
      h('label', {}, S.project), projSel,
      h('label', {}, S.task), text));
    if (notice) body.append(h('div', { class: 'asa-warn' }, notice));
    body.append(h('div', { class: 'asa-actions' }, send));
  }

  const errorText = (err) => ({ busy: S.busy, noApi: S.noApi, 'director busy': S.directorBusy })[err.message] ?? `${S.failed} (${err.message})`;
  const isDirector = (agent) => !!(ns.data?.staff ?? []).find((m) => m.agent === agent)?.director;
  function copyButton(l) {
    const btn = h('button', { type: 'button', class: 'asa-btn' }, S.copyCmd);
    btn.onclick = async () => {
      if (await copyText(terminalCommand(l))) {
        btn.textContent = S.copied;
        setTimeout(() => { btn.textContent = S.copyCmd; }, 3000);
      }
    };
    return h('div', {}, h('div', { class: 'asa-actions' }, btn), h('div', { class: 'asa-note' }, S.copyNote));
  }
  async function act(fn, next) {
    notice = '';
    try {
      await fn();
    } catch (err) {
      notice = errorText(err);
    }
    await ns.refreshData();
    if (next) view = next;
    rerender();
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

  function render(body) {
    if (view.name === 'compose') composeView(body);
    else if (view.name === 'letter') letterView(body, view.id);
    else listView(body);
  }
  function rerender() { if (panel && ns.panel.isOpen) panel.rerender(); }
  function go(next) {
    view = next;
    notice = '';
    if (next.name === 'compose') options = null;
    rerender();
  }

  function open(next = { name: 'list' }) {
    if (!document.getElementById('asa-mail-css')) document.head.appendChild(h('style', { id: 'asa-mail-css' }, css));
    view = next;
    notice = '';
    options = null;
    let timer = null;
    panel = ns.panel.open({ theme: 'cozy', title: `📮 ${S.title}`, render, onClose: () => { clearInterval(timer); panel = null; } });
    ns.refreshData().then(rerender);
    // While open, keep running tasks' letters fresh (but don't wipe what you're typing).
    timer = setInterval(() => {
      if (view.name === 'compose' || ['TEXTAREA', 'INPUT', 'SELECT'].includes(document.activeElement?.tagName)) return;
      ns.refreshData().then(rerender);
    }, 4000);
  }
  ns.onFurnitureClick('COZY_MAILBOX', () => open());
  ns.mailbox = { open, compose: () => open({ name: 'compose' }) };

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
      if (prev === 'running' && l.status !== 'running') {
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
    const n = unread();
    if (!n) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
