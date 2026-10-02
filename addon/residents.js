// asaoffice residents: the team lives in the office. Each installed staff member (Wren, Pip, Sari, Gus, Iris, Bayu) is a villager who is
// always around during the working day, whether or not there is a Claude Code session: they wander, have coffee, water the plants,
// read, chat and sometimes sit at a desk (idle-activities.js and idle-chat.js already do all that for any villager who isn't working).
//   - Working hours: each one comes in through the front door between 07:00 and 08:30 and heads home between 18:00 and 20:00
//     (staggered), following the office clock (the day-night preview too). Outside those hours the office is empty again.
//   - When a real session plays that staff member (a mailbox task, a sub-agent), the resident steps aside and comes back after.
//   - They are scenery: no Claude session, no tokens, and the HUD, the notifications and the counters ignore them (asaNpc).
//   - They only take a work desk while at least three are free, and give it up when a real session needs one.
//   ?residents=off turns it off (remembered).
(() => {
  'use strict';
  const ns = window.__asaoffice;
  if (ns.setting('residents', ['on', 'off'], 'on') === 'off') return;
  const S = ns.t({
    id: { note: 'Penghuni kantor: lagi santai, belum ada tugas yang dikerjakan.', status: 'Santai di kantor' },
    en: { note: 'Office resident: relaxing, nothing to work on right now.', status: 'Relaxing in the office' },
  });

  const BASE = 91000; // + roster index (director.js uses 90000+ for Shades and the stand-ins)
  const DOOR = { col: 16, row: 18 }; // just outside the front door
  const TICK_MS = 1500;
  const SIT_MS = [25_000, 70_000];
  const MIN_FREE_DESKS = 3;
  const LEAVE_TIMEOUT_MS = 40_000;

  const staff = () => (ns.data?.staff ?? []).map((m, i) => ({ ...m, idx: i })).filter((m) => m.installed && !m.director && Number.isInteger(m.palette));
  const shift = (i) => ({ in: 7 + 0.25 * i, out: 18 + 0.4 * i }); // i = 0..5 → in 07:00–08:15, out 18:00–20:00
  const hour = () => ns.dayNight?.hour?.() ?? new Date().getHours() + new Date().getMinutes() / 60;

  // ── Seats ──
  const seatList = (office) => [...office.seats.entries()].map(([id, s]) => ({ id, s }));
  function deskIds(office) {
    const desks = ns.findFurniture('COZY_DESK_FRONT').concat(ns.findFurniture('COZY_DESK_SIDE'));
    const chairs = new Set(office.getLayout().furniture.filter((f) => f.type.startsWith('COZY_CHAIR')).map((f) => f.uid));
    return new Set(seatList(office).filter(({ id, s }) => chairs.has(String(id).split(':')[0])
      && desks.some((d) => s.seatCol >= d.col - 1 && s.seatCol <= d.col + 3 && ((s.seatRow >= d.row + 1 && s.seatRow <= d.row + 3) || (s.seatRow >= d.row - 2 && s.seatRow <= d.row - 1)))).map((x) => x.id));
  }
  const free = (office, ids) => seatList(office).filter(({ id, s }) => !s.assigned && (!ids || ids(id))).map((x) => x.id);
  const pickOne = (list) => list[Math.floor(Math.random() * list.length)] ?? null;
  const nearDoor = (office) => office.walkableTiles?.find((t) => t.col === DOOR.col && t.row === DOOR.row) ?? null;

  const occupiedByReal = (office, agent, id) => {
    for (const c of office.characters.values()) {
      if (c.id === id || c.asaResident || c.matrixEffect === 'despawn' || c.isGreeter) continue;
      if (ns.staffOf?.(c)?.agent === agent) return true;
    }
    return false;
  };

  // ── Coming and going ──
  const state = new Map(); // id -> { nextSit, leaving: { at } | null }
  let first = true;

  function arrive(office, m, id) {
    const desks = deskIds(office);
    const seat = pickOne(free(office, (sid) => !desks.has(sid)));
    const door = first ? null : nearDoor(office);
    office.addAgent(id, m.palette, 0, seat ?? undefined, true);
    const ch = office.characters.get(id);
    if (!ch) return;
    Object.assign(ch, { asaNpc: true, asaResident: true, asaStaff: m, asaName: m.name });
    office.setAgentActive(id, false); // a new character starts out "working": residents are only ever relaxing
    office.setAgentTool(id, null);
    if (door) { // walks in from the front door
      Object.assign(ch, { x: door.col * 16 + 8, y: door.row * 16 + 8, tileCol: door.col, tileRow: door.row, path: [], moveProgress: 0, state: 'idle' });
      if (seat) office.sendToSeat?.(id);
    }
    state.set(id, { nextSit: performance.now() + SIT_MS[0] + Math.random() * (SIT_MS[1] - SIT_MS[0]), leaving: null });
  }

  function leave(office, id, ch, now, instant) {
    const st = state.get(id);
    if (!ch || ch.matrixEffect === 'despawn') { state.delete(id); return; }
    if (instant || !nearDoor(office)) { office.removeAgent(id); state.delete(id); return; }
    if (!st.leaving) {
      st.leaving = { at: now };
      ch.asaBusy = true; // no more coffee breaks or chats on the way out
      office.setAgentActive?.(id, false);
      office.walkToTile(id, DOOR.col, DOOR.row);
      return;
    }
    const gone = Math.abs(ch.tileCol - DOOR.col) <= 1 && Math.abs(ch.tileRow - DOOR.row) <= 1;
    if (gone || now - st.leaving.at > LEAVE_TIMEOUT_MS) { office.removeAgent(id); state.delete(id); }
  }

  // ── Sitting at a desk now and then (never taking the last free ones) ──
  function deskLife(office, now) {
    const desks = deskIds(office);
    const freeDesks = free(office, (sid) => desks.has(sid));
    const residents = [...office.characters.values()].filter((c) => c.asaResident && !state.get(c.id)?.leaving);
    for (const ch of residents) {
      const st = state.get(ch.id);
      const atDesk = desks.has(ch.seatId);
      if (atDesk && freeDesks.length < 2) { // a session needs a desk
        const other = pickOne(free(office, (sid) => !desks.has(sid)));
        if (other) { office.reassignSeat(ch.id, other); freeDesks.push(ch.seatId); }
        continue;
      }
      if (!st || now < st.nextSit || ch.isActive) continue;
      st.nextSit = now + SIT_MS[0] + Math.random() * (SIT_MS[1] - SIT_MS[0]);
      if (!atDesk && freeDesks.length >= MIN_FREE_DESKS && Math.random() < 0.5) {
        const seat = pickOne(freeDesks);
        if (seat) { office.reassignSeat(ch.id, seat); freeDesks.splice(freeDesks.indexOf(seat), 1); }
      } else if (atDesk && Math.random() < 0.5) {
        const other = pickOne(free(office, (sid) => !desks.has(sid)));
        if (other) office.reassignSeat(ch.id, other);
      }
    }
  }

  let lastTick = 0;
  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    const now = performance.now();
    if (now - lastTick < TICK_MS || !office?.seats?.size || !ns.data?.staff?.length) return;
    lastTick = now;
    const h = hour();
    const wanted = new Set();
    for (const [i, m] of staff().entries()) {
      const id = BASE + m.idx;
      wanted.add(id);
      const ch = office.characters.get(id);
      const sh = shift(i);
      const onShift = h >= sh.in && h < sh.out;
      const real = occupiedByReal(office, m.agent, id);
      if (ch && !ch.asaResident) continue; // not ours
      if (!ch) {
        if (onShift && !real && !editMode) arrive(office, m, id);
      } else if (real) leave(office, id, ch, now, true);
      else if (!onShift) leave(office, id, ch, now, false);
      else if (ch.asaStaff !== m) ch.asaStaff = m; // keeps the renamed look up to date
    }
    // A staff member who isn't installed any more: nobody to play.
    for (const c of [...office.characters.values()]) if (c.asaResident && !wanted.has(c.id)) { office.removeAgent(c.id); state.delete(c.id); }
    first = false;
    deskLife(office, now);
  });

  // ── What the other add-ons show for them ──
  const prevBubble = ns.castBubble;
  const prevStatus = ns.castStatus;
  const prevNote = ns.castNote;
  ns.castBubble = (ch) => (ch.asaResident ? false : prevBubble?.(ch) ?? null);
  ns.castStatus = (ch) => (ch.asaResident ? [S.status, '#8a7a68'] : prevStatus?.(ch) ?? null);
  ns.castNote = (ch) => (ch.asaResident ? S.note : prevNote?.(ch) ?? '');
  ns.residents = { ids: (office) => [...(office?.characters.values() ?? [])].filter((c) => c.asaResident).map((c) => c.id) };
})();
