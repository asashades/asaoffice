// asaoffice employee records ("Data Karyawan", 👥 on the HUD's top card, or "Data karyawan" on a staff villager's card): one page per staff member with their
// profile (role, duty, daily salary, what they may do, how many letters they worked on) and, below it, their soul (personality) and memory. The soul is
// editable (or back to the default); the memories are one-line lessons the agent wrote itself at the end of a task (never from a task that read the web or
// Downloads): you can read, delete and add them, or switch the automatic ones off. Both live as one note per person in the vault (Staf/Gus.md) and are read by the
// agent on every task and in every meeting. The data is on the Mac (tools/lib/souls.mjs); a phone only sees a hint.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Data karyawan', auto: 'Ingat otomatis (agent menulis satu pelajaran di akhir tugas)', soul: 'Jiwa (kepribadian, gaya bicara, nilai)', save: 'Simpan jiwa', reset: 'Kembalikan bawaan',
      saved: 'Tersimpan.', custom: 'diubah', memory: (n, max) => `Ingatan (${n}/${max})`, none: 'Belum ada ingatan. Setelah tugas, agent boleh menulis satu pelajaran di sini.',
      add: 'Tambah ingatan', addPh: 'Satu kalimat yang perlu diingat…', del: 'Lupakan', manual: 'dari kamu', from: (p) => `dari tugas di ${p}`,
      stored: (f) => `Disimpan di vault Obsidian-mu: ${f} (bisa diedit di Obsidian juga)`, noVault: 'Vault Obsidian belum bisa dibaca (iCloud belum selesai sinkron, atau foldernya dipindah). Agent bekerja tanpa ingatan dan tidak menulis apa pun sampai vault kembali.',
      noPerm: 'macOS belum mengizinkan kantor membuka folder vault Obsidian-mu. Nyalakan kantor lewat aplikasi Asa Office (bukan lewat Terminal atau program lain), dan kalau masih begini: Pengaturan Sistem → Privasi & Keamanan → Akses Penuh ke Disk → nyalakan Asa Office, lalu Quit dan buka lagi aplikasinya. Sampai itu, agent bekerja tanpa ingatan dan tidak menulis apa pun.',
      note: 'Jiwa dan ingatan tiap karyawan adalah satu catatan di folder Staf vault-mu. Isinya masuk ke prompt agent di setiap tugas dan rapat. Ingatan dianggap catatan pribadi, bukan perintah, dan tidak ditulis dari tugas yang membaca web atau folder Downloads. Maksimal 20 ingatan per agent; yang paling lama dilupakan duluan.',
      offline: 'Data karyawan hanya bisa diatur dari Mac yang menjalankan kantor.', failed: 'Gagal: ', chars: (n, max) => `${n}/${max} huruf`,
      profile: 'Profil', duty: 'Tugas', salary: 'Gaji per hari', access: 'Boleh', letters: 'Surat dikerjakan', lastWork: 'Terakhir', notInstalled: 'Belum terpasang di Claude Code (jalankan npm run staff).', never: 'belum pernah',
      acc: { read: 'Baca', edit: 'Edit', test: 'Tes', web: 'Web', git: 'Git' }, head: 'Kepala kantor', done: (n, t) => `${n} selesai dari ${t}`,
    },
    en: {
      title: 'Employee records', auto: 'Remember automatically (the agent writes one lesson at the end of a task)', soul: 'Soul (character, way of speaking, values)', save: 'Save soul', reset: 'Back to default',
      saved: 'Saved.', custom: 'edited', memory: (n, max) => `Memories (${n}/${max})`, none: 'No memories yet. After a task the agent may write one lesson here.',
      add: 'Add a memory', addPh: 'One sentence to remember…', del: 'Forget', manual: 'from you', from: (p) => `from a task in ${p}`,
      stored: (f) => `Kept in your Obsidian vault: ${f} (you can edit it in Obsidian too)`, noVault: 'The Obsidian vault can\'t be read right now (iCloud still syncing, or the folder moved). Agents work without memories and write nothing until it is back.',
      noPerm: 'macOS hasn\'t let the office open your Obsidian vault folder. Start the office from the Asa Office app (not from Terminal or another program), and if it still happens: System Settings → Privacy & Security → Full Disk Access → turn on Asa Office, then quit and reopen the app. Until then agents work without memories and write nothing.',
      note: 'Each employee\'s soul and memories are one note in your vault\'s Staf folder. They go into the agent\'s prompt on every task and meeting. Memories are treated as personal notes, not orders, and are never written from a task that read the web or the Downloads folder. At most 20 per agent; the oldest is forgotten first.',
      offline: 'Employee records can only be set from the Mac that runs the office.', failed: 'Failed: ', chars: (n, max) => `${n}/${max} characters`,
      profile: 'Profile', duty: 'Duty', salary: 'Salary per day', access: 'May', letters: 'Letters worked on', lastWork: 'Last', notInstalled: 'Not installed in Claude Code yet (run npm run staff).', never: 'never',
      acc: { read: 'Read', edit: 'Edit', test: 'Test', web: 'Web', git: 'Git' }, head: 'Head of the office', done: (n, t) => `${n} done of ${t}`,
    },
  });
  const css = `
  .asa-emp { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 14px; min-height: 0; }
  .asa-emp-list { display: flex; flex-direction: column; gap: 6px; }
  .asa-emp-list button { display: flex; gap: 8px; align-items: center; text-align: left; font: inherit; padding: 5px 8px; background: #fffbe9; border: 2px solid #d9c49a; color: #3a2117; cursor: pointer; }
  .asa-emp-list button.on { background: #f4e6c4; border-color: #744122; box-shadow: inset 3px 0 0 #744122; }
  .asa-emp-list b { display: block; font-size: 14px; font-weight: 600; }
  .asa-emp-list small { display: block; font-size: 11.5px; opacity: 0.7; }
  .asa-emp-face { flex: none; width: 24px; height: 38px; background-size: 168px 144px; background-position: -24px -3px; background-repeat: no-repeat; image-rendering: pixelated; }
  .asa-emp-face.big { width: 48px; height: 76px; background-size: 336px 288px; background-position: -48px -6px; }
  .asa-emp-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .asa-emp-card { display: flex; gap: 14px; padding: 10px 12px; background: #fffbe9; border: 2px solid #d9c49a; }
  .asa-emp-card h3 { margin: 0; font-size: 18px; font-weight: 600; }
  .asa-emp-card .role { font-size: 13px; opacity: 0.75; margin-bottom: 6px; }
  .asa-emp-card dl { display: grid; grid-template-columns: max-content 1fr; gap: 3px 10px; margin: 6px 0 0; font-size: 13.5px; }
  .asa-emp-card dt { opacity: 0.65; } .asa-emp-card dd { margin: 0; }
  .asa-emp-chip { display: inline-block; padding: 0 6px; margin: 0 4px 2px 0; font-size: 12px; background: #e6d3a6; border: 1px solid #c9a877; }
  .asa-soul { display: flex; flex-direction: column; gap: 12px; }
  .asa-soul h4 { margin: 0 0 4px; font-size: 14px; font-weight: 600; }
  .asa-soul textarea { width: 100%; box-sizing: border-box; min-height: 120px; font: inherit; font-size: 14px; line-height: 1.4; padding: 6px 8px; background: #fffbe9; color: #3a2117; border: 2px solid #d9c49a; resize: vertical; }
  .asa-soul .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .asa-soul .mem { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; background: #fffbe9; border: 2px solid #d9c49a; margin-bottom: 4px; }
  .asa-soul .mem span { flex: 1; font-size: 14px; line-height: 1.35; overflow-wrap: anywhere; }
  .asa-soul .mem small { display: block; opacity: 0.6; font-size: 11.5px; margin-top: 2px; }
  .asa-soul input[type="text"] { flex: 1; min-width: 160px; font: inherit; font-size: 14px; padding: 4px 6px; background: #fffbe9; color: #3a2117; border: 2px solid #d9c49a; }
  .asa-soul .note { font-size: 12.5px; opacity: 0.75; line-height: 1.4; }
  .asa-soul .msg { min-height: 18px; font-size: 13px; }
  @media (max-width: 720px) { .asa-emp { grid-template-columns: 1fr; } .asa-emp-list { flex-direction: row; flex-wrap: wrap; } .asa-emp-card { flex-direction: column; } }
  `;
  let state = null;
  const say = (t) => { if (state?.msg) state.msg.textContent = t; };
  const errText = (e) => `${S.failed}${e.message}`;
  const staffEntry = (agent) => (ns.data?.staff ?? []).find((x) => x.agent === agent);
  const face = (agent, big) => {
    const palette = staffEntry(agent)?.palette ?? 0;
    return h('span', { class: `asa-emp-face${big ? ' big' : ''}`, style: { backgroundImage: `url(${ns.portraitUrl({ palette })})` } });
  };

  async function reload() {
    const j = await ns.localApi('GET', '/api/souls');
    state.data = j;
    if (!state.agent || !j.staff.some((m) => m.agent === state.agent)) state.agent = j.staff[0]?.agent ?? null;
    state.panel?.rerender();
  }
  const act = (fn, okText) => async () => { try { await fn(); await reload(); if (okText) say(okText); } catch (e) { say(errText(e)); } };

  function profile(m) {
    const s = staffEntry(m.agent);
    const mine = (ns.data?.mail ?? []).filter((l) => l.agent === m.agent && !l.report);
    const done = mine.filter((l) => l.status === 'done').length;
    const last = mine.map((l) => Date.parse(l.finishedAt || l.createdAt)).filter(Number.isFinite).sort((a, b) => b - a)[0];
    return h('div', { class: 'asa-emp-card' },
      face(m.agent, true),
      h('div', {},
        h('h3', {}, m.name),
        h('div', { class: 'role' }, s ? ns.staffRole(s) : '', m.director ? ` · ${S.head}` : ''),
        s ? h('div', {}, ns.staffDuty(s)) : null,
        h('dl', {},
          h('dt', {}, S.salary), h('dd', {}, s?.salary != null ? `${s.salary}g` : '—'),
          h('dt', {}, S.access), h('dd', {}, (s?.access ?? []).map((a) => h('span', { class: 'asa-emp-chip' }, S.acc[a] ?? a))),
          h('dt', {}, S.letters), h('dd', {}, S.done(done, mine.length)),
          h('dt', {}, S.lastWork), h('dd', {}, last ? new Date(last).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : S.never)),
        s && s.installed === false ? h('div', { class: 'note', style: { color: '#973a2f', marginTop: '6px' } }, S.notInstalled) : null));
  }

  function body() {
    const j = state.data;
    const m = j.staff.find((x) => x.agent === state.agent);
    state.msg = h('div', { class: 'msg' });
    const list = h('div', { class: 'asa-emp-list' }, j.staff.map((x) => {
      const s = staffEntry(x.agent);
      const b = h('button', { type: 'button', class: x.agent === state.agent ? 'on' : '' }, face(x.agent), h('span', {}, h('b', {}, x.name + (x.custom ? ' ✏️' : '')), h('small', {}, s ? ns.staffRole(s) : '')));
      b.onclick = () => { state.agent = x.agent; state.panel.rerender(); };
      return b;
    }));
    const auto = h('input', { type: 'checkbox' });
    auto.checked = j.auto;
    auto.onchange = act(() => ns.localApi('POST', '/api/souls', { auto: auto.checked }));
    const ta = h('textarea', { maxlength: String(m.max.soulChars), 'aria-label': S.soul });
    ta.value = m.soul;
    const count = h('span', { class: 'note' }, S.chars(ta.value.length, m.max.soulChars));
    ta.oninput = () => { count.textContent = S.chars(ta.value.length, m.max.soulChars); };
    const save = h('button', { type: 'button', class: 'asa-btn primary' }, S.save);
    save.onclick = act(() => ns.localApi('POST', `/api/souls/${m.agent}`, { soul: ta.value.trim() === m.defaultSoul.trim() ? null : ta.value }), S.saved);
    const reset = h('button', { type: 'button', class: 'asa-btn' }, S.reset);
    reset.disabled = !m.custom;
    reset.onclick = act(() => ns.localApi('POST', `/api/souls/${m.agent}`, { soul: null }), S.saved);
    const mems = m.memories.length
      ? [...m.memories].reverse().map((x) => {
        const del = h('button', { type: 'button', class: 'asa-btn', title: S.del, 'aria-label': S.del }, '✖');
        del.onclick = act(() => ns.localApi('DELETE', `/api/souls/${m.agent}/memory/${x.id}`));
        const when = x.at ? new Date(x.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
        return h('div', { class: 'mem' }, h('span', {}, x.text, h('small', {}, [when, x.manual ? S.manual : x.project ? S.from(x.project) : ''].filter(Boolean).join(' · '))), del);
      })
      : [h('p', { class: 'note' }, S.none)];
    const input = h('input', { type: 'text', maxlength: String(m.max.memoryChars), placeholder: S.addPh, 'aria-label': S.add });
    const add = h('button', { type: 'button', class: 'asa-btn' }, S.add);
    add.onclick = act(async () => { if (input.value.trim()) { await ns.localApi('POST', `/api/souls/${m.agent}/memory`, { text: input.value }); } });
    input.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') add.click(); };
    const ok = j.vault?.ok !== false;
    if (!ok) for (const el of [ta, save, reset, input, add]) el.disabled = true;
    return h('div', { class: 'asa-emp' }, list,
      h('div', { class: 'asa-emp-main' },
        profile(m),
        h('div', { class: 'asa-soul' },
          ok ? h('div', { class: 'note' }, S.stored(m.file)) : h('div', { class: 'note', style: { color: '#973a2f', opacity: 1 } }, j.vault?.reason === 'permission' ? S.noPerm : S.noVault),
          h('label', { class: 'row' }, auto, S.auto),
          h('div', {}, h('h4', {}, `${S.soul}${m.custom ? ` · ${S.custom}` : ''}`), ta, h('div', { class: 'row', style: { marginTop: '6px' } }, save, reset, count)),
          h('div', {}, h('h4', {}, S.memory(m.memories.length, m.max.memories)), ...mems, h('div', { class: 'row', style: { marginTop: '6px' } }, input, add)),
          state.msg, h('div', { class: 'note' }, S.note))));
  }

  function open(agent) {
    if (!document.getElementById('asa-soul-css')) document.head.appendChild(h('style', { id: 'asa-soul-css' }, css));
    state = { data: null, agent: agent ?? null, panel: null, msg: null, offline: false };
    state.panel = ns.panel.open({
      theme: 'cozy', dock: 'hud', title: `👥 ${S.title}`,
      onClose: () => { state = null; },
      render(el) {
        if (state.offline) { el.append(h('p', {}, S.offline)); return; }
        if (!state.data) { el.append(h('p', { class: 'asa-muted' }, '…')); return; }
        el.append(body());
      },
    });
    state.panel.el.classList.add('asa-plain', 'asa-wide');
    reload().catch(() => { if (state) { state.offline = true; state.panel.rerender(); } });
  }

  ns.souls = { open }; // (the villager card and the HUD call this)
  ns.staffPage = ns.souls;
})();
