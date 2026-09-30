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
// Approval modes, like Claude Code's own:
//   - plan   ("Rencana dulu", the director's default): a read-only first run that ends with a plan; the letter waits
//            for you (✅ approve / ✏️ revise / ❌ reject) before anything is changed.
//   - auto   ("Langsung jalan", the staff default): works straight away within its allow-list.
//   - report ("Cuma laporan"): read-only from start to finish.
// A task can be created on hold (`hold: true`): the letter waits as "queued" until the office says the letter was
// delivered (POST /api/tasks/:id/deliver, when Shades hands it over in the office), or 30 seconds have passed.
// The director (Shades) can also delegate: then it may call the staff as real subagents (the Task/Agent tool).
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
const HOLD_MS = 30_000;

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
const MODES = ['plan', 'auto', 'report'];
const READ_ONLY = new Set(['read', 'git', 'web']);
const DELEGATE_TOOLS = ['Task', 'Agent'];

// What the session is told on top of its own prompt, per phase (passed with --append-system-prompt).
const PHASE_PROMPT = {
  plan: 'TAHAP RENCANA. Komisaris (user) minta rencana dulu sebelum ada yang diubah. Jangan ubah file apa pun dan '
    + 'jangan jalankan perintah yang mengubah sesuatu. Pelajari kode yang relevan, lalu tulis rencana singkat: '
    + 'langkah bernomor, siapa di tim yang pegang tiap langkah, file yang kena, dan risikonya. '
    + 'Tutup dengan satu baris: "Menunggu persetujuan Komisaris."',
  report: 'MODE CUMA LAPORAN. Jangan ubah file apa pun. Baca, periksa, lalu tulis laporannya.',
  work: 'Rencana sudah disetujui (atau Komisaris minta langsung jalan). Kerjakan, cek hasilnya, lalu tutup dengan laporan.',
};
const STYLE_PROMPT = {
  solo: 'Delegasi: MATI. Kerjakan semua langkah sendiri (jangan panggil subagent); cukup sebut siapa di tim yang '
    + '"pegang" tiap langkah.',
  delegate: 'Delegasi: NYALA. Kamu boleh menyerahkan langkah ke staf lewat subagent (Task/Agent tool), '
    + 'SATU PER SATU, dengan brief yang jelas. Langkah kecil kerjakan sendiri.',
};

/** Claude Code tool allow-list for a set of access levels ('test' implies read-only git). */
export function allowedTools(access) {
  const set = new Set(access);
  if (set.has('test')) set.add('git');
  return [...set].flatMap((a) => TOOLS[a] ?? []);
}

/** A short letter title from the task text (the first line, cut at a word). */
const titleOf = (prompt) => {
  const line = String(prompt).split('\n').find((l) => l.trim())?.replace(/\s+/g, ' ').trim() ?? '';
  return line.length > 50 ? `${line.slice(0, 49).replace(/\s+\S*$/, '')}…` : line;
};

/** What a tool call is doing, phrased like pixel-agents' own status lines (the office translates them). */
export function progressOf(block) {
  const i = block.input ?? {};
  const base = (f) => (f ? path.basename(String(f)) : '');
  switch (block.name) {
    case 'Read': return `Reading ${base(i.file_path)}`.trim();
    case 'Edit': case 'MultiEdit': return `Editing ${base(i.file_path)}`.trim();
    case 'Write': return `Writing ${base(i.file_path)}`.trim();
    case 'NotebookEdit': return 'Editing notebook';
    case 'Bash': return `Running: ${String(i.command ?? '').replace(/\s+/g, ' ').slice(0, 60)}`;
    case 'Grep': return 'Searching code';
    case 'Glob': case 'LS': return 'Searching files';
    case 'WebFetch': return 'Fetching web content';
    case 'WebSearch': return 'Searching the web';
    case 'Task': case 'Agent': return `Subtask: ${String(i.description ?? '').slice(0, 50)}`;
    case 'TodoWrite': return 'Planning';
    default: return block.name ? `Using ${block.name}` : null;
  }
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
  for (const l of letters) if (l.status === 'running' || l.status === 'queued') Object.assign(l, { status: 'error', error: 'Kantor dimatikan waktu tugas ini masih jalan.' });

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

  // The director works on one task at a time (he's one person in the office).
  const directorBusy = (agent) => {
    const member = agent ? roster().staff.find((m) => m.agent === agent) : null;
    return !!member?.director && letters.some((l) => l.agent === agent && (running.has(l.id) || l.status === 'queued'));
  };

  // Letters on hold: started when delivered, or after HOLD_MS anyway.
  const holds = new Map(); // letter id -> timer
  function deliver(letter) {
    clearTimeout(holds.get(letter.id));
    holds.delete(letter.id);
    if (letter.status !== 'queued') return;
    if (running.size >= MAX_RUNNING) {
      Object.assign(letter, { status: 'error', error: 'Lagi ada 3 tugas jalan. Coba kirim lagi nanti.', read: false });
      return save();
    }
    run(letter, letter.thread[0].text, { resume: false });
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
    let access = member?.access ?? r.general?.access ?? ['read'];
    const phase = letter.mode === 'report' ? 'report' : letter.phase === 'plan' ? 'plan' : 'work';
    if (phase !== 'work') access = access.filter((a) => READ_ONLY.has(a)).concat('git');
    const tools = allowedTools(access);
    if (phase === 'work' && member?.director && letter.style === 'delegate') tools.push(...DELEGATE_TOOLS);
    let system = PHASE_PROMPT[phase];
    if (member?.director) system += `\n${STYLE_PROMPT[letter.style === 'delegate' ? 'delegate' : 'solo']}`;
    // The prompt goes in on stdin, so text that starts with "-" can never be read as a CLI option.
    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'dontAsk',
      '--allowedTools', ...tools, '--append-system-prompt', system];
    if (resume) args.push('--resume', letter.sessionId);
    else args.push('--session-id', letter.sessionId);
    if (letter.agent) args.push('--agent', letter.agent);

    const child = spawn(claude, args, { cwd: letter.cwd, env: childEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.on('error', () => {}); // claude may exit before reading it all
    child.stdin.end(text);
    running.set(letter.id, child);
    letter.status = 'running';
    letter.error = null;
    delete letter.progress;
    save();

    let buf = '';
    let lastProgressSave = 0;
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
          const blocks = msg.message?.content ?? [];
          const t = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
          if (t) lastText = t;
          const tool = blocks.filter((b) => b.type === 'tool_use').map(progressOf).filter(Boolean).pop();
          const next = tool ?? (t ? 'Writing the answer' : null);
          if (next && next !== letter.progress) {
            letter.progress = next;
            if (Date.now() - lastProgressSave > 1500) { lastProgressSave = Date.now(); save(); }
          }
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
      if (answer) letter.thread.push({ from: 'agent', text: answer.slice(0, MAX_RESULT), at: new Date().toISOString(), kind: phase });
      const failed = signal || (result ? result.is_error : code !== 0);
      letter.status = letter.stopped ? 'stopped' : failed ? 'error' : phase === 'plan' ? 'awaiting' : 'done';
      letter.error = failed && !letter.stopped
        ? (signal ? 'Tugasnya dihentikan (kelamaan atau dimatikan).' : (stderr.trim().split('\n').pop() || `claude keluar dengan kode ${code}`)).slice(0, 400)
        : null;
      letter.cost = (letter.cost ?? 0) + (result?.total_cost_usd ?? 0);
      letter.finishedAt = new Date().toISOString();
      letter.read = false;
      delete letter.stopped;
      delete letter.progress;
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
    const m = /^\/api\/tasks\/([\w-]+)(?:\/(reply|read|stop|approve|reject|rename|deliver))?$/.exec(url.pathname);
    try {
      if (req.method === 'GET' && url.pathname === '/api/options') {
        const r = roster();
        return send(res, 200, {
          staff: r.staff.filter((s) => installed(s.agent)).map(({ agent, name, role, access, director }) => ({ agent, name, role, access, director: !!director })),
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
        if (directorBusy(agent)) return send(res, 429, { error: 'director busy' }, origin);
        const mode = MODES.includes(body.mode) ? body.mode : member?.director ? 'plan' : 'auto';
        const style = member?.director && body.style === 'delegate' ? 'delegate' : 'solo';
        const letter = {
          id: crypto.randomUUID().slice(0, 8), agent, name: member?.name ?? null, cwd: dir.cwd, project: dir.name,
          sessionId: crypto.randomUUID(), status: 'running', read: true, createdAt: new Date().toISOString(),
          title: titleOf(prompt), mode, style, phase: mode === 'plan' ? 'plan' : 'work',
          thread: [{ from: 'you', text: prompt, at: new Date().toISOString() }],
        };
        letters.unshift(letter);
        if (body.hold === true) {
          letter.status = 'queued';
          holds.set(letter.id, setTimeout(() => deliver(letter), HOLD_MS));
          save();
        } else run(letter, prompt, { resume: false });
        return send(res, 200, { letter }, origin);
      }
      const letter = m ? letters.find((l) => l.id === m[1]) : null;
      if (m && !letter) return send(res, 404, { error: 'letter' }, origin);
      if (req.method === 'POST' && m?.[2] === 'reply') {
        const text = String((await readBody(req)).text ?? '').trim();
        if (!text || text.length > MAX_PROMPT) return send(res, 400, { error: 'text' }, origin);
        if (running.has(letter.id) || letter.status === 'queued') return send(res, 409, { error: 'running' }, origin);
        if (running.size >= MAX_RUNNING) return send(res, 429, { error: 'busy' }, origin);
        if (directorBusy(letter.agent)) return send(res, 429, { error: 'director busy' }, origin);
        if (!allowedDirs().some((p) => p.cwd === letter.cwd)) return send(res, 400, { error: 'cwd' }, origin);
        // A reply to a plan that's waiting for you is a revision: it stays a plan until you approve it.
        const revise = letter.status === 'awaiting';
        letter.thread.push({ from: 'you', text, at: new Date().toISOString(), kind: revise ? 'revise' : undefined });
        letter.read = true;
        run(letter, revise ? `Komisaris minta rencananya direvisi:\n${text}\n\nTulis ulang rencananya.` : text, { resume: true });
        return send(res, 200, { letter }, origin);
      }
      if (req.method === 'POST' && (m?.[2] === 'approve' || m?.[2] === 'reject')) {
        if (letter.status !== 'awaiting') return send(res, 409, { error: 'not awaiting' }, origin);
        const at = new Date().toISOString();
        letter.read = true;
        if (m[2] === 'reject') {
          letter.thread.push({ from: 'you', text: '❌ Ditolak.', at, kind: 'reject' });
          Object.assign(letter, { status: 'rejected', finishedAt: at });
          save();
          return send(res, 200, { letter }, origin);
        }
        if (running.size >= MAX_RUNNING) return send(res, 429, { error: 'busy' }, origin);
        if (directorBusy(letter.agent)) return send(res, 429, { error: 'director busy' }, origin);
        if (!allowedDirs().some((p) => p.cwd === letter.cwd)) return send(res, 400, { error: 'cwd' }, origin);
        letter.thread.push({ from: 'you', text: '✅ Disetujui, silakan jalan.', at, kind: 'approve' });
        letter.phase = 'work';
        run(letter, 'Komisaris menyetujui rencananya. Kerjakan sekarang sesuai rencana, cek hasilnya, lalu tulis Laporan untuk Komisaris.', { resume: true });
        return send(res, 200, { letter }, origin);
      }
      if (req.method === 'POST' && m?.[2] === 'rename') {
        const title = String((await readBody(req)).title ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
        if (!title) return send(res, 400, { error: 'title' }, origin);
        letter.title = title;
        save();
        return send(res, 200, { letter }, origin);
      }
      if (req.method === 'POST' && m?.[2] === 'read') {
        letter.read = true;
        save();
        return send(res, 200, { ok: true }, origin);
      }
      if (req.method === 'POST' && m?.[2] === 'deliver') {
        deliver(letter);
        return send(res, 200, { letter }, origin);
      }
      if (req.method === 'POST' && m?.[2] === 'stop') {
        if (letter.status === 'queued') {
          clearTimeout(holds.get(letter.id));
          holds.delete(letter.id);
          Object.assign(letter, { status: 'stopped', finishedAt: new Date().toISOString() });
          save();
          return send(res, 200, { ok: true }, origin);
        }
        const child = running.get(letter.id);
        if (child) { letter.stopped = true; child.kill('SIGTERM'); }
        return send(res, 200, { ok: true }, origin);
      }
      if (req.method === 'DELETE' && m && !m[2]) {
        if (running.has(letter.id)) return send(res, 409, { error: 'running' }, origin);
        clearTimeout(holds.get(letter.id));
        holds.delete(letter.id);
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
      for (const timer of holds.values()) clearTimeout(timer);
      for (const child of running.values()) child.kill('SIGTERM');
      server.close();
    },
  };
}
