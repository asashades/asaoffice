// Installs the office staff (staff/agents/*.md) as Claude Code subagents in ~/.claude/agents/, so every
// Claude Code session on this Mac can call on them ("minta Wren ngetes ini", "suruh Pip review").
//   npm run staff             install or update (a different file with the same name is backed up first)
//   npm run staff -- --remove remove them again
// The office recognises them by name when they're spawned and shows their villager (staff/roster.json).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'staff', 'agents');
const dest = path.join(os.homedir(), '.claude', 'agents');
const remove = process.argv.includes('--remove');
const roster = JSON.parse(fs.readFileSync(path.join(root, 'staff', 'roster.json'), 'utf8')).staff;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

fs.mkdirSync(dest, { recursive: true });
for (const member of roster) {
  const file = `${member.agent}.md`;
  const from = path.join(src, file);
  const to = path.join(dest, file);
  const ours = fs.readFileSync(from, 'utf8');
  const theirs = fs.existsSync(to) ? fs.readFileSync(to, 'utf8') : null;
  if (remove) {
    if (theirs === null) continue;
    if (theirs !== ours) fs.copyFileSync(to, `${to}.bak-${stamp}`); // edited by you: keep a copy
    fs.rmSync(to);
    console.log(`Removed ${member.name} (${to})`);
    continue;
  }
  if (theirs === ours) {
    console.log(`✓ ${member.name} — ${member.role.id} (already up to date)`);
    continue;
  }
  if (theirs !== null) fs.copyFileSync(to, `${to}.bak-${stamp}`);
  fs.writeFileSync(to, ours);
  console.log(`✓ ${member.name} — ${member.role.id}${theirs !== null ? ' (updated; old file backed up)' : ''}`);
}
if (!remove) {
  console.log(`\nStaff installed in ${dest}.`);
  console.log('Start a new Claude Code session (or /exit and run `claude` again), then ask e.g. "minta Wren ngetes perubahan ini".');
  console.log('Restart the office so it picks up who is on staff.');
}
