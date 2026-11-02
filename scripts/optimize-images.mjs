/**
 * npm run images
 * Converts large JPG/PNG photos in public/assets/<folder>/ to optimised WebP
 * (max 2400px wide, quality 82). Originals are moved to ./assets-originals/
 * (outside the website) so the site only ships the optimised files.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const assets = path.join(root, 'public', 'assets');
const backup = path.join(root, 'assets-originals');
const SKIP = new Set(['logo', 'intro-video']);
let count = 0;

for (const folder of fs.readdirSync(assets)) {
  const dir = path.join(assets, folder);
  if (SKIP.has(folder) || !fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!/\.(jpe?g|png)$/i.test(file)) continue;
    const src = path.join(dir, file);
    const out = path.join(dir, file.replace(/\.(jpe?g|png)$/i, '.webp'));
    await sharp(src).rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
    fs.mkdirSync(path.join(backup, folder), { recursive: true });
    fs.renameSync(src, path.join(backup, folder, file));
    const kb = (n) => `${Math.round(fs.statSync(n).size / 1024)} KB`;
    console.log(`✓ ${folder}/${file} → ${path.basename(out)} (${kb(out)})`);
    count++;
  }
}
console.log(count ? `Optimised ${count} image(s). Originals saved in ./assets-originals/` : 'No JPG/PNG photos to optimise.');
