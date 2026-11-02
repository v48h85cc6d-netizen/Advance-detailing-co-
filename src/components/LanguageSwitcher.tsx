import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useT } from '../lib/useT';
import { LANGS } from '../lib/lang';
import { useLang } from '../lib/useLang';
import { cn } from '../lib/cn';

export function LanguageSwitcher({ inline = false, onSelect }: { inline?: boolean; onSelect?: () => void }) {
  const { t } = useT();
  const { lang, switchTo } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (inline) {
    return (
      <div role="group" aria-label={t('language.label')} className="flex gap-2">
        {LANGS.map((l) => (
          <Link
            key={l}
            to={switchTo(l)}
            hrefLang={l}
            lang={l}
            onClick={onSelect}
            aria-current={l === lang ? 'true' : undefined}
            className={cn(
              'rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] transition-colors',
              l === lang ? 'border-fg bg-fg text-bg' : 'border-line text-fg-2 hover:border-line-strong',
            )}
          >
            {t(`language.${l}`)}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${t('language.label')}: ${t(`language.${lang}`)}`}
        data-testid="lang-button"
        className="flex h-11 items-center gap-2 rounded-full border border-line px-4 text-xs font-semibold uppercase tracking-[0.2em] text-fg transition-colors hover:border-line-strong hover:bg-surface-2"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
        </svg>
        {lang}
        <motion.svg animate={{ rotate: open ? 180 : 0 }} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1.5 3.5 5 7l3.5-3.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass absolute right-0 top-[calc(100%+10px)] min-w-44 overflow-hidden rounded-2xl p-1.5 shadow-[var(--shadow)]"
          >
            {LANGS.map((l) => (
              <li key={l}>
                <Link
                  to={switchTo(l)}
                  hrefLang={l}
                  lang={l}
                  onClick={() => {
                    setOpen(false);
                    onSelect?.();
                  }}
                  aria-current={l === lang ? 'true' : undefined}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors hover:bg-surface-2',
                    l === lang ? 'text-fg' : 'text-fg-2',
                  )}
                >
                  {t(`language.${l}`)}
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">{l}</span>
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
