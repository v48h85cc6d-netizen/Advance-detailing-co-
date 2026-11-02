import { lazy, Suspense, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useT } from '../lib/useT';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';
import { useLang } from '../lib/useLang';
import { useTheme } from '../lib/theme';
import { supportsWebGL } from '../lib/webgl';
import { coverImage } from '../config/images';
import { Logo } from './Logo';
import { ArrowIcon } from './Icons';

const PyramidScene = lazy(() => import('../three/PyramidScene'));

function SymbolFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Logo variant="symbol" className="!h-auto w-[55%] max-w-[420px] opacity-90" eager />
    </div>
  );
}

export function Hero({ ready }: { ready: boolean }) {
  const { t } = useT();
  const { to } = useLang();
  const { theme } = useTheme();
  const root = useRef<HTMLElement>(null);
  const [webgl] = useState(supportsWebGL);
  const pillars = t('pillars', { returnObjects: true }) as string[];
  const heroImage = coverImage('homepage');

  useGSAP(
    () => {
      if (!ready || !root.current) return;
      if (prefersReducedMotion()) {
        gsap.set('[data-hero]', { opacity: 1, y: 0 });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.fromTo('[data-hero="line"] > span', { yPercent: 115, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 1.4, stagger: 0.09 })
        .fromTo('[data-hero="fade"]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, '-=1.0')
        .fromTo('[data-hero="scene"]', { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 2 }, 0);
      gsap.to('[data-hero="content"]', {
        yPercent: -12,
        opacity: 0.15,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
    },
    { scope: root, dependencies: [ready] },
  );

  return (
    <section ref={root} className="relative isolate flex min-h-[100svh] flex-col overflow-hidden" aria-labelledby="hero-title" data-testid="hero">
      {/* Atmosphere */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {heroImage && <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" fetchPriority="high" />}
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_40%,color-mix(in_oklab,var(--fg)_9%,transparent),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--line)_1px,transparent_1px)] bg-[size:calc(100%/6)_100%] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
      </div>

      <div className="container-lux relative grid grid-cols-1 flex-1 grid-rows-[auto_1fr] items-center gap-4 pt-24 pb-10 lg:grid-cols-[1.05fr_1fr] lg:grid-rows-1 lg:gap-0 lg:pt-28">
        {/* 3D scene */}
        <div data-hero="scene" className="relative order-1 h-[38svh] min-h-[260px] opacity-0 lg:order-2 lg:h-[78svh] lg:max-h-[760px]">
          {webgl ? (
            <Suspense fallback={<SymbolFallback />}>
              <PyramidScene active={ready} dark={theme === 'dark'} />
            </Suspense>
          ) : (
            <SymbolFallback />
          )}
        </div>

        <div data-hero="content" className="relative order-2 flex flex-col gap-7 [container-type:inline-size] lg:order-1 lg:gap-9">
          <span data-hero="fade" className="eyebrow opacity-0">
            {t('hero.eyebrow')}
          </span>
          <h1 id="hero-title" className="display text-[clamp(1.9rem,9.6cqw,6.4rem)] uppercase !leading-[0.95] [hyphens:manual]">
            <span className="sr-only">ADVANCE DETAILING CO. — </span>
            {pillars.map((p, i) => (
              <span key={p} data-hero="line" className="-mt-[0.14em] block overflow-hidden pt-[0.14em] pb-[0.06em] first:mt-0">
                <span className={`inline-block ${i % 2 ? 'text-silver' : ''}`}>{p}.</span>
              </span>
            ))}
          </h1>
          <div data-hero="fade" className="flex max-w-xl flex-col gap-4 opacity-0">
            <p className="serif-accent text-2xl text-fg sm:text-3xl">{t('hero.title')}</p>
            <p className="lead">{t('hero.subtitle')}</p>
          </div>
          <div data-hero="fade" className="flex flex-col gap-3 opacity-0 xs:flex-row">
            <Link to={to('/contact')} className="btn btn-primary" data-testid="hero-cta">
              {t('hero.ctaPrimary')} <ArrowIcon width={16} height={16} />
            </Link>
            <Link to={to('/services')} className="btn btn-ghost">
              {t('hero.ctaSecondary')}
            </Link>
          </div>
        </div>
      </div>

      <div data-hero="fade" className="container-lux relative flex items-end justify-between pb-8 opacity-0">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted">{t('hero.since')}</span>
        <a href="#featured" className="group flex flex-col items-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted hover:text-fg">
          <span className="relative h-12 w-px overflow-hidden bg-line">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2s_ease-in-out_infinite] bg-fg" />
          </span>
          <span className="sr-only sm:not-sr-only">{t('hero.scroll')}</span>
        </a>
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted">Prishtinë · XK</span>
      </div>
    </section>
  );
}
