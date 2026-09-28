// Regenerates every sprite + manifest in this repo. Output is deterministic.
//   stardew-pack/assets/{characters,furniture,pets}  → load via Settings → Add Asset Directory
//   overlay/{floors,walls,characters}                → optional, copied into pixel-agents' bundle
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHARACTERS, renderCharacter } from './lib/characters.mjs';
import { buildFurniture } from './lib/furniture.mjs';
import { renderCat } from './lib/cat.mjs';
import { renderChicken } from './lib/pet.mjs';
import { Sprite } from './lib/pixel.mjs';
import { FLOORS, reskinWall } from './lib/tiles.mjs';
import { bundledAssetsDir } from './lib/paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = path.join(root, 'stardew-pack', 'assets');
const overlay = path.join(root, 'overlay');

for (const dir of [pack, overlay]) fs.rmSync(dir, { recursive: true, force: true });

// Twelve different villagers: 1–6 replace pixel-agents' six bundled characters (overlay, palettes 0–5) and
// 7–12 load from the pack as extra characters (palettes 6–11), so no two palettes share a face.
CHARACTERS.forEach((c, i) => {
  const sheet = renderCharacter(c);
  if (i < 6) sheet.save(path.join(overlay, 'characters', `char_${i}.png`));
  else sheet.save(path.join(pack, 'characters', `char_${i - 6}.png`));
});

for (const item of buildFurniture()) {
  const dir = path.join(pack, 'furniture', item.dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(item.manifest, null, 2) + '\n');
  for (const [name, sprite] of Object.entries(item.files)) sprite.save(path.join(dir, `${name}.png`));
}

// pixel-agents sorts external pets by folder name, after its own two: cat → petType 2, hen → petType 3.
const PETS = [
  ['cat', { id: 'cat', name: 'Oyen' }, renderCat],
  ['hen', { id: 'hen', name: 'Clucky' }, renderChicken],
];
for (const [dir, manifest, render] of PETS) {
  const petDir = path.join(pack, 'pets', dir);
  render().save(path.join(petDir, 'pet.png'));
  fs.writeFileSync(path.join(petDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

FLOORS.forEach((make, i) => make().save(path.join(overlay, 'floors', `floor_${i}.png`)));

// Reskin the *original* wall sheet — if the overlay is applied, dist/assets holds our own output.
const pristine = path.join(bundledAssetsDir(root), '..', '.asaoffice-backup', 'assets', 'walls', 'wall_0.png');
const wallSrc = fs.existsSync(pristine) ? pristine : path.join(bundledAssetsDir(root), 'walls', 'wall_0.png');
reskinWall(Sprite.load(wallSrc)).save(path.join(overlay, 'walls', 'wall_0.png'));

console.log(`Generated ${CHARACTERS.length} characters, ${buildFurniture().length} furniture items, ${PETS.length} pets, ${FLOORS.length} floors, 1 wall set.`);
