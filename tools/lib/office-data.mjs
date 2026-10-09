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
import { loadArchive } from './archive.mjs';
import { loadNames } from './names.mjs';
import { wornLooks } from './shop.mjs';
import { startTaskServer } from './task-server.mjs';
import * as journal from './journal.mjs';
import * as vaultMod from './vault.mjs';

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
 * Starts the writer for the server child `pid` on `port`, and the office task API (task-server.mjs). Returns a
 * stop() that removes the file and stops running tasks.
 * Options: calendar (default true) — set OFFICE_CALENDAR=off to never touch Calendar; tasks (default true) —
 * OFFICE_TASKS=off; taskPort (default port + 1); workspace (always allowed as a task folder).
 */
export async function startOfficeData({ root, webviewDir, pid, port, calendar = true, tasks = true, taskPort, workspace, log = console.log }) {
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
  const stateFile = path.join(os.homedir(), '.pixel-agents', 'standalone-state.json');
  const agentSessions = () => {
    const out = {};
    try { for (const a of JSON.parse(fs.readFileSync(stateFile, 'utf8')).agents ?? []) if (a.sessionId) out[a.id] = a.sessionId; } catch { /* no state yet */ }
    return out;
  };
  const data = {
    version: 1, generatedAt: null, schedules: [], names: loadNames(), looks: wornLooks(), archive: loadArchive(), stats: null, tasks: [], sessions: [], runs: [], subagents: {}, staff: [], mail: [], taskAgents: {}, agentSessions: {}, budget: null, taskServer: null,
    calendar: { status: calendar ? 'loading' : 'off', events: [] },
  };
  // Staff roster, with which members are installed as Claude Code subagents (npm run staff).
  const rosterFile = path.join(root, 'staff', 'roster.json');
  const readStaff = () => {
    try {
      const agentsDir = path.join(os.homedir(), '.claude', 'agents');
      const chosen = loadNames().staff;
      return JSON.parse(fs.readFileSync(rosterFile, 'utf8')).staff.map((m) => ({
        ...m, name: (!m.director && chosen[m.agent]) || m.name, baseName: m.name, installed: fs.existsSync(path.join(agentsDir, `${m.agent}.md`)),
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
      data.sessions = stats.listSessions();
      data.subagents = stats.spawns();
      data.runs = stats.runs();
      data.staff = readStaff();
      data.names = loadNames();
      data.looks = wornLooks();
      data.archive = loadArchive();
      lastSpawns = stats.spawnsVersion;
      write();
    } catch (err) {
      log(`[asaoffice] office data: stats failed: ${err.message}`);
    }
  };
  let lastSpawns = -1;
  let taskApi = null;
  const refreshSpawns = () => {
    try {
      stats.scan();
      let changed = false;
      if (stats.spawnsVersion !== lastSpawns) {
        lastSpawns = stats.spawnsVersion;
        data.subagents = stats.spawns();
        data.runs = stats.runs();
        changed = true;
      }
      const sessions = stats.listSessions();
      if (JSON.stringify(sessions) !== JSON.stringify(data.sessions)) {
        data.sessions = sessions;
        changed = true;
      }
      // Which Claude Code session each villager plays (so a toast can open that session's chat).
      const bySession = agentSessions();
      if (JSON.stringify(bySession) !== JSON.stringify(data.agentSessions)) {
        data.agentSessions = bySession;
        changed = true;
      }
      if (taskApi) {
        const budget = taskApi.budget?.() ?? null;
        if (JSON.stringify(budget) !== JSON.stringify(data.budget)) { data.budget = budget; changed = true; }
        const map = taskApi.agentMap();
        if (JSON.stringify(map) !== JSON.stringify(data.taskAgents)) {
          data.taskAgents = map;
          changed = true;
        }
      }
      if (changed) write();
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
  if (tasks) {
    try {
      // The daily report (journal.mjs): the office drafts the day from the tasks and sessions; the Commissioner words it and saves, and only then it goes into the journal note.
      const dayData = (text) => {
        const date = journal.parseDay(text);
        if (!date) return null;
        const letters = taskApi?.letters?.() ?? [];
        return { date, letters, spend: taskApi?.spendOn?.(journal.dayKey(date)) ?? null };
      };
      taskApi = await startTaskServer({
        journal: {
          config: journal.getConfig, setConfig: journal.setConfig, todayRel: () => journal.noteRel(new Date()), vault: () => vaultMod.usable(),
          day: (text) => { const d = dayData(text); return d && { ...journal.dayView({ date: d.date, stats, letters: d.letters, spend: d.spend }), vault: vaultMod.usable().reason }; },
          save: (text, payload) => { const d = dayData(text); return d ? journal.saveDay({ date: d.date, stats, letters: d.letters, spend: d.spend, payload }) : null; },
        },
        root, token, officePort: Number(port), port: taskPort ?? Number(port) + 1,
        projects: () => stats.projects(), sessions: () => stats.listSessions(300, 365), extraDirs: [workspace], log,
        onNamesChange: () => refreshStats(),
        onChange: () => {
          const chosen = loadNames().staff;
          data.schedules = taskApi?.schedules?.() ?? [];
          data.mail = (taskApi?.letters() ?? []).map((l) => (l.agent && chosen[l.agent] ? { ...l, name: chosen[l.agent] } : l));
          data.taskAgents = taskApi?.agentMap() ?? {};
          data.budget = taskApi?.budget?.() ?? null;
          write();
        },
      });
      data.taskServer = { port: taskApi.port };
      data.schedules = taskApi.schedules?.() ?? [];
      data.mail = (taskApi.letters() ?? []).map((l) => (l.agent && loadNames().staff[l.agent] ? { ...l, name: loadNames().staff[l.agent] } : l));
      write();
    } catch (err) {
      log(`[asaoffice] tasks: couldn't start (${err.message}); the mailbox is read-only.`);
    }
  }
  const timers = [setInterval(refreshStats, STATS_EVERY_MS), setInterval(refreshSpawns, SPAWNS_EVERY_MS)];
  if (calendar) {
    refreshCalendar();
    timers.push(setInterval(refreshCalendar, CALENDAR_EVERY_MS));
  }
  log('[asaoffice] office data: calendar + Holo-board feed running.');

  return () => {
    stopped = true;
    timers.forEach(clearInterval);
    taskApi?.stop();
    fs.rmSync(file, { force: true });
  };
}
