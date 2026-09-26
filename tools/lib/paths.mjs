import fs from 'node:fs';
import path from 'node:path';

/** dist/ of the pixel-agents package installed in this repo (the one `npm run office` runs). */
export function pixelAgentsDist(root) {
  const dist = path.join(root, 'node_modules', 'pixel-agents', 'dist');
  if (!fs.existsSync(path.join(dist, 'cli.js'))) {
    throw new Error(`pixel-agents is not installed at ${dist} — run \`npm install\` first.`);
  }
  return dist;
}

export function bundledAssetsDir(root) {
  return path.join(pixelAgentsDist(root), 'assets');
}
