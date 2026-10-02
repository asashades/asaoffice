// Scheduled tasks: "every Monday 09:00, check the project's status and write a report". Stored in
// ~/.pixel-agents/asaoffice-schedules.json; the task server (task-server.mjs) checks them every half minute while the office runs.
//   - A schedule only ever READS: mode "report" (read-only, the default) or "plan" (a read-only plan that waits for approval),
//     never commits, never edits on its own.
//   - If the office was off or the Mac asleep at the time, it runs once when the office comes back, as long as the missed time
//     was less than 12 hours ago (older ones are skipped, so an old task never springs up out of nowhere).
//   - One fire per scheduled time: `lastFor` remembers which occurrence was handled.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const MAX_SCHEDULES = 20;
export const CATCH_UP_MS = 12 * 3600_000;
export const SCHEDULE_MODES = ['report', 'plan'];
const MAX_TITLE = 60;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const file = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-schedules.json');

export function loadSchedules() {
  try {
    const list = JSON.parse(fs.readFileSync(file(), 'utf8'));
    return Array.isArray(list) ? list.slice(0, MAX_SCHEDULES) : [];
  } catch {
    return [];
  }
}

export function saveSchedules(list) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(`${file()}.tmp`, JSON.stringify(list, null, 2));
  fs.renameSync(`${file()}.tmp`, file());
}

/** A clean schedule from untrusted input, or null. `maxPrompt` and `knownCwd(cwd)` come from the task server. */
export function cleanSchedule(input, { maxPrompt, knownCwd, agents }) {
  const b = input ?? {};
  const prompt = String(b.prompt ?? '').trim();
  if (!prompt || prompt.length > maxPrompt) return null;
  if (!knownCwd(b.cwd)) return null;
  const time = String(b.time ?? '');
  if (!TIME.test(time)) return null;
  const agent = b.agent ? String(b.agent) : null;
  if (agent && !agents.includes(agent)) return null;
  const days = Array.isArray(b.days) ? [...new Set(b.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [];
  const title = String(b.title ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE) || prompt.split('\n')[0].replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE);
  return {
    title, prompt, cwd: String(b.cwd), agent, time, days, // days: 0 = Sunday … 6 = Saturday; empty = every day
    mode: SCHEDULE_MODES.includes(b.mode) ? b.mode : 'report', enabled: b.enabled !== false,
  };
}

export const newSchedule = (clean) => ({ id: crypto.randomUUID().slice(0, 8), ...clean, createdAt: new Date().toISOString(), lastFor: null, lastRunAt: null, lastLetter: null });

/** The most recent time this schedule was due at or before `now` (a Date), or null (looks back at most a week). */
export function lastDue(s, now = new Date()) {
  const [hh, mm] = String(s.time).split(':').map(Number);
  for (let back = 0; back <= 7; back++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back, hh, mm, 0, 0);
    if (d > now) continue;
    if (s.days?.length && !s.days.includes(d.getDay())) continue;
    return d;
  }
  return null;
}

/** The next time it is due after `now`, or null (when it can't happen). */
export function nextDue(s, now = new Date()) {
  const [hh, mm] = String(s.time).split(':').map(Number);
  for (let ahead = 0; ahead <= 8; ahead++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead, hh, mm, 0, 0);
    if (d <= now) continue;
    if (s.days?.length && !s.days.includes(d.getDay())) continue;
    return d;
  }
  return null;
}

/**
 * What to do with a schedule right now: 'fire' (due, within the catch-up window, not yet handled), 'skip' (a missed time that is
 * too old: mark it handled without running), or null (nothing to do).
 */
export function dueAction(s, now = new Date()) {
  if (!s.enabled) return null;
  const due = lastDue(s, now);
  if (!due) return null;
  const stamp = due.toISOString();
  if (s.lastFor && s.lastFor >= stamp) return null;
  return { action: now - due <= CATCH_UP_MS ? 'fire' : 'skip', stamp };
}
