// Writes layouts/stardew-office.json to ~/.pixel-agents/layout.json (the file the office loads),
// backing up any existing layout first. Same result as Layout → Import in the browser.
// Run with the office server stopped, or it may save its in-memory layout over this one.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'layouts', 'stardew-office.json');
const dest = path.join(os.homedir(), '.pixel-agents', 'layout.json');

fs.mkdirSync(path.dirname(dest), { recursive: true });
if (fs.existsSync(dest)) {
  const bak = `${dest}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  fs.copyFileSync(dest, bak);
  console.log(`Backed up existing layout → ${bak}`);
}
fs.copyFileSync(src, dest);
console.log(`Installed ${path.relative(root, src)} → ${dest}`);

// The office remembers which seat each villager sat in by furniture id, and ids are reused by a new layout for other
// furniture: forget those seats (people just sit down again) so nobody is sent to a desk that is now a sofa or a wall.
const stateFile = path.join(os.homedir(), '.pixel-agents', 'standalone-state.json');
try {
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  if (state.seats && Object.keys(state.seats).length) {
    state.seats = {};
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    console.log('Cleared remembered seats (they pointed into the old layout).');
  }
} catch { /* no saved state yet */ }
