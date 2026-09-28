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
  };
  const COLOR = { working: '#4f9a45', waiting: '#4a8ac8' };
  const S = ns.t({
    id: { waiting: 'Nunggu balasanmu', edit: 'Ngedit', search: 'Nyari', command: 'Jalanin command', web: 'Buka web', agent: 'Sub-agent', other: 'Kerja' },
    en: { waiting: 'Waiting for you', edit: 'Editing', search: 'Searching', command: 'Running a command', web: 'On the web', agent: 'Sub-agent', other: 'Working' },
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

  /**
   * A cream speech bubble with a coloured icon and a short line of text, its tail pointing down at (cx, bottom).
   * opts: { glyph, color, text, t (for the gentle bob), alpha }
   */
  function speech(ctx, cx, bottom, zoom, { glyph, color, text, t = 0, alpha = 1 }) {
    const u = Math.max(1, Math.round(zoom));
    const label = text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS - 1)}…` : text;
    ctx.font = `${Math.max(9, Math.round(5.5 * zoom))}px "FS Pixel Sans", sans-serif`;
    const textW = Math.ceil(ctx.measureText(label).width);
    const iconW = glyph ? 9 * u : 0;
    const w = 3 * u + iconW + textW + 3 * u;
    const hgt = 11 * u;
    const bob = Math.round(Math.sin(t * 3) * u * 0.5);
    const x = Math.round(cx - w / 2);
    const y = Math.round(bottom - hgt - 3 * u - bob);
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

  const tools = new Map(); // agent id -> { status, toolName, open: Set<toolId> }
  ns.onMessage((msg) => {
    if (typeof msg?.id !== 'number') return;
    if (msg.type === 'agentToolStart' && typeof msg.status === 'string') {
      const cur = tools.get(msg.id) ?? { open: new Set() };
      if (!msg.runInBackground || !cur.status) {
        cur.status = msg.status;
        cur.toolName = msg.toolName;
      }
      cur.open.add(msg.toolId);
      tools.set(msg.id, cur);
    } else if (msg.type === 'agentToolDone') {
      tools.get(msg.id)?.open.delete(msg.toolId);
    } else if (msg.type === 'agentToolsClear' || msg.type === 'agentClosed') {
      tools.delete(msg.id);
    }
  });
  /** What villager `id` is doing right now, as a short translated line, or null. Used by the villager card too. */
  ns.statusText = (id) => {
    const s = tools.get(id)?.status;
    return s ? translate(s) : null;
  };

  const lastTool = new Map();
  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (editMode) return;
    const ctx = canvas.getContext('2d');
    const t = performance.now() / 1000;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Draw the selected villager last so its bubble sits on top of any neighbours'.
    const list = [...office.characters.values()].sort((a, b) => (a.id === office.selectedAgentId) - (b.id === office.selectedAgentId));
    for (const ch of list) {
      if (ch.currentTool && !ch.asaActivity) lastTool.set(ch.id, ch.currentTool);
      if (ch.matrixEffect) continue;
      const waitingForYou = ch.bubbleType === 'waiting' && ch.waitingAwaitingInput;
      if (ch.bubbleType && !waitingForYou) continue; // pixel-agents is already drawing its own bubble
      let glyph = null;
      let color = COLOR.working;
      let text = null;
      if (waitingForYou) {
        glyph = GLYPH.waiting;
        color = COLOR.waiting;
        text = S.waiting;
      } else if (ch.isActive) {
        const kind = KIND[ch.currentTool ?? lastTool.get(ch.id) ?? tools.get(ch.id)?.toolName] ?? 'other';
        glyph = GLYPH[kind];
        text = (!ch.isSubagent && ns.statusText(ch.id)) || S[kind];
      }
      if (!glyph) continue;
      const lift = ch.state === 'type' ? 10 : 0;
      const bottom = offY + (ch.y + lift - 28) * zoom;
      const cx = offX + ch.x * zoom;
      const phase = ch.isActive ? t + ch.id : 0;
      if (mode === 'icons') badge(ctx, cx, offY + (ch.y + lift - 25) * zoom, zoom * (ch.isSubagent ? 0.8 : 1), glyph, color, phase);
      else speech(ctx, cx, bottom, ch.isSubagent ? zoom * 0.85 : zoom, { glyph, color, text, t: phase, alpha: ch.isSubagent ? 0.85 : 1 });
    }
    ctx.restore();
    for (const id of lastTool.keys()) if (!office.characters.has(id)) lastTool.delete(id);
  });
})();
