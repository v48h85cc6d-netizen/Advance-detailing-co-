import { useEffect, useRef } from 'react';
import { useT } from '../lib/useT';
import { introVideo } from '../config/images';
import { services } from '../config/services';
import { certifications } from '../config/certifications';
import { business } from '../config/site';
import { Reveal, SectionHeading } from './Reveal';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';

/** Studio showcase — reuses the supplied intro footage, loaded lazily and played only while visible. */
export function StudioSection() {
  const { t } = useT();
  const ref = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const reduce = prefersReducedMotion();
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !reduce) {
          if (v.preload !== 'auto') v.preload = 'auto';
          v.play().catch(() => undefined);
        } else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo('[data-studio-frame]', { rotateY: -18, rotateX: 6, scale: 0.9 }, { rotateY: 0, rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'center center', scrub: true } });
    },
    { scope: ref },
  );

  const stats = [
    { value: String(business.foundingYear), label: t('home.studio.stat1') },
    { value: String(services.length), label: t('home.studio.stat2') },
    { value: String(certifications.length), label: t('home.studio.stat3') },
    { value: t('home.studio.stat4Value'), label: t('home.studio.stat4') },
  ];

  return (
    <section ref={ref} className="section relative overflow-hidden bg-bg-2" aria-labelledby="studio-title">
      <div className="container-lux grid grid-cols-1 items-center gap-16 lg:grid-cols-[1fr_auto] lg:gap-24">
        <div className="flex flex-col gap-14">
          <div id="studio-title">
            <SectionHeading eyebrow={t('home.studio.eyebrow')} title={t('home.studio.title')} text={t('home.studio.text')} />
          </div>
          <Reveal className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line">
            {stats.map((s) => (
              <div key={s.label} data-reveal className="flex flex-col gap-2 bg-bg-2 p-6 sm:p-8">
                <span className="text-3xl font-semibold tracking-tight sm:text-5xl">{s.value}</span>
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted">{s.label}</span>
              </div>
            ))}
          </Reveal>
        </div>
        <div className="mx-auto w-full max-w-[22rem]" style={{ perspective: 1400 }}>
          <div data-studio-frame className="relative aspect-[9/16] overflow-hidden rounded-[2.25rem] border border-line-strong bg-black shadow-[var(--shadow)]">
            <video
              ref={video}
              className="h-full w-full object-cover"
              muted
              playsInline
              loop
              preload="none"
              poster={introVideo.posterSmall}
              aria-label="ADVANCE DETAILING CO. — Studio, Prishtinë"
            >
              <source src={introVideo.webm} type="video/webm" />
              <source src={introVideo.mp4} type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute inset-0 rounded-[2.25rem] ring-1 ring-inset ring-white/10" />
          </div>
        </div>
      </div>
    </section>
  );
}
