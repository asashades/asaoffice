// Daily Claude Code activity for the Holo-board, read from the session transcripts in
// ~/.claude/projects. Files are read incrementally (only bytes appended since the last scan), and
// only assistant lines with a tool_use block are parsed. Output is counts only — no paths, prompts
// or project names leave this module.
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
  }

  day(key) {
    let d = this.perDay.get(key);
    if (!d) {
      d = { tools: 0, sessions: new Set(), files: new Set(), hours: new Array(24).fill(0) };
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
    if (!line.includes('"type":"tool_use"') || !line.includes('"type":"assistant"')) return;
    let rec;
    try { rec = JSON.parse(line); } catch { return; }
    if (rec.type !== 'assistant' || !rec.timestamp) return;
    const ts = new Date(rec.timestamp);
    if (!(ts.getTime() >= cutoffMs)) return;
    const blocks = Array.isArray(rec.message?.content) ? rec.message.content : [];
    const d = this.day(localDay(ts));
    for (const b of blocks) {
      if (b?.type !== 'tool_use') continue;
      const kind = KIND[b.name] ?? 'other';
      d.tools++;
      d[kind]++;
      d.hours[ts.getHours()]++;
      if (kind === 'edit' && typeof b.input?.file_path === 'string') d.files.add(b.input.file_path);
      if (rec.sessionId) d.sessions.add(rec.sessionId);
    }
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
    return this.snapshot(now);
  }

  snapshot(now = new Date()) {
    const days = {};
    for (const [key, d] of [...this.perDay].sort(([a], [b]) => a.localeCompare(b))) {
      const row = { tools: d.tools, sessions: d.sessions.size, files: d.files.size };
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
