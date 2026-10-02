// The bookshelf's notes: a plain folder of Markdown files (an Obsidian vault, ~/AsaOffice-Vault by default or
// $OFFICE_VAULT). Only the office page on this Mac can reach it (through the task API in task-server.mjs).
//   Ide-TODO.md   ideas and to-dos as "- [ ] …" lines
//   Laporan/      reports written when the Commissioner asks for one
//   Catatan/      the Commissioner's own notes; any note that contains #konteks is also given to the team as context
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MAX_FILES = 500;
const MAX_DEPTH = 5;
const MAX_TEXT = 200_000;
const CONTEXT_TAG = '#konteks';
const CONTEXT_FILES = 5;
const CONTEXT_CHARS = 6000;
const IDEAS = 'Ide-TODO.md';

const SEED = {
  [IDEAS]: '# Ide & TODO\n\n- [ ] Contoh: rapikan README proyek\n',
  'Catatan/Arahan-Komisaris.md': '# Arahan Komisaris\n\nKalau catatan ini diberi tag konteks (tanda pagar diikuti kata konteks), isinya dibaca Shades dan tim di setiap tugas.\nTulis aturan tetapmu di sini, misalnya gaya kode, hal yang jangan disentuh, atau prioritas minggu ini.\n',
};

const configFile = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-vault.json');

/** The vault folder: $OFFICE_VAULT, else the folder chosen in the bookshelf, else ~/AsaOffice-Vault. */
export function vaultDir() {
  if (process.env.OFFICE_VAULT) return path.resolve(process.env.OFFICE_VAULT);
  try {
    const chosen = JSON.parse(fs.readFileSync(configFile(), 'utf8')).path;
    if (typeof chosen === 'string' && path.isAbsolute(chosen)) return chosen;
  } catch { /* not chosen yet */ }
  return path.join(os.homedir(), 'AsaOffice-Vault');
}

/** True when $OFFICE_VAULT decides the folder (so the bookshelf can't change it). */
export const vaultFromEnv = () => !!process.env.OFFICE_VAULT;

/**
 * Chooses another vault folder (an existing Obsidian vault, say). Accepts what Terminal gives you when you paste a path
 * (quotes, "\ " escapes, ~). Returns { path } or { error: 'env' | 'relative' | 'notfound' | 'outside' | 'perm' }.
 */
export function setVaultDir(input) {
  if (process.env.OFFICE_VAULT) return { error: 'env' };
  let p = String(input ?? '').trim().replace(/^(['"])(.*)\1$/, '$2').replace(/\\(.)/g, '$1');
  if (p === '~' || p.startsWith('~/')) p = path.join(os.homedir(), p.slice(1));
  if (!path.isAbsolute(p)) return { error: 'relative' };
  p = path.resolve(p);
  const home = os.homedir();
  if (p !== home && !p.startsWith(home + path.sep)) return { error: 'outside' };
  try { if (!fs.statSync(p).isDirectory()) return { error: 'notfound' }; } catch (err) { return { error: err.code === 'EPERM' || err.code === 'EACCES' ? 'perm' : 'notfound' }; }
  try { fs.accessSync(p, fs.constants.R_OK | fs.constants.W_OK); } catch { return { error: 'perm' }; }
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify({ path: p }));
  return { path: p };
}

/** Creates the vault (and the starter notes that are missing). An existing vault only gets what the bookshelf needs. */
export function ensureVault() {
  const root = vaultDir();
  const fresh = !fs.existsSync(root) || fs.readdirSync(root).filter((n) => !n.startsWith('.')).length === 0;
  fs.mkdirSync(path.join(root, 'Laporan'), { recursive: true });
  fs.mkdirSync(path.join(root, 'Catatan'), { recursive: true });
  const ideas = path.join(root, IDEAS);
  if (!fs.existsSync(ideas)) fs.writeFileSync(ideas, fresh ? SEED[IDEAS] : '# Ide & TODO\n\n');
  const guide = path.join(root, 'Catatan/Arahan-Komisaris.md');
  if (fresh && !fs.existsSync(guide)) fs.writeFileSync(guide, SEED['Catatan/Arahan-Komisaris.md']);
  return root;
}

/** A path inside the vault (Markdown only), or null. */
function safe(rel) {
  const root = vaultDir();
  const clean = String(rel ?? '').replace(/\\/g, '/');
  if (!clean || clean.startsWith('/') || !clean.toLowerCase().endsWith('.md')) return null;
  if (clean.split('/').some((p) => !p || p === '.' || p === '..' || p.startsWith('.'))) return null;
  const file = path.resolve(root, clean);
  return file.startsWith(root + path.sep) ? file : null;
}

function walk(dir, depth, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (out.length >= MAX_FILES || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (depth < MAX_DEPTH) walk(p, depth + 1, out); }
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) out.push(p);
  }
}

/** A one-line preview: the line that matches `needle`, else the first line that isn't a heading. */
function snippetOf(text, needle) {
  const clean = (l) => l.replace(/^\s*(?:[-*]\s+(?:\[[ xX]\]\s+)?|#+\s+|>\s*)/, '').replace(/\s*#konteks\b/g, '').replace(/\s+/g, ' ').trim();
  const lines = text.split('\n');
  const hit = needle ? lines.find((l) => l.toLowerCase().includes(needle)) : null;
  const line = hit ?? lines.find((l) => l.trim() && !/^\s*#+\s/.test(l));
  const out = clean(line ?? '');
  return out.length > 110 ? `${out.slice(0, 109)}…` : out;
}

/** A few cleaned-up lines of the body (without the title) for a gallery card. */
function previewOf(text) {
  const lines = text.split('\n').map((l) => l.replace(/^\s*(?:[-*]\s+(?:\[[ xX]\]\s+)?|#+\s+|>\s*)/, '').replace(/\s*#konteks\b/g, '').replace(/\s+/g, ' ').trim());
  const body = text.split('\n').findIndex((l) => /^\s*#\s/.test(l));
  const out = lines.filter((l, i) => l && i !== body).slice(0, 6).join('\n');
  return out.length > 240 ? `${out.slice(0, 239)}…` : out;
}

/** Every note, newest first: { path, title, mtime, size, context }. With `q`, only notes whose name or text contains it. */
export function list(q = '') {
  const root = ensureVault();
  const files = [];
  walk(root, 0, files);
  const needle = String(q).trim().toLowerCase();
  const out = [];
  for (const file of files) {
    let st;
    let text = '';
    try { st = fs.statSync(file); text = fs.readFileSync(file, 'utf8').slice(0, MAX_TEXT); } catch { continue; }
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (needle && !rel.toLowerCase().includes(needle) && !text.toLowerCase().includes(needle)) continue;
    const heading = /^#\s+(.+)$/m.exec(text)?.[1]?.replace(/\s*#konteks\b/g, '').trim();
    const open = [...text.matchAll(/^\s*[-*]\s+\[ \]\s+(.+)$/gm)].map((m) => m[1].replace(/\s*#konteks\b/g, '').trim());
    out.push({
      path: rel, title: heading || path.basename(rel, '.md'), mtime: st.mtimeMs, size: st.size, context: text.includes(CONTEXT_TAG),
      snippet: snippetOf(text, needle), preview: previewOf(text), open: open.length, todos: open.slice(0, 4).map((t) => (t.length > 70 ? `${t.slice(0, 69)}…` : t)),
    });
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

export function read(rel) {
  const file = safe(rel);
  if (!file) return null;
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

/** Writes a note. Returns false when the path or size isn't allowed. */
export function write(rel, text) {
  const file = safe(rel);
  const body = String(text ?? '');
  if (!file || body.length > MAX_TEXT) return false;
  ensureVault();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, body);
  fs.renameSync(`${file}.tmp`, file);
  return true;
}

/** Adds "- [ ] text" to the ideas note. */
export function addIdea(text) {
  const line = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!line) return false;
  ensureVault();
  const file = path.join(vaultDir(), IDEAS);
  let body = '';
  try { body = fs.readFileSync(file, 'utf8'); } catch { body = '# Ide & TODO\n'; }
  fs.writeFileSync(file, `${body.replace(/\s*$/, '')}\n- [ ] ${line}\n`);
  return true;
}

/** The notes tagged #konteks, for the team's system prompt ('' when there are none). */
export function contextNotes() {
  let notes;
  try { notes = list().filter((n) => n.context).slice(0, CONTEXT_FILES); } catch { return ''; }
  let out = '';
  for (const n of notes) {
    const text = (read(n.path) ?? '').replace(/\s*#konteks\b/g, '').trim();
    const block = `\n### ${n.title}\n${text}\n`;
    if (out.length + block.length > CONTEXT_CHARS) { out += block.slice(0, Math.max(0, CONTEXT_CHARS - out.length)); break; }
    out += block;
  }
  return out.trim() ? `CATATAN KOMISARIS (dari vault Obsidian, konteks tetap untuk tugas ini):\n${out}` : '';
}

// ── Obsidian ──
// `obsidian://open?path=…` only works for a folder Obsidian already knows as a vault ("Unable to find a vault for the URL"
// otherwise). Obsidian keeps its vaults in obsidian.json; the bookshelf can read that to open notes the right way, and (with the
// Commissioner's click, while Obsidian is closed) add the office's vault to it.
const obsidianConfig = () => (process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library', 'Application Support', 'obsidian', 'obsidian.json')
  : path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'obsidian', 'obsidian.json'));

const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };

function readObsidian() {
  try {
    const j = JSON.parse(fs.readFileSync(obsidianConfig(), 'utf8'));
    return j && typeof j === 'object' && j.vaults && typeof j.vaults === 'object' ? j : { ...j, vaults: {} };
  } catch { return null; }
}

/** { installed: Obsidian has been run on this Mac, registered: the vault is one of its vaults, id } */
export function obsidianStatus() {
  const cfg = readObsidian();
  if (!cfg) return { installed: false, registered: false, id: null };
  const root = real(vaultDir());
  const hit = Object.entries(cfg.vaults).find(([, v]) => typeof v?.path === 'string' && real(v.path) === root);
  return { installed: true, registered: !!hit, id: hit?.[0] ?? null };
}

const obsidianRunning = () => {
  try {
    // Obsidian rewrites obsidian.json while it runs, so a registration made then would be lost.
    execFileSync('pgrep', ['-x', 'Obsidian'], { stdio: 'ignore' });
    return true;
  } catch { return false; }
};

/** Adds the vault to Obsidian's list. Returns { id } or { error: 'notinstalled' | 'running' | 'write' }. */
export function registerInObsidian() {
  const cfg = readObsidian();
  if (!cfg) return { error: 'notinstalled' };
  const status = obsidianStatus();
  if (status.registered) return { id: status.id };
  if (obsidianRunning()) return { error: 'running' };
  const file = obsidianConfig();
  const id = crypto.randomBytes(8).toString('hex');
  cfg.vaults[id] = { path: vaultDir(), ts: Date.now() };
  try {
    fs.copyFileSync(file, `${file}.asaoffice-backup`);
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(cfg));
    fs.renameSync(`${file}.tmp`, file);
  } catch { return { error: 'write' }; }
  return { id };
}
