// Villager names the Commissioner chose, shared by every view (stored in ~/.pixel-agents/asaoffice-names.json).
//   staff:   { "<agent id>": "Name" }   a staff member's name (Shades, the director, can't be renamed)
//   palette: { "<face index>": "Name" } an ordinary villager's name, by face (sessions come and go, faces stay)
// An empty name puts the original back. The staff roster file itself is never touched.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const file = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-names.json');
const MAX_NAME = 20;

export function loadNames() {
  try {
    const j = JSON.parse(fs.readFileSync(file(), 'utf8'));
    return { staff: j.staff && typeof j.staff === 'object' ? j.staff : {}, palette: j.palette && typeof j.palette === 'object' ? j.palette : {} };
  } catch {
    return { staff: {}, palette: {} };
  }
}

/** A tidy name (≤ 20 characters, no control characters), or '' to reset. */
export const cleanName = (raw) => String(raw ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

/**
 * Sets (or resets) a name. kind 'staff' needs one of `agents` (the renameable staff ids), kind 'palette' a face 0–11.
 * Returns the new names, or null when the request isn't valid.
 */
export function setName(kind, key, name, agents) {
  const names = loadNames();
  const clean = cleanName(name);
  if (kind === 'staff') {
    if (!agents.includes(String(key))) return null;
    if (clean) names.staff[String(key)] = clean; else delete names.staff[String(key)];
  } else if (kind === 'palette') {
    const i = Number(key);
    if (!Number.isInteger(i) || i < 0 || i > 11) return null;
    if (clean) names.palette[String(i)] = clean; else delete names.palette[String(i)];
  } else return null;
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(`${file()}.tmp`, JSON.stringify(names, null, 2));
  fs.renameSync(`${file()}.tmp`, file());
  return names;
}
