// Backend of the "Asa Office" Mac app (see tools/install-app.mjs). The app calls:
//   node tools/app.mjs open   start the office in the background if it isn't running, then open it
//                             in its own app window (Chrome/Edge/Brave --app, else the default browser)
//   node tools/app.mjs stop   stop the office this app started (one started from Terminal is left alone)
//   node tools/app.mjs url    print the running office's URL (it contains the secret token)
//   node tools/app.mjs browser [auto|default|<app name>]   choose which browser opens the office (no value: show the choice and what is installed)
// Env: OFFICE_PORT (default 3100), ASAOFFICE_NO_BROWSER=1 (print instead of opening; for testing).
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.OFFICE_PORT || '3100';
const home = os.homedir();
const stateDir = path.join(home, 'Library', 'Application Support', 'asaoffice');
const pidFile = path.join(stateDir, 'office.pid');
const logFile = path.join(home, 'Library', 'Logs', 'asaoffice', 'office.log');
const APP_BROWSERS = ['Google Chrome', 'Microsoft Edge', 'Brave Browser', 'Chromium']; // these can open a window of their own (--app=…)
const OTHER_BROWSERS = ['Safari', 'Firefox', 'Arc', 'Vivaldi', 'Opera', 'Zen'];
const settingFile = path.join(home, '.pixel-agents', 'asaoffice-app.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** The live pixel-agents server on our port, from its registry file: { pid, token } or null. */
function runningServer() {
  const dir = path.join(home, '.pixel-agents', 'servers');
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(`-${port}.json`)); } catch { return null; }
  for (const f of files) {
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (entry.servesSpa && typeof entry.token === 'string' && alive(entry.pid)) return entry;
    } catch { /* partial write or stale */ }
  }
  return null;
}

const officeUrl = (server) => `http://127.0.0.1:${port}/?token=${encodeURIComponent(server.token)}`;

function startOffice() {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const log = fs.openSync(logFile, 'a');
  fs.writeSync(log, `\n--- ${new Date().toISOString()} starting office from the Asa Office app\n`);
  // Detached, with no stdio tied to the caller, so the app's `do shell script` returns right away.
  const child = spawn(process.execPath, [path.join(root, 'tools', 'office.mjs'), '--no-terminal'], {
    cwd: root,
    env: { ...process.env, OFFICE_PORT: port, OFFICE_WORKSPACE: process.env.OFFICE_WORKSPACE || root },
    detached: true,
    stdio: ['ignore', log, log],
  });
  child.unref();
  fs.writeFileSync(pidFile, String(child.pid));
}

async function waitForServer(timeoutMs = 45_000) {
  for (const end = Date.now() + timeoutMs; Date.now() < end; await sleep(400)) {
    const server = runningServer();
    if (server) return server;
  }
  throw new Error(`the office didn't start within ${timeoutMs / 1000}s — see ${logFile}`);
}

/** Whether macOS can find an app by this name (Safari lives outside /Applications on recent macOS, so ask Launch Services). */
function hasApp(name) {
  try { execFileSync('open', ['-Ra', name], { stdio: 'ignore' }); return true; } catch { return false; }
}

/** The browser choice: 'auto' (a Chromium-family browser in its own window, else the default one), 'default' (the Mac's default browser), or an app name. */
function chosenBrowser() {
  if (process.env.ASAOFFICE_BROWSER) return process.env.ASAOFFICE_BROWSER;
  try { const b = JSON.parse(fs.readFileSync(settingFile, 'utf8')).browser; if (typeof b === 'string' && b.trim()) return b.trim(); } catch { /* none chosen */ }
  return 'auto';
}

function appBrowser() {
  for (const name of APP_BROWSERS) {
    for (const dir of ['/Applications', path.join(home, 'Applications')]) {
      if (fs.existsSync(path.join(dir, `${name}.app`))) return name;
    }
  }
  return null;
}

function openWindow(url) {
  if (process.env.ASAOFFICE_NO_BROWSER === '1') {
    console.log(url);
    return;
  }
  const choice = chosenBrowser();
  if (choice === 'default') return void execFileSync('open', [url]);
  if (choice !== 'auto') {
    // A named browser: Chromium-family ones get a window of their own, the others open a tab. If it is gone, the default browser takes over.
    if (APP_BROWSERS.includes(choice) && hasApp(choice)) return void execFileSync('open', ['-na', choice, '--args', `--app=${url}`, '--window-size=1280,860']);
    if (hasApp(choice)) return void execFileSync('open', ['-a', choice, url]);
    return void execFileSync('open', [url]);
  }
  const browser = appBrowser();
  if (browser) {
    execFileSync('open', ['-na', browser, '--args', `--app=${url}`, '--window-size=1280,860']);
  } else {
    execFileSync('open', [url]);
  }
}

/** `browser`: show the choice and the installed browsers; `browser <value>`: save it (auto, default, or an app name that exists). */
function browserCmd(value) {
  if (!value) {
    const installed = [...APP_BROWSERS, ...OTHER_BROWSERS].filter(hasApp);
    console.log(`Browser for the Asa Office app: ${chosenBrowser()}\nInstalled: ${installed.join(', ') || '(none found)'}\nChange it: npm run browser -- <auto | default | ${installed[0] ?? 'Safari'}>`);
    return;
  }
  const v = value.trim();
  const canon = /^auto$/i.test(v) ? 'auto' : /^(default|bawaan)$/i.test(v) ? 'default' : v;
  if (canon !== 'auto' && canon !== 'default' && !hasApp(canon)) throw new Error(`no app named "${canon}" was found (names are like "Safari" or "Google Chrome")`);
  fs.mkdirSync(path.dirname(settingFile), { recursive: true });
  fs.writeFileSync(settingFile, JSON.stringify({ browser: canon }, null, 2));
  console.log(`Saved: the Asa Office app now opens in ${canon === 'auto' ? 'auto mode (Chrome, Edge or Brave window if installed, else the default browser)' : canon === 'default' ? 'the default browser of this Mac' : canon}. Takes effect the next time you click the app.`);
}

async function open() {
  let server = runningServer();
  if (!server) {
    startOffice();
    server = await waitForServer();
  }
  openWindow(officeUrl(server));
}

async function stop() {
  let pid;
  try { pid = Number(fs.readFileSync(pidFile, 'utf8')); } catch { return; }
  fs.rmSync(pidFile, { force: true });
  if (!pid || !alive(pid)) return;
  process.kill(pid, 'SIGTERM'); // office.mjs stops pixel-agents and removes its data file
  for (let i = 0; i < 25 && alive(pid); i++) await sleep(200);
}

const cmd = process.argv[2];
try {
  if (cmd === 'open') await open();
  else if (cmd === 'stop') await stop();
  else if (cmd === 'browser') browserCmd(process.argv.slice(3).join(' '));
  else if (cmd === 'url') {
    const server = runningServer();
    if (!server) throw new Error('the office is not running');
    console.log(officeUrl(server));
  } else {
    console.error('usage: node tools/app.mjs open | stop | url | browser [auto|default|<app name>]');
    process.exit(2);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
