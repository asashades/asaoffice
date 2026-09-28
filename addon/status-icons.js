// asaoffice status bubbles: instead of pixel-agents' big label panels over every villager (which pile up
// when many agents work, especially with Settings → Always Show Labels), each working villager gets a
// small speech bubble above its head saying what it's doing — "Ngedit app.ts", "Jalanin: npm test",
// "Nyari kode" — with a matching pixel icon, and "Nunggu balasanmu" while it waits for your reply.
// pixel-agents' own "!" permission bubble stays. Click a villager for the details (villager card).
// The text comes from the same agentToolStart messages the office gets (see core.js onMessage).
//   ?labels=bubbles (default) | icons (icon-only badges) | full (pixel-agents' original panels); remembered.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const KIND = {
    Edit: 'edit', MultiEdit: 'edit', Write: 'edit', NotebookEdit: 'edit',
    Read: 'search', Grep: 'search', Glob: 'search', LS: 'search',
    Bash: 'command', BashOutput: 'command',
    WebFetch: 'web', WebSearch: 'web',
    Task: 'agent', Agent: 'agent',
  };
  // 7×7 glyphs ('#' = pixel)
  const GLYPH = {
    edit: ['.....##', '....###', '...###.', '..###..', '.###...', '##.....', '#......'],
    search: ['.###...', '#...#..', '#...#..', '#...#..', '.###...', '....##.', '.....##'],
    command: ['.......', '#......', '.#.....', '..#....', '.#.....', '#..###.', '.......'],
    web: ['..###..', '.#.#.#.', '#######', '#..#..#', '#######', '.#.#.#.', '..###..'],
    agent: ['.##.##.', '.##.##.', '.......', '###.###', '###.###', '###.###', '.......'],
    other: ['...#...', '.#####.', '.##.##.', '###.###', '.##.##.', '.#####.', '...#...'],
    waiting: ['.......', '.......', '.......', '#.#.#..', '.......', '.......', '.......'],
    think: ['.......', '.......', '.......', '#.#.#..', '.......', '.......', '.......'],
    laptop: ['.......', '.#####.', '.#...#.', '.#...#.', '.#####.', '#######', '.......'],
  };
  const COLOR = { working: '#4f9a45', waiting: '#4a8ac8' };
  const S = ns.t({
    id: { waiting: 'Nunggu balasanmu', edit: 'Ngedit', search: 'Nyari', command: 'Jalanin command', web: 'Buka web', agent: 'Sub-agent', other: 'Kerja', think: 'Mikir…', sofa: (t) => `Dari sofa: ${t}`, waitingFor: (n) => `Nunggu ${n}`, helper: 'asisten', task: (d) => `Tugas: ${d}` },
    en: { waiting: 'Waiting for you', edit: 'Editing', search: 'Searching', command: 'Running a command', web: 'On the web', agent: 'Sub-agent', other: 'Working', think: 'Thinking…', sofa: (t) => `From the sofa: ${t}`, waitingFor: (n) => `Waiting for ${n}`, helper: 'a helper', task: (d) => `Task: ${d}` },
  });
  const MAX_CHARS = 26;

  // ── Shared drawing (idle activities, Pomodoro and expressions use these too) ──
  function badge(ctx, cx, bottom, zoom, glyph, color, t) {
    const u = Math.max(1, Math.round(zoom)); // one art pixel
    const size = 11 * u;
    const x = Math.round(cx - size / 2);
    const y = Math.round(bottom - size - Math.round(Math.sin(t * 4) * u * 0.6));
    ctx.fillStyle = '#2b1a10';
    ctx.fillRect(x + u, y, size - 2 * u, size);
    ctx.fillRect(x, y + u, size, size - 2 * u);
    ctx.fillStyle = color;
    ctx.fillRect(x + u, y + u, size - 2 * u, size - 2 * u);
    ctx.fillStyle = '#ffffff';
    glyph.forEach((row, gy) => {
      for (let gx = 0; gx < row.length; gx++) if (row[gx] === '#') ctx.fillRect(x + (2 + gx) * u, y + (2 + gy) * u, u, u);
    });
    // little tail pointing at the head
    ctx.fillStyle = '#2b1a10';
    ctx.fillRect(Math.round(cx - u), y + size, 2 * u, u);
  }

  // ── Brief bubbles: a bubble pops up when what it says changes, stays a few seconds, then fades away, so the
  // office stays clean. Hovering or selecting a villager shows it again. ?bubbles=always keeps them up (remembered).
  const brief = ns.setting('bubbles', ['brief', 'always'], 'brief') === 'brief';
  const SHOW_MS = 4000;
  const FADE_MS = 700;
  const shown = new Map(); // key -> { text, since }
  /**
   * Opacity for the bubble `key` saying `text`: 1 for SHOW_MS after the text changes, then fading to 0.
   * hold: always show (hovered/selected). quiet: a change to this text doesn't pop the bubble up again
   * (e.g. "Mikir…" between tools).
   */
  function bubbleAlpha(key, text, { hold = false, quiet = false } = {}) {
    const now = performance.now();
    let s = shown.get(key);
    if (!s) shown.set(key, (s = { text, since: quiet ? -Infinity : now, seen: now }));
    else if (s.text !== text) Object.assign(s, { text, since: quiet ? s.since : now });
    s.seen = now;
    if (!brief || hold) return 1;
    const age = now - s.since;
    return age < SHOW_MS ? 1 : age < SHOW_MS + FADE_MS ? 1 - (age - SHOW_MS) / FADE_MS : 0;
  }
  setInterval(() => { // forget bubbles of villagers that left
    const cutoff = performance.now() - 60_000;
    for (const [k, s] of shown) if (s.seen < cutoff) shown.delete(k);
  }, 30_000);
  /** Is villager `ch` hovered or selected (its bubbles always show)? */
  const focused = (ch) => {
    const o = ns.view?.office;
    return !!o && (o.hoveredAgentId === ch.id || o.selectedAgentId === ch.id);
  };

  /**
   * A cream speech bubble with a coloured icon and a short line of text, its tail pointing down at (cx, bottom).
   * opts: { glyph, color, text, t (for the gentle bob), alpha, avoid (rects of bubbles drawn this frame),
   *         key (makes it a brief bubble, see bubbleAlpha), hold, quiet }
   */
  function speech(ctx, cx, bottom, zoom, { glyph, color, text, t = 0, alpha = 1, avoid = null, key = null, hold = false, quiet = false }) {
    if (key) alpha *= bubbleAlpha(key, text, { hold, quiet });
    if (alpha <= 0.01) return;
    const u = Math.max(1, Math.round(zoom));
    const label = text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS - 1)}…` : text;
    ctx.font = `${Math.max(9, Math.round(5.5 * zoom))}px "FS Pixel Sans", sans-serif`;
    const textW = Math.ceil(ctx.measureText(label).width);
    const iconW = glyph ? 9 * u : 0;
    const w = 3 * u + iconW + textW + 3 * u;
    const hgt = 11 * u;
    const bob = Math.round(Math.sin(t * 3) * u * 0.5);
    const x = Math.round(cx - w / 2);
    let y = Math.round(bottom - hgt - 3 * u - bob);
    // Neighbours' bubbles (drawn earlier this frame): step up until this one is clear of them.
    if (avoid) {
      const hits = (yy) => avoid.some((r) => x < r.x + r.w && x + w > r.x && yy < r.y + r.h && yy + hgt + 2 * u > r.y);
      for (let tries = 0; tries < 4 && hits(y); tries++) y -= hgt + 2 * u;
      avoid.push({ x, y, w, h: hgt + 2 * u });
    }
    ctx.globalAlpha = alpha;
    // outline (cut corners), fill
    ctx.fillStyle = '#2b1a10';
    ctx.fillRect(x + u, y, w - 2 * u, hgt);
    ctx.fillRect(x, y + u, w, hgt - 2 * u);
    ctx.fillStyle = '#fff6dc';
    ctx.fillRect(x + u, y + u, w - 2 * u, hgt - 2 * u);
    // tail
    const tx = Math.round(cx - u);
    ctx.fillStyle = '#2b1a10';
    ctx.fillRect(tx - u, y + hgt - u, 4 * u, u);
    ctx.fillRect(tx, y + hgt, 2 * u, 2 * u);
    ctx.fillStyle = '#fff6dc';
    ctx.fillRect(tx, y + hgt - u, 2 * u, u);
    if (glyph) {
      ctx.fillStyle = color;
      ctx.fillRect(x + 2 * u, y + 2 * u, 7 * u, 7 * u);
      ctx.fillStyle = '#ffffff';
      glyph.forEach((row, gy) => {
        for (let gx = 0; gx < row.length; gx++) if (row[gx] === '#') ctx.fillRect(x + 2 * u + gx * u, y + 2 * u + gy * u, u, u);
      });
    }
    ctx.fillStyle = '#3a2117';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 3 * u + iconW, y + hgt / 2 + u * 0.5);
    ctx.globalAlpha = 1;
  }
  ns.drawBadge = badge;
  ns.drawSpeech = speech;
  ns.bubbleFocused = focused;
  ns.GLYPH = GLYPH;

  const mode = ns.setting('labels', ['bubbles', 'icons', 'full'], 'bubbles');
  if (mode === 'full') return;

  const style = document.createElement('style');
  style.textContent = '[data-testid="agent-overlay"] { display: none !important; }';
  document.head.appendChild(style);

  // ── What each agent is doing, from the server's tool messages ──
  const PHRASES = {
    id: [
      [/^Reading\s*(.*)$/, (f) => (f ? `Baca ${f}` : 'Baca file')],
      [/^Editing notebook$/, () => 'Ngedit notebook'],
      [/^Editing\s*(.*)$/, (f) => (f ? `Ngedit ${f}` : 'Ngedit file')],
      [/^Writing\s*(.*)$/, (f) => (f ? `Nulis ${f}` : 'Nulis file')],
      [/^Running: (.*)$/, (c) => `Jalanin: ${c}`],
      [/^Searching files$/, () => 'Nyari file'],
      [/^Searching code$/, () => 'Nyari kode'],
      [/^Fetching web content$/, () => 'Buka web'],
      [/^Searching the web$/, () => 'Cari di web'],
      [/^Subtask: (.*)$/, (d) => `Subtugas: ${d}`],
      [/^Running subtask$/, () => 'Jalanin subtugas'],
      [/^Waiting for your answer$/, () => 'Nunggu jawabanmu'],
      [/^Planning$/, () => 'Bikin rencana'],
      [/^Using (.*)$/, (t) => `Pakai ${t}`],
    ],
  };
  const translate = (status) => {
    for (const [re, fn] of PHRASES[ns.lang] ?? []) {
      const m = re.exec(status);
      if (m) return fn(m[1]?.trim());
    }
    return status;
  };

  const tools = new Map(); // agent id -> { status, toolName, toolId, open: Set<toolId> }
  const subStatus = new Map(); // `${parentId}:${parentToolId}` -> latest tool status of that sub-agent
  const subTask = new Map(); // `${parentId}:${toolId}` -> the task description it was spawned with
  ns.onMessage((msg) => {
    if (typeof msg?.id !== 'number') return;
    if (msg.type === 'agentToolStart' && typeof msg.status === 'string') {
      const cur = tools.get(msg.id) ?? { open: new Set() };
      if (!msg.runInBackground || !cur.status) {
        cur.status = msg.status;
        cur.toolName = msg.toolName;
        cur.toolId = msg.toolId;
      }
      cur.open.add(msg.toolId);
      tools.set(msg.id, cur);
      const task = /^Subtask: (.*)$/.exec(msg.status)?.[1];
      if (task) subTask.set(`${msg.id}:${msg.toolId}`, task.trim());
    } else if (msg.type === 'agentToolDone') {
      tools.get(msg.id)?.open.delete(msg.toolId);
    } else if (msg.type === 'agentToolsClear' || msg.type === 'agentClosed') {
      tools.delete(msg.id);
    } else if (msg.type === 'subagentToolStart' && typeof msg.status === 'string') {
      subStatus.set(`${msg.id}:${msg.parentToolId}`, msg.status);
    } else if (msg.type === 'subagentClear') {
      subStatus.delete(`${msg.id}:${msg.parentToolId}`);
      subTask.delete(`${msg.id}:${msg.parentToolId}`);
    }
  });
  /** Status line for sub-agent villager `ch`: its current tool, else the task it was given. */
  function subText(office, ch) {
    const meta = office.subagentMeta?.get?.(ch.id);
    if (!meta) return null;
    const key = `${meta.parentAgentId}:${meta.parentToolId}`;
    const st = subStatus.get(key);
    if (st) return translate(st);
    const task = subTask.get(key);
    return task ? S.task(task) : null;
  }
  /** A parent busy with a sub-agent says who it's waiting for instead of repeating the sub-agent's task. */
  function parentText(office, ch) {
    const cur = tools.get(ch.id);
    if (!cur || (cur.toolName !== 'Agent' && cur.toolName !== 'Task') || !cur.open.has(cur.toolId)) return null;
    const subId = office.getSubagentId?.(ch.id, cur.toolId);
    const sub = subId != null ? office.characters.get(subId) : null;
    if (!sub) return null;
    const staff = ns.staffOf?.(sub);
    return S.waitingFor(staff ? staff.name : S.helper);
  }
  /** What villager `id` is doing right now, as a short translated line, or null. Used by the villager card too. */
  ns.statusText = (id) => {
    const s = tools.get(id)?.status;
    return s ? translate(s) : null;
  };

  function onSofa(office, ch) {
    if (!ch.seatId || ch.state !== 'type' || ch.asaActivity) return false;
    const uid = String(ch.seatId).split(':')[0];
    return office.getLayout().furniture.some((f) => f.uid === uid && f.type.startsWith('COZY_SOFA'));
  }

  const lastTool = new Map();
  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (editMode) return;
    const ctx = canvas.getContext('2d');
    const t = performance.now() / 1000;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Draw the selected villager last so its bubble sits on top of any neighbours'.
    const list = [...office.characters.values()].sort((a, b) => (a.id === office.selectedAgentId) - (b.id === office.selectedAgentId));
    const avoid = [];
    for (const ch of list) {
      if (ch.currentTool && !ch.asaActivity) lastTool.set(ch.id, ch.currentTool);
      if (ch.matrixEffect) continue;
      const waitingForYou = ch.bubbleType === 'waiting' && ch.waitingAwaitingInput;
      if (ch.bubbleType && !waitingForYou) continue; // pixel-agents is already drawing its own bubble
      let glyph = null;
      let color = COLOR.working;
      let text = null;
      let quiet = false;
      if (waitingForYou) {
        glyph = GLYPH.waiting;
        color = COLOR.waiting;
        text = S.waiting;
      } else if (ch.isActive) {
        const cur = tools.get(ch.id);
        // Active but no tool running: the model is thinking or writing its reply.
        const thinking = !ch.isSubagent && !ch.currentTool && !(cur?.open.size > 0);
        const kind = KIND[ch.currentTool ?? lastTool.get(ch.id) ?? cur?.toolName] ?? 'other';
        glyph = thinking ? GLYPH.think : GLYPH[kind];
        quiet = thinking;
        text = thinking
          ? S.think
          : (ch.isSubagent ? subText(office, ch) : parentText(office, ch) ?? ns.statusText(ch.id)) || S[kind];
        // More sessions than desks: the extras work from a sofa seat, with a laptop.
        if (onSofa(office, ch)) {
          glyph = GLYPH.laptop;
          text = S.sofa(text);
        }
      }
      if (!glyph) continue;
      const lift = ch.state === 'type' ? 10 : 0;
      const bottom = offY + (ch.y + lift - 28) * zoom;
      const cx = offX + ch.x * zoom;
      const phase = ch.isActive ? t + ch.id : 0;
      if (mode === 'icons') badge(ctx, cx, offY + (ch.y + lift - 25) * zoom, zoom * (ch.isSubagent ? 0.8 : 1), glyph, color, phase);
      else {
        speech(ctx, cx, bottom, ch.isSubagent ? zoom * 0.85 : zoom, {
          glyph, color, text, t: phase, alpha: ch.isSubagent ? 0.9 : 1, avoid,
          key: `status:${ch.id}`, hold: focused(ch), quiet,
        });
      }
    }
    ctx.restore();
    for (const id of lastTool.keys()) if (!office.characters.has(id)) lastTool.delete(id);
  });
})();
