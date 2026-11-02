import { useRef } from 'react';
import { useT } from '../lib/useT';
import { PageHeader } from '../components/PageHeader';
import { ImageSlot } from '../components/ImageSlot';
import { CtaBand } from '../components/CtaBand';
import { ParallaxReveal, Reveal, SplitHeading } from '../components/Reveal';
import { folderImages, named } from '../config/images';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';
import { usePageSeo } from '../lib/usePageSeo';

export default function About() {
  const { t } = useT();
  usePageSeo('about');
  const timeline = useRef<HTMLDivElement>(null);
  const photo = named('about', 'company') ?? folderImages('about')[0];
  const values = t('about.values', { returnObjects: true }) as string[];

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo('[data-line]', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: timeline.current, start: 'top 75%', end: 'bottom 60%', scrub: true } });
      gsap.utils.toArray<HTMLElement>('[data-node]').forEach((n) =>
        gsap.from(n, { opacity: 0, x: -30, duration: 1, scrollTrigger: { trigger: n, start: 'top 80%', once: true } }),
      );
    },
    { scope: timeline },
  );

  return (
    <>
      <PageHeader eyebrow={t('about.eyebrow')} title={t('about.title')} text={t('about.intro')} />

      {/* Company photo — single empty container until a photo is added to /public/assets/about/ */}
      <section className="container-lux" aria-label={t('about.photoAlt')}>
        <ParallaxReveal className="relative aspect-[4/5] rounded-[1.75rem] sm:aspect-[21/9]">
          <div data-parallax className="absolute -inset-y-[10%] inset-x-0">
            <ImageSlot src={photo} alt={t('about.photoAlt')} folder="about" className="h-full w-full" priority />
          </div>
        </ParallaxReveal>
      </section>

      {/* Timeline */}
      <section className="section" aria-labelledby="timeline-title">
        <div className="container-lux grid grid-cols-1 gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <span className="eyebrow">{t('about.timelineTitle')}</span>
            <h2 id="timeline-title" className="text-silver animate-shimmer mt-6 text-[clamp(5rem,16vw,13rem)] font-semibold leading-none tracking-tighter">
              2019
            </h2>
          </div>
          <div ref={timeline} className="relative pl-10 sm:pl-14">
            <span className="absolute left-[7px] top-2 bottom-2 w-px bg-line" aria-hidden="true" />
            <span data-line className="absolute left-[7px] top-2 bottom-2 w-px origin-top bg-fg" aria-hidden="true" />
            <ol className="flex flex-col gap-20">
              {(['founded', 'today'] as const).map((k) => (
                <li key={k} data-node className="relative">
                  <span className="absolute -left-10 top-2 h-[15px] w-[15px] rounded-full border-2 border-fg bg-bg sm:-left-14" aria-hidden="true" />
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-muted">{t(`about.${k}.year`)}</span>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">{t(`about.${k}.title`)}</h3>
                  <p className="serif-accent mt-6 text-2xl leading-snug text-fg-2 sm:text-3xl">“{t(`about.${k}.text`)}”</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section border-t border-line bg-bg-2" aria-labelledby="team-title">
        <div className="container-lux grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SplitHeading id="team-title" text={t('about.team.title')} className="h-display-lg" />
          <Reveal>
            <p className="text-[clamp(1.25rem,2.1vw,1.9rem)] font-light leading-[1.5] tracking-tight text-fg">{t('about.team.text')}</p>
            <ul className="mt-12 flex flex-wrap gap-3">
              {values.map((v) => (
                <li key={v} className="rounded-full border border-line px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-fg-2">
                  {v}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Vision & mission */}
      <section className="section" aria-labelledby="vm-title">
        <h2 id="vm-title" className="sr-only">
          {t('about.vision.title')} · {t('about.mission.title')}
        </h2>
        <Reveal className="container-lux grid grid-cols-1 gap-6 md:grid-cols-2" stagger={0.15}>
          {(['vision', 'mission'] as const).map((k, i) => (
            <article key={k} data-reveal className="card-lux noise flex min-h-[22rem] flex-col justify-between gap-12 p-8 sm:p-12">
              <span className="text-silver text-6xl font-light">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t(`about.${k}.title`)}</h3>
                <p className="lead mt-5">{t(`about.${k}.text`)}</p>
              </div>
            </article>
          ))}
        </Reveal>
      </section>

      <CtaBand title={t('home.cta.title')} text={t('home.cta.text')} />
    </>
  );
}
