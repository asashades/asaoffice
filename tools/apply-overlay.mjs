// Optional: swap pixel-agents' bundled-only art (floors, walls, base characters) for the
// Stardew versions in overlay/, and install the office addon (addon/: idle chat, villager card,
// calendar, Holo-board). External asset
// directories can't do either, so this patches the *installed copy* in node_modules — never
// the pixel-agents source.
//   node tools/apply-overlay.mjs                 apply (backs up originals once)
//   node tools/apply-overlay.mjs --no-addon      art only; also removes a previously installed addon
//                                                (--no-idle-chat is an older alias)
//   node tools/apply-overlay.mjs --restore       put the originals back
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pixelAgentsDist } from './lib/paths.mjs';
import { applyWebviewAddon, restoreWebviewAddon } from './lib/webview-addon.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = pixelAgentsDist(root);
const overlay = path.join(root, 'overlay');
const backup = path.join(dist, '.asaoffice-backup');
const restore = process.argv.includes('--restore');
const addon = !process.argv.includes('--no-addon') && !process.argv.includes('--no-idle-chat');

// The server reads dist/assets; dist/webview/assets is the webview's copy — patch both.
const targets = [path.join(dist, 'assets'), path.join(dist, 'webview', 'assets')].filter((d) => fs.existsSync(d));

const files = [];
for (const sub of fs.readdirSync(overlay)) {
  for (const f of fs.readdirSync(path.join(overlay, sub))) files.push(path.join(sub, f));
}

let changed = 0;
for (const target of targets) {
  const key = path.relative(dist, target);
  for (const rel of files) {
    const dest = path.join(target, rel);
    const saved = path.join(backup, key, rel);
    if (restore) {
      if (fs.existsSync(saved)) {
        fs.copyFileSync(saved, dest);
        changed++;
      }
      continue;
    }
    if (fs.existsSync(dest) && !fs.existsSync(saved)) {
      fs.mkdirSync(path.dirname(saved), { recursive: true });
      fs.copyFileSync(dest, saved);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(overlay, rel), dest);
    changed++;
  }
}

if (restore || !addon) {
  const n = restoreWebviewAddon(dist, backup);
  if (restore) changed += n;
} else {
  try {
    console.log(applyWebviewAddon(root, dist, backup));
  } catch (err) {
    console.warn(`Skipped the office addon: ${err.message}`);
  }
}

if (restore) {
  fs.rmSync(backup, { recursive: true, force: true });
  console.log(`Restored ${changed} original pixel-agents files.`);
} else {
  console.log(`Overlay applied: ${changed} files in ${path.relative(root, dist)} (originals kept in .asaoffice-backup).`);
  console.log('Restart the office server to pick it up. Re-run after every `npm install`.');
}
