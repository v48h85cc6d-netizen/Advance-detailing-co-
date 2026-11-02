import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { useT } from '../lib/useT';
import { certifications } from '../config/certifications';
import { named } from '../config/images';
import { ChevronIcon } from './Icons';
import { SectionHeading } from './Reveal';
import { cn } from '../lib/cn';
import { visual } from '../lib/visual';

const ve = visual('src/components/CertCarousel.tsx');

const INTERVAL = 4500;

/** Automatic certification carousel with arrows, dots, swipe and pause-on-hover/focus. */
export function CertCarousel({ headingAs = 'h2' }: { headingAs?: 'h2' | 'h3' }) {
  const { t } = useT();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const n = certifications.length;
  const go = useCallback((d: number) => {
    setDir(d);
    setI((x) => (x + d + n) % n);
  }, [n]);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (paused || reduced) return;
    const id = window.setInterval(() => go(1), INTERVAL);
    return () => window.clearInterval(id);
  }, [paused, go, reduced, i]);

  const cert = certifications[i];
  const logoSrc = named('certifications', cert.logoFile);

  return (
    <section {...ve('certifications', 'section')} className="section relative overflow-hidden" aria-labelledby="certs-title" data-testid="certifications">
      <div className="container-lux grid grid-cols-1 items-center gap-14 lg:grid-cols-[1fr_1.15fr]">
        <div id="certs-title">
          <SectionHeading i18nBase="certifications" as={headingAs} eyebrow={t('certifications.eyebrow')} title={t('certifications.title')} text={t('certifications.text')} />
        </div>

        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          role="region"
          aria-roledescription="carousel"
          aria-label={t('certifications.title')}
          data-paused={paused ? 'true' : 'false'}
        >
          <div {...ve('certifications.card', 'card')} className="card-lux noise relative aspect-[5/4] w-full overflow-hidden sm:aspect-[16/11]" style={{ perspective: 1400 }}>
            <div className="tri-pattern absolute inset-0 opacity-50" aria-hidden="true" />
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.div
                key={cert.id}
                custom={dir}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${n}`}
                data-testid="cert-slide"
                data-cert={cert.id}
                variants={{
                  enter: (d: number) => ({ opacity: 0, rotateY: d * 35, x: d * 80, scale: 0.92 }),
                  center: { opacity: 1, rotateY: 0, x: 0, scale: 1 },
                  exit: (d: number) => ({ opacity: 0, rotateY: d * -35, x: d * -80, scale: 0.92 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => (info.offset.x < -50 ? go(1) : info.offset.x > 50 ? go(-1) : undefined)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center"
              >
                {logoSrc ? (
                  <img src={logoSrc} alt={cert.name} className="max-h-24 w-auto max-w-[70%] object-contain dark:invert-0" loading="lazy" />
                ) : (
                  <span className="text-silver animate-shimmer text-5xl font-bold uppercase tracking-[0.12em] sm:text-7xl">{cert.name}</span>
                )}
                <span className="h-px w-16 bg-line-strong" aria-hidden="true" />
                <p {...ve(`certifications.item.${cert.id}`, 'text', { key: `certifications.items.${cert.id}` })} className="max-w-sm text-lg font-medium tracking-tight sm:text-2xl">{t(`certifications.items.${cert.id}`)}</p>
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-muted">{t('certifications.label')}</span>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {certifications.map((c, k) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setDir(k > i ? 1 : -1);
                    setI(k);
                  }}
                  aria-label={t('certifications.goTo', { n: k + 1 })}
                  aria-current={k === i ? 'true' : undefined}
                  className="group grid grid-cols-1 h-11 place-items-center px-1"
                >
                  <span className={cn('block h-[3px] rounded-full transition-all duration-500', k === i ? 'w-12 bg-fg' : 'w-6 bg-line-strong group-hover:bg-muted')} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => go(-1)} aria-label={t('certifications.prev')} data-testid="cert-prev" className="grid grid-cols-1 h-12 w-12 place-items-center rounded-full border border-line transition-colors hover:border-fg">
                <ChevronIcon dir="left" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label={t('certifications.next')} data-testid="cert-next" className="grid grid-cols-1 h-12 w-12 place-items-center rounded-full border border-line transition-colors hover:border-fg">
                <ChevronIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
