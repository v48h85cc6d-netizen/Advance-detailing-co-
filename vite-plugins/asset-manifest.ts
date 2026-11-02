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
  if (!fs.existsSync(assetsDir)) return manifest;
  for (const folder of fs.readdirSync(assetsDir)) {
    const dir = path.join(assetsDir, folder);
    if (SKIP.has(folder) || !fs.statSync(dir).isDirectory()) continue;
    manifest[folder] = fs
      .readdirSync(dir)
      .filter((f) => IMAGE_RE.test(f) && !f.startsWith('.'))
      .sort(collator.compare)
      .map((f) => `/assets/${folder}/${encodeURIComponent(f)}`);
  }
  return manifest;
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
      if (id === RESOLVED_ID) return `export default ${JSON.stringify(scan(root))};`;
    },
    configureServer(server) {
      const assetsDir = path.join(root, 'public', 'assets');
      server.watcher.add(assetsDir);
      const onChange = (file: string) => {
        if (!file.startsWith(assetsDir) || !IMAGE_RE.test(file)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}
