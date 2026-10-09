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
    ns.localApi?.('POST', '/api/settings', { notifyMac: enabled }).catch(() => {}); // the office's own macOS notifications follow the bell
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

  /** Short sound effects for the mailbox (all synthesised, muted by 🔕): send (whoosh), pickup, drop (letter lands), plan. */
  function sfx(name) {
    if (!enabled) return;
    unlockAudio();
    if (!audio || audio.state !== 'running') return;
    const t0 = audio.currentTime + 0.01;
    const env = (gain, peak, at, len) => {
      gain.gain.setValueAtTime(0.0001, t0 + at);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
    };
    const tone = (type, from, to, at, len, peak) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, t0 + at);
      osc.frequency.exponentialRampToValueAtTime(to, t0 + at + len);
      env(gain, peak, at, len);
      osc.connect(gain).connect(audio.destination);
      osc.start(t0 + at);
      osc.stop(t0 + at + len + 0.05);
    };
    if (name === 'send') { // a paper-plane whoosh: filtered noise sweeping up
      const len = 0.5;
      const buf = audio.createBuffer(1, Math.floor(audio.sampleRate * len), audio.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      src.buffer = buf;
      filter.type = 'bandpass';
      filter.Q.value = 2.5;
      filter.frequency.setValueAtTime(500, t0);
      filter.frequency.exponentialRampToValueAtTime(3200, t0 + len);
      env(gain, 0.12, 0, len);
      src.connect(filter).connect(gain).connect(audio.destination);
      src.start(t0);
    } else if (name === 'drop') { // the letter drops into the mailbox: thunk, then a little ting
      tone('sine', 190, 70, 0, 0.16, 0.18);
      tone('triangle', 1174.7, 1174.7, 0.1, 0.22, 0.07);
    } else if (name === 'pickup') {
      tone('square', 660, 660, 0, 0.08, 0.03);
      tone('square', 880, 880, 0.09, 0.1, 0.03);
    } else if (name === 'coin') { // a coin: two quick bright pings
      tone('square', 1318.5, 1318.5, 0, 0.06, 0.025);
      tone('square', 1760, 1760, 0.06, 0.12, 0.025);
    } else if (name === 'plan') {
      tone('triangle', 523.3, 523.3, 0, 0.16, 0.07);
      tone('triangle', 784, 784, 0.14, 0.24, 0.07);
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
  /** Where a click on a toast or system notification goes: the chat of the task or session (in the mailbox), else the villager itself. */
  function openFor(ch) {
    const letter = ns.data?.taskAgents?.[ch.id]?.letter;
    const session = ns.data?.agentSessions?.[ch.id];
    if (ns.mailbox && letter) return ns.mailbox.openLetter(letter);
    if (ns.mailbox && session && (ns.data?.sessions ?? []).some((x) => x.id === session)) return ns.mailbox.openLetter(`session:${session}`);
    select(ch.id);
  }
  function toast(kind, ch, title, icon, onOpen) {
    // With the HUD on, notices come out of its left column (under the permission cards); the old top-centre toast is the fallback.
    if (ns.hud?.notice && !ns.hud.hidden && ns.hud.notice({ kind, icon: icon ?? (kind === 'permission' ? '✋' : '✅'), title, body: ch?.folderName ?? '', onOpen: onOpen ?? (ch ? () => openFor(ch) : null), ms: kind === 'permission' ? 15_000 : 10_000 })) return;
    if (!box) {
      document.head.appendChild(h('style', {}, css));
      box = h('div', { class: 'asa-toasts', 'aria-live': 'polite' });
      document.body.appendChild(box);
    }
    const el = h('div', { class: `asa-toast ${kind}`, role: 'status' }, icon ?? (kind === 'permission' ? '✋' : '✅'), h('div', {}, title, ch?.folderName ? h('small', {}, ` · ${ch.folderName}`) : null));
    el.onclick = () => { if (onOpen) onOpen(); else if (ch) openFor(ch); el.remove(); };
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
    if (ns.nativeNotify && ns.data?.taskAgents?.[ch.id]) return; // a mailbox task: the office's macOS notification already covers it
    if (!document.hidden && document.hasFocus()) return; // the toast is enough when you're looking
    try {
      const n = new Notification(title, {
        body: kind === 'permission' ? S.permissionBody : S.doneBody,
        tag: `asaoffice-${ch.id}-${kind}`,
        icon: ns.portraitUrl?.(ch),
      });
      n.onclick = () => { window.focus(); openFor(ch); n.close(); };
    } catch { /* e.g. mobile browsers that only allow notifications from a service worker */ }
  }

  function announce(kind, ch) {
    if (kind === 'done' && ns.mailbox && ns.data?.taskAgents?.[ch.id]?.letter) return; // a mailbox task: the mailbox announces it itself (one toast, which opens its chat)
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
      if (ch.isSubagent || ch.asaNpc) continue; // the office's own cast (director.js) isn't a session
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

  // Tell the office whether this page is in front (it then holds back its macOS notifications), and learn whether those are on.
  // A bell that was muted before this page opened is passed on once, so the office doesn't notify against your choice.
  let synced = false;
  const beat = () => {
    if (!ns.data?.taskServer?.port) return;
    if (!synced && !enabled) { synced = true; ns.localApi('POST', '/api/settings', { notifyMac: false }).catch(() => { synced = false; }); }
    ns.localApi('POST', '/api/presence', { focused: document.hasFocus() && !document.hidden }).then((r) => { ns.nativeNotify = !!r.native; }).catch(() => {});
  };
  setInterval(beat, 5000);
  setTimeout(beat, 2500);

  ns.notify = {
    sfx,
    get enabled() { return enabled; },
    test: (kind = 'permission') => { const ch = ns.view?.office?.characters.values().next().value; if (ch) announce(kind, ch); },
    /** Office-wide message (e.g. the Pomodoro timer): toast + chime + system notification, muted by 🔕. */
    message({ icon, title, body = '', kind = 'done', letter = null, onOpen = null }) {
      if (!enabled) return;
      toast(kind, null, title, icon, onOpen ?? (letter && ns.mailbox ? () => ns.mailbox.openLetter(letter) : null));
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
