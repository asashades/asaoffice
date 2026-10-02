// asaoffice camera lock (🔒 under the zoom buttons, on by default). While locked, the view stays
// centred (or top-aligned when the window is shorter than the office): clicking a villager selects it (and shows its card) without the camera chasing it, and
// trackpad scrolling / middle-drag don't pan. Zoom still works with +/− and pinch. The Layout editor
// is always free. Click 🔓 to get pixel-agents' original free camera back (remembered).
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const S = ns.t({
    id: { locked: 'Kamera terkunci — klik untuk bebas', free: 'Kamera bebas — klik untuk kunci' },
    en: { locked: 'Camera locked — click to unlock', free: 'Camera free — click to lock' },
  });

  let locked = ns.setting('camera', ['locked', 'free'], 'locked') === 'locked';
  const btn = ns.toolbarButton({ id: 'camera', title: '', onClick: () => setLocked(!locked) });
  function paint() {
    btn.textContent = locked ? '🔒' : '🔓';
    btn.title = locked ? S.locked : S.free;
    btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-pressed', String(locked));
  }
  function setLocked(on) {
    locked = on;
    ns.store.set('camera', on ? 'locked' : 'free');
    paint();
  }
  paint();

  const lockedHere = (e) => locked && !ns.view?.editMode && e.target === ns.view?.canvas;
  // pixel-agents pans on plain wheel/trackpad scroll and zooms on ctrl+wheel (pinch); keep only the zoom.
  window.addEventListener('wheel', (e) => {
    if (!lockedHere(e) || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
  }, { capture: true, passive: false });
  window.addEventListener('mousedown', (e) => {
    if (lockedHere(e) && e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
  // Selecting a villager sets cameraFollowId in pixel-agents' click handler; this bubble-phase
  // listener on window runs right after it, before the next frame can move the camera.
  window.addEventListener('click', (e) => {
    if (lockedHere(e) && ns.view.office.cameraFollowId !== null) ns.view.office.cameraFollowId = null;
  });

  ns.onFrame((canvas, office, offX, offY, zoom, editMode, panRef) => {
    if (!locked || editMode) return;
    if (office.cameraFollowId !== null) office.cameraFollowId = null;
    // The greeter's welcome camera chases the greeter, who starts outside now (bottom-left of the garden): don't follow.
    if (office.greeterCameraTarget) office.cancelGreeterCamera?.();
    const pan = panRef?.current;
    if (!pan) return;
    // Centred, unless the window is shorter than the office: then the top stays in view (the wall with the mailbox, boards
    // and bookshelves matters more than the bottom of the garden, and a locked camera can't be scrolled to reach it).
    const rect = canvas.getBoundingClientRect();
    const px = rect.width ? canvas.width / rect.width : 1; // device pixels per CSS pixel
    const margin = Math.round(6 * px);
    const height = office.getLayout().rows * 16 * zoom;
    const targetY = height > canvas.height - 2 * margin ? margin - (canvas.height - height) / 2 : 0;
    if (pan.x === 0 && Math.abs(pan.y - targetY) < 0.5) return;
    // Glide there (after unlocking-then-locking, or leftovers from the greeter camera).
    const x = pan.x * 0.8;
    const y = targetY + (pan.y - targetY) * 0.8;
    panRef.current = { x: Math.abs(x) < 0.5 ? 0 : x, y: Math.abs(y - targetY) < 0.5 ? targetY : y };
  });
})();
