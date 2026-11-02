import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useT } from '../lib/useT';
import { useConsent, type ConsentState } from '../lib/consent';
import { useLang } from '../lib/useLang';
import { CloseIcon } from './Icons';
import { cn } from '../lib/cn';

function Switch({ checked, onChange, disabled, label, id }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string; id: string }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-300', checked ? 'border-fg bg-fg' : 'border-line-strong bg-surface-2', disabled && 'opacity-60')}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className={cn('absolute top-1 h-[18px] w-[18px] rounded-full', checked ? 'right-1 bg-bg' : 'left-1 bg-fg')} />
    </button>
  );
}

export function CookieConsent({ suppressed }: { suppressed?: boolean }) {
  const { t } = useT();
  const { to } = useLang();
  const { decided, consent, settingsOpen, acceptAll, rejectAll, save, openSettings, closeSettings } = useConsent();
  const [draft, setDraft] = useState<ConsentState>(consent);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settingsOpen) {
      setDraft(consent);
      document.documentElement.classList.add('scroll-locked');
      dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSettings();
      document.addEventListener('keydown', onKey);
      return () => {
        document.documentElement.classList.remove('scroll-locked');
        document.removeEventListener('keydown', onKey);
      };
    }
  }, [settingsOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = [
    { id: 'necessary', locked: true },
    { id: 'analytics', locked: false },
    { id: 'media', locked: false },
  ] as const;

  return (
    <>
      <AnimatePresence>
        {!decided && !settingsOpen && !suppressed && (
          <motion.section
            role="region"
            aria-label={t('consent.title')}
            data-testid="cookie-banner"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 } }}
            exit={{ y: 40, opacity: 0, transition: { duration: 0.3 } }}
            className="glass fixed inset-x-3 bottom-3 z-[70] rounded-3xl p-5 shadow-[var(--shadow)] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-[30rem] sm:p-7"
          >
            <h2 className="text-base font-semibold">{t('consent.title')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-2">
              {t('consent.text')}{' '}
              <Link to={to('/cookies')} className="underline underline-offset-4">
                {t('consent.policyLink')}
              </Link>
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2 xs:grid-cols-2">
              <button type="button" onClick={acceptAll} className="btn btn-primary !py-3" data-testid="cookie-accept">
                {t('consent.acceptAll')}
              </button>
              <button type="button" onClick={rejectAll} className="btn btn-ghost !py-3" data-testid="cookie-reject">
                {t('consent.rejectAll')}
              </button>
              <button type="button" onClick={openSettings} className="text-xs font-semibold uppercase tracking-[0.2em] text-muted underline-offset-4 hover:text-fg hover:underline xs:col-span-2 py-2" data-testid="cookie-settings">
                {t('consent.settings')}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div className="fixed inset-0 z-[85] grid grid-cols-1 place-items-end bg-black/60 backdrop-blur-sm sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSettings}>
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cookie-settings-title"
              data-testid="cookie-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-bg-2 p-6 sm:max-w-lg sm:rounded-3xl sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 id="cookie-settings-title" className="text-xl font-semibold">
                  {t('consent.settingsTitle')}
                </h2>
                <button type="button" onClick={closeSettings} aria-label={t('common.close')} className="grid grid-cols-1 h-10 w-10 shrink-0 place-items-center rounded-full border border-line">
                  <CloseIcon width={16} height={16} />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-fg-2">{t('consent.settingsText')}</p>
              <ul className="mt-6 flex flex-col divide-y divide-line rounded-2xl border border-line">
                {categories.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-5 p-5">
                    <div>
                      <label htmlFor={`consent-${c.id}`} className="font-semibold">
                        {t(`consent.categories.${c.id}.title`)}
                      </label>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{t(`consent.categories.${c.id}.text`)}</p>
                      {c.locked && <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-fg-2">{t('consent.alwaysOn')}</p>}
                    </div>
                    <Switch
                      id={`consent-${c.id}`}
                      label={t(`consent.categories.${c.id}.title`)}
                      checked={c.locked ? true : draft[c.id]}
                      disabled={c.locked}
                      onChange={(v) => !c.locked && setDraft((d) => ({ ...d, [c.id]: v }))}
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button type="button" onClick={rejectAll} className="btn btn-ghost !px-4 !py-3 !text-[0.68rem]">
                  {t('consent.rejectAll')}
                </button>
                <button type="button" onClick={() => save(draft)} className="btn btn-ghost !px-4 !py-3 !text-[0.68rem]" data-testid="cookie-save">
                  {t('consent.save')}
                </button>
                <button type="button" onClick={acceptAll} className="btn btn-primary !px-4 !py-3 !text-[0.68rem]">
                  {t('consent.acceptAll')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
