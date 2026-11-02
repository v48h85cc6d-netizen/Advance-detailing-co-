/**
 * Post-build SEO step. For every route × language it writes a static HTML file
 * (dist/<lang>/<route>/index.html) whose <head> already contains the correct
 * title, description, canonical URL, hreflang alternates, Open Graph data and
 * LocalBusiness structured data. It also generates sitemap.xml, robots.txt and 404.html.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

function loadEnv() {
  const env = {};
  for (const f of ['.env', '.env.production', '.env.local', '.env.production.local']) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return { ...env, ...process.env };
}
const env = loadEnv();
const SITE_URL = (env.VITE_SITE_URL || 'https://advancedetailingco.com').replace(/\/$/, '');

const routes = read('src/config/routes.json');
const locales = { sq: read('src/locales/sq.json'), en: read('src/locales/en.json'), de: read('src/locales/de.json') };
const LANGS = routes.languages;
const localize = (lang, p) => (lang === 'sq' ? p : `/${lang}${p === '/' ? '' : p}`);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--SEO:START-->')) throw new Error('SEO markers missing in dist/index.html');

const business = {
  '@context': 'https://schema.org',
  '@type': 'AutomotiveBusiness',
  '@id': `${SITE_URL}/#business`,
  name: 'ADVANCE DETAILING CO.',
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/assets/logo/logo-full-black.png`,
  image: `${SITE_URL}/og-image.jpg`,
  telephone: '+38349909229',
  email: 'info@advancedetailingco.com',
  foundingDate: '2019',
  address: { '@type': 'PostalAddress', streetAddress: 'Xhevat Qena', addressLocality: 'Prishtinë', postalCode: '10000', addressCountry: 'XK' },
  areaServed: 'Kosovo',
  sameAs: [
    'https://www.instagram.com/advancedetailingco',
    'https://www.tiktok.com/@advansplakolli',
    'https://www.facebook.com/share/1PaJiT11Eh/',
  ],
};

function head({ lang, p, title, description, noindex }) {
  const url = SITE_URL + localize(lang, p);
  const L = locales[lang];
  const alts = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE_URL + localize(l, p)}" />`).join('\n    ');
  const ogAlts = LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${locales[l].meta.locale}" />`).join('\n    ');
  return `<title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />
    <link rel="canonical" href="${url}" />
    ${alts}
    <link rel="alternate" hreflang="x-default" href="${SITE_URL + localize('sq', p)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="ADVANCE DETAILING CO." />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE_URL}/og-image.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="ADVANCE DETAILING CO." />
    <meta property="og:locale" content="${L.meta.locale}" />
    ${ogAlts}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${SITE_URL}/og-image.jpg" />
    <script type="application/ld+json">${JSON.stringify(business)}</script>`;
}

function write(lang, p, meta) {
  let html = template.replace(/<!--SEO:START-->[\s\S]*<!--SEO:END-->/, head({ lang, p, ...meta }));
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  const rel = localize(lang, p);
  const file = meta.file ?? path.join(dist, rel, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const entries = [];
for (const lang of LANGS) {
  const L = locales[lang];
  for (const pg of routes.pages) {
    const m = L.meta.pages[pg.key];
    const title = pg.key === 'home' ? m.title : `${m.title} | ${L.meta.titleSuffix}`;
    write(lang, pg.path, { title, description: m.description });
    if (lang === 'sq') entries.push({ p: pg.path, priority: pg.priority });
  }
  for (const slug of routes.projects) {
    const pr = L.projects[slug];
    write(lang, `/projects/${slug}`, { title: `${pr.vehicle} — ${pr.service} | ${L.meta.titleSuffix}`, description: `${pr.service} — ${pr.description}` });
    if (lang === 'sq') entries.push({ p: `/projects/${slug}`, priority: 0.7 });
  }
}
// 404 page (served by most static hosts for unknown URLs)
write('sq', '/404', { title: `${locales.sq.meta.pages.notFound.title} | ${locales.sq.meta.titleSuffix}`, description: locales.sq.meta.pages.notFound.description, noindex: true, file: path.join(dist, '404.html') });

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
  .flatMap(({ p, priority }) =>
    LANGS.map(
      (lang) => `  <url>
    <loc>${SITE_URL + localize(lang, p)}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority.toFixed(1)}</priority>
${LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL + localize(l, p)}" />`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL + localize('sq', p)}" />
  </url>`,
    ),
  )
  .join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
console.log(`SEO: ${entries.length * LANGS.length} pages, sitemap.xml, robots.txt, 404.html generated for ${SITE_URL}`);
