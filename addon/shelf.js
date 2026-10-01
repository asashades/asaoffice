// asaoffice Bookshelf (Rak Buku): click any bookshelf to open the Commissioner's notes — an Obsidian vault
// (~/AsaOffice-Vault, or $OFFICE_VAULT), which is just a folder of Markdown files served by the local task API
// (tools/lib/vault.mjs). Read and search notes, jot an idea, tick off to-dos, send an idea to Shades as a task,
// write today's report, and open the vault in Obsidian. Notes that contain #konteks are also given to the team as
// context for every task. Only this Mac can use it (the API is loopback-only), so a phone sees a hint instead.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Rak Buku', vault: 'Vault', openObsidian: 'Buka di Obsidian', hintVault: 'Di Obsidian: Open folder as vault, lalu pilih folder ini.',
      search: 'Cari catatan…', newIdea: 'Tulis ide baru, Enter buat simpan', newNote: '+ Catatan', newNoteTitle: 'Catatan baru', changeVault: 'Ubah folder', vaultPlaceholder: 'Tempel path folder vault Obsidian…', vaultFromEnv: 'Diatur lewat OFFICE_VAULT di Terminal.',
      vaultErr: { relative: 'Pakai path lengkap, mulai dari / atau ~.', notfound: 'Folder itu gak ketemu.', outside: 'Folder harus ada di dalam folder home kamu.', perm: 'Gak bisa akses folder itu. Di Mac: System Settings → Privacy & Security → Files and Folders (atau Full Disk Access), izinkan Terminal.', env: 'Diatur lewat OFFICE_VAULT di Terminal.' }, report: '📜 Tulis laporan hari ini',
      ideas: '💡 Ide & TODO', reports: '📜 Laporan', notes: '📝 Catatan', other: '📁 Lainnya', empty: 'Belum ada catatan di sini.', pick: 'Pilih catatan di kiri.',
      edit: 'Ubah', save: 'Simpan', cancel: 'Batal', saved: 'Tersimpan.', toShades: '→ Shades', toShadesTip: 'Kirim jadi tugas ke Shades', context: 'Dibaca tim sebagai konteks',
      offline: 'Rak buku cuma bisa dibuka dari Mac yang menjalankan kantor (npm run office).', failed: 'Gagal: ',
      contextNote: 'Tulis #konteks di catatan biar dibaca Shades dan tim tiap ada tugas.',
      reportH: (d) => `Laporan ${d}`, today: (d, s, t, f) => `Hari ini (${d}): ${s} sesi Claude, ${t} tool call, ${f} file diedit.`,
      quiet: 'Hari ini belum ada sesi Claude.', streak: (n) => `Streak kerja: ${n} hari 🔥`, done: 'Tugas selesai', decide: 'Menunggu keputusanmu', none: 'Belum ada.',
      ago: (m) => (m < 1 ? 'baru saja' : m < 60 ? `${m} mnt lalu` : m < 1440 ? `${Math.round(m / 60)} jam lalu` : `${Math.round(m / 1440)} hari lalu`),
    },
    en: {
      title: 'Bookshelf', vault: 'Vault', openObsidian: 'Open in Obsidian', hintVault: 'In Obsidian: Open folder as vault, then pick this folder.',
      search: 'Search notes…', newIdea: 'Write a new idea, Enter to save', newNote: '+ Note', newNoteTitle: 'New note', changeVault: 'Change folder', vaultPlaceholder: 'Paste the path of your Obsidian vault folder…', vaultFromEnv: 'Set by OFFICE_VAULT in Terminal.',
      vaultErr: { relative: 'Use the full path, starting with / or ~.', notfound: 'That folder was not found.', outside: 'The folder must be inside your home folder.', perm: 'Cannot access that folder. On a Mac: System Settings → Privacy & Security → Files and Folders (or Full Disk Access), allow Terminal.', env: 'Set by OFFICE_VAULT in Terminal.' }, report: "📜 Write today's report",
      ideas: '💡 Ideas & TODO', reports: '📜 Reports', notes: '📝 Notes', other: '📁 Other', empty: 'No notes here yet.', pick: 'Pick a note on the left.',
      edit: 'Edit', save: 'Save', cancel: 'Cancel', saved: 'Saved.', toShades: '→ Shades', toShadesTip: 'Send to Shades as a task', context: 'Read by the team as context',
      offline: 'The bookshelf only opens from the Mac that runs the office (npm run office).', failed: 'Failed: ',
      contextNote: 'Write #konteks in a note to have Shades and the team read it with every task.',
      reportH: (d) => `Report ${d}`, today: (d, s, t, f) => `Today (${d}): ${s} Claude sessions, ${t} tool calls, ${f} files edited.`,
      quiet: 'No Claude sessions yet today.', streak: (n) => `Work streak: ${n} days 🔥`, done: 'Tasks done', decide: 'Waiting for your decision', none: 'None yet.',
      ago: (m) => (m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`),
    },
  });

  const css = `
  .asa-shelf { display: flex; gap: 14px; min-height: 420px; }
  .asa-shelf-side { width: 240px; flex: none; display: flex; flex-direction: column; gap: 8px; }
  .asa-shelf-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .asa-shelf input, .asa-shelf textarea { font: inherit; font-size: 14px; padding: 5px 7px; background: #fffbe9; color: #3a2117;
    border: 2px solid #d9c49a; width: 100%; }
  .asa-panel.asa-plain .asa-shelf textarea { flex: 1; min-height: 320px; resize: vertical; font-family: ui-monospace, Menlo, monospace; font-size: 13px; }
  .asa-shelf-list { overflow: auto; max-height: 360px; border: 2px solid #d9c49a; background: #fffbe9; }
  .asa-shelf-group { font-size: 12px; padding: 6px 8px 2px; color: #973a2f; }
  .asa-shelf-item { display: block; width: 100%; text-align: left; font: inherit; font-size: 14px; padding: 5px 8px; cursor: pointer;
    background: none; color: inherit; border: 0; border-left: 4px solid transparent; }
  .asa-shelf-item:hover { background: #f4e6c4; }
  .asa-shelf-item.on { background: #f4e6c4; border-left-color: #c8503c; }
  .asa-shelf-item small { display: block; opacity: 0.6; font-size: 11px; }
  .asa-shelf-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
  .asa-shelf-bar .grow { flex: 1; }
  .asa-shelf-doc { border: 2px solid #d9c49a; background: #fffbe9; padding: 10px 14px; overflow: auto; max-height: 380px; font-size: 14px; }
  .asa-shelf-doc h1, .asa-shelf-doc h2, .asa-shelf-doc h3 { font-weight: normal; margin: 10px 0 4px; color: #973a2f; }
  .asa-shelf-doc h1 { font-size: 20px; } .asa-shelf-doc h2 { font-size: 17px; } .asa-shelf-doc h3 { font-size: 15px; }
  .asa-shelf-doc p, .asa-shelf-doc li { margin: 3px 0; }
  .asa-shelf-doc ul { margin: 4px 0; padding-left: 20px; }
  .asa-shelf-doc code { background: #f0e2bb; padding: 0 3px; }
  .asa-shelf-doc .tag { color: #4a86d8; } .asa-shelf-doc .wiki { color: #7a4fb8; }
  .asa-shelf-task { display: flex; gap: 8px; align-items: baseline; margin: 4px 0; }
  .asa-shelf-task.done span { text-decoration: line-through; opacity: 0.55; }
  .asa-shelf-task input { width: auto; }
  .asa-shelf-task .asa-btn { margin-left: auto; padding: 1px 8px; font-size: 12px; }
  .asa-shelf-msg { font-size: 13px; margin-top: 6px; min-height: 16px; }
  @media (max-width: 640px) { .asa-shelf { flex-direction: column; } .asa-shelf-side { width: 100%; } }
  `;

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

  const IDEAS = 'Ide-TODO.md';
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // ── A small Markdown reader: headings, lists, checkboxes, bold/italic/code, #tags, [[links]] ──
  function inline(text) {
    const out = [];
    const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|\[\[[^\]]+\]\]|#[\p{L}\p{N}_/-]+)/gu;
    let last = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const t = m[0];
      if (t.startsWith('**')) out.push(h('b', {}, t.slice(2, -2)));
      else if (t.startsWith('`')) out.push(h('code', {}, t.slice(1, -1)));
      else if (t.startsWith('[[')) out.push(h('span', { class: 'wiki' }, t.slice(2, -2).split('|').pop()));
      else if (t.startsWith('#')) out.push(h('span', { class: 'tag' }, t));
      else out.push(h('i', {}, t.slice(1, -1)));
      last = m.index + t.length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  let state = null; // the open panel's state

  function renderNote(el, text, rel) {
    const lines = text.split('\n');
    let list = null;
    lines.forEach((line, i) => {
      const task = /^(\s*)[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(line);
      const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
      const head = /^(#{1,3})\s+(.*)$/.exec(line);
      if (task || bullet) {
        if (!list) { list = h('ul', { style: task ? { listStyle: 'none', paddingLeft: '2px' } : {} }); el.append(list); }
      } else list = null;
      if (task) {
        const done = task[2] !== ' ';
        const box = h('input', { type: 'checkbox', onchange: () => toggle(rel, i, box.checked) });
        box.checked = done;
        const row = h('li', { class: `asa-shelf-task${done ? ' done' : ''}` }, box, h('span', {}, inline(task[3])));
        if (!done && rel === IDEAS) {
          row.append(h('button', { type: 'button', class: 'asa-btn', title: S.toShadesTip, onclick: () => { ns.panel.close(); ns.mailbox?.compose(task[3].replace(/#konteks\b/g, '').trim()); } }, S.toShades));
        }
        list.append(row);
      } else if (bullet) list.append(h('li', {}, inline(bullet[1])));
      else if (head) el.append(h(`h${head[1].length}`, {}, inline(head[2].replace(/\s*#konteks\b/g, ''))));
      else if (line.trim()) el.append(h('p', {}, inline(line)));
    });
  }

  async function toggle(rel, lineNo, checked) {
    try {
      const { text } = await api('GET', `/api/vault/note?path=${encodeURIComponent(rel)}`);
      const lines = text.split('\n');
      lines[lineNo] = lines[lineNo].replace(/\[( |x|X)\]/, checked ? '[x]' : '[ ]');
      await api('POST', '/api/vault/note', { path: rel, text: lines.join('\n') });
      await load(rel);
    } catch (err) { say(S.failed + err.message); }
  }

  const say = (t) => { if (state?.msg) state.msg.textContent = t; };
  const group = (n) => (n.path === IDEAS ? 'ideas' : n.path.startsWith('Laporan/') ? 'reports' : n.path.startsWith('Catatan/') ? 'notes' : 'other');

  async function load(select = state?.sel, q = state?.q ?? '') {
    const res = await api('GET', `/api/vault${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    state.vault = res.path;
    state.fromEnv = !!res.fromEnv;
    state.notes = res.notes;
    state.sel = select && res.notes.some((n) => n.path === select) ? select : (res.notes.find((n) => n.path === IDEAS) ?? res.notes[0])?.path ?? null;
    state.editing = false;
    state.text = state.sel ? (await api('GET', `/api/vault/note?path=${encodeURIComponent(state.sel)}`)).text : '';
    state.panel?.rerender();
  }

  async function openNote(rel) {
    state.fresh = false;
    state.sel = rel;
    state.editing = false;
    try { state.text = (await api('GET', `/api/vault/note?path=${encodeURIComponent(rel)}`)).text; } catch (err) { state.text = ''; say(S.failed + err.message); }
    state.panel.rerender();
  }

  async function writeReport() {
    const day = dayKey();
    const d = ns.data?.stats?.days?.[day];
    const mail = (ns.data?.mail ?? []).filter((l) => !l.report);
    const doneToday = mail.filter((l) => l.status === 'done' && l.finishedAt && dayKey(new Date(l.finishedAt)) === day);
    const waiting = mail.filter((l) => l.status === 'awaiting');
    const line = (l) => `- ${l.title}${l.name ? ` (${l.name})` : ''}`;
    const parts = [`# ${S.reportH(day)}`, ''];
    parts.push(d?.tools ? S.today(day, d.sessions ?? 0, d.tools, d.files ?? 0) : S.quiet);
    if (ns.data?.stats?.streak) parts.push('', S.streak(ns.data.stats.streak));
    parts.push('', `## ${S.done}`, ...(doneToday.length ? doneToday.map(line) : [S.none]));
    parts.push('', `## ${S.decide}`, ...(waiting.length ? waiting.map(line) : [S.none]), '');
    const rel = `Laporan/${day}.md`;
    try {
      await api('POST', '/api/vault/note', { path: rel, text: parts.join('\n') });
      await load(rel);
    } catch (err) { say(S.failed + err.message); }
  }

  /** A new note opens straight in the editor; its file is named from the first line when you save it. */
  function newNote() {
    state.fresh = true;
    state.editing = true;
    state.draft = '# ';
    state.panel.rerender();
  }
  async function saveFresh(text) {
    const first = text.split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).find(Boolean);
    const stamp = new Date().toLocaleString('sv-SE', { hour12: false }).replace(/:/g, '.').slice(0, 16);
    const name = String(first || `${S.newNoteTitle} ${stamp}`).replace(/[\\/:*?"<>|#]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    let rel = `Catatan/${name}.md`;
    for (let i = 2; state.notes.some((n) => n.path === rel); i++) rel = `Catatan/${name} ${i}.md`;
    try {
      await api('POST', '/api/vault/note', { path: rel, text });
      state.fresh = false;
      await load(rel);
    } catch (err) { say(S.failed + err.message); }
  }

  function side() {
    const search = h('input', { type: 'search', placeholder: S.search, value: state.q ?? '' });
    let timer = null;
    search.oninput = () => { clearTimeout(timer); timer = setTimeout(() => { state.q = search.value; load(state.sel, state.q).then(() => { const i = state?.panel?.el.querySelector('input[type=search]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }).catch((e) => say(S.failed + e.message)); }, 250); };
    const idea = h('input', { type: 'text', placeholder: S.newIdea, maxlength: 500 });
    idea.onkeydown = async (e) => {
      if (e.key !== 'Enter' || !idea.value.trim()) return;
      try { await api('POST', '/api/vault/idea', { text: idea.value }); idea.value = ''; await load(IDEAS); } catch (err) { say(S.failed + err.message); }
    };
    const list = h('div', { class: 'asa-shelf-list' });
    for (const g of ['ideas', 'reports', 'notes', 'other']) {
      const items = state.notes.filter((n) => group(n) === g);
      if (!items.length) continue;
      list.append(h('div', { class: 'asa-shelf-group' }, S[g]));
      for (const n of items) {
        const mins = Math.max(0, Math.round((Date.now() - n.mtime) / 60000));
        list.append(h('button', { type: 'button', class: `asa-shelf-item${n.path === state.sel ? ' on' : ''}`, onclick: () => openNote(n.path) },
          `${n.context ? '🔖 ' : ''}${n.title}`, h('small', {}, S.ago(mins))));
      }
    }
    if (!state.notes.length) list.append(h('div', { class: 'asa-muted', style: { padding: '10px' } }, S.empty));
    return h('aside', { class: 'asa-shelf-side' }, search, idea, list,
      h('div', { class: 'asa-shelf-bar' }, h('button', { type: 'button', class: 'asa-btn', onclick: newNote }, S.newNote)),
      h('button', { type: 'button', class: 'asa-btn primary', onclick: writeReport }, S.report));
  }

  function main() {
    const sel = state.fresh ? null : state.notes.find((n) => n.path === state.sel);
    const bar = h('div', { class: 'asa-shelf-bar' }, h('b', { class: 'grow' }, state.fresh ? S.newNoteTitle : sel ? sel.path : S.title));
    const doc = h('div', { class: 'asa-shelf-doc' });
    if (state.fresh) {
      const ta = h('textarea', {});
      ta.value = state.draft ?? '# ';
      ta.oninput = () => { state.draft = ta.value; };
      bar.append(
        h('button', { type: 'button', class: 'asa-btn primary', onclick: () => saveFresh(ta.value) }, S.save),
        h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.fresh = false; state.editing = false; state.draft = null; state.panel.rerender(); } }, S.cancel),
      );
      setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 0);
      return h('section', { class: 'asa-shelf-main' }, bar, ta, h('div', { class: 'asa-shelf-msg' }), vaultFooter());
    }
    if (!sel) doc.append(h('p', { class: 'asa-muted' }, S.pick));
    else if (state.editing) {
      const ta = h('textarea', {});
      ta.value = state.draft ?? state.text;
      ta.oninput = () => { state.draft = ta.value; };
      bar.append(
        h('button', { type: 'button', class: 'asa-btn primary', onclick: async () => {
          try { await api('POST', '/api/vault/note', { path: sel.path, text: ta.value }); await load(sel.path); say(S.saved); } catch (err) { say(S.failed + err.message); }
        } }, S.save),
        h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.editing = false; state.draft = null; state.panel.rerender(); } }, S.cancel),
      );
      return h('section', { class: 'asa-shelf-main' }, bar, ta, h('div', { class: 'asa-shelf-msg' }), vaultFooter());
    } else {
      renderNote(doc, state.text, sel.path);
      bar.append(h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.editing = true; state.draft = state.text; state.panel.rerender(); } }, S.edit));
      if (state.vault) {
        const abs = `${state.vault}/${sel.path}`;
        bar.append(h('a', { class: 'asa-btn', href: `obsidian://open?path=${encodeURIComponent(abs)}`, style: { textDecoration: 'none' }, title: S.hintVault }, S.openObsidian));
      }
    }
    state.msg = h('div', { class: 'asa-shelf-msg' }, sel?.context ? `🔖 ${S.context}` : '');
    return h('section', { class: 'asa-shelf-main' }, bar, doc, state.msg, vaultFooter());
  }

  /** Where the vault is, with a way to point it at an existing Obsidian vault (no popup: an inline field). */
  function vaultFooter() {
    const box = h('div', { class: 'asa-muted', style: { marginTop: '6px' } });
    const line = h('div', {}, `${S.vault}: ${state.vault ?? ''} · ${S.contextNote} `);
    if (!state.fromEnv) {
      line.append(h('button', { type: 'button', class: 'asa-chip', onclick: () => { state.pathEdit = !state.pathEdit; state.panel.rerender(); } }, S.changeVault));
    } else line.append(S.vaultFromEnv);
    box.append(line);
    if (state.pathEdit && !state.fromEnv) {
      const input = h('input', { type: 'text', placeholder: S.vaultPlaceholder, value: state.vault ?? '', 'aria-label': S.vaultPlaceholder, style: { marginTop: '6px' } });
      const err = h('div', { style: { color: '#973a2f', marginTop: '4px' } });
      const go = async () => {
        try {
          await api('POST', '/api/vault/path', { path: input.value });
          state.pathEdit = false;
          await load(null);
        } catch (e) { err.textContent = S.vaultErr[e.message] ?? S.failed + e.message; }
      };
      input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
      box.append(input, h('button', { type: 'button', class: 'asa-btn primary', style: { marginTop: '6px' }, onclick: go }, S.save), err);
    }
    return box;
  }

  function open() {
    if (!document.getElementById('asa-shelf-css')) document.head.appendChild(h('style', { id: 'asa-shelf-css' }, css));
    state = { notes: [], sel: null, text: '', q: '', vault: null, editing: false, draft: null, panel: null, msg: null };
    state.panel = ns.panel.open({
      theme: 'cozy',
      dock: 'hud',
      title: `📚 ${S.title}`,
      onClose: () => { state = null; },
      render(body) {
        if (state.offline) { body.append(h('p', {}, S.offline)); return; }
        body.append(h('div', { class: 'asa-shelf' }, side(), main()));
      },
    });
    state.panel.el.classList.add('asa-plain');
    ns.refreshData().then(() => load(null)).catch(() => { if (state) { state.offline = true; state.panel.rerender(); } });
  }

  ns.onFurnitureClick('COZY_BOOKSHELF', open);
  ns.shelf = { open };
})();
