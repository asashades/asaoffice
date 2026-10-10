// Task templates ("Templat"): a saved task you start with one click: the text, who does it, the way of working, the model and the permission mode,
// and optionally the project. Stored in ~/.pixel-agents/asaoffice-templates.json. A template never runs by itself: the mailbox fills the new-chat form
// with it (or sends it, behind the same 3-second "Batalkan" window as any new task), and the schedule form can start from one.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const MAX_TEMPLATES = 30;
const MAX_NAME = 40;
const file = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-templates.json');

// What a new office starts with (the old "try this" suggestions, now with the right person for the job).
const SEEDS = [
  { name: 'Cek status proyek', prompt: 'Cek status proyek ini: baca perubahan terbaru, lalu tulis ringkasan singkat apa yang sudah dan belum selesai.', agent: null, mode: 'report' },
  { name: 'Jalankan tes', prompt: 'Jalankan semua tes di proyek ini, lalu laporkan mana yang gagal dan kenapa.', agent: 'wren-tester', mode: 'auto' },
  { name: 'Review perubahan terakhir', prompt: 'Review perubahan terakhir (git diff) untuk bug, masalah keamanan, dan kode yang membingungkan.', agent: 'pip-reviewer', mode: 'report' },
];

const withIds = (list) => list.map((t) => ({ id: crypto.randomUUID().slice(0, 8), cwd: '', model: null, perm: 'manual', ...t }));

export function loadTemplates() {
  try {
    const j = JSON.parse(fs.readFileSync(file(), 'utf8'));
    if (Array.isArray(j?.templates)) return j.templates.slice(0, MAX_TEMPLATES);
  } catch { /* first run, or unreadable: start from the seeds */ }
  return withIds(SEEDS);
}

export function saveTemplates(list) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(`${file()}.tmp`, JSON.stringify({ templates: list }, null, 2));
  fs.renameSync(`${file()}.tmp`, file());
}

/** A clean template from untrusted input, or null. The task server passes what is valid on this Mac. */
export function cleanTemplate(input, { maxPrompt, agents, knownCwd, cleanModel, perms, modes }) {
  const b = input ?? {};
  const prompt = String(b.prompt ?? '').trim();
  if (!prompt || prompt.length > maxPrompt) return null;
  const name = String(b.name ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) || prompt.split('\n')[0].replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  const agent = b.agent ? String(b.agent) : null;
  if (agent && !agents.includes(agent)) return null;
  const cwd = b.cwd ? String(b.cwd) : '';
  if (cwd && !knownCwd(cwd)) return null;
  return {
    name, prompt, agent, cwd, mode: modes.includes(b.mode) ? b.mode : agent ? 'auto' : 'auto',
    model: cleanModel(b.model) ?? null, perm: perms.includes(b.perm) ? b.perm : 'manual',
  };
}

export const newTemplate = (clean) => ({ id: crypto.randomUUID().slice(0, 8), ...clean, createdAt: new Date().toISOString() });
