// asaoffice idle activities: villagers whose sessions are idle don't only chat. Now and then one gets up
// for a coffee break, read on the sofa, browse the bookshelf, warm up at the fireplace,
// look out of a window, water a plant, or pet the office pet — with a small speech bubble saying what it's doing.
// A villager that gets a task drops everything and pixel-agents walks it back to its desk.
//   ?idleActivities=off|on (remembered)   console: __asaoffice.activities.start('sofa') / .current
(() => {
  'use strict';
  const ns = window.__asaoffice;
  let enabled = ns.setting('idleActivities', ['on', 'off'], 'on') === 'on';

  const S = ns.t({
    id: { coffee: 'Rehat ngopi', sofa: 'Baca buku di sofa', books: 'Lihat-lihat rak buku', fire: 'Menghangatkan diri', window: 'Memandang ke luar', plant: 'Menyiram tanaman', pet: (n) => `Mengelus ${n}` },
    en: { coffee: 'Coffee break', sofa: 'Reading on the sofa', books: 'Browsing the bookshelf', fire: 'Warming up by the fire', window: 'Looking outside', plant: 'Watering a plant', pet: (n) => `Petting ${n}` },
  });
  const CFG = { minIdleSec: 12, checkEverySec: 3, chance: 0.3, cooldownSec: [60, 150], approachTimeoutSec: 25 };
  const DIR = { DOWN: 0, LEFT: 1, RIGHT: 2, UP: 3 };
  // Footprints (tiles) of the furniture activities use; wall items hang on rows 0–1 and are visited from below.
  const FP = {
    COZY_BARREL: [1, 2], COZY_CRATE: [1, 1], COZY_BOOKSHELF: [2, 2], COZY_FIREPLACE: [2, 2], COZY_WINDOW: [2, 2],
    COZY_BIG_PLANT: [2, 3], COZY_SUNFLOWER: [1, 2], COZY_FERN: [1, 2],
  };
  const WALL = new Set(['COZY_BOOKSHELF', 'COZY_WINDOW']);
  const GLYPH = {
    coffee: ['.#.#...', '..#.#..', '.......', '#####..', '#####.#', '#####.#', '.###...'],
    book: ['.......', '##.##..', '#.#.#..', '#.#.#..', '#.#.#..', '##.##..', '.......'],
    fire: ['...#...', '..##...', '..###..', '.####..', '.#.##..', '.####..', '..##...'],
    sun: ['...#...', '.#...#.', '..###..', '#.###.#', '..###..', '.#...#.', '...#...'],
    moon: ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..'],
    drop: ['...#...', '...#...', '..###..', '.#####.', '.#####.', '.#####.', '..###..'],
    heart: ['.......', '.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  };
  const COLOR = '#c98a2b';
  const WEIGHT = { coffee: 3, sofa: 2, books: 2, fire: 2, window: 2, plant: 1, pet: 2 };

  const rand = (a, b) => a + Math.random() * (b - a);
  const key = (c, r) => `${c},${r}`;
  const meta = new Map(); // id -> { idleSince, cooldownUntil }
  const jobs = new Map(); // id -> job
  let clock = 0;
  let lastNow = 0;
  let nextCheck = 5;

  // ── Where to stand ──
  function freeTiles(office, exceptId) {
    const walk = new Set(office.walkableTiles.map((t) => key(t.col, t.row)));
    for (const ch of office.characters.values()) if (ch.id !== exceptId) walk.delete(key(ch.tileCol, ch.tileRow));
    for (const j of jobs.values()) if (j.id !== exceptId) walk.delete(key(j.stand.col, j.stand.row));
    return walk;
  }
  const facing = (from, to) => {
    const dc = to.col - from.col;
    const dr = to.row - from.row;
    return Math.abs(dc) > Math.abs(dr) ? (dc > 0 ? DIR.RIGHT : DIR.LEFT) : dr > 0 ? DIR.DOWN : DIR.UP;
  };

  /** Stand tiles next to a furniture item, each with the direction to face it. */
  function spotsAround(f, free) {
    const [w, hgt] = FP[f.type];
    const out = [];
    if (WALL.has(f.type)) {
      for (let c = f.col; c < f.col + w; c++) if (free.has(key(c, f.row + hgt))) out.push({ col: c, row: f.row + hgt, dir: DIR.UP });
      return out;
    }
    const target = { col: f.col + (w - 1) / 2, row: f.row + (hgt - 1) / 2 };
    for (let r = f.row - 1; r <= f.row + hgt; r++) {
      for (let c = f.col - 1; c <= f.col + w; c++) {
        const inside = c >= f.col && c < f.col + w && r >= f.row && r < f.row + hgt;
        const diagonal = (c === f.col - 1 || c === f.col + w) && (r === f.row - 1 || r === f.row + hgt);
        if (!inside && !diagonal && free.has(key(c, r))) out.push({ col: c, row: r, dir: facing({ col: c, row: r }, target) });
      }
    }
    return out;
  }

  // ── Picking an activity ──
  function options(office, ch) {
    const free = freeTiles(office, ch.id);
    const furniture = office.getLayout().furniture;
    const hour = new Date().getHours();
    const byType = (...types) => furniture.filter((f) => types.includes(f.type));
    const list = [];
    const addSpots = (kind, items, glyph) => {
      const spots = items.flatMap((f) => spotsAround(f, free));
      if (spots.length) list.push({ kind, spots, glyph });
    };
    addSpots('coffee', byType('COZY_BARREL', 'COZY_CRATE'), GLYPH.coffee);
    addSpots('books', byType('COZY_BOOKSHELF'), GLYPH.book);
    addSpots('fire', byType('COZY_FIREPLACE'), GLYPH.fire);
    addSpots('window', byType('COZY_WINDOW'), hour >= 6 && hour < 18 ? GLYPH.sun : GLYPH.moon);
    addSpots('plant', byType('COZY_BIG_PLANT', 'COZY_SUNFLOWER', 'COZY_FERN'), GLYPH.drop);
    // Sofa: a free (unassigned) sofa seat reachable from a free tile next to it.
    const sofaUids = new Set(furniture.filter((f) => f.type.startsWith('COZY_SOFA')).map((f) => f.uid));
    const reserved = new Set([...jobs.values()].filter((j) => j.seat).map((j) => j.seat.uid));
    const sofaSpots = [];
    for (const seat of office.seats.values()) {
      if (seat.assigned || reserved.has(seat.uid) || !sofaUids.has(seat.uid.split(':')[0])) continue;
      for (const [dc, dr] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        if (free.has(key(seat.seatCol + dc, seat.seatRow + dr))) {
          sofaSpots.push({ col: seat.seatCol + dc, row: seat.seatRow + dr, dir: DIR.DOWN, seat });
          break;
        }
      }
    }
    if (sofaSpots.length) list.push({ kind: 'sofa', spots: sofaSpots, glyph: GLYPH.book });
    const pet = office.pets?.[0];
    if (pet) {
      const around = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dc, dr]) => ({ col: pet.tileCol + dc, row: pet.tileRow + dr }))
        .filter((t) => free.has(key(t.col, t.row)))
        .map((t) => ({ ...t, dir: facing(t, { col: pet.tileCol, row: pet.tileRow }), pet }));
      if (around.length) list.push({ kind: 'pet', spots: around, glyph: GLYPH.heart });
    }
    return list;
  }

  function pickWeighted(list) {
    let roll = Math.random() * list.reduce((a, o) => a + WEIGHT[o.kind] * (o.kind === 'fire' && isEvening() ? 2 : 1), 0);
    for (const o of list) {
      roll -= WEIGHT[o.kind] * (o.kind === 'fire' && isEvening() ? 2 : 1);
      if (roll <= 0) return o;
    }
    return list[0];
  }
  const isEvening = () => { const h = new Date().getHours(); return h >= 17 || h < 6; };

  function start(office, ch, only) {
    let list = options(office, ch);
    if (only) list = list.filter((o) => o.kind === only);
    if (!list.length) return null;
    const opt = only ? list[0] : pickWeighted(list);
    // Nearest few spots, then a random one of them, so villagers don't always pick the same tile.
    const spots = opt.spots
      .map((s) => ({ ...s, d: Math.abs(s.col - ch.tileCol) + Math.abs(s.row - ch.tileRow) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const stand of spots.sort(() => Math.random() - 0.5)) {
      const there = ch.tileCol === stand.col && ch.tileRow === stand.row;
      if (!there && !office.walkToTile(ch.id, stand.col, stand.row)) continue;
      const job = {
        id: ch.id, kind: opt.kind, glyph: opt.glyph, stand, seat: stand.seat ?? null, pet: stand.pet ?? null,
        phase: 'approach', t: 0, duration: opt.kind === 'sofa' ? rand(20, 35) : rand(10, 20),
      };
      jobs.set(ch.id, job);
      return job;
    }
    return null;
  }

  // ── Running and ending ──
  const hold = (ch) => { if (ch.state === 'idle') ch.wanderTimer = Math.max(ch.wanderTimer, 5); };

  function sitDown(ch, seat) {
    ch.tileCol = seat.seatCol;
    ch.tileRow = seat.seatRow;
    ch.x = seat.seatCol * 16 + 8;
    ch.y = seat.seatRow * 16 + 8;
    ch.dir = seat.facingDir;
    ch.path = [];
    ch.state = 'type';
    ch.frame = 0;
    ch.frameTimer = 0;
    ch.seatTimer = 999; // we end the sit ourselves
    ch.asaActivity = 'sofa';
    ch.currentTool = 'Read'; // reading pose
  }

  function standUp(office, ch, job) {
    if (ch.asaActivity === 'sofa' && ch.currentTool === 'Read') ch.currentTool = null;
    delete ch.asaActivity;
    if (ch.state === 'type' && job.phase === 'doing' && job.seat) {
      ch.state = 'idle';
      ch.seatTimer = 0;
      ch.path = [];
      if (!ch.isActive) office.walkToTile(ch.id, job.stand.col, job.stand.row); // step off the sofa
    }
  }

  function finish(office, job, { cooldown = true } = {}) {
    jobs.delete(job.id);
    const ch = office.characters.get(job.id);
    if (!ch) return;
    standUp(office, ch, job);
    const m = meta.get(job.id);
    if (m && cooldown) m.cooldownUntil = clock + rand(...CFG.cooldownSec);
    if (!ch.isActive && ch.state === 'idle' && !job.seat) {
      if (ch.seatId && Math.random() < 0.4) office.sendToSeat(ch.id);
      else ch.wanderTimer = rand(2, 5);
    }
  }

  function tick(office, job, dt) {
    const ch = office.characters.get(job.id);
    if (!ch) return jobs.delete(job.id);
    if (ch.isActive || ch.matrixEffect || ch.bubbleType === 'permission' || ns.idleChat?.partnerOf?.(ch.id) != null) {
      return finish(office, job, { cooldown: false });
    }
    job.t += dt;
    hold(ch);
    if (job.phase === 'approach') {
      const arrived = ch.tileCol === job.stand.col && ch.tileRow === job.stand.row && ch.path.length === 0 && ch.state !== 'walk';
      if (arrived) {
        job.phase = 'doing';
        job.t = 0;
        if (job.seat) {
          if (job.seat.assigned) return finish(office, job); // an agent was given this seat meanwhile
          sitDown(ch, job.seat);
        } else {
          ch.dir = job.pet ? facing(job.stand, { col: job.pet.tileCol, row: job.pet.tileRow }) : job.stand.dir;
          if (job.pet) office.showPetBubble?.(job.pet.id);
        }
      } else if (job.t > CFG.approachTimeoutSec || (ch.state === 'idle' && ch.path.length === 0)) {
        finish(office, job, { cooldown: false });
      }
      return;
    }
    if (!job.seat) ch.dir = job.pet ? facing(job.stand, { col: job.pet.tileCol, row: job.pet.tileRow }) : job.stand.dir;
    if (job.t >= job.duration) finish(office, job);
  }

  const label = (job) => (job.kind === 'pet' ? S.pet(job.pet?.name || 'pet') : S[job.kind]);

  function draw(canvas, office, offX, offY, zoom) {
    if (!ns.drawBadge) return;
    const ctx = canvas.getContext('2d');
    const t = performance.now() / 1000;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const job of jobs.values()) {
      if (job.phase !== 'doing') continue;
      const ch = office.characters.get(job.id);
      if (!ch || ch.bubbleType) continue;
      const lift = ch.state === 'type' ? 10 : 0;
      const x = offX + ch.x * zoom;
      if (ns.drawSpeech) {
        ns.drawSpeech(ctx, x, offY + (ch.y + lift - 28) * zoom, zoom, {
          glyph: job.glyph, color: COLOR, text: label(job), t: t * 0.6 + job.id,
          key: `activity:${job.id}`, hold: ns.bubbleFocused?.(ch),
        });
      }
      else ns.drawBadge(ctx, x, offY + (ch.y + lift - 25) * zoom, zoom, job.glyph, COLOR, t * 0.6 + job.id);
    }
    ctx.restore();
  }

  ns.onFrame((canvas, office, offX, offY, zoom, editMode) => {
    const now = performance.now();
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;
    clock += dt;
    for (const ch of office.characters.values()) {
      let m = meta.get(ch.id);
      if (!m) meta.set(ch.id, (m = { idleSince: null, cooldownUntil: clock + 20 }));
      if (ch.isActive) m.idleSince = null;
      else if (m.idleSince === null) m.idleSince = clock;
    }
    for (const id of meta.keys()) if (!office.characters.has(id)) meta.delete(id);

    if (!enabled || editMode || ns.pomodoro?.isBreak) { // Pomodoro break: everyone idle heads to the lounge instead
      for (const job of [...jobs.values()]) finish(office, job, { cooldown: false });
      return;
    }
    for (const job of [...jobs.values()]) tick(office, job, dt);
    if (clock >= nextCheck) {
      nextCheck = clock + CFG.checkEverySec;
      const idle = [...office.characters.values()].filter((ch) => {
        const m = meta.get(ch.id);
        return !ch.isActive && !ch.isSubagent && !ch.isGreeter && !ch.isHeadless && !ch.matrixEffect && !ch.bubbleType &&
          !jobs.has(ch.id) && ns.idleChat?.partnerOf?.(ch.id) == null && m.idleSince !== null &&
          clock - m.idleSince >= CFG.minIdleSec && clock >= m.cooldownUntil;
      });
      const limit = Math.max(1, Math.floor(office.characters.size / 2));
      if (idle.length && jobs.size < limit && Math.random() < CFG.chance) {
        const ch = idle[Math.floor(Math.random() * idle.length)];
        if (!start(office, ch)) meta.get(ch.id).cooldownUntil = clock + 20;
      }
    }
    draw(canvas, office, offX, offY, zoom);
  });

  ns.activities = {
    isBusy: (id) => jobs.has(id),
    /** Human-readable activity of villager `id` (only once it's there), else null. */
    describe: (id) => { const j = jobs.get(id); return j && j.phase === 'doing' ? label(j) : null; },
    get current() { return [...jobs.values()].map((j) => ({ id: j.id, kind: j.kind, phase: j.phase })); },
    /** Start an activity now for any idle villager (optionally a given kind), ignoring timers. */
    start(kind) {
      const office = ns.view?.office;
      if (!office) return null;
      for (const ch of office.characters.values()) {
        if (ch.isActive || ch.isSubagent || jobs.has(ch.id) || ns.idleChat?.partnerOf?.(ch.id) != null) continue;
        const job = start(office, ch, kind);
        if (job) return { id: job.id, kind: job.kind };
      }
      return null;
    },
    setEnabled(on) { enabled = !!on; ns.store.set('idleActivities', enabled ? 'on' : 'off'); },
  };
})();
