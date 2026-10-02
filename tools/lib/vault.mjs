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

const MAX_FILES = 3000;
const MAX_DEPTH = 8;
const MAX_TEXT = 200_000;
const CONTEXT_TAG = '#konteks';
const CONTEXT_FILES = 5;
const CONTEXT_CHARS = 6000;
const IDEAS = 'Ide-TODO.md';
const LIST_TEXT = 48_000; // what the list reads of each note when nothing is being searched (big vaults stay quick)
const PROTECTED = new Set([IDEAS, 'Catatan', 'Laporan']); // the bookshelf relies on these at the vault's root
const ASSET_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
const MAX_ASSET = 8 * 1024 * 1024;

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

function readHead(file, max) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(max);
    const n = fs.readSync(fd, buf, 0, max, 0);
    return buf.toString('utf8', 0, n);
  } finally { fs.closeSync(fd); }
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
    try { st = fs.statSync(file); text = readHead(file, needle ? MAX_TEXT : LIST_TEXT); } catch { continue; }
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


// ── Folders and files (the bookshelf's folder view) ──
// Everything here works on paths relative to the vault, never leaves it, ignores hidden entries (.obsidian, .trash...) and only
// touches folders and Markdown notes. Nothing is ever deleted: "delete" moves to the vault's .trash folder (like Obsidian's
// local trash). The bookshelf's own files (Ide-TODO.md, Catatan/, Laporan/) can't be renamed, moved or deleted.
const clean = (rel) => String(rel ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
const okSegments = (rel) => rel.split('/').every((p) => p && p !== '.' && p !== '..' && !p.startsWith('.') && !/[\0:*?"<>|]/.test(p) && p.length <= 120);

/** An absolute path for a folder (isDir) or a note inside the vault ('' is the vault itself), or null. */
function inside(rel, { dir = false } = {}) {
  const root = real(vaultDir());
  const c = clean(rel);
  if (c === '') return dir ? root : null;
  if (!okSegments(c) || c.split('/').length > MAX_DEPTH + 1) return null;
  if (!dir && !c.toLowerCase().endsWith('.md')) return null;
  const abs = path.resolve(root, c);
  return abs.startsWith(root + path.sep) ? abs : null;
}

const isHiddenName = (n) => n.startsWith('.');

/** The entries of one folder: { dirs: [{ name, count }], files: [{ name, title, mtime, size }] }, or null. */
export function tree(rel = '') {
  ensureVault();
  const abs = inside(rel, { dir: true });
  if (!abs) return null;
  let entries;
  try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return null; }
  const dirs = [];
  const files = [];
  for (const e of entries) {
    if (isHiddenName(e.name)) continue;
    const p = path.join(abs, e.name);
    if (e.isDirectory()) {
      let count = 0;
      try { count = fs.readdirSync(p).filter((n) => !isHiddenName(n)).length; } catch { /* unreadable */ }
      dirs.push({ name: e.name, count });
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      let st;
      try { st = fs.statSync(p); } catch { continue; }
      files.push({ name: e.name, title: e.name.replace(/\.md$/i, ''), mtime: st.mtimeMs, size: st.size });
    }
  }
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  return { dir: clean(rel), dirs: dirs.sort(byName), files: files.sort(byName) };
}

/** Every folder in the vault (relative paths), for "move to…". */
export function folders() {
  const root = real(ensureVault());
  const out = [];
  const go = (dir, depth) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (!e.isDirectory() || isHiddenName(e.name) || out.length >= 1000) continue;
      const p = path.join(dir, e.name);
      out.push(path.relative(root, p).split(path.sep).join('/'));
      if (depth < MAX_DEPTH) go(p, depth + 1);
    }
  };
  go(root, 0);
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** Creates a folder. Returns { ok } or { error: 'path' | 'exists' | 'write' }. */
export function makeFolder(rel) {
  const abs = inside(rel, { dir: true });
  if (!abs || clean(rel) === '') return { error: 'path' };
  if (fs.existsSync(abs)) return { error: 'exists' };
  try { fs.mkdirSync(abs, { recursive: true }); } catch { return { error: 'write' }; }
  return { ok: true };
}

/** Renames or moves a note or a folder (never over something that exists). Returns { path } or { error }. */
export function move(from, to) {
  const f = clean(from);
  const t = clean(to);
  if (PROTECTED.has(f)) return { error: 'protected' };
  let src = inside(f);
  const isNote = !!src;
  if (!src) src = inside(f, { dir: true });
  const dst = isNote ? inside(t) : inside(t, { dir: true });
  if (!src || !dst || f === '' || t === '') return { error: 'path' };
  let st;
  try { st = fs.lstatSync(src); } catch { return { error: 'missing' }; }
  if (st.isSymbolicLink() || (isNote ? !st.isFile() : !st.isDirectory())) return { error: 'path' };
  if (!isNote && (t === f || t.startsWith(`${f}/`))) return { error: 'inside' };
  if (PROTECTED.has(t)) return { error: 'protected' };
  if (fs.existsSync(dst)) return { error: 'exists' };
  if (!fs.existsSync(path.dirname(dst))) return { error: 'path' };
  const pairs = isNote ? [[f, t]] : filesUnder(src).map((r) => [`${f}/${r}`, `${t}/${r}`]);
  try { fs.renameSync(src, dst); } catch { return { error: 'write' }; }
  let links = { links: 0, files: 0 };
  try { links = rewriteLinks(pairs); } catch { /* the move itself worked; links just stay as they were */ }
  return { path: t, links };
}

/** Every (non-hidden) file below a folder, relative to it. */
function filesUnder(abs) {
  const out = [];
  const go = (dir, rel, depth) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (isHiddenName(e.name) || out.length >= 5000) continue;
      if (e.isDirectory()) { if (depth < MAX_DEPTH) go(path.join(dir, e.name), rel ? `${rel}/${e.name}` : e.name, depth + 1); }
      else if (e.isFile()) out.push(rel ? `${rel}/${e.name}` : e.name);
    }
  };
  go(abs, '', 0);
  return out;
}

/**
 * After a rename or move, keeps the links in the other notes working, like Obsidian does:
 *   [[folder/Old]], [[folder/Old#Heading|alias]], ![[folder/pic.png]]   path links follow the file to its new place
 *   [[Old]]                                                           a bare name follows a rename (not when another note has that name)
 *   [text](folder/Old.md), [text](folder/My%20Old.md#h)                Markdown links, relative to the note or to the vault
 * Links inside code blocks and code spans are left alone. Returns { links, files }: how many were changed, in how many notes.
 */
function rewriteLinks(pairs) {
  if (!pairs.length) return { links: 0, files: 0 };
  const root = real(vaultDir());
  const lc = (x) => x.toLowerCase();
  const noExt = (x) => x.replace(/\.md$/i, '');
  const baseOf = (x) => x.slice(x.lastIndexOf('/') + 1);
  const byFull = new Map(); // old path (any file, lower case) -> new path
  const byPath = new Map(); // old note path without .md -> new path without .md
  const byBase = new Map(); // old note name -> new note name, for renames
  for (const [o, n] of pairs) {
    byFull.set(lc(o), n);
    if (/\.md$/i.test(o)) {
      byPath.set(lc(noExt(o)), noExt(n));
      if (baseOf(noExt(o)) !== baseOf(noExt(n))) byBase.set(lc(baseOf(noExt(o))), baseOf(noExt(n)));
    }
  }
  const notes = [];
  walk(root, 0, notes);
  const rels = notes.map((abs) => path.relative(root, abs).split(path.sep).join('/'));
  // A bare name only follows a rename when no other note still carries the old name (otherwise it was ambiguous already).
  for (const rel of rels) byBase.delete(lc(baseOf(noExt(rel))));
  for (const [o, n] of pairs) if (/\.md$/i.test(o) && lc(baseOf(noExt(o))) === lc(baseOf(noExt(n)))) byBase.delete(lc(baseOf(noExt(o))));

  const WIKI = /(!?)\[\[([^\]|#\n]+)((?:#[^\]|\n]*)?)((?:\|[^\]\n]*)?)\]\]/g;
  const MDLINK = /(!?\[[^\]\n]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;
  let count = 0;
  const fix = (text, fileRel) => {
    const dirOfFile = fileRel.includes('/') ? fileRel.slice(0, fileRel.lastIndexOf('/')) : '';
    return text.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/).map((seg, i) => {
      if (i % 2) return seg; // code
      return seg
        .replace(WIKI, (all, bang, target, anchor, alias) => {
          const raw = target.trim();
          const hasMd = /\.md$/i.test(raw);
          const key = lc(hasMd ? noExt(raw) : raw);
          let out = null;
          if (raw.includes('/')) {
            if (byPath.has(key)) out = byPath.get(key) + (hasMd ? '.md' : '');
            else if (byFull.has(lc(raw))) out = byFull.get(lc(raw));
          } else if (byBase.has(key)) out = byBase.get(key) + (hasMd ? '.md' : '');
          if (out == null || out === raw) return all;
          count++;
          return `${bang}[[${out}${anchor}${alias}]]`;
        })
        .replace(MDLINK, (all, pre, url, post) => {
          if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(url)) return all;
          const hash = url.indexOf('#');
          const pathPart = hash >= 0 ? url.slice(0, hash) : url;
          const anchor = hash >= 0 ? url.slice(hash) : '';
          let dec = pathPart;
          try { dec = decodeURIComponent(pathPart); } catch { /* keep as written */ }
          const cands = [path.posix.normalize(path.posix.join(dirOfFile, dec)), path.posix.normalize(dec)];
          for (const [k, c] of cands.entries()) {
            const exact = byFull.get(lc(c));
            const hit = exact ?? byFull.get(`${lc(c)}.md`);
            if (hit == null) continue;
            let out = k === 0 && dirOfFile ? path.posix.relative(dirOfFile, hit) : hit;
            if (exact == null) out = noExt(out); // the link left out the .md
            if (out === dec) return all;
            count++;
            return `${pre}${out.replace(/ /g, '%20')}${anchor}${post}`;
          }
          return all;
        });
    }).join('');
  };
  let files = 0;
  for (const [i, abs] of notes.entries()) {
    let text;
    try { text = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    const before = count;
    const next = fix(text, rels[i]);
    if (count === before || next === text) continue;
    try {
      fs.writeFileSync(`${abs}.tmp`, next);
      fs.renameSync(`${abs}.tmp`, abs);
      files++;
    } catch { /* leave that note as it was */ }
  }
  return { links: count, files };
}

/** "Deletes" a note or folder by moving it into the vault's .trash. Returns { trashed } or { error }. */
export function trash(rel) {
  const f = clean(rel);
  if (PROTECTED.has(f)) return { error: 'protected' };
  let src = inside(f);
  if (!src) src = inside(f, { dir: true });
  if (!src || f === '') return { error: 'path' };
  let st;
  try { st = fs.lstatSync(src); } catch { return { error: 'missing' }; }
  if (st.isSymbolicLink()) return { error: 'path' };
  const bin = path.join(real(vaultDir()), '.trash');
  try { fs.mkdirSync(bin, { recursive: true }); } catch { return { error: 'write' }; }
  const base = path.basename(src);
  const ext = st.isFile() ? path.extname(base) : '';
  const stem = ext ? base.slice(0, -ext.length) : base;
  let name = base;
  for (let i = 2; fs.existsSync(path.join(bin, name)); i++) name = `${stem} ${i}${ext}`;
  try { fs.renameSync(src, path.join(bin, name)); } catch { return { error: 'write' }; }
  return { trashed: name };
}

/**
 * An image the notes refer to: `name` is a path relative to the note's folder or the vault, or a bare file name found
 * anywhere in the vault (Obsidian's ![[pic.png]]). Returns { type, data } or null. png/jpg/gif/webp only, at most 8 MB.
 */
export function asset(name, fromDir = '') {
  const root = real(vaultDir());
  const n = clean(decodeURIComponent(String(name ?? '')));
  const type = ASSET_TYPES[path.extname(n).toLowerCase()];
  if (!n || !type || n.split('/').some((p) => !p || p === '.' || p === '..' || p.startsWith('.'))) return null;
  const candidates = [path.resolve(root, clean(fromDir), n), path.resolve(root, n)];
  if (!n.includes('/')) {
    const found = [];
    const go = (dir, depth) => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (found.length || isHiddenName(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory() && depth < MAX_DEPTH) go(p, depth + 1);
        else if (e.isFile() && e.name.toLowerCase() === n.toLowerCase()) found.push(p);
      }
    };
    go(root, 0);
    candidates.push(...found);
  }
  for (const c of candidates) {
    try {
      const r = fs.realpathSync(c);
      if (!r.startsWith(root + path.sep)) continue;
      const st = fs.statSync(r);
      if (st.isFile() && st.size <= MAX_ASSET) return { type, data: fs.readFileSync(r) };
    } catch { /* try the next place */ }
  }
  return null;
}
