// asaoffice notifications (🔔 under the zoom buttons). When a villager needs your permission, or
// finishes a turn it worked on for a while, you get a toast in the office (click it to select the
// villager), a little retro chime, a system notification if the office window isn't in front, and a
// vibration on phones that support it. Click 🔔 to turn it all off (🔕); turning it on asks the
// browser for notification permission.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      on: 'Notifikasi nyala — klik untuk matikan', off: 'Notifikasi mati — klik untuk nyalakan',
      permission: (n) => `${n} butuh izinmu`, done: (n) => `${n} selesai bekerja`,
      permissionBody: 'Buka kantor untuk menyetujui.', doneBody: 'Giliranmu membalas.',
    },
    en: {
      on: 'Notifications on — click to mute', off: 'Notifications off — click to turn on',
      permission: (n) => `${n} needs your permission`, done: (n) => `${n} finished working`,
      permissionBody: 'Open the office to approve.', doneBody: 'Your turn to reply.',
    },
  });
  const MIN_ACTIVE_MS = 8000; // don't announce very short turns
  const COOLDOWN_MS = 5000; // per villager and kind

  let enabled = ns.setting('notify', ['on', 'off'], 'on') === 'on';
  const btn = ns.toolbarButton({ id: 'notify', title: '', onClick: toggle });
  function paint() {
    btn.textContent = enabled ? '🔔' : '🔕';
    btn.title = enabled ? S.on : S.off;
    btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-pressed', String(enabled));
  }
  function toggle() {
    enabled = !enabled;
    ns.store.set('notify', enabled ? 'on' : 'off');
    paint();
    if (enabled) {
      unlockAudio();
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
      chime('done');
    }
  }
  paint();

  // ── Sound (WebAudio; browsers only allow it after the page has been clicked or tapped) ──
  let audio = null;
  function unlockAudio() {
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch { /* no audio */ }
  }
  window.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  window.addEventListener('keydown', unlockAudio, { once: true, capture: true });
  function chime(kind) {
    if (!audio || audio.state !== 'running') return;
    const notes = kind === 'permission' ? [[1318.5, 0], [1046.5, 0.16]] : [[523.3, 0], [659.3, 0.08], [784, 0.16], [1046.5, 0.24]];
    const wave = kind === 'permission' ? 'square' : 'triangle';
    const t0 = audio.currentTime + 0.01;
    for (const [freq, at] of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + at);
      gain.gain.exponentialRampToValueAtTime(kind === 'permission' ? 0.05 : 0.09, t0 + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.22);
      osc.connect(gain).connect(audio.destination);
      osc.start(t0 + at);
      osc.stop(t0 + at + 0.25);
    }
  }

  // ── Toasts ──
  const css = `
  .asa-toasts { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 950; display: flex;
    flex-direction: column; gap: 6px; align-items: center; pointer-events: none; max-width: calc(100vw - 24px); }
  .asa-toast { pointer-events: auto; cursor: pointer; font-family: "FS Pixel Sans", sans-serif; font-size: 14px;
    background: #f4e6c4; color: #3a2117; border: 3px solid #744122; box-shadow: inset 0 0 0 2px #dca05f, 0 4px 0 rgba(0,0,0,0.25);
    padding: 8px 14px; display: flex; gap: 8px; align-items: center; animation: asa-toast-in 0.25s ease-out; }
  .asa-toast.permission { border-color: #b8453b; }
  .asa-toast small { opacity: 0.7; }
  @keyframes asa-toast-in { from { transform: translateY(-12px); opacity: 0; } to { transform: none; opacity: 1; } }
  `;
  let box = null;
  function toast(kind, ch, title, icon) {
    if (!box) {
      document.head.appendChild(h('style', {}, css));
      box = h('div', { class: 'asa-toasts', 'aria-live': 'polite' });
      document.body.appendChild(box);
    }
    const el = h('div', { class: `asa-toast ${kind}`, role: 'status' }, icon ?? (kind === 'permission' ? '✋' : '✅'), h('div', {}, title, ch?.folderName ? h('small', {}, ` · ${ch.folderName}`) : null));
    el.onclick = () => { if (ch) select(ch.id); el.remove(); };
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.remove(), kind === 'permission' ? 12000 : 6000);
  }
  function select(id) {
    const office = ns.view?.office;
    if (office?.characters.has(id)) office.selectedAgentId = id;
  }

  function systemNotify(kind, ch, title) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!document.hidden && document.hasFocus()) return; // the toast is enough when you're looking
    try {
      const n = new Notification(title, {
        body: kind === 'permission' ? S.permissionBody : S.doneBody,
        tag: `asaoffice-${ch.id}-${kind}`,
        icon: `./assets/characters/char_${(ch.palette ?? 0) % 6}.png`,
      });
      n.onclick = () => { window.focus(); select(ch.id); n.close(); };
    } catch { /* e.g. mobile browsers that only allow notifications from a service worker */ }
  }

  function announce(kind, ch) {
    const name = ns.villagerName(ch);
    const title = kind === 'permission' ? S.permission(name) : S.done(name);
    toast(kind, ch, title);
    chime(kind);
    systemNotify(kind, ch, title);
    if (kind === 'permission') navigator.vibrate?.([80, 40, 80]);
  }

  // ── Watch villagers for transitions ──
  const seen = new Map(); // id -> { active, activeSince, permission, last: { permission, done } }
  ns.onFrame((canvas, office) => {
    const now = Date.now();
    for (const ch of office.characters.values()) {
      if (ch.isSubagent) continue;
      const permission = ch.bubbleType === 'permission';
      let s = seen.get(ch.id);
      if (!s) {
        // First sighting (page load or new session): remember the state quietly.
        seen.set(ch.id, { active: ch.isActive, activeSince: ch.isActive ? now : null, permission, last: {} });
        continue;
      }
      const fire = (kind) => {
        if (!enabled || now - (s.last[kind] ?? 0) < COOLDOWN_MS) return;
        s.last[kind] = now;
        announce(kind, ch);
      };
      if (permission && !s.permission) fire('permission');
      if (ch.isActive && !s.active) s.activeSince = now;
      if (!ch.isActive && s.active && s.activeSince && now - s.activeSince >= MIN_ACTIVE_MS && !permission) fire('done');
      s.active = ch.isActive;
      s.permission = permission;
    }
    for (const id of seen.keys()) if (!office.characters.has(id)) seen.delete(id);
  });

  ns.notify = {
    test: (kind = 'permission') => { const ch = ns.view?.office?.characters.values().next().value; if (ch) announce(kind, ch); },
    /** Office-wide message (e.g. the Pomodoro timer): toast + chime + system notification, muted by 🔕. */
    message({ icon, title, body = '', kind = 'done' }) {
      if (!enabled) return;
      toast(kind, null, title, icon);
      chime(kind);
      navigator.vibrate?.([60, 40, 60]);
      if (!('Notification' in window) || Notification.permission !== 'granted' || (!document.hidden && document.hasFocus())) return;
      try {
        const n = new Notification(title, { body, tag: `asaoffice-${title}` });
        n.onclick = () => { window.focus(); n.close(); };
      } catch { /* service-worker-only browsers */ }
    },
  };
})();
