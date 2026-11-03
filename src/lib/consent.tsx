import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { analytics } from '../config/site';

/**
 * GDPR consent store. Non-essential features (Google Maps embed, Google Analytics)
 * check this context and stay disabled until the visitor opts in.
 */
export interface ConsentState {
  analytics: boolean;
  media: boolean;
}
interface Stored extends ConsentState {
  v: 1;
  ts: number;
}
const KEY = 'adc-consent';

/**
 * Consent is kept only for the current visit (sessionStorage = this browser tab session):
 * page-to-page navigation keeps the choice, a new visit (new tab / reopened browser) asks again.
 * Nothing is stored permanently; a choice saved permanently by an older version is removed.
 */
function read(): Stored | null {
  try {
    localStorage.removeItem(KEY); // legacy persistent consent (older site versions)
  } catch {
    /* ignore */
  }
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    return s.v === 1 ? s : null;
  } catch {
    return null;
  }
}

interface ConsentCtx {
  consent: ConsentState;
  decided: boolean;
  settingsOpen: boolean;
  save: (c: ConsentState) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}
const Ctx = createContext<ConsentCtx | null>(null);

function loadGoogleAnalytics(id: string) {
  if (!id || document.getElementById('ga-script')) return;
  const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', id, { anonymize_ip: true });
  const s = document.createElement('script');
  s.id = 'ga-script';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

function clearAnalyticsCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name.startsWith('_ga')) {
      const domain = location.hostname.replace(/^www\./, '');
      document.cookie = `${name}=; Max-Age=0; path=/`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
    }
  });
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const initial = read();
  const [stored, setStored] = useState<Stored | null>(initial);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const save = useCallback((c: ConsentState) => {
    const s: Stored = { v: 1, ts: Date.now(), analytics: c.analytics, media: c.media };
    try {
      sessionStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
    setStored((prev) => {
      if (prev?.analytics && !c.analytics) {
        clearAnalyticsCookies();
        // A loaded analytics script cannot be unloaded — reload to fully stop it.
        if (document.getElementById('ga-script')) window.setTimeout(() => location.reload(), 50);
      }
      return s;
    });
    setSettingsOpen(false);
  }, []);

  useEffect(() => {
    if (stored?.analytics && analytics.gaId) loadGoogleAnalytics(analytics.gaId);
  }, [stored?.analytics]);

  const value = useMemo<ConsentCtx>(
    () => ({
      consent: { analytics: !!stored?.analytics, media: !!stored?.media },
      decided: !!stored,
      settingsOpen,
      save,
      acceptAll: () => save({ analytics: true, media: true }),
      rejectAll: () => save({ analytics: false, media: false }),
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
    }),
    [stored, settingsOpen, save],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsent() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConsent outside ConsentProvider');
  return ctx;
}
