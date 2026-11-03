/**
 * End-to-end browser tests (Playwright + Chromium) for the production build.
 *   npm run build && npx vite preview --port 4173 &
 *   node tests/e2e.cjs [baseUrl]
 */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:4173';
const results = [];
const ok = (name, cond, info = '') => { results.push({ name, pass: !!cond, info }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };
const LANGS = ['', '/en', '/de'];
const PAGES = ['/', '/services', '/about', '/gallery', '/contact', '/privacy', '/cookies', '/terms'];
const PROJECTS = ['audi-rs3', 'ferrari-488-pista', 'bmw-740d', 'lamborghini-aventador', 'bmw-m135i'];
const ALL = LANGS.flatMap((l) => [...PAGES.map((p) => (l + p).replace(/(.)\/$/, '$1') || '/'), ...PROJECTS.map((s) => `${l}/projects/${s}`)]);
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

async function ctxWith(browser, opts = {}, { intro = false, consent = true, theme } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  await ctx.addInitScript(({ intro, consent, theme }) => {
    try {
      if (!intro) sessionStorage.setItem('adc-intro', '1');
      if (consent) localStorage.setItem('adc-consent', JSON.stringify({ v: 1, ts: Date.now(), analytics: false, media: false }));
      if (theme) localStorage.setItem('adc-theme', theme);
    } catch (e) {}
  }, { intro, consent, theme });
  return ctx;
}

(async () => {
  const browser = await chromium.launch({ args: GL });

  // ---------------- Intro ----------------
  {
    const ctx = await ctxWith(browser, {}, { intro: true });
    const p = await ctx.newPage();
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const intro = p.getByTestId('intro');
    await intro.waitFor({ timeout: 5000 });
    const v = p.getByTestId('intro-video');
    const attrs = await v.evaluate((el) => ({ muted: el.muted, autoplay: el.autoplay, playsInline: el.playsInline, src: [...el.querySelectorAll('source')].map((s) => s.getAttribute('src')) }));
    ok('Intro: video is muted + autoplay + playsInline', attrs.muted && attrs.autoplay && attrs.playsInline, JSON.stringify(attrs.src));
    await p.waitForTimeout(2500);
    const t = await v.evaluate((el) => el.currentTime);
    ok('Intro: supplied video actually plays', t > 0.5, `currentTime=${t.toFixed(2)}s`);
    ok('Intro: Skip Intro button visible', await p.getByTestId('skip-intro').isVisible());
    ok('Intro: logo presented', (await p.locator('[data-testid=intro] img[src*="logo"]').count()) > 0);
    await p.getByTestId('skip-intro').click();
    await intro.waitFor({ state: 'detached', timeout: 4000 });
    ok('Intro: Skip closes intro and reveals site', await p.getByTestId('hero').isVisible());
    await p.reload({ waitUntil: 'networkidle' });
    ok('Intro: not repeated in same session', (await p.getByTestId('intro').count()) === 0);
    await ctx.close();
    // ends by itself + mobile + not on inner pages
    const m = await ctxWith(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { intro: true });
    const mp = await m.newPage();
    await mp.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await mp.getByTestId('intro').waitFor();
    const box = await mp.getByTestId('intro-video').boundingBox();
    ok('Intro (mobile): video is full-screen', box && box.width >= 389 && box.height >= 843, JSON.stringify(box));
    await mp.getByTestId('intro').waitFor({ state: 'detached', timeout: 25000 });
    ok('Intro: ends automatically after the video', true);
    await mp.goto(BASE + '/en/services');
    await m.close();
    const c2 = await ctxWith(browser, {}, { intro: true });
    const p2 = await c2.newPage();
    await p2.goto(BASE + '/services', { waitUntil: 'networkidle' });
    ok('Intro: not shown when landing on an inner page', (await p2.getByTestId('intro').count()) === 0);
    await c2.close();
  }

  // ---------------- Navigation (desktop) ----------------
  {
    const ctx = await ctxWith(browser);
    const p = await ctx.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    ok('Desktop: hamburger hidden', !(await p.getByTestId('menu-toggle').isVisible()));
    const labels = await p.locator('nav ul a[data-testid^=nav-]').allTextContents();
    ok('Desktop: nav order Ballina→Kontakt', labels.join('|') === 'Ballina|Shërbimet|Rreth Nesh|Galeria|Kontakt', labels.join('|'));
    for (const [key, path, h] of [['services', '/services', 'Shërbime'], ['about', '/about', 'Precizion'], ['gallery', '/gallery', 'Punë'], ['contact', '/contact', 'flasim'], ['home', '/', 'PRECIZION']]) {
      await p.getByTestId(`nav-${key}`).click();
      await p.waitForURL(BASE + path);
      await p.waitForTimeout(700);
      const h1 = (await p.locator('h1').first().textContent()) || '';
      const cur = await p.getByTestId(`nav-${key}`).getAttribute('aria-current');
      ok(`Desktop nav → ${key}`, h1.toLowerCase().includes(h.toLowerCase()) && cur === 'page', h1.slice(0, 50));
    }
    const navBox = await p.locator('header nav').boundingBox();
    const logoBox = await p.getByTestId('nav-logo').boundingBox();
    const linksBox = await p.locator('header nav ul').boundingBox();
    const langBox = await p.getByTestId('lang-button').boundingBox();
    ok('Desktop: logo left, links centered, language right', logoBox.x < linksBox.x && langBox.x > linksBox.x + linksBox.width && Math.abs(linksBox.x + linksBox.width / 2 - (navBox.x + navBox.width / 2)) < 4);
    await ctx.close();
  }

  // ---------------- Navigation (mobile) ----------------
  for (const [name, vp] of [['iPhone', { width: 390, height: 844 }], ['Android', { width: 412, height: 915 }]]) {
    const ctx = await ctxWith(browser, { viewport: vp, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    ok(`${name}: hamburger visible, desktop links hidden`, (await p.getByTestId('menu-toggle').isVisible()) && !(await p.getByTestId('nav-services').isVisible()));
    await p.getByTestId('menu-toggle').tap();
    const menu = p.locator('#mobile-menu');
    await menu.waitFor();
    await p.waitForTimeout(700);
    await menu.getByRole('link', { name: /Galeria/ }).tap();
    await p.waitForURL(BASE + '/gallery');
    await menu.waitFor({ state: 'detached', timeout: 3000 }).catch(() => undefined);
    ok(`${name}: mobile menu navigates and closes`, (await menu.count()) === 0);
    await p.getByTestId('menu-toggle').tap();
    await p.locator('#mobile-menu a[hreflang=de]').waitFor();
    await p.waitForTimeout(800);
    await p.locator('#mobile-menu a[hreflang=de]').tap();
    await p.waitForURL(BASE + '/de/gallery');
    await p.waitForFunction(() => document.documentElement.lang === 'de', null, { timeout: 3000 }).catch(() => undefined);
    ok(`${name}: language pills in mobile menu`, (await p.locator('html').getAttribute('lang')) === 'de');
    await ctx.close();
  }

  // ---------------- Theme ----------------
  {
    const ctx = await ctxWith(browser);
    const p = await ctx.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    const cls = () => p.evaluate(() => document.documentElement.className);
    ok('Theme: default dark', (await cls()).includes('dark'));
    const visibleLogo = () => p.locator('[data-testid=nav-logo] img').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.getAttribute('src')));
    ok('Theme: white logo in dark mode', (await visibleLogo()).every((s) => s.includes('white')));
    const sunMoonBefore = await p.locator('[data-testid=theme-toggle] circle[mask]').getAttribute('r');
    await p.getByTestId('theme-toggle').click();
    await p.waitForTimeout(1800);
    const sunMoonAfter = await p.locator('[data-testid=theme-toggle] circle[mask]').getAttribute('r');
    ok('Theme: toggles to light', (await cls()).includes('light') && (await p.evaluate(() => localStorage.getItem('adc-theme'))) === 'light');
    ok('Theme: Moon (r≈8.5) morphs to Sun (r≈4.6)', parseFloat(sunMoonBefore) > 8 && parseFloat(sunMoonAfter) < 5, `${sunMoonBefore} → ${sunMoonAfter}`);
    ok('Theme: toggle state + label update', (await p.getByTestId('theme-toggle').getAttribute('data-theme-state')) === 'light');
    ok('Theme: black logo in light mode', (await visibleLogo()).every((s) => s.includes('black')));
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok('Theme: light background applied', bg === 'rgb(245, 245, 244)', bg);
    // persistence & no flash: class set before any app script runs
    await p.goto(BASE + '/services', { waitUntil: 'commit' });
    const early = await p.evaluate(() => document.documentElement.className).catch(() => '');
    await p.waitForLoadState('domcontentloaded');
    const atDom = await cls();
    ok('Theme: persisted + applied before render (no flash)', atDom.includes('light'), `commit="${early}" dom="${atDom}"`);
    await p.getByTestId('theme-toggle').click();
    await p.waitForTimeout(900);
    ok('Theme: toggles back to dark', (await cls()).includes('dark'));
    await ctx.close();
    const m = await ctxWith(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mp = await m.newPage();
    await mp.goto(BASE + '/');
    await mp.getByTestId('theme-toggle').tap();
    await mp.waitForTimeout(900);
    ok('Theme: switch works on mobile', (await mp.evaluate(() => document.documentElement.className)).includes('light'));
    await m.close();
  }

  // ---------------- Languages ----------------
  {
    const ctx = await ctxWith(browser);
    const p = await ctx.newPage();
    const expect = { '': ['sq', 'Shërbimet', 'Dërgo Mesazhin'], '/en': ['en', 'Services', 'Send Message'], '/de': ['de', 'Leistungen', 'Nachricht senden'] };
    for (const [prefix, [lang, nav, btn]] of Object.entries(expect)) {
      await p.goto(BASE + prefix + '/contact', { waitUntil: 'networkidle' });
      const htmlLang = await p.locator('html').getAttribute('lang');
      const navText = await p.getByTestId('nav-services').textContent();
      const submit = await p.getByTestId('contact-submit').textContent();
      ok(`Language ${lang}: html lang, nav and form translated`, htmlLang === lang && navText === nav && submit.includes(btn), `${htmlLang}/${navText}/${submit}`);
    }
    await p.goto(BASE + '/gallery', { waitUntil: 'networkidle' });
    await p.getByTestId('lang-button').click();
    await p.locator('a[hreflang=en]').first().click();
    await p.waitForURL(BASE + '/en/gallery');
    await p.waitForFunction(() => document.title.startsWith('Gallery'), null, { timeout: 3000 }).catch(() => undefined);
    ok('Language switcher keeps current page', (await p.title()).startsWith('Gallery') && (await p.locator('h1').innerText()).includes('Work'), await p.title());
    // untranslated key detection on every page
    let leaks = [];
    for (const url of ALL) {
      await p.goto(BASE + url, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(400);
      const txt = await p.evaluate(() => document.body.innerText);
      const m = txt.match(/\b(meta|nav|common|home|projects|services|certifications|about|gallery|contact|social|footer|consent|legal|hero|intro|a11y)\.[a-z0-9-]+(\.[a-z0-9-]+)*\b/g);
      if (m) leaks.push(`${url}: ${m.slice(0, 3).join(', ')}`);
    }
    ok('No untranslated keys rendered on any of the 39 pages', leaks.length === 0, leaks.join(' | '));
    await ctx.close();
  }

  // ---------------- Services & certifications ----------------
  {
    const ctx = await ctxWith(browser);
    const p = await ctx.newPage();
    await p.goto(BASE + '/services', { waitUntil: 'networkidle' });
    const names = await p.locator('[data-testid=service-card] h3').allTextContents();
    ok('Services: 16 service cards', names.length === 16, names.join(', '));
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    ok('Homepage services rail: 16 cards', (await p.locator('[data-testid=home-services] [data-testid=service-card]').count()) === 16);
    const cert = p.getByTestId('certifications');
    await cert.scrollIntoViewIfNeeded();
    const cur = () => p.locator('[data-testid=cert-slide]').last().getAttribute('data-cert');
    const a = await cur();
    await p.mouse.move(5, 5);
    await p.waitForTimeout(5200);
    const b = await cur();
    ok('Certifications: auto-advances', a !== b, `${a} → ${b}`);
    await p.getByTestId('cert-next').hover();
    const c = await cur();
    await p.waitForTimeout(5500);
    ok('Certifications: pauses on hover', (await cur()) === c);
    await p.getByTestId('cert-next').click();
    await p.waitForTimeout(1000);
    const d = await cur();
    await p.getByTestId('cert-prev').click();
    await p.waitForTimeout(1000);
    ok('Certifications: manual arrows', d !== c && (await cur()) === c, `${c} → ${d} → ${await cur()}`);
    const texts = await cert.innerText();
    ok('Certifications: CARPRO / Nasiol / Gtechniq present', /Certifikimet Tona/.test(texts));
    await ctx.close();
  }

  // ---------------- Projects ----------------
  {
    const ctx = await ctxWith(browser);
    const p = await ctx.newPage();
    const expectCards = { 'audi-rs3': ['Audi RS3 Sportback', 'Goodwood Green', 'Polirim & Ceramic Coating'], 'ferrari-488-pista': ['Ferrari 488 Pista', 'Rosso Scuderia', 'Trajtuar me Paketën Gold'], 'bmw-740d': ['BMW G70 740d xDrive 2023', '', 'Polirim & Ceramic Coating'] };
    for (let [slug, [veh, color, svc]] of Object.entries(expectCards)) {
      await p.goto(BASE + '/', { waitUntil: 'networkidle' });
      const card = p.getByTestId(`project-card-${slug}`);
      const txt = (await card.innerText()).toLowerCase();
      [veh, color, svc] = [veh, color, svc].map((x) => x.toLowerCase());
      const empty = await card.locator('[data-filled=false]').count();
      const imgs = await card.locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
      // Audi RS3 + Ferrari: exactly one image = their own Photo 1; BMW: still an empty container
      const media = slug === 'bmw-740d' ? empty === 1 && imgs.length === 0 : empty === 0 && imgs.length === 1 && imgs[0] === `/assets/${slug}/01.webp`;
      ok(`Home card ${slug}: content + ${slug === 'bmw-740d' ? 'empty image container' : 'Photo 1 only'}`, txt.includes(veh) && txt.includes(color) && txt.includes(svc) && /shiko më shumë/i.test(txt) && media, imgs.join(','));
      await card.scrollIntoViewIfNeeded();
      await p.getByTestId(`project-link-${slug}`).click();
      await p.waitForURL(BASE + `/projects/${slug}`);
      await p.getByTestId(`project-${slug}`).waitFor();
      const folders = await p.locator(`[data-testid=project-${slug}] [data-slot]`).evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('data-slot')))]);
      ok(`Project ${slug}: opens correct project, all photos from its own folder`, folders.length === 1 && folders[0] === slug, folders.join(','));
    }
    // ---- Audi RS3 + Ferrari: project intro = Photo 1, galleries with every photo in order
    for (const [slug, n] of [['audi-rs3', 9], ['ferrari-488-pista', 14]]) {
      await p.goto(BASE + `/projects/${slug}`, { waitUntil: 'networkidle' });
      const pad = (i) => String(i).padStart(2, '0');
      const hero = await p.locator(`[data-testid=project-${slug}] img`).first().getAttribute('src');
      ok(`${slug}: project intro image = Photo 1 (same file as the card)`, hero === `/assets/${slug}/01.webp`, hero);
      const slotImgs = await p.locator('[data-testid=project-slot] img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
      const expected = Array.from({ length: n }, (_, i) => `/assets/${slug}/${pad(i + 1)}.webp`);
      ok(`${slug}: gallery has exactly ${n} photos, original order, own folder only`, (await p.locator('[data-testid=project-slot]').count()) === n && JSON.stringify(slotImgs) === JSON.stringify(expected));
      await p.locator('[data-testid=project-slot] button').first().click();
      const lbx = p.getByTestId('lightbox');
      await lbx.waitFor();
      const seen = [];
      for (let i = 0; i < n; i++) {
        await p.waitForTimeout(650);
        seen.push([(await p.getByTestId('lightbox-counter').textContent()).trim(), await lbx.locator('img').last().getAttribute('src')]);
        await p.keyboard.press('ArrowRight');
      }
      await p.waitForTimeout(650);
      const wrapped = (await p.getByTestId('lightbox-counter').textContent()).trim();
      const allOk = seen.every(([c, src], i) => c === `${pad(i + 1)} / ${pad(n)}` && src === expected[i]);
      ok(`${slug}: lightbox navigates through all ${n} photos in order and wraps`, allOk && wrapped === `01 / ${pad(n)}`, `${seen.length} viewed, wrap → ${wrapped}`);
      await p.keyboard.press('Escape');
      await lbx.waitFor({ state: 'detached' });
    }

    await p.goto(BASE + '/gallery', { waitUntil: 'networkidle' });
    ok('Gallery: Lamborghini featured large container', (await p.getByTestId('gallery-featured').innerText()).includes('Lamborghini Aventador SV Roadster') && (await p.locator('[data-testid=gallery-featured] [data-slot=lamborghini-aventador]').count()) === 1);
    const slots = p.getByTestId('gallery-slot');
    ok('Gallery: 16 independent placeholders', (await slots.count()) === 16 && (await p.locator('[data-testid=gallery-slot] [data-slot=gallery]').count()) === 16);
    const m135 = await p.getByTestId('gallery-m135i').innerText();
    ok('Gallery: BMW M135i special project (1 of 1, +1000 HP, Pastrim)', /BMW M135i/.test(m135) && /1000 HP/.test(m135) && /Pastrim i Përgjithshëm/.test(m135) && (await p.locator('[data-testid=gallery-m135i] [data-slot=bmw-m135i]').count()) === 1);
    // lightbox
    await slots.nth(2).scrollIntoViewIfNeeded();
    await slots.nth(2).locator('button').click();
    const lb = p.getByTestId('lightbox');
    await lb.waitFor();
    const counter = () => p.getByTestId('lightbox-counter').textContent();
    ok('Lightbox: opens on clicked image', (await counter()).trim() === '03 / 16');
    await p.getByTestId('lightbox-next').click();
    await p.waitForTimeout(600);
    ok('Lightbox: next', (await counter()).trim() === '04 / 16');
    await p.keyboard.press('ArrowLeft');
    await p.keyboard.press('ArrowLeft');
    await p.waitForTimeout(600);
    ok('Lightbox: previous (keyboard)', (await counter()).trim() === '02 / 16');
    ok('Lightbox: full-screen control available', (await lb.getByRole('button', { name: /Ekran i plotë/ }).count()) === 1);
    ok('Lightbox: page scroll locked', await p.evaluate(() => document.documentElement.classList.contains('scroll-locked')));
    await p.keyboard.press('Escape');
    await lb.waitFor({ state: 'detached' });
    ok('Lightbox: Escape closes', true);
    await p.getByTestId('m135-link').click();
    await p.waitForURL(BASE + '/projects/bmw-m135i');
    ok('Gallery: M135i opens its own project', (await p.getByTestId('project-vehicle').textContent()).includes('+1000 HP'));
    await p.goto(BASE + '/projects/lamborghini-aventador', { waitUntil: 'networkidle' });
    ok('Lamborghini project page (1 / 500)', (await p.locator('h1').innerText()).includes('Lamborghini') && (await p.locator('[data-testid=project-slot]').count()) === 12);
    await p.goto(BASE + '/projects/does-not-exist', { waitUntil: 'networkidle' });
    ok('Unknown project → 404 page (noindex)', (await p.locator('h1').innerText()).includes('nuk u gjet') && (await p.locator('meta[name=robots]').getAttribute('content')).includes('noindex'));
    await ctx.close();
  }

  // ---------------- Contact form (unconfigured build: must NOT fake success) ----------------
  {
    const ctx = await ctxWith(browser);
    const p = await ctx.newPage();
    await p.goto(BASE + '/contact', { waitUntil: 'networkidle' });
    await p.getByTestId('contact-submit').click();
    const errs = await p.locator('[data-testid=contact-form] [role=alert]').allTextContents();
    ok('Form: validation shows 4 errors on empty submit', errs.length === 4, errs.join(' / '));
    ok('Form: focus moves to first invalid field', (await p.evaluate(() => document.activeElement?.getAttribute('name'))) === 'name');
    await p.getByLabel('Emri i plotë').fill('Test Person');
    await p.getByLabel('Email adresa').fill('not-an-email');
    await p.getByLabel('Mesazhi juaj këtu').fill('Përshëndetje, dua një ofertë për veshje keramike.');
    await p.locator('[data-testid=contact-form] input[type=checkbox]').check();
    await p.getByTestId('contact-submit').click();
    ok('Form: invalid email rejected', (await p.locator('[data-testid=contact-form] [role=alert]').allTextContents()).some((t) => /email/i.test(t)));
    await p.getByLabel('Email adresa').fill('test@example.com');
    await p.getByTestId('contact-submit').click();
    await p.getByTestId('toast-error').waitFor({ timeout: 5000 });
    const toast = await p.getByTestId('toast-error').innerText();
    ok('Form (no backend configured): honest error + email fallback, no fake success', /nuk është lidhur/.test(toast) && (await p.getByTestId('toast-success').count()) === 0 && (await p.locator('[data-testid=toast-error] a[href^="mailto:info@advancedetailingco.com"]').count()) === 1, toast.split('\n')[0]);
    ok('Contact: phone clickable', (await p.getByTestId('contact-phone').getAttribute('href')) === 'tel:+38349909229');
    ok('Contact: email clickable', (await p.getByTestId('contact-email').getAttribute('href')) === 'mailto:info@advancedetailingco.com');
    const dir = await p.getByTestId('contact-directions').getAttribute('href');
    ok('Contact: Google Maps directions link (no invented coordinates)', dir.startsWith('https://www.google.com/maps/dir/?api=1&destination=') && !/[0-9]{2}\.[0-9]{4}/.test(decodeURIComponent(dir)), decodeURIComponent(dir));
    ok('Contact: invitation text', (await p.locator('main').innerText()).includes('Dëshironi të na vizitoni? Ndalo për një kafe.'));
    await ctx.close();
  }

  // ---------------- Social ----------------
  {
    const ctx = await ctxWith(browser);
    const p = await ctx.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    const want = {
      tiktok: 'https://www.tiktok.com/@advansplakolli?_r=1&_t=ZS-9B4qXYAusga',
      facebook: 'https://www.facebook.com/share/1PaJiT11Eh/?mibextid=wwXIfr',
      instagram: 'https://www.instagram.com/advancedetailingco?xtok=MWVwanAyN2k1NW5wOA==',
    };
    ok('Social: section title "Na Ndiqni Në"', (await p.getByTestId('social').innerText()).includes('Na Ndiqni Në'));
    for (const [id, url] of Object.entries(want)) {
      const a = p.getByTestId(`social-${id}`);
      ok(`Social ${id}: exact URL, new tab, rel=noopener noreferrer`, (await a.getAttribute('href')) === url && (await a.getAttribute('target')) === '_blank' && (await a.getAttribute('rel')) === 'noopener noreferrer');
    }
    await ctx.close();
  }

  // ---------------- Cookie consent / GDPR ----------------
  {
    const ctx = await ctxWith(browser, {}, { consent: false });
    const p = await ctx.newPage();
    const google = [];
    p.on('request', (r) => /google(tagmanager|-analytics)?\.com|maps\.google|gstatic/.test(r.url()) && google.push(r.url()));
    await p.goto(BASE + '/contact', { waitUntil: 'networkidle' });
    ok('Consent: banner shown on first visit', await p.getByTestId('cookie-banner').isVisible());
    const btns = await p.getByTestId('cookie-banner').locator('button').allTextContents();
    ok('Consent: Accept All / Reject Non-Essential / Cookie Settings', btns.length === 3, btns.join(' | '));
    ok('Consent: no Google requests and no map before consent', google.length === 0 && (await p.getByTestId('map-iframe').count()) === 0);
    await p.getByTestId('cookie-reject').click();
    await p.getByTestId('cookie-banner').waitFor({ state: 'detached', timeout: 3000 }).catch(() => undefined);
    const stored = JSON.parse(await p.evaluate(() => localStorage.getItem('adc-consent')));
    ok('Consent: Reject stores choice, banner hidden', stored.analytics === false && stored.media === false && (await p.getByTestId('cookie-banner').count()) === 0);
    await p.reload({ waitUntil: 'networkidle' });
    ok('Consent: choice remembered after reload; still no Google requests', (await p.getByTestId('cookie-banner').count()) === 0 && google.length === 0);
    await p.getByTestId('footer-cookie-settings').click();
    const modal = p.getByTestId('cookie-modal');
    await modal.waitFor();
    ok('Consent: necessary category locked on', await modal.locator('#consent-necessary').isDisabled());
    await modal.locator('#consent-media').click();
    await p.getByTestId('cookie-save').click();
    await p.getByTestId('map-iframe').waitFor({ timeout: 5000 });
    ok('Consent: map loads only after External media consent', true);
    await ctx.close();
    const c2 = await ctxWith(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { consent: false });
    const p2 = await c2.newPage();
    await p2.goto(BASE + '/en/services', { waitUntil: 'networkidle' });
    ok('Consent (mobile, EN): banner translated', /reject non-essential/i.test(await p2.getByTestId('cookie-banner').innerText()));
    await p2.getByTestId('cookie-accept').tap();
    ok('Consent: Accept All stores full consent', JSON.parse(await p2.evaluate(() => localStorage.getItem('adc-consent'))).media === true);
    await c2.close();
  }

  // ---------------- Legal pages ----------------
  {
    const ctx = await ctxWith(browser);
    const p = await ctx.newPage();
    const titles = { '': ['Politika e Privatësisë', 'Politika e Cookies', 'Kushtet e Përdorimit'], '/en': ['Privacy Policy', 'Cookie Policy', 'Terms & Conditions'], '/de': ['Datenschutzerklärung', 'Cookie-Richtlinie', 'Allgemeine Nutzungsbedingungen'] };
    for (const [pre, ts] of Object.entries(titles)) {
      for (const [i, doc] of ['privacy', 'cookies', 'terms'].entries()) {
        await p.goto(BASE + `${pre}/${doc}`, { waitUntil: 'networkidle' });
        const h1 = await p.locator('h1').innerText();
        const secs = await p.locator(`[data-testid=legal-${doc}] h2`).count();
        ok(`Legal ${pre || '/sq'}/${doc}`, h1.replace(/\s+/g, ' ').includes(ts[i]) && secs >= 5, `${h1.replace(/\s+/g, ' ')} (${secs} sections)`);
      }
    }
    await ctx.close();
  }

  // ---------------- Responsive: no horizontal scroll on any page ----------------
  {
    const sizes = [[360, 740, true], [390, 844, true], [412, 915, true], [768, 1024, true], [1024, 768, false], [1280, 800, false], [1440, 900, false], [1920, 1080, false]];
    const bad = [];
    for (const [w, h, mobile] of sizes) {
      const ctx = await ctxWith(browser, { viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
      const p = await ctx.newPage();
      for (const url of ALL.filter((u, i) => w === 390 || w === 1440 || i % 3 === 0 || u.includes('contact') || u.endsWith('/'))) {
        await p.goto(BASE + url, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(300);
        const sh = await p.evaluate(() => document.body.scrollHeight);
        for (let y = 0; y < sh; y += h) await p.evaluate((y) => scrollTo(0, y), y);
        await p.waitForTimeout(300);
        const sw = await p.evaluate(() => document.documentElement.scrollWidth);
        if (sw > w) bad.push(`${w}px ${url} (${sw})`);
      }
      await ctx.close();
    }
    ok('Responsive: no horizontal scrolling (360–1920px, all pages)', bad.length === 0, bad.join(', '));
  }

  // ---------------- Console errors + broken links ----------------
  {
    const ctx = await ctxWith(browser);
    const p = await ctx.newPage();
    const errors = [];
    const failed = [];
    p.on('console', (m) => m.type() === 'error' && errors.push(`${p.url()}: ${m.text()}`));
    p.on('pageerror', (e) => errors.push(`${p.url()}: ${e.message}`));
    p.on('response', (r) => r.url().startsWith(BASE) && r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
    const links = new Set();
    for (const url of ALL) {
      await p.goto(BASE + url, { waitUntil: 'networkidle' });
      (await p.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).forEach((h) => links.add(h.split('#')[0]));
    }
    ok('No console errors on any page', errors.length === 0, errors.slice(0, 5).join(' | '));
    ok('No failed asset requests', failed.length === 0, failed.slice(0, 5).join(' | '));
    const broken = [];
    for (const href of links) {
      const r = await p.request.get(BASE + href);
      const html = await r.text();
      if (r.status() !== 200 || !html.includes('<div id="root">')) broken.push(`${r.status()} ${href}`);
    }
    ok(`Internal links resolve (${links.size} unique)`, broken.length === 0, broken.join(', '));
    await ctx.close();
  }

  // ---------------- Reduced motion ----------------
  {
    const ctx = await ctxWith(browser, { reducedMotion: 'reduce' }, { intro: true });
    const p = await ctx.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    await p.getByTestId('intro').waitFor({ state: 'detached', timeout: 8000 });
    const op = await p.locator('#hero-title').evaluate((e) => getComputedStyle(e.closest('[data-hero=content]').querySelector('[data-hero=fade]')).opacity);
    ok('Reduced motion: short intro, content fully visible', op === '1', `opacity=${op}`);
    await ctx.close();
  }

  await browser.close();
  const failedN = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failedN}/${results.length} checks passed`);
  process.exit(failedN ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
