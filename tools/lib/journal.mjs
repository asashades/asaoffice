// The daily summary in the Commissioner's Obsidian journal: what was worked on today (mailbox tasks, Claude Code sessions, the numbers, what is waiting) is kept in
// the day's note in the vault, in a block of its own, so it sits with the rest of the daily notes. The note is named the way the obsidian-journal plugin
// names it, `2026-10-5, Mon` (year-month-day without leading zeros, then the English short weekday), in the folder `1-Fleeting Journal`. A note made by hand with a name and
// folder that match is adopted by that plugin, so the office can create the day's note before the plugin does. Only the block between the two markers is ever
// rewritten (when its content changed); everything else in the note is yours.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as vault from './vault.mjs';
import { fmtTokens } from './usage.mjs';

const configFile = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-journal.json');
export const DEFAULT_FOLDER = '1-Fleeting Journal';
const BEGIN = '<!-- asaoffice:begin -->';
const END = '<!-- asaoffice:end -->';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clock = (iso) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? `${pad(d.getHours())}.${pad(d.getMinutes())}` : ''; };
const tok = (n) => `${fmtTokens(n)} token`;

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

const STATUS = { done: ['✅', 'selesai'], awaiting: ['📝', 'rencana menunggu persetujuanmu'], running: ['⏳', 'masih berjalan'], queued: ['⏳', 'antre'], error: ['⚠️', 'gagal'], stopped: ['⏹', 'dihentikan'], rejected: ['❌', 'ditolak'] };

/**
 * The markdown block for one day. `stats` is the ClaudeStats of the office, `letters` the mailbox letters, `spend` what the day cost (or null).
 * Returns null when nothing happened that day (no note is made for a quiet day).
 */
export function buildBlock({ date, stats, letters = [], spend = null, now = new Date() }) {
  const key = dayKey(date);
  const snap = stats?.snapshot?.(now)?.days?.[key];
  const mine = letters.filter((l) => !l.report && [l.createdAt, l.finishedAt].some((t) => t && dayKey(new Date(t)) === key));
  const sessions = (stats?.listSessions?.(300, 60) ?? []).filter((s) => dayKey(new Date(s.at)) === key);
  if (!snap?.tools && !mine.length && !sessions.length) return null;
  const done = mine.filter((l) => l.status === 'done').length;
  const bits = [];
  if (snap?.sessions || sessions.length) bits.push(`${Math.max(snap?.sessions ?? 0, sessions.length)} sesi Claude Code`);
  if (snap?.tools) bits.push(`${snap.tools} tool call`);
  if (snap?.edit) bits.push(`${snap.edit} edit`);
  if (snap?.files) bits.push(`${snap.files} file diedit`);
  if (mine.length) bits.push(`${mine.length} tugas kotak surat${done ? ` (${done} selesai)` : ''}`);
  if (spend > 0) bits.push(`±${tok(spend)}`);
  const lines = [BEGIN, '## Asa Office: rangkuman hari ini', '', '> Ditulis otomatis oleh Asa Office. Hanya bagian di antara dua penanda ini yang ditimpa; tulis catatanmu di luarnya.', '', `**Ringkasan:** ${bits.join(' · ') || 'belum ada aktivitas'}`];
  if (mine.length) {
    lines.push('', '### Tugas di kotak surat');
    const order = ['done', 'awaiting', 'running', 'queued', 'error', 'stopped', 'rejected'];
    for (const l of [...mine].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || String(a.createdAt).localeCompare(String(b.createdAt)))) {
      const [icon, label] = STATUS[l.status] ?? ['•', l.status];
      const meet = l.meeting?.participants?.length ? ` · rapat dengan ${l.meeting.participants.map((p) => p.name).join(', ')}` : '';
      const wt = l.wt?.branch ? ` · cabang ${l.wt.branch}` : '';
      const cost = l.tokens ? ` · ${tok(l.tokens)}` : '';
      lines.push(`- ${icon} **${String(l.title ?? '').replace(/\s+/g, ' ').slice(0, 90)}**: ${[l.name, l.project].filter(Boolean).join(' · ') || 'Claude'}${meet}${wt} · ${label}${l.finishedAt ? ` ${clock(l.finishedAt)}` : ''}${cost}`);
    }
  }
  if (sessions.length) {
    lines.push('', '### Sesi Claude Code');
    for (const s of sessions.slice(0, 12)) lines.push(`- **${s.project ?? '—'}**: ${String(s.title || s.prompt || '(tanpa judul)').replace(/\s+/g, ' ').slice(0, 100)}`);
  }
  lines.push('', `<small>Diperbarui ${clock(now.toISOString())}</small>`, END);
  return lines.join('\n');
}

const stable = (block) => String(block ?? '').replace(/<small>Diperbarui[^<]*<\/small>/, '');

/** Puts the block into the note's text: replaces the old one between the markers, or adds it at the end. */
export function putBlock(existing, block) {
  const text = String(existing ?? '');
  const a = text.indexOf(BEGIN);
  const b = text.indexOf(END);
  if (a >= 0 && b > a) return text.slice(0, a) + block + text.slice(b + END.length);
  if (!text.trim()) return `${block}\n`;
  return `${text.replace(/\s+$/, '')}\n\n${block}\n`;
}

/** The block already in a note, or null. */
export function blockOf(existing) {
  const text = String(existing ?? '');
  const a = text.indexOf(BEGIN);
  const b = text.indexOf(END);
  return a >= 0 && b > a ? text.slice(a, b + END.length) : null;
}

/**
 * Writes the summary of one day into its note. Returns { rel, wrote, reason }: reason is 'quiet' (nothing happened), 'same' (the block is already up to date),
 * 'off', 'vault' (the vault can't be opened) or 'write' (failed). `vaultApi` is for tests.
 */
export function writeDay({ date, stats, letters, spend, now = new Date(), vaultApi = vault }) {
  const cfg = getConfig();
  const rel = noteRel(date, cfg.folder);
  if (!cfg.enabled) return { rel, wrote: false, reason: 'off' };
  if (!vaultApi.usable().dir) return { rel, wrote: false, reason: 'vault' };
  const block = buildBlock({ date, stats, letters, spend, now });
  if (!block) return { rel, wrote: false, reason: 'quiet' };
  const existing = vaultApi.read(rel);
  if (stable(blockOf(existing)) === stable(block)) return { rel, wrote: false, reason: 'same' };
  try { return vaultApi.write(rel, putBlock(existing, block)) ? { rel, wrote: true, reason: 'ok' } : { rel, wrote: false, reason: 'write' }; } catch { return { rel, wrote: false, reason: 'write' }; }
}

/** Today's note, and yesterday's once as well (so the last stretch before midnight is in it). */
export function sync({ stats, letters, spendOn = () => null, now = new Date(), includeYesterday = false }) {
  const days = includeYesterday ? [new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), now] : [now];
  return days.map((date) => writeDay({ date, stats, letters, spend: spendOn(dayKey(date)), now }));
}
