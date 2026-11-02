/**
 * Browser tests for the PRIVATE Visual Editor (development server).
 *   npm run dev            # http://localhost:5173
 *   node tests/visual-editor.cjs [devUrl] [previewUrl]
 * Your real draft (.visual-editor/draft.json) is backed up before and restored after the run.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DEV = process.argv[2] || 'http://localhost:5173';
const PROD = process.argv[3] || ''; // optional: production preview URL (e.g. http://localhost:4173)
const ROOT = path.resolve(__dirname, '..');
const DRAFT = path.join(ROOT, '.visual-editor', 'draft.json');
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const results = [];
const ok = (name, cond, info = '') => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`);
};

const backup = fs.existsSync(DRAFT) ? fs.readFileSync(DRAFT) : null;
const resetDraftFile = () => {
  fs.mkdirSync(path.dirname(DRAFT), { recursive: true });
  fs.writeFileSync(DRAFT, JSON.stringify({ version: 1, updatedAt: new Date(0).toISOString(), changes: [] }));
};

async function setRange(page, testid, value) {
  await page.getByTestId(testid).first().evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function openEditor(browser, viewport = { width: 1440, height: 900 }, { fresh = true, mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
  await ctx.addInitScript(() => {
    try {
      // keep the site's consent banner out of the way in tests
      localStorage.setItem('adc-consent', JSON.stringify({ v: 1, ts: Date.now(), analytics: false, media: false }));
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  if (fresh) {
    resetDraftFile();
    await page.goto(DEV + '/__visual-editor', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('adc-visual-editor-draft-v1');
      localStorage.setItem('adc-visual-editor-prefs-v1', JSON.stringify({ route: '/', lang: 'sq', device: 'desktop', selecting: true, compare: 'draft' }));
    });
  }
  await page.goto(DEV + '/__visual-editor', { waitUntil: 'networkidle' });
  const frame = page.frameLocator('[data-testid=preview-frame]');
  await frame.locator('#main').waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  return { ctx, page, frame, errors };
}
const frameEval = (page, fn, arg) => page.frames().find((f) => f !== page.mainFrame()).evaluate(fn, arg);
/** click an element in the preview and wait until the inspector reports a new selection */
async function pick(page, locator, opts) {
  const before = await page.getByTestId('inspector').getAttribute('data-selected-id').catch(() => null);
  await locator.click(opts);
  await page.waitForFunction((b) => {
    const el = document.querySelector('[data-testid=inspector]');
    return el && el.getAttribute('data-selected-id') !== b;
  }, before, { timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(150);
}
const selectedId = (page) => page.getByTestId('inspector').getAttribute('data-selected-id');
const selectedType = (page) => page.getByTestId('inspector').getAttribute('data-selected-type');

(async () => {
  const browser = await chromium.launch({ args: GL });
  try {
    // ------------------------------------------------ isolation in development
    {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await p.goto(DEV + '/?nointro', { waitUntil: 'networkidle' });
      const leaked = await p.evaluate(() => !!document.getElementById('ve-bridge-style') || !!document.querySelector('[data-ve-ui]'));
      ok('Normal dev site (not inside the editor) does not load the editor bridge', !leaked);
      await ctx.close();
    }

    // ------------------------------------------------ selection
    const { page, frame, errors } = await openEditor(browser);
    ok('Editor loads at /__visual-editor with the live site preview', await page.getByTestId('visual-editor').isVisible());
    await pick(page, frame.locator('[data-visual-id="home.hero.subtitle"]'));
    ok('Select text element', (await selectedId(page)) === 'home.hero.subtitle' && (await selectedType(page)) === 'text');
    ok('Selection outline + contextual label shown', await frameEval(page, () => [...document.querySelectorAll('[data-ve-ui]')].filter((n) => n.style.display === 'block').length >= 2));
    await pick(page, frame.locator('[data-visual-id="home.hero.cta-primary"]'));
    ok('Select button (link click intercepted, no navigation)', (await selectedType(page)) === 'button' && (await frameEval(page, () => location.pathname)) === '/');
    await pick(page, frame.locator('[data-visual-id="nav.link.services"]'));
    ok('Select navigation element', (await selectedType(page)) === 'nav' && (await frameEval(page, () => location.pathname)) === '/');
    const featured = frame.locator('[data-visual-id="home.featured"]');
    await featured.scrollIntoViewIfNeeded();
    await pick(page, featured, { position: { x: 6, y: 6 } });
    ok('Select section', (await selectedId(page)) === 'home.featured' && (await selectedType(page)) === 'section');
    const card = frame.locator('[data-visual-id="card.project.audi-rs3"]');
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600); // let the site's reveal animation finish before measuring
    const cb = await card.boundingBox();
    await pick(page, card, { position: { x: 10, y: cb.height - 10 } });
    ok('Select card', (await selectedId(page)) === 'card.project.audi-rs3' && (await selectedType(page)) === 'card');
    await pick(page, frame.locator('[data-visual-id="card.project.audi-rs3"] [data-visual-type=image]'));
    ok('Select image', (await selectedType(page)) === 'image' && /image\.audi-rs3/.test(await selectedId(page)));
    await pick(page, frame.locator('[data-visual-id="card.project.audi-rs3.vehicle"]'));
    ok('Inspector shows only relevant controls (text: content+typography, no image)', (await page.getByTestId('sec-typography').count()) === 1 && (await page.getByTestId('sec-image').count()) === 0);

    // ------------------------------------------------ text editing + undo/redo
    await pick(page, frame.locator('[data-visual-id="home.hero.subtitle"]'));
    const original = await frame.locator('[data-visual-id="home.hero.subtitle"]').innerText();
    await page.getByTestId('text-input').fill('Teksti i ri — test i editorit.');
    await page.waitForTimeout(500);
    ok('Text edit updates the preview instantly', (await frame.locator('[data-visual-id="home.hero.subtitle"]').innerText()) === 'Teksti i ri — test i editorit.');
    await setRange(page, 'font-size', 40);
    await page.waitForTimeout(400);
    const fs40 = await frame.locator('[data-visual-id="home.hero.subtitle"]').evaluate((e) => getComputedStyle(e).fontSize);
    ok('Font size change updates the preview', fs40 === '40px', fs40);
    await page.getByTestId('text-color').evaluate((el) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '#ff3366');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(400);
    ok('Text color change updates the preview', (await frame.locator('[data-visual-id="home.hero.subtitle"]').evaluate((e) => getComputedStyle(e).color)) === 'rgb(255, 51, 102)');
    ok('Pending change counter', (await page.getByTestId('changes-count').innerText()) === '3');
    await page.getByTestId('undo').click();
    await page.waitForTimeout(400);
    ok('Undo reverts last change', (await frame.locator('[data-visual-id="home.hero.subtitle"]').evaluate((e) => getComputedStyle(e).color)) !== 'rgb(255, 51, 102)' && (await page.getByTestId('changes-count').innerText()) === '2');
    await page.getByTestId('undo').click();
    await page.getByTestId('undo').click();
    await page.waitForTimeout(500);
    ok('Undo back to the original text', (await frame.locator('[data-visual-id="home.hero.subtitle"]').innerText()) === original);
    await page.getByTestId('redo').click();
    await page.waitForTimeout(500);
    ok('Redo re-applies the change', (await frame.locator('[data-visual-id="home.hero.subtitle"]').innerText()) === 'Teksti i ri — test i editorit.');
    await page.getByTestId('redo').click();
    await page.waitForTimeout(300);

    // ------------------------------------------------ compare original vs draft
    await page.locator('[data-testid=compare-switch] [data-value=original]').click();
    await page.waitForTimeout(500);
    const origShown = (await frame.locator('[data-visual-id="home.hero.subtitle"]').innerText()) === original;
    await page.locator('[data-testid=compare-switch] [data-value=draft]').click();
    await page.waitForTimeout(500);
    ok('Draft / Original comparison toggle', origShown && (await frame.locator('[data-visual-id="home.hero.subtitle"]').innerText()) !== original);

    // ------------------------------------------------ section: hide + reorder
    await pick(page, featured, { position: { x: 6, y: 6 } });
    await page.locator('[data-testid=visibility] [data-value=hidden]').click();
    await page.waitForTimeout(400);
    ok('Hide section in draft preview', (await featured.evaluate((e) => getComputedStyle(e).display)) === 'none');
    await page.locator('[data-testid=visibility] [data-value=visible]').click();
    await page.waitForTimeout(400);
    ok('Show section again', (await featured.evaluate((e) => getComputedStyle(e).display)) !== 'none');
    await page.getByTestId('move-up').click();
    await page.waitForTimeout(400);
    const orders = await frameEval(page, () => ({ f: getComputedStyle(document.querySelector('[data-visual-id="home.featured"]')).order, m: getComputedStyle(document.querySelector('[data-visual-id="home.marquee"]')).order }));
    ok('Section order change (move up) in draft preview', +orders.f < +orders.m, JSON.stringify(orders));
    await page.getByTestId('reset-element').click();
    await page.waitForTimeout(300);

    // ------------------------------------------------ image replacement
    await page.getByTestId('page-select').selectOption('/gallery');
    await frame.locator('[data-visual-id="image.gallery.03"]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    await frame.locator('[data-visual-id="image.gallery.03"]').scrollIntoViewIfNeeded();
    await pick(page, frame.locator('[data-visual-id="image.gallery.03"]'));
    ok('Select gallery image slot', (await selectedId(page)) === 'image.gallery.03');
    await page.getByTestId('image-file').setInputFiles(path.join(ROOT, 'public', 'og-image.jpg'));
    await page.getByTestId('image-preview').waitFor({ timeout: 8000 });
    await page.waitForTimeout(500);
    const bg = await frame.locator('[data-visual-id="image.gallery.03"]').evaluate((e) => getComputedStyle(e).backgroundImage);
    ok('Image replacement uploads + previews in the site', bg.includes('/__visual-editor/uploads/'), bg.slice(0, 80));
    await page.getByTestId('object-fit').selectOption('contain');
    await page.waitForTimeout(300);
    ok('Object-fit change previews', (await frame.locator('[data-visual-id="image.gallery.03"]').evaluate((e) => getComputedStyle(e).backgroundSize)) === 'contain');
    const uploaded = fs.readdirSync(path.join(ROOT, '.visual-editor', 'uploads')).length > 0;
    ok('Uploaded file stored in .visual-editor/uploads (not in public/ or src/)', uploaded);

    // ------------------------------------------------ languages
    await page.locator('[data-testid=lang-switch] [data-value=en]').click();
    await frame.locator('html[lang=en]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    ok('Language switch EN previews the English page', (await frameEval(page, () => location.pathname)) === '/en/gallery' && (await frame.locator('h1').innerText()).includes('Work'));
    await page.getByTestId('page-select').selectOption('/');
    await frame.locator('[data-visual-id="home.hero.subtitle"]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    const enText = await frame.locator('[data-visual-id="home.hero.subtitle"]').innerText();
    ok('Albanian text draft does not leak into English', enText.startsWith('Paint correction'), enText.slice(0, 40));
    await pick(page, frame.locator('[data-visual-id="home.hero.subtitle"]'));
    await page.getByTestId('text-input').fill('English draft text.');
    await page.waitForTimeout(400);
    ok('English text edited independently', (await frame.locator('[data-visual-id="home.hero.subtitle"]').innerText()) === 'English draft text.');
    await page.locator('[data-testid=lang-switch] [data-value=de]').click();
    await frame.locator('html[lang=de]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    ok('German preview shows German content', (await frame.locator('[data-visual-id="home.hero.subtitle"]').innerText()).startsWith('Lackpolitur'));
    ok('Style draft (font size) applies in every language', (await frame.locator('[data-visual-id="home.hero.subtitle"]').evaluate((e) => getComputedStyle(e).fontSize)) === '40px');

    // ------------------------------------------------ persistence
    const countBefore = await page.getByTestId('changes-count').innerText();
    await page.reload({ waitUntil: 'networkidle' });
    await frame.locator('#main').waitFor({ timeout: 30000 });
    await page.waitForTimeout(2500);
    ok('Draft persists after refreshing the editor', (await page.getByTestId('changes-count').innerText()) === countBefore, `${countBefore} changes`);
    const file = JSON.parse(fs.readFileSync(DRAFT, 'utf8'));
    ok('Draft mirrored to .visual-editor/draft.json', file.changes.length === +countBefore);

    // ------------------------------------------------ review + export
    await page.getByTestId('changes-button').click();
    await page.getByTestId('review').waitFor();
    ok('Change review lists every pending change', (await page.getByTestId('change-item').count()) === +countBefore && (await page.getByTestId('pending-count').innerText()) === countBefore);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-json').click()]);
    const exported = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    const c0 = exported.changes[0];
    ok(
      'Export Draft JSON: structured schema with page, language, element, original, proposed, category',
      exported.$schema && exported.summary.pending === +countBefore && c0.page.route && c0.page.language && c0.element.id && c0.element.type && 'original' in c0.change && 'proposed' in c0.change && c0.change.category && c0.status === 'draft' && c0.implementation,
      dl.suggestedFilename(),
    );
    ok('Exported text change references the translation key', exported.changes.some((c) => c.element.i18nKey === 'hero.subtitle' && c.page.language === 'sq'));
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: DEV });
    await page.getByTestId('copy-request').click();
    await page.waitForTimeout(300);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    ok('Copy Change Request: markdown request with all changes for Claude Code', clip.startsWith('# Visual Editor change request') && clip.includes('hero.subtitle') && clip.includes('NOT implemented'));
    ok('Change request file written to .visual-editor/change-request.md', fs.existsSync(path.join(ROOT, '.visual-editor', 'change-request.md')));
    await page.getByTestId('change-remove').first().click();
    await page.waitForTimeout(300);
    ok('Remove an individual change', (await page.getByTestId('change-item').count()) === +countBefore - 1);
    await page.getByTestId('clear-draft').click();
    await page.getByTestId('clear-confirm').click();
    await page.waitForTimeout(600);
    ok('Clear Draft discards all changes', (await page.getByTestId('changes-count').innerText()) === '0' && (await frame.locator('[data-visual-id="home.hero.subtitle"]').evaluate((e) => getComputedStyle(e).fontSize)) !== '40px');

    // ------------------------------------------------ browse mode = normal site
    await page.getByTestId('select-toggle').click();
    await frameEval(page, () => window.scrollTo(0, 0));
    await page.waitForTimeout(800); // the site's navbar re-appears when scrolling up
    await frame.locator('[data-visual-id="nav.link.services"]').click();
    await page.waitForFunction(() => document.querySelector('[data-testid=page-select]')?.value === '/services', null, { timeout: 8000 }).catch(() => undefined);
    ok('Browse mode: site interactions work normally (navigation)', (await frameEval(page, () => location.pathname)) === '/de/services' && (await page.getByTestId('page-select').inputValue()) === '/services');
    await page.getByTestId('select-toggle').click();
    ok('No console errors in the editor session', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.context().close();

    // ------------------------------------------------ responsive editor
    for (const [w, h] of [[360, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
      const mobile = w < 1024;
      const e = await openEditor(browser, { width: w, height: h }, { mobile });
      const overflow = await e.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const target = e.frame.locator('[data-visual-id="home.hero.title"]');
      await target.click();
      await e.page.getByTestId('inspector').waitFor();
      const input = e.page.getByTestId('text-input');
      await input.scrollIntoViewIfNeeded();
      const box = await input.boundingBox();
      const layoutOk = mobile ? (await e.page.getByTestId('bottom-sheet').count()) === 1 && (await e.page.getByTestId('side-panel').count()) === 0 : (await e.page.getByTestId('side-panel').isVisible());
      await input.fill(`Responsive ${w}`);
      await e.page.waitForTimeout(400);
      const applied = (await target.innerText()) === `Responsive ${w}`;
      const btns = await e.page.evaluate(() => [...document.querySelectorAll('header button, header select')].filter((n) => n.offsetParent && !n.closest('.overflow-x-auto')).every((n) => n.getBoundingClientRect().right <= window.innerWidth + 0.5));
      ok(`Editor at ${w}px: no overflow, toolbar fits, ${mobile ? 'bottom sheet' : 'side inspector'}, select + edit work`, overflow <= 0 && btns && layoutOk && box && box.y >= 0 && box.y + 24 <= h && applied, `overflow=${overflow} toolbarFits=${btns}`);
      if (w === 390) await e.page.screenshot({ path: path.join(ROOT, '.visual-editor', 'test-mobile-390.png') });
      await e.ctx.close();
    }

    // ------------------------------------------------ production isolation
    const dist = path.join(ROOT, 'dist');
    if (fs.existsSync(dist)) {
      const hits = [];
      const walk = (d) => fs.readdirSync(d).forEach((f) => {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) return walk(p);
        if (/\.(js|html|css)$/.test(f) && /data-visual|visual-editor|__visual|ve-bridge|data-ve-ui/.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(ROOT, p));
      });
      walk(dist);
      ok('Production build (dist/) contains no editor code or attributes', hits.length === 0, hits.join(', '));
    }
    if (PROD) {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await p.goto(PROD + '/__visual-editor', { waitUntil: 'networkidle' });
      const txt = await p.locator('body').innerText();
      ok('Production server: /__visual-editor is not available (404 page)', !(await p.locator('[data-testid=visual-editor]').count()) && /nuk u gjet|404/i.test(txt));
      await ctx.close();
    }
  } catch (e) {
    console.error(e);
    results.push({ name: 'crash', pass: false });
  } finally {
    if (backup) fs.writeFileSync(DRAFT, backup);
    else if (fs.existsSync(DRAFT)) fs.rmSync(DRAFT);
    await browser.close();
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} visual-editor checks passed`);
  process.exit(failed ? 1 : 0);
})();
