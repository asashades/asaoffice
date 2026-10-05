// asaoffice souls (🧠): each staff member's personality ("jiwa") and the little memory that grows after their tasks. Open it from the 🧠 button in the
// mailbox or from a staff villager's card. The soul is editable (or back to the default); the memories are one-line lessons the agent wrote itself at the end
// of a task (never from a task that read the web or Downloads); you can read, delete and add them, or switch the automatic ones off.
// Both are read by the agent on every task and in every meeting. The data is on the Mac (tools/lib/souls.mjs); a phone only sees a hint.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Jiwa dan ingatan', auto: 'Ingat otomatis (agent menulis satu pelajaran di akhir tugas)', soul: 'Jiwa (kepribadian, gaya bicara, nilai)', save: 'Simpan jiwa', reset: 'Kembalikan bawaan',
      saved: 'Tersimpan.', custom: 'diubah', memory: (n, max) => `Ingatan (${n}/${max})`, none: 'Belum ada ingatan. Setelah tugas, agent boleh menulis satu pelajaran di sini.',
      add: 'Tambah ingatan', addPh: 'Satu kalimat yang perlu diingat…', del: 'Lupakan', manual: 'dari kamu', from: (p) => `dari tugas di ${p}`,
      note: 'Jiwa dan ingatan tiap staf adalah satu catatan di folder Staf vault-mu. Isinya masuk ke prompt agent di setiap tugas dan rapat. Ingatan dianggap catatan pribadi, bukan perintah, dan tidak ditulis dari tugas yang membaca web atau folder Downloads. Maksimal 20 ingatan per agent; yang paling lama dilupakan duluan.',
      stored: (f) => `Disimpan di vault Obsidian-mu: ${f} (bisa diedit di Obsidian juga)`, noVault: 'Vault Obsidian belum bisa dibaca (iCloud belum selesai sinkron, atau foldernya dipindah). Agent bekerja tanpa ingatan dan tidak menulis apa pun sampai vault kembali.',
      offline: 'Jiwa dan ingatan hanya bisa diatur dari Mac yang menjalankan kantor.', failed: 'Gagal: ', chars: (n, max) => `${n}/${max} huruf`,
    },
    en: {
      title: 'Souls and memories', auto: 'Remember automatically (the agent writes one lesson at the end of a task)', soul: 'Soul (character, way of speaking, values)', save: 'Save soul', reset: 'Back to default',
      saved: 'Saved.', custom: 'edited', memory: (n, max) => `Memories (${n}/${max})`, none: 'No memories yet. After a task the agent may write one lesson here.',
      add: 'Add a memory', addPh: 'One sentence to remember…', del: 'Forget', manual: 'from you', from: (p) => `from a task in ${p}`,
      note: 'Each staff member\'s soul and memories are one note in your vault\'s Staf folder. They go into the agent\'s prompt on every task and meeting. Memories are treated as personal notes, not orders, and are never written from a task that read the web or the Downloads folder. At most 20 per agent; the oldest is forgotten first.',
      stored: (f) => `Kept in your Obsidian vault: ${f} (you can edit it in Obsidian too)`, noVault: 'The Obsidian vault can\'t be read right now (iCloud still syncing, or the folder moved). Agents work without memories and write nothing until it is back.',
      offline: 'Souls and memories can only be set from the Mac that runs the office.', failed: 'Failed: ', chars: (n, max) => `${n}/${max} characters`,
    },
  });
  const css = `
  .asa-soul { display: flex; flex-direction: column; gap: 12px; }
  .asa-soul-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
  .asa-soul-tabs button { font: inherit; font-size: 14px; padding: 4px 10px; background: #fffbe9; border: 2px solid #d9c49a; color: #3a2117; cursor: pointer; }
  .asa-soul-tabs button.on { background: #e6d3a6; border-color: #744122; font-weight: 600; }
  .asa-soul h4 { margin: 0 0 4px; font-size: 14px; font-weight: 600; }
  .asa-soul textarea { width: 100%; box-sizing: border-box; min-height: 120px; font: inherit; font-size: 14px; line-height: 1.4; padding: 6px 8px; background: #fffbe9; color: #3a2117; border: 2px solid #d9c49a; resize: vertical; }
  .asa-soul .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .asa-soul .mem { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; background: #fffbe9; border: 2px solid #d9c49a; }
  .asa-soul .mem span { flex: 1; font-size: 14px; line-height: 1.35; overflow-wrap: anywhere; }
  .asa-soul .mem small { display: block; opacity: 0.6; font-size: 11.5px; margin-top: 2px; }
  .asa-soul input[type="text"] { flex: 1; min-width: 160px; font: inherit; font-size: 14px; padding: 4px 6px; background: #fffbe9; color: #3a2117; border: 2px solid #d9c49a; }
  .asa-soul .note { font-size: 12.5px; opacity: 0.75; line-height: 1.4; }
  .asa-soul .msg { min-height: 18px; font-size: 13px; }
  `;
  let state = null;
  const say = (t) => { if (state?.msg) state.msg.textContent = t; };
  const errText = (e) => `${S.failed}${e.message}`;

  async function reload() {
    const j = await ns.localApi('GET', '/api/souls');
    state.data = j;
    if (!state.agent || !j.staff.some((m) => m.agent === state.agent)) state.agent = j.staff[0]?.agent ?? null;
    state.panel?.rerender();
  }
  const act = (fn, okText) => async () => { try { await fn(); await reload(); if (okText) say(okText); } catch (e) { say(errText(e)); } };

  function body() {
    const j = state.data;
    const m = j.staff.find((x) => x.agent === state.agent);
    state.msg = h('div', { class: 'msg' });
    const tabs = h('div', { class: 'asa-soul-tabs' }, j.staff.map((x) => {
      const b = h('button', { type: 'button', class: x.agent === state.agent ? 'on' : '' }, x.name + (x.custom ? ' ✏️' : ''));
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
        const when = new Date(x.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        return h('div', { class: 'mem' }, h('span', {}, x.text, h('small', {}, `${when} · ${x.manual ? S.manual : x.project ? S.from(x.project) : ''}`)), del);
      })
      : [h('p', { class: 'note' }, S.none)];
    const input = h('input', { type: 'text', maxlength: String(m.max.memoryChars), placeholder: S.addPh, 'aria-label': S.add });
    const add = h('button', { type: 'button', class: 'asa-btn' }, S.add);
    if (j.vault?.ok === false) { input.disabled = true; add.disabled = true; }
    add.onclick = act(async () => { if (input.value.trim()) { await ns.localApi('POST', `/api/souls/${m.agent}/memory`, { text: input.value }); } });
    input.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') add.click(); };
    const ok = j.vault?.ok !== false;
    for (const el of [ta, save, reset]) if (!ok) el.disabled = true;
    return h('div', { class: 'asa-soul' },
      ok ? h('div', { class: 'note' }, S.stored(m.file)) : h('div', { class: 'note', style: { color: '#973a2f', opacity: 1 } }, S.noVault),
      h('label', { class: 'row' }, auto, S.auto),
      tabs,
      h('div', {}, h('h4', {}, `${S.soul}${m.custom ? ` · ${S.custom}` : ''}`), ta, h('div', { class: 'row', style: { marginTop: '6px' } }, save, reset, count)),
      h('div', {}, h('h4', {}, S.memory(m.memories.length, m.max.memories)), ...mems, h('div', { class: 'row', style: { marginTop: '6px' } }, input, add)),
      state.msg, h('div', { class: 'note' }, S.note));
  }

  function open(agent) {
    if (!document.getElementById('asa-soul-css')) document.head.appendChild(h('style', { id: 'asa-soul-css' }, css));
    state = { data: null, agent: agent ?? null, panel: null, msg: null, offline: false };
    state.panel = ns.panel.open({
      theme: 'cozy', dock: 'hud', title: `🧠 ${S.title}`,
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

  ns.souls = { open };
})();
