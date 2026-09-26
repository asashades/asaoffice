// Exposes the running office (127.0.0.1:$OFFICE_PORT) to your phone through Cloudflare Tunnel
// (preferred, no account needed) or ngrok, then prints the phone URL with the session token
// plus a QR code. The Host header is passed through untouched, which pixel-agents' same-origin
// WebSocket check needs — don't add --http-host-header / --host-header=rewrite.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import qrcode from 'qrcode-terminal';

const port = Number(process.env.OFFICE_PORT || 3100);
const want = process.argv.includes('--ngrok') ? 'ngrok' : process.argv.includes('--cloudflared') ? 'cloudflared' : null;
const noQr = process.argv.includes('--no-qr');

function has(bin) {
  return spawnSync(bin, ['--version'], { stdio: 'ignore' }).status === 0;
}

function officeToken() {
  const dir = path.join(os.homedir(), '.pixel-agents', 'servers');
  if (!fs.existsSync(dir)) return null;
  for (const f of fs.readdirSync(dir)) {
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (entry.port !== port) continue;
      process.kill(entry.pid, 0); // throws if that server is gone
      return entry.token;
    } catch {
      /* stale or unreadable registration */
    }
  }
  return null;
}

const token = officeToken();
if (!token) {
  console.error(`No running pixel-agents server on port ${port}. Start it first: npm run office`);
  process.exit(1);
}

const tool = want ?? (has('cloudflared') ? 'cloudflared' : has('ngrok') ? 'ngrok' : null);
if (!tool || !has(tool)) {
  console.error('Install a tunnel first:\n  cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n  ngrok:       https://ngrok.com/download');
  process.exit(1);
}

const args =
  tool === 'cloudflared'
    ? ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`]
    : ['http', String(port), '--log', 'stdout', '--log-format', 'logfmt'];
const child = spawn(tool, args, { stdio: ['ignore', 'pipe', 'pipe'] });

let shown = false;
const urlRe = tool === 'cloudflared' ? /https:\/\/[a-z0-9-]+\.trycloudflare\.com/ : /url=(https:\/\/[^\s]+)/;
function scan(chunk) {
  const text = chunk.toString();
  if (process.argv.includes('--verbose')) process.stderr.write(text);
  if (shown) return;
  const m = text.match(urlRe);
  if (!m) return;
  shown = true;
  const base = (m[1] ?? m[0]).replace(/\/$/, '');
  const phoneUrl = `${base}/?token=${token}`;
  console.log(`\n[asaoffice] ${tool} tunnel is up.\n\n  ${phoneUrl}\n`);
  if (!noQr) qrcode.generate(phoneUrl, { small: true });
  console.log('Treat this link like a password: anyone holding it can approve hook installs.');
  console.log("Don't paste it in shared chats. The URL changes each time the tunnel restarts. Ctrl+C to stop.\n");
}
child.stdout.on('data', scan);
child.stderr.on('data', scan);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code) => {
  if (!shown) console.error(`${tool} exited (${code}) before a URL appeared — re-run with --verbose.`);
  process.exit(code ?? 0);
});
