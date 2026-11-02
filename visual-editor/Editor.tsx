import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import routes from '../src/config/routes.json';
import sq from '../src/locales/sq.json';
import en from '../src/locales/en.json';
import de from '../src/locales/de.json';
import { localizePath } from '../src/lib/lang';
import type { DraftChange, ElementInfo, FromBridge, Lang, ToBridge } from './types';
import { useDraft } from './store';
import { buildChangeRequest, buildExport } from './exporters';
import { Inspector } from './Inspector';
import { Review } from './Review';
import { Button, Segmented, cx } from './ui';

const LOCALES: Record<Lang, unknown> = { sq, en, de };
const getKey = (lang: Lang, key: string) =>
  String(key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), LOCALES[lang]) ?? '');

const PAGES = [
  ...routes.pages.map((p) => ({ value: p.path, label: { home: 'Ballina — Home', services: 'Shërbimet — Services', about: 'Rreth Nesh — About', gallery: 'Galeria — Gallery', contact: 'Kontakt — Contact', privacy: 'Privacy Policy', cookies: 'Cookie Policy', terms: 'Terms & Conditions' }[p.key] ?? p.key })),
  ...routes.projects.map((s) => ({ value: `/projects/${s}`, label: `Project · ${(sq.projects as unknown as Record<string, { vehicle: string }>)[s].vehicle}` })),
];
type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICES: Record<Device, { w: number; h: number; label: string }> = {
  desktop: { w: 1440, h: 900, label: 'Desktop' },
  tablet: { w: 768, h: 1024, label: 'Tablet' },
  mobile: { w: 390, h: 844, label: 'Mobile' },
};
const PREFS_KEY = 'adc-visual-editor-prefs-v1';
interface Prefs {
  route: string;
  lang: Lang;
  device: Device;
  selecting: boolean;
  compare: 'draft' | 'original';
}
const readPrefs = (): Prefs => {
  const d: Prefs = { route: '/', lang: 'sq', device: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1100 ? 'tablet' : 'desktop', selecting: true, compare: 'draft' };
  try {
    return { ...d, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return d;
  }
};
const frameUrl = (route: string, lang: Lang) => `${localizePath(lang, route)}?nointro&ve=1`;

function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

export function Editor() {
  const draft = useDraft();
  const [prefs, setPrefs] = useState<Prefs>(readPrefs);
  const [src, setSrc] = useState(() => frameUrl(prefs.route, prefs.lang));
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<ElementInfo | null>(null);
  const [panel, setPanel] = useState<'inspector' | 'changes'>('inspector');
  const [sheet, setSheet] = useState<'closed' | 'half' | 'full'>('closed');
  const [toast, setToast] = useState('');
  const iframe = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 1200, h: 800 });
  const pendingSelect = useRef<string | null>(null);
  const desktopUi = useMedia('(min-width: 1024px)');

  const pending = draft.changes.filter((c) => c.status !== 'implemented');

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const send = useCallback((m: ToBridge) => iframe.current?.contentWindow?.postMessage(m, location.origin), []);
  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? '' : t)), 3200);
  };

  // changes that the preview should show
  const applied = useMemo(() => (prefs.compare === 'original' ? [] : draft.changes.filter((c) => c.status !== 'implemented')), [draft.changes, prefs.compare]);

  useEffect(() => {
    if (ready) send({ type: 've:apply', changes: applied });
  }, [applied, ready, send]);
  useEffect(() => {
    if (ready) send({ type: 've:mode', selecting: prefs.selecting });
  }, [prefs.selecting, ready, send]);

  // bridge messages
  useEffect(() => {
    const onMsg = (e: MessageEvent<FromBridge>) => {
      if (e.origin !== location.origin || e.source !== iframe.current?.contentWindow || !e.data?.type?.startsWith('ve:')) return;
      const m = e.data;
      if (m.type === 've:ready' || m.type === 've:navigated') {
        setReady(true);
        setSelected(null);
        setPrefs((p) => ({ ...p, route: m.route, lang: m.lang }));
        send({ type: 've:mode', selecting: prefs.selecting });
        send({ type: 've:apply', changes: applied });
        if (pendingSelect.current) {
          const s = pendingSelect.current;
          pendingSelect.current = null;
          window.setTimeout(() => send({ type: 've:select', selector: s, scroll: true }), 500);
        }
      } else if (m.type === 've:selected') {
        setSelected((prev) => {
          // keep a manually chosen translation key when the same element is re-reported
          if (prev && prev.selector === m.info.selector && prev.i18nKey && m.info.keyCandidates.includes(prev.i18nKey) && prev.i18nKey !== m.info.i18nKey)
            return { ...m.info, i18nKey: prev.i18nKey, textValues: prev.textValues };
          return m.info;
        });
        setPanel('inspector');
        if (!desktopUi) setSheet((s) => (s === 'closed' ? 'half' : s));
      } else if (m.type === 've:deselected') setSelected(null);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [applied, prefs.selecting, send, desktopUi]);

  // stage scaling
  useEffect(() => {
    if (!stage.current) return;
    const ro = new ResizeObserver(([e]) => setStageSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(stage.current);
    return () => ro.disconnect();
  }, []);
  const dev = DEVICES[prefs.device];
  const pad = desktopUi ? 24 : 8;
  const scale = Math.min(1, (stageSize.w - pad * 2) / dev.w);
  const frameH = Math.max(320, (stageSize.h - pad * 2) / scale);

  const navigate = (route: string, lang: Lang, selectAfter?: string) => {
    pendingSelect.current = selectAfter ?? null;
    setReady(false);
    setSelected(null);
    setPrefs((p) => ({ ...p, route, lang }));
    setSrc(`${frameUrl(route, lang)}&r=${Date.now().toString(36)}`);
  };

  const viewChange = (c: DraftChange) => {
    const lang = c.lang === 'all' ? prefs.lang : c.lang;
    const route = c.route === '*' ? prefs.route : c.route;
    if (prefs.compare === 'original') setPrefs((p) => ({ ...p, compare: 'draft' }));
    if (route === prefs.route && lang === prefs.lang && ready) send({ type: 've:select', selector: c.selector, scroll: true });
    else navigate(route, lang, c.selector);
  };

  const copyRequest = async () => {
    const text = buildChangeRequest(draft.changes);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    notify(`Change request copied (${pending.length} change${pending.length === 1 ? '' : 's'}) — paste it into Claude Code`);
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(buildExport(draft.changes), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `advance-visual-draft-${d.toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify('Draft JSON exported (also saved to .visual-editor/draft-export.json)');
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) draft.redo();
        else draft.undo();
      } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault();
        draft.redo();
      } else if (!typing && !mod && e.key.toLowerCase() === 'v') setPrefs((p) => ({ ...p, selecting: !p.selecting }));
      else if (e.key === 'Escape' && !typing) {
        setSelected(null);
        send({ type: 've:deselect' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft, send]);

  const chooseKey = (key: string) =>
    setSelected((s) => (s ? { ...s, i18nKey: key, textValues: { sq: getKey('sq', key), en: getKey('en', key), de: getKey('de', key) } } : s));

  const panelBody =
    panel === 'inspector' ? (
      selected ? (
        <Inspector info={selected} changes={draft.changes} onUpsert={draft.upsert} onRemove={draft.remove} onSelect={(s) => send({ type: 've:select', selector: s })} onKeyChoice={chooseKey} />
      ) : (
        <div className="px-6 py-14 text-center text-[0.78rem] leading-relaxed text-white/40" data-testid="inspector-empty">
          <p className="mb-2 text-white/70">Nothing selected</p>
          {prefs.selecting ? 'Click any text, image, button, card or section in the preview.' : 'Turn on Select mode (V) to pick elements.'}
        </div>
      )
    ) : (
      <Review
        changes={draft.changes}
        saveState={draft.saveState}
        compare={prefs.compare}
        onCompare={(m) => setPrefs((p) => ({ ...p, compare: m }))}
        onView={viewChange}
        onRemove={draft.remove}
        onClear={draft.clear}
        onCopy={copyRequest}
        onExport={exportJson}
        onReload={async () => notify((await draft.reloadFromFile()) ? 'Reloaded from .visual-editor/draft.json' : 'No draft file found')}
      />
    );

  const tabs = (
    <div className="flex border-b border-white/[0.07]" role="tablist">
      {(['inspector', 'changes'] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={panel === t}
          onClick={() => setPanel(t)}
          data-testid={`tab-${t}`}
          className={cx('flex flex-1 items-center justify-center gap-2 py-3 text-[0.68rem] font-bold uppercase tracking-[0.2em] transition-colors', panel === t ? 'text-white shadow-[inset_0_-2px_0_#f4f4f3]' : 'text-white/40 hover:text-white/80')}
        >
          {t === 'inspector' ? 'Inspector' : 'Changes'}
          {t === 'changes' && pending.length > 0 && <span className="rounded-full bg-[#f4f4f3] px-1.5 py-0.5 text-[0.58rem] text-[#050505]">{pending.length}</span>}
        </button>
      ))}
    </div>
  );

  const toolbarControls = (
    <>
      <select
        aria-label="Page"
        data-testid="page-select"
        value={prefs.route}
        onChange={(e) => navigate(e.target.value, prefs.lang)}
        className="h-9 max-w-[15rem] shrink-0 rounded-lg border border-white/12 bg-[#141416] px-3 text-[0.72rem] text-white outline-none focus:border-white/40"
      >
        {!PAGES.some((p) => p.value === prefs.route) && <option value={prefs.route}>{prefs.route}</option>}
        {PAGES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <div className="shrink-0">
        <Segmented<Lang> testid="lang-switch" value={prefs.lang} options={(['sq', 'en', 'de'] as Lang[]).map((l) => ({ value: l, label: l.toUpperCase(), title: { sq: 'Shqip', en: 'English', de: 'Deutsch' }[l] }))} onChange={(l) => navigate(prefs.route, l)} />
      </div>
      <div className="shrink-0">
        <Segmented<Device>
          testid="device-switch"
          value={prefs.device}
          options={(Object.keys(DEVICES) as Device[]).map((d) => ({ value: d, title: DEVICES[d].label, label: <DeviceIcon d={d} /> }))}
          onChange={(d) => setPrefs((p) => ({ ...p, device: d }))}
        />
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="quiet" onClick={draft.undo} disabled={!draft.canUndo} title="Undo (Ctrl/⌘ Z)" testid="undo">
          ↶
        </Button>
        <Button variant="quiet" onClick={draft.redo} disabled={!draft.canRedo} title="Redo (Ctrl/⌘ Shift Z)" testid="redo">
          ↷
        </Button>
      </div>
      <div className="shrink-0">
        <Segmented
          testid="compare-switch"
          value={prefs.compare}
          options={[
            { value: 'draft', label: 'Draft', title: 'Show draft changes' },
            { value: 'original', label: 'Original', title: 'Show the unchanged website' },
          ]}
          onChange={(v) => setPrefs((p) => ({ ...p, compare: v as 'draft' | 'original' }))}
        />
      </div>
    </>
  );

  const selectToggle = (
    <button
      type="button"
      onClick={() => setPrefs((p) => ({ ...p, selecting: !p.selecting }))}
      aria-pressed={prefs.selecting}
      data-testid="select-toggle"
      title="Select mode (V)"
      className={cx('flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[0.72rem] font-bold transition-colors', prefs.selecting ? 'bg-[#f4f4f3] text-[#050505]' : 'border border-white/12 text-white/75 hover:text-white')}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 3l7 17 2.5-7.5L21 10 4 3z" />
      </svg>
      <span className="max-[360px]:sr-only">{prefs.selecting ? 'Select' : 'Browse'}</span>
    </button>
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#08080a] font-sans text-white" data-testid="visual-editor">
      {/* Toolbar */}
      <header className="z-20 shrink-0 border-b border-white/[0.07] bg-[#0b0b0d]/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-3 lg:px-4">
          <div className="flex shrink-0 items-center gap-2.5">
            <img src="/assets/logo/logo-symbol-white.svg" alt="" className="h-7 w-7" />
            <div className="leading-tight max-[420px]:hidden">
              <p className="text-[0.72rem] font-bold tracking-[0.18em]">ADVANCE</p>
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-white/45">Visual Editor · private</p>
            </div>
          </div>
          <div className="mx-2 hidden h-6 w-px bg-white/10 lg:block" />
          {desktopUi && <div className="flex min-w-0 flex-1 items-center gap-2">{toolbarControls}</div>}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {selectToggle}
            <button
              type="button"
              onClick={() => {
                setPanel('changes');
                if (!desktopUi) setSheet('full');
              }}
              data-testid="changes-button"
              className="flex h-9 items-center gap-2 rounded-lg border border-white/12 px-3 text-[0.72rem] font-semibold hover:border-white/35"
            >
              <span className="max-[420px]:hidden">Changes</span>
              <svg className="min-[421px]:hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              <span className={cx('rounded-full px-1.5 text-[0.6rem]', pending.length ? 'bg-amber-300 text-black' : 'bg-white/10 text-white/60')} data-testid="changes-count">
                {pending.length}
              </span>
            </button>
          </div>
        </div>
        {!desktopUi && <div className="flex items-center gap-2 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none]">{toolbarControls}</div>}
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Preview stage */}
        <main ref={stage} className="relative min-w-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#18181c,#08080a_70%)]" data-testid="stage">
          <div className="absolute left-1/2 top-0 origin-top" style={{ width: dev.w, height: frameH, transform: `translateX(-50%) translateY(${pad}px) scale(${scale})` }}>
            <iframe
              ref={iframe}
              key={src}
              src={src}
              title="Website preview"
              data-testid="preview-frame"
              onLoad={() => setReady((r) => r)}
              className={cx('h-full w-full bg-black', prefs.device !== 'desktop' && 'rounded-[28px] border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,.6)]', prefs.device === 'desktop' && 'rounded-lg border border-white/10')}
            />
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em]">
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-white/60 backdrop-blur">
              {dev.label} {dev.w}px · {Math.round(scale * 100)}%
            </span>
            {prefs.compare === 'original' && <span className="rounded-full bg-sky-400/20 px-2.5 py-1 text-sky-100">Showing original website</span>}
            {!ready && <span className="rounded-full bg-black/60 px-2.5 py-1 text-white/60">Loading…</span>}
          </div>
        </main>

        {/* Desktop inspector */}
        {desktopUi && (
          <aside className="flex w-[380px] shrink-0 flex-col border-l border-white/[0.07] bg-[#0d0d0f]" data-testid="side-panel">
            {tabs}
            <div className="min-h-0 flex-1 overflow-y-auto">{panelBody}</div>
          </aside>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {!desktopUi && (
        <div
          data-testid="bottom-sheet"
          data-state={sheet}
          className={cx(
            'fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl border-t border-white/10 bg-[#0d0d0f] shadow-[0_-20px_60px_rgba(0,0,0,.6)] transition-[height] duration-300',
            sheet === 'closed' ? 'h-14' : sheet === 'half' ? 'h-[52dvh]' : 'h-[88dvh]',
          )}
        >
          <button
            type="button"
            onClick={() => setSheet((s) => (s === 'closed' ? 'half' : s === 'half' ? 'full' : 'closed'))}
            aria-expanded={sheet !== 'closed'}
            className="flex h-14 shrink-0 items-center justify-between gap-3 px-4 text-left"
            data-testid="sheet-handle"
            aria-label="Toggle inspector panel"
          >
            <span className="min-w-0">
              <span className="mx-auto mb-1 block h-1 w-10 rounded-full bg-white/20" />
              <span className="block truncate text-[0.72rem] font-semibold">{selected ? `${selected.type} · ${selected.label}` : panel === 'changes' ? 'Changes' : 'Inspector — tap an element'}</span>
            </span>
            <span className="shrink-0 text-[0.65rem] uppercase tracking-[0.2em] text-white/45">{sheet === 'full' ? 'Close' : sheet === 'half' ? 'Expand' : 'Open'}</span>
          </button>
          {sheet !== 'closed' && (
            <>
              {tabs}
              <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">{panelBody}</div>
            </>
          )}
        </div>
      )}

      {toast && (
        <div role="status" data-testid="editor-toast" className="fixed bottom-20 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-full bg-[#f4f4f3] px-5 py-2.5 text-[0.75rem] font-semibold text-[#050505] shadow-2xl lg:bottom-6">
          {toast}
        </div>
      )}
    </div>
  );
}

function DeviceIcon({ d }: { d: Device }) {
  const p = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true } as const;
  if (d === 'desktop')
    return (
      <svg {...p}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  if (d === 'tablet')
    return (
      <svg {...p}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  return (
    <svg {...p}>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}
