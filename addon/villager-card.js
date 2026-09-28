// asaoffice villager card: click a villager (pixel-agents selects it and the camera follows) and a
// profile card shows who it is and what its Claude session is doing. Click the villager again, or ×,
// to close it.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const h = ns.h;
  const S = ns.t({
    id: {
      agent: 'Agent', working: 'Sedang bekerja', permission: 'Menunggu izinmu', waiting: 'Menunggu balasanmu',
      chatting: 'Ngobrol dengan', walkingTo: 'Menghampiri', idle: 'Santai', leaving: 'Pamit pulang', forMin: (m) => `${m} menit`,
      project: 'Proyek', lastTool: 'Tool terakhir', context: 'Context', subagents: 'Sub-agent', team: 'Tim', since: 'Terlihat sejak',
      none: '—', subagent: 'Sub-agent dari',
    },
    en: {
      agent: 'Agent', working: 'Working', permission: 'Needs your permission', waiting: 'Waiting for your reply',
      chatting: 'Chatting with', walkingTo: 'Walking over to', idle: 'Relaxing', leaving: 'Heading out', forMin: (m) => `${m} min`,
      project: 'Project', lastTool: 'Last tool', context: 'Context', subagents: 'Sub-agents', team: 'Team', since: 'Seen since',
      none: '—', subagent: 'Sub-agent of',
    },
  });

  const css = `
  .asa-card { position: fixed; top: 12px; right: 12px; z-index: 900; width: 260px; max-width: calc(100vw - 24px);
    font-family: "FS Pixel Sans", sans-serif; background: #f4e6c4; color: #3a2117; border: 3px solid #744122;
    box-shadow: inset 0 0 0 2px #dca05f, 0 4px 0 rgba(0,0,0,0.25); padding: 12px; line-height: 1.3; }
  .asa-card-top { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
  .asa-portrait { width: 48px; height: 78px; flex: none; image-rendering: pixelated; background-repeat: no-repeat;
    background-size: 336px 288px; background-position: -48px -6px; background-color: #dca05f; border: 2px solid #744122; }
  .asa-card-name { font-size: 18px; }
  .asa-card-status { font-size: 13px; margin-top: 2px; }
  .asa-dot { display: inline-block; width: 8px; height: 8px; margin-right: 5px; vertical-align: 1px; }
  .asa-card-row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; padding: 3px 0;
    border-top: 1px dashed #c9a877; }
  .asa-card-row b { font-weight: normal; opacity: 0.7; }
  .asa-card-row span { text-align: right; overflow-wrap: anywhere; }
  .asa-bar { height: 8px; background: #d9c49a; border: 1px solid #744122; margin-top: 4px; }
  .asa-bar i { display: block; height: 100%; }
  .asa-card .asa-close { position: absolute; top: 4px; right: 6px; background: none; border: 0; font: inherit;
    font-size: 20px; cursor: pointer; color: inherit; }
  @media (max-width: 480px) { .asa-card { left: 12px; right: 12px; width: auto; top: auto; bottom: 76px; } }
  `;

  const locale = ns.lang === 'id' ? 'id-ID' : 'en-US';
  const meta = new Map(); // id -> { lastTool, firstSeen, idleSince }
  let card = null; // { id, el, parts }
  let lastUpdate = 0;

  function track(office) {
    const now = Date.now();
    for (const ch of office.characters.values()) {
      let m = meta.get(ch.id);
      if (!m) meta.set(ch.id, (m = { lastTool: null, firstSeen: now, idleSince: ch.isActive ? null : now }));
      if (ch.currentTool) m.lastTool = ch.currentTool;
      if (ch.isActive) m.idleSince = null;
      else if (m.idleSince === null) m.idleSince = now;
    }
    for (const id of meta.keys()) if (!office.characters.has(id)) meta.delete(id);
  }

  function status(office, ch) {
    const m = meta.get(ch.id);
    if (ch.matrixEffect === 'despawn') return [S.leaving, '#9a8a7a'];
    if (ch.bubbleType === 'permission') return [S.permission, '#e0a030'];
    if (ch.isActive) return [`${S.working}${ch.currentTool ? ` · ${ch.currentTool}` : ''}`, '#5aa84a'];
    const partner = ns.idleChat?.partnerOf?.(ch.id);
    if (partner != null) {
      const other = office.characters.get(partner);
      const talking = ns.idleChat.conversations.some((c) => (c.a === ch.id || c.b === ch.id) && c.phase === 'talk');
      return [`${talking ? S.chatting : S.walkingTo} ${ns.villagerName(other)}`, '#4a8ac8'];
    }
    if (ch.waitingAwaitingInput || ch.bubbleType === 'waiting') return [S.waiting, '#c8503c'];
    const mins = m?.idleSince ? Math.floor((Date.now() - m.idleSince) / 60000) : 0;
    return [mins > 0 ? `${S.idle} · ${S.forMin(mins)}` : S.idle, '#9a8a7a'];
  }

  function row(label) {
    const value = h('span');
    const el = h('div', { class: 'asa-card-row' }, h('b', {}, label), value);
    return { el, value };
  }

  function open(office, ch) {
    close();
    if (!document.getElementById('asa-card-css')) {
      document.head.appendChild(h('style', { id: 'asa-card-css' }, css));
    }
    const portrait = h('div', { class: 'asa-portrait' });
    portrait.style.backgroundImage = `url(./assets/characters/char_${(ch.palette ?? 0) % 6}.png)`;
    const name = h('div', { class: 'asa-card-name' });
    const dot = h('i', { class: 'asa-dot' });
    const statusText = h('span');
    const parts = {
      name,
      dot,
      statusText,
      project: row(S.project),
      tool: row(S.lastTool),
      context: row(S.context),
      subagents: row(S.subagents),
      team: row(S.team),
      since: row(S.since),
      bar: h('i'),
    };
    const closeBtn = h('button', { class: 'asa-close', 'aria-label': 'Close' }, '×');
    closeBtn.onclick = () => {
      office.selectedAgentId = null;
      office.cameraFollowId = null;
      close();
    };
    const el = h(
      'div',
      { class: 'asa-card', role: 'status' },
      closeBtn,
      h('div', { class: 'asa-card-top' }, portrait, h('div', {}, name, h('div', { class: 'asa-card-status' }, dot, statusText))),
      parts.project.el,
      parts.tool.el,
      parts.context.el,
      h('div', { class: 'asa-bar' }, parts.bar),
      parts.subagents.el,
      parts.team.el,
      parts.since.el,
    );
    document.body.appendChild(el);
    card = { id: ch.id, el, parts };
    update(office, ch);
  }

  function update(office, ch) {
    const p = card.parts;
    const m = meta.get(ch.id);
    const parent = ch.isSubagent ? office.characters.get(ch.parentAgentId) : null;
    p.name.textContent = `${ns.villagerName(ch)}${ch.agentName ? ` (${ch.agentName})` : ''}`;
    const [text, color] = status(office, ch);
    p.statusText.textContent = parent ? `${S.subagent} ${ns.villagerName(parent)} · ${text}` : text;
    p.dot.style.background = color;
    p.project.value.textContent = ch.folderName || S.none;
    p.tool.value.textContent = ch.currentTool || m?.lastTool || S.none;
    const pct = ch.maxContextTokens > 0 ? Math.min(100, Math.round((ch.contextTokens / ch.maxContextTokens) * 100)) : 0;
    const k = (n) => `${Math.round(n / 1000)}k`;
    p.context.value.textContent = ch.contextTokens > 0 ? `${pct}% · ${k(ch.contextTokens)} / ${k(ch.maxContextTokens)}` : S.none;
    p.bar.style.width = `${pct}%`;
    p.bar.style.background = pct >= 80 ? '#c8503c' : pct >= 60 ? '#e0a030' : '#6ea84e';
    const subs = [...office.characters.values()].filter((c) => c.isSubagent && c.parentAgentId === ch.id).length;
    p.subagents.el.style.display = subs ? '' : 'none';
    p.subagents.value.textContent = String(subs);
    p.team.el.style.display = ch.teamName ? '' : 'none';
    p.team.value.textContent = ch.teamName ?? '';
    p.since.value.textContent = m ? new Date(m.firstSeen).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : S.none;
  }

  function close() {
    card?.el.remove();
    card = null;
  }

  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    track(office);
    const id = editMode ? null : office.selectedAgentId;
    const ch = id == null ? null : office.characters.get(id);
    if (!ch) return close();
    if (!card || card.id !== id) open(office, ch);
    else if (performance.now() - lastUpdate > 400) {
      lastUpdate = performance.now();
      update(office, ch);
    }
  });
})();
