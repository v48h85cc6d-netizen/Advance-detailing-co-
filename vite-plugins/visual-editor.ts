import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * PRIVATE VISUAL EDITOR — development only.
 *
 * 1. `visualEditorDev`  (apply: 'serve') serves /__visual-editor, a small JSON API that stores the
 *    draft in ./.visual-editor/ (git-ignored, never part of the website) and injects a loader that
 *    starts the editor bridge ONLY when the site is framed by the editor.
 * 2. `visualEditorStrip` (apply: 'build') removes every `{...ve(...)}` annotation and the
 *    `visual()` helper import from the source before bundling, so production output contains
 *    no editor attributes or code.
 */
const BASE = '/__visual-editor';
const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml' };

function readBody(req: import('node:http').IncomingMessage, limit = 30 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function visualEditorDev(): Plugin {
  let root = process.cwd();
  return {
    name: 'adc-visual-editor-dev',
    apply: 'serve',
    configResolved(c) {
      root = c.root;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (ctx.path.startsWith(BASE)) return html;
        // Loads the bridge only inside the editor's preview iframe. Normal dev browsing is unaffected.
        return html.replace(
          '</head>',
          `<script type="module">try{if(window.top!==window&&window.parent.location.pathname.startsWith('${BASE}'))import('/visual-editor/bridge.ts')}catch(e){}</script>\n</head>`,
        );
      },
    },
    configureServer(server) {
      const dataDir = path.join(root, '.visual-editor');
      const uploads = path.join(dataDir, 'uploads');
      const json = (res: import('node:http').ServerResponse, code: number, body: unknown) => {
        res.statusCode = code;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
      };

      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (!url.startsWith(BASE)) return next();
        try {
          if (url === BASE || url === BASE + '/') {
            const html = fs.readFileSync(path.join(root, 'visual-editor', 'index.html'), 'utf8');
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Cache-Control', 'no-store');
            return res.end(await server.transformIndexHtml(req.url || BASE, html));
          }
          if (url === `${BASE}/api/draft`) {
            const file = path.join(dataDir, 'draft.json');
            if (req.method === 'GET') return json(res, 200, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null);
            if (req.method === 'POST') {
              const body = JSON.parse((await readBody(req)).toString('utf8'));
              if (!body?.draft || !Array.isArray(body.draft.changes)) return json(res, 400, { ok: false });
              fs.mkdirSync(dataDir, { recursive: true });
              fs.writeFileSync(file, JSON.stringify(body.draft, null, 2));
              if (typeof body.exportJson === 'string') fs.writeFileSync(path.join(dataDir, 'draft-export.json'), body.exportJson);
              if (typeof body.changeRequest === 'string') fs.writeFileSync(path.join(dataDir, 'change-request.md'), body.changeRequest);
              return json(res, 200, { ok: true });
            }
          }
          if (url === `${BASE}/api/upload` && req.method === 'POST') {
            const name = String(req.headers['x-filename'] || 'image').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80);
            const ext = path.extname(name).toLowerCase();
            if (!MIME[ext]) return json(res, 415, { ok: false, error: 'Unsupported image type' });
            const buf = await readBody(req);
            fs.mkdirSync(uploads, { recursive: true });
            const file = `${Date.now().toString(36)}-${name}`;
            fs.writeFileSync(path.join(uploads, file), buf);
            return json(res, 200, { ok: true, url: `${BASE}/uploads/${file}`, path: `.visual-editor/uploads/${file}` });
          }
          if (url.startsWith(`${BASE}/uploads/`)) {
            const file = path.join(uploads, path.basename(decodeURIComponent(url)));
            if (!fs.existsSync(file)) return json(res, 404, { ok: false });
            res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
            return res.end(fs.readFileSync(file));
          }
          return json(res, 404, { ok: false });
        } catch (e) {
          return json(res, 500, { ok: false, error: String(e) });
        }
      });

      server.httpServer?.once('listening', () => {
        const a = server.httpServer?.address();
        const port = a && typeof a === 'object' ? a.port : 5173;
        setTimeout(() => server.config.logger.info(`  \x1b[2m➜\x1b[0m  Visual Editor: \x1b[36mhttp://localhost:${port}${BASE}\x1b[0m \x1b[2m(private, dev only)\x1b[0m`), 50);
      });
    },
  };
}

/**
 * Removes the JSX expression container that holds a `ve(...)` call, e.g.
 *   {...ve('a', 'text')}   {...(x ? ve('a', 'text') : {})}   visual={ve('a', 'text')}
 * using a balanced-bracket scan (template literals with ${} are balanced too).
 */
export function stripVisualAnnotations(code: string): string {
  let out = code;
  for (;;) {
    const m = /(?<![\w$]|[\w$)\]]\.)ve\(/.exec(out);
    if (!m) break;
    // walk back to the opening "{" of the JSX expression container
    let depth = 0;
    let open = -1;
    for (let i = m.index - 1; i >= 0; i--) {
      const ch = out[i];
      if (ch === ')' || ch === '}' || ch === ']') depth++;
      else if (ch === '(' || ch === '[') {
        if (depth > 0) depth--; // depth 0 = an enclosing paren, keep walking out
      } else if (ch === '{') {
        if (depth === 0) {
          open = i;
          break;
        }
        depth--;
      }
    }
    if (open < 0) throw new Error('visual-editor strip: no container for ve() call');
    // forward to the matching "}"
    depth = 0;
    let close = -1;
    for (let i = open; i < out.length; i++) {
      const ch = out[i];
      if (ch === '{' || ch === '(' || ch === '[') depth++;
      else if (ch === '}' || ch === ')' || ch === ']') {
        depth--;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close < 0) throw new Error('visual-editor strip: unbalanced ve() container');
    let from = open;
    const attr = /\s[A-Za-z]+=$/.exec(out.slice(Math.max(0, open - 40), open)); // e.g. ` visual=`
    if (attr) from = open - attr[0].length;
    out = out.slice(0, from) + out.slice(close + 1);
  }
  return out;
}

/** Strips dev-only visual-editor annotations from the production bundle. */
export function visualEditorStrip(): Plugin {
  return {
    name: 'adc-visual-editor-strip',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]src[\\/].*\.tsx$/.test(id) || !code.includes('visual(')) return;
      let out = code
        .replace(/^const ve = visual\([^)]*\);?\s*$/gm, '')
        .replace(/^import \{ visual \} from '[^']*';?\s*$/gm, '');
      out = stripVisualAnnotations(out);
      if (/(?<![\w$]|[\w$)\]]\.)ve\(|data-visual/.test(out)) this.error(`Unstripped visual-editor annotation in ${id}`);
      return { code: out, map: null };
    },
  };
}
