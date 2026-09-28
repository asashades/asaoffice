// Installs addon/ (idle chat, villager card, calendar, Holo-board) into the installed pixel-agents webview: copies the scripts to
// dist/webview/asaoffice/, adds <script> tags to index.html, and patches one spot in the bundle
// so it calls window.__asaoffice.afterRender(...) after each frame. Originals go to the same
// .asaoffice-backup folder the art overlay uses. Only the installed copy in node_modules changes.
import fs from 'node:fs';
import path from 'node:path';

// Load order matters: core.js first (settings, frame hook, panels), then the add-ons.
const SCRIPTS = ['core.js', 'idle-chat-lines.js', 'idle-chat.js', 'villager-card.js', 'calendar.js', 'holoboard.js'];
const HTML_MARKER = '<!-- asaoffice addon -->';
const JS_MARKER = '/*asaoffice-hook*/';
// pixel-agents 1.4.1 render callback: right after drawing, it stores the frame's offsets.
// In that scope: t = canvas, e = OfficeState, d/p = offsetX/offsetY, f = zoom, n = edit mode.
const ANCHOR = 'y.current={x:d,y:p},';
const HOOK = `y.current={x:d,y:p},${JS_MARKER}(()=>{try{window.__asaoffice?.afterRender?.(t,e,d,p,f,n)}catch{}})(),`;

function bundlePath(webview) {
  const html = fs.readFileSync(path.join(webview, 'index.html'), 'utf8');
  const src = /<script type="module"[^>]*src="\.\/(assets\/index-[^"]+\.js)"/.exec(html)?.[1];
  if (!src) throw new Error('could not find the webview bundle in index.html');
  return path.join(webview, src);
}

function backupOnce(dist, backup, file) {
  const saved = path.join(backup, path.relative(dist, file));
  if (!fs.existsSync(saved)) {
    fs.mkdirSync(path.dirname(saved), { recursive: true });
    fs.copyFileSync(file, saved);
  }
}

/** Returns a one-line status, or throws if this pixel-agents build can't take the hook. */
export function applyWebviewAddon(root, dist, backup) {
  const webview = path.join(dist, 'webview');
  const bundle = bundlePath(webview);
  let js = fs.readFileSync(bundle, 'utf8');
  if (!js.includes(JS_MARKER)) {
    if (js.split(ANCHOR).length !== 2) {
      throw new Error('render hook anchor not found (pixel-agents version changed?); office addon not installed');
    }
    backupOnce(dist, backup, bundle);
    fs.writeFileSync(bundle, js.replace(ANCHOR, HOOK));
  }

  // Always rebuild index.html from the original, so the script list follows SCRIPTS.
  const htmlFile = path.join(webview, 'index.html');
  const savedHtml = path.join(backup, path.relative(dist, htmlFile));
  if (!fs.readFileSync(htmlFile, 'utf8').includes(HTML_MARKER)) backupOnce(dist, backup, htmlFile);
  if (!fs.existsSync(savedHtml)) throw new Error('original index.html backup missing; run `npm install` to reset pixel-agents');
  const tags = SCRIPTS.map((s) => `<script src="./asaoffice/${s}"></script>`).join('\n    ');
  const original = fs.readFileSync(savedHtml, 'utf8');
  fs.writeFileSync(htmlFile, original.replace('<script type="module"', `${HTML_MARKER}\n    ${tags}\n    <script type="module"`));

  const out = path.join(webview, 'asaoffice');
  fs.mkdirSync(out, { recursive: true });
  for (const s of SCRIPTS) fs.copyFileSync(path.join(root, 'addon', s), path.join(out, s));
  return `office addon installed: idle chat, villager card, calendar, Holo-board (${path.relative(root, out)})`;
}

export function restoreWebviewAddon(dist, backup) {
  const webview = path.join(dist, 'webview');
  let restored = 0;
  for (const file of [path.join(webview, 'index.html'), bundlePath(webview)]) {
    const saved = path.join(backup, path.relative(dist, file));
    if (fs.existsSync(saved)) {
      fs.copyFileSync(saved, file);
      restored++;
    }
  }
  fs.rmSync(path.join(webview, 'asaoffice'), { recursive: true, force: true });
  return restored;
}
