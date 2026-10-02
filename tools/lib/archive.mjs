// What the Commissioner archived among the chats that aren't mailbox letters: Claude Code sessions started outside the office
// and the daily reports. (Mailbox letters carry their own `archived` flag in asaoffice-mail.json.) Kept in
// ~/.pixel-agents/asaoffice-archive.json so every view of the office agrees; archiving only hides, nothing is deleted.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const file = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-archive.json');
const KEEP = 500;
const KINDS = { sessions: /^[\w.-]{1,100}$/, reports: /^\d{4}-\d{2}-\d{2}$/ };

export function loadArchive() {
  try {
    const j = JSON.parse(fs.readFileSync(file(), 'utf8'));
    const pick = (kind) => (Array.isArray(j[kind]) ? j[kind].filter((id) => typeof id === 'string' && KINDS[kind].test(id)).slice(-KEEP) : []);
    return { sessions: pick('sessions'), reports: pick('reports') };
  } catch {
    return { sessions: [], reports: [] };
  }
}

/** Archives or restores sessions or reports (one id or a list). Returns the new archive, or null when the request is invalid. */
export function setArchived(kind, ids, archived) {
  const wanted = (Array.isArray(ids) ? ids : [ids]).slice(0, KEEP);
  if (!KINDS[kind] || !wanted.length || wanted.some((id) => typeof id !== 'string' || !KINDS[kind].test(id))) return null;
  const all = loadArchive();
  const list = all[kind].filter((x) => !wanted.includes(x));
  if (archived) list.push(...wanted);
  all[kind] = list.slice(-KEEP);
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(`${file()}.tmp`, JSON.stringify(all));
  fs.renameSync(`${file()}.tmp`, file());
  return all;
}
