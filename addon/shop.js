// asaoffice shop: the Kas buys things. Click the 💰 chip in the HUD.
//   - Dekorasi: pieces for the garden and walls. Each purchase lands on a spot the server has checked to be free and out of the
//     way (tools/lib/shop.mjs), the layout is saved, and the new piece sparkles for a moment.
//   - Penampilan: an outfit colour or a title for a villager's face (kept in the data feed, so every view of the office shows it).
// The money is the office's Kas (dayend.js). Buying needs the Mac that runs the office; the layout editor must be closed.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      title: 'Toko', kas: 'Kas', tabDecor: '🌳 Dekorasi', tabLook: '👗 Penampilan', buy: 'Beli', wear: 'Pakai', worn: 'Dipakai', takeOff: 'Lepas',
      owned: (n, max) => `${n}/${max}`, garden: 'Taman', wall: 'Dinding', outfits: 'Warna baju', titles: 'Gelar',
      full: 'Penuh', noRoom: 'Tidak ada tempat kosong', poor: 'Kas kurang', original: 'Asli',
      names: { bench: 'Bangku taman', lantern: 'Lentera', tree: 'Pohon apel', bush: 'Semak beri', flowers: 'Bunga', scarecrow: 'Orang-orangan sawah', barrel: 'Tong kayu', crate: 'Peti panen', basket: 'Keranjang sayur', well: 'Sumur batu', pond: 'Kolam', painting: 'Lukisan', clock: 'Jam bandul', bookshelf: 'Rak buku' },
      outfitNames: { rose: 'Mawar', sunset: 'Senja', honey: 'Madu', moss: 'Lumut', mint: 'Mint', lagoon: 'Laguna', dusk: 'Fajar', plum: 'Plum' },
      bought: (n) => `${n} sudah terpasang!`, editMode: 'Tutup editor tata ruang dulu.',
      errors: { kas: 'Kas tidak cukup.', max: 'Sudah mentok jumlahnya.', room: 'Tidak ada tempat kosong yang aman buat barang ini.', layout: 'Layout kantor belum terpasang (npm run layout).', noApi: 'Belanja cuma bisa dari Mac yang menjalankan kantor.' },
      hint: 'Dekorasi dipasang otomatis di tempat kosong yang aman. Layout kantor bisa kamu atur lagi lewat editor.', lookHint: 'Pilih villager, lalu beli warna baju atau gelar. Yang sudah dibeli bisa dipakai dan dilepas gratis.',
      who: 'Villager',
    },
    en: {
      title: 'Shop', kas: 'Cash', tabDecor: '🌳 Décor', tabLook: '👗 Looks', buy: 'Buy', wear: 'Wear', worn: 'Wearing', takeOff: 'Take off',
      owned: (n, max) => `${n}/${max}`, garden: 'Garden', wall: 'Walls', outfits: 'Outfit colours', titles: 'Titles',
      full: 'Full', noRoom: 'No free spot', poor: 'Not enough cash', original: 'Original',
      names: { bench: 'Garden bench', lantern: 'Lantern', tree: 'Apple tree', bush: 'Berry bush', flowers: 'Flowers', scarecrow: 'Scarecrow', barrel: 'Oak barrel', crate: 'Harvest crate', basket: 'Veggie basket', well: 'Stone well', pond: 'Pond', painting: 'Painting', clock: 'Pendulum clock', bookshelf: 'Bookshelf' },
      outfitNames: { rose: 'Rose', sunset: 'Sunset', honey: 'Honey', moss: 'Moss', mint: 'Mint', lagoon: 'Lagoon', dusk: 'Dusk', plum: 'Plum' },
      bought: (n) => `${n} is in place!`, editMode: 'Close the layout editor first.',
      errors: { kas: 'Not enough cash.', max: 'Already at the limit.', room: 'There is no safe free spot for this.', layout: 'The office layout is not installed (npm run layout).', noApi: 'Shopping works only from the Mac that runs the office.' },
      hint: 'Décor is placed automatically on a free, safe spot. You can still rearrange the office in the layout editor.', lookHint: 'Pick a villager, then buy an outfit colour or a title. Whatever you own can be worn and taken off for free.',
      who: 'Villager',
    },
  });
  const locale = ns.lang === 'id' ? 'id-ID' : 'en-US';
  const g = (n) => `${Math.round(n).toLocaleString(locale)}g`;

  const css = `
  .asa-shop { display: flex; flex-direction: column; gap: 10px; }
  .asa-shop-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .asa-shop-kas { font-size: 17px; font-weight: 600; }
  .asa-shop-note { font-size: 13px; opacity: 0.75; }
  .asa-shop-sec { font-size: 13px; font-weight: 600; opacity: 0.8; margin-top: 4px; }
  .asa-shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .asa-shop-item { background: #fffbe9; border: 2px solid #c9a877; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
  .asa-shop-item .ic { font-size: 26px; line-height: 1; }
  .asa-shop-item b { font-weight: 600; font-size: 14px; }
  .asa-shop-item .meta { font-size: 12.5px; opacity: 0.75; }
  .asa-shop-item .asa-btn { margin-top: auto; }
  .asa-shop-item.done { opacity: 0.7; }
  .asa-shop-msg { font-size: 13.5px; min-height: 18px; }
  .asa-shop-msg.err { color: #973a2f; }
  .asa-shop-people { display: flex; gap: 6px; flex-wrap: wrap; }
  .asa-shop-person { display: flex; flex-direction: column; align-items: center; gap: 2px; background: #fffbe9; border: 2px solid #c9a877; padding: 4px 6px; cursor: pointer; font: inherit; font-size: 12.5px; color: inherit; min-width: 64px; }
  .asa-shop-person.on { border-color: #744122; box-shadow: 0 2px 0 #744122; background: #f9edc9; }
  .asa-shop-person .face { width: 36px; height: 36px; background-repeat: no-repeat; background-size: 252px 216px; background-position: -36px -4px; image-rendering: pixelated; }
  .asa-shop-swatch { width: 36px; height: 36px; background-repeat: no-repeat; background-size: 252px 216px; background-position: -36px -4px; image-rendering: pixelated; }
  `;
  let styled = false;
  const state = { tab: 'decor', person: 0, msg: null, shop: null, panel: null, pending: false };
  ns.shopState = state;

  async function load() {
    try { state.shop = await ns.localApi('GET', '/api/shop'); } catch { state.shop = null; }
    if (state.shop) ns.dayEnd?.setKas?.(state.shop.kas);
    return state.shop;
  }

  function staffName(p) {
    const m = (ns.data?.staff ?? []).find((x) => x.installed && !x.director && x.palette === p);
    return m?.name ?? ns.faceName(p);
  }

  async function post(body) {
    if (state.pending) return null;
    state.pending = true;
    try {
      const res = await ns.localApi('POST', '/api/shop/buy', body);
      return res;
    } catch (err) {
      state.msg = { err: true, text: S.errors[err.message] ?? S.errors[err.message === '409' ? 'kas' : 'noApi'] ?? String(err.message) };
      return null;
    } finally {
      state.pending = false;
    }
  }

  // ── Sparkles over a new piece ──
  const sparkles = []; // { col, row, w, h, until, born }
  ns.onFrame((canvas, office, offX, offY, zoom) => {
    if (!sparkles.length) return;
    const now = performance.now();
    const ctx = canvas.getContext('2d');
    const tile = 16 * zoom;
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      if (now > s.until) { sparkles.splice(i, 1); continue; }
      const t = (now - s.born) / 2800;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = '#ffe27a';
      ctx.lineWidth = Math.max(2, zoom);
      ctx.strokeRect(offX + s.col * tile - 2, offY + s.row * tile - 2, s.w * tile + 4, s.h * tile + 4);
      ctx.fillStyle = '#fff6c8';
      for (let k = 0; k < 7; k++) {
        const a = k * 0.9 + now / 380;
        const x = offX + (s.col + s.w / 2) * tile + Math.cos(a) * (s.w * tile * 0.55 + t * tile * 0.6);
        const y = offY + (s.row + s.h / 2) * tile + Math.sin(a * 1.3) * (s.h * tile * 0.55 + t * tile * 0.6) - t * tile;
        const r = Math.max(2, zoom * (1.6 - t));
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.restore();
    }
  });

  async function buyDecor(id) {
    if (ns.view?.editMode) { state.msg = { err: true, text: S.editMode }; return render(); }
    state.msg = null;
    const res = await post({ kind: 'decor', item: id });
    if (res?.ok) {
      try { ns.view?.office?.rebuildFromLayout(res.layout); } catch (err) { console.error('[asaoffice]', err); }
      const fp = res.shop.catalog[id] ?? { w: 1, h: 1 };
      sparkles.push({ col: res.piece.col, row: res.piece.row, w: fp.w, h: fp.h, born: performance.now(), until: performance.now() + 2800 });
      state.shop = { ...res.shop, kas: res.kas };
      ns.dayEnd?.setKas?.(res.kas);
      state.msg = { err: false, text: `✨ ${S.bought(S.names[id])}` };
    } else if (res === null && !state.msg) state.msg = { err: true, text: S.errors.noApi };
    render();
  }

  async function buyLook(kind, item) {
    state.msg = null;
    const res = await post({ kind, palette: state.person, item });
    if (res?.ok) {
      state.shop = { ...res.shop, kas: res.kas };
      ns.dayEnd?.setKas?.(res.kas);
      ns.refreshData?.();
    }
    render();
  }

  // ── Panel ──
  function decorTab(shop) {
    const wrap = h('div', { class: 'asa-shop' });
    for (const zone of ['garden', 'wall']) {
      wrap.append(h('div', { class: 'asa-shop-sec' }, S[zone]));
      const grid = h('div', { class: 'asa-shop-grid' });
      for (const [id, d] of Object.entries(shop.catalog)) {
        if (d.zone !== zone) continue;
        const n = shop.decor[id] ?? 0;
        const full = n >= d.max;
        const noRoom = !full && shop.room?.[id] === false;
        const poor = !full && !noRoom && shop.kas < d.price;
        const btn = h('button', { class: 'asa-btn primary', type: 'button', onclick: () => buyDecor(id) }, full ? S.full : noRoom ? S.noRoom : `${S.buy} · ${g(d.price)}`);
        btn.disabled = full || noRoom || poor || state.pending;
        if (poor) btn.title = S.poor;
        grid.append(h('div', { class: `asa-shop-item${full ? ' done' : ''}` },
          h('span', { class: 'ic' }, d.icon), h('b', {}, S.names[id] ?? id),
          h('span', { class: 'meta' }, `${g(d.price)} · ${S.owned(n, d.max)}`), btn));
      }
      wrap.append(grid);
    }
    wrap.append(h('div', { class: 'asa-shop-note' }, S.hint));
    return wrap;
  }

  function lookTab(shop) {
    const wrap = h('div', { class: 'asa-shop' });
    wrap.append(h('div', { class: 'asa-shop-note' }, S.lookHint));
    const people = h('div', { class: 'asa-shop-people' });
    for (let p = 0; p < ns.DIRECTOR_PALETTE; p++) {
      const hue = ns.data?.looks?.[String(p)]?.hue ?? 0;
      people.append(h('button', { class: `asa-shop-person${p === state.person ? ' on' : ''}`, type: 'button', onclick: () => { state.person = p; render(); } },
        h('span', { class: 'face', style: { backgroundImage: `url(${ns.portraitUrl({ palette: p })})`, filter: hue ? `hue-rotate(${hue}deg)` : '' } }),
        staffName(p)));
    }
    wrap.append(h('div', { class: 'asa-shop-sec' }, S.who), people);
    const mine = (book) => shop[book]?.[state.person] ?? { owned: [], worn: null };

    wrap.append(h('div', { class: 'asa-shop-sec' }, S.outfits));
    const grid = h('div', { class: 'asa-shop-grid' });
    const o = mine('outfits');
    const original = h('button', { class: 'asa-btn', type: 'button', onclick: () => buyLook('outfit', null) }, o.worn ? S.takeOff : S.worn);
    original.disabled = !o.worn || state.pending;
    grid.append(h('div', { class: `asa-shop-item${o.worn ? '' : ' done'}` }, h('span', { class: 'ic' }, '🧵'), h('b', {}, S.original), original));
    for (const [id, c] of Object.entries(shop.outfits_catalog)) {
      const has = o.owned.includes(id);
      const on = o.worn === id;
      const btn = h('button', { class: has ? 'asa-btn' : 'asa-btn primary', type: 'button', onclick: () => buyLook('outfit', id) }, on ? S.worn : has ? S.wear : `${S.buy} · ${g(c.price)}`);
      btn.disabled = on || state.pending || (!has && shop.kas < c.price);
      grid.append(h('div', { class: `asa-shop-item${on ? ' done' : ''}` },
        h('div', { class: 'asa-shop-swatch', style: { backgroundImage: `url(${ns.portraitUrl({ palette: state.person })})`, filter: `hue-rotate(${c.hue}deg)` } }), h('b', {}, S.outfitNames[id] ?? id), btn));
    }
    wrap.append(grid);

    wrap.append(h('div', { class: 'asa-shop-sec' }, S.titles));
    const tg = h('div', { class: 'asa-shop-grid' });
    const t = mine('titles');
    const none = h('button', { class: 'asa-btn', type: 'button', onclick: () => buyLook('title', null) }, t.worn ? S.takeOff : S.worn);
    none.disabled = !t.worn || state.pending;
    tg.append(h('div', { class: `asa-shop-item${t.worn ? '' : ' done'}` }, h('span', { class: 'ic' }, '—'), h('b', {}, staffName(state.person)), none));
    for (const [id, c] of Object.entries(shop.titles_catalog)) {
      const has = t.owned.includes(id);
      const on = t.worn === id;
      const btn = h('button', { class: has ? 'asa-btn' : 'asa-btn primary', type: 'button', onclick: () => buyLook('title', id) }, on ? S.worn : has ? S.wear : `${S.buy} · ${g(c.price)}`);
      btn.disabled = on || state.pending || (!has && shop.kas < c.price);
      tg.append(h('div', { class: `asa-shop-item${on ? ' done' : ''}` }, h('b', {}, `${ns.titleLabels?.[id] ?? id} ${staffName(state.person)}`), btn));
    }
    wrap.append(tg);
    return wrap;
  }

  function render() {
    const panel = state.panel;
    if (!panel) return;
    panel.body.replaceChildren();
    const shop = state.shop;
    if (!shop) { panel.body.append(h('div', { class: 'asa-shop-note' }, S.errors.noApi)); return; }
    const tabs = h('div', { class: 'asa-tabs' },
      ...[['decor', S.tabDecor], ['look', S.tabLook]].map(([k, label]) => h('button', { class: `asa-btn${state.tab === k ? ' on' : ''}`, type: 'button', onclick: () => { state.tab = k; state.msg = null; render(); } }, label)));
    panel.body.append(
      h('div', { class: 'asa-shop-top' }, tabs, h('span', { class: 'asa-shop-kas' }, `💰 ${g(shop.kas)}`)),
      h('div', { class: `asa-shop-msg${state.msg?.err ? ' err' : ''}` }, state.msg?.text ?? ''),
      state.tab === 'decor' ? decorTab(shop) : lookTab(shop));
  }

  async function open() {
    if (!styled) {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      styled = true;
    }
    state.msg = null;
    state.panel = ns.panel.open({ theme: 'cozy', dock: 'hud', title: `🛒 ${S.title}`, render: () => render(), onClose: () => { state.panel = null; } });
    state.panel.el.classList.add('asa-plain');
    await load();
    render();
  }

  ns.shop = { open };
})();
