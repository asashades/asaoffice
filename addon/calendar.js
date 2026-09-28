// asaoffice calendar: click the wall calendar to open a Stardew-style month view with your macOS
// Calendar events (read by `npm run office`, see tools/lib/office-data.mjs). A small badge on the
// calendar shows how many events are on today.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Kalender', today: 'Hari ini', allDay: 'Sepanjang hari', noEvents: 'Tidak ada acara.', more: (n) => `+${n} lagi`,
      weekdays: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
      seasons: ['Musim Dingin', 'Musim Semi', 'Musim Panas', 'Musim Gugur'],
      updated: 'Diperbarui', outOfRange: 'Acara hanya dimuat untuk bulan lalu sampai 2 bulan ke depan.',
      status: {
        nodata: 'Data kalender belum ada. Jalankan kantor lewat `npm run office`, lalu tunggu sebentar.',
        loading: 'Memuat kalender Mac…',
        notDetermined: 'macOS belum memberi izin. Lihat Terminal tempat `npm run office` jalan dan klik Izinkan.',
        denied: 'Akses Kalender ditolak. Buka System Settings → Privasi & Keamanan → Kalender, izinkan Terminal (Akses Penuh), lalu restart office.',
        restricted: 'Akses Kalender dibatasi oleh pengaturan Mac ini.',
        writeOnly: 'Terminal cuma punya akses tulis. Ubah ke Akses Penuh di System Settings → Privasi & Keamanan → Kalender.',
        off: 'Kalender Mac dimatikan (OFFICE_CALENDAR=off).',
        unsupported: 'Acara Kalender hanya tersedia di macOS.',
        error: 'Gagal membaca Kalender Mac.',
      },
    },
    en: {
      title: 'Calendar', today: 'Today', allDay: 'All day', noEvents: 'No events.', more: (n) => `+${n} more`,
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      seasons: ['Winter', 'Spring', 'Summer', 'Fall'],
      updated: 'Updated', outOfRange: 'Events are loaded from last month to 2 months ahead.',
      status: {
        nodata: 'No calendar data yet. Start the office with `npm run office` and give it a moment.',
        loading: 'Loading your Mac calendar…',
        notDetermined: 'macOS has not granted access yet. Check the Terminal running `npm run office` and click Allow.',
        denied: 'Calendar access was denied. Open System Settings → Privacy & Security → Calendars, give Terminal Full Access, then restart the office.',
        restricted: 'Calendar access is restricted on this Mac.',
        writeOnly: 'Terminal only has write access. Switch it to Full Access in System Settings → Privacy & Security → Calendars.',
        off: 'Mac calendar is turned off (OFFICE_CALENDAR=off).',
        unsupported: 'Calendar events are only available on macOS.',
        error: 'Could not read the Mac calendar.',
      },
    },
  });
  const locale = ns.lang === 'id' ? 'id-ID' : 'en-US';

  const css = `
  .asa-cal-nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
  .asa-cal-nav button, .asa-cal-today { font: inherit; background: #dca05f; color: #3a2117; border: 2px solid #744122;
    padding: 2px 10px; cursor: pointer; }
  .asa-cal-month { text-align: center; }
  .asa-cal-month small { display: block; font-size: 12px; opacity: 0.7; }
  .asa-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
  .asa-cal-wd { text-align: center; font-size: 12px; opacity: 0.7; padding-bottom: 2px; }
  .asa-cal-day { min-height: 58px; background: #fff6dc; border: 2px solid #d9c49a; padding: 2px 3px; cursor: pointer;
    overflow: hidden; text-align: left; font: inherit; color: inherit; display: flex; flex-direction: column; gap: 1px; }
  .asa-cal-day.other { opacity: 0.4; }
  .asa-cal-day.today { border-color: #e8c04a; background: #fff0b8; }
  .asa-cal-day.sel { outline: 2px solid #744122; outline-offset: -2px; }
  .asa-cal-num { font-size: 13px; }
  .asa-cal-day.sun .asa-cal-num { color: #b8453b; }
  .asa-cal-chip { font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-left: 3px;
    border-left: 3px solid #744122; background: rgba(116, 65, 34, 0.08); }
  .asa-cal-more { font-size: 10px; opacity: 0.7; }
  .asa-cal-list { margin-top: 12px; border-top: 2px solid #c07f43; padding-top: 8px; }
  .asa-cal-list h3 { font-size: 15px; font-weight: normal; margin: 0 0 6px; }
  .asa-cal-ev { display: flex; gap: 8px; font-size: 13px; padding: 4px 0; border-bottom: 1px dashed #c9a877; }
  .asa-cal-ev time { flex: none; width: 92px; opacity: 0.8; }
  .asa-cal-ev i { flex: none; width: 10px; height: 10px; margin-top: 3px; }
  .asa-cal-ev small { display: block; opacity: 0.6; font-size: 11px; }
  .asa-cal-note { margin-top: 10px; font-size: 13px; background: #fff0b8; border: 2px dashed #c07f43; padding: 8px; }
  @media (max-width: 480px) { .asa-cal-chip { display: none; } .asa-cal-day { min-height: 44px; } }
  `;

  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  /** Map of dayKey -> events overlapping that local day. */
  function byDay(events) {
    const map = new Map();
    for (const ev of events ?? []) {
      const start = new Date(ev.start);
      const end = new Date(ev.end);
      const last = new Date(Math.max(start.getTime(), end.getTime() - 1)); // end is exclusive
      for (let d = startOfDay(start); d <= last; d.setDate(d.getDate() + 1)) {
        const k = dayKey(d);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(ev);
      }
    }
    return map;
  }

  const season = (month) => S.seasons[Math.floor(((month + 1) % 12) / 3)];
  const timeFmt = (d) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  function open() {
    if (!document.getElementById('asa-cal-css')) document.head.appendChild(h('style', { id: 'asa-cal-css' }, css));
    const now = new Date();
    const state = { year: now.getFullYear(), month: now.getMonth(), selected: startOfDay(now), data: ns.data };
    const panel = ns.panel.open({ theme: 'cozy', title: S.title, render: (body, p) => render(body, state, p) });
    ns.refreshData().then((d) => { state.data = d; panel.rerender(); });
  }

  function render(body, state, panel) {
    const cal = state.data?.calendar;
    const days = byDay(cal?.status === 'ok' ? cal.events : []);
    const today = startOfDay(new Date());
    const first = new Date(state.year, state.month, 1);
    const gridStart = new Date(first);
    gridStart.setDate(1 - ((first.getDay() + 6) % 7)); // weeks start on Monday
    const go = (delta) => {
      const d = new Date(state.year, state.month + delta, 1);
      state.year = d.getFullYear();
      state.month = d.getMonth();
      panel.rerender();
    };

    const monthLabel = first.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    body.append(
      h(
        'div',
        { class: 'asa-cal-nav' },
        h('button', { onclick: () => go(-1), 'aria-label': 'Previous month' }, '◀'),
        h('div', { class: 'asa-cal-month' }, monthLabel, h('small', {}, season(state.month))),
        h('button', { onclick: () => go(1), 'aria-label': 'Next month' }, '▶'),
      ),
    );

    const grid = h('div', { class: 'asa-cal-grid' }, S.weekdays.map((w) => h('div', { class: 'asa-cal-wd' }, w)));
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      if (i === 35 && d.getMonth() !== state.month) break; // 5 weeks were enough
      const evs = days.get(dayKey(d)) ?? [];
      const cls = ['asa-cal-day'];
      if (d.getMonth() !== state.month) cls.push('other');
      if (d.getTime() === today.getTime()) cls.push('today');
      if (d.getTime() === state.selected.getTime()) cls.push('sel');
      if (d.getDay() === 0) cls.push('sun');
      const cell = h(
        'button',
        { class: cls.join(' '), onclick: () => { state.selected = d; panel.rerender(); } },
        h('span', { class: 'asa-cal-num' }, d.getDate()),
        evs.slice(0, 2).map((ev) => h('span', { class: 'asa-cal-chip', style: { borderLeftColor: ev.color || '#744122' } }, ev.title)),
        evs.length > 2 ? h('span', { class: 'asa-cal-more' }, S.more(evs.length - 2)) : null,
      );
      grid.append(cell);
    }
    body.append(grid);

    // Agenda for the selected day
    const evs = days.get(dayKey(state.selected)) ?? [];
    const list = h(
      'div',
      { class: 'asa-cal-list' },
      h('h3', {}, state.selected.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })),
    );
    if (evs.length === 0) list.append(h('div', { class: 'asa-muted' }, S.noEvents));
    for (const ev of evs) {
      const start = new Date(ev.start);
      const end = new Date(ev.end);
      list.append(
        h(
          'div',
          { class: 'asa-cal-ev' },
          h('i', { style: { background: ev.color || '#744122' } }),
          h('time', {}, ev.allDay ? S.allDay : `${timeFmt(start)}–${timeFmt(end)}`),
          h('div', {}, ev.title, ev.calendar ? h('small', {}, ev.calendar) : null),
        ),
      );
    }
    body.append(list);

    // Status / range notes
    const status = !state.data ? 'nodata' : cal?.status ?? 'nodata';
    if (status !== 'ok') {
      body.append(
        h('div', { class: 'asa-cal-note' }, S.status[status] ?? S.status.error, cal?.message ? h('div', { class: 'asa-muted' }, cal.message) : null),
      );
    }
    else if (cal.range && (first < new Date(cal.range.start) || first >= new Date(cal.range.end))) {
      body.append(h('div', { class: 'asa-cal-note' }, S.outOfRange));
    }
    if (cal?.updatedAt) {
      body.append(h('div', { class: 'asa-muted', style: { marginTop: '8px' } }, `${S.updated} ${timeFmt(new Date(cal.updatedAt))}`));
    }
  }

  ns.onFurnitureClick('COZY_CALENDAR', open);

  // Today's event count as a little badge on the calendar sprite.
  const badge = { data: null, day: null, count: 0 };
  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    const cal = ns.data?.calendar;
    if (editMode || cal?.status !== 'ok') return;
    const today = dayKey(new Date());
    if (badge.data !== ns.data || badge.day !== today) {
      Object.assign(badge, { data: ns.data, day: today, count: byDay(cal.events).get(today)?.length ?? 0 });
    }
    const count = badge.count;
    if (!count) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const f of ns.findFurniture('COZY_CALENDAR')) {
      const x = offX + (f.col * 16 + 13) * zoom;
      const y = offY + (f.row * 16 + 5) * zoom;
      const r = 4.5 * zoom;
      ctx.fillStyle = '#c8503c';
      ctx.strokeStyle = '#fff6dc';
      ctx.lineWidth = Math.max(1, zoom * 0.8);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff6dc';
      ctx.font = `${Math.round(6.5 * zoom)}px "FS Pixel Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(count > 9 ? '9+' : String(count), x, y + zoom * 0.5);
    }
    ctx.restore();
  });
})();
