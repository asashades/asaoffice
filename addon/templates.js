// asaoffice task templates (⚡ Templat tugas): a saved task you start with one click from the new-chat screen of the mailbox. A template is the text, who does it, the way
// of working, the model, the permission mode and (if you want) the project. Clicking one fills the new-chat form; its ▶ sends it at once (behind the usual 3-second
// "Batalkan"). The list lives on the Mac (tools/lib/templates.mjs); this panel adds, edits and deletes them, and "⏰ Jadwalkan" starts a schedule from one.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Templat tugas', new: 'Templat baru', edit: 'Ubah templat', empty: 'Belum ada templat. Bikin satu di bawah, atau tekan 💾 di layar Chat baru buat menyimpan tugas yang lagi kamu tulis.',
      name: 'Nama', what: 'Tugasnya', whatPh: 'Contoh: Ringkas PDF terbaru di Downloads dan tulis poin pentingnya', who: 'Siapa', project: 'Proyek', anyProject: 'Ikut proyek yang lagi dipilih',
      mode: 'Cara kerja', model: 'Model', modelDefault: 'Model default', perm: 'Cara izin', save: 'Simpan templat', saveEdit: 'Simpan perubahan', cancel: 'Batal',
      editBtn: 'Ubah', del: 'Hapus', sched: 'Jadwalkan', general: 'Claude (umum)',
      modes: { plan: '📝 Rencana dulu', meeting: '🗣 Rapat dulu', auto: '⚡ Langsung jalan', report: '👀 Cuma laporan' },
      perms: { manual: '🔐 Tanya dulu', acceptEdits: '✏️ Terima edit', auto: '🤖 Auto', strict: '🔒 Ketat' },
      note: 'Templat tidak jalan sendiri: di Chat baru, klik namanya buat mengisi formulir, atau klik ▶ buat langsung mengirim.', offline: 'Templat cuma bisa diatur dari Mac yang menjalankan kantor.',
      failed: 'Gagal: ', full: 'Maksimal 30 templat.',
    },
    en: {
      title: 'Task templates', new: 'New template', edit: 'Edit template', empty: 'No templates yet. Make one below, or press 💾 on the New chat screen to save the task you are writing.',
      name: 'Name', what: 'The task', whatPh: 'Example: Summarise the latest PDF in Downloads and list the key points', who: 'Who', project: 'Project', anyProject: 'Use the project currently chosen',
      mode: 'How to work', model: 'Model', modelDefault: 'Default model', perm: 'Permissions', save: 'Save template', saveEdit: 'Save changes', cancel: 'Cancel',
      editBtn: 'Edit', del: 'Delete', sched: 'Schedule', general: 'Claude (general)',
      modes: { plan: '📝 Plan first', meeting: '🗣 Meeting first', auto: '⚡ Just do it', report: '👀 Report only' },
      perms: { manual: '🔐 Ask first', acceptEdits: '✏️ Accept edits', auto: '🤖 Auto', strict: '🔒 Strict' },
      note: 'Templates never run by themselves: on New chat, click the name to fill the form, or ▶ to send it right away.', offline: 'Templates can only be set from the Mac that runs the office.',
      failed: 'Failed: ', full: 'At most 30 templates.',
    },
  });
  const MODELS = [['opus', 'Opus'], ['sonnet', 'Sonnet'], ['haiku', 'Haiku']];
  const css = `
  .asa-tpl-list { display: flex; flex-direction: column; gap: 10px; }
  .asa-tpl-item { border: 2px solid #d9c49a; background: #fffbe9; padding: 8px 10px; }
  .asa-tpl-item b { font-weight: 600; font-size: 15px; }
  .asa-tpl-meta { font-size: 12.5px; opacity: 0.75; margin-top: 2px; }
  .asa-tpl-text { font-size: 13px; margin-top: 4px; opacity: 0.85; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
  .asa-tpl-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .asa-tpl-btns .asa-btn { padding: 3px 9px; font-size: 13px; }
  .asa-tpl-form { border: 2px dashed #b8935c; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .asa-tpl-form label { font-size: 13px; display: flex; flex-direction: column; gap: 3px; }
  .asa-tpl-form input[type=text], .asa-tpl-form textarea, .asa-tpl-form select { font: inherit; font-size: 14px; padding: 6px 8px; background: #fffbe9; color: #3a2117; border: 2px solid #744122; box-sizing: border-box; width: 100%; }
  .asa-tpl-form textarea { min-height: 80px; resize: vertical; }
  .asa-tpl-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
  .asa-tpl-msg { font-size: 13px; min-height: 18px; }
  .asa-tpl-note { font-size: 12.5px; opacity: 0.7; }
  `;
  let cache = null; // { at, list }
  async function list(force = false) {
    if (!force && cache && Date.now() - cache.at < 20_000) return cache.list;
    const j = await ns.localApi('GET', '/api/templates');
    cache = { at: Date.now(), list: j.templates ?? [] };
    return cache.list;
  }

  let state = null;
  const say = (t) => { if (state?.msg) state.msg.textContent = t; };
  const errText = (err) => ({ 'too many': S.full, noApi: S.offline })[err.message] ?? `${S.failed}${err.message}`;
  async function reload() {
    const [tpls, options] = await Promise.all([list(true), state.options ? Promise.resolve(state.options) : ns.localApi('GET', '/api/options')]);
    state.list = tpls;
    state.options = options;
    state.panel?.rerender();
  }

  function form() {
    const editing = state.editing ? state.list.find((x) => x.id === state.editing) : null;
    const opts = state.options;
    const staff = opts.staff ?? [];
    const who = h('select', {}, h('option', { value: '' }, `👤 ${S.general}`), staff.map((m) => h('option', { value: m.agent }, `👤 ${m.name}`)));
    const proj = h('select', {}, h('option', { value: '' }, S.anyProject), (opts.projects ?? []).map((p) => h('option', { value: p.cwd, title: p.cwd }, `📁 ${p.name}`)));
    const mode = h('select', {});
    const fillModes = () => {
      const cur = mode.value || 'auto';
      const want = ['plan', 'meeting', 'auto', 'report'].filter((v) => v !== 'meeting' || staff.find((m) => m.agent === who.value)?.director);
      mode.replaceChildren(...want.map((v) => h('option', { value: v }, S.modes[v])));
      mode.value = want.includes(cur) ? cur : 'auto';
    };
    who.onchange = fillModes;
    const model = h('select', {}, h('option', { value: '' }, S.modelDefault), MODELS.map(([v, t]) => h('option', { value: v }, `🧠 ${t}`)));
    const perm = h('select', {}, Object.entries(S.perms).map(([v, t]) => h('option', { value: v }, t)));
    const name = h('input', { type: 'text', maxlength: '40', placeholder: S.name });
    const prompt = h('textarea', { placeholder: S.whatPh, maxlength: '4000', 'aria-label': S.what });
    if (editing) {
      who.value = editing.agent ?? '';
      proj.value = (opts.projects ?? []).some((p) => p.cwd === editing.cwd) ? editing.cwd : '';
      fillModes();
      mode.value = editing.mode;
      model.value = MODELS.some(([v]) => v === editing.model) ? editing.model : '';
      perm.value = editing.perm in S.perms ? editing.perm : 'manual';
      name.value = editing.name;
      prompt.value = editing.prompt;
    } else { who.value = ''; fillModes(); mode.value = 'auto'; }
    const save = h('button', { type: 'button', class: 'asa-btn primary' }, editing ? S.saveEdit : S.save);
    save.onclick = async () => {
      if (!prompt.value.trim()) { say(`${S.failed}${S.what}`); return; }
      save.disabled = true;
      try {
        await ns.localApi('POST', editing ? `/api/templates/${editing.id}` : '/api/templates', { name: name.value, prompt: prompt.value, agent: who.value || null, cwd: proj.value, mode: mode.value, model: model.value || null, perm: perm.value });
        state.editing = null;
        await reload();
      } catch (err) { say(errText(err)); save.disabled = false; }
    };
    const cancel = editing ? h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.editing = null; state.panel.rerender(); } }, S.cancel) : null;
    return h('div', { class: 'asa-tpl-form' }, h('b', {}, editing ? S.edit : S.new), h('label', {}, S.name, name), h('label', {}, S.what, prompt),
      h('div', { class: 'asa-tpl-row' }, h('label', {}, S.who, who), h('label', {}, S.project, proj), h('label', {}, S.mode, mode)),
      h('div', { class: 'asa-tpl-row' }, h('label', {}, S.model, model), h('label', {}, S.perm, perm)), h('div', {}, save, ' ', cancel));
  }

  function item(t) {
    const member = (state.options.staff ?? []).find((m) => m.agent === t.agent);
    const proj = t.cwd ? (state.options.projects ?? []).find((p) => p.cwd === t.cwd)?.name ?? String(t.cwd).split('/').pop() : S.anyProject;
    const act = (fn) => async () => { try { await fn(); } catch (err) { say(errText(err)); return; } await reload(); };
    return h('div', { class: 'asa-tpl-item' },
      h('b', {}, `⚡ ${t.name}`),
      h('div', { class: 'asa-tpl-meta' }, [member?.name ?? S.general, proj, S.modes[t.mode] ?? t.mode, t.model ? `🧠 ${t.model}` : null, S.perms[t.perm] ?? null].filter(Boolean).join(' · ')),
      h('div', { class: 'asa-tpl-text' }, t.prompt),
      h('div', { class: 'asa-tpl-btns' },
        h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.editing = t.id; state.panel.rerender(); } }, S.editBtn),
        h('button', { type: 'button', class: 'asa-btn', onclick: () => { ns.panel.close(); ns.schedule?.open({ template: t }); } }, `⏰ ${S.sched}`),
        h('button', { type: 'button', class: 'asa-btn', onclick: act(() => ns.localApi('DELETE', `/api/templates/${t.id}`)) }, `🗑 ${S.del}`)));
  }

  function open() {
    if (!document.getElementById('asa-tpl-css')) document.head.appendChild(h('style', { id: 'asa-tpl-css' }, css));
    state = { list: [], options: null, editing: null, panel: null, msg: null };
    state.panel = ns.panel.open({
      theme: 'cozy', dock: 'hud', title: `⚡ ${S.title}`,
      onClose: () => { state = null; },
      render(body) {
        if (state.offline) { body.append(h('p', {}, S.offline)); return; }
        if (!state.options) { body.append(h('p', { class: 'asa-muted' }, '…')); return; }
        state.msg = h('div', { class: 'asa-tpl-msg' });
        body.append(h('div', { class: 'asa-tpl-list' }, state.list.length ? state.list.map(item) : h('p', { class: 'asa-muted' }, S.empty), state.msg, form(), h('div', { class: 'asa-tpl-note' }, S.note)));
      },
    });
    state.panel.el.classList.add('asa-plain', 'asa-wide');
    reload().catch(() => { if (state) { state.offline = true; state.panel.rerender(); } });
  }

  ns.templates = { list, open, invalidate: () => { cache = null; } };
})();
