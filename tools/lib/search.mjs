// Search across everything Claude Code has said or been told on this Mac: the conversation text of the session transcripts in ~/.claude/projects
// (the mailbox's letters are sessions too, so they are found the same way). Only real conversation counts: what you typed and what Claude answered,
// never tool output, so a word that merely appears in a command's output does not turn up. A transcript is mostly tool output (hundreds of MB), so
// the conversation text is read once, in the background, into a small in-memory index that only grows by what each transcript appended since
// (transcripts are append-only); a search then looks through that index in a few milliseconds. `grep` was too slow for this: the BSD grep that
// ships with macOS needs several seconds for the same folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const MIN_QUERY = 2;
export const MAX_QUERY = 120;
const MAX_SESSIONS = 40;
const HITS_PER_SESSION = 3;
const MAX_MESSAGE_CHARS = 3000; // of each message kept in the index
const MAX_MESSAGES = 4000; // per session
const MAX_AGE_MS = 400 * 86_400_000; // transcripts untouched for longer are left out
const CHUNK = 4 * 1024 * 1024;
const SNIPPET_BEFORE = 70;
const SNIPPET_AFTER = 130;

export const defaultRoot = () => path.join(os.homedir(), '.claude', 'projects');
const clean = (q) => String(q ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY);
const tick = () => new Promise((r) => setImmediate(r));

/** The conversation text of one transcript record: { role, text } ('you' / 'claude'), or null for tool results, thinking, system lines and side chains. */
export function messageText(rec) {
  if (!rec || rec.isSidechain || rec.isMeta || (rec.type !== 'user' && rec.type !== 'assistant')) return null;
  const content = rec.message?.content;
  const role = rec.type === 'user' ? 'you' : 'claude';
  if (typeof content === 'string') return content.trim() ? { role, text: content } : null;
  if (!Array.isArray(content)) return null;
  const text = content.filter((b) => b?.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('\n');
  return text.trim() ? { role, text } : null;
}

/** A short piece of `text` around the first occurrence of `query` (case-insensitive), or null when it is not in there. */
export function snippetAround(text, query) {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  const at = flat.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return null;
  const from = Math.max(0, at - SNIPPET_BEFORE);
  const to = Math.min(flat.length, at + query.length + SNIPPET_AFTER);
  return { before: `${from > 0 ? '…' : ''}${flat.slice(from, at)}`, match: flat.slice(at, at + query.length), after: `${flat.slice(at + query.length, to)}${to < flat.length ? '…' : ''}` };
}

export class SearchIndex {
  constructor({ root = defaultRoot() } = {}) {
    this.root = root;
    this.files = new Map(); // path -> { offset, rest: Buffer, id }
    this.sessions = new Map(); // sessionId -> { file, mtime, msgs: [{ role, at, text }] }
    this.running = null;
    this.builtOnce = false;
  }

  listFiles(dir, out = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'subagents') this.listFiles(p, out); } else if (e.name.endsWith('.jsonl')) out.push(p);
    }
    return out;
  }

  addLine(line, st) {
    // Cheap checks first: most lines are tool output or bookkeeping and never need parsing.
    const user = line.includes('"type":"user"');
    if (!user && !(line.includes('"type":"assistant"') && line.includes('"type":"text"'))) return;
    if (user && (line.includes('"tool_result"') || line.includes('"isMeta":true'))) return;
    let rec;
    try { rec = JSON.parse(line); } catch { return; }
    const m = messageText(rec);
    if (!m) return;
    const id = rec.sessionId ?? st.id;
    let s = this.sessions.get(id);
    if (!s) { s = { file: st.path, mtime: 0, msgs: [] }; this.sessions.set(id, s); }
    if (s.msgs.length >= MAX_MESSAGES) return;
    s.msgs.push({ role: m.role, at: rec.timestamp ?? null, text: m.text.length > MAX_MESSAGE_CHARS ? m.text.slice(0, MAX_MESSAGE_CHARS) : m.text });
  }

  async readNew(p, st, mtime) {
    let fd;
    try { fd = fs.openSync(p, 'r'); } catch { return; }
    try {
      const size = fs.fstatSync(fd).size;
      if (size < st.offset) { st.offset = 0; st.rest = Buffer.alloc(0); } // the file was replaced: start over (rare)
      while (st.offset < size) {
        const buf = Buffer.alloc(Math.min(CHUNK, size - st.offset));
        const n = fs.readSync(fd, buf, 0, buf.length, st.offset);
        if (n <= 0) break;
        st.offset += n;
        const data = st.rest.length ? Buffer.concat([st.rest, buf.subarray(0, n)]) : buf.subarray(0, n);
        const last = data.lastIndexOf(10);
        if (last < 0) { st.rest = Buffer.from(data); continue; }
        st.rest = Buffer.from(data.subarray(last + 1));
        for (const line of data.subarray(0, last).toString('utf8').split('\n')) if (line) this.addLine(line, st);
        await tick(); // never hold the office's event loop for long
      }
    } finally { fs.closeSync(fd); }
    const s = this.sessions.get(st.id);
    if (s) s.mtime = mtime;
  }

  /** Reads what the transcripts gained since the last call (the first call reads them all). Concurrent calls share one run. */
  update() {
    if (this.running) return this.running;
    this.running = (async () => {
      const since = Date.now() - MAX_AGE_MS;
      for (const p of this.listFiles(this.root)) {
        let stat;
        try { stat = fs.statSync(p); } catch { continue; }
        if (stat.mtimeMs < since) continue;
        let st = this.files.get(p);
        if (!st) { st = { path: p, offset: 0, rest: Buffer.alloc(0), id: path.basename(p, '.jsonl') }; this.files.set(p, st); }
        if (st.offset >= stat.size && this.builtOnce) continue;
        await this.readNew(p, st, stat.mtimeMs);
      }
      this.builtOnce = true;
    })().finally(() => { this.running = null; });
    return this.running;
  }

  /**
   * Looks for `rawQuery` as one phrase (case-insensitive) in the conversation messages.
   * Returns [{ sessionId, mtime, hits: [{ role, at, before, match, after }] }], newest session first (at most 40).
   */
  async search(rawQuery) {
    const query = clean(rawQuery);
    if (query.length < MIN_QUERY) return [];
    await this.update();
    const needle = query.toLowerCase();
    const out = [];
    for (const [sessionId, s] of this.sessions) {
      const hits = [];
      for (let i = s.msgs.length - 1; i >= 0 && hits.length < HITS_PER_SESSION; i--) {
        const m = s.msgs[i];
        if (!m.text.toLowerCase().includes(needle)) continue;
        const snip = snippetAround(m.text, query);
        if (snip) hits.push({ role: m.role, at: m.at, ...snip });
      }
      if (hits.length) out.push({ sessionId, mtime: s.mtime, hits });
    }
    return out.sort((a, b) => b.mtime - a.mtime).slice(0, MAX_SESSIONS);
  }

  /** How many sessions and messages are indexed (for the log and tests). */
  stats() {
    let messages = 0;
    for (const s of this.sessions.values()) messages += s.msgs.length;
    return { files: this.files.size, sessions: this.sessions.size, messages };
  }
}
