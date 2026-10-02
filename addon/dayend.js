// asaoffice day summary, in the Stardew spirit:
//   - "Akhir Hari" (the 🌙 button on the HUD's hero card, pulsing after 18:00 while today hasn't been looked at): the day's
//     work as goods shipped. Each kind of work is priced (🌾 edits, 🍄 reads, ⛏️ commands, 🎣 web, ⚔️ sub-agents, 🧾 mailbox
//     tasks finished), the rows ping in one by one, the total counts up, and it's compared with yesterday, with a few awards.
//   - "Selamat pagi": the first time the office is opened on a morning, a short brief: yesterday's income and what is waiting
//     today (plans to approve, refused steps, unread letters, open to-dos, calendar events).
// The numbers come from the data feed (tool-call counts per day, mailbox letters): nothing here costs a token.
// ?brief=off turns the automatic morning brief off.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      endTitle: 'Akhir Hari', morningTitle: 'Selamat pagi', next: 'Lanjut', start: 'Mulai hari ☀️', openMail: 'Buka kotak surat',
      cats: { edit: 'File diedit', search: 'File dibaca', command: 'Command dijalankan', web: 'Pencarian web', agent: 'Sub-agent turun tangan' },
      tasks: 'Tugas kotak surat selesai', total: 'Pendapatan hari ini', vsYesterday: (d) => (d > 0 ? `▲ ${d}g lebih banyak dari kemarin` : d < 0 ? `▼ ${-d}g lebih sedikit dari kemarin` : 'sama seperti kemarin'),
      firstDay: 'Hari pertama yang tercatat!', quiet: 'Hari ini sepi. Belum ada barang yang dikirim.', skip: 'klik untuk melewati animasi',
      awBusiest: 'Hari tersibuk', awStreak: (n) => `Streak ${n} hari`, awHour: (hh) => `Jam tersibuk ${hh}.00`, awTasks: (n) => `${n} tugas selesai`,
      hello: ['Selamat pagi', 'Selamat siang', 'Selamat sore', 'Selamat malam'], yesterday: 'Kemarin', yesterdayQuiet: 'Kemarin kantor sepi. Hari baru, lembaran baru 🌻',
      yesterdayLine: (g, t, s) => `${g}g · ${t} tugas surat selesai · ${s} sesi`, waiting: 'Hari ini menunggu',
      plans: (n) => `📝 ${n} rencana menunggu persetujuanmu`, denials: (n) => `⛔ ${n} langkah ditolak otomatis (buka suratnya)`, unread: (n) => `📮 ${n} surat belum dibaca`,
      todos: (n) => `💡 ${n} ide/TODO belum selesai di Rak Buku`, events: (n) => `📅 ${n} acara hari ini`, allClear: 'Tidak ada yang menunggu. Santai dulu ☕',
      allDay: 'sepanjang hari', schedules: (n) => `⏰ ${n} jadwal hari ini`, daysShort: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
    },
    en: {
      endTitle: 'End of Day', morningTitle: 'Good morning', next: 'Continue', start: 'Start the day ☀️', openMail: 'Open the mailbox',
      cats: { edit: 'Files edited', search: 'Files read', command: 'Commands run', web: 'Web searches', agent: 'Sub-agents pitched in' },
      tasks: 'Mailbox tasks finished', total: "Today's income", vsYesterday: (d) => (d > 0 ? `▲ ${d}g more than yesterday` : d < 0 ? `▼ ${-d}g less than yesterday` : 'same as yesterday'),
      firstDay: 'First recorded day!', quiet: 'A quiet day. Nothing shipped yet.', skip: 'click to skip the animation',
      awBusiest: 'Busiest day', awStreak: (n) => `${n}-day streak`, awHour: (hh) => `Busiest hour ${hh}:00`, awTasks: (n) => `${n} tasks finished`,
      hello: ['Good morning', 'Good afternoon', 'Good evening', 'Good night'], yesterday: 'Yesterday', yesterdayQuiet: 'The office was quiet yesterday. A new day, a clean page 🌻',
      yesterdayLine: (g, t, s) => `${g}g · ${t} mailbox tasks finished · ${s} sessions`, waiting: 'Waiting today',
      plans: (n) => `📝 ${n} plan(s) waiting for your approval`, denials: (n) => `⛔ ${n} step(s) refused automatically (open the letter)`, unread: (n) => `📮 ${n} unread letter(s)`,
      todos: (n) => `💡 ${n} open idea(s)/TODO in the Bookshelf`, events: (n) => `📅 ${n} event(s) today`, allClear: 'Nothing is waiting. Relax for a bit ☕',
      allDay: 'all day', schedules: (n) => `⏰ ${n} schedule(s) today`, daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    },
  });
  const locale = ns.lang === 'id' ? 'id-ID' : 'en-US';

  // What each kind of work is worth, in gold.
  const PRICE = { edit: 12, search: 3, command: 8, web: 6, agent: 25 };
  const TASK_PRICE = 100;
  const ICON = { edit: '🌾', search: '🍄', command: '⛏️', web: '🎣', agent: '⚔️' };

  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  const css = `
  .asa-day { font-size: 15px; }
  .asa-day-date { opacity: 0.7; font-size: 13px; margin-bottom: 8px; }
  .asa-day-rows { display: flex; flex-direction: column; gap: 2px; cursor: pointer; }
  .asa-day-row { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto 78px; gap: 6px; align-items: baseline; padding: 5px 4px; border-bottom: 1px dashed #d9c49a;
    opacity: 0; transform: translateY(6px); transition: opacity 0.25s, transform 0.25s; }
  .asa-day-row.on { opacity: 1; transform: none; }
  .asa-day-row small { opacity: 0.65; white-space: nowrap; }
  .asa-day-row b { font-weight: 600; text-align: right; }
  .asa-day-row.zero { opacity: 0; } .asa-day-row.zero.on { opacity: 0.4; }
  .asa-day-total { display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px; padding: 8px 10px; background: #fff6dc; border: 2px solid #744122;
    opacity: 0; transition: opacity 0.3s; }
  .asa-day-total.on { opacity: 1; }
  .asa-day-total b { font-size: 26px; color: #973a2f; font-variant-numeric: tabular-nums; }
  .asa-day-total.glow { border-color: #f2c94c; animation: asa-glow-box 1.8s ease-in-out infinite; }
  .asa-day-total.glow b { color: #d98200; animation: asa-glow-text 1.8s ease-in-out infinite; }
  @keyframes asa-glow-text { 0%, 100% { text-shadow: 0 0 4px #f2c94c, 0 0 12px rgba(240,160,32,0.8); } 50% { text-shadow: 0 0 8px #ffe27a, 0 0 24px rgba(255,190,50,1), 0 0 36px rgba(240,160,32,0.7); } }
  @keyframes asa-glow-box { 0%, 100% { box-shadow: 0 0 6px rgba(242,201,76,0.6), inset 0 0 8px rgba(242,201,76,0.25); } 50% { box-shadow: 0 0 20px rgba(255,200,60,0.95), inset 0 0 14px rgba(242,201,76,0.5); } }
  .asa-day-coins { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 3; }
  .asa-coin { position: absolute; top: -16px; width: 12px; height: 12px; background: #f6c21a; border: 2px solid #b8741a; box-shadow: inset 2px 2px 0 #ffe27a, inset -2px -2px 0 #d9971a;
    animation: asa-coin-fall var(--dur, 1.6s) cubic-bezier(0.4, 0, 0.9, 1) var(--delay, 0s) forwards, asa-coin-spin 0.45s steps(4) var(--delay, 0s) infinite; opacity: 0; }
  @keyframes asa-coin-fall { 0% { transform: translate(0, 0); opacity: 1; } 85% { opacity: 1; } 100% { transform: translate(var(--drift, 0px), var(--fall, 520px)); opacity: 0; } }
  @keyframes asa-coin-spin { 0% { width: 12px; margin-left: 0; } 25% { width: 7px; margin-left: 2px; } 50% { width: 3px; margin-left: 4px; } 75% { width: 7px; margin-left: 2px; } 100% { width: 12px; margin-left: 0; } }
  .asa-day-delta { font-size: 13px; margin-top: 6px; min-height: 18px; }
  .asa-day-delta.up { color: #3f8a36; } .asa-day-delta.down { color: #c8503c; }
  .asa-day-awards { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; min-height: 28px; }
  .asa-day-award { padding: 3px 9px; background: #f2c94c; color: #3a2117; border: 2px solid #b8935c; font-size: 13px; animation: asa-day-pop 0.35s ease-out; }
  @keyframes asa-day-pop { from { transform: scale(0.6); opacity: 0; } to { transform: none; opacity: 1; } }
  .asa-day-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; gap: 8px; }
  .asa-day-hint { font-size: 12px; opacity: 0.55; }
  .asa-day-list { list-style: none; margin: 6px 0 0; padding: 0; }
  .asa-day-list li { padding: 5px 0; border-bottom: 1px dashed #d9c49a; }
  .asa-day-list li button { font: inherit; background: none; border: 0; padding: 0; color: inherit; text-align: left; cursor: pointer; text-decoration: underline dotted; }
  .asa-day h3 { font-weight: 600; font-size: 14px; margin: 14px 0 2px; color: #973a2f; }
  @media (prefers-reduced-motion: reduce) { .asa-day-row, .asa-day-total { transition: none; } .asa-day-award, .asa-day-total.glow, .asa-day-total.glow b { animation: none; } .asa-day-coins { display: none; } }
  `;
  const ensureCss = () => { if (!document.getElementById('asa-day-css')) document.head.appendChild(h('style', { id: 'asa-day-css' }, css)); };

  // ── The numbers ──
  const doneOn = (key) => (ns.data?.mail ?? []).filter((l) => !l.report && l.status === 'done' && l.finishedAt && dayKey(new Date(l.finishedAt)) === key).length;
  function summary(key) {
    const d = ns.data?.stats?.days?.[key] ?? null;
    const rows = Object.keys(PRICE).map((k) => ({ key: k, icon: ICON[k], label: S.cats[k], count: d?.[k] ?? 0, price: PRICE[k] }));
    rows.push({ key: 'tasks', icon: '🧾', label: S.tasks, count: doneOn(key), price: TASK_PRICE });
    const total = rows.reduce((sum, r) => sum + r.count * r.price, 0);
    return { key, d, rows, total, tools: d?.tools ?? 0, sessions: d?.sessions ?? 0, tasks: doneOn(key) };
  }
  const incomeOn = (key) => summary(key).total;

  function awardsFor(sum) {
    const out = [];
    const stats = ns.data?.stats;
    const others = Object.entries(stats?.days ?? {}).filter(([k, v]) => k !== sum.key && v.tools > 0);
    if (sum.tools > 0 && others.length >= 3 && sum.tools > Math.max(...others.map(([, v]) => v.tools))) out.push(`🏆 ${S.awBusiest}`);
    if ((stats?.streak ?? 0) >= 3 && sum.key === dayKey()) out.push(`🔥 ${S.awStreak(stats.streak)}`);
    if (sum.key === dayKey() && stats?.hours) {
      const max = Math.max(...stats.hours);
      if (max > 0) out.push(`⏰ ${S.awHour(pad(stats.hours.indexOf(max)))}`);
    }
    if (sum.tasks > 0) out.push(`🧾 ${S.awTasks(sum.tasks)}`);
    return out;
  }

  // ── Akhir Hari ──
  const endSeen = () => ns.store.get('dayEndSeen');
  function openEnd(key = dayKey()) {
    ensureCss();
    ns.store.set('dayEndSeen', dayKey());
    const sum = summary(key);
    const prev = incomeOn(dayKey(addDays(new Date(`${key}T12:00:00`), -1)));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers = [];
    let rowsEl = null;
    ns.panel.open({
      theme: 'cozy',
      title: `🌙 ${S.endTitle}`,
      onClose: () => timers.forEach(clearTimeout),
      render(body, panel) {
        const date = new Date(`${key}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
        const rows = sum.rows.map((r) => h('div', { class: `asa-day-row${r.count ? '' : ' zero'}` }, h('span', {}, r.icon), h('span', {}, r.label),
          h('small', {}, `${r.count} × ${r.price}g`), h('b', {}, `${r.count * r.price}g`)));
        rowsEl = h('div', { class: 'asa-day-rows', title: S.skip }, rows);
        const totalNum = h('b', {}, '0g');
        const total = h('div', { class: 'asa-day-total' }, h('span', {}, S.total), totalNum);
        const delta = h('div', { class: 'asa-day-delta' });
        const awards = h('div', { class: 'asa-day-awards' });
        const quiet = sum.total === 0 ? h('p', { class: 'asa-muted' }, `🌻 ${S.quiet}`) : null;
        const next = h('button', { type: 'button', class: 'asa-btn primary', onclick: () => panel.close() }, S.next);
        body.append(h('div', { class: 'asa-day' }, h('div', { class: 'asa-day-date' }, date), rowsEl, quiet, total, delta, awards,
          h('div', { class: 'asa-day-actions' }, h('span', { class: 'asa-day-hint' }, reduced || sum.total === 0 ? '' : S.skip), next)));

        const coins = h('div', { class: 'asa-day-coins' });
        panel.el.append(coins);
        /** Coins tumbling down the panel: a handful per row, a shower for the total. */
        const rain = (n) => {
          if (reduced) return;
          const height = panel.el.clientHeight || 520;
          for (let k = 0; k < n; k++) {
            const coin = h('i', { class: 'asa-coin' });
            coin.style.left = `${4 + Math.random() * 92}%`;
            coin.style.setProperty('--dur', `${(0.9 + Math.random() * 1.0).toFixed(2)}s`);
            coin.style.setProperty('--delay', `${(Math.random() * 0.45).toFixed(2)}s`);
            coin.style.setProperty('--drift', `${Math.round(Math.random() * 60 - 30)}px`);
            coin.style.setProperty('--fall', `${height + 24}px`);
            coin.addEventListener('animationend', (e) => { if (e.animationName === 'asa-coin-fall') coin.remove(); });
            coins.append(coin);
          }
        };
        const finish = () => {
          rows.forEach((r) => r.classList.add('on'));
          total.classList.add('on');
          totalNum.textContent = `${sum.total}g`;
          if (sum.total > 0) total.classList.add('glow');
          if (sum.total > 0) {
            const diff = sum.total - prev;
            delta.textContent = prev > 0 || diff !== 0 ? S.vsYesterday(diff) : S.firstDay;
            delta.className = `asa-day-delta ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`;
          }
          awards.replaceChildren(...awardsFor(sum).map((a) => h('span', { class: 'asa-day-award' }, a)));
        };
        if (reduced || sum.total === 0) return finish();
        let i = 0;
        const step = () => {
          if (i < rows.length) {
            rows[i].classList.add('on');
            if (sum.rows[i].count) { ns.notify?.sfx?.('coin'); rain(Math.min(7, 2 + Math.floor(sum.rows[i].count * sum.rows[i].price / 120))); }
            i += 1;
            timers.push(setTimeout(step, sum.rows[i - 1].count ? 420 : 120));
          } else {
            total.classList.add('on', 'glow');
            rain(Math.min(46, 18 + Math.floor(sum.total / 60)));
            const t0 = performance.now();
            const tick = (now) => {
              const t = Math.min(1, (now - t0) / 900);
              totalNum.textContent = `${Math.round(sum.total * (1 - (1 - t) ** 3))}g`;
              if (t < 1) requestAnimationFrame(tick);
              else { ns.notify?.sfx?.('plan'); finish(); }
            };
            requestAnimationFrame(tick);
          }
        };
        step();
        rowsEl.onclick = () => { timers.forEach(clearTimeout); i = rows.length; finish(); };
      },
    });
  }

  // ── Selamat pagi ──
  const briefSeen = () => ns.store.get('dayBriefSeen');
  async function openMorning() {
    ensureCss();
    ns.store.set('dayBriefSeen', dayKey());
    const today = new Date();
    const y = summary(dayKey(addDays(today, -1)));
    const mail = (ns.data?.mail ?? []).filter((l) => !l.report);
    const plans = mail.filter((l) => l.status === 'awaiting');
    const denials = mail.reduce((n, l) => n + (l.denials ?? []).filter((d) => d.state === 'open').length, 0);
    const unread = mail.filter((l) => !l.read && l.status !== 'running' && l.status !== 'queued').length;
    const hour = today.getHours();
    const hello = S.hello[hour < 11 ? 0 : hour < 15 ? 1 : hour < 18 ? 2 : 3];
    const events = (ns.data?.calendar?.events ?? []).filter((e) => {
      const s = new Date(e.start); const en = new Date(e.end);
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return s < addDays(start, 1) && en > start;
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
    let todos = null;
    try { todos = (await ns.localApi('GET', '/api/vault')).notes.find((n) => n.path === 'Ide-TODO.md')?.open ?? null; } catch { /* no vault access (a phone) */ }
    const lines = [];
    const link = (text, fn) => h('li', {}, h('button', { type: 'button', onclick: () => { panel?.close(); fn(); } }, text));
    let panel = null;
    if (plans.length) lines.push(link(S.plans(plans.length), () => ns.mailbox?.openLetter(plans[0].id)));
    if (denials) lines.push(link(S.denials(denials), () => ns.mailbox?.open()));
    if (unread) lines.push(link(S.unread(unread), () => ns.mailbox?.open()));
    if (todos) lines.push(link(S.todos(todos), () => ns.shelf?.open()));
    const todaySchedules = (ns.data?.schedules ?? []).filter((x) => x.enabled && x.next && new Date(x.next).toDateString() === today.toDateString());
    if (todaySchedules.length) {
      const first = todaySchedules.slice(0, 3).map((x) => `${x.time.replace(':', '.')} ${x.title}`).join(' · ');
      lines.push(h('li', {}, h('button', { type: 'button', onclick: () => { panel?.close(); ns.schedule?.open(); } }, S.schedules(todaySchedules.length)), h('br'), h('small', { class: 'asa-muted' }, first)));
    }
    if (events.length) {
      const first = events.slice(0, 3).map((e) => `${e.allDay ? S.allDay : new Date(e.start).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} ${e.title}`).join(' · ');
      lines.push(h('li', {}, S.events(events.length), h('br'), h('small', { class: 'asa-muted' }, first)));
    }
    panel = ns.panel.open({
      theme: 'cozy',
      title: `☀️ ${hello}, Komisaris`,
      render(body, p) {
        body.append(h('div', { class: 'asa-day' },
          h('h3', { style: { marginTop: '0' } }, S.yesterday),
          h('p', {}, y.total > 0 ? S.yesterdayLine(y.total, y.tasks, y.sessions) : S.yesterdayQuiet),
          h('h3', {}, S.waiting),
          lines.length ? h('ul', { class: 'asa-day-list' }, lines) : h('p', {}, S.allClear),
          h('div', { class: 'asa-day-actions' }, h('button', { type: 'button', class: 'asa-btn', onclick: () => { p.close(); ns.mailbox?.open(); } }, S.openMail),
            h('button', { type: 'button', class: 'asa-btn primary', onclick: () => p.close() }, S.start))));
      },
    });
    ns.notify?.sfx?.('plan');
  }

  /** True while the end of today is worth a look: after 18:00, something was done, and it wasn't opened today. */
  const pending = () => new Date().getHours() >= 18 && endSeen() !== dayKey() && (ns.data?.stats?.days?.[dayKey()]?.tools ?? 0) > 0;

  // The first time the office is opened on a morning (once the data feed has arrived and no panel is in the way).
  if (ns.setting('brief', ['on', 'off'], 'on') === 'on') {
    const timer = setInterval(() => {
      if (!ns.data?.stats || !ns.view?.office) return;
      clearInterval(timer);
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12 && briefSeen() !== dayKey() && !ns.panel.isOpen) setTimeout(() => { if (!ns.panel.isOpen) openMorning(); }, 1800);
    }, 1000);
  }

  ns.dayEnd = { open: openEnd, morning: openMorning, pending, summary };
})();
