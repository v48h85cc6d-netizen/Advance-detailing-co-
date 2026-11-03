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
// Responsive sizes for every photo: <folder>/sizes/<name>-640.webp and -960.webp (only when smaller than
// the original). Grids and cards use these via srcset; the full image is loaded only when it is really needed.
const WIDTHS = [640, 960];
let sized = 0;
for (const folder of fs.readdirSync(assets)) {
  const dir = path.join(assets, folder);
  if (SKIP.has(folder) || !fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!/\.(webp|avif)$/i.test(file)) continue;
    const src = path.join(dir, file);
    const { width = 0 } = await sharp(src).metadata();
    for (const w of WIDTHS) {
      if (w >= width) continue;
      const out = path.join(dir, 'sizes', `${path.parse(file).name}-${w}.webp`);
      if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await sharp(src).resize({ width: w }).webp({ quality: 80 }).toFile(out);
      sized++;
    }
  }
}
console.log(count ? `Optimised ${count} image(s). Originals saved in ./assets-originals/` : 'No JPG/PNG photos to optimise.');
if (sized) console.log(`Created ${sized} responsive size(s) in <folder>/sizes/`);
