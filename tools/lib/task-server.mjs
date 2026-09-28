// Office tasks: send work to Claude Code from the office (mailbox → "Tugas baru") and read the result as a letter.
//
// A small HTTP API on 127.0.0.1:$OFFICE_TASK_PORT (default office port + 1) that only the office page on this
// Mac can use:
//   - it listens on loopback only, and checks the Host header (no DNS-rebinding tricks);
//   - every request needs the office token (Authorization: Bearer …), and a browser request must come from the
//     office page itself (Origin http://127.0.0.1:<office port> or http://localhost:<office port>);
//   - so a phone viewing the office through the tunnel can read letters but can't send work.
// Each task runs `claude -p` headless in a folder Claude Code already worked in (from the transcripts), as a staff
// member (`--agent wren-tester`) or plain Claude, with `--permission-mode dontAsk` and a small allow-list per staff
// member (staff/roster.json → access): anything else is refused automatically instead of prompting.
// Letters (tasks, their replies and results) are kept in ~/.pixel-agents/asaoffice-mail.json.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const MAX_RUNNING = 3;
const MAX_PROMPT = 4000;
const MAX_RESULT = 8000;
const TASK_TIMEOUT_MS = 30 * 60_000;
const KEEP_LETTERS = 60;

const TOOLS = {
  read: ['Read', 'Grep', 'Glob', 'LS', 'TodoWrite'],
  web: ['WebSearch', 'WebFetch'],
  edit: ['Edit', 'MultiEdit', 'Write', 'NotebookEdit'],
  git: ['Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git show:*)'],
  test: [
    'Bash(npm test:*)', 'Bash(npm run test:*)', 'Bash(npm run lint:*)', 'Bash(npm run check:*)', 'Bash(npx vitest:*)',
    'Bash(npx jest:*)', 'Bash(pnpm test:*)', 'Bash(yarn test:*)', 'Bash(pytest:*)', 'Bash(python -m pytest:*)',
    'Bash(python3 -m pytest:*)', 'Bash(go test:*)', 'Bash(cargo test:*)',
  ],
};
/** Claude Code tool allow-list for a set of access levels ('test' implies read-only git). */
export function allowedTools(access) {
  const set = new Set(access);
  if (set.has('test')) set.add('git');
  return [...set].flatMap((a) => TOOLS[a] ?? []);
}

/** Finds the claude CLI even when started from the Mac app, whose PATH is minimal. */
function findClaude() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const home = os.homedir();
  const dirs = [
    ...(process.env.PATH ?? '').split(path.delimiter),
    path.join(home, '.claude', 'local'), path.join(home, '.local', 'bin'), '/opt/homebrew/bin', '/usr/local/bin',
    path.dirname(process.execPath),
  ];
  for (const d of dirs) {
    const p = path.join(d, 'claude');
    try { if (d && fs.statSync(p).isFile()) return p; } catch { /* not here */ }
  }
  return null;
}

function childEnv() {
  const home = os.homedir();
  const extra = [path.dirname(process.execPath), path.join(home, '.local', 'bin'), '/opt/homebrew/bin', '/usr/local/bin'];
  return { ...process.env, PATH: [...extra, process.env.PATH ?? ''].join(path.delimiter) };
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/**
 * Starts the task API. Options: root (repo), token (office token), officePort, port, projects() → [{name,cwd}],
 * extraDirs (always-allowed folders, e.g. the office workspace), onChange() when letters change, log.
 * Returns { port, letters(), agentMap(), stop() }.
 */
export async function startTaskServer({ root, token, officePort, port, projects, extraDirs = [], onChange = () => {}, log = console.log }) {
  const mailFile = path.join(os.homedir(), '.pixel-agents', 'asaoffice-mail.json');
  const roster = () => {
    try { return JSON.parse(fs.readFileSync(path.join(root, 'staff', 'roster.json'), 'utf8')); } catch { return { staff: [], general: { access: ['read'] } }; }
  };
  const installed = (agent) => fs.existsSync(path.join(os.homedir(), '.claude', 'agents', `${agent}.md`));

  let letters = [];
  try { letters = JSON.parse(fs.readFileSync(mailFile, 'utf8')); } catch { /* first run */ }
  if (!Array.isArray(letters)) letters = [];
  // Tasks that were still running when the office stopped can't be followed any more.
  for (const l of letters) if (l.status === 'running') Object.assign(l, { status: 'error', error: 'Kantor dimatikan waktu tugas ini masih jalan.' });

  const running = new Map(); // letter id -> child process
  const save = () => {
    letters = letters.slice(0, KEEP_LETTERS);
    fs.mkdirSync(path.dirname(mailFile), { recursive: true });
    fs.writeFileSync(`${mailFile}.tmp`, JSON.stringify(letters, null, 2));
    fs.renameSync(`${mailFile}.tmp`, mailFile);
    onChange();
  };

  // Which pixel-agents agent id plays which task session (so the office can show the staff member's villager).
  const stateFile = path.join(os.homedir(), '.pixel-agents', 'standalone-state.json');
  function agentMap() {
    const bySession = new Map(letters.filter((l) => l.sessionId).map((l) => [l.sessionId, l]));
    if (bySession.size === 0) return {};
    let agents = [];
    try { agents = JSON.parse(fs.readFileSync(stateFile, 'utf8')).agents ?? []; } catch { return {}; }
    const out = {};
    for (const a of agents) {
      const l = bySession.get(a.sessionId);
      if (l) out[a.id] = { agent: l.agent, letter: l.id };
    }
    return out;
  }

  const allowedDirs = () => {
    const dirs = new Map((projects?.() ?? []).map((p) => [p.cwd, p]));
    for (const d of extraDirs) if (d && !dirs.has(d)) dirs.set(d, { name: path.basename(d), cwd: d });
    return [...dirs.values()].filter((p) => { try { return fs.statSync(p.cwd).isDirectory(); } catch { return false; } });
  };

  function run(letter, text, { resume }) {
    const claude = findClaude();
    if (!claude) {
      Object.assign(letter, { status: 'error', error: 'Claude Code (perintah `claude`) gak ketemu di Mac ini.' });
      return save();
    }
    const r = roster();
    const member = letter.agent ? r.staff.find((m) => m.agent === letter.agent) : null;
    const access = member?.access ?? r.general?.access ?? ['read'];
    // The prompt goes in on stdin, so text that starts with "-" can never be read as a CLI option.
    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'dontAsk',
      '--allowedTools', ...allowedTools(access)];
    if (resume) args.push('--resume', letter.sessionId);
    else args.push('--session-id', letter.sessionId);
    if (letter.agent) args.push('--agent', letter.agent);

    const child = spawn(claude, args, { cwd: letter.cwd, env: childEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.on('error', () => {}); // claude may exit before reading it all
    child.stdin.end(text);
    running.set(letter.id, child);
    letter.status = 'running';
    letter.error = null;
    save();

    let buf = '';
    let lastText = '';
    let result = null;
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.type === 'assistant') {
          const t = (msg.message?.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
          if (t) lastText = t;
        } else if (msg.type === 'result') {
          result = msg;
        }
      }
    });
    child.stderr.on('data', (c) => { stderr = (stderr + c).slice(-2000); });
    const timer = setTimeout(() => child.kill('SIGTERM'), TASK_TIMEOUT_MS);
    child.on('error', (err) => { stderr += err.message; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      running.delete(letter.id);
      const answer = String(result?.result ?? lastText ?? '').trim();
      if (answer) letter.thread.push({ from: 'agent', text: answer.slice(0, MAX_RESULT), at: new Date().toISOString() });
      const failed = signal || (result ? result.is_error : code !== 0);
      letter.status = letter.stopped ? 'stopped' : failed ? 'error' : 'done';
      letter.error = failed && !letter.stopped
        ? (signal ? 'Tugasnya dihentikan (kelamaan atau dimatikan).' : (stderr.trim().split('\n').pop() || `claude keluar dengan kode ${code}`)).slice(0, 400)
        : null;
      letter.cost = (letter.cost ?? 0) + (result?.total_cost_usd ?? 0);
      letter.finishedAt = new Date().toISOString();
      letter.read = false;
      delete letter.stopped;
      save();
      log(`[asaoffice] task ${letter.id} ${letter.status}`);
    });
  }

  // ── HTTP ──
  const originOk = (origin) => origin === `http://127.0.0.1:${officePort}` || origin === `http://localhost:${officePort}`;
  function send(res, status, body, origin) {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    if (originOk(origin)) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });
    res.writeHead(status, headers);
    res.end(JSON.stringify(body));
  }
  const readBody = (req) => new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 16_384) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('bad json')); } });
  });

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const host = req.headers.host ?? '';
    if (host !== `127.0.0.1:${actualPort}` && host !== `localhost:${actualPort}`) return send(res, 403, { error: 'host' });
    if (origin !== undefined && !originOk(origin)) return send(res, 403, { error: 'origin' });
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, DELETE',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin',
      });
      return res.end();
    }
    if (!safeEqual(req.headers.authorization ?? '', `Bearer ${token}`)) return send(res, 401, { error: 'token' }, origin);

    const url = new URL(req.url, 'http://x');
    const m = /^\/api\/tasks\/([\w-]+)(?:\/(reply|read|stop))?$/.exec(url.pathname);
    try {
      if (req.method === 'GET' && url.pathname === '/api/options') {
        const r = roster();
        return send(res, 200, {
          staff: r.staff.filter((s) => installed(s.agent)).map(({ agent, name, role, access }) => ({ agent, name, role, access })),
          general: r.general,
          projects: allowedDirs(),
          claude: !!findClaude(),
          running: running.size,
        }, origin);
      }
      if (req.method === 'POST' && url.pathname === '/api/tasks') {
        const body = await readBody(req);
        const prompt = String(body.prompt ?? '').trim();
        if (!prompt || prompt.length > MAX_PROMPT) return send(res, 400, { error: 'prompt' }, origin);
        const dir = allowedDirs().find((p) => p.cwd === body.cwd);
        if (!dir) return send(res, 400, { error: 'cwd' }, origin);
        const agent = body.agent ? String(body.agent) : null;
        const member = agent ? roster().staff.find((s) => s.agent === agent) : null;
        if (agent && (!member || !installed(agent))) return send(res, 400, { error: 'agent' }, origin);
        if (running.size >= MAX_RUNNING) return send(res, 429, { error: 'busy' }, origin);
        const letter = {
          id: crypto.randomUUID().slice(0, 8), agent, name: member?.name ?? null, cwd: dir.cwd, project: dir.name,
          sessionId: crypto.randomUUID(), status: 'running', read: true, createdAt: new Date().toISOString(),
          thread: [{ from: 'you', text: prompt, at: new Date().toISOString() }],
        };
        letters.unshift(letter);
        run(letter, prompt, { resume: false });
        return send(res, 200, { letter }, origin);
      }
      const letter = m ? letters.find((l) => l.id === m[1]) : null;
      if (m && !letter) return send(res, 404, { error: 'letter' }, origin);
      if (req.method === 'POST' && m?.[2] === 'reply') {
        const text = String((await readBody(req)).text ?? '').trim();
        if (!text || text.length > MAX_PROMPT) return send(res, 400, { error: 'text' }, origin);
        if (running.has(letter.id)) return send(res, 409, { error: 'running' }, origin);
        if (running.size >= MAX_RUNNING) return send(res, 429, { error: 'busy' }, origin);
        if (!allowedDirs().some((p) => p.cwd === letter.cwd)) return send(res, 400, { error: 'cwd' }, origin);
        letter.thread.push({ from: 'you', text, at: new Date().toISOString() });
        letter.read = true;
        run(letter, text, { resume: true });
        return send(res, 200, { letter }, origin);
      }
      if (req.method === 'POST' && m?.[2] === 'read') {
        letter.read = true;
        save();
        return send(res, 200, { ok: true }, origin);
      }
      if (req.method === 'POST' && m?.[2] === 'stop') {
        const child = running.get(letter.id);
        if (child) { letter.stopped = true; child.kill('SIGTERM'); }
        return send(res, 200, { ok: true }, origin);
      }
      if (req.method === 'DELETE' && m && !m[2]) {
        if (running.has(letter.id)) return send(res, 409, { error: 'running' }, origin);
        letters = letters.filter((l) => l.id !== letter.id);
        save();
        return send(res, 200, { ok: true }, origin);
      }
      return send(res, 404, { error: 'not found' }, origin);
    } catch (err) {
      return send(res, 400, { error: err.message }, origin);
    }
  });

  let actualPort = port;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { actualPort = server.address().port; resolve(); });
  });
  log(`[asaoffice] tasks: sending work from the office is on (127.0.0.1:${actualPort}, this Mac only).`);

  return {
    port: actualPort,
    letters: () => letters,
    agentMap,
    stop() {
      for (const child of running.values()) child.kill('SIGTERM');
      server.close();
    },
  };
}
