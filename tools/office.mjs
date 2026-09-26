// Starts the pixel-agents standalone server installed in this repo (so the overlay applies),
// watching the workspace you ran npm from. Always binds to 127.0.0.1 — use the tunnel for phones.
//   cd ~/code/my-project && npm --prefix ~/asaoffice run office
//   extra flags pass through:  npm run office -- --no-terminal
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pixelAgentsDist } from './lib/paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(pixelAgentsDist(root), 'cli.js');
const workspace = process.env.OFFICE_WORKSPACE || process.env.INIT_CWD || process.cwd();
const port = process.env.OFFICE_PORT || '3100';
const extra = process.argv.slice(2);
if (extra.includes('--host')) {
  console.error('asaoffice keeps the server on 127.0.0.1; reach it remotely with `npm run tunnel` instead.');
  process.exit(1);
}

console.log(`[asaoffice] workspace: ${workspace}`);
const child = spawn(process.execPath, [cli, '--host', '127.0.0.1', '--port', port, ...extra], { cwd: workspace, stdio: 'inherit' });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code) => process.exit(code ?? 0));
