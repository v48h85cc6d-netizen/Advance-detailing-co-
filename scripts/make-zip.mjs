/**
 * npm run zip — builds release ZIPs in ./release/:
 *   advance-detailing-co-website.zip  → contents of dist/ (upload to any static host)
 *   advance-detailing-co-source.zip   → full source code (without node_modules/dist)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

if (!fs.existsSync('dist/index.html')) execSync('npm run build', { stdio: 'inherit' });
fs.mkdirSync('release', { recursive: true });
for (const f of ['release/advance-detailing-co-website.zip', 'release/advance-detailing-co-source.zip']) fs.rmSync(f, { force: true });
execSync('cd dist && zip -qr ../release/advance-detailing-co-website.zip .', { stdio: 'inherit' });
execSync(
  'zip -qr release/advance-detailing-co-source.zip . -x "node_modules/*" "dist/*" "release/*" ".git/*" "assets-originals/*" ".env" ".env.local"',
  { stdio: 'inherit' },
);
for (const f of fs.readdirSync('release')) console.log(`release/${f}  ${(fs.statSync(`release/${f}`).size / 1048576).toFixed(1)} MB`);
