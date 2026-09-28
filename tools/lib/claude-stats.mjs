// Claude Code activity for the office, read from the session transcripts in ~/.claude/projects.
// Files are read incrementally (only bytes appended since the last scan); only assistant lines with a
// tool_use block and session-title lines are parsed.
//   snapshot() — daily counts for the Holo-board: tool calls, token usage, models (counts only: no paths,
//                prompts or project names)
//   tasks()    — the task board: each session active in the last day with its title, last prompt,
//                project folder name, today's tool calls and edited files, and its TodoWrite list if any
//   spawns()   — { toolUseId: subagent_type } for Agent/Task calls in the last few hours, so the office can
//                tell which staff member (staff/roster.json) a freshly spawned sub-agent is
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

export function localDay(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export class ClaudeStats {
  constructor({ root = path.join(os.homedir(), '.claude', 'projects'), days = 45 } = {}) {
    this.root = root;
    this.days = days;
    this.files = new Map(); // path -> { offset, rest: Buffer }
    this.perDay = new Map(); // day -> { tools, edit..., sessions: Set, files: Set, hours: number[24] }
    this.sessions = new Map(); // sessionId -> { title, aiTitle, project, lastAt, todos, todosAt }
    this.spawnMap = new Map(); // tool_use id -> { type, at }
    this.spawnsVersion = 0;
  }

  session(id) {
    let s = this.sessions.get(id);
    if (!s) {
      s = { title: null, aiTitle: null, prompt: null, project: null, lastAt: 0, todos: null, todosAt: 0, day: null, tools: 0, files: new Set() };
      this.sessions.set(id, s);
    }
    return s;
  }

  day(key) {
    let d = this.perDay.get(key);
    if (!d) {
      d = {
        tools: 0, sessions: new Set(), files: new Set(), hours: new Array(24).fill(0),
        tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, models: new Map(), messages: new Set(),
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
    if (!hasTool) return;
    const sess = rec.sessionId ? this.session(rec.sessionId) : null;
    const today = localDay(new Date());
    if (sess) {
      sess.lastAt = Math.max(sess.lastAt, ts.getTime());
      if (rec.cwd && !rec.isSidechain) sess.project = path.basename(rec.cwd);
      if (sess.day !== today) Object.assign(sess, { day: today, tools: 0, files: new Set() });
    }
    const countForSession = sess && localDay(ts) === today;
    for (const b of blocks) {
      if (b?.type !== 'tool_use') continue;
      const kind = KIND[b.name] ?? 'other';
      d.tools++;
      d[kind]++;
      d.hours[ts.getHours()]++;
      if (kind === 'edit' && typeof b.input?.file_path === 'string') d.files.add(b.input.file_path);
      if (rec.sessionId) d.sessions.add(rec.sessionId);
      if (countForSession) {
        sess.tools++;
        if (kind === 'edit' && typeof b.input?.file_path === 'string') sess.files.add(b.input.file_path);
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

  /** Recent sub-agent spawns: { toolUseId: subagent_type }. */
  spawns(now = Date.now()) {
    for (const [id, s] of this.spawnMap) if (now - s.at > SPAWN_TTL_MS) this.spawnMap.delete(id);
    return Object.fromEntries([...this.spawnMap].map(([id, s]) => [id, s.type]));
  }

  readNew(file, cutoffMs) {
    let st = this.files.get(file);
    if (!st) this.files.set(file, (st = { offset: 0, rest: Buffer.alloc(0) }));
    let size;
    try { size = fs.statSync(file).size; } catch { this.files.delete(file); return; }
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
          if (nl > start) this.handleLine(data.toString('utf8', start, nl), cutoffMs);
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
    for (const [id, s] of this.sessions) if (s.lastAt && s.lastAt < cutoffMs) this.sessions.delete(id);
    return this.snapshot(now);
  }

  snapshot(now = new Date()) {
    const days = {};
    for (const [key, d] of [...this.perDay].sort(([a], [b]) => a.localeCompare(b))) {
      const row = {
        tools: d.tools, sessions: d.sessions.size, files: d.files.size,
        tokens: d.tokens, models: Object.fromEntries([...d.models].sort((a, b) => b[1] - a[1])),
      };
      for (const k of KINDS) row[k] = d[k];
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
