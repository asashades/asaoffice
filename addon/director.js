// asaoffice director: Shades, the office's CEO, is always in — even when no Claude Code session is running.
//   - With nothing to do he sits at the director's desk (bottom right), reads, and now and then gets up to
//     stretch his legs and chat like everyone else.
//   - When you send him a task from the mailbox, the session that runs it (`claude -p --agent shades-director`)
//     takes his place: the villager you see *is* that session from then on (its tools, bubbles and sub-agents),
//     and when the session ends he's back to being the office's own Shades, in the same spot.
//   - A new task starts with a short meeting at the meeting table (the lounge sofas in older layouts) with the staff it needs.
//   - "Mode Hemat": Shades does the work in one session, but the staff act it out — when he reads code Iris
//     (or Gus while planning) sits at a desk reading, tests make Wren busy, git makes Pip busy, docs Sari, other
//     edits and commands Bayu. Only installed staff (npm run staff) show up, and they leave again after the task.
//   - Courier: a task sent from the mailbox is a letter. Shades gets up, takes it from the mailbox on the wall and
//     hands it over (to the meeting table for his own tasks, or to the workroom for a staff member's), and
//     only then does the task start (the task server holds it until ns.director.courier calls back, or 30 s pass).
//   - Real meeting: a letter in "🗣 Rapat dulu" mode (task-server.mjs) is discussed by real agents; Shades and the people he calls sit at the table
//     and the speech bubbles show what the letter says they said, as it is said.
//   - Rally: a long prompt typed in Claude Code itself (inbound.js notices it is still being worked on after ~45 s) gets the same
//     meeting with Shades' own self, and the staff then sit at desks working for as long as that session keeps going.
// Which session is his comes from the office data feed (taskAgents); the mailbox also tells us a moment before
// (ns.director.expect) so the swap happens as the session appears instead of a few seconds later.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const S = ns.t({
    id: {
      awaiting: 'Rencana siap — cek surat',
      directing: (n) => `Ngarahin ${n}`,
      helping: 'Bantu Shades',
      atDesk: 'Di meja direktur',
      alwaysIn: 'Selalu di kantor',
      acting: '🎭 bantu Shades',
      open: 'Tim, ada tugas dari Komisaris.',
      quote: (t) => `“${t}”`,
      close: 'Oke, bubar. Gas!',
      reply: {
        'gus-planner': 'Aku bantu susun rencananya.',
        'iris-researcher': 'Aku cari referensinya.',
        'wren-tester': 'Nanti aku yang ngetes.',
        'pip-reviewer': 'Aku review di akhir ya.',
        'sari-writer': 'Laporannya aku rapihin.',
        'bayu-debugger': 'Kalau ada bug, serahin aku.',
      },
      ok: 'Siap, Pak!',
      handoff: (n) => (n ? `${n}, ada tugas dari Komisaris!` : 'Ada tugas dari Komisaris!'),
    },
    en: {
      awaiting: 'Plan ready — check the mail',
      directing: (n) => `Directing ${n}`,
      helping: 'Helping Shades',
      atDesk: "At the director's desk",
      alwaysIn: 'Always in the office',
      acting: '🎭 helping Shades',
      open: 'Team, a task from the Commissioner.',
      quote: (t) => `“${t}”`,
      close: "Alright, let's go!",
      reply: {
        'gus-planner': "I'll help with the plan.",
        'iris-researcher': "I'll look up references.",
        'wren-tester': "I'll test it after.",
        'pip-reviewer': "I'll review at the end.",
        'sari-writer': "I'll tidy up the report.",
        'bayu-debugger': 'Bugs? Send them my way.',
      },
      ok: 'On it, boss!',
      handoff: (n) => (n ? `${n}, a task from the Commissioner!` : 'A task from the Commissioner!'),
    },
  });

  const DIRECTOR = 'shades-director';
  const NPC_ID = 90000; // the office's own Shades
  const STAFF_BASE = 90001; // staff acting out his work: STAFF_BASE + roster index
  const MAX_ACTING = 3;
  const IDLE_AFTER_MS = 15_000; // an acting villager with no new work goes back to idling
  const LEAVE_AFTER_MS = 25_000; // …and leaves this long after Shades' session ended
  const MEETING_LINE_MS = 3200;
  const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit']);
  const READ_TOOLS = new Set(['Read', 'Grep', 'Glob', 'LS']);

  const director = () => ns.rosterEntry?.(DIRECTOR) ?? {
    agent: DIRECTOR, name: 'Shades', palette: ns.DIRECTOR_PALETTE ?? 12, director: true,
    role: { id: 'Direktur (CEO)', en: 'Director (CEO)' },
    duty: { id: 'Nerima tugas dari Komisaris (kamu), bikin rencana, ngatur tim, terus nulis laporan.', en: 'Takes tasks from the Commissioner (you), plans them, runs the team and reports back.' },
  };
  const installedStaff = () => (ns.data?.staff ?? []).filter((m) => m.installed && !m.director && Number.isInteger(m.palette));
  const directorLetters = () => (ns.data?.mail ?? []).filter((l) => l.agent === DIRECTOR);

  let claimed = null; // pixel-agents id of the session playing Shades right now
  let claimedAt = 0;
  let endedAt = 0; // when that session last ended (acting staff leave a little later)
  let expecting = null; // { until, folder, prompt, meeting } from the mailbox
  const seen = new Set(); // character ids we've already looked at for the expected session
  const acting = new Map(); // staff agent -> { id, lastWork, status, toolName }
  let directing = null; // { name, at }: Shades just handed a step to someone
  let meeting = null; // { start, lines: [{ id, text }], ids: Set, shadesId }
  let rest = { until: performance.now() + (60 + Math.random() * 120) * 1000, away: false }; // desk ↔ stroll rhythm
  let readUntil = 0;
  let courier = null; // { phase, since, deadline, agent, name, deliver, tile, seat, fx }
  let rally = null; // { until, live }: staff keep working at their desks while a Claude Code session's long task goes on

  // ── Seats ──
  const seatsOf = (office, test) => {
    const uids = new Set(office.getLayout().furniture.filter((f) => test(f.type)).map((f) => f.uid));
    return [...office.seats.keys()].filter((id) => uids.has(String(id).split(':')[0]));
  };
  const execSeat = (office) => {
    const id = seatsOf(office, (t) => t.startsWith('COZY_EXEC_CHAIR'))[0] ?? null;
    const seat = id && office.seats.get(id);
    // Nobody actually sitting there (e.g. a session left without giving it back)? Then it's free again.
    if (seat?.assigned && ![...office.characters.values()].some((c) => c.seatId === id)) seat.assigned = false;
    return id;
  };
  const freeSeats = (office, test) => seatsOf(office, test).filter((id) => !office.seats.get(id)?.assigned);
  const moveTo = (office, ch, seat) => {
    if (!seat || ch.seatId === seat) return;
    const s = office.seats.get(seat);
    if (!s || s.assigned) return;
    office.reassignSeat(ch.id, seat);
  };
  function copyPlace(from, to) {
    for (const k of ['x', 'y', 'tileCol', 'tileRow', 'dir']) to[k] = from[k];
    Object.assign(to, { path: [], moveProgress: 0, frame: 0, frameTimer: 0, matrixEffect: null, matrixEffectTimer: 0, matrixEffectSeeds: [] });
    to.state = from.state === 'walk' ? 'idle' : from.state;
  }
  const dress = (ch, staff, extra = {}) => Object.assign(ch, { asaStaff: staff, asaName: staff.name, palette: staff.palette, hueShift: 0 }, extra);

  // ── The office's own Shades ──
  function ensureShades(office) {
    let npc = office.characters.get(NPC_ID);
    if (claimed != null) {
      if (npc) { // the session is him now
        const seat = npc.seatId && office.seats.get(npc.seatId);
        if (seat) seat.assigned = false;
        office.characters.delete(NPC_ID);
      }
      return null;
    }
    if (!npc) {
      if (!office.seats?.size && !office.walkableTiles?.length) return null; // layout not loaded yet
      const seat = execSeat(office);
      office.addAgent(NPC_ID, director().palette, 0, seat ?? undefined, true);
      npc = office.characters.get(NPC_ID);
      if (!npc) return null;
      dress(npc, director(), { asaNpc: true, asaShades: true });
    }
    if (npc.palette !== director().palette) dress(npc, director());
    // Mostly at his desk; every few minutes a short walk (idle chat, activities and Pomodoro treat him like anyone).
    const now = performance.now();
    if (!meeting && !courier && now > rest.until) {
      rest = rest.away
        ? { away: false, until: now + (180 + Math.random() * 240) * 1000 }
        : { away: true, until: now + (45 + Math.random() * 75) * 1000 };
      if (rest.away) { office.setAgentActive(NPC_ID, false); office.setAgentTool(NPC_ID, null); }
    }
    if (!meeting && !courier && !rest.away) {
      if (!npc.isActive) office.setAgentActive(NPC_ID, true);
      const seat = execSeat(office);
      if (seat && npc.seatId !== seat) moveTo(office, npc, seat);
      // Alternate between typing and reading a document.
      if (now > readUntil) {
        readUntil = now + (20 + Math.random() * 40) * 1000;
        office.setAgentTool(NPC_ID, npc.currentTool ? null : 'Read');
      }
    }
    return npc;
  }

  // ── The session playing Shades ──
  function claim(office, ch) {
    const npc = office.characters.get(NPC_ID);
    dress(ch, director(), { asaDirector: true });
    if (npc && !npc.matrixEffect) {
      copyPlace(npc, ch); // he just gets to work, right where he was
      if (office.selectedAgentId === NPC_ID) office.selectedAgentId = ch.id;
    } else if (ch.matrixEffect === 'spawn') {
      Object.assign(ch, { matrixEffect: null, matrixEffectTimer: 0, matrixEffectSeeds: [] });
    }
    claimed = ch.id;
    claimedAt = performance.now();
    courier = null;
    ensureShades(office); // removes the NPC and frees its seat
    const start = expecting?.meeting ? startMeeting(office, ch, expecting.prompt) : false;
    if (!start) moveTo(office, ch, execSeat(office));
    expecting = null;
  }
  function release(office, ch) {
    claimed = null;
    courier = null;
    endedAt = performance.now();
    rest = { away: false, until: endedAt + (120 + Math.random() * 180) * 1000 };
    if (meeting) endMeeting(office, ch?.id);
    const place = ch ? { ...ch } : null;
    if (ch) {
      const seat = ch.seatId && office.seats.get(ch.seatId);
      if (seat) seat.assigned = false;
      office.characters.delete(ch.id); // skip the vanishing effect: Shades stays
    }
    const npc = ensureShades(office);
    if (npc && place) {
      copyPlace(place, npc);
      const seat = execSeat(office);
      if (npc.seatId !== seat) moveTo(office, npc, seat);
      else office.reassignSeat(NPC_ID, seat); // re-plan the walk from where he stands
    }
  }
  // The mailbox letter a session belongs to (from the data feed), and whether its task is still going.
  const letterOfChar = (id) => {
    const m = ns.data?.taskAgents?.[id];
    return m?.letter ? (ns.data?.mail ?? []).find((l) => l.id === m.letter) ?? null : null;
  };
  const liveLetter = (l) => !!l && (l.status === 'running' || l.status === 'queued');
  /** The claimed villager isn't Shades's session any more (but stays in the office as an ordinary villager). */
  function unclaim(office, ch) {
    claimed = null;
    courier = null;
    if (meeting) endMeeting(office, ch.id);
    delete ch.asaDirector;
    delete ch.asaStaff;
    delete ch.asaName;
    ensureShades(office);
  }
  function track(office) {
    const now = performance.now();
    if (claimed != null) {
      const ch = office.characters.get(claimed);
      if (!ch || ch.matrixEffect === 'despawn') release(office, ch);
      else {
        // A session that was killed or never said goodbye can linger as a ghost: it must not keep Shades "busy"
        // (no courier, no meeting) or leave a second Shades behind when the next task starts.
        const letter = letterOfChar(ch.id);
        const age = now - claimedAt;
        if (letter && !liveLetter(letter) && age > 8000) return release(office, ch);
        if (!letter && age > 120_000) return unclaim(office, ch);
        if (ch.palette !== director().palette) dress(ch, director());
      }
      return;
    }
    if (expecting && now > expecting.until) expecting = null;
    const map = ns.data?.taskAgents ?? {};
    for (const ch of office.characters.values()) {
      if (ch.isSubagent || ch.asaNpc || ch.matrixEffect === 'despawn') continue;
      if (map[ch.id]?.agent === DIRECTOR && liveLetter(letterOfChar(ch.id))) return claim(office, ch);
      if (!seen.has(ch.id)) {
        seen.add(ch.id);
        const folder = expecting?.folder;
        if (expecting && ch.matrixEffect === 'spawn' && (!ch.folderName || !folder || ch.folderName === folder)) return claim(office, ch);
      }
    }
    for (const id of seen) if (!office.characters.has(id)) seen.delete(id);
  }

  // ── Meeting at the meeting table (or the lounge sofas) ──
  function pickTeam(prompt, phasePlan) {
    const staff = installedStaff();
    const want = [];
    const t = String(prompt ?? '').toLowerCase();
    const add = (agent) => { if (!want.includes(agent)) want.push(agent); };
    if (phasePlan) add('gus-planner');
    if (/\b(bug|error|crash|rusak|gagal|fix|benerin|perbaiki)/.test(t)) add('bayu-debugger');
    if (/\b(test|tes|ngetes|qa|coba)/.test(t)) add('wren-tester');
    if (/\b(review|cek|periksa|audit|keamanan|security)/.test(t)) add('pip-reviewer');
    if (/\b(doc|dokumen|readme|tulis|nulis|changelog|laporan|artikel)/.test(t)) add('sari-writer');
    if (/\b(riset|research|cari|bandingin|compare|library|web)/.test(t)) add('iris-researcher');
    add('gus-planner');
    add('iris-researcher');
    return want.map((a) => staff.find((m) => m.agent === a)).filter(Boolean);
  }
  /** Free chairs round the meeting table (Shades takes the east head when he opens a task), nearest first; none if there's no meeting table. */
  function meetingSeats(office) {
    const tables = ns.findFurniture('COZY_MEETING_TABLE');
    if (!tables.length) return [];
    const near = (seat) => tables.some((t) => seat.seatCol >= t.col - 1 && seat.seatCol <= t.col + 3 && seat.seatRow >= t.row - 1 && seat.seatRow <= t.row + 2);
    return freeSeats(office, (t) => t.startsWith('COZY_CHAIR') && !t.startsWith('COZY_EXEC')).filter((id) => near(office.seats.get(id)));
  }
  /** Chairs that face a desk (where people work), as opposed to dining or meeting chairs. */
  function deskSeats(office) {
    const desks = ns.findFurniture('COZY_DESK_FRONT').concat(ns.findFurniture('COZY_DESK_SIDE'));
    return freeSeats(office, (t) => t.startsWith('COZY_CHAIR')).filter((id) => {
      const s = office.seats.get(id);
      return desks.some((d) => s.seatCol >= d.col - 1 && s.seatCol <= d.col + 3 && ((s.seatRow >= d.row + 1 && s.seatRow <= d.row + 3) || (s.seatRow >= d.row - 2 && s.seatRow <= d.row - 1)));
    });
  }
  function startMeeting(office, shades, prompt) {
    const atTable = ns.findFurniture('COZY_MEETING_TABLE').length > 0; // else the meeting is on the lounge sofas
    let sofas = atTable ? meetingSeats(office) : freeSeats(office, (t) => t.startsWith('COZY_SOFA'));
    // Shades takes the east head of the table (his own desk is elsewhere); the team fills the other chairs.
    let shadesSeat = null;
    if (atTable) {
      const heads = [...sofas].sort((a, b) => office.seats.get(b).seatCol - office.seats.get(a).seatCol); // the east end
      shadesSeat = heads[0] ?? sofas[0] ?? null;
      sofas = sofas.filter((id) => id !== shadesSeat);
    }
    const plan = directorLetters().some((l) => l.status === 'running' && l.phase === 'plan');
    const team = pickTeam(prompt, plan).slice(0, Math.min(MAX_ACTING, atTable ? sofas.length : sofas.length - 1));
    if (!team.length) return false;
    // A meeting is starting: make sure Shades is active and out of the desk↔stroll cycle, or the core wander
    // logic can pull him away mid-meeting (he'd be "out for a walk" instead of at the table).
    rest = { away: false, until: performance.now() + (180 + Math.random() * 240) * 1000 };
    office.setAgentActive(shades.id, true);
    if (atTable) moveTo(office, shades, shadesSeat);
    else moveTo(office, shades, sofas[0]);
    const ids = new Set([shades.id]);
    const lines = [{ id: shades.id, text: S.open }];
    const gist = String(prompt ?? '').replace(/\s+/g, ' ').trim();
    if (gist) lines.push({ id: shades.id, text: S.quote(gist.length > 22 ? `${gist.slice(0, 21)}…` : gist) });
    team.forEach((m, i) => {
      const npc = castStaff(office, m, sofas[atTable ? i : i + 1]);
      if (!npc) return;
      ids.add(npc.id);
      office.setAgentActive(npc.id, true);
      acting.get(m.agent).lastWork = performance.now() + 20_000;
      lines.push({ id: npc.id, text: S.reply[m.agent] ?? S.ok });
    });
    lines.push({ id: shades.id, text: S.close });
    meeting = { start: performance.now() + 1500, lines, ids, shadesId: shades.id };
    return true;
  }
  // ── A real meeting (task-server.mjs runMeeting): the same table and chairs, but what is said is what the letter says ──
  const clip = (t, n = 96) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x; };
  function startLiveMeeting(office, shades, letter) {
    const atTable = ns.findFurniture('COZY_MEETING_TABLE').length > 0;
    let seats = atTable ? meetingSeats(office) : freeSeats(office, (t) => t.startsWith('COZY_SOFA'));
    let shadesSeat = null;
    if (atTable) {
      const heads = [...seats].sort((a, b) => office.seats.get(b).seatCol - office.seats.get(a).seatCol);
      shadesSeat = heads[0] ?? seats[0] ?? null;
      seats = seats.filter((id) => id !== shadesSeat);
    } else shadesSeat = seats.shift() ?? null;
    // Same as startMeeting(): keep him active and out of the stroll cycle so the core wander logic doesn't
    // walk him off while the real meeting (task-server.mjs runMeeting) is going on.
    rest = { away: false, until: performance.now() + (180 + Math.random() * 240) * 1000 };
    office.setAgentActive(shades.id, true);
    if (shadesSeat) moveTo(office, shades, shadesSeat);
    meeting = { start: performance.now(), lines: [], ids: new Set([shades.id]), shadesId: shades.id, live: letter.id, seats, cast: new Set(), seen: -1, shownAt: 0 };
  }
  /** The people the letter says were called to the meeting take a chair as they are named. */
  function castLive(office, letter) {
    for (const p of letter.meeting?.participants ?? []) {
      if (meeting.cast.has(p.agent) || meeting.cast.size >= MAX_ACTING) continue;
      const staff = installedStaff().find((m) => m.agent === p.agent);
      if (!staff) continue;
      meeting.cast.add(p.agent);
      const ch = castStaff(office, staff, meeting.seats.shift());
      if (!ch) continue;
      meeting.ids.add(ch.id);
      office.setAgentActive(ch.id, true);
      acting.get(staff.agent).lastWork = performance.now() + 20_000;
    }
  }
  function tendLive(office) {
    if (meeting || courier || claimed != null) return;
    const letter = (ns.data?.mail ?? []).find((l) => l.meeting?.state === 'running' && l.status === 'running');
    const npc = office.characters.get(NPC_ID);
    if (!letter || !npc || npc.matrixEffect || npc.asaCarry) return;
    startLiveMeeting(office, npc, letter);
  }
  function drawLiveMeeting(ctx, office, offX, offY, zoom) {
    const letter = (ns.data?.mail ?? []).find((l) => l.id === meeting.live);
    if (!letter || letter.meeting?.state !== 'running') return endMeeting(office);
    castLive(office, letter);
    const now = performance.now();
    const said = (letter.thread ?? []).filter((m) => m.kind === 'meeting');
    if (said.length !== meeting.seen) { meeting.seen = said.length; meeting.shownAt = now; }
    const last = said.at(-1);
    const charOf = (agent) => office.characters.get(agent === DIRECTOR ? meeting.shadesId : acting.get(agent)?.id);
    let ch = null;
    let text = '';
    if (last && now - meeting.shownAt < 8000) { ch = charOf(last.agent); text = clip(last.text); }
    else if (letter.meeting.speaker) { ch = charOf(letter.meeting.speaker); text = '…'; }
    if (!ch || !text) return;
    const lift = ch.state === 'type' ? 10 : 0;
    ns.drawSpeech?.(ctx, offX + ch.x * zoom, offY + (ch.y + lift - 28) * zoom, zoom, { text, t: now / 1000 + ch.id });
  }
  function endMeeting(office, leaving = null) {
    const m = meeting;
    meeting = null;
    if (!m) return;
    const shades = m.shadesId !== leaving && office.characters.get(m.shadesId);
    if (shades) moveTo(office, shades, execSeat(office));
    // The team goes to proper desks for the work.
    for (const id of m.ids) {
      if (id === m.shadesId) continue;
      const desk = deskSeats(office)[0];
      const ch = office.characters.get(id);
      if (ch && desk) moveTo(office, ch, desk);
    }
  }
  function drawMeeting(ctx, office, offX, offY, zoom) {
    if (meeting.live) return drawLiveMeeting(ctx, office, offX, offY, zoom);
    const now = performance.now();
    const i = Math.floor((now - meeting.start) / MEETING_LINE_MS);
    if (i >= meeting.lines.length) return endMeeting(office);
    if (i < 0) return;
    const line = meeting.lines[i];
    const ch = office.characters.get(line.id);
    if (!ch) return;
    const lift = ch.state === 'type' ? 10 : 0;
    ns.drawSpeech?.(ctx, offX + ch.x * zoom, offY + (ch.y + lift - 28) * zoom, zoom, { text: line.text, t: now / 1000 + ch.id });
  }

  // ── Staff acting out the work ──
  function castStaff(office, staff, seat) {
    const idx = (ns.data?.staff ?? []).findIndex((m) => m.agent === staff.agent);
    const id = STAFF_BASE + Math.max(0, idx);
    let ch = office.characters.get(id);
    if (!ch || ch.matrixEffect === 'despawn') {
      if (ch) office.characters.delete(id);
      office.addAgent(id, staff.palette, 0, seat ?? undefined, false);
      ch = office.characters.get(id);
      if (!ch) return null;
      dress(ch, staff, { asaNpc: true, asaActing: true });
    } else if (seat) moveTo(office, ch, seat);
    const a = acting.get(staff.agent) ?? { id, lastWork: performance.now() };
    a.id = id;
    acting.set(staff.agent, a);
    return ch;
  }
  function whoDoes(toolName, status) {
    const s = String(status ?? '');
    const plan = directorLetters().some((l) => l.status === 'running' && l.phase === 'plan');
    if (toolName === 'Bash') {
      if (/\b(test|pytest|vitest|jest|lint|check)\b/i.test(s)) return 'wren-tester';
      if (/\bgit\b/.test(s)) return 'pip-reviewer';
      return 'bayu-debugger';
    }
    if (EDIT_TOOLS.has(toolName)) return /\.(md|mdx|txt|rst)\b/i.test(s) ? 'sari-writer' : 'bayu-debugger';
    if (toolName === 'WebSearch' || toolName === 'WebFetch') return 'iris-researcher';
    if (READ_TOOLS.has(toolName)) return plan ? 'gus-planner' : 'iris-researcher';
    if (toolName === 'TodoWrite') return 'gus-planner';
    return null;
  }
  ns.onMessage((msg) => {
    if (claimed == null || msg?.id !== claimed || msg.type !== 'agentToolStart' || typeof msg.status !== 'string') return;
    if (msg.toolName === 'Task' || msg.toolName === 'Agent') return; // a real staff member is coming
    const office = ns.view?.office;
    const agent = whoDoes(msg.toolName, msg.status);
    const staff = agent && installedStaff().find((m) => m.agent === agent);
    if (!office || !staff) return;
    // Already here for real (a sub-agent or a mailbox task of their own)? Then they don't need a stand-in.
    for (const c of office.characters.values()) if (!c.asaNpc && ns.staffOf?.(c)?.agent === agent) return;
    if (!acting.has(agent) && acting.size >= MAX_ACTING) return;
    const ch = castStaff(office, staff);
    if (!ch) return;
    Object.assign(acting.get(agent), { lastWork: Math.max(performance.now(), acting.get(agent).lastWork), status: msg.status, toolName: msg.toolName });
    office.setAgentActive(ch.id, true);
    office.setAgentTool(ch.id, msg.toolName);
    directing = { name: staff.name, at: performance.now() };
  });
  const RALLY_MAX_MS = 10 * 60_000;
  /** A long task typed in Claude Code: Shades (the office's own) calls a meeting about it; false when he can't (a mailbox task, a meeting, a delivery, no staff installed). */
  function startRally({ prompt = '', live }) {
    const office = ns.view?.office;
    const npc = office?.characters.get(NPC_ID);
    if (!office || !npc || npc.matrixEffect || npc.asaCarry || claimed != null || meeting || courier) return false;
    if (!startMeeting(office, npc, prompt)) return false;
    rally = { until: performance.now() + RALLY_MAX_MS, live: typeof live === 'function' ? live : () => false };
    return true;
  }
  function tendStaff(office) {
    const now = performance.now();
    if (rally) {
      let going = false;
      try { going = now < rally.until && !!rally.live(); } catch { /* the caller is gone */ }
      if (!going) rally = null;
    }
    for (const [agent, a] of acting) {
      if (rally && claimed == null) a.lastWork = now; // still on it: keep typing, don't leave
      const ch = office.characters.get(a.id);
      if (!ch || ch.matrixEffect === 'despawn') { acting.delete(agent); continue; }
      if (meeting?.ids.has(a.id)) continue;
      if (ch.isActive && now - a.lastWork > IDLE_AFTER_MS) {
        office.setAgentActive(a.id, false);
        office.setAgentTool(a.id, null);
        a.status = null;
      }
      if (claimed == null && now - endedAt > LEAVE_AFTER_MS && now - a.lastWork > LEAVE_AFTER_MS) {
        office.removeAgent(a.id);
        acting.delete(agent);
      }
    }
  }

  // ── What the other add-ons show for these villagers ──
  const statusText = (a) => (a?.status ? ns.translateStatus?.(a.status) ?? a.status : null);
  const actingFor = (ch) => [...acting.values()].find((a) => a.id === ch.id);
  const awaiting = () => directorLetters().some((l) => l.status === 'awaiting');
  /** Status bubble for the office's cast: null = the usual bubble, false = none, or { kind, text, waiting }. */
  ns.castBubble = (ch) => {
    if (meeting?.ids.has(ch.id)) return false;
    if (ch.asaShades || ch.asaDirector) {
      if (awaiting()) return { kind: 'waiting', text: S.awaiting, waiting: true, hold: true }; // until you answer it
      if (ch.asaDirector && directing && performance.now() - directing.at < 6000 && ch.isActive) return { kind: 'agent', text: S.directing(directing.name) };
      return ch.asaShades ? false : null;
    }
    if (ch.asaActing) {
      const a = actingFor(ch);
      return ch.isActive && a?.status ? { kind: a.toolName, text: statusText(a) } : false;
    }
    return null;
  };
  /** Villager card: [status text, colour] for the cast, or null. */
  ns.castStatus = (ch) => {
    if (ch.asaShades && ch.isActive) return [S.atDesk, '#5aa84a'];
    if (ch.asaActing && ch.isActive) {
      const t = statusText(actingFor(ch));
      return [t ? `${S.helping}: ${t}` : S.helping, '#5aa84a'];
    }
    return null;
  };
  /** Villager card: a note after the role line. */
  ns.castNote = (ch) => (ch.asaActing ? S.acting : ch.asaShades ? S.alwaysIn : '');

  // ── Courier: Shades fetches the letter from the mailbox and hands it over ──
  const UP = 3;
  const COURIER_TIMEOUT_MS = 14_000;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const arrived = (ch) => ch.path.length === 0 && ch.state !== 'walk';
  function finishCourier(office) {
    const npc = office.characters.get(NPC_ID);
    if (npc) { npc.asaBusy = false; npc.asaCarry = false; }
    courier = null;
  }
  function startCourier(spec) {
    const office = ns.view?.office;
    const npc = office?.characters.get(NPC_ID);
    if (!office || !npc || npc.matrixEffect || claimed != null || meeting || courier || reduced()) return false;
    if (!ns.findFurniture('COZY_MAILBOX')[0] || !office.walkableTiles?.length) return false;
    const now = performance.now();
    npc.asaBusy = true;
    office.setAgentActive(NPC_ID, false);
    office.setAgentTool(NPC_ID, null);
    courier = { ...spec, phase: 'wait', since: now, deadline: now + 6000 };
    return true;
  }
  function tendCourier(office) {
    if (!courier) return;
    const npc = office.characters.get(NPC_ID);
    if (!npc || claimed != null) { courier = null; return; }
    const now = performance.now();
    const go = (phase, ms = COURIER_TIMEOUT_MS) => { courier.phase = phase; courier.since = now; courier.deadline = now + ms; };
    const c = courier;
    const late = now > c.deadline;
    if (c.phase === 'wait') { // let an idle activity or chat he's in wind down first
      const busy = ns.activities?.isBusy?.(NPC_ID) || ns.idleChat?.partnerOf?.(NPC_ID) != null;
      if (busy && !late) return;
      const m = ns.findFurniture('COZY_MAILBOX')[0];
      const tile = office.closestFreeWalkableTile(m.col, m.row + 2);
      go('toMailbox');
      if (!tile || !office.walkToTile(NPC_ID, tile.col, tile.row)) go('pickup', 700);
    } else if (c.phase === 'toMailbox') {
      if ((now - c.since > 400 && arrived(npc)) || late) {
        npc.dir = UP;
        npc.asaCarry = true;
        ns.notify?.sfx?.('pickup');
        go('pickup', 800);
      }
    } else if (c.phase === 'pickup') {
      if (now < c.deadline) return;
      go('toTarget');
      if (c.agent === DIRECTOR) {
        if (ns.findFurniture('COZY_MEETING_TABLE').length) {
          // His own tasks are opened at the meeting table: back to his seat at its head.
          c.seat = execSeat(office);
          if (c.seat) { if (npc.seatId === c.seat) office.sendToSeat(NPC_ID); else moveTo(office, npc, c.seat); }
        } else {
          c.seat = freeSeats(office, (t) => t.startsWith('COZY_SOFA'))[0] ?? null;
          if (c.seat) moveTo(office, npc, c.seat);
        }
      }
      if (!c.seat) {
        // The middle of the workroom: between the desk rows, wherever the layout puts them.
        const desks = ns.findFurniture('COZY_DESK_FRONT');
        const mid = desks.length
          ? { col: Math.round(desks.reduce((a, f) => a + f.col, 0) / desks.length) + 1, row: Math.round(desks.reduce((a, f) => a + f.row, 0) / desks.length) + 3 }
          : { col: 7, row: 7 };
        const tile = office.closestFreeWalkableTile(mid.col, mid.row);
        if (!tile || !office.walkToTile(NPC_ID, tile.col, tile.row)) go('handoff', 2600);
      }
    } else if (c.phase === 'toTarget') {
      if ((now - c.since > 400 && arrived(npc)) || late) {
        npc.asaCarry = false;
        c.fx = now;
        ns.notify?.sfx?.('plan');
        c.deliver?.();
        go('handoff', 2600);
      }
    } else if (c.phase === 'handoff') {
      if (now < c.deadline) return;
      if (c.agent === DIRECTOR) go('await', 30_000); // his session takes over as soon as it appears
      else {
        moveTo(office, npc, execSeat(office));
        finishCourier(office);
      }
    } else if (c.phase === 'await') {
      if (late) {
        moveTo(office, npc, execSeat(office));
        finishCourier(office);
      }
    }
  }
  function drawCourier(ctx, office, offX, offY, zoom) {
    const npc = office.characters.get(NPC_ID);
    if (!npc) return;
    const u = Math.max(1, Math.round(zoom));
    const now = performance.now();
    const cx = offX + npc.x * zoom;
    if (npc.asaCarry) { // the letter in his hands, over his head
      const bob = Math.round(Math.sin(now / 180) * u);
      const x = Math.round(cx - 5 * u);
      const y = Math.round(offY + (npc.y - 34) * zoom + bob);
      ctx.fillStyle = '#2b1a10';
      ctx.fillRect(x - u, y - u, 12 * u, 9 * u);
      ctx.fillStyle = '#fff6dc';
      ctx.fillRect(x, y, 10 * u, 7 * u);
      ctx.fillStyle = '#c8503c';
      for (let i = 0; i < 5; i++) ctx.fillRect(x + i * u, y + i * u, u, u), ctx.fillRect(x + (9 - i) * u, y + i * u, u, u);
    }
    if (courier?.fx && now - courier.fx < 700) { // a little burst as the letter changes hands
      const k = (now - courier.fx) / 700;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#f2d070';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = (6 + 14 * k) * zoom;
        ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(offY + (npc.y - 14) * zoom + Math.sin(a) * r), 2 * u, 2 * u);
      }
      ctx.globalAlpha = 1;
    }
    if (courier?.fx && now - courier.fx < 2600 && ns.drawSpeech) {
      ns.drawSpeech(ctx, cx, offY + (npc.y - 30) * zoom, zoom, { text: S.handoff(courier.agent === DIRECTOR ? '' : courier.name), t: now / 1000 });
    }
  }

  ns.director = {
    /**
     * Shades takes the letter for a task just created on hold and hands it over, then calls `deliver()` (which tells
     * the task server to start it). Returns false when he can't (he's working, in a meeting, reduced motion…): then
     * the caller starts the task right away.
     */
    courier: ({ agent, name = '', deliver }) => startCourier({ agent, name, deliver }),
    /** The mailbox just started (or resumed) a task for Shades in `cwd`: claim the next session that appears there. */
    expect({ cwd, prompt = '', meeting: withMeeting = false }) {
      const folder = String(cwd ?? '').split(/[\\/]/).filter(Boolean).pop() ?? null;
      expecting = { until: performance.now() + 25_000, folder, prompt, meeting: withMeeting };
    },
    /** A long task is going on in Claude Code: `{ prompt, live() }`; `live` says whether it still is. Returns whether the meeting started. */
    rally: (spec) => startRally(spec ?? {}),
    id: () => claimed ?? NPC_ID,
    working: () => claimed != null,
  };

  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    if (!office?.characters) return;
    track(office);
    ensureShades(office);
    tendCourier(office);
    tendLive(office);
    tendStaff(office);
    if ((meeting || courier || office.characters.get(NPC_ID)?.asaCarry) && !editMode) {
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (meeting) drawMeeting(ctx, office, offX, offY, zoom);
      drawCourier(ctx, office, offX, offY, zoom);
      ctx.restore();
    }
  });
})();
