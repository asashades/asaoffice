// The daily report in the Commissioner's Obsidian journal: what was done today, in the Commissioner's own words, kept in the day's note in the vault in a
// block of its own. The office never writes it by itself: it makes a draft from the day's tasks and sessions (a sentence taken from each answer), the
// Commissioner checks it, rewords what is off, ticks what counts, adds the highlights (shown as Obsidian callouts) and saves; only then is the note written.
// The note is named the way the obsidian-journal plugin names it, `2026-10-5, Mon` (year-month-day without leading zeros, then the English short weekday),
// in the folder `1-Fleeting Journal`. A note made by hand with a name and folder that match is adopted by that plugin, so the office can create the day's
// note before the plugin does. Only the block between the two markers is ever rewritten; everything else in the note is the Commissioner's.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as vault from './vault.mjs';
import { fmtTokens } from './usage.mjs';

const configFile = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-journal.json');
const reportFile = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-report.json');
export const DEFAULT_FOLDER = '1-Fleeting Journal';
const BEGIN = '<!-- asaoffice:begin -->';
const END = '<!-- asaoffice:end -->';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clock = (iso) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? `${pad(d.getHours())}.${pad(d.getMinutes())}` : ''; };
const tok = (n) => `${fmtTokens(n)} token`;
const MAX_BACK_DAYS = 14;

export function getConfig() {
  let c = {};
  try { c = JSON.parse(fs.readFileSync(configFile(), 'utf8')); } catch { /* defaults */ }
  const folder = typeof c.folder === 'string' && c.folder.trim() && !/(^|\/)\.\.?(\/|$)/.test(c.folder) && !c.folder.startsWith('/') ? c.folder.trim().replace(/^\/+|\/+$/g, '') : DEFAULT_FOLDER;
  return { enabled: c.enabled !== false, folder };
}
export function setConfig(patch) {
  const cur = getConfig();
  const next = { enabled: typeof patch.enabled === 'boolean' ? patch.enabled : cur.enabled, folder: typeof patch.folder === 'string' && patch.folder.trim() ? patch.folder : cur.folder };
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify(next, null, 2));
  return getConfig();
}

/** `2026-10-5, Mon`: the name of a day's note (no leading zeros, English weekday). */
export const noteName = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}, ${WEEKDAYS[d.getDay()]}`;
export const noteRel = (d, folder = getConfig().folder) => `${folder}/${noteName(d)}.md`;

/** A day from "YYYY-MM-DD" (today when empty); null when it is malformed, in the future, or more than two weeks back. */
export function parseDay(text, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (!text) return today;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  if (dayKey(d) !== text) return null;
  const back = Math.round((today - d) / 86_400_000);
  return back < 0 || back > MAX_BACK_DAYS ? null : d;
}

// ── What the Commissioner wrote (kept so the page can be reopened and edited) ──
function loadStore() {
  try { const j = JSON.parse(fs.readFileSync(reportFile(), 'utf8')); return j && typeof j.days === 'object' ? j : { days: {} }; } catch { return { days: {} }; }
}
function saveStore(store) {
  for (const old of Object.keys(store.days).sort().slice(0, -60)) delete store.days[old];
  fs.mkdirSync(path.dirname(reportFile()), { recursive: true });
  fs.writeFileSync(reportFile(), JSON.stringify(store, null, 2));
}
export const savedDay = (key) => loadStore().days[key] ?? null;

// ── The day's items ──
const plain = (t) => String(t ?? '').replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`>#|]+/g, '').replace(/^\s*(?:[-•]|\d+[.)])\s+/gm, '');

/** One sentence that says what an answer was about: its first line, without a "Laporan:" lead-in, cut at the end of the first sentence. */
export function firstSentence(text) {
  const lines = plain(text).split('\n').map((s) => s.trim()).filter(Boolean)
    .map((s) => s.replace(/^(?:laporan(?: untuk komisaris)?|ringkasan|hasil|selesai)\s*[:\-–—]\s*/i, '').trim())
    .filter((s) => s && !/^(?:laporan(?: untuk komisaris)?|ringkasan|hasil|selesai)$/i.test(s));
  const line = lines[0] ?? '';
  const m = /^(.{20,170}?[.!?])(?:\s|$)/.exec(line);
  const one = (m ? m[1] : line).slice(0, 170).trim();
  return one.charAt(0).toUpperCase() + one.slice(1);
}

/** A draft sentence for a mailbox task: from its last real answer, else its title. */
function draftOf(l) {
  const answers = (l.thread ?? []).filter((m) => m.from === 'agent' && m.kind !== 'meeting' && m.text);
  const last = [...answers].reverse().find((m) => m.kind === 'work' || m.kind === 'report') ?? answers[answers.length - 1];
  return (last && firstSentence(last.text)) || String(l.title ?? '').replace(/\s+/g, ' ').trim();
}

/** The tasks and sessions of one day: { id, kind, title, project, who, status, tokens, draft, include, at }. */
export function listItems({ date, stats, letters = [] }) {
  const key = dayKey(date);
  const items = [];
  const taskSessions = new Set();
  for (const l of letters) {
    if (l.sessionId) taskSessions.add(l.sessionId);
    if (l.report) continue;
    if (![l.createdAt, l.finishedAt].some((t) => t && dayKey(new Date(t)) === key)) continue;
    items.push({
      id: `l:${l.id}`, kind: 'task', title: String(l.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 120), project: l.project ?? '', who: l.name ?? 'Claude',
      status: l.status, tokens: l.tokens ?? 0, draft: draftOf(l), include: l.status === 'done', at: l.finishedAt ?? l.createdAt ?? null,
    });
  }
  for (const s of stats?.listSessions?.(300, MAX_BACK_DAYS + 2) ?? []) {
    if (dayKey(new Date(s.at)) !== key || taskSessions.has(s.id)) continue;
    const title = String(s.title || s.prompt || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    items.push({ id: `s:${s.id}`, kind: 'session', title, project: s.project ?? '', who: 'Claude Code', status: 'done', tokens: 0, draft: title, include: true, at: s.at });
  }
  return items.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

/** The page's data for a day: the items (with what the Commissioner already wrote over the draft), the highlights, and the day's numbers. */
export function dayView({ date, stats, letters, spend = null, now = new Date() }) {
  const key = dayKey(date);
  const saved = savedDay(key);
  const items = listItems({ date, stats, letters }).map((it) => {
    const mine = saved?.items?.[it.id];
    return { ...it, text: mine?.text ?? it.draft, include: mine ? mine.include !== false : it.include, fresh: !!saved && !mine };
  });
  return { day: key, rel: noteRel(date), items, highlights: saved?.highlights ?? '', saved: !!saved, savedAt: saved?.savedAt ?? null, tokens: spend ?? 0 };
}

// ── The note ──
/** Highlights as Obsidian callouts: one per line; "Judul: isi" gives the callout its own title, otherwise it is titled "Highlight". */
export function callouts(text) {
  const out = [];
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(.{1,50}?)\s*:\s+(.+)$/.exec(line);
    const [title, body] = m ? [m[1], m[2]] : ['Highlight', line];
    out.push(`> [!tip] ${title}\n> ${body}`);
  }
  return out;
}

/**
 * The markdown block for one day, from the items the Commissioner kept (`items`: { text, project, who }), the highlights and the day's tokens.
 * Returns null when there is nothing to say.
 */
export function buildBlock({ items = [], highlights = '', tokens = 0, now = new Date() }) {
  const kept = items.filter((it) => String(it.text ?? '').trim());
  const notes = callouts(highlights);
  if (!kept.length && !notes.length) return null;
  const lines = [BEGIN, '## Laporan hari ini', '', `**Total pekerjaan hari ini: ${kept.length}**`];
  if (notes.length) lines.push('', notes.join('\n\n'));
  if (kept.length) {
    lines.push('', '### Pekerjaan hari ini');
    const byProject = new Map();
    for (const it of kept) {
      const p = it.project || 'Lainnya';
      if (!byProject.has(p)) byProject.set(p, []);
      byProject.get(p).push(it);
    }
    for (const [project, list] of byProject) {
      lines.push('', `**${project}**`);
      for (const it of list) lines.push(`- ${String(it.text).replace(/\s+/g, ' ').trim()}${it.who ? ` · ${it.who}` : ''}`);
    }
  }
  if (tokens > 0) lines.push('', '### Pemakaian', `- Token hari ini: ${tok(tokens)}`);
  lines.push('', `<small>Diperbarui ${clock(now.toISOString())}</small>`, END);
  return lines.join('\n');
}

/** The block already in a note, or null. */
export function blockOf(existing) {
  const text = String(existing ?? '');
  const a = text.indexOf(BEGIN);
  const b = text.indexOf(END);
  return a >= 0 && b > a ? text.slice(a, b + END.length) : null;
}

/** Puts the block into the note's text: replaces the old one between the markers, or adds it at the end. */
export function putBlock(existing, block) {
  const text = String(existing ?? '');
  const a = text.indexOf(BEGIN);
  const b = text.indexOf(END);
  if (a >= 0 && b > a) return text.slice(0, a) + block + text.slice(b + END.length);
  if (!text.trim()) return `${block}\n`;
  return `${text.replace(/\s+$/, '')}\n\n${block}\n`;
}

const stable = (block) => String(block ?? '').replace(/<small>Diperbarui[^<]*<\/small>/, '');

/**
 * Saves what the Commissioner wrote for a day and writes the note. `payload`: { items: [{ id, text, include }], highlights }.
 * Returns { rel, wrote, reason }: reason is 'ok', 'quiet' (nothing to say), 'same' (the note already says this), 'off', 'vault' or 'write'. `vaultApi` is for tests.
 */
export function saveDay({ date, stats, letters, spend = null, payload, now = new Date(), vaultApi = vault }) {
  const cfg = getConfig();
  const rel = noteRel(date, cfg.folder);
  if (!cfg.enabled) return { rel, wrote: false, reason: 'off' };
  if (!vaultApi.usable().dir) return { rel, wrote: false, reason: 'vault' };
  const view = dayView({ date, stats, letters, spend, now });
  const known = new Set(view.items.map((it) => it.id));
  const mine = {};
  for (const p of Array.isArray(payload?.items) ? payload.items : []) {
    if (!known.has(String(p?.id))) continue; // only items of that day
    mine[String(p.id)] = { text: String(p.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 300), include: p.include !== false };
  }
  const highlights = String(payload?.highlights ?? '').slice(0, 2000);
  const store = loadStore();
  store.days[dayKey(date)] = { items: mine, highlights, savedAt: now.toISOString() };
  try { saveStore(store); } catch { return { rel, wrote: false, reason: 'write' }; }
  const kept = view.items.filter((it) => mine[it.id]?.include).map((it) => ({ ...it, text: mine[it.id].text || it.draft }));
  const block = buildBlock({ items: kept, highlights, tokens: spend ?? 0, now });
  if (!block) return { rel, wrote: false, reason: 'quiet' };
  const existing = vaultApi.read(rel);
  if (stable(blockOf(existing)) === stable(block)) return { rel, wrote: false, reason: 'same' };
  try { return vaultApi.write(rel, putBlock(existing, block)) ? { rel, wrote: true, reason: 'ok' } : { rel, wrote: false, reason: 'write' }; } catch { return { rel, wrote: false, reason: 'write' }; }
}
