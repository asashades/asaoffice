// asaoffice daily report (📜 Laporan harian): the office drafts the day from the tasks and Claude Code sessions, but the Commissioner words it:
// every line can be reworded or left out, highlights are added (they become Obsidian callouts, `> [!tip] Judul`), and only on "Simpan ke Jurnal" is the
// day's note in the vault written (tools/lib/journal.mjs). In the evening, once, a toast asks whether to write it. Reachable from the bookshelf
// ("📜 Tulis laporan") and the toast; `ns.report.open(day?)`.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Laporan harian', today: 'Hari ini', yesterday: 'Kemarin', prev: 'Hari sebelumnya', next: 'Hari berikutnya',
      intro: 'Cek dulu pekerjaannya. Ubah kalimat yang kurang pas, hilangkan centang yang tidak mau dicatat, lalu tulis highlight-nya.',
      total: (n) => `Total pekerjaan: ${n}`, tokens: (t) => `${t} token dipakai`,
      none: 'Belum ada pekerjaan di hari ini. Kamu tetap bisa menulis highlight.', noProject: 'Lainnya',
      status: { done: '', awaiting: 'rencana menunggu persetujuan', running: 'masih berjalan', queued: 'antre', error: 'gagal', stopped: 'dihentikan', rejected: 'ditolak' },
      fresh: 'baru', include: 'Catat', textLabel: 'Kalimat di laporan',
      hlLabel: 'Highlight penting hari ini', hlPh: 'Baris pertama boleh "Judul: isinya". Enter = lanjut di callout yang sama, baris kosong = callout baru.',
      hlHint: 'Tampil di Obsidian sebagai callout, misalnya:',
      save: 'Simpan ke Jurnal', saving: 'Menyimpan…', open: 'Buka di Rak Buku',
      saved: (rel) => `Tersimpan di ${rel}.`, same: 'Sudah sama dengan isi catatan, tidak ada yang berubah.', quiet: 'Belum ada yang ditulis: centang satu pekerjaan atau isi highlight.',
      off: 'Penulisan ke Jurnal sedang dimatikan.', vault: 'Vault Obsidian belum bisa dibaca (iCloud belum selesai sinkron, atau foldernya dipindah), jadi laporannya belum bisa ditulis.',
      permission: 'Vault belum bisa dibuka: beri aplikasi Asa Office izin Akses Penuh ke Disk (Pengaturan Sistem → Privasi & Keamanan), lalu buka lagi.',
      write: 'Gagal menulis catatannya.', failed: 'Gagal: ', offline: 'Laporan hanya bisa ditulis dari Mac yang menjalankan kantor.',
      nudge: 'Mau tulis laporan hari ini?', nudgeBody: (n) => `${n} pekerjaan hari ini menunggu kamu cek.`,
    },
    en: {
      title: 'Daily report', today: 'Today', yesterday: 'Yesterday', prev: 'Previous day', next: 'Next day',
      intro: 'Check the work first. Reword what is off, untick what should not be recorded, then write the highlights.',
      total: (n) => `Total work: ${n}`, tokens: (t) => `${t} tokens used`,
      none: 'No work yet today. You can still write highlights.', noProject: 'Other',
      status: { done: '', awaiting: 'plan waiting for approval', running: 'still running', queued: 'queued', error: 'failed', stopped: 'stopped', rejected: 'rejected' },
      fresh: 'new', include: 'Record', textLabel: 'Sentence in the report',
      hlLabel: 'Important highlights of the day', hlPh: 'The first line may be "Title: text". Enter continues the same callout, a blank line starts a new one.',
      hlHint: 'Shown in Obsidian as a callout, for example:',
      save: 'Save to the Journal', saving: 'Saving…', open: 'Open in the Bookshelf',
      saved: (rel) => `Saved in ${rel}.`, same: 'Already the same as the note, nothing changed.', quiet: 'Nothing to write yet: tick a piece of work or add a highlight.',
      off: 'Writing to the Journal is switched off.', vault: 'The Obsidian vault can\'t be read right now (iCloud still syncing, or the folder moved), so the report can\'t be written yet.',
      permission: 'The vault can\'t be opened: give the Asa Office app Full Disk Access (System Settings → Privacy & Security), then open it again.',
      write: 'Could not write the note.', failed: 'Failed: ', offline: 'The report can only be written from the Mac that runs the office.',
      nudge: 'Write today\'s report?', nudgeBody: (n) => `${n} pieces of work today are waiting for you to check.`,
    },
  });
  const css = `
  .asa-rep { display: flex; flex-direction: column; gap: 10px; font-size: 14px; }
  .asa-rep-nav { display: flex; align-items: center; gap: 8px; }
  .asa-rep-nav b { font-weight: normal; font-size: 16px; flex: 1; }
  .asa-rep-nav .asa-btn { padding: 2px 10px; }
  .asa-rep-total { font-size: 15px; padding: 6px 10px; background: #fffbe9; border: 2px solid #c9a877; }
  .asa-rep-total small { opacity: 0.7; margin-left: 8px; font-size: 12px; }
  .asa-rep-proj { margin: 4px 0 2px; font-size: 13px; color: #973a2f; }
  .asa-rep-row { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 4px 8px; align-items: start; padding: 4px 0; border-top: 1px dashed #dcc79a; }
  .asa-rep-row input[type="checkbox"] { margin-top: 7px; width: 16px; height: 16px; }
  .asa-rep-row input[type="text"] { font: inherit; font-size: 13.5px; width: 100%; padding: 4px 6px; background: #fffbe9; color: #3a2117; border: 2px solid #d9c49a; box-sizing: border-box; }
  .asa-rep-row.off input[type="text"] { opacity: 0.5; }
  .asa-rep-meta { grid-column: 2; font-size: 11.5px; opacity: 0.7; }
  .asa-rep-new { display: inline-block; padding: 0 5px; margin-left: 6px; background: #f2c94c; color: #3a2117; font-size: 11px; }
  .asa-rep textarea { font: inherit; font-size: 13.5px; width: 100%; min-height: 78px; padding: 6px; background: #fffbe9; color: #3a2117; border: 2px solid #744122; box-sizing: border-box; resize: vertical; }
  .asa-rep-hint { font-size: 12px; opacity: 0.75; }
  .asa-rep-hint pre { margin: 4px 0 0; padding: 6px 8px; background: #fffbe9; border-left: 4px solid #3f8a8f; font: inherit; font-size: 12px; white-space: pre-wrap; }
  .asa-rep-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .asa-rep-msg { min-height: 18px; font-size: 13px; }
  .asa-rep-msg.warn { background: #ffe0d0; border: 1px solid #c8503c; padding: 6px 8px; }
  `;
  let st = null;
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (offset) => { const d = new Date(); d.setDate(d.getDate() - offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

  async function load() {
    try {
      const data = await ns.localApi('GET', `/api/journal/day?day=${keyOf(st.offset)}`);
      st.data = data;
      st.items = new Map(data.items.map((it) => [it.id, { text: it.text, include: it.include }]));
      st.highlights = data.highlights ?? '';
      st.msg = null;
    } catch (err) { st.offline = err.message === 'noApi'; st.msg = { warn: true, text: st.offline ? S.offline : S.failed + err.message }; }
    st.panel?.rerender();
  }

  const dayLabel = () => (st.offset === 0 ? S.today : st.offset === 1 ? S.yesterday : keyOf(st.offset));
  const countKept = () => [...st.items.values()].filter((v) => v.include && v.text.trim()).length;

  async function save(btn) {
    btn.disabled = true;
    st.msg = { text: S.saving };
    paintMsg();
    try {
      const out = await ns.localApi('POST', '/api/journal/day', {
        day: keyOf(st.offset), highlights: st.highlights,
        items: [...st.items].map(([id, v]) => ({ id, text: v.text, include: v.include })),
      });
      st.rel = out.rel;
      const reason = out.reason;
      st.msg = reason === 'ok' ? { text: S.saved(out.rel), done: true } : reason === 'same' ? { text: S.same, done: true } : reason === 'quiet' ? { text: S.quiet }
        : reason === 'off' ? { warn: true, text: S.off } : reason === 'vault' ? { warn: true, text: S.vault } : { warn: true, text: S.write };
      if (reason === 'ok' || reason === 'same') ns.store?.set?.(`reportDone-${keyOf(st.offset)}`, '1');
    } catch (err) { st.msg = { warn: true, text: S.failed + err.message }; }
    btn.disabled = false;
    st.panel?.rerender();
  }

  function paintMsg() { if (st?.msgEl) { st.msgEl.className = `asa-rep-msg${st.msg?.warn ? ' warn' : ''}`; st.msgEl.textContent = st.msg?.text ?? ''; } }

  function render(body) {
    if (!st.data) { body.append(h('p', { class: 'asa-muted' }, st.msg?.text ?? '…')); return; }
    const d = st.data;
    const total = h('div', { class: 'asa-rep-total' }, S.total(countKept()), d.tokens ? h('small', {}, S.tokens(ns.fmtTokens(d.tokens))) : null);
    const retotal = () => { total.firstChild.textContent = S.total(countKept()); };
    const nav = h('div', { class: 'asa-rep-nav' },
      h('button', { type: 'button', class: 'asa-btn', title: S.prev, 'aria-label': S.prev, disabled: st.offset >= 13, onclick: () => { st.offset++; st.data = null; st.panel.rerender(); load(); } }, '‹'),
      h('b', {}, `${dayLabel()}${st.offset > 1 ? '' : ` · ${d.day}`}`),
      h('button', { type: 'button', class: 'asa-btn', title: S.next, 'aria-label': S.next, disabled: st.offset <= 0, onclick: () => { st.offset--; st.data = null; st.panel.rerender(); load(); } }, '›'));
    const list = h('div', {});
    if (!d.items.length) list.append(h('p', { class: 'asa-muted' }, S.none));
    const groups = new Map();
    for (const it of d.items) {
      const p = it.project || S.noProject;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(it);
    }
    for (const [project, its] of groups) {
      list.append(h('div', { class: 'asa-rep-proj' }, project));
      for (const it of its) {
        const mine = st.items.get(it.id);
        const box = h('input', { type: 'checkbox', 'aria-label': S.include });
        box.checked = mine.include;
        const text = h('input', { type: 'text', maxlength: '300', value: mine.text, 'aria-label': S.textLabel });
        const row = h('div', { class: `asa-rep-row${mine.include ? '' : ' off'}` }, box, text,
          h('div', { class: 'asa-rep-meta' }, [it.who, S.status[it.status] || null, it.tokens ? `${ns.fmtTokens(it.tokens)} token` : null].filter(Boolean).join(' · '), it.fresh ? h('span', { class: 'asa-rep-new' }, S.fresh) : null));
        box.onchange = () => { mine.include = box.checked; row.classList.toggle('off', !box.checked); retotal(); };
        text.oninput = () => { mine.text = text.value; retotal(); };
        list.append(row);
      }
    }
    const hl = h('textarea', { placeholder: S.hlPh, 'aria-label': S.hlLabel, rows: '3' });
    hl.value = st.highlights;
    hl.oninput = () => { st.highlights = hl.value; };
    st.msgEl = h('div', { class: 'asa-rep-msg' });
    paintMsg();
    const saveBtn = h('button', { type: 'button', class: 'asa-btn primary' }, S.save);
    saveBtn.onclick = () => save(saveBtn);
    const actions = h('div', { class: 'asa-rep-actions' }, saveBtn);
    if (st.msg?.done && ns.shelf?.open) actions.append(h('button', { type: 'button', class: 'asa-btn', onclick: () => { const name = (st.rel ?? '').split('/').pop()?.replace(/\.md$/i, ''); ns.panel.close(); ns.shelf.open(name); } }, S.open));
    if (d.vault && d.vault !== 'ok') { st.msg = st.msg?.done ? st.msg : { warn: true, text: d.vault === 'permission' ? S.permission : S.vault }; paintMsg(); }
    body.append(h('div', { class: 'asa-rep' }, nav, h('div', { class: 'asa-muted' }, S.intro), total, list,
      h('div', {}, h('b', { style: { fontWeight: 'normal' } }, S.hlLabel), hl),
      h('div', { class: 'asa-rep-hint' }, S.hlHint, h('pre', {}, '> [!tip] Judul\n> isi highlight')),
      actions, st.msgEl));
  }

  function open(offset = 0) {
    if (!document.getElementById('asa-rep-css')) document.head.appendChild(h('style', { id: 'asa-rep-css' }, css));
    const mine = { offset: Math.max(0, Math.min(13, offset)), data: null, items: new Map(), highlights: '', msg: null, rel: null, panel: null, msgEl: null, offline: false };
    st = mine;
    // Opening closes whatever panel is open, whose onClose must not clear the state of this one.
    mine.panel = ns.panel.open({ theme: 'cozy', dock: 'hud', title: `📜 ${S.title}`, onClose: () => { if (st === mine) st = null; }, render });
    st = mine;
    st.panel.el.classList.add('asa-plain');
    ns.refreshData().catch(() => {}).then(load);
  }

  // In the evening, once a day, ask whether to write the report (only when there is work to check and it has not been saved).
  const NUDGE_HOUR = 17;
  async function nudge() {
    const now = new Date();
    const today = keyOf(0);
    if (now.getHours() < NUDGE_HOUR || ns.store?.get?.(`reportAsked-${today}`) || ns.store?.get?.(`reportDone-${today}`)) return;
    if (st) return; // already open
    try {
      const d = await ns.localApi('GET', `/api/journal/day?day=${today}`);
      if (d.enabled === false || d.saved) return;
      const n = d.items.filter((it) => it.include).length;
      if (!n) return;
      ns.store?.set?.(`reportAsked-${today}`, '1');
      ns.notify?.message?.({ icon: '📜', title: S.nudge, body: S.nudgeBody(n), onOpen: () => open(0) });
    } catch { /* the office isn't reachable from here: no nudge */ }
  }
  setInterval(nudge, 10 * 60_000);
  setTimeout(nudge, 20_000);

  ns.report = { open };
})();
