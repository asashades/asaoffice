// asaoffice daily income, the way Stardew pays it: what you ship today is paid out TOMORROW MORNING.
//   - The first time the office is opened on a new day, a "Selamat pagi" card opens with yesterday's income as goods shipped:
//     each kind of work is priced (🌾 edits, 🍄 reads, ⛏️ commands, 🎣 web, ⚔️ sub-agents, 🧾 mailbox tasks finished), the rows
//     ping in one by one while coins fall, the total counts up and glows, it's compared with the day before, and a few awards
//     appear. The money goes into the office's Kas (tools/lib/ledger.mjs, once per day, so a second tab or a phone can't pay it
//     twice); days the office wasn't opened are paid together as one extra row (up to two weeks back).
//   - Below that: what is waiting today (plans to approve, refused steps, unread letters, open to-dos, calendar events) and
//     what has been earned so far today ("cair besok pagi").
//   - The 🌙 button on the hero card replays it (never pays twice); it pulses until you've looked at this morning's payout.
// The numbers come from the data feed (tool-call counts per day, mailbox letters): nothing here costs a token.
// ?brief=off turns the automatic morning card off.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      replayTitle: 'Pendapatan kemarin', next: 'Lanjut', start: 'Mulai hari ☀️', openMail: 'Buka kotak surat', yesterdayOn: 'Kemarin',
      cats: { edit: 'File diedit', search: 'File dibaca', command: 'Command dijalankan', web: 'Pencarian web', agent: 'Sub-agent turun tangan' },
      tasks: 'Tugas kotak surat selesai', earlier: (n) => `Hari sebelumnya yang belum cair (${n} hari)`,
      total: 'Uang masuk pagi ini', totalReplay: 'Pendapatan kemarin', vsPrev: (d) => (d > 0 ? `▲ ${d}g lebih banyak dari hari sebelumnya` : d < 0 ? `▼ ${-d}g lebih sedikit dari hari sebelumnya` : 'sama seperti hari sebelumnya'),
      firstDay: 'Hari pertama yang tercatat!', quiet: 'Kemarin sepi, belum ada barang yang dikirim. Hari baru, lembaran baru 🌻', skip: 'klik untuk melewati animasi',
      kas: 'Kas kantor', paidAlready: 'sudah cair pagi ini', noLedger: 'Kas hanya dicatat dari Mac yang menjalankan kantor.',
      awBusiest: 'Hari tersibuk', awStreak: (n) => `Streak ${n} hari`, awTasks: (n) => `${n} tugas selesai`,
      hello: ['Selamat pagi', 'Selamat siang', 'Selamat sore', 'Selamat malam'], waiting: 'Hari ini menunggu',
      todayTally: (g) => `Hari ini tercatat ${g} · cair besok pagi`,
      plans: (n) => `📝 ${n} rencana menunggu persetujuanmu`, denials: (n) => `⛔ ${n} langkah ditolak otomatis (buka suratnya)`, unread: (n) => `📮 ${n} surat belum dibaca`,
      todos: (n) => `💡 ${n} ide/TODO belum selesai di Rak Buku`, events: (n) => `📅 ${n} acara hari ini`, allClear: 'Tidak ada yang menunggu. Santai dulu ☕',
      allDay: 'sepanjang hari',
    },
    en: {
      replayTitle: "Yesterday's income", next: 'Continue', start: 'Start the day ☀️', openMail: 'Open the mailbox', yesterdayOn: 'Yesterday',
      cats: { edit: 'Files edited', search: 'Files read', command: 'Commands run', web: 'Web searches', agent: 'Sub-agents pitched in' },
      tasks: 'Mailbox tasks finished', earlier: (n) => `Earlier days not yet paid (${n} days)`,
      total: 'Paid this morning', totalReplay: "Yesterday's income", vsPrev: (d) => (d > 0 ? `▲ ${d}g more than the day before` : d < 0 ? `▼ ${-d}g less than the day before` : 'same as the day before'),
      firstDay: 'First recorded day!', quiet: 'Yesterday was quiet, nothing shipped. A new day, a clean page 🌻', skip: 'click to skip the animation',
      kas: 'Office cash', paidAlready: 'already paid this morning', noLedger: 'Cash is only recorded from the Mac that runs the office.',
      awBusiest: 'Busiest day', awStreak: (n) => `${n}-day streak`, awTasks: (n) => `${n} tasks finished`,
      hello: ['Good morning', 'Good afternoon', 'Good evening', 'Good night'], waiting: 'Waiting today',
      todayTally: (g) => `Earned so far today: ${g} · paid tomorrow morning`,
      plans: (n) => `📝 ${n} plan(s) waiting for your approval`, denials: (n) => `⛔ ${n} step(s) refused automatically (open the letter)`, unread: (n) => `📮 ${n} unread letter(s)`,
      todos: (n) => `💡 ${n} open idea(s)/TODO in the Bookshelf`, events: (n) => `📅 ${n} event(s) today`, allClear: 'Nothing is waiting. Relax for a bit ☕',
      allDay: 'all day',
    },
  });
  const locale = ns.lang === 'id' ? 'id-ID' : 'en-US';
  const fmtG = (n) => `${Math.round(n).toLocaleString(locale)}g`;

  // What each kind of work is worth, in gold.
  const PRICE = { edit: 12, search: 3, command: 8, web: 6, agent: 25 };
  const TASK_PRICE = 100;
  const ICON = { edit: '🌾', search: '🍄', command: '⛏️', web: '🎣', agent: '⚔️' };
  const MAX_CATCHUP_DAYS = 14;

  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const noon = (key) => new Date(`${key}T12:00:00`);

  const css = `
  .asa-day { font-size: 15px; }
  .asa-day-date { opacity: 0.7; font-size: 13px; margin-bottom: 8px; }
  .asa-day-rows { display: flex; flex-direction: column; gap: 2px; cursor: pointer; }
  .asa-day-row { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto 84px; gap: 6px; align-items: baseline; padding: 5px 4px; border-bottom: 1px dashed #d9c49a;
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
  .asa-day-kas { display: flex; justify-content: space-between; align-items: baseline; margin-top: 6px; padding: 6px 10px; background: #f4e6c4; border: 2px dashed #b8935c; opacity: 0; transition: opacity 0.3s; }
  .asa-day-kas.on { opacity: 1; }
  .asa-day-kas b { font-weight: 600; font-variant-numeric: tabular-nums; }
  .asa-day-tally { font-size: 12.5px; opacity: 0.7; margin-top: 8px; }
  .asa-day-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; gap: 8px; }
  .asa-day-hint { font-size: 12px; opacity: 0.55; }
  .asa-day-list { list-style: none; margin: 6px 0 0; padding: 0; }
  .asa-day-list li { padding: 5px 0; border-bottom: 1px dashed #d9c49a; }
  .asa-day-list li button { font: inherit; background: none; border: 0; padding: 0; color: inherit; text-align: left; cursor: pointer; text-decoration: underline dotted; }
  .asa-day h3 { font-weight: 600; font-size: 14px; margin: 14px 0 2px; color: #973a2f; }
  @media (prefers-reduced-motion: reduce) { .asa-day-row, .asa-day-total, .asa-day-kas { transition: none; } .asa-day-award, .asa-day-total.glow, .asa-day-total.glow b { animation: none; } .asa-day-coins { display: none; } }
  `;
  const ensureCss = () => { if (!document.getElementById('asa-day-css')) document.head.appendChild(h('style', { id: 'asa-day-css' }, css)); };

  // ── The numbers ──
  const doneOn = (key) => (ns.data?.mail ?? []).filter((l) => !l.report && l.status === 'done' && l.finishedAt && dayKey(new Date(l.finishedAt)) === key).length;
  function summary(key) {
    const d = ns.data?.stats?.days?.[key] ?? null;
    const rows = Object.keys(PRICE).map((k) => ({ key: k, icon: ICON[k], label: S.cats[k], count: d?.[k] ?? 0, price: PRICE[k], amount: (d?.[k] ?? 0) * PRICE[k] }));
    const tasks = doneOn(key);
    rows.push({ key: 'tasks', icon: '🧾', label: S.tasks, count: tasks, price: TASK_PRICE, amount: tasks * TASK_PRICE });
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    return { key, d, rows, total, tools: d?.tools ?? 0, sessions: d?.sessions ?? 0, tasks };
  }
  const incomeOn = (key) => summary(key).total;

  function awardsFor(sum) {
    const out = [];
    const stats = ns.data?.stats;
    const others = Object.entries(stats?.days ?? {}).filter(([k, v]) => k !== sum.key && v.tools > 0);
    if (sum.tools > 0 && others.length >= 3 && sum.tools > Math.max(...others.map(([, v]) => v.tools))) out.push(`🏆 ${S.awBusiest}`);
    if ((stats?.streak ?? 0) >= 3 && sum.total > 0) out.push(`🔥 ${S.awStreak(stats.streak)}`);
    if (sum.tasks > 0) out.push(`🧾 ${S.awTasks(sum.tasks)}`);
    return out;
  }

  /** Days (before today) whose work hasn't been paid yet, oldest first, besides yesterday. Only with a cash book. */
  function earlierUnpaid(paidThrough, yesterday) {
    if (!paidThrough) return [];
    const floor = dayKey(addDays(new Date(), -MAX_CATCHUP_DAYS));
    return Object.keys(ns.data?.stats?.days ?? {}).filter((k) => k > paidThrough && k > floor && k < yesterday).sort();
  }

  const seen = () => ns.store.get('dayIncomeSeen');
  let opening = false;

  /** The morning card: yesterday's income (paid once into the Kas), what waits today. `auto` = the first open of the day. */
  async function open({ auto = false } = {}) {
    if (opening) return;
    opening = true;
    try {
      ensureCss();
      ns.store.set('dayIncomeSeen', dayKey());
      const today = new Date();
      const yKey = dayKey(addDays(today, -1));
      const ysum = summary(yKey);
      let ledger = null;
      try { ledger = await ns.localApi('GET', '/api/ledger'); } catch { /* a phone: no cash book */ }
      const paidAlready = !!ledger && !!ledger.paidThrough && ledger.paidThrough >= yKey;
      const earlier = ledger && !paidAlready ? earlierUnpaid(ledger.paidThrough, yKey) : [];
      const earlierSum = earlier.reduce((n, k) => n + incomeOn(k), 0);
      const rows = ysum.rows.slice();
      if (earlierSum > 0) rows.push({ key: 'earlier', icon: '📦', label: S.earlier(earlier.length), count: 0, price: 0, amount: earlierSum, plain: true });
      const total = rows.reduce((n, r) => n + r.amount, 0);
      const prev = incomeOn(dayKey(addDays(today, -2)));

      // Pay it out (once). If it fails, the card still shows the numbers.
      let kasBefore = ledger?.kas ?? null;
      let kasAfter = ledger?.kas ?? null;
      if (ledger && !paidAlready) {
        try {
          const res = await ns.localApi('POST', '/api/ledger/collect', { through: yKey, amount: total });
          kasAfter = res.kas;
          kasBefore = res.paid ? res.kas - total : res.kas;
        } catch { /* keep the old numbers */ }
      }

      // What waits today
      const mail = (ns.data?.mail ?? []).filter((l) => !l.report);
      const plans = mail.filter((l) => l.status === 'awaiting');
      const denials = mail.reduce((n, l) => n + (l.denials ?? []).filter((d) => d.state === 'open').length, 0);
      const unread = mail.filter((l) => !l.read && l.status !== 'running' && l.status !== 'queued').length;
      const hour = today.getHours();
      const hello = S.hello[hour < 11 ? 0 : hour < 15 ? 1 : hour < 18 ? 2 : 3];
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const events = (ns.data?.calendar?.events ?? []).filter((e) => new Date(e.start) < addDays(startOfToday, 1) && new Date(e.end) > startOfToday)
        .sort((a, b) => new Date(a.start) - new Date(b.start));
      let todos = null;
      try { todos = (await ns.localApi('GET', '/api/vault')).notes.find((n) => n.path === 'Ide-TODO.md')?.open ?? null; } catch { /* no vault access (a phone) */ }
      const todayTotal = incomeOn(dayKey(today));

      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const timers = [];
      let panel = null;
      const link = (text, fn) => h('li', {}, h('button', { type: 'button', onclick: () => { panel?.close(); fn(); } }, text));
      const lines = [];
      if (plans.length) lines.push(link(S.plans(plans.length), () => ns.mailbox?.openLetter(plans[0].id)));
      if (denials) lines.push(link(S.denials(denials), () => ns.mailbox?.open()));
      if (unread) lines.push(link(S.unread(unread), () => ns.mailbox?.open()));
      if (todos) lines.push(link(S.todos(todos), () => ns.shelf?.open()));
      if (events.length) {
        const first = events.slice(0, 3).map((e) => `${e.allDay ? S.allDay : new Date(e.start).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} ${e.title}`).join(' · ');
        lines.push(h('li', {}, S.events(events.length), h('br'), h('small', { class: 'asa-muted' }, first)));
      }

      panel = ns.panel.open({
        theme: 'cozy',
        title: auto ? `☀️ ${hello}, Komisaris` : `💰 ${S.replayTitle}`,
        onClose: () => timers.forEach(clearTimeout),
        render(body, p) {
          const date = noon(yKey).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
          const rowEls = rows.map((r) => h('div', { class: `asa-day-row${r.amount || r.plain ? '' : ' zero'}` }, h('span', {}, r.icon), h('span', {}, r.label),
            h('small', {}, r.plain ? '' : `${r.count} × ${r.price}g`), h('b', {}, fmtG(r.amount))));
          const rowsEl = h('div', { class: 'asa-day-rows', title: S.skip }, rowEls);
          const totalNum = h('b', {}, '0g');
          const totalEl = h('div', { class: 'asa-day-total' }, h('span', {}, paidAlready || !ledger ? S.totalReplay : S.total), totalNum);
          const delta = h('div', { class: 'asa-day-delta' });
          const awards = h('div', { class: 'asa-day-awards' });
          const kasNum = h('b', {}, kasBefore == null ? '' : fmtG(kasBefore));
          const kasEl = ledger ? h('div', { class: 'asa-day-kas' }, h('span', {}, `💰 ${S.kas}`), kasNum) : h('p', { class: 'asa-muted' }, S.noLedger);
          const quiet = total === 0 ? h('p', { class: 'asa-muted' }, `🌻 ${S.quiet}`) : null;
          const next = h('button', { type: 'button', class: 'asa-btn primary', onclick: () => p.close() }, S.start);
          const mailBtn = h('button', { type: 'button', class: 'asa-btn', onclick: () => { p.close(); ns.mailbox?.open(); } }, S.openMail);
          body.append(h('div', { class: 'asa-day' },
            h('div', { class: 'asa-day-date' }, `${S.yesterdayOn} · ${date}`),
            total === 0 ? null : rowsEl, quiet, total === 0 ? null : totalEl, delta, awards, kasEl,
            h('div', { class: 'asa-day-tally' }, S.todayTally(fmtG(todayTotal))),
            h('h3', {}, S.waiting), lines.length ? h('ul', { class: 'asa-day-list' }, lines) : h('p', {}, S.allClear),
            h('div', { class: 'asa-day-actions' }, h('span', { class: 'asa-day-hint' }, reduced || total === 0 ? '' : S.skip), h('span', {}, mailBtn, ' ', next))));

          const coins = h('div', { class: 'asa-day-coins' });
          p.el.append(coins);
          /** Coins tumbling down the card: a handful per row, a shower for the total. */
          const rain = (n) => {
            if (reduced) return;
            const height = p.el.clientHeight || 520;
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
          const countUp = (el, from, to, ms, done) => {
            const t0 = performance.now();
            const tick = (now) => {
              const t = Math.min(1, (now - t0) / ms);
              el.textContent = fmtG(from + (to - from) * (1 - (1 - t) ** 3));
              if (t < 1) requestAnimationFrame(tick); else done?.();
            };
            requestAnimationFrame(tick);
          };
          const showKas = () => {
            if (!ledger) return;
            kasEl.classList.add('on');
            if (kasBefore != null && kasAfter != null && kasAfter !== kasBefore && !reduced) countUp(kasNum, kasBefore, kasAfter, 800);
            else kasNum.textContent = fmtG(kasAfter ?? kasBefore ?? 0);
          };
          const finish = () => {
            rowEls.forEach((r) => r.classList.add('on'));
            totalEl.classList.add('on');
            totalNum.textContent = fmtG(total);
            if (total > 0) {
              totalEl.classList.add('glow');
              const diff = ysum.total - prev;
              delta.textContent = prev > 0 || diff !== 0 ? S.vsPrev(diff) : S.firstDay;
              delta.className = `asa-day-delta ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`;
            }
            awards.replaceChildren(...awardsFor(ysum).map((a) => h('span', { class: 'asa-day-award' }, a)));
            showKas();
          };
          if (reduced || total === 0) { finish(); return; }
          let i = 0;
          const step = () => {
            if (i < rowEls.length) {
              rowEls[i].classList.add('on');
              const r = rows[i];
              if (r.amount) { ns.notify?.sfx?.('coin'); rain(Math.min(7, 2 + Math.floor(r.amount / 120))); }
              i += 1;
              timers.push(setTimeout(step, r.amount ? 420 : 120));
            } else {
              totalEl.classList.add('on', 'glow');
              rain(Math.min(46, 18 + Math.floor(total / 60)));
              countUp(totalNum, 0, total, 900, () => { ns.notify?.sfx?.('plan'); finish(); });
            }
          };
          step();
          rowsEl.onclick = () => { timers.forEach(clearTimeout); i = rows.length; finish(); };
        },
      });
      if (!panel) return;
      ns.notify?.sfx?.(total > 0 ? 'drop' : 'plan');
    } finally {
      opening = false;
    }
  }

  /** True while this morning's payout hasn't been looked at (something was earned yesterday and the card wasn't opened today). */
  const pending = () => seen() !== dayKey() && !!ns.data?.stats && incomeOn(dayKey(addDays(new Date(), -1))) > 0;

  // The first time the office is opened on a new day (once the data feed has arrived and no panel is in the way).
  if (ns.setting('brief', ['on', 'off'], 'on') === 'on') {
    const timer = setInterval(() => {
      if (!ns.data?.stats || !ns.view?.office) return;
      clearInterval(timer);
      if (seen() !== dayKey() && !ns.panel.isOpen) setTimeout(() => { if (!ns.panel.isOpen) open({ auto: true }); }, 1800);
    }, 1000);
  }

  ns.dayEnd = { open: () => open({ auto: false }), morning: () => open({ auto: true }), pending, summary };
})();
