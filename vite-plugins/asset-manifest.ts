import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Scans /public/assets/<folder>/ for photographs and exposes them as
 * `virtual:asset-manifest`. Dropping a photo into a folder is enough to fill
 * the matching placeholder slot — no code changes required.
 */
const VIRTUAL_ID = 'virtual:asset-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;
const SKIP = new Set(['logo', 'intro-video']);

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function scan(root: string) {
  const assetsDir = path.join(root, 'public', 'assets');
  const manifest: Record<string, string[]> = {};
  const sizes: Record<string, [number, string][]> = {};
  if (!fs.existsSync(assetsDir)) return { manifest, sizes };
  for (const folder of fs.readdirSync(assetsDir)) {
    const dir = path.join(assetsDir, folder);
    if (SKIP.has(folder) || !fs.statSync(dir).isDirectory()) continue;
    manifest[folder] = fs
      .readdirSync(dir)
      .filter((f) => IMAGE_RE.test(f) && !f.startsWith('.'))
      .sort(collator.compare)
      .map((f) => `/assets/${folder}/${encodeURIComponent(f)}`);
    // responsive variants: sizes/<name>-<width>.webp
    const sizesDir = path.join(dir, 'sizes');
    if (fs.existsSync(sizesDir)) {
      for (const f of fs.readdirSync(sizesDir)) {
        const m = /^(.+)-(\d+)\.webp$/.exec(f);
        if (!m) continue;
        const original = manifest[folder].find((u) => decodeURIComponent(u).replace(/^.*\//, '').replace(/\.[^.]+$/, '') === m[1]);
        if (original) (sizes[original] ??= []).push([Number(m[2]), `/assets/${folder}/sizes/${encodeURIComponent(f)}`]);
      }
    }
  }
  for (const list of Object.values(sizes)) list.sort((a, b) => a[0] - b[0]);
  return { manifest, sizes };
}

export function assetManifest(): Plugin {
  let root = process.cwd();
  return {
    name: 'adc-asset-manifest',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        const { manifest, sizes } = scan(root);
        return `export default ${JSON.stringify(manifest)};\nexport const sizes = ${JSON.stringify(sizes)};`;
      }
    },
    configureServer(server) {
      const assetsDir = path.join(root, 'public', 'assets');
      server.watcher.add(assetsDir);
      const onChange = (file: string) => {
        if (!file.startsWith(assetsDir) || !(IMAGE_RE.test(file) || file.endsWith('.webp'))) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}
