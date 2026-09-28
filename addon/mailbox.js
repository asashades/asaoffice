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
  let draft = { agent: '', cwd: '', prompt: '' };
  let options = null;
  let notice = '';

  function listView(body) {
    const top = h('div', { class: 'asa-mail-top' },
      h('span', { class: 'asa-muted' }, ''),
      h('button', { type: 'button', class: 'asa-btn primary', onclick: () => go({ name: 'compose' }) }, S.compose));
    body.append(top);
    const all = letters();
    if (!all.length) return body.append(h('p', { class: 'asa-muted' }, S.empty));
    body.append(h('div', { class: 'asa-letters' }, all.map((l) => {
      const first = l.report ? S.report : l.thread?.[0]?.text ?? '';
      const status = l.report ? '' : S[l.status] ?? '';
      return h('button', { type: 'button', class: `asa-letter${l.read || l.status === 'running' ? '' : ' unread'}`, onclick: () => go({ name: 'letter', id: l.id }) },
        face(l),
        h('div', { class: 'asa-letter-body' },
          h('b', {}, `${who(l)}${l.project ? ` · ${l.project}` : ''}`),
          h('div', {}, first)),
        h('div', { class: 'asa-letter-status' }, status || (l.report ? l.day : '')));
    })));
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
        h('div', { class: 'asa-muted' }, [m ? ns.staffRole(m) : null, l.project, l.createdAt ? timeOf(l.createdAt) : l.day].filter(Boolean).join(' · ')))));
    if (l.report) return body.append(h('div', { class: 'asa-thread' }, h('div', { class: 'asa-msg' }, l.text)));
    body.append(h('div', { class: 'asa-thread' }, (l.thread ?? []).map((msg) =>
      h('div', { class: `asa-msg ${msg.from === 'you' ? 'you' : ''}` }, h('small', {}, `${msg.from === 'you' ? S.you : who(l)} · ${timeOf(msg.at)}`), msg.text))));
    if (l.error) body.append(h('div', { class: 'asa-warn' }, l.error));
    if (l.cost) body.append(h('div', { class: 'asa-note' }, S.cost(l.cost)));
    if (notice) body.append(h('div', { class: 'asa-warn' }, notice));
    if (l.status === 'running') {
      body.append(h('div', { class: 'asa-actions' }, h('button', { type: 'button', class: 'asa-btn', onclick: () => act(() => api('POST', `/api/tasks/${l.id}/stop`)) }, `⏹ ${S.stop}`)));
      return;
    }
    const box = h('textarea', { placeholder: S.replyPh, rows: '3' });
    const form = h('div', { class: 'asa-form' }, box);
    const send = h('button', { type: 'button', class: 'asa-btn primary' }, S.reply);
    send.onclick = () => {
      const text = box.value.trim();
      if (!text) return;
      send.disabled = true;
      act(() => api('POST', `/api/tasks/${l.id}/reply`, { text }));
    };
    body.append(form, h('div', { class: 'asa-actions' }, send,
      h('button', { type: 'button', class: 'asa-btn', onclick: () => act(() => api('DELETE', `/api/tasks/${l.id}`), { name: 'list' }) }, S.archive)));
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
    whoSel.value = draft.agent;
    const projSel = h('select', {}, options.projects.map((p) => h('option', { value: p.cwd, title: p.cwd }, p.name)));
    projSel.value = draft.cwd;
    const text = h('textarea', { placeholder: S.placeholder, rows: '5' });
    text.value = draft.prompt;
    const note = h('div', { class: 'asa-note' });
    const updateNote = () => {
      const m = options.staff.find((x) => x.agent === whoSel.value);
      const access = m?.access ?? options.general?.access ?? ['read'];
      note.textContent = S.canDo(access.map((a) => S.access[a] ?? a).join(', '));
    };
    whoSel.onchange = () => { draft.agent = whoSel.value; updateNote(); };
    projSel.onchange = () => { draft.cwd = projSel.value; };
    text.oninput = () => { draft.prompt = text.value; };
    updateNote();
    const send = h('button', { type: 'button', class: 'asa-btn primary' }, S.send);
    send.onclick = async () => {
      if (!text.value.trim()) return text.focus();
      send.disabled = true;
      send.textContent = S.sending;
      try {
        const { letter } = await api('POST', '/api/tasks', { agent: whoSel.value || null, cwd: projSel.value, prompt: text.value.trim() });
        draft.prompt = '';
        await ns.refreshData();
        go({ name: 'letter', id: letter.id });
      } catch (err) {
        notice = err.message === 'busy' ? S.busy : err.message === 'noApi' ? S.noApi : `${S.failed} (${err.message})`;
        send.disabled = false;
        send.textContent = S.send;
        rerender();
      }
    };
    body.append(h('div', { class: 'asa-form' },
      h('label', {}, S.who), whoSel, note,
      h('label', {}, S.project), projSel,
      h('label', {}, S.task), text));
    if (notice) body.append(h('div', { class: 'asa-warn' }, notice));
    body.append(h('div', { class: 'asa-actions' }, send));
  }

  async function act(fn, next) {
    notice = '';
    try {
      await fn();
    } catch (err) {
      notice = err.message === 'busy' ? S.busy : err.message === 'noApi' ? S.noApi : `${S.failed} (${err.message})`;
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
      if (view.name === 'compose' || document.activeElement?.tagName === 'TEXTAREA') return;
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
        ns.notify?.message?.({
          icon: l.status === 'done' ? '📬' : '⚠️',
          title: l.status === 'done' ? S.finished(name, first) : S.failedTask(name),
          body: S.openBox, kind: l.status === 'done' ? 'done' : 'permission',
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
