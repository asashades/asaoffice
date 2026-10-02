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

import * as vault from './vault.mjs';
import { loadNames, setName } from './names.mjs';
import { cleanSchedule, dueAction, loadSchedules, MAX_SCHEDULES, newSchedule, nextDue, saveSchedules } from './schedules.mjs';

const MAX_RUNNING = 3;
const MAX_PROMPT = 4000;
const MAX_RESULT = 8000;
const TASK_TIMEOUT_MS = 30 * 60_000;
const KEEP_LETTERS = 60;
const HOLD_MS = 30_000;
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_ATTACH = 4;
const UPLOAD_KEEP_MS = 14 * 86_400_000;
const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };

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
const COMMIT_TOOLS = ['Bash(git add:*)', 'Bash(git commit:*)'];
const MAX_DENIALS = 20;
// What "Izinkan sekali" may open up, picked from a recorded denial (never from text the page sends).
const ALLOW_TOOLS = new Set(['Bash', 'Edit', 'MultiEdit', 'Write', 'NotebookEdit', 'WebFetch', 'WebSearch']);
const RISKY_COMMAND = /[|;&<>`]|\$\(|(^|\s)(sudo|rm|rmdir|mv|dd|mkfs|chmod|chown|curl|wget|ssh|scp|kill|pkill|killall|shutdown|reboot|eval|exec|sh|bash|zsh)(\s|$)|\bpush\b|\bgit\s+(reset|clean|rebase|checkout\s+--|branch\s+-D)/;

/** A short, readable summary of a denied tool call. */
function denialText(tool, input) {
  const i = input ?? {};
  if (tool === 'Bash') return String(i.command ?? '').replace(/\s+/g, ' ').slice(0, 160);
  return String(i.file_path ?? i.path ?? i.url ?? i.query ?? i.notebook_path ?? '').slice(0, 160);
}
/** The allow rule for one denial, or null when it must not be opened from the office. */
function allowRule(d) {
  if (!ALLOW_TOOLS.has(d.tool)) return null;
  if (d.tool !== 'Bash') return d.tool;
  const words = String(d.text ?? '').trim().split(/\s+/);
  if (!words[0] || RISKY_COMMAND.test(d.text)) return null;
  const prefix = ['git', 'npm', 'npx', 'pnpm', 'yarn', 'cargo', 'go', 'python', 'python3', 'pytest', 'node', 'make'].includes(words[0]) && words[1] && !words[1].startsWith('-') ? `${words[0]} ${words[1]}` : words[0];
  return /^[\w@./:+-]+( [\w@./:+-]+)?$/.test(prefix) ? `Bash(${prefix}:*)` : null;
}

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
 * sessions() → [{id,title,cwd}] (Claude Code sessions a task may continue),
 * extraDirs (always-allowed folders, e.g. the office workspace), onChange() when letters change, log.
 * Returns { port, letters(), agentMap(), stop() }.
 */
export async function startTaskServer({ root, token, officePort, port, projects, sessions = () => [], extraDirs = [], onChange = () => {}, onNamesChange = () => {}, log = console.log }) {
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
    run(letter, promptWith(letter.thread[0].text, letter.thread[0].images), { resume: false });
  }

  const allowedDirs = () => {
    const dirs = new Map((projects?.() ?? []).map((p) => [p.cwd, p]));
    for (const d of extraDirs) if (d && !dirs.has(d)) dirs.set(d, { name: path.basename(d), cwd: d });
    return [...dirs.values()].filter((p) => { try { return fs.statSync(p.cwd).isDirectory(); } catch { return false; } });
  };

  // Pictures you attach to a task are kept here for a couple of weeks (Claude is given read access to this folder only).
  const uploadsDir = path.join(os.homedir(), '.pixel-agents', 'asaoffice-uploads');
  try {
    for (const f of fs.readdirSync(uploadsDir)) {
      const p = path.join(uploadsDir, f);
      if (Date.now() - fs.statSync(p).mtimeMs > UPLOAD_KEEP_MS) fs.rmSync(p, { force: true });
    }
  } catch { /* nothing uploaded yet */ }
  const sniff = (b) => (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 ? '.png'
    : b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? '.jpg'
      : b.length > 6 && b.toString('latin1', 0, 4) === 'GIF8' ? '.gif'
        : b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP' ? '.webp' : null);
  /** The attached pictures that really are in the uploads folder (real paths), at most MAX_ATTACH. */
  function cleanImages(list) {
    if (!Array.isArray(list)) return [];
    let root;
    try { root = fs.realpathSync(uploadsDir); } catch { return []; }
    const out = [];
    for (const raw of list.slice(0, MAX_ATTACH)) {
      try {
        const real = fs.realpathSync(String(raw));
        if (real.startsWith(root + path.sep) && IMAGE_TYPES[path.extname(real).toLowerCase()] && fs.statSync(real).isFile() && !out.includes(real)) out.push(real);
      } catch { /* gone */ }
    }
    return out;
  }
  /** What Claude is sent: the text, plus where the attached pictures are (it reads them with the Read tool). */
  const promptWith = (text, images) => (images?.length
    ? `${text}\n\n[Gambar terlampir dari Komisaris. Lihat dengan tool Read:\n${images.map((p) => `- ${p}`).join('\n')}]`
    : text);

  /** A real image file (png, jpg, gif, webp) that may be shown: inside a project folder or the temp folder, or null. */
  function imageFile(p) {
    const raw = String(p ?? '');
    const type = IMAGE_TYPES[path.extname(raw).toLowerCase()];
    if (!type || !path.isAbsolute(raw)) return null;
    try {
      const real = fs.realpathSync(raw);
      if (!IMAGE_TYPES[path.extname(real).toLowerCase()]) return null;
      const st = fs.statSync(real);
      if (!st.isFile() || st.size > MAX_IMAGE) return null;
      const roots = [...allowedDirs().map((d) => d.cwd), os.tmpdir(), '/tmp', uploadsDir].map((d) => { try { return fs.realpathSync(d); } catch { return null; } }).filter(Boolean);
      return roots.some((r) => real.startsWith(r + path.sep)) ? real : null;
    } catch { return null; }
  }

  function run(letter, text, { resume, extraTools = [] }) {
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
    tools.push(...extraTools);
    if (phase === 'work' && member?.director && letter.style === 'delegate') tools.push(...DELEGATE_TOOLS);
    let system = PHASE_PROMPT[phase];
    // Commit permission is chosen per task (never push): only while the work is actually being done.
    if (letter.commit && phase === 'work') {
      tools.push(...COMMIT_TOOLS);
      system += '\nKomisaris mengizinkan git add dan git commit untuk tugas ini. JANGAN git push, jangan ubah branch, dan jangan git reset/rebase.';
    }
    if (member?.director) system += `\n${STYLE_PROMPT[letter.style === 'delegate' ? 'delegate' : 'solo']}`;
    const nick = roster().staff.filter((m) => !m.director && loadNames().staff[m.agent]);
    if (nick.length) system += `\n\nNama panggilan tim di kantor Komisaris: ${nick.map((m) => `${m.agent} sekarang dipanggil ${loadNames().staff[m.agent]}`).join('; ')}. Pakai nama panggilan itu kalau menyebut mereka.`;
    const notes = vault.contextNotes();
    if (notes) system += `\n\n${notes}`;
    // The prompt goes in on stdin, so text that starts with "-" can never be read as a CLI option.
    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'dontAsk',
      '--allowedTools', ...tools, '--append-system-prompt', system];
    if (letter.thread.some((m) => m.images?.length)) args.push('--add-dir', uploadsDir);
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
          // Calls refused because they weren't on the allow-list: kept so the Commissioner can open them up once.
          for (const d of Array.isArray(msg.permission_denials) ? msg.permission_denials : []) {
            const entry = { id: crypto.randomUUID().slice(0, 6), tool: String(d.tool_name ?? ''), text: denialText(d.tool_name, d.tool_input), at: new Date().toISOString(), state: 'open' };
            if (!entry.tool || (letter.denials ?? []).some((x) => x.state === 'open' && x.tool === entry.tool && x.text === entry.text)) continue;
            entry.rule = allowRule(entry);
            (letter.denials ??= []).push(entry);
          }
          if (letter.denials?.length > MAX_DENIALS) letter.denials = letter.denials.slice(-MAX_DENIALS);
        }
      }
    });
    child.stderr.on('data', (c) => { stderr = (stderr + c).slice(-2000); });
    const timer = setTimeout(() => { letter.timedOut = true; child.kill('SIGTERM'); }, TASK_TIMEOUT_MS);
    child.on('error', (err) => { stderr += err.message; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      running.delete(letter.id);
      const answer = String(result?.result ?? lastText ?? '').trim();
      if (answer) letter.thread.push({ from: 'agent', text: answer.slice(0, MAX_RESULT), at: new Date().toISOString(), kind: phase });
      // claude usually answers SIGTERM by exiting with 143 (128 + 15) instead of dying from the signal itself.
      const killed = !!signal || code === 143 || code === 137;
      const failed = killed || (result ? result.is_error : code !== 0);
      letter.status = letter.stopped ? 'stopped' : failed ? 'error' : phase === 'plan' ? 'awaiting' : 'done';
      letter.error = failed && !letter.stopped
        ? (letter.timedOut ? 'Tugasnya kelamaan (lebih dari 30 menit), jadi dihentikan.'
          : letter.shutdown ? 'Kantor dimatikan waktu tugas ini masih jalan.'
          : killed ? 'Tugasnya dihentikan dari luar (claude dimatikan, kantor di-restart, atau Mac tidur). Kirim ulang atau balas surat ini buat lanjut.'
          : (stderr.trim().split('\n').pop() || `claude keluar dengan kode ${code}`)).slice(0, 400)
        : null;
      letter.cost = (letter.cost ?? 0) + (result?.total_cost_usd ?? 0);
      letter.finishedAt = new Date().toISOString();
      letter.read = false;
      delete letter.stopped;
      delete letter.timedOut;
      delete letter.shutdown;
      delete letter.progress;
      save();
      log(`[asaoffice] task ${letter.id} ${letter.status}`);
    });
  }

  // ── Scheduled tasks (see schedules.mjs): read-only reports or plans, fired while the office runs ──
  let schedules = loadSchedules();
  const saveSched = () => { saveSchedules(schedules); onChange(); };
  const schedView = () => schedules.map((x) => ({ ...x, next: nextDue(x)?.toISOString() ?? null }));
  const agentIds = () => roster().staff.map((m) => m.agent).filter(installed);
  function fireSchedule(sch, stamp) {
    if (running.size >= MAX_RUNNING || directorBusy(sch.agent)) return false; // try again at the next tick
    if (!allowedDirs().some((p) => p.cwd === sch.cwd)) { sch.lastFor = stamp; return true; } // the folder is gone: drop this time
    const member = sch.agent ? roster().staff.find((m) => m.agent === sch.agent) : null;
    const letter = {
      id: crypto.randomUUID().slice(0, 8), agent: sch.agent, name: member?.name ?? null, cwd: sch.cwd, project: allowedDirs().find((p) => p.cwd === sch.cwd)?.name ?? path.basename(sch.cwd),
      sessionId: crypto.randomUUID(), status: 'running', read: false, createdAt: new Date().toISOString(), title: `⏰ ${sch.title}`,
      mode: sch.mode, style: 'solo', phase: sch.mode === 'plan' ? 'plan' : 'work', commit: false, scheduled: sch.id,
      thread: [{ from: 'you', text: sch.prompt, at: new Date().toISOString() }],
    };
    letters.unshift(letter);
    sch.lastFor = stamp;
    sch.lastRunAt = letter.createdAt;
    sch.lastLetter = letter.id;
    run(letter, promptWith(sch.prompt, []), { resume: false });
    log(`[asaoffice] schedule "${sch.title}" started (${letter.id})`);
    return true;
  }
  function tickSchedules() {
    let changed = false;
    for (const sch of schedules) {
      const due = dueAction(sch);
      if (!due) continue;
      if (due.action === 'skip') { sch.lastFor = due.stamp; changed = true; continue; }
      if (fireSchedule(sch, due.stamp)) changed = true;
    }
    if (changed) saveSched();
  }
  const schedTimer = setInterval(tickSchedules, 30_000);
  setTimeout(tickSchedules, 3000); // catch up on what was missed while the office was off

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
      if (data.length > 260_000) { reject(new Error('too large')); req.destroy(); }
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
    const m = /^\/api\/tasks\/([\w-]+)(?:\/(reply|read|stop|approve|reject|rename|deliver|allow))?$/.exec(url.pathname);
    try {
      if (req.method === 'GET' && url.pathname === '/api/options') {
        const r = roster();
        return send(res, 200, {
          staff: r.staff.filter((s) => installed(s.agent)).map(({ agent, name, role, access, director }) => ({ agent, name: (!director && loadNames().staff[agent]) || name, role, access, director: !!director })),
          general: r.general,
          projects: allowedDirs(),
          claude: !!findClaude(),
          running: running.size,
        }, origin);
      }
      // Scheduled tasks
      if (url.pathname === '/api/schedules' && req.method === 'GET') return send(res, 200, { schedules: schedView() }, origin);
      if (url.pathname === '/api/schedules' && req.method === 'POST') {
        if (schedules.length >= MAX_SCHEDULES) return send(res, 429, { error: 'too many' }, origin);
        const clean = cleanSchedule(await readBody(req), { maxPrompt: MAX_PROMPT, knownCwd: (c) => allowedDirs().some((p) => p.cwd === c), agents: agentIds() });
        if (!clean) return send(res, 400, { error: 'schedule' }, origin);
        const sch = newSchedule(clean);
        // A schedule made after today's time doesn't fire retroactively: its first run is the next occurrence.
        sch.lastFor = dueAction({ ...sch, lastFor: null })?.stamp ?? null;
        schedules.push(sch);
        saveSched();
        return send(res, 200, { schedule: schedView().find((x) => x.id === sch.id) }, origin);
      }
      const sm = /^\/api\/schedules\/([\w-]+)(?:\/(run))?$/.exec(url.pathname);
      if (sm) {
        const sch = schedules.find((x) => x.id === sm[1]);
        if (!sch) return send(res, 404, { error: 'schedule' }, origin);
        if (req.method === 'DELETE' && !sm[2]) {
          schedules = schedules.filter((x) => x.id !== sch.id);
          saveSched();
          return send(res, 200, { ok: true }, origin);
        }
        if (req.method === 'POST' && sm[2] === 'run') {
          if (running.size >= MAX_RUNNING) return send(res, 429, { error: 'busy' }, origin);
          if (directorBusy(sch.agent)) return send(res, 429, { error: 'director busy' }, origin);
          const before = sch.lastFor;
          fireSchedule(sch, before ?? ''); // "run now" doesn't change which time counts as handled
          sch.lastFor = before;
          saveSched();
          return send(res, 200, { schedule: schedView().find((x) => x.id === sch.id) }, origin);
        }
        if (req.method === 'POST' && !sm[2]) {
          const b = await readBody(req);
          const merged = cleanSchedule({ ...sch, ...b }, { maxPrompt: MAX_PROMPT, knownCwd: (c) => allowedDirs().some((p) => p.cwd === c), agents: agentIds() });
          if (!merged) return send(res, 400, { error: 'schedule' }, origin);
          Object.assign(sch, merged);
          saveSched();
          return send(res, 200, { schedule: schedView().find((x) => x.id === sch.id) }, origin);
        }
      }
      // Renaming a villager (staff by agent id, ordinary villagers by face). Shades can't be renamed.
      if (url.pathname === '/api/names' && req.method === 'POST') {
        const b = await readBody(req);
        const renameable = roster().staff.filter((m) => !m.director).map((m) => m.agent);
        const names = setName(b.kind, b.key, b.name, renameable);
        if (!names) return send(res, 400, { error: 'name' }, origin);
        onNamesChange();
        return send(res, 200, { names }, origin);
      }
      // A picture attached to a task (pasted, dragged or picked in the mailbox): saved in the uploads folder.
      if (url.pathname === '/api/upload' && req.method === 'POST') {
        const chunks = [];
        let size = 0;
        for await (const c of req) {
          size += c.length;
          if (size > MAX_IMAGE) { req.destroy(); return send(res, 413, { error: 'too large' }, origin); }
          chunks.push(c);
        }
        const buf = Buffer.concat(chunks);
        const ext = sniff(buf);
        if (!ext) return send(res, 400, { error: 'image' }, origin);
        fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o700 });
        const file = path.join(uploadsDir, `${Date.now()}-${crypto.randomUUID().slice(0, 6)}${ext}`);
        fs.writeFileSync(file, buf, { mode: 0o600 });
        return send(res, 200, { path: fs.realpathSync(file) }, origin);
      }
      // Pictures Claude mentions in its answers (screenshots...), shown in the mailbox: image files only, inside the project
      // folders Claude worked in (or the temp folder), at most 8 MB.
      if (url.pathname === '/api/image' && req.method === 'GET') {
        const file = imageFile(url.searchParams.get('path'));
        if (!file) return send(res, 404, { error: 'image' }, origin);
        const headers = { 'Content-Type': IMAGE_TYPES[path.extname(file).toLowerCase()], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
        if (originOk(origin)) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });
        res.writeHead(200, headers);
        return res.end(fs.readFileSync(file));
      }
      // The bookshelf: notes in the Obsidian vault (see vault.mjs).
      if (url.pathname === '/api/vault' && req.method === 'GET') {
        return send(res, 200, { path: vault.ensureVault(), fromEnv: vault.vaultFromEnv(), notes: vault.list(url.searchParams.get('q') ?? '') }, origin);
      }
      if (url.pathname === '/api/vault/path' && req.method === 'POST') {
        const r = vault.setVaultDir((await readBody(req)).path);
        return r.error ? send(res, 400, { error: r.error }, origin) : send(res, 200, { path: r.path }, origin);
      }
      if (url.pathname === '/api/vault/note' && req.method === 'GET') {
        const text = vault.read(url.searchParams.get('path'));
        return text == null ? send(res, 404, { error: 'note' }, origin) : send(res, 200, { text }, origin);
      }
      if (url.pathname === '/api/vault/note' && req.method === 'POST') {
        const body = await readBody(req);
        return vault.write(body.path, body.text) ? send(res, 200, { ok: true }, origin) : send(res, 400, { error: 'note' }, origin);
      }
      if (url.pathname === '/api/vault/idea' && req.method === 'POST') {
        return vault.addIdea((await readBody(req)).text) ? send(res, 200, { ok: true }, origin) : send(res, 400, { error: 'text' }, origin);
      }
      if (req.method === 'POST' && url.pathname === '/api/tasks') {
        const body = await readBody(req);
        const images = cleanImages(body.images);
        const prompt = String(body.prompt ?? '').trim() || (images.length ? 'Tolong lihat gambar terlampir.' : '');
        if (!prompt || prompt.length > MAX_PROMPT) return send(res, 400, { error: 'prompt' }, origin);
        const dir = allowedDirs().find((p) => p.cwd === body.cwd);
        if (!dir) return send(res, 400, { error: 'cwd' }, origin);
        const agent = body.agent ? String(body.agent) : null;
        const member = agent ? roster().staff.find((s) => s.agent === agent) : null;
        if (agent && (!member || !installed(agent))) return send(res, 400, { error: 'agent' }, origin);
        if (running.size >= MAX_RUNNING) return send(res, 429, { error: 'busy' }, origin);
        if (directorBusy(agent)) return send(res, 429, { error: 'director busy' }, origin);
        // Continuing a session that already exists (from the "Sesi" tab): same folder, no staff member, runs right away.
        const resumeId = body.resumeSession ? String(body.resumeSession) : null;
        const known = resumeId ? sessions().find((x) => x.id === resumeId) : null;
        if (resumeId && (agent || !known || known.cwd !== dir.cwd)) return send(res, 400, { error: 'session' }, origin);
        if (resumeId && letters.some((l) => l.sessionId === resumeId && (running.has(l.id) || l.status === 'queued'))) return send(res, 409, { error: 'running' }, origin);
        const mode = MODES.includes(body.mode) ? body.mode : member?.director ? 'plan' : 'auto';
        const style = member?.director && body.style === 'delegate' ? 'delegate' : 'solo';
        const letter = {
          id: crypto.randomUUID().slice(0, 8), agent, name: member?.name ?? null, cwd: dir.cwd, project: dir.name,
          sessionId: resumeId ?? crypto.randomUUID(), status: 'running', read: true, createdAt: new Date().toISOString(),
          title: resumeId ? (known.title || titleOf(prompt)) : titleOf(prompt), mode, style, phase: mode === 'plan' ? 'plan' : 'work',
          commit: body.commit === true && mode !== 'report',
          thread: [{ from: 'you', text: prompt, at: new Date().toISOString(), ...(images.length ? { images } : {}) }],
        };
        letters.unshift(letter);
        if (body.hold === true && !resumeId) {
          letter.status = 'queued';
          holds.set(letter.id, setTimeout(() => deliver(letter), HOLD_MS));
          save();
        } else run(letter, promptWith(prompt, images), { resume: !!resumeId });
        return send(res, 200, { letter }, origin);
      }
      const letter = m ? letters.find((l) => l.id === m[1]) : null;
      if (m && !letter) return send(res, 404, { error: 'letter' }, origin);
      if (req.method === 'POST' && m?.[2] === 'reply') {
        const replyBody = await readBody(req);
        const images = cleanImages(replyBody.images);
        const text = String(replyBody.text ?? '').trim() || (images.length ? 'Tolong lihat gambar terlampir.' : '');
        if (!text || text.length > MAX_PROMPT) return send(res, 400, { error: 'text' }, origin);
        if (running.has(letter.id) || letter.status === 'queued') return send(res, 409, { error: 'running' }, origin);
        if (running.size >= MAX_RUNNING) return send(res, 429, { error: 'busy' }, origin);
        if (directorBusy(letter.agent)) return send(res, 429, { error: 'director busy' }, origin);
        if (!allowedDirs().some((p) => p.cwd === letter.cwd)) return send(res, 400, { error: 'cwd' }, origin);
        // A reply to a plan that's waiting for you is a revision: it stays a plan until you approve it.
        const revise = letter.status === 'awaiting';
        letter.thread.push({ from: 'you', text, at: new Date().toISOString(), kind: revise ? 'revise' : undefined, ...(images.length ? { images } : {}) });
        letter.read = true;
        run(letter, promptWith(revise ? `Komisaris minta rencananya direvisi:\n${text}\n\nTulis ulang rencananya.` : text, images), { resume: true });
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
      if (req.method === 'POST' && m?.[2] === 'allow') {
        // Open up one refused call for a single follow-up run: the rule comes from the recorded denial.
        const wanted = String((await readBody(req)).id);
        const d = (letter.denials ?? []).find((x) => x.id === wanted && x.state === 'open');
        if (!d || !d.rule) return send(res, 400, { error: 'denial' }, origin);
        if (running.has(letter.id) || letter.status === 'queued') return send(res, 409, { error: 'running' }, origin);
        if (running.size >= MAX_RUNNING) return send(res, 429, { error: 'busy' }, origin);
        if (directorBusy(letter.agent)) return send(res, 429, { error: 'director busy' }, origin);
        if (!allowedDirs().some((p) => p.cwd === letter.cwd)) return send(res, 400, { error: 'cwd' }, origin);
        d.state = 'allowed';
        const at = new Date().toISOString();
        letter.thread.push({ from: 'you', text: `🔓 Diizinkan sekali: ${d.rule}`, at, kind: 'allow' });
        letter.read = true;
        run(letter, `Komisaris mengizinkan ${d.rule} untuk lanjutan ini. Silakan ulangi langkah yang tadi ditolak (${d.tool}: ${d.text}) lalu lanjutkan tugasnya. Jangan git push.`, { resume: true, extraTools: [d.rule] });
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
    schedules: schedView,
    stop() {
      clearInterval(schedTimer);
      for (const timer of holds.values()) clearTimeout(timer);
      for (const [id, child] of running) {
        const l = letters.find((x) => x.id === id);
        if (l) l.shutdown = true;
        child.kill('SIGTERM');
      }
      server.close();
    },
  };
}
