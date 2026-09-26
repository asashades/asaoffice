// Adds stardew-pack/ to ~/.pixel-agents/config.json → externalAssetDirectories.
// Same effect as Settings → Add Asset Directory, handy on a headless box. Run while the
// office server is stopped (it reads the config on startup).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = path.join(root, 'stardew-pack');
const file = path.join(os.homedir(), '.pixel-agents', 'config.json');
const remove = process.argv.includes('--remove');

let cfg = {};
if (fs.existsSync(file)) {
  try {
    cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    console.error(`${file} is not valid JSON — fix or delete it first.`);
    process.exit(1);
  }
}
const dirs = Array.isArray(cfg.externalAssetDirectories) ? cfg.externalAssetDirectories : [];
cfg.externalAssetDirectories = remove ? dirs.filter((d) => d !== pack) : dirs.includes(pack) ? dirs : [...dirs, pack];

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
console.log(`${remove ? 'Removed' : 'Registered'} ${pack} ${remove ? 'from' : 'in'} ${file}`);
