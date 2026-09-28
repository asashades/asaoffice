// asaoffice addon core: shared plumbing for the office add-ons (idle chat, villager card, calendar,
// Holo-board). Loaded first.
//   - frame hook: the bundle patch calls __asaoffice.afterRender(canvas, office, offX, offY, zoom, editMode, panRef)
//     after each frame; add-ons subscribe with __asaoffice.onFrame(fn). panRef.current is the camera pan.
//   - toolbar: __asaoffice.toolbarButton({ id, title, onClick }) adds a button under the zoom buttons.
//   - furniture clicks: __asaoffice.onFurnitureClick('COZY_CALENDAR', fn) fires when that item is clicked.
//   - panels: __asaoffice.panel.open({ theme, title, render }) shows one modal panel at a time.
//   - data: __asaoffice.fetchData() reads the JSON that `npm run office` writes (calendar + stats).
(() => {
  'use strict';
  const ns = (window.__asaoffice = window.__asaoffice || {});

  // ── Settings (URL param wins and is remembered; localStorage may be unavailable) ──
  ns.store = {
    get(key) {
      try { return localStorage.getItem(`asaoffice.${key}`); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(`asaoffice.${key}`, value); } catch { /* private mode */ }
    },
  };
  ns.setting = (key, allowed, fallback) => {
    let fromUrl = null;
    try { fromUrl = new URLSearchParams(location.search).get(key); } catch { /* ignore */ }
    if (allowed.includes(fromUrl)) {
      ns.store.set(key, fromUrl);
      return fromUrl;
    }
    const saved = ns.store.get(key);
    return allowed.includes(saved) ? saved : fallback;
  };
  ns.lang = ns.setting('chatLang', ['id', 'en'], 'id');
  ns.t = (strings) => strings[ns.lang] ?? strings.en;
  ns.VILLAGERS = ['Asa', 'Rowan', 'Clem', 'Theo', 'Mabel', 'Juno'];
  ns.villagerName = (ch) => ns.VILLAGERS[(ch?.palette ?? 0) % ns.VILLAGERS.length];

  // ── Frame hook ──
  const frameHandlers = [];
  ns.onFrame = (fn) => frameHandlers.push(fn);
  ns.view = null;
  ns.afterRender = (canvas, office, offX, offY, zoom, editMode, panRef) => {
    ns.view = { canvas, office, offX, offY, zoom, editMode, panRef };
    attachCanvas(canvas);
    placeToolbar();
    for (const fn of frameHandlers) {
      try { fn(canvas, office, offX, offY, zoom, editMode); } catch (err) { console.error('[asaoffice]', err); }
    }
  };

  // ── Furniture clicks ──
  // Footprints of the clickable items (tiles, from their manifests). Wall items are anchored at their top-left.
  const FOOTPRINT = { COZY_CALENDAR: [1, 2], COZY_HOLOBOARD: [2, 2], COZY_TASKBOARD: [2, 2], COZY_CLOCK: [1, 2] };
  const clickHandlers = new Map();
  ns.onFurnitureClick = (type, fn) => clickHandlers.set(type, fn);
  ns.findFurniture = (type) => (ns.view?.office?.getLayout?.().furniture ?? []).filter((f) => f.type === type);
  ns.toScreen = (worldX, worldY) => {
    const v = ns.view;
    return { x: v.offX + worldX * v.zoom, y: v.offY + worldY * v.zoom };
  };

  function pointToWorld(canvas, clientX, clientY) {
    const v = ns.view;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    return {
      x: ((clientX - rect.left) * scale - v.offX) / v.zoom,
      y: ((clientY - rect.top) * scale - v.offY) / v.zoom,
    };
  }

  function furnitureAt(canvas, clientX, clientY) {
    const v = ns.view;
    if (!v?.office || v.editMode || clickHandlers.size === 0) return null;
    const w = pointToWorld(canvas, clientX, clientY);
    if (v.office.getCharacterAt?.(w.x, w.y) != null) return null; // villagers keep their own click
    const col = Math.floor(w.x / 16);
    const row = Math.floor(w.y / 16);
    for (const f of v.office.getLayout().furniture) {
      const fp = FOOTPRINT[f.type];
      if (!fp || !clickHandlers.has(f.type)) continue;
      if (col >= f.col && col < f.col + fp[0] && row >= f.row && row < f.row + fp[1]) return f;
    }
    return null;
  }

  let attached = null;
  let pointerSet = false;
  function attachCanvas(canvas) {
    if (attached === canvas) return;
    attached = canvas;
    canvas.addEventListener('click', (e) => {
      const f = furnitureAt(canvas, e.clientX, e.clientY);
      if (f) clickHandlers.get(f.type)(f);
    });
    canvas.addEventListener('mousemove', (e) => {
      const over = !!furnitureAt(canvas, e.clientX, e.clientY);
      if (over) { canvas.style.cursor = 'pointer'; pointerSet = true; }
      else if (pointerSet) { canvas.style.cursor = ''; pointerSet = false; }
    });
  }

  // ── Data written by `npm run office` (asaoffice/data/<sha256(token)[:32]>.json) ──
  let dataCache = { at: 0, promise: null };
  async function dataUrl() {
    const token = new URLSearchParams(location.search).get('token');
    if (!token || !crypto?.subtle) return null;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `./asaoffice/data/${hex.slice(0, 32)}.json`;
  }
  ns.fetchData = (maxAgeMs = 30_000) => {
    if (dataCache.promise && Date.now() - dataCache.at < maxAgeMs) return dataCache.promise;
    dataCache = {
      at: Date.now(),
      promise: (async () => {
        const url = await dataUrl();
        if (!url) return null;
        const res = await fetch(url, { cache: 'no-store' });
        return res.ok ? res.json() : null;
      })().catch(() => null),
    };
    return dataCache.promise;
  };

  // ── Panels ──
  const css = `
  .asa-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center;
    background: rgba(20, 12, 6, 0.35); padding: 16px; box-sizing: border-box; }
  .asa-panel { font-family: "FS Pixel Sans", sans-serif; max-width: min(560px, 100%); max-height: calc(100vh - 32px);
    width: 100%; overflow: auto; box-sizing: border-box; position: relative; line-height: 1.35; }
  .asa-panel * { box-sizing: border-box; }
  .asa-panel h2 { margin: 0; font-size: 20px; font-weight: normal; }
  .asa-close { position: absolute; top: 8px; right: 10px; background: none; border: 0; font: inherit; font-size: 22px;
    cursor: pointer; color: inherit; line-height: 1; padding: 4px 8px; }
  .asa-cozy { background: #f4e6c4; color: #3a2117; border: 4px solid #744122; box-shadow: inset 0 0 0 3px #dca05f,
    0 6px 0 rgba(0,0,0,0.25); padding: 18px 18px 16px; }
  .asa-cozy .asa-head { background: #c07f43; color: #fff6dc; margin: -18px -18px 14px; padding: 10px 44px 10px 18px;
    border-bottom: 3px solid #744122; }
  .asa-holo { background: rgba(8, 26, 38, 0.94); color: #c9fbff; border: 2px solid #5ff3ff; padding: 18px;
    box-shadow: 0 0 24px rgba(95, 243, 255, 0.35), inset 0 0 30px rgba(95, 243, 255, 0.08);
    background-image: repeating-linear-gradient(0deg, rgba(95,243,255,0.05) 0 1px, transparent 1px 3px); }
  .asa-holo .asa-head { color: #5ff3ff; margin-bottom: 14px; padding-right: 36px; text-shadow: 0 0 8px rgba(95,243,255,0.7); }
  .asa-muted { opacity: 0.7; font-size: 13px; }
  `;
  let styled = false;
  let current = null;
  ns.panel = {
    /** opts: { theme: 'cozy' | 'holo', title, render(body, panel) } → returns { el, body, close, rerender } */
    open(opts) {
      ns.panel.close();
      if (!styled) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        styled = true;
      }
      const backdrop = document.createElement('div');
      backdrop.className = 'asa-backdrop';
      const el = document.createElement('div');
      el.className = `asa-panel asa-${opts.theme ?? 'cozy'}`;
      el.setAttribute('role', 'dialog');
      const head = document.createElement('div');
      head.className = 'asa-head';
      const title = document.createElement('h2');
      title.textContent = opts.title;
      head.appendChild(title);
      const close = document.createElement('button');
      close.className = 'asa-close';
      close.setAttribute('aria-label', 'Close');
      close.textContent = '×';
      const body = document.createElement('div');
      el.append(head, close, body);
      backdrop.appendChild(el);
      document.body.appendChild(backdrop);
      const panel = {
        el, body, title,
        close: () => ns.panel.close(),
        rerender: () => { body.replaceChildren(); opts.render(body, panel); },
      };
      close.onclick = panel.close;
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) panel.close(); });
      current = { backdrop, panel, onKey: (e) => { if (e.key === 'Escape') panel.close(); }, onClose: opts.onClose };
      window.addEventListener('keydown', current.onKey);
      panel.rerender();
      return panel;
    },
    close() {
      if (!current) return;
      const { backdrop, onKey, onClose } = current;
      current = null;
      window.removeEventListener('keydown', onKey);
      backdrop.remove();
      onClose?.();
    },
    get isOpen() { return !!current; },
  };

  // ── Toolbar: our buttons sit under pixel-agents' zoom buttons and borrow their look ──
  const toolbar = [];
  ns.toolbarButton = ({ id, title, onClick }) => {
    const btn = document.createElement('button');
    btn.id = `asa-tb-${id}`;
    btn.type = 'button';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(btn); });
    toolbar.push(btn);
    return btn;
  };
  let lastPlace = 0;
  function placeToolbar() {
    if (toolbar.length === 0 || performance.now() - lastPlace < 1000) return;
    lastPlace = performance.now();
    // pixel-agents' zoom buttons are SVG icons titled "Zoom in/out (Ctrl+Scroll)".
    const zoomOut = document.querySelector('button[title^="Zoom out"]');
    if (!zoomOut) return;
    const r = zoomOut.getBoundingClientRect();
    toolbar.forEach((btn, i) => {
      if (!btn.isConnected) document.body.appendChild(btn);
      btn.className = zoomOut.className; // same pixel look as the zoom buttons
      Object.assign(btn.style, {
        position: 'fixed', left: `${r.left}px`, top: `${r.bottom + 8 + i * (r.height + 8)}px`,
        width: `${r.width}px`, height: `${r.height}px`, zIndex: 50, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '18px', padding: 0,
      });
    });
  }

  // Tiny DOM helper: h('div', { class: 'x', style: {...} }, ...children)
  ns.h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs ?? {})) {
      if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
    return el;
  };

  // Keep ns.data fresh for things drawn every frame (calendar badge, Holo-board screen).
  ns.data = null;
  let lastRefresh = -Infinity;
  ns.refreshData = () => {
    lastRefresh = performance.now();
    return ns.fetchData(0).then((d) => { if (d) ns.data = d; return ns.data; });
  };

  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (editMode && current) ns.panel.close(); // the layout editor takes over the canvas
    for (const btn of toolbar) btn.style.visibility = editMode ? 'hidden' : '';
    if (performance.now() - lastRefresh > 60_000) ns.refreshData();
  });
})();
