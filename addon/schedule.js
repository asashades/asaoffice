// asaoffice schedules (Jadwal): tasks that run by themselves at a set time, from the mailbox's ⏰ Jadwal button. A schedule is a
// task + who does it + which project + a time and weekdays. It only READS: "Cuma laporan" (read-only) or "Rencana dulu" (a
// read-only plan waiting for your approval); it never edits or commits. The office must be running at that time (if it was off or
// the Mac asleep, a missed time under 12 hours old runs once when the office is back). Each run arrives as a ⏰ letter in the mailbox.
// The list and the form talk to the Mac's task API (tools/lib/schedules.mjs); a phone only sees a hint.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Jadwal', new: 'Jadwal baru', edit: 'Ubah jadwal', empty: 'Belum ada jadwal. Bikin yang pertama di bawah, misalnya “Tiap Senin 09.00: cek status proyek”.',
      model: 'Model', modelDefault: 'Model default', fromTpl: 'Mulai dari templat', fromTplNone: '— tanpa templat —', tplReadOnly: 'Jadwal hanya membaca, jadi templat yang menulis (Langsung jalan) dijadikan Cuma laporan.', what: 'Tugasnya', whatPh: 'Contoh: Cek status proyek, baca perubahan terbaru, dan tulis ringkasan', name: 'Nama (opsional)', who: 'Siapa', project: 'Proyek', mode: 'Cara kerja',
      report: '👀 Cuma laporan (baca saja)', plan: '📝 Rencana dulu (kamu setujui)', time: 'Jam', days: 'Hari', everyDay: 'Setiap hari', weekdays: 'Sen–Jum',
      dayNames: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], save: 'Simpan jadwal', saveEdit: 'Simpan perubahan', cancel: 'Batal', runNow: 'Jalankan sekarang', del: 'Hapus', editBtn: 'Ubah',
      on: 'Aktif', off: 'Mati', next: 'Berikutnya', last: 'Terakhir jalan', never: 'belum pernah', openLetter: 'Buka suratnya', general: 'Claude (umum)',
      note: 'Jadwal hanya jalan selama kantor menyala. Kalau terlewat kurang dari 12 jam, dijalankan sekali saat kantor menyala lagi. Hasilnya masuk kotak surat (⏰).',
      readOnly: 'Jadwal cuma membaca: tidak pernah mengedit atau commit sendiri.', offline: 'Jadwal cuma bisa diatur dari Mac yang menjalankan kantor.', failed: 'Gagal: ',
      busy: 'Lagi ada 3 tugas jalan, coba lagi sebentar lagi.', directorBusy: 'Shades lagi mengerjakan tugas lain.', started: 'Jadwal dijalankan, cek kotak surat.', full: 'Maksimal 20 jadwal.',
      today: 'hari ini', tomorrow: 'besok',
    },
    en: {
      title: 'Schedules', new: 'New schedule', edit: 'Edit schedule', empty: 'No schedules yet. Make the first one below, for example “Every Monday 09:00: check the project status”.',
      model: 'Model', modelDefault: 'Default model', fromTpl: 'Start from a template', fromTplNone: '— no template —', tplReadOnly: 'Schedules only read, so a template that writes (Just do it) becomes Report only.', what: 'The task', whatPh: 'Example: Check the project status, read the latest changes and write a summary', name: 'Name (optional)', who: 'Who', project: 'Project', mode: 'How to work',
      report: '👀 Report only (read-only)', plan: '📝 Plan first (you approve)', time: 'Time', days: 'Days', everyDay: 'Every day', weekdays: 'Mon–Fri',
      dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], save: 'Save schedule', saveEdit: 'Save changes', cancel: 'Cancel', runNow: 'Run now', del: 'Delete', editBtn: 'Edit',
      on: 'On', off: 'Off', next: 'Next', last: 'Last run', never: 'never', openLetter: 'Open the letter', general: 'Claude (general)',
      note: 'Schedules only run while the office is running. A missed time less than 12 hours old runs once when the office is back. Results arrive in the mailbox (⏰).',
      readOnly: 'Schedules only read: they never edit or commit on their own.', offline: 'Schedules can only be set from the Mac that runs the office.', failed: 'Failed: ',
      busy: '3 tasks are already running, try again in a moment.', directorBusy: 'Shades is busy with another task.', started: 'Schedule started, check the mailbox.', full: 'At most 20 schedules.',
      today: 'today', tomorrow: 'tomorrow',
    },
  });
  const MODELS = [['opus', 'Opus'], ['sonnet', 'Sonnet'], ['haiku', 'Haiku']];
  const locale = ns.lang === 'id' ? 'id-ID' : 'en-US';

  const css = `
  .asa-sch { display: flex; flex-direction: column; gap: 10px; }
  .asa-sch-item { border: 2px solid #d9c49a; background: #fffbe9; padding: 8px 10px; }
  .asa-sch-item.off { opacity: 0.6; }
  .asa-sch-head { display: flex; gap: 8px; align-items: baseline; }
  .asa-sch-head b { font-weight: 600; font-size: 15px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asa-sch-meta { font-size: 13px; opacity: 0.75; margin-top: 2px; }
  .asa-sch-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .asa-sch-btns .asa-btn { padding: 3px 9px; font-size: 13px; }
  .asa-sch-form { border: 2px dashed #b8935c; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .asa-sch-form label { font-size: 13px; display: flex; flex-direction: column; gap: 3px; }
  .asa-sch-form input[type=text], .asa-sch-form input[type=time], .asa-sch-form textarea, .asa-sch-form select { font: inherit; font-size: 14px; padding: 6px 8px; background: #fffbe9; color: #3a2117; border: 2px solid #744122; box-sizing: border-box; width: 100%; }
  .asa-sch-form textarea { min-height: 70px; resize: vertical; }
  .asa-sch-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
  .asa-sch-days { display: flex; flex-wrap: wrap; gap: 5px; }
  .asa-sch-days button { font: inherit; font-size: 13px; padding: 3px 8px; cursor: pointer; background: #fffbe9; color: #3a2117; border: 2px solid #d9c49a; }
  .asa-sch-days button.on { background: #744122; color: #fff6dc; border-color: #744122; }
  .asa-sch-msg { font-size: 13px; min-height: 18px; }
  .asa-sch-note { font-size: 12.5px; opacity: 0.7; }
  `;

  const timeText = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const day = d.toDateString() === now.toDateString() ? S.today : d.toDateString() === tomorrow.toDateString() ? S.tomorrow : d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    return `${day} ${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.')}`;
  };
  const daysText = (days) => (!days?.length || days.length === 7 ? S.everyDay : days.join() === '1,2,3,4,5' ? S.weekdays : days.map((d) => S.dayNames[d]).join(' '));
  const errText = (err) => ({ busy: S.busy, 'director busy': S.directorBusy, 'too many': S.full, noApi: S.offline })[err.message] ?? `${S.failed}${err.message}`;

  let state = null;
  const say = (t) => { if (state?.msg) state.msg.textContent = t; };

  async function reload() {
    const [list, options] = await Promise.all([ns.localApi('GET', '/api/schedules'), state.options ? Promise.resolve(state.options) : ns.localApi('GET', '/api/options')]);
    state.list = list.schedules;
    state.options = options;
    try { state.templates = (await ns.localApi('GET', '/api/templates')).templates; } catch { state.templates = []; }
    state.panel?.rerender();
  }

  function form() {
    const editing = state.editing ? state.list.find((x) => x.id === state.editing) : null;
    const opts = state.options;
    const staff = opts.staff ?? [];
    const who = h('select', {}, h('option', { value: '' }, `👤 ${S.general}`), staff.map((m) => h('option', { value: m.agent }, `👤 ${m.name}`)));
    const proj = h('select', {}, (opts.projects ?? []).map((p) => h('option', { value: p.cwd, title: p.cwd }, `📁 ${p.name}`)));
    const mode = h('select', {}, [['report', S.report], ['plan', S.plan]].map(([v, t]) => h('option', { value: v }, t)));
    const model = h('select', {}, h('option', { value: '' }, S.modelDefault), MODELS.map(([v, t]) => h('option', { value: v }, `🧠 ${t}`)));
    const name = h('input', { type: 'text', maxlength: '60', placeholder: S.name });
    const prompt = h('textarea', { placeholder: S.whatPh, maxlength: '4000', 'aria-label': S.what });
    const time = h('input', { type: 'time', value: '09:00', required: '' });
    let days = [];
    const dayBtns = S.dayNames.map((t, i) => h('button', { type: 'button', onclick: () => { days = days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort(); paint(); } }, t));
    const paint = () => dayBtns.forEach((b, i) => b.classList.toggle('on', days.includes(i)));
    if (editing) {
      who.value = editing.agent ?? '';
      if ((opts.projects ?? []).some((p) => p.cwd === editing.cwd)) proj.value = editing.cwd;
      mode.value = editing.mode;
      name.value = editing.title;
      prompt.value = editing.prompt;
      time.value = editing.time;
      days = [...(editing.days ?? [])];
      model.value = MODELS.some(([v]) => v === editing.model) ? editing.model : '';
    } else {
      who.value = staff.find((m) => m.director)?.agent ?? '';
      days = [1, 2, 3, 4, 5];
      if (state.prefill) { fillFrom(state.prefill); state.prefill = null; }
    }
    // A template fills the form (a schedule only reads, so "Langsung jalan" becomes "Cuma laporan").
    function fillFrom(t) {
      who.value = staff.some((m) => m.agent === t.agent) ? t.agent : '';
      if (t.cwd && (opts.projects ?? []).some((p) => p.cwd === t.cwd)) proj.value = t.cwd;
      mode.value = t.mode === 'plan' ? 'plan' : 'report';
      model.value = MODELS.some(([v]) => v === t.model) ? t.model : '';
      name.value = t.name ?? '';
      prompt.value = t.prompt ?? '';
    }
    const tplSel = h('select', {}, h('option', { value: '' }, S.fromTplNone), (state.templates ?? []).map((t) => h('option', { value: t.id }, t.name)));
    tplSel.onchange = () => { const t = (state.templates ?? []).find((x) => x.id === tplSel.value); if (t) fillFrom(t); };
    paint();
    const save = h('button', { type: 'button', class: 'asa-btn primary' }, editing ? S.saveEdit : S.save);
    save.onclick = async () => {
      if (!prompt.value.trim() || !time.value) { say(`${S.failed}${S.what}`); return; }
      save.disabled = true;
      try {
        const body = { title: name.value, prompt: prompt.value, agent: who.value || null, cwd: proj.value, mode: mode.value, model: model.value || null, time: time.value, days };
        await ns.localApi('POST', editing ? `/api/schedules/${editing.id}` : '/api/schedules', body);
        state.editing = null;
        await reload();
      } catch (err) { say(errText(err)); save.disabled = false; }
    };
    const cancel = editing ? h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.editing = null; state.panel.rerender(); } }, S.cancel) : null;
    return h('div', { class: 'asa-sch-form' }, h('b', {}, editing ? S.edit : S.new),
      !editing && (state.templates ?? []).length ? h('label', {}, S.fromTpl, tplSel) : null,
      h('label', {}, S.what, prompt), h('label', {}, S.name, name),
      h('div', { class: 'asa-sch-row' }, h('label', {}, S.who, who), h('label', {}, S.project, proj), h('label', {}, S.mode, mode), h('label', {}, S.model, model)),
      h('div', { class: 'asa-sch-row' }, h('label', {}, S.time, time), h('label', {}, S.days, h('div', { class: 'asa-sch-days' }, dayBtns))),
      h('div', { class: 'asa-sch-note' }, S.readOnly), h('div', {}, save, ' ', cancel));
  }

  function item(sch) {
    const member = (state.options.staff ?? []).find((m) => m.agent === sch.agent);
    const proj = (state.options.projects ?? []).find((p) => p.cwd === sch.cwd)?.name ?? String(sch.cwd).split('/').pop();
    const act = (fn) => async () => { try { await fn(); } catch (err) { say(errText(err)); return; } await reload(); };
    const letter = sch.lastLetter && (ns.data?.mail ?? []).find((l) => l.id === sch.lastLetter);
    return h('div', { class: `asa-sch-item${sch.enabled ? '' : ' off'}` },
      h('div', { class: 'asa-sch-head' }, h('b', { title: sch.prompt }, sch.title), h('span', {}, sch.enabled ? `● ${S.on}` : `○ ${S.off}`)),
      h('div', { class: 'asa-sch-meta' }, `${daysText(sch.days)} · ${sch.time.replace(':', '.')} · ${member?.name ?? S.general} · ${proj} · ${sch.mode === 'plan' ? S.plan : S.report}${sch.model ? ` · 🧠 ${sch.model}` : ''}`),
      h('div', { class: 'asa-sch-meta' }, `${S.next}: ${sch.enabled ? timeText(sch.next) : '—'} · ${S.last}: ${sch.lastRunAt ? timeText(sch.lastRunAt) : S.never}`),
      h('div', { class: 'asa-sch-btns' },
        h('button', { type: 'button', class: 'asa-btn', onclick: act(() => ns.localApi('POST', `/api/schedules/${sch.id}`, { enabled: !sch.enabled })) }, sch.enabled ? S.off : S.on),
        h('button', { type: 'button', class: 'asa-btn', onclick: act(async () => { await ns.localApi('POST', `/api/schedules/${sch.id}/run`); await ns.refreshData(); say(S.started); }) }, `▶ ${S.runNow}`),
        h('button', { type: 'button', class: 'asa-btn', onclick: () => { state.editing = sch.id; state.panel.rerender(); } }, S.editBtn),
        letter ? h('button', { type: 'button', class: 'asa-btn', onclick: () => { ns.panel.close(); ns.mailbox?.openLetter(letter.id); } }, `📮 ${S.openLetter}`) : null,
        h('button', { type: 'button', class: 'asa-btn', onclick: act(() => ns.localApi('DELETE', `/api/schedules/${sch.id}`)) }, `🗑 ${S.del}`)));
  }

  function open(opts = {}) {
    if (!document.getElementById('asa-sch-css')) document.head.appendChild(h('style', { id: 'asa-sch-css' }, css));
    state = { list: [], options: null, editing: null, panel: null, msg: null, templates: [], prefill: opts.template ?? null };
    state.panel = ns.panel.open({
      theme: 'cozy', dock: 'hud', title: `⏰ ${S.title}`,
      onClose: () => { state = null; },
      render(body) {
        if (state.offline) { body.append(h('p', {}, S.offline)); return; }
        if (!state.options) { body.append(h('p', { class: 'asa-muted' }, '…')); return; }
        state.msg = h('div', { class: 'asa-sch-msg' });
        body.append(h('div', { class: 'asa-sch' },
          state.list.length ? state.list.map(item) : h('p', { class: 'asa-muted' }, S.empty),
          state.msg, form(), h('div', { class: 'asa-sch-note' }, S.note)));
      },
    });
    state.panel.el.classList.add('asa-plain', 'asa-wide');
    reload().catch(() => { if (state) { state.offline = true; state.panel.rerender(); } });
  }

  ns.schedule = { open: (opts) => open(opts) };
})();
