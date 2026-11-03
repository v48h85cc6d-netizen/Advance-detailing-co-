/**
 * Interaction-sound tests (Playwright/Chromium) — desktop + iPhone/Android device emulation.
 *   npm run build && npm run preview &   →   node tests/sound.cjs http://localhost:4173
 * Web Audio is instrumented in the page: every AudioContext creation and every source.start()
 * is recorded, together with the engine's `adc:sound` event (kind + variation).
 */
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:4173';
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=user-gesture-required'];
const results = [];
const ok = (name, cond, info = '') => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`);
};

const instrument = () => {
  window.__snd = { ctx: 0, starts: 0, events: [] };
  const Orig = window.AudioContext;
  if (Orig) {
    window.AudioContext = class extends Orig {
      constructor(...a) {
        super(...a);
        window.__snd.ctx++;
        window.__snd.lastCtx = this;
      }
    };
  }
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    window.__snd.starts++;
    window.__snd.lastDur = this.buffer ? this.buffer.duration : 0;
    return start.apply(this, a);
  };
  window.addEventListener('adc:sound', (e) => window.__snd.events.push(e.detail));
  try {
    sessionStorage.setItem('adc-intro', '1');
  } catch (e) {}
};

async function setup(browser, device, { consent = true, soundPref } = {}) {
  const ctx = await browser.newContext(device ? { ...device } : { viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(instrument);
  await ctx.addInitScript(
    ({ consent, soundPref }) => {
      try {
        if (consent) localStorage.setItem('adc-consent', JSON.stringify({ v: 1, ts: Date.now(), analytics: false, media: false }));
        if (soundPref) localStorage.setItem('adc-sound', soundPref);
      } catch (e) {}
    },
    { consent, soundPref },
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => (m.type() === 'error' || /AudioContext/.test(m.text())) && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const requests = [];
  page.on('response', (r) => r.url().includes('/assets/sounds/') && requests.push({ url: r.url(), status: r.status() }));
  return { ctx, page, errors, requests };
}
const snd = (page) => page.evaluate(() => ({ ...window.__snd, lastCtx: undefined, state: window.__snd.lastCtx?.state }));
const kinds = async (page) => (await snd(page)).events.map((e) => e.kind);
async function expectSound(page, action, kind, label) {
  const before = (await snd(page)).events.length;
  await action();
  await page.waitForTimeout(250);
  const ev = (await snd(page)).events.slice(before);
  ok(`${label} → "${kind}"`, ev.length === 1 && ev[0].kind === kind, ev.map((e) => e.kind).join(',') || 'no sound');
}
async function expectSilence(page, action, label) {
  const before = (await snd(page)).events.length;
  await action();
  await page.waitForTimeout(300);
  const ev = (await snd(page)).events.slice(before);
  ok(`${label} → silent`, ev.length === 0, ev.map((e) => e.kind).join(','));
}

(async () => {
  const browser = await chromium.launch({ args: GL });
  try {
    // =========================================================== desktop
    {
      const { ctx, page, errors, requests } = await setup(browser);
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(4500); // idle preload
      const s0 = await snd(page);
      ok('No AudioContext before the first user gesture (autoplay policy)', s0.ctx === 0);
      ok('Sound sprite preloaded after page load (lightweight, single file)', requests.length === 1 && requests[0].status === 200, requests.map((r) => r.url.split('/').pop()).join(','));
      const size = await page.evaluate(async () => (await (await fetch('/assets/sounds/ui-clicks.mp3')).arrayBuffer()).byteLength);
      ok('Sprite size < 50 KB', size < 50 * 1024, `${(size / 1024).toFixed(1)} KB`);
      ok('Sound toggle in navigation, ON by default', (await page.getByTestId('sound-toggle').getAttribute('aria-pressed')) === 'true');

      await expectSound(page, () => page.getByTestId('hero-cta').click({ noWaitAfter: true }), 'button', 'Button (hero CTA)');
      const s1 = await snd(page);
      ok('AudioContext created inside the gesture and running', s1.ctx === 1 && s1.state === 'running', s1.state);
      ok('Sound length 30–110 ms', s1.lastDur > 0.03 && s1.lastDur <= 0.11, `${Math.round(s1.lastDur * 1000)} ms`);
      await page.waitForTimeout(800);
      await expectSound(page, () => page.getByTestId('nav-services').click(), 'nav', 'Navigation link');
      await page.waitForTimeout(800);
      await expectSound(page, () => page.locator('[data-testid=service-card]').first().click(), 'card', 'Service card');
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(800); // the site's navbar re-appears when scrolling up
      await expectSound(page, () => page.getByTestId('theme-toggle').click(), 'switch', 'Theme switch');
      await page.waitForTimeout(900);
      await expectSound(page, () => page.getByTestId('lang-button').click(), 'switch', 'Language selector');
      await expectSound(page, () => page.locator('a[hreflang=en]').first().click(), 'switch', 'Language option');
      await page.waitForURL(BASE + '/en/services');
      await page.waitForTimeout(800);
      await expectSound(page, () => page.getByTestId('cert-next').click(), 'card', 'Certification carousel arrow');
      await page.goto(BASE + '/gallery', { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await page.getByTestId('gallery-slot').nth(1).scrollIntoViewIfNeeded();
      await expectSound(page, () => page.getByTestId('gallery-slot').nth(1).locator('button').click(), 'gallery', 'Gallery image');
      await page.waitForTimeout(400);
      await expectSound(page, () => page.getByTestId('lightbox-next').click(), 'gallery', 'Lightbox next');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      await page.goto(BASE + '/contact', { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await expectSilence(page, () => page.getByLabel('Emri i plotë').click(), 'Clicking into a text field');
      await expectSilence(page, () => page.getByLabel('Emri i plotë').type('Test Person', { delay: 30 }), 'Typing');
      await expectSilence(page, () => page.locator('main h1').click(), 'Clicking plain text / ordinary click');
      await expectSilence(page, async () => {
        for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 400);
      }, 'Scrolling (mouse wheel)');
      await expectSound(page, () => page.locator('[data-testid=contact-form] input[type=checkbox]').click(), 'switch', 'Checkbox');
      await page.waitForTimeout(300);
      await expectSound(page, () => page.getByTestId('contact-submit').click(), 'button', 'Form submit button');
      await page.waitForTimeout(600);
      // burst protection + variation
      const before = (await snd(page)).events.length;
      await page.getByTestId('theme-toggle').dblclick();
      await page.waitForTimeout(300);
      ok('Rapid double click → only one sound (no overlap / excess playback)', (await snd(page)).events.length - before === 1);
      await page.waitForTimeout(900);
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      const vars = [];
      for (let i = 0; i < 6; i++) {
        await page.getByTestId('theme-toggle').click();
        await page.waitForTimeout(950);
        vars.push((await snd(page)).events.at(-1).variant);
      }
      ok('Variations: never the same sample twice in a row', vars.every((v, i) => i === 0 || v !== vars[i - 1]), vars.join(','));
      // drag on the certification slide (mouse)
      // drag on the carousel's stable container (hovering it pauses autoplay, so the slide is not swapped mid-test)
      const carousel = page.locator('[data-testid=certifications] [aria-roledescription="carousel"]');
      await carousel.scrollIntoViewIfNeeded();
      await carousel.hover();
      await page.waitForTimeout(1000);
      const cb = await carousel.boundingBox();
      const b = { x: cb.x, y: cb.y, width: cb.width, height: cb.height * 0.7 };
      await expectSilence(page, async () => {
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2 - 160, b.y + b.height / 2, { steps: 8 });
        await page.mouse.up();
      }, 'Dragging the carousel');
      // toggle off / persistence
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(600);
      await expectSilence(page, () => page.getByTestId('sound-toggle').click(), 'Turning sound OFF');
      ok('Preference saved (localStorage adc-sound=off)', (await page.evaluate(() => localStorage.getItem('adc-sound'))) === 'off');
      await expectSilence(page, () => page.getByTestId('nav-gallery').click(), 'Navigation while muted');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      ok('Muted state remembered after reload', (await page.getByTestId('sound-toggle').getAttribute('aria-pressed')) === 'false');
      await expectSilence(page, () => page.getByTestId('theme-toggle').click(), 'Theme switch while muted');
      await page.waitForTimeout(900);
      await expectSound(page, () => page.getByTestId('sound-toggle').click(), 'switch', 'Turning sound ON (confirmation click)');
      ok('No console errors / AudioContext warnings', errors.length === 0, errors.slice(0, 3).join(' | '));
      // performance: no animation-frame impact — the listener is passive and only runs on click
      await ctx.close();
    }

    // =========================================================== muted visitor never downloads audio
    {
      const { ctx, page, requests } = await setup(browser, null, { soundPref: 'off' });
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(4500);
      await page.getByTestId('hero-cta').click();
      await page.waitForTimeout(600);
      ok('Muted visitor: no audio download and no AudioContext', requests.length === 0 && (await snd(page)).ctx === 0);
      await ctx.close();
    }

    // =========================================================== iPhone + Android (emulated in Chromium)
    for (const name of ['iPhone 13', 'Pixel 7']) {
      const { ctx, page, errors } = await setup(browser, devices[name], { consent: false });
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(4500);
      ok(`${name}: nothing plays before a tap`, (await snd(page)).ctx === 0 && (await snd(page)).starts === 0);
      await expectSilence(page, async () => {
        const c = await page.context().newCDPSession(page);
        await c.send('Input.synthesizeScrollGesture', { x: 200, y: 600, yDistance: -500, speed: 1200, gestureSourceType: 'touch' });
        await c.send('Input.synthesizeScrollGesture', { x: 200, y: 600, yDistance: 400, speed: 1200, gestureSourceType: 'touch' });
      }, `${name}: touch scrolling`);
      await expectSound(page, () => page.getByTestId('cookie-reject').tap(), 'button', `${name}: tap cookie button (first gesture unlocks audio)`);
      ok(`${name}: AudioContext running after the tap`, (await snd(page)).state === 'running');
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(700);
      await expectSound(page, () => page.getByTestId('menu-toggle').tap(), 'nav', `${name}: tap hamburger`);
      await page.waitForTimeout(900);
      await expectSound(page, () => page.locator('#mobile-menu').getByRole('link', { name: /Shërbimet/ }).tap(), 'nav', `${name}: tap menu link`);
      await page.waitForURL(BASE + '/services');
      await page.waitForTimeout(1200);
      await expectSound(page, () => page.locator('[data-testid=service-card]').nth(1).tap(), 'card', `${name}: tap service card`);
      await page.waitForTimeout(300);
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(700);
      await expectSilence(page, () => page.getByTestId('sound-toggle').tap(), `${name}: tap sound toggle OFF`);
      ok(`${name}: sound toggle works on touch`, (await page.getByTestId('sound-toggle').getAttribute('aria-pressed')) === 'false');
      await page.waitForTimeout(300);
      await expectSound(page, () => page.getByTestId('sound-toggle').tap(), 'switch', `${name}: tap sound toggle ON (confirmation)`);
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      ok(`${name}: navigation with sound toggle has no horizontal overflow`, fits);
      ok(`${name}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
      await ctx.close();
    }
  } catch (e) {
    console.error(e);
    results.push({ name: 'crash', pass: false });
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} sound checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
