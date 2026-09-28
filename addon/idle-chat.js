// asaoffice idle chat: villagers whose Claude session is idle wander over to each other and chat
// in speech bubbles, instead of only sitting or wandering alone. Anyone who gets a task leaves
// mid-sentence, and pixel-agents' own logic walks them back to their desk.
//
// Runs on core.js's frame hook: (canvas, office, offsetX, offsetY, zoom, editMode) after each frame is
// drawn. `office` is pixel-agents' OfficeState; offsets and zoom are in device pixels.
//
// Settings (URL param, remembered in localStorage): ?idleChat=off|on  ?chatLang=id|en
// Console: __asaoffice.idleChat.start()  .setEnabled(false)  .setLang('en')  .conversations
(() => {
  'use strict';
  const ns = (window.__asaoffice = window.__asaoffice || {});

  const DIR = { DOWN: 0, LEFT: 1, RIGHT: 2, UP: 3 };
  const TOOL_KIND = {
    Edit: 'edit', MultiEdit: 'edit', Write: 'edit', NotebookEdit: 'edit',
    Read: 'read',
    Grep: 'search', Glob: 'search', LS: 'search',
    Bash: 'bash', BashOutput: 'bash',
    WebFetch: 'web', WebSearch: 'web',
    Task: 'agent', Agent: 'agent',
    TodoWrite: 'plan', ExitPlanMode: 'plan',
  };
  const CFG = {
    minIdleSec: 10, // idle this long before joining a chat
    checkEverySec: 4,
    startChance: 0.45,
    maxConversations: 2,
    maxMeetDistance: 30, // tiles (Manhattan) between the two villagers
    cooldownSec: [45, 120],
    approachTimeoutSec: 20,
    lineGapSec: 0.35,
    typeCps: 32,
  };
  const COLORS = { fill: '#fff6dc', border: '#5a3a22', text: '#3b2414', shadow: 'rgba(40, 24, 12, 0.28)' };

  let enabled = ns.setting('idleChat', ['on', 'off'], 'on') === 'on';
  let lang = ns.lang;

  const meta = new Map(); // agent id -> { idleSince, cooldownUntil, lastTool }
  const convos = [];
  const floaters = []; // one-off bubbles that follow a villager: { id, text, t, dur, delay }
  let clock = 0;
  let lastNow = 0;
  let nextCheck = 3;
  let office = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const manhattan = (ch, col, row) => Math.abs(ch.tileCol - col) + Math.abs(ch.tileRow - row);
  const lines = () => ns.chatLines?.[lang] ?? ns.chatLines?.en;
  const lineDuration = (text) => Math.min(5, Math.max(2.2, 1.4 + text.length * 0.055));

  function observe() {
    for (const ch of office.characters.values()) {
      let m = meta.get(ch.id);
      if (!m) meta.set(ch.id, (m = { idleSince: null, cooldownUntil: clock + 5, lastTool: null }));
      if (ch.isActive) m.idleSince = null;
      else if (m.idleSince === null) m.idleSince = clock;
      if (ch.currentTool && !ch.asaActivity) m.lastTool = ch.currentTool; // skip the sofa-reading pose
    }
    for (const id of meta.keys()) if (!office.characters.has(id)) meta.delete(id);
  }

  const inConvo = (id) => convos.some((c) => c.a === id || c.b === id);
  const interrupted = (ch) => ch.isActive || ch.matrixEffect || ch.bubbleType === 'permission';
  function available(ch) {
    return !ch.isActive && !ch.isSubagent && !ch.isGreeter && !ch.isHeadless && !ch.matrixEffect &&
      ch.bubbleType !== 'permission' && !inConvo(ch.id) && !ns.activities?.isBusy(ch.id) &&
      (ns.pomodoro?.mayChat?.(ch.id) ?? true);
  }
  function eligible(ch) {
    const m = meta.get(ch.id);
    return available(ch) && m && m.idleSince !== null && clock - m.idleSince >= CFG.minIdleSec && clock >= m.cooldownUntil;
  }

  function context(ch) {
    const now = new Date();
    const tool = meta.get(ch.id)?.lastTool;
    const ctx = ch.maxContextTokens > 0 && ch.contextTokens > 0 ? Math.round((ch.contextTokens / ch.maxContextTokens) * 100) : null;
    return {
      name: ns.villagerName(ch),
      project: ch.folderName || null,
      tool: (tool && TOOL_KIND[tool]) || null,
      ctx,
      hour: now.getHours(),
      day: now.getDay(),
    };
  }

  function buildDialogue(a, b) {
    const pack = lines();
    if (!pack) return [];
    const ca = context(a);
    const cb = context(b);
    const options = pack.scripts.filter((s) => !s.when || s.when(ca, cb));
    let roll = Math.random() * options.reduce((sum, s) => sum + (s.weight ?? 1), 0);
    let script = options[0];
    for (const s of options) {
      roll -= s.weight ?? 1;
      if (roll <= 0) { script = s; break; }
    }
    const out = script.lines(ca, cb).map(([who, text]) => ({ id: who === 0 ? a.id : b.id, text }));
    if (Math.random() < 0.4) out.push({ id: Math.random() < 0.5 ? a.id : b.id, text: pick(pack.farewell) });
    return out;
  }

  // Two free, side-by-side walkable tiles, cheapest for the pair to reach. Seats are not walkable.
  function meetingSpots(a, b) {
    const walkable = new Set(office.walkableTiles.map((t) => `${t.col},${t.row}`));
    const taken = new Set();
    for (const ch of office.characters.values()) {
      if (ch.id !== a.id && ch.id !== b.id) taken.add(`${ch.tileCol},${ch.tileRow}`);
    }
    for (const c of convos) {
      taken.add(`${c.spot.col},${c.spot.row}`);
      taken.add(`${c.spot.col + 1},${c.spot.row}`);
    }
    const spots = [];
    for (const t of office.walkableTiles) {
      const left = `${t.col},${t.row}`;
      const right = `${t.col + 1},${t.row}`;
      if (!walkable.has(right) || taken.has(left) || taken.has(right)) continue;
      const aLeft = manhattan(a, t.col, t.row) + manhattan(b, t.col + 1, t.row);
      const bLeft = manhattan(b, t.col, t.row) + manhattan(a, t.col + 1, t.row);
      spots.push({ col: t.col, row: t.row, swap: bLeft < aLeft, cost: Math.min(aLeft, bLeft) + Math.random() * 3 });
    }
    return spots.sort((x, y) => x.cost - y.cost).slice(0, 8);
  }

  const atTile = (ch, col, row) => ch.tileCol === col && ch.tileRow === row && ch.path.length === 0 && ch.state !== 'walk';
  const goTo = (ch, col, row) => atTile(ch, col, row) || office.walkToTile(ch.id, col, row);

  function startConversation(a, b) {
    for (const spot of meetingSpots(a, b)) {
      const [left, right] = spot.swap ? [b, a] : [a, b];
      if (!goTo(left, spot.col, spot.row)) continue;
      if (!goTo(right, spot.col + 1, spot.row)) continue;
      const convo = { a: a.id, b: b.id, left: left.id, right: right.id, spot, phase: 'approach', t: 0, retry: 0, lines: buildDialogue(a, b), line: 0, lineT: 0 };
      convos.push(convo);
      return convo;
    }
    return null;
  }

  function release(ch, cooldown = true) {
    const m = meta.get(ch.id);
    if (m && cooldown) m.cooldownUntil = clock + rand(...CFG.cooldownSec);
    if (ch.isActive || ch.state !== 'idle') return;
    if (ch.seatId && Math.random() < 0.4) office.sendToSeat(ch.id);
    else ch.wanderTimer = rand(1.5, 4);
  }

  function endConversation(convo) {
    convos.splice(convos.indexOf(convo), 1);
    for (const id of [convo.a, convo.b]) {
      const ch = office.characters.get(id);
      if (ch) release(ch);
    }
  }

  // Keep pixel-agents' wander logic from walking a villager away mid-chat.
  const hold = (ch) => { if (ch.state === 'idle') ch.wanderTimer = Math.max(ch.wanderTimer, 5); };

  function tickConversation(convo, dt) {
    const L = office.characters.get(convo.left);
    const R = office.characters.get(convo.right);
    if (!L || !R) return endConversation(convo);
    const leaver = [L, R].find(interrupted);
    if (leaver) {
      const other = leaver === L ? R : L;
      if (convo.phase === 'talk' && leaver.isActive) {
        floaters.push({ id: leaver.id, text: pick(lines().interrupt), t: 0, dur: 2.2, delay: 0 });
        if (!interrupted(other)) floaters.push({ id: other.id, text: pick(lines().cheer), t: 0, dur: 2, delay: 1.2 });
      }
      return endConversation(convo);
    }

    convo.t += dt;
    hold(L);
    hold(R);

    if (convo.phase === 'approach') {
      const { col, row } = convo.spot;
      const targets = [[L, col, R], [R, col + 1, L]];
      let arrived = 0;
      for (const [ch, c, partner] of targets) {
        if (atTile(ch, c, row)) {
          arrived++;
          ch.dir = partner.x < ch.x ? DIR.LEFT : DIR.RIGHT;
        } else if (ch.state === 'idle' && ch.path.length === 0) {
          // Lost the path (someone stood in the way, or the layout changed): ask again a few times.
          if (++convo.retry > 6 || !office.walkToTile(ch.id, c, row)) return endConversation(convo);
        }
      }
      if (arrived === 2) {
        convo.phase = 'talk';
        convo.line = 0;
        convo.lineT = -0.4;
      } else if (convo.t > CFG.approachTimeoutSec) {
        endConversation(convo);
      }
      return;
    }

    L.dir = DIR.RIGHT;
    R.dir = DIR.LEFT;
    convo.lineT += dt;
    const line = convo.lines[convo.line];
    if (!line || convo.lineT >= lineDuration(line.text) + CFG.lineGapSec) {
      convo.line++;
      convo.lineT = 0;
      if (convo.line >= convo.lines.length) endConversation(convo);
    }
  }

  function maybeStart(force = false) {
    const pool = [...office.characters.values()].filter(force ? available : eligible);
    const limit = force ? Infinity : Math.min(CFG.maxConversations, Math.floor(pool.length / 2));
    if (pool.length < 2 || convos.length >= limit) return null;
    if (!force && Math.random() > CFG.startChance) return null;
    const a = pick(pool);
    const near = pool
      .filter((ch) => ch !== a && manhattan(ch, a.tileCol, a.tileRow) <= CFG.maxMeetDistance)
      .sort((x, y) => manhattan(x, a.tileCol, a.tileRow) - manhattan(y, a.tileCol, a.tileRow))
      .slice(0, 2);
    if (near.length === 0) return null;
    const b = pick(near);
    const convo = startConversation(a, b);
    if (!convo) {
      // Nowhere to meet right now; don't retry the same pair every check.
      for (const ch of [a, b]) { const m = meta.get(ch.id); if (m) m.cooldownUntil = clock + 15; }
    }
    return convo;
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────
  function wrap(ctx, text, maxWidth) {
    const out = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) line = next;
      else { out.push(line); line = word; }
      // A single word wider than the bubble (a long path, say) gets hard-broken.
      while (ctx.measureText(line).width > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut--;
        out.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line) out.push(line);
    return out;
  }

  function drawBubble(ctx, canvas, text, shown, ch, offX, offY, zoom, alpha) {
    const u = Math.max(1, Math.round(zoom)); // one art pixel, in device pixels
    const fontPx = Math.max(12, Math.round(zoom * 6));
    ctx.font = `${fontPx}px "FS Pixel Sans", sans-serif`;
    const pad = 3 * u;
    const rows = wrap(ctx, text, 92 * zoom - 2 * pad);
    const lineH = Math.round(fontPx * 1.2);
    const w = Math.ceil(Math.max(...rows.map((r) => ctx.measureText(r).width)) + 2 * pad);
    const h = rows.length * lineH + 2 * pad - Math.round(fontPx * 0.2);
    const ax = Math.round(offX + ch.x * zoom);
    const ay = Math.round(offY + (ch.y - 31) * zoom);
    const x = Math.round(Math.min(Math.max(ax - w / 2, 2), canvas.width - w - 2));
    const y = Math.max(2, ay - 3 * u - h);
    const tx = Math.min(Math.max(ax, x + 3 * u), x + w - 4 * u);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(x + 2 * u, y + 2 * u, w - u, h - u);
    // Box with clipped corners, then the stepped tail.
    ctx.fillStyle = COLORS.border;
    ctx.fillRect(x + u, y, w - 2 * u, h);
    ctx.fillRect(x, y + u, w, h - 2 * u);
    ctx.fillRect(tx - 2 * u, y + h, 5 * u, u);
    ctx.fillRect(tx - u, y + h + u, 3 * u, u);
    ctx.fillRect(tx, y + h + 2 * u, u, u);
    ctx.fillStyle = COLORS.fill;
    ctx.fillRect(x + u, y + u, w - 2 * u, h - 2 * u);
    ctx.fillRect(tx - u, y + h - u, 3 * u, 2 * u);
    ctx.fillRect(tx, y + h + u, u, u);

    ctx.fillStyle = COLORS.text;
    ctx.textBaseline = 'top';
    let left = shown;
    rows.forEach((row, i) => {
      if (left <= 0) return;
      ctx.fillText(row.slice(0, left), x + pad, y + pad + i * lineH);
      left -= row.length + 1;
    });
    ctx.globalAlpha = 1;
  }

  function fade(t, dur) {
    return Math.min(1, t / 0.15, (dur - t) / 0.3);
  }

  function draw(canvas, offX, offY, zoom) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const convo of convos) {
      if (convo.phase !== 'talk' || convo.lineT < 0) continue;
      const line = convo.lines[convo.line];
      const ch = line && office.characters.get(line.id);
      if (!ch) continue;
      const dur = lineDuration(line.text);
      if (convo.lineT > dur) continue;
      drawBubble(ctx, canvas, line.text, Math.floor(convo.lineT * CFG.typeCps), ch, offX, offY, zoom, fade(convo.lineT, dur));
    }
    for (const f of floaters) {
      const ch = office.characters.get(f.id);
      const t = f.t - f.delay;
      if (!ch || t < 0) continue;
      drawBubble(ctx, canvas, f.text, Math.floor(t * CFG.typeCps), ch, offX, offY, zoom, fade(t, f.dur));
    }
    ctx.restore();
  }

  // ── Frame hook ──────────────────────────────────────────────────────────────
  function afterRender(canvas, officeState, offX, offY, zoom, editMode) {
    try {
      const now = performance.now();
      const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
      lastNow = now;
      clock += dt;
      office = officeState;
      if (!office?.characters) return;

      observe();
      if (!enabled || editMode) {
        while (convos.length) endConversation(convos[0]);
        floaters.length = 0;
        return;
      }
      for (const convo of [...convos]) tickConversation(convo, dt);
      for (let i = floaters.length - 1; i >= 0; i--) {
        floaters[i].t += dt;
        if (floaters[i].t > floaters[i].delay + floaters[i].dur) floaters.splice(i, 1);
      }
      if (clock >= nextCheck) {
        nextCheck = clock + CFG.checkEverySec;
        maybeStart();
      }
      draw(canvas, offX, offY, zoom);
    } catch (err) {
      // Never break pixel-agents' render loop; switch ourselves off instead.
      enabled = false;
      console.error('[asaoffice] idle chat disabled after an error:', err);
    }
  }

  ns.onFrame(afterRender);
  ns.idleChat = {
    config: CFG,
    get conversations() { return convos.map((c) => ({ a: c.a, b: c.b, phase: c.phase, line: c.lines[c.line]?.text ?? null })); },
    /** Start a chat now between any two idle villagers (ignores idle time, cooldown and chance). */
    start: () => (office ? !!maybeStart(true) : false),
    /** Id of the villager `id` is chatting with (or walking over to), else null. */
    partnerOf(id) {
      const c = convos.find((x) => x.a === id || x.b === id);
      return c ? (c.a === id ? c.b : c.a) : null;
    },
    setEnabled(on) { enabled = !!on; ns.store.set('idleChat', enabled ? 'on' : 'off'); },
    setLang(value) { if (ns.chatLines?.[value]) { lang = value; ns.lang = value; ns.store.set('chatLang', value); } },
  };
})();
