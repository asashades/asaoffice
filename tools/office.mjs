// Starts the pixel-agents standalone server installed in this repo (so the overlay applies),
// watching the workspace you ran npm from. Always binds to 127.0.0.1 — use the tunnel for phones.
// Also feeds the addon's calendar and Holo-board panels (see lib/office-data.mjs).
//   cd ~/code/my-project && npm --prefix ~/asaoffice run office
//   extra flags pass through:  npm run office -- --no-terminal
//   OFFICE_CALENDAR=off        never read macOS Calendar
//   OFFICE_TASKS=off           don't accept tasks from the office (mailbox stays read-only)
//   OFFICE_TASK_PORT=3101      port of the local task API (default office port + 1)
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { startOfficeData } from './lib/office-data.mjs';
import { pixelAgentsDist } from './lib/paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = pixelAgentsDist(root);
const cli = path.join(dist, 'cli.js');
const workspace = process.env.OFFICE_WORKSPACE || process.env.INIT_CWD || process.cwd();
const port = process.env.OFFICE_PORT || '3100';
const extra = process.argv.slice(2);
if (extra.includes('--host')) {
  console.error('asaoffice keeps the server on 127.0.0.1; reach it remotely with `npm run tunnel` instead.');
  process.exit(1);
}

console.log(`[asaoffice] workspace: ${workspace}`);
const child = spawn(process.execPath, [cli, '--host', '127.0.0.1', '--port', port, ...extra], { cwd: workspace, stdio: 'inherit' });
let stopData = () => {};
startOfficeData({
  root,
  webviewDir: path.join(dist, 'webview'),
  pid: child.pid,
  port,
  calendar: process.env.OFFICE_CALENDAR !== 'off',
  tasks: process.env.OFFICE_TASKS !== 'off',
  taskPort: process.env.OFFICE_TASK_PORT ? Number(process.env.OFFICE_TASK_PORT) : undefined,
  workspace,
}).then((stop) => { stopData = stop; });
// SIGHUP too: closing the Terminal window should also stop the server and remove the data file.
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => child.kill(sig === 'SIGHUP' ? 'SIGTERM' : sig));
process.on('exit', () => stopData());
child.on('exit', (code) => process.exit(code ?? 0));
