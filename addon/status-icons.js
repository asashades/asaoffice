// asaoffice status icons: instead of pixel-agents' big label panels over every villager (which pile up
// when many agents work, especially with Settings → Always Show Labels), each working villager gets a
// small pixel badge for what it's doing: ✎ edit, 🔍 read/search, >_ command, 🌐 web, 👥 sub-agent,
// ⚙ anything else, and a blue "…" while it waits for your reply. pixel-agents' own "!" permission
// bubble stays. Click a villager for the details (villager card).
//   ?labels=full brings the original label panels back (remembered); ?labels=icons returns to badges.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const mode = ns.setting('labels', ['icons', 'full'], 'icons');
  if (mode === 'full') return;

  const style = document.createElement('style');
  style.textContent = '[data-testid="agent-overlay"] { display: none !important; }';
  document.head.appendChild(style);

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

  const lastTool = new Map();
  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (editMode) return;
    const ctx = canvas.getContext('2d');
    const t = performance.now() / 1000;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const ch of office.characters.values()) {
      if (ch.currentTool) lastTool.set(ch.id, ch.currentTool);
      if (ch.matrixEffect) continue;
      const waitingForYou = ch.bubbleType === 'waiting' && ch.waitingAwaitingInput;
      if (ch.bubbleType && !waitingForYou) continue; // pixel-agents is already drawing its own bubble
      let glyph = null;
      let color = COLOR.working;
      if (waitingForYou) {
        glyph = GLYPH.waiting;
        color = COLOR.waiting;
      } else if (ch.isActive) {
        glyph = GLYPH[KIND[ch.currentTool ?? lastTool.get(ch.id)] ?? 'other'];
      }
      if (!glyph) continue;
      const lift = ch.state === 'type' ? 10 : 0;
      const scale = ch.isSubagent ? 0.8 : 1;
      badge(ctx, offX + ch.x * zoom, offY + (ch.y + lift - 25) * zoom, zoom * scale, glyph, color, ch.isActive ? t + ch.id : 0);
    }
    ctx.restore();
    for (const id of lastTool.keys()) if (!office.characters.has(id)) lastTool.delete(id);
  });
})();
