// macOS notifications from the office server, so a permission question or a finished task reaches you even when the browser is closed.
// Uses `terminal-notifier` when it is installed (clicking opens the office), otherwise `osascript display notification`
// (clicking opens Script Editor: a macOS limit). Texts go in as arguments, never spliced into a script.
import { spawn, spawnSync } from 'node:child_process';

const COOLDOWN_MS = 3000; // the same key twice within this is one notification
const clean = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

let tnPath; // undefined = not looked up yet, null = not installed
function terminalNotifier() {
  if (tnPath === undefined) {
    try {
      const r = spawnSync('which', ['terminal-notifier'], { encoding: 'utf8' });
      tnPath = r.status === 0 && r.stdout.trim() ? r.stdout.trim() : null;
    } catch { tnPath = null; }
  }
  return tnPath;
}

/** The command that shows one notification: { cmd, args }. `tn` is the path of terminal-notifier or null. */
export function buildCommand({ title, subtitle = '', body = '', sound = 'Glass', url = '', group = '' }, tn = terminalNotifier()) {
  const t = clean(title, 80) || 'Asa Office';
  const st = clean(subtitle, 80);
  const b = clean(body, 200) || ' ';
  if (tn) {
    return { cmd: tn, args: ['-title', t, ...(st ? ['-subtitle', st] : []), '-message', b, '-sound', sound, ...(group ? ['-group', group] : []), ...(url ? ['-open', url] : [])] };
  }
  return {
    cmd: 'osascript',
    args: ['-e', 'on run argv', '-e', 'display notification (item 1 of argv) with title (item 2 of argv) subtitle (item 3 of argv) sound name (item 4 of argv)', '-e', 'end run', '--', b, t, st, sound],
  };
}

const defaultRun = (cmd, args) => { spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref(); };

/** send({ key, title, subtitle, body, sound, url }) shows a notification (never throws; nothing off macOS). */
export function createNotifier({ run = defaultRun, platform = process.platform } = {}) {
  const last = new Map();
  return {
    send(n) {
      if (platform !== 'darwin') return false;
      const now = Date.now();
      const key = n.key ?? n.title;
      if (now - (last.get(key) ?? 0) < COOLDOWN_MS) return false;
      last.set(key, now);
      for (const [k, at] of last) if (now - at > 60_000) last.delete(k);
      try {
        const { cmd, args } = buildCommand({ ...n, group: n.group ?? key });
        run(cmd, args);
        return true;
      } catch { return false; }
    },
  };
}
