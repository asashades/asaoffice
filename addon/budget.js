// asaoffice budget (💰 in the mailbox): limits on what tasks may cost. A per-run limit (every message you send starts one run) and a
// per-day limit for the whole office. A run is given what is left of the smaller one (`claude --max-budget-usd`), no run starts when
// today's budget is used up, and the office tells you (a macOS notification at 80% of the day, and on the letter when a run is stopped).
// The numbers are Claude Code's own cost estimates; the limit is checked between steps, so a run can overshoot it a little.
// The settings live on the Mac (POST /api/settings); a phone only sees a hint.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Batas biaya', today: 'Hari ini', of: (a, b) => `$${a.toFixed(2)} dari $${b.toFixed(2)}`, spentOnly: (a) => `$${a.toFixed(2)} (tanpa batas harian)`, left: (v) => `Sisa untuk hari ini: $${v.toFixed(2)}`,
      task: 'Batas per tugas (sekali jalan)', day: 'Batas per hari', none: 'Tanpa batas', save: 'Simpan', saved: 'Tersimpan.', failed: 'Gagal menyimpan: ',
      note: 'Setiap pesan yang kamu kirim memulai satu kali jalan. Claude diberi sisa dari batas yang lebih kecil dan berhenti kalau tercapai; kalau batas hari ini habis, tugas baru tidak dimulai (termasuk jadwal). Batas dicek di antara langkah Claude, jadi bisa terlewati sedikit. Angkanya perkiraan dari Claude Code, bukan tagihan: kalau kamu memakai langganan, ini hanya ukuran pemakaian.',
      min: 'Minimal $0,25.', offline: 'Batas biaya hanya bisa diatur dari Mac yang menjalankan kantor.',
    },
    en: {
      title: 'Cost limits', today: 'Today', of: (a, b) => `$${a.toFixed(2)} of $${b.toFixed(2)}`, spentOnly: (a) => `$${a.toFixed(2)} (no daily limit)`, left: (v) => `Left for today: $${v.toFixed(2)}`,
      task: 'Limit per task (one run)', day: 'Limit per day', none: 'No limit', save: 'Save', saved: 'Saved.', failed: 'Could not save: ',
      note: 'Every message you send starts one run. Claude is given what is left of the smaller limit and stops when it is reached; when today\'s budget is used up, no new task starts (schedules included). The limit is checked between Claude\'s steps, so a run can overshoot a little. The numbers are Claude Code\'s estimates, not a bill: on a subscription they are just a measure of use.',
      min: 'At least $0.25.', offline: 'Cost limits can only be set from the Mac that runs the office.',
    },
  });
  const css = `
  .asa-bud { display: flex; flex-direction: column; gap: 12px; }
  .asa-bud-meter { height: 14px; border: 2px solid #744122; background: #fffbe9; position: relative; }
  .asa-bud-meter i { position: absolute; inset: 0 auto 0 0; background: #4a8a52; }
  .asa-bud-meter.warn i { background: #c8801f; } .asa-bud-meter.over i { background: #c8503c; }
  .asa-bud label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
  .asa-bud .asa-bud-row { display: flex; gap: 8px; align-items: center; }
  .asa-bud input[type="number"] { font: inherit; width: 110px; padding: 4px 6px; border: 2px solid #d9c49a; background: #fffbe9; color: #3a2117; }
  .asa-bud .asa-bud-note { font-size: 12.5px; opacity: 0.75; line-height: 1.4; }
  .asa-bud .asa-bud-msg { min-height: 18px; font-size: 13px; }
  `;
  let state = null;

  async function reload() {
    state.info = (await ns.localApi('GET', '/api/options')).budget;
    state.panel?.rerender();
  }

  function limitRow(label, key) {
    const cur = state.info[key];
    const none = h('input', { type: 'checkbox' });
    none.checked = cur == null;
    const num = h('input', { type: 'number', min: '0.25', max: '1000', step: '0.25', value: cur == null ? '' : String(cur) });
    num.disabled = none.checked;
    none.onchange = () => { num.disabled = none.checked; if (!none.checked && !num.value) num.value = key === 'day' ? '15' : '3'; };
    state.fields[key] = () => (none.checked ? null : Number(num.value));
    return h('label', {}, label, h('div', { class: 'asa-bud-row' }, h('span', {}, '$'), num, h('label', { style: { flexDirection: 'row', gap: '4px', alignItems: 'center' } }, none, S.none)));
  }

  function open() {
    if (!document.getElementById('asa-bud-css')) document.head.appendChild(h('style', { id: 'asa-bud-css' }, css));
    state = { info: null, panel: null, fields: {}, msg: null, offline: false };
    state.panel = ns.panel.open({
      theme: 'cozy', dock: 'hud', title: `💰 ${S.title}`,
      onClose: () => { state = null; },
      render(body) {
        if (state.offline) { body.append(h('p', {}, S.offline)); return; }
        if (!state.info) { body.append(h('p', { class: 'asa-muted' }, '…')); return; }
        const { day, spentToday, left } = state.info;
        const pct = day ? Math.min(100, (spentToday / day) * 100) : 0;
        state.msg = h('div', { class: 'asa-bud-msg' });
        state.fields = {};
        const save = h('button', { type: 'button', class: 'asa-btn primary' }, S.save);
        save.onclick = async () => {
          const budget = { task: state.fields.task(), day: state.fields.day() };
          if ((budget.task != null && !(budget.task >= 0.25)) || (budget.day != null && !(budget.day >= 0.25))) { state.msg.textContent = S.min; return; }
          save.disabled = true;
          try { await ns.localApi('POST', '/api/settings', { budget }); await reload(); if (state?.msg) state.msg.textContent = S.saved; } catch (err) { if (state?.msg) state.msg.textContent = `${S.failed}${err.message}`; }
          save.disabled = false;
        };
        body.append(h('div', { class: 'asa-bud' },
          h('div', {}, h('b', {}, `${S.today}: `), day ? S.of(spentToday, day) : S.spentOnly(spentToday)),
          day ? h('div', { class: `asa-bud-meter${pct >= 100 ? ' over' : pct >= 80 ? ' warn' : ''}`, role: 'img', 'aria-label': `${Math.round(pct)}%` }, h('i', { style: { width: `${pct}%` } })) : null,
          left != null ? h('div', { class: 'asa-muted' }, S.left(left)) : null,
          limitRow(S.task, 'task'), limitRow(S.day, 'day'),
          h('div', {}, save), state.msg, h('div', { class: 'asa-bud-note' }, S.note)));
      },
    });
    state.panel.el.classList.add('asa-plain');
    reload().catch(() => { if (state) { state.offline = true; state.panel.rerender(); } });
  }

  ns.budget = { open };
})();
