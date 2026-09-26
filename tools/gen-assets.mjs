// Regenerates every sprite + manifest in this repo. Output is deterministic.
//   stardew-pack/assets/{characters,furniture,pets}  → load via Settings → Add Asset Directory
//   overlay/{floors,walls,characters}                → optional, copied into pixel-agents' bundle
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHARACTERS, renderCharacter } from './lib/characters.mjs';
import { buildFurniture } from './lib/furniture.mjs';
import { renderChicken } from './lib/pet.mjs';
import { Sprite } from './lib/pixel.mjs';
import { FLOORS, reskinWall } from './lib/tiles.mjs';
import { bundledAssetsDir } from './lib/paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = path.join(root, 'stardew-pack', 'assets');
const overlay = path.join(root, 'overlay');

for (const dir of [pack, overlay]) fs.rmSync(dir, { recursive: true, force: true });

CHARACTERS.forEach((c, i) => {
  const sheet = renderCharacter(c);
  sheet.save(path.join(pack, 'characters', `char_${i}.png`));
  // Same sprites for the optional overlay, so bundled characters can be replaced 1:1.
  sheet.save(path.join(overlay, 'characters', `char_${i}.png`));
});

for (const item of buildFurniture()) {
  const dir = path.join(pack, 'furniture', item.dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(item.manifest, null, 2) + '\n');
  for (const [name, sprite] of Object.entries(item.files)) sprite.save(path.join(dir, `${name}.png`));
}

const petDir = path.join(pack, 'pets', 'hen');
renderChicken().save(path.join(petDir, 'pet.png'));
fs.writeFileSync(path.join(petDir, 'manifest.json'), JSON.stringify({ id: 'hen', name: 'Clucky' }, null, 2) + '\n');

FLOORS.forEach((make, i) => make().save(path.join(overlay, 'floors', `floor_${i}.png`)));

// Reskin the *original* wall sheet — if the overlay is applied, dist/assets holds our own output.
const pristine = path.join(bundledAssetsDir(root), '..', '.asaoffice-backup', 'assets', 'walls', 'wall_0.png');
const wallSrc = fs.existsSync(pristine) ? pristine : path.join(bundledAssetsDir(root), 'walls', 'wall_0.png');
reskinWall(Sprite.load(wallSrc)).save(path.join(overlay, 'walls', 'wall_0.png'));

console.log(`Generated ${CHARACTERS.length} characters, ${buildFurniture().length} furniture items, 1 pet, ${FLOORS.length} floors, 1 wall set.`);
