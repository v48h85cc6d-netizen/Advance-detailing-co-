# ADVANCE DETAILING CO. — Website

Premium automotive detailing website for **ADVANCE DETAILING CO.**, Prishtinë, Kosovë.
*Precision. Perfection. Protection. Exclusivity.*

Built with **React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · Motion for React · GSAP + ScrollTrigger · Three.js · React Three Fiber · Drei**.

Languages: **Shqip (default, `/`)**, **English (`/en`)**, **Deutsch (`/de`)**.

---

## 1. Quick start (local preview)

Requirements: **Node.js 20+** (22 recommended).

```bash
npm install
npm run dev          # development server → http://localhost:5173
npm run build        # production build → ./dist (includes SEO pages, sitemap, robots)
npm run preview      # serve the production build → http://localhost:4173
npm run zip          # build release ZIPs in ./release/
```

Tip: add `?nointro` to the URL (e.g. `http://localhost:5173/?nointro`) to skip the intro while working.

---

## 2. Project structure

```
public/
  assets/
    logo/                  Official logo (SVG + PNG + WebP, white & black, full/nav/symbol/wordmark)
    intro-video/           intro.webm, intro.mp4, intro-ambient.mp4, intro-poster.jpg/.webp
    homepage/              (optional) hero.jpg background photo
    audi-rs3/              Audi RS3 Sportback project photos
    ferrari-488-pista/     Ferrari 488 Pista project photos
    bmw-740d/              BMW G70 740d xDrive project photos
    audi-rs6/              Audi RS6 Performance (full XPEL) photos
    bmw-m135i/             BMW M135i engine photos
    gallery/               16 general gallery photos
    certifications/        (optional) carpro.*, nasiol.*, gtechniq.* logos
    about/                 company photo (company.jpg)
  favicon.ico / favicon.svg / apple-touch-icon.png / icon-*.png / og-image.jpg
src/
  config/
    site.ts                ← business details, phone, email, address, Google Maps, social links, form settings
    projects.ts            ← projects (slug, folder, number of photo slots)
    services.ts            ← the 16 services (order & category)
    certifications.ts      ← certifications
    images.ts              ← image-slot logic, logo & video paths
    routes.json            ← pages, languages, project slugs (used by app + SEO generator)
  locales/
    sq.json  en.json  de.json   ← ALL text of the website, incl. legal pages & metadata
  components/ pages/ lib/ three/ styles/
scripts/
  generate-pages.mjs       post-build SEO: per-page HTML, sitemap.xml, robots.txt, 404.html
  optimize-images.mjs      `npm run images` — converts photos to optimised WebP
  make-zip.mjs             `npm run zip`
server/contact.php         optional PHP backend for the contact form (cPanel hosting)
tests/e2e.cjs              browser test-suite (Playwright)
```

---

## 3. Replacing the image placeholders (your photographs)

Every empty container on the website reads from **its own folder** — photographs can never mix between projects.

1. Copy your photos into the matching folder in `public/assets/`.
2. Name them in the order you want them to appear: `01.jpg`, `02.jpg`, `03.jpg` … Photos fill the containers in filename order
   (natural order, so `10.jpg` comes after `09.jpg`); the first photo goes into container 1, the second into container 2, etc.
3. Name the main/cover photo **`cover.jpg`** (used on homepage cards, the large featured containers and the top of each project page). Without a `cover.*` the first photo is used.
4. (Recommended) run `npm run images` — converts JPG/PNG to optimised WebP (max 2400 px) and moves the originals to `./assets-originals/`.
5. `npm run build` (the dev server picks up new photos automatically).

| Where on the site | Folder | Slots |
|---|---|---|
| Homepage card 1 + project page — Audi RS3 Sportback (Goodwood Green) | `audi-rs3/` | cover + 8 |
| Homepage card 2 + project page — Ferrari 488 Pista (Rosso Scuderia) | `ferrari-488-pista/` | cover + 8 |
| Homepage card 3 + project page — BMW G70 740d xDrive 2023 | `bmw-740d/` | cover + 8 |
| Home spotlight + Gallery large container + project page — Audi RS6 Performance | `audi-rs6/` | 7 |
| Gallery special project + project page — BMW M135i Engine 1 of 1 | `bmw-m135i/` | cover + 8 |
| Gallery — 16 containers | `gallery/` | 16 (`01`–`16`) |
| About Us — company photo | `about/` | `company.jpg` |
| Homepage hero background (optional, shown subtly behind the 3D logo) | `homepage/` | `cover.jpg` |
| Certification logos (optional, otherwise elegant text) | `certifications/` | `carpro.png`, `nasiol.png`, `gtechniq.png` |

Change the number of photo slots per project in `src/config/projects.ts` (`photoSlots`). Supported formats: `.jpg .jpeg .png .webp .avif`.

Until a photo is added, a branded placeholder ("Fotografia së shpejti") is shown — never a stock or AI photo.

---

## 4. Replacing the intro video

The intro uses your supplied video, optimised into several files in `public/assets/intro-video/`:

| File | Purpose |
|---|---|
| `intro.webm` | main video (VP9, smallest — Chrome/Firefox/Edge/Android) |
| `intro.mp4` | main video (H.264, Safari/iPhone fallback) |
| `intro-ambient.mp4` | tiny 180×320 copy used as the blurred full-screen background on wide screens |
| `intro-poster.jpg` / `.webp` | first frame shown while loading |

To replace it, create new files with the **same names** (with [ffmpeg](https://ffmpeg.org)):

```bash
ffmpeg -i NEW.mov -an -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart intro.mp4
ffmpeg -i NEW.mov -an -c:v libvpx-vp9 -b:v 0 -crf 42 -row-mt 1 intro.webm
ffmpeg -i NEW.mov -an -vf scale=180:-2 -c:v libx264 -crf 30 -pix_fmt yuv420p -movflags +faststart intro-ambient.mp4
ffmpeg -ss 0.4 -i NEW.mov -frames:v 1 -q:v 3 intro-poster.jpg
ffmpeg -ss 0.4 -i NEW.mov -frames:v 1 -vf scale=360:-1 intro-poster.webp
```

Behaviour: full-screen, autoplay, muted, playsInline, **Skip Intro** button (and `Esc`), progress bar, logo presentation,
curtain transition into the website. Shown once per browser session, only when a visitor lands on the homepage.
If the network is slow (>4.5 s) or autoplay is blocked (e.g. iPhone Low-Power Mode) the logo is presented instead.
Visitors with "reduce motion" enabled get a short static logo presentation.

---

## 5. Editing texts & translations

All texts live in `src/locales/sq.json` (Albanian), `en.json` (English) and `de.json` (German) — navigation, buttons,
services, projects, about, contact form, notifications, cookie banner, footer, legal pages **and SEO metadata** (`meta.pages`).

* Edit the value, keep the key. All three files must have the same keys.
* `{{n}}` / `{{network}}` are placeholders; `<privacy>…</privacy>` marks the link in the form consent text.
* Business details (phone, email, address, social links) are edited once in `src/config/site.ts`.
* To add a language: add it to `routes.json` → `languages`, create `xx.json`, register it in `src/i18n/index.ts` and `src/lib/lang.ts`.

Check that all languages have the same keys:

```bash
node -e 'const k=(o,p="")=>Object.entries(o).flatMap(([a,v])=>v&&typeof v=="object"&&!Array.isArray(v)?k(v,p+a+"."):[p+a]);const s=new Set(k(require("./src/locales/sq.json")));for(const l of["en","de"]){const t=new Set(k(require(`./src/locales/${l}.json`)));for(const x of s)if(!t.has(x))console.log(l,"missing",x)}'
```

---

## 6. Connecting the contact form (real email delivery)

The form validates input, shows loading state and success/error notifications. **It only reports success when the
email provider confirms delivery.** Until a provider is configured it tells visitors honestly that the form is not
connected and offers an "Open email" button (mailto) — it never fakes a successful send.

Copy `.env.example` to `.env` and choose ONE option, then rebuild (`npm run build`):

**A) Web3Forms (free, easiest)** — register `info@advancedetailingco.com` at <https://web3forms.com> and get an access key:
```
VITE_CONTACT_PROVIDER=web3forms
VITE_WEB3FORMS_KEY=your-access-key
```

**B) Formspree** — create a form at <https://formspree.io>:
```
VITE_CONTACT_PROVIDER=formspree
VITE_CONTACT_ENDPOINT=https://formspree.io/f/xxxxxxx
```

**C) Own server (PHP / cPanel)** — upload `server/contact.php` to `/api/contact.php` on your hosting, adjust the two
e-mail constants at the top of the file, then:
```
VITE_CONTACT_PROVIDER=custom
VITE_CONTACT_ENDPOINT=/api/contact.php
```
Any custom backend must accept `POST` JSON `{name, email, message, language}` and reply with HTTP 2xx (optionally `{"ok": true}`).

Hosting dashboards (Netlify, Vercel, Cloudflare Pages) let you set these variables under *Environment variables*.

The form includes a GDPR consent checkbox and a hidden honeypot field against spam bots.

---

## 7. Publishing

1. Set your final domain in `.env`: `VITE_SITE_URL=https://advancedetailingco.com` (no trailing slash).
2. `npm run build` → upload the **contents of `dist/`** (or use `release/advance-detailing-co-website.zip` from `npm run zip`).

| Host | How |
|---|---|
| **Netlify** | Connect the repo (settings come from `netlify.toml`) or drag-and-drop the `dist` folder. |
| **Vercel** | Import the repo — framework "Vite", output `dist` (`vercel.json` included). |
| **Cloudflare Pages** | Build command `npm run build`, output `dist`. |
| **cPanel / Apache** | Upload the contents of `dist/` into `public_html/` (includes `.htaccess` with HTTPS redirect, clean URLs, caching). |

Every page is pre-generated as its own HTML file (`/services/index.html`, `/en/services/index.html`, …), so direct links
and refreshes work on any static host.

### Google Search Console
1. Add the property `https://advancedetailingco.com` (Domain or URL-prefix) and verify it (DNS record recommended).
2. Submit `https://advancedetailingco.com/sitemap.xml` (39 URLs with hreflang alternates for sq/en/de).
3. Use *URL inspection* on the homepage to request indexing.
4. Recommended: create/claim the **Google Business Profile** and paste its share link into `maps.placeUrl` in
   `src/config/site.ts` so the "Directions" buttons point to the verified listing.

### SEO included
Unique title + description per page and language · canonical URLs · hreflang (sq/en/de + x-default) · Open Graph &
Twitter cards (`og-image.jpg`) · `AutomotiveBusiness` (LocalBusiness) JSON-LD · `sitemap.xml` · `robots.txt` ·
favicons & web manifest · semantic headings · alt texts · lazy-loaded images and video · code-split bundles
(Three.js loads only for the homepage 3D scene).

---

## 8. Cookies & privacy (GDPR)

* Cookie banner: **Accept All**, **Reject Non-Essential**, **Cookie Settings** (also reachable from the footer).
* Nothing non-essential runs before consent: the Google Maps embed loads only with "External media" consent;
  Google Analytics (optional, `VITE_GA_ID`) loads only with "Analytics" consent. Withdrawing consent removes `_ga` cookies.
* Fonts are self-hosted (no requests to Google Fonts).
* Legal pages (Privacy Policy, Cookie Policy, Terms & Conditions) exist in all three languages and use only the
  company details supplied (name, address, phone, email). **Have them reviewed by a legal professional** and add your
  official registration details (e.g. business number) if required.

---

## 9. Testing

```bash
npm run build && npm run preview &      # serves http://localhost:4173
node tests/e2e.cjs http://localhost:4173
```

The suite (Playwright/Chromium) checks: intro video playback + Skip Intro, desktop & mobile navigation, dark/light mode,
Sun/Moon animation, persistence without flash, all 3 languages on all 39 pages (no missing keys), 16 services,
certification carousel (auto, arrows, pause-on-hover), the 3 homepage projects opening their own galleries, Lamborghini
& BMW M135i projects, 16 gallery placeholders, lightbox, contact form validation & honest error handling, social links,
cookie consent & GDPR gating, legal pages, no horizontal scrolling from 360 px to 1920 px, console errors, broken links,
and reduced-motion support.

---

## 10. Private Visual Editor (development only)

```bash
npm run dev
# → http://localhost:5173/__visual-editor
```

Select any element of the real website, edit text (all 3 languages), typography, colors, images, layout and sections in a
live preview (desktop / tablet / mobile), with undo/redo and drafts that survive refreshes. Changes are **drafts only** —
the source code is never modified by the editor. Export them with **Copy Change Request** or **Export Draft JSON**
(also auto-saved to `.visual-editor/`) and ask Claude Code to implement them. The editor does not exist in production
builds. Full guide: [`visual-editor/README.md`](visual-editor/README.md).

---

## 11. Interface sounds (mechanical "clack")

Intentional clicks/taps play a very short, subtle mechanical click (about 40–90 ms). Every sound kind has 3 variations,
plus ±2.5 % pitch and ±0.6 dB level humanisation, so it never sounds identical twice.

| Interaction | Sound |
|---|---|
| Buttons, form submit, CTAs | `button` — short premium click + latch |
| Navigation bar, mobile menu, footer navigation, hamburger | `nav` — refined, slightly lower clack |
| Service cards, project cards, social & contact cards, carousel arrows | `card` — subtle damped tactile click |
| Gallery images, lightbox controls, featured projects | `gallery` — soft two-curtain camera shutter |
| Theme switch, language selector, checkboxes, cookie switches | `switch` — crisp tick + detent |
| Any other link / control | `ui` — consistent subtle click |

* **Toggle:** speaker button in the navigation (next to the theme switch). The choice is stored in `localStorage`
  (`adc-sound`). Turning it on gives one confirmation click; turning it off is silent.
* **Browser policies:** nothing is created or played before the visitor's first tap/click (autoplay rules on iOS
  Safari, Android and desktop). On iOS 17+ the "ambient" audio session is used: it respects the silent switch
  and never pauses the visitor's own music.
* **When it plays:** only on completed clicks/taps of interactive elements (`click` events), never while
  scrolling, swiping, dragging, typing or tapping plain text. Disabled controls are silent. Bursts are limited to one
  sound per 55 ms, and a new click fades out a still-ringing one (no overlap).
* **Performance:** one 39 KB MP3 sprite (`public/assets/sounds/ui-clicks.mp3`), fetched after page load at low priority
  (not downloaded at all when the visitor has sound off or Data Saver on), decoded once, played with Web Audio
  (no `Audio()` objects). The audio engine suspends itself after 15 s idle and when the tab is hidden.
* **Code:** `src/lib/sound.ts` (engine + click→sound rules), `src/components/SoundToggle.tsx`.
  To give an element a specific sound add `data-sound="button|nav|card|gallery|switch|ui"`, or `data-sound="none"`
  to silence it. Levels per kind: `LEVEL` in `src/lib/sound.ts`.
* **Changing the sounds:** they are synthesised with a physical model of precision automotive switchgear (sound
  design v2: controlled contact transient, damped detuned housing resonances, soft low body, secondary latch — no
  samples, no licences) by `python3 scripts/generate-sounds.py` (needs numpy + ffmpeg). Tweak the parameters or the
  per-category loudness targets (`TARGET_DBA`) and re-run; the script measures the encoded sprite and prints the
  calibrated `LEVEL` line to paste into `src/lib/sound.ts`.
  To use your own recordings instead, build a mono sprite in the same layout (6 kinds in the order
  button, nav, card, gallery, switch, ui; 3 variations each; one every 0.18 s) and save it as `ui-clicks.mp3`.
  The exact start of each sound is detected automatically.
* **Tests:** `npm run preview` then `npm run test:sound` (56 checks: desktop + iPhone/Android emulation).

