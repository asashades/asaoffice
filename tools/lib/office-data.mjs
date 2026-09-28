// Feeds the office's addon panels (calendar, Holo-board, task board) and villager identities (staff roster,
// which staff member each sub-agent is) while `npm run office` runs. Writes one JSON
// file into the webview's static folder, named after a hash of the server's token: pixel-agents serves
// static files without checking the token, so only someone who already holds the office URL can find
// it. The file is deleted when the office stops.
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ClaudeStats } from './claude-stats.mjs';

const STATS_EVERY_MS = 60_000;
const SPAWNS_EVERY_MS = 4_000; // sub-agents are often short-lived, so their staff identity is looked up quickly
const CALENDAR_EVERY_MS = 5 * 60_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The addon computes the same name from the ?token= in its URL. */
export function dataFileName(token) {
  return `${crypto.createHash('sha256').update(token).digest('hex').slice(0, 32)}.json`;
}

async function waitForToken(pid, port, timeoutMs = 30_000) {
  const file = path.join(os.homedir(), '.pixel-agents', 'servers', `${pid}-${port}.json`);
  for (const end = Date.now() + timeoutMs; Date.now() < end; await sleep(500)) {
    try {
      const token = JSON.parse(fs.readFileSync(file, 'utf8')).token;
      if (typeof token === 'string' && token) return token;
    } catch { /* not written yet */ }
  }
  return null;
}

function readCalendar(script, mayRequest) {
  if (process.platform !== 'darwin') return Promise.resolve({ status: 'unsupported', events: [] });
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 4);
  const sec = (d) => String(Math.floor(d.getTime() / 1000));
  const args = ['-l', 'JavaScript', script, sec(start), sec(end), mayRequest ? '1' : '0'];
  const range = { start: start.toISOString(), end: end.toISOString() };
  return new Promise((resolve) => {
    execFile('osascript', args, { timeout: 150_000, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      const message = (String(stderr || err?.message || '').trim().split('\n').pop() || '').slice(0, 300);
      if (err) return resolve({ status: 'error', message, events: [], range });
      try {
        resolve({ ...JSON.parse(stdout), range });
      } catch {
        resolve({ status: 'error', message: 'unreadable osascript output', events: [], range });
      }
    });
  });
}

/**
 * Starts the writer for the server child `pid` on `port`. Returns a stop() that removes the file.
 * Options: calendar (default true) — set OFFICE_CALENDAR=off to never touch Calendar.
 */
export async function startOfficeData({ root, webviewDir, pid, port, calendar = true, log = console.log }) {
  const token = await waitForToken(pid, port);
  if (!token) {
    log('[asaoffice] office data: server token not found; calendar and Holo-board stay empty.');
    return () => {};
  }
  const dir = path.join(webviewDir, 'asaoffice', 'data');
  fs.mkdirSync(dir, { recursive: true });
  // Leftovers from offices that didn't shut down cleanly (live ones rewrite theirs every minute).
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    try { if (Date.now() - fs.statSync(p).mtimeMs > 10 * 60_000) fs.rmSync(p, { force: true }); } catch { /* raced */ }
  }
  const file = path.join(dir, dataFileName(token));
  const script = path.join(root, 'tools', 'lib', 'mac-calendar.js');

  const stats = new ClaudeStats();
  const data = {
    version: 1, generatedAt: null, stats: null, tasks: [], subagents: {}, staff: [],
    calendar: { status: calendar ? 'loading' : 'off', events: [] },
  };
  // Staff roster, with which members are installed as Claude Code subagents (npm run staff).
  const rosterFile = path.join(root, 'staff', 'roster.json');
  const readStaff = () => {
    try {
      const agentsDir = path.join(os.homedir(), '.claude', 'agents');
      return JSON.parse(fs.readFileSync(rosterFile, 'utf8')).staff.map((m) => ({
        ...m, installed: fs.existsSync(path.join(agentsDir, `${m.agent}.md`)),
      }));
    } catch {
      return [];
    }
  };
  const write = () => {
    data.generatedAt = new Date().toISOString();
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  };

  let stopped = false;
  const refreshStats = () => {
    try {
      data.stats = stats.scan();
      data.tasks = stats.tasks();
      data.subagents = stats.spawns();
      data.staff = readStaff();
      lastSpawns = stats.spawnsVersion;
      write();
    } catch (err) {
      log(`[asaoffice] office data: stats failed: ${err.message}`);
    }
  };
  let lastSpawns = -1;
  const refreshSpawns = () => {
    try {
      stats.scan();
      if (stats.spawnsVersion === lastSpawns) return;
      lastSpawns = stats.spawnsVersion;
      data.subagents = stats.spawns();
      write();
    } catch { /* the minute refresh reports errors */ }
  };
  let firstCalendar = true;
  const refreshCalendar = async () => {
    const result = await readCalendar(script, firstCalendar);
    if (stopped) return;
    if (firstCalendar || result.status !== data.calendar.status) {
      const hint = result.status === 'ok'
        ? `${result.events.length} events`
        : result.status === 'error'
          ? result.message || 'unknown error'
          : 'allow it in System Settings → Privacy & Security → Calendars';
      log(`[asaoffice] calendar: ${result.status} (${hint})`);
    }
    firstCalendar = false;
    data.calendar = { ...result, updatedAt: new Date().toISOString() };
    write();
  };

  refreshStats();
  const timers = [setInterval(refreshStats, STATS_EVERY_MS), setInterval(refreshSpawns, SPAWNS_EVERY_MS)];
  if (calendar) {
    refreshCalendar();
    timers.push(setInterval(refreshCalendar, CALENDAR_EVERY_MS));
  }
  log('[asaoffice] office data: calendar + Holo-board feed running.');

  return () => {
    stopped = true;
    timers.forEach(clearInterval);
    fs.rmSync(file, { force: true });
  };
}
