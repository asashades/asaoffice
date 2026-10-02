// asaoffice identity: who each villager is. Loaded right after core.js; the other add-ons use its names.
//   - Thirteen villagers, one per palette: 0–5 are the overlay's (Asa … Juno), 6–11 the pack's (Wren … Bayu),
//     12 is Shades, the director (see director.js), whose face no ordinary session ever gets.
//   - Staff (staff/roster.json, installed with `npm run staff`) are Claude Code subagents played by villagers 7–12.
//     When a session calls one ("minta Wren ngetes"), the spawned sub-agent takes that villager's face and name,
//     and while staff are installed, ordinary sessions never get a staff member's face.
//   - Ordinary sessions get distinct faces while there are enough to go around; after that a face repeats with a
//     different hue and a number ("Asa 2") instead of an identical twin.
//   - Other sub-agents keep their parent's look with a shifted hue and are called "<parent> · Asisten"
//     (or "<parent> · <subagent type>", e.g. "Asa · Explore").
// Which subagent type a sub-agent is comes from the office data feed (tools/lib/office-data.mjs → subagents),
// matched by the Agent tool call's id.
(() => {
  'use strict';
  const ns = window.__asaoffice;
  const S = ns.t({ id: { helper: 'Asisten', calledBy: (n) => `dipanggil ${n}` }, en: { helper: 'Helper', calledBy: (n) => `called by ${n}` } });

  ns.VILLAGERS = ['Asa', 'Rowan', 'Clem', 'Theo', 'Mabel', 'Juno', 'Wren', 'Pip', 'Sari', 'Gus', 'Iris', 'Bayu', 'Shades'];
  ns.DIRECTOR_PALETTE = 12;
  const COUNT = ns.VILLAGERS.length;
  /** An ordinary face's name: the one the Commissioner chose (data feed), else the built-in one. */
  const faceName = (p) => ns.data?.names?.palette?.[String(((p ?? 0) % COUNT + COUNT) % COUNT)] ?? ns.VILLAGERS[((p ?? 0) % COUNT + COUNT) % COUNT];
  ns.faceName = faceName;
  // What the shop sold: the outfit colour (hue shift) and title a face wears, from the data feed ({ <palette>: { hue, title } }).
  const look = (p) => ns.data?.looks?.[String(p)] ?? null;
  const outfitHue = (p) => look(p)?.hue ?? 0;
  const TITLES = ns.t({
    id: { gardener: 'Tukang Kebun', chef: 'Chef', sir: 'Sir', dr: 'Dr.', captain: 'Kapten', maestro: 'Maestro' },
    en: { gardener: 'Gardener', chef: 'Chef', sir: 'Sir', dr: 'Dr.', captain: 'Captain', maestro: 'Maestro' },
  });
  ns.titleLabels = TITLES;
  ns.outfitHue = outfitHue;
  const pick = (v) => (v && typeof v === 'object' ? v[ns.lang] ?? v.en ?? '' : v ?? '');

  const assigned = new Map(); // main villager id -> { palette, hueShift }
  const subs = new Map(); // sub-agent id -> { staff, type, parentId, since }
  let reservedKey = '';
  let lastRefresh = 0;

  const staffList = () => (ns.data?.staff ?? []).filter((m) => m.installed && Number.isInteger(m.palette));
  const staffByAgent = (type) => staffList().find((m) => m.agent === type) ?? null;
  const staffByName = (name) => {
    if (!name) return null;
    const n = String(name).toLowerCase();
    return staffList().find((m) => m.agent === n || m.name.toLowerCase() === n) ?? null;
  };

  /** Staff entry for a villager (sub-agent spawned as staff, or an Agent Teams teammate named after one), or null. */
  /** A main session started from the office mailbox as a staff member (`claude -p --agent …`), from the data feed. */
  const taskStaff = (ch) => {
    const agent = ns.data?.taskAgents?.[ch.id]?.agent;
    const staff = agent ? staffByAgent(agent) : null;
    // Shades is one person: only the session he plays right now wears his face (a ghost of an old task doesn't).
    return staff?.director && ns.director?.id?.() !== ch.id ? null : staff;
  };
  const mainStaff = (ch) => taskStaff(ch) ?? staffByName(ch.agentName);
  // Villagers the office plays itself (director.js: Shades, and staff acting out his work) carry their staff entry.
  const cast = (ch) => ch.asaNpc || ch.asaDirector;
  ns.staffOf = (ch) => (ch ? (cast(ch) ? ch.asaStaff ?? null : ch.isSubagent ? subs.get(ch.id)?.staff ?? null : mainStaff(ch)) : null);
  /** Roster entry for an agent, installed or not (the director is in the office either way). */
  ns.rosterEntry = (agent) => (ns.data?.staff ?? []).find((m) => m.agent === agent) ?? null;
  ns.staffRole = (m) => pick(m?.role);
  ns.staffDuty = (m) => pick(m?.duty);
  ns.portraitUrl = (ch) => `./asaoffice/characters/char_${(((ch?.palette ?? 0) % COUNT) + COUNT) % COUNT}.png`;

  const plainName = (ch) => {
    if (!ch) return '';
    const staff = ns.staffOf(ch);
    if (staff) return staff.name;
    if (cast(ch)) {
      const fresh = ch.asaStaff && !ch.asaStaff.director ? ns.rosterEntry(ch.asaStaff.agent) : null; // follows a rename
      return fresh?.name ?? ch.asaName ?? faceName(ch.palette);
    }
    const office = ns.view?.office;
    if (ch.isSubagent) {
      const parent = office?.characters.get(ch.parentAgentId);
      const parentName = parent ? ns.villagerName(parent) : faceName(ch.palette);
      const type = subs.get(ch.id)?.type;
      return `${parentName} · ${type && type !== 'general-purpose' ? type : S.helper}`;
    }
    const base = faceName(ch.palette);
    if (!office || !ch.hueShift) return base;
    // A repeated face: number it by arrival among the villagers sharing that palette.
    const twins = [...office.characters.values()]
      .filter((c) => !c.isSubagent && !cast(c) && c.palette === ch.palette && !ns.staffOf(c))
      .sort((a, b) => a.id - b.id);
    const n = twins.findIndex((c) => c.id === ch.id);
    return n > 0 ? `${base} ${n + 1}` : base;
  };
  // A title bought in the shop goes in front of the name of a face (not a helper's, and not Shades').
  ns.villagerName = (ch) => {
    const name = plainName(ch);
    if (!ch || ch.isSubagent || ch.asaShades || ch.asaDirector || ch.palette === ns.DIRECTOR_PALETTE) return name;
    const title = TITLES[look(ch.palette)?.title];
    return title ? `${title} ${name}` : name;
  };
  ns.subagentCaller = (ch) => {
    const parent = ch?.isSubagent ? ns.view?.office?.characters.get(ch.parentAgentId) : null;
    return parent ? S.calledBy(ns.villagerName(parent)) : '';
  };

  // ── Faces for ordinary sessions ──
  function assignMains(office, reserved) {
    const mains = [...office.characters.values()].filter((c) => !c.isSubagent && !cast(c) && !mainStaff(c)).sort((a, b) => a.id - b.id);
    for (const id of assigned.keys()) if (!office.characters.has(id)) assigned.delete(id);
    const free = [...Array(COUNT).keys()].filter((p) => !reserved.has(p));
    const used = new Map(); // palette -> count
    const take = (p) => used.set(p, (used.get(p) ?? 0) + 1);
    // Keep existing assignments (stable faces) unless they became reserved.
    for (const ch of mains) {
      const a = assigned.get(ch.id);
      if (a && !reserved.has(a.palette)) take(a.palette);
      else assigned.delete(ch.id);
    }
    for (const ch of mains) {
      if (assigned.has(ch.id)) continue;
      let palette = ch.palette ?? 0;
      if (reserved.has(palette) || (used.get(palette) ?? 0) > 0) {
        // Least-used allowed palette; ties go to the lowest index so faces fill up in order.
        palette = free.reduce((best, p) => ((used.get(p) ?? 0) < (used.get(best) ?? 0) ? p : best), free[0] ?? 0);
      }
      const repeat = (used.get(palette) ?? 0) > 0;
      assigned.set(ch.id, { palette, hueShift: repeat ? 45 + ((ch.id * 67) % 271) : 0 });
      take(palette);
    }
    for (const ch of mains) {
      const a = assigned.get(ch.id);
      if (ch.palette !== a.palette) ch.palette = a.palette;
      const hue = (a.hueShift + outfitHue(a.palette)) % 360; // the shop's outfit colour on top of the repeat-face shift
      if ((ch.hueShift ?? 0) !== hue) ch.hueShift = hue;
    }
  }

  // ── Sub-agents: staff or helper ──
  function resolveSubs(office) {
    const now = performance.now();
    let waiting = false;
    for (const ch of office.characters.values()) {
      if (!ch.isSubagent) continue;
      let s = subs.get(ch.id);
      if (!s) subs.set(ch.id, (s = { staff: null, type: null, parentId: ch.parentAgentId, since: now }));
      if (!s.type) {
        const toolId = office.subagentMeta?.get?.(ch.id)?.parentToolId;
        const type = toolId ? ns.data?.subagents?.[toolId] : null;
        if (type) {
          s.type = type;
          s.staff = staffByAgent(type);
        } else if (now - s.since < 45_000) waiting = true;
      }
      if (s.staff) {
        if (ch.palette !== s.staff.palette) ch.palette = s.staff.palette;
        const hue = outfitHue(s.staff.palette);
        if ((ch.hueShift ?? 0) !== hue) ch.hueShift = hue;
      } else {
        const parent = office.characters.get(ch.parentAgentId);
        const palette = parent?.palette ?? ch.palette;
        const hue = ((parent?.hueShift ?? 0) + 150) % 360;
        if (ch.palette !== palette) ch.palette = palette;
        if (ch.hueShift !== hue) ch.hueShift = hue;
      }
    }
    for (const id of subs.keys()) if (!office.characters.has(id)) subs.delete(id);
    // A new sub-agent we can't place yet: ask for fresh data (the feed rescans transcripts every few seconds).
    if (waiting && now - lastRefresh > 2500) {
      lastRefresh = now;
      ns.refreshData?.();
    }
  }

  ns.onFrame((canvas, office) => {
    const reserved = new Set([...staffList().map((m) => m.palette), ns.DIRECTOR_PALETTE]);
    const key = [...reserved].sort().join(',');
    if (key !== reservedKey) {
      reservedKey = key;
      assigned.clear(); // the set of staff faces changed: re-deal ordinary faces once
    }
    resolveSubs(office);
    assignMains(office, reserved);
    // Staff sessions started from the mailbox, and Agent Teams teammates named after a staff member, wear that villager's face too.
    for (const ch of office.characters.values()) {
      const staff = !ch.isSubagent && !cast(ch) && mainStaff(ch);
      if (staff && ch.palette !== staff.palette) ch.palette = staff.palette;
      if (staff && (ch.hueShift ?? 0) !== outfitHue(staff.palette)) ch.hueShift = outfitHue(staff.palette);
      // The villagers the office plays itself (director.js) wear what the staff member wears, except Shades.
      else if (!ch.isSubagent && cast(ch) && !ch.asaShades && !ch.asaDirector && ch.asaStaff && !ch.asaStaff.director && (ch.hueShift ?? 0) !== outfitHue(ch.palette)) ch.hueShift = outfitHue(ch.palette);
    }
  });
})();
