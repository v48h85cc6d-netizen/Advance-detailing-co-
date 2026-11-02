/**
 * Visual Editor BRIDGE — runs inside the preview iframe (development only).
 * Loaded by the dev-server loader only when the page is framed by /__visual-editor.
 *
 * It never edits source files and never mutates React-owned structure:
 *  - text from translations  → temporary i18n resource overrides (React re-renders natively)
 *  - styles / images / hiding → one generated <style> sheet with !important rules
 *  - other single text nodes → nodeValue swap, restored on every re-apply
 */
import i18n from '../src/i18n';
import { ScrollTrigger } from '../src/lib/gsap';
import { langFromPath } from '../src/lib/lang';
import type { DraftChange, ElementInfo, FromBridge, Lang, ToBridge, VisualType } from './types';

const ORIGIN = location.origin;
const post = (m: FromBridge) => window.parent.postMessage(m, ORIGIN);

// ---------------------------------------------------------------- i18n helpers
type Dict = Record<string, unknown>;
const store = i18n.store.data as Record<Lang, { translation: Dict }>;
const pristine = structuredClone(store) as Record<Lang, { translation: Dict }>;

function getPath(obj: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Dict)[k] : undefined), obj);
}
function setPath(obj: Dict, key: string, value: string) {
  const parts = key.split('.');
  let o: Dict = obj;
  for (const p of parts.slice(0, -1)) o = (o[p] ??= {}) as Dict;
  o[parts[parts.length - 1]] = value;
}
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

const indexCache = new Map<Lang, Map<string, string[]>>();
function reverseIndex(lang: Lang) {
  let idx = indexCache.get(lang);
  if (idx) return idx;
  idx = new Map();
  const walk = (o: unknown, prefix: string) => {
    if (typeof o === 'string') {
      const k = norm(o);
      if (k) idx!.set(k, [...(idx!.get(k) ?? []), prefix]);
    } else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, prefix ? `${prefix}.${k}` : k);
  };
  walk(pristine[lang].translation, '');
  indexCache.set(lang, idx);
  return idx;
}

/** Find translation keys whose (pristine or currently overridden) text matches the element text. */
function findKeys(el: Element, lang: Lang): string[] {
  const raw = norm(el.getAttribute('aria-label') || el.textContent || '');
  if (!raw || raw.length > 2000) return [];
  const variants = [raw, raw.replace(/[.:]$/, ''), raw.replace(/^[“"]|[”"]$/g, ''), raw.replace(/\s*\*$/, '')];
  const idx = reverseIndex(lang);
  const out = new Set<string>();
  for (const v of variants) idx.get(v)?.forEach((k) => out.add(k));
  for (const [k, v] of activeOverrides) if (k.startsWith(lang + '|') && variants.includes(norm(v))) out.add(k.slice(3));
  return [...out];
}

// ---------------------------------------------------------------- state
let selecting = false;
let selected: { el: Element; selector: string } | null = null;
let hovered: Element | null = null;
let changes: DraftChange[] = [];
const activeOverrides = new Map<string, string>(); // "lang|key" → value
let textSwaps: { node: Text; original: string }[] = [];

const current = () => {
  const { lang, rest } = langFromPath(location.pathname);
  return { lang, route: rest, url: location.pathname };
};

// ---------------------------------------------------------------- overlay UI (outside #root)
const css = document.createElement('style');
css.id = 've-bridge-style';
css.textContent = `
html.ve-selecting, html.ve-selecting * { cursor: crosshair !important; }
.ve-box { position: fixed; pointer-events: none; z-index: 2147483646; border-radius: 6px; transition: all .12s ease-out; }
.ve-hover { outline: 1px dashed rgba(170,170,180,.9); outline-offset: 2px; }
.ve-sel { box-shadow: 0 0 0 1.5px #f4f4f3, 0 0 0 3px rgba(5,5,5,.85), 0 0 24px rgba(255,255,255,.18); }
.ve-label { position: fixed; z-index: 2147483647; pointer-events: none; font: 600 10px/1 'Manrope Variable', system-ui, sans-serif;
  letter-spacing: .12em; text-transform: uppercase; color: #050505; background: #f4f4f3; padding: 6px 9px; border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(5,5,5,.6), 0 6px 20px rgba(0,0,0,.35); white-space: nowrap; max-width: 80vw; overflow: hidden; text-overflow: ellipsis; }
.ve-label b { font-weight: 800; margin-right: 6px; opacity: .55; }`;
document.head.appendChild(css);
const draftSheet = document.createElement('style');
draftSheet.id = 've-draft-style';
document.head.appendChild(draftSheet);

const hoverBox = document.createElement('div');
hoverBox.className = 've-box ve-hover';
const selBox = document.createElement('div');
selBox.className = 've-box ve-sel';
const label = document.createElement('div');
label.className = 've-label';
for (const n of [hoverBox, selBox, label]) {
  n.setAttribute('data-ve-ui', '');
  n.style.display = 'none';
  document.documentElement.appendChild(n);
}

function place(box: HTMLElement, el: Element | null) {
  if (!el || !el.isConnected) return (box.style.display = 'none');
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return (box.style.display = 'none');
  box.style.display = 'block';
  Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  return r;
}
function tick() {
  if (selected && !selected.el.isConnected) {
    const again = document.querySelector(selected.selector);
    if (again) selected.el = again;
  }
  const r = place(selBox, selected?.el ?? null);
  if (r && typeof r !== 'string' && selected) {
    label.style.display = 'block';
    const top = r.top > 30 ? r.top - 28 : Math.min(r.bottom + 6, innerHeight - 26);
    Object.assign(label.style, { left: `${Math.max(6, Math.min(r.left, innerWidth - label.offsetWidth - 6))}px`, top: `${Math.max(4, top)}px` });
  } else label.style.display = 'none';
  place(hoverBox, selecting && hovered !== selected?.el ? hovered : null);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ---------------------------------------------------------------- element resolution
const ATOMIC = 'h1,h2,h3,h4,h5,h6,a,button,label,summary';
const MEANINGFUL = new Set(['IMG', 'VIDEO', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'A', 'BUTTON', 'LI', 'DT', 'DD', 'LABEL', 'BLOCKQUOTE', 'FIGURE', 'IFRAME']);
const hasOwnText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === 3 && norm(n.textContent || ''));
const isMeaningful = (el: Element) => MEANINGFUL.has(el.tagName) || ((el.tagName === 'SPAN' || el.tagName === 'DIV') && hasOwnText(el));

function resolve(target: Element): Element | null {
  if (target.closest('[data-ve-ui]')) return null;
  let start: Element = target.closest('svg') ?? target;
  const atomic = start.closest(ATOMIC);
  if (atomic) {
    const ann = start.closest('[data-visual-id]');
    start = ann && atomic.contains(ann) ? ann : atomic;
  }
  let candidate: Element | null = null;
  for (let el: Element | null = start; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (el.hasAttribute('data-visual-id')) {
      const t = el.getAttribute('data-visual-type');
      if (candidate && (t === 'section' || t === 'card' || t === 'container')) return candidate;
      return el;
    }
    if (!candidate && isMeaningful(el)) candidate = el;
  }
  return candidate ?? (start instanceof HTMLElement && start.closest('#root') ? start : null);
}

const cssEsc = (s: string) => s.replace(/["\\]/g, '\\$&');
const annSel = (id: string) => `[data-visual-id="${cssEsc(id)}"]`;

function selectorFor(el: Element): { id: string; selector: string; derived: boolean; anchor: Element | null } {
  const id = el.getAttribute('data-visual-id');
  if (id) return { id, selector: annSel(id), derived: false, anchor: el };
  const segs: string[] = [];
  let node: Element = el;
  let anchor: Element | null = null;
  while (node.parentElement) {
    const parent: Element = node.parentElement;
    const same = [...parent.children].filter((c) => c.tagName === node.tagName);
    segs.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${same.indexOf(node) + 1})`);
    if (parent.hasAttribute('data-visual-id')) {
      anchor = parent;
      break;
    }
    if (parent.id === 'main' || parent.id === 'root') {
      anchor = parent;
      break;
    }
    node = parent;
  }
  const base = anchor?.hasAttribute('data-visual-id') ? annSel(anchor.getAttribute('data-visual-id')!) : `#${anchor?.id ?? 'root'}`;
  const baseId = anchor?.getAttribute('data-visual-id') ?? `#${anchor?.id ?? 'root'}`;
  return { id: `${baseId} > ${segs.join(' > ')}`, selector: `${base} > ${segs.join(' > ')}`, derived: true, anchor };
}

function typeOf(el: Element): VisualType {
  const t = el.getAttribute('data-visual-type') as VisualType | null;
  if (t) return t;
  if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'IFRAME' || el.hasAttribute('data-slot')) return 'image';
  if (el.tagName === 'A' || el.tagName === 'BUTTON') return el.closest('header nav') ? 'nav' : 'button';
  if (el.tagName === 'SECTION' || el.tagName === 'FOOTER' || el.tagName === 'HEADER') return 'section';
  if (el.tagName === 'ARTICLE') return 'card';
  if (/^(H[1-6]|P|SPAN|LI|DT|DD|LABEL|BLOCKQUOTE)$/.test(el.tagName)) return 'text';
  return 'container';
}

const STYLE_PROPS = [
  'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'text-align', 'background-color', 'background-image',
  'border-color', 'border-width', 'border-style', 'border-radius', 'width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'translate', 'display', 'opacity',
];

function info(el: Element, selector: string, id: string, derived: boolean): ElementInfo {
  const { lang, route, url } = current();
  const cs = getComputedStyle(el);
  const styles: Record<string, string> = {};
  for (const p of STYLE_PROPS) styles[p] = cs.getPropertyValue(p);
  const img = el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
  if (img) {
    const ics = getComputedStyle(img);
    styles['object-fit'] = ics.objectFit;
    styles['object-position'] = ics.objectPosition;
  }
  const type = typeOf(el);
  const explicitKey = el.getAttribute('data-visual-key') || undefined;
  const candidates = type === 'image' || type === 'section' ? [] : findKeys(el, lang);
  if (explicitKey && !candidates.includes(explicitKey)) candidates.unshift(explicitKey);
  const i18nKey = explicitKey ?? candidates[0];
  const textValues = i18nKey
    ? (Object.fromEntries((['sq', 'en', 'de'] as Lang[]).map((l) => [l, String(getPath(pristine[l].translation, i18nKey) ?? '')])) as Record<Lang, string>)
    : undefined;
  const textNodes = [...el.querySelectorAll('*'), el].flatMap((n) => [...n.childNodes].filter((c) => c.nodeType === 3 && norm(c.textContent || '')));
  const plainEditable = !i18nKey && textNodes.length === 1 && (type === 'text' || type === 'button' || type === 'nav');
  const slot = el.closest('[data-slot]') ?? el.querySelector('[data-slot]');
  const crumbs: ElementInfo['breadcrumb'] = [];
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const pid = p.getAttribute('data-visual-id');
    if (pid) crumbs.push({ id: pid, selector: annSel(pid), type: typeOf(p), label: pid });
  }
  const main = document.getElementById('main');
  // GSAP wraps pinned sections in a .pin-spacer — look through it
  const sectionOf = (k: Element) => (k.hasAttribute('data-visual-id') ? k : k.classList.contains('pin-spacer') ? k.querySelector(':scope > [data-visual-id]') : null);
  const kids = main ? [...main.children].map(sectionOf) : [];
  const parent = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement.parentElement : el.parentElement;
  const reorderable = !!main && parent === main && kids.length > 1 && kids.every(Boolean);
  return {
    id,
    selector,
    type,
    derived,
    label: id.length > 60 ? '…' + id.slice(-58) : id,
    tag: el.tagName.toLowerCase(),
    global: !!el.closest('header, footer, [data-testid=cookie-banner]'),
    sourceFile: el.getAttribute('data-visual-file') ?? el.closest('[data-visual-file]')?.getAttribute('data-visual-file') ?? undefined,
    i18nKey,
    keyCandidates: candidates,
    textValues,
    text: plainEditable ? textNodes[0].textContent ?? '' : undefined,
    textEditable: Boolean(i18nKey) || plainEditable,
    image: type === 'image' ? { src: img?.currentSrc || img?.getAttribute('src') || null, folder: slot?.getAttribute('data-slot') ?? undefined, filled: slot?.getAttribute('data-filled') === 'true' || (!!img && !slot) } : undefined,
    styles,
    canReorder: reorderable,
    sectionOrder: reorderable ? kids.map((k) => k!.getAttribute('data-visual-id')!) : undefined,
    breadcrumb: crumbs,
    route,
    lang,
    url,
  };
}

function select(el: Element) {
  const s = selectorFor(el);
  selected = { el, selector: s.selector };
  const i = info(el, s.selector, s.id, s.derived);
  label.innerHTML = `<b>${i.type}</b>${i.label.replace(/</g, '&lt;')}`;
  post({ type: 've:selected', info: i });
}

// ---------------------------------------------------------------- input interception (only while selecting)
const BLOCK = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'dblclick', 'contextmenu', 'auxclick', 'submit', 'touchstart', 'touchend'];
for (const ev of BLOCK)
  window.addEventListener(
    ev,
    (e) => {
      if (!selecting || (e.target as Element)?.closest?.('[data-ve-ui]')) return;
      if (ev !== 'touchstart' && ev !== 'touchend') e.preventDefault();
      e.stopImmediatePropagation();
    },
    { capture: true, passive: false },
  );
window.addEventListener(
  'click',
  (e) => {
    if (!selecting) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const el = resolve(e.target as Element);
    if (el) select(el);
  },
  { capture: true },
);
window.addEventListener(
  'pointermove',
  (e) => {
    if (!selecting) return;
    hovered = resolve(e.target as Element);
  },
  { capture: true, passive: true },
);
// While selecting, keep the site's pointer-driven effects (card tilt, magnetic hovers, drag) still.
for (const ev of ['pointermove', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'mousemove', 'mouseover', 'mouseout'])
  document.addEventListener(
    ev,
    (e) => {
      if (selecting) e.stopImmediatePropagation();
    },
    { capture: true },
  );
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selected) {
    selected = null;
    post({ type: 've:deselected' });
  }
});

// ---------------------------------------------------------------- applying the draft
const IMG_PROPS = new Set(['object-fit', 'object-position']);
let refreshTimer = 0;

function scopeMatches(c: DraftChange, lang: Lang, route: string) {
  return (c.route === '*' || c.route === route) && (c.lang === 'all' || c.lang === lang);
}

function apply(next: DraftChange[]) {
  changes = next;
  const { lang, route } = current();
  observer.disconnect();

  // 1) translation overrides (all pages using the key update, exactly like a real edit would)
  const before = new Map(activeOverrides);
  for (const k of activeOverrides.keys()) {
    const [l, key] = [k.slice(0, 2) as Lang, k.slice(3)];
    const orig = getPath(pristine[l].translation, key);
    if (typeof orig === 'string') setPath(store[l].translation, key, orig);
  }
  activeOverrides.clear();
  for (const c of changes)
    if (c.property === 'text' && c.i18nKey && c.lang !== 'all') {
      setPath(store[c.lang].translation, c.i18nKey, c.proposed);
      activeOverrides.set(`${c.lang}|${c.i18nKey}`, c.proposed);
    }
  const i18nChanged = before.size !== activeOverrides.size || [...activeOverrides].some(([k, v]) => before.get(k) !== v);
  if (i18nChanged) i18n.changeLanguage(i18n.language); // re-render all translated components

  // 2) stylesheet for styles, images, visibility, order
  const rules: string[] = [];
  const scoped = changes.filter((c) => c.property !== 'text' && scopeMatches(c, lang, route));
  for (const c of scoped) {
    const s = c.selector;
    const v = c.proposed;
    if (c.property === 'src') {
      const u = `url("${v.replace(/"/g, '\\"')}")`;
      rules.push(`${s} img, img${s} { content: ${u} !important; opacity: 1 !important; filter: none !important; }`);
      rules.push(`${s}[data-filled="false"], ${s} [data-filled="false"] { background: ${u} center / cover no-repeat !important; }`);
      rules.push(`${s}[data-filled="false"] > *, ${s} [data-filled="false"] > * { visibility: hidden !important; }`);
    } else if (c.property === 'section-order') {
      try {
        const order = JSON.parse(v) as string[];
        rules.push(`#main { display: flex !important; flex-direction: column !important; }`);
        order.forEach((id, i) => rules.push(`#main > ${annSel(id)}, #main > .pin-spacer:has(> ${annSel(id)}) { order: ${i} !important; }`));
      } catch {
        /* ignore malformed */
      }
    } else if (IMG_PROPS.has(c.property)) {
      rules.push(`${s} img, img${s} { ${c.property}: ${v} !important; }`);
      const bg = c.property === 'object-fit' ? `background-size: ${v === 'fill' ? '100% 100%' : v === 'none' ? 'auto' : v} !important;` : `background-position: ${v} !important;`;
      rules.push(`${s}[data-filled="false"], ${s} [data-filled="false"] { ${bg} }`);
    } else if (c.property === 'color') {
      rules.push(`${s} { color: ${v} !important; -webkit-text-fill-color: ${v} !important; }`);
    } else {
      rules.push(`${s} { ${c.property}: ${v} !important; }`);
    }
  }
  draftSheet.textContent = rules.join('\n');

  // 3) non-translated single text nodes (this page + language only)
  applyTextSwaps(lang, route);

  observer.observe(document.getElementById('root')!, { childList: true, subtree: true, characterData: true });
  clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 350);
}

function applyTextSwaps(lang: Lang, route: string) {
  for (const s of textSwaps) if (s.node.isConnected && s.node.nodeValue !== s.original) s.node.nodeValue = s.original;
  textSwaps = [];
  for (const c of changes) {
    if (c.property !== 'text' || c.i18nKey || !scopeMatches(c, lang, route)) continue;
    const el = document.querySelector(c.selector);
    if (!el) continue;
    const node = [...el.querySelectorAll('*'), el].flatMap((n) => [...n.childNodes]).find((n) => n.nodeType === 3 && norm(n.textContent || '')) as Text | undefined;
    if (!node) continue;
    textSwaps.push({ node, original: node.nodeValue ?? '' });
    node.nodeValue = c.proposed;
  }
}

let moTimer = 0;
const observer = new MutationObserver(() => {
  clearTimeout(moTimer);
  moTimer = window.setTimeout(() => {
    const { lang, route } = current();
    observer.disconnect();
    textSwaps = textSwaps.filter((s) => s.node.isConnected);
    applyTextSwaps(lang, route);
    observer.observe(document.getElementById('root')!, { childList: true, subtree: true, characterData: true });
  }, 120);
});

// ---------------------------------------------------------------- messages from the editor
window.addEventListener('message', (e: MessageEvent<ToBridge>) => {
  if (e.origin !== ORIGIN || e.source !== window.parent || !e.data?.type?.startsWith('ve:')) return;
  const m = e.data;
  if (m.type === 've:mode') {
    selecting = m.selecting;
    document.documentElement.classList.toggle('ve-selecting', selecting);
    if (!selecting) hovered = null;
  } else if (m.type === 've:apply') {
    apply(m.changes);
    if (selected?.el.isConnected) {
      // keep the inspector's computed values in sync
      const s = selectorFor(selected.el);
      post({ type: 've:selected', info: info(selected.el, s.selector, s.id, s.derived) });
    }
  } else if (m.type === 've:select') {
    const el = document.querySelector(m.selector);
    if (el) {
      if (m.scroll) el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
      select(el);
    }
  } else if (m.type === 've:deselect') {
    selected = null;
  }
});

// ---------------------------------------------------------------- navigation tracking (SPA)
let lastPath = location.pathname;
const announce = (type: 've:ready' | 've:navigated') => {
  const { lang, route, url } = current();
  post({ type, lang, route, url, title: document.title });
};
const onNav = () => {
  if (location.pathname === lastPath) return;
  lastPath = location.pathname;
  selected = null;
  textSwaps = [];
  post({ type: 've:deselected' });
  setTimeout(() => {
    announce('ve:navigated');
    apply(changes);
  }, 60);
};
for (const fn of ['pushState', 'replaceState'] as const) {
  const orig = history[fn].bind(history);
  history[fn] = ((...args: Parameters<History['pushState']>) => {
    orig(...args);
    onNav();
  }) as History['pushState'];
}
window.addEventListener('popstate', onNav);

const ready = () => setTimeout(() => announce('ve:ready'), 50);
if (document.readyState === 'complete') ready();
else window.addEventListener('load', ready, { once: true });
