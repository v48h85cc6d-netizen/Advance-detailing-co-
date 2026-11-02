import { useRef } from 'react';
import { Link } from 'react-router';
import { useT } from '../lib/useT';
import { services } from '../config/services';
import { gsap, useGSAP } from '../lib/gsap';
import { useLang } from '../lib/useLang';
import { ServiceCard } from './ServiceCard';
import { ArrowIcon } from './Icons';
import { SectionHeading } from './Reveal';
import { visual } from '../lib/visual';

const ve = visual('src/components/ServicesRail.tsx');

/** Homepage services: pinned horizontal scroll on desktop, swipeable rail on touch screens. */
export function ServicesRail() {
  const { t } = useT();
  const { to } = useLang();
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const el = track.current!;
        const distance = () => Math.max(0, el.scrollWidth - el.clientWidth);
        gsap.to(el.firstElementChild, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: { trigger: section.current, start: 'top top', end: () => `+=${distance()}`, scrub: 0.8, pin: true, invalidateOnRefresh: true, anticipatePin: 1 },
        });
      });
      return () => mm.revert();
    },
    { scope: section },
  );

  return (
    <section {...ve('home.services', 'section')} ref={section} className="relative flex flex-col justify-center overflow-hidden py-24 lg:min-h-[100svh] lg:py-16" aria-labelledby="home-services-title" data-testid="home-services">
      <div className="container-lux mb-12 flex flex-col justify-between gap-8 lg:mb-14 lg:flex-row lg:items-end">
        <div id="home-services-title">
          <SectionHeading i18nBase="home.services" eyebrow={t('home.services.eyebrow')} title={t('home.services.title')} text={t('home.services.text')} />
        </div>
        <Link {...ve('home.services.cta', 'button', { key: 'common.allServices' })} to={to('/services')} className="btn btn-ghost self-start lg:self-end">
          {t('common.allServices')} <ArrowIcon width={16} height={16} />
        </Link>
      </div>
      <div ref={track} className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden" style={{ scrollSnapType: 'x mandatory' }}>
        <div className="flex w-max gap-4 px-[clamp(1rem,4vw,3.5rem)] will-change-transform">
          {services.map((s, i) => (
            <div key={s.id} className="w-[78vw] max-w-[22rem] shrink-0 snap-start sm:w-[22rem]">
              <ServiceCard id={s.id} category={s.category} index={i} className="h-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
