// Claude Code activity for the office, read from the session transcripts in ~/.claude/projects.
// Files are read incrementally (only bytes appended since the last scan); only assistant lines with a
// tool_use block and session-title lines are parsed.
//   snapshot() — daily counts for the Holo-board: tool calls, token usage, models (counts only: no paths,
//                prompts or project names)
//   tasks()    — the task board: each session active in the last day with its title, last prompt,
//                project folder name, today's tool calls and edited files, and its TodoWrite list if any
//   listSessions() — every main session of the last weeks (also chat-only ones): id, title, first and last prompt,
//                folder and how recently it was active, for the mailbox's "Semua sesi" tab
//   runs()     — the sub-agents of the last day (type, task description, when, folder) for the HUD's history tab
//   spawns()   — { toolUseId: subagent_type } for Agent/Task calls in the last few hours, so the office can
//                tell which staff member (staff/roster.json) a freshly spawned sub-agent is
import { isOfficeWorktree } from './worktree.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const KIND = {
  Edit: 'edit', MultiEdit: 'edit', Write: 'edit', NotebookEdit: 'edit',
  Read: 'search', Grep: 'search', Glob: 'search', LS: 'search',
  Bash: 'command', BashOutput: 'command',
  WebFetch: 'web', WebSearch: 'web',
  Task: 'agent', Agent: 'agent',
};
const KINDS = ['edit', 'search', 'command', 'web', 'agent', 'other'];
const CHUNK = 4 * 1024 * 1024;
const SPAWN_TTL_MS = 6 * 3600_000;
const RUN_TTL_MS = 24 * 3600_000;

export function localDay(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** A throw-away folder (the system temp dirs, /tmp): a session that ran there is not a project the office should offer for new tasks. */
export function isTempDir(cwd) {
  if (typeof cwd !== 'string' || !cwd) return false;
  const bases = ['/tmp', '/private/tmp', '/var/folders', '/private/var/folders', os.tmpdir()];
  return bases.some((b) => cwd === b || cwd.startsWith(b.endsWith('/') ? b : `${b}/`));
}

export class ClaudeStats {
  constructor({ root = path.join(os.homedir(), '.claude', 'projects'), days = 45 } = {}) {
    this.root = root;
    this.days = days;
    this.files = new Map(); // path -> { offset, rest: Buffer }
    this.perDay = new Map(); // day -> { tools, edit..., sessions: Set, files: Set, hours: number[24] }
    this.sessions = new Map(); // sessionId -> { title, aiTitle, project, lastAt, todos, todosAt }
    this.spawnMap = new Map(); // tool_use id -> { type, at }
    this.runLog = new Map(); // tool_use id -> { type, description, at, project }
    this.spawnsVersion = 0;
  }

  session(id) {
    let s = this.sessions.get(id);
    if (!s) {
      s = { title: null, aiTitle: null, prompt: null, first: null, main: false, fileAt: 0, project: null, lastAt: 0, todos: null, todosAt: 0, day: null, tools: 0, files: new Set() };
      this.sessions.set(id, s);
    }
    return s;
  }

  day(key) {
    let d = this.perDay.get(key);
    if (!d) {
      d = {
        tools: 0, sessions: new Set(), files: new Set(), hours: new Array(24).fill(0),
        tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, models: new Map(), messages: new Set(), bySession: new Map(), // sessionId -> { edit, search, … } (what each session did that day)
      };
      for (const k of KINDS) d[k] = 0;
      this.perDay.set(key, d);
    }
    return d;
  }

  listTranscripts(dir, cutoffMs, out = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) this.listTranscripts(p, cutoffMs, out);
      else if (e.name.endsWith('.jsonl')) {
        try { if (this.files.has(p) || fs.statSync(p).mtimeMs >= cutoffMs) out.push(p); } catch { /* gone */ }
      }
    }
    return out;
  }

  handleLine(line, cutoffMs) {
    if (line.includes('"type":"user"') && !line.includes('"type":"tool_result"') && !line.includes('"isMeta":true') && !line.includes('"isSidechain":true')) {
      return this.handleAsk(line);
    }
    if (line.includes('"type":"custom-title"') || line.includes('"type":"ai-title"') || line.includes('"type":"last-prompt"')) {
      return this.handleTitle(line);
    }
    if (!line.includes('"type":"assistant"')) return;
    const hasTool = line.includes('"type":"tool_use"');
    if (!hasTool && !line.includes('"usage"')) return;
    let rec;
    try { rec = JSON.parse(line); } catch { return; }
    if (rec.type !== 'assistant' || !rec.timestamp) return;
    const ts = new Date(rec.timestamp);
    if (!(ts.getTime() >= cutoffMs)) return;
    const blocks = Array.isArray(rec.message?.content) ? rec.message.content : [];
    const d = this.day(localDay(ts));
    // Token usage and model, once per API message (a message's content blocks share one id and usage).
    const usage = rec.message?.usage;
    const msgId = rec.message?.id;
    if (usage && msgId && !d.messages.has(msgId)) {
      d.messages.add(msgId);
      d.tokens.input += usage.input_tokens || 0;
      d.tokens.output += usage.output_tokens || 0;
      d.tokens.cacheRead += usage.cache_read_input_tokens || 0;
      d.tokens.cacheWrite += usage.cache_creation_input_tokens || 0;
      const model = typeof rec.message.model === 'string' ? rec.message.model.replace(/^claude-/, '') : null;
      if (model && model !== '<synthetic>') d.models.set(model, (d.models.get(model) || 0) + 1);
    }
    // The model a session last answered with (so "continue with the same model" can be offered).
    if (rec.sessionId && !rec.isSidechain && typeof rec.message?.model === 'string' && rec.message.model.startsWith('claude-')) this.session(rec.sessionId).model = rec.message.model;
    if (!hasTool) return;
    const sess = rec.sessionId ? this.session(rec.sessionId) : null;
    const today = localDay(new Date());
    if (sess) {
      sess.lastAt = Math.max(sess.lastAt, ts.getTime());
      // The folder the session was started in (the first one we saw, from peek). Later records carry wherever the shell has since `cd`'d to
      // (a scratchpad, a subfolder): continuing the session has to happen where it started, or Claude Code can't find it.
      if (rec.cwd && !rec.isSidechain && !sess.cwd) {
        sess.project = path.basename(rec.cwd);
        sess.cwd = rec.cwd;
      }
      if (sess.day !== today) Object.assign(sess, { day: today, tools: 0, files: new Set() });
    }
    const countForSession = sess && localDay(ts) === today;
    for (const b of blocks) {
      if (b?.type !== 'tool_use') continue;
      const kind = KIND[b.name] ?? 'other';
      d.tools++;
      d[kind]++;
      if (rec.sessionId) {
        let bs = d.bySession.get(rec.sessionId);
        if (!bs) { bs = Object.fromEntries(KINDS.map((k) => [k, 0])); d.bySession.set(rec.sessionId, bs); }
        bs[kind]++;
      }
      d.hours[ts.getHours()]++;
      if (kind === 'edit' && typeof b.input?.file_path === 'string') d.files.add(b.input.file_path);
      if (rec.sessionId) d.sessions.add(rec.sessionId);
      if (countForSession) {
        sess.tools++;
        if (kind === 'edit' && typeof b.input?.file_path === 'string') sess.files.add(b.input.file_path);
      }
      if ((b.name === 'Agent' || b.name === 'Task') && typeof b.id === 'string' && !rec.isSidechain && !this.runLog.has(b.id) &&
          ts.getTime() >= Date.now() - RUN_TTL_MS) {
        this.runLog.set(b.id, {
          type: String(b.input?.subagent_type ?? 'general-purpose').slice(0, 80),
          description: String(b.input?.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 100),
          at: ts.getTime(), project: sess?.project ?? null,
        });
        this.spawnsVersion++;
      }
      if ((b.name === 'Agent' || b.name === 'Task') && typeof b.id === 'string' && typeof b.input?.subagent_type === 'string' &&
          ts.getTime() >= Date.now() - SPAWN_TTL_MS && !this.spawnMap.has(b.id)) {
        this.spawnMap.set(b.id, { type: b.input.subagent_type.slice(0, 80), at: ts.getTime() });
        this.spawnsVersion++;
      }
      if (b.name === 'TodoWrite' && sess && !rec.isSidechain && Array.isArray(b.input?.todos) && ts.getTime() >= sess.todosAt) {
        sess.todosAt = ts.getTime();
        sess.todos = b.input.todos.map((t) => ({
          content: String(t?.content ?? '').slice(0, 160),
          activeForm: String(t?.activeForm ?? '').slice(0, 160),
          status: ['pending', 'in_progress', 'completed'].includes(t?.status) ? t.status : 'pending',
        }));
      }
    }
  }

  /** Folder and first prompt of a main transcript, found in its first few lines (chat-only sessions have no tool calls). */
  peek(line, sessionId) {
    const s = this.session(sessionId);
    if (!s.cwd) {
      const m = /"cwd":"((?:[^"\\]|\\.)*)"/.exec(line);
      if (m) {
        try { s.cwd = JSON.parse(`"${m[1]}"`); s.project = path.basename(s.cwd); } catch { /* odd path */ }
      }
    }
    if (!s.first && line.includes('"type":"user"') && !line.includes('"isMeta":true') && !line.includes('"isSidechain":true')) {
      try {
        const c = JSON.parse(line).message?.content;
        const text = (typeof c === 'string' ? c : (c ?? []).filter((b) => b?.type === 'text').map((b) => b.text).join(' ')).replace(/\s+/g, ' ').trim();
        if (text && !text.startsWith('<')) s.first = text.length > 200 ? `${text.slice(0, 199)}…` : text;
      } catch { /* not a message */ }
    }
  }

  /** A prompt typed in a main session: kept as the session's latest `ask` so the office can show it arriving (injected `<…>` text is skipped). */
  handleAsk(line) {
    let rec;
    try { rec = JSON.parse(line); } catch { return; }
    if (rec.type !== 'user' || !rec.sessionId || !rec.timestamp) return;
    const c = rec.message?.content;
    const text = (typeof c === 'string' ? c : (Array.isArray(c) ? c : []).filter((b) => b?.type === 'text').map((b) => b.text).join(' ')).replace(/\s+/g, ' ').trim();
    const at = new Date(rec.timestamp).getTime();
    if (!text || text.startsWith('<') || !Number.isFinite(at)) return;
    const s = this.session(rec.sessionId);
    if (!s.ask || at >= s.ask.at) s.ask = { text: text.length > 140 ? `${text.slice(0, 139)}…` : text, at };
  }

  handleTitle(line) {
    let rec;
    try { rec = JSON.parse(line); } catch { return; }
    if (!rec.sessionId) return;
    const s = this.session(rec.sessionId);
    if (rec.type === 'custom-title' && rec.customTitle) s.title = String(rec.customTitle).slice(0, 120);
    if (rec.type === 'ai-title' && rec.aiTitle) s.aiTitle = String(rec.aiTitle).slice(0, 120);
    if (rec.type === 'last-prompt' && typeof rec.lastPrompt === 'string') {
      const text = rec.lastPrompt.replace(/\s+/g, ' ').trim();
      if (text && !text.startsWith('<')) s.prompt = text.length > 200 ? `${text.slice(0, 199)}…` : text; // skip injected tags
    }
  }

  /** Sessions active in the last `hours`, most recent first. */
  tasks(now = new Date(), hours = 24, limit = 8) {
    const since = now.getTime() - hours * 3600_000;
    const today = localDay(now);
    return [...this.sessions.values()]
      .filter((s) => s.lastAt >= since)
      .sort((a, b) => b.lastAt - a.lastAt)
      .slice(0, limit)
      .map((s) => ({
        title: s.title || s.aiTitle,
        prompt: s.prompt,
        project: s.project,
        lastAt: new Date(s.lastAt).toISOString(),
        toolsToday: s.day === today ? s.tools : 0,
        filesToday: s.day === today ? s.files.size : 0,
        todos: s.todos && s.todosAt >= since ? s.todos : null,
      }));
  }

  /** Main sessions active in the last `days`, most recent first. */
  listSessions(limit = 40, days = 30) {
    const since = Date.now() - days * 86_400_000;
    return [...this.sessions.entries()]
      .filter(([, s]) => s.main && Math.max(s.lastAt, s.fileAt) >= since)
      .sort((a, b) => Math.max(b[1].lastAt, b[1].fileAt) - Math.max(a[1].lastAt, a[1].fileAt))
      .slice(0, limit)
      .map(([id, s]) => ({
        id, title: s.title || s.aiTitle || s.first || null, prompt: s.prompt || s.first || null, project: s.project ?? null, cwd: s.cwd ?? null,
        at: new Date(Math.max(s.lastAt, s.fileAt)).toISOString(), model: s.model ?? null, ask: s.ask ?? null,
      }));
  }

  /** Folders Claude Code worked in recently, most recent first: [{ name, cwd }]. Tasks may only run in these. */
  projects(limit = 15) {
    const seen = new Map();
    for (const s of [...this.sessions.values()].sort((a, b) => Math.max(b.lastAt, b.fileAt) - Math.max(a.lastAt, a.fileAt))) {
      if (s.cwd && !seen.has(s.cwd) && !isOfficeWorktree(s.cwd) && !isTempDir(s.cwd)) seen.set(s.cwd, { name: path.basename(s.cwd), cwd: s.cwd }); // the office's own task branches and throw-away folders aren't projects
    }
    return [...seen.values()].slice(0, limit);
  }

  /** Sub-agents started in the last day, most recent first. */
  runs(now = Date.now(), limit = 40) {
    for (const [id, r] of this.runLog) if (now - r.at > RUN_TTL_MS) this.runLog.delete(id);
    return [...this.runLog].sort((a, b) => b[1].at - a[1].at).slice(0, limit)
      .map(([id, r]) => ({ id, type: r.type, description: r.description, project: r.project, at: new Date(r.at).toISOString() }));
  }

  /** Recent sub-agent spawns: { toolUseId: subagent_type }. */
  spawns(now = Date.now()) {
    for (const [id, s] of this.spawnMap) if (now - s.at > SPAWN_TTL_MS) this.spawnMap.delete(id);
    return Object.fromEntries([...this.spawnMap].map(([id, s]) => [id, s.type]));
  }

  readNew(file, cutoffMs) {
    let st = this.files.get(file);
    if (!st) this.files.set(file, (st = { offset: 0, rest: Buffer.alloc(0) }));
    let size;
    let mtime = 0;
    // Main transcripts are <root>/<project>/<sessionId>.jsonl; sub-agent transcripts sit deeper.
    const rel = path.relative(this.root, file).split(path.sep);
    const sessionId = rel.length === 2 ? rel[1].replace(/\.jsonl$/, '') : null;
    try { const stat = fs.statSync(file); size = stat.size; mtime = stat.mtimeMs; } catch { this.files.delete(file); return; }
    if (sessionId) Object.assign(this.session(sessionId), { main: true, fileAt: Math.max(this.session(sessionId).fileAt, mtime) });
    if (size < st.offset) { st.offset = size; st.rest = Buffer.alloc(0); } // truncated/rewritten: skip ahead
    if (size === st.offset) return;
    const fd = fs.openSync(file, 'r');
    try {
      while (st.offset < size) {
        const buf = Buffer.alloc(Math.min(CHUNK, size - st.offset));
        const n = fs.readSync(fd, buf, 0, buf.length, st.offset);
        if (n <= 0) break;
        st.offset += n;
        let data = st.rest.length ? Buffer.concat([st.rest, buf.subarray(0, n)]) : buf.subarray(0, n);
        let start = 0;
        for (let nl = data.indexOf(10, start); nl !== -1; nl = data.indexOf(10, start)) {
          if (nl > start) {
            const line = data.toString('utf8', start, nl);
            if (sessionId && (!this.session(sessionId).cwd || !this.session(sessionId).first)) this.peek(line, sessionId);
            this.handleLine(line, cutoffMs);
          }
          start = nl + 1;
        }
        st.rest = Buffer.from(data.subarray(start));
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  scan(now = new Date()) {
    const cutoff = new Date(now);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (this.days - 1));
    const cutoffMs = cutoff.getTime();
    for (const file of this.listTranscripts(this.root, cutoffMs)) this.readNew(file, cutoffMs);
    for (const key of this.perDay.keys()) if (key < localDay(cutoff)) this.perDay.delete(key);
    for (const [id, s] of this.sessions) if (Math.max(s.lastAt, s.fileAt) < cutoffMs) this.sessions.delete(id);
    return this.snapshot(now);
  }

  snapshot(now = new Date()) {
    const days = {};
    const recentFrom = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3));
    for (const [key, d] of [...this.perDay].sort(([a], [b]) => a.localeCompare(b))) {
      const row = {
        tools: d.tools, sessions: d.sessions.size, files: d.files.size,
        tokens: d.tokens, models: Object.fromEntries([...d.models].sort((a, b) => b[1] - a[1])),
      };
      for (const k of KINDS) row[k] = d[k];
      // What each session did, for the last few days only (freelance pay is worked out from it; counts only, no names).
      if (key >= recentFrom) row.bySession = Object.fromEntries([...d.bySession]);
      days[key] = row;
    }
    const today = localDay(now);
    // Streak: consecutive days with activity, ending today (or yesterday if today is still empty).
    let streak = 0;
    const cur = new Date(now);
    if (!this.perDay.get(today)?.tools) cur.setDate(cur.getDate() - 1);
    while (this.perDay.get(localDay(cur))?.tools) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    }
    return {
      updatedAt: now.toISOString(),
      today,
      days,
      hours: this.perDay.get(today)?.hours ?? new Array(24).fill(0),
      streak,
      streakCapped: streak >= this.days - 1,
    };
  }
}
